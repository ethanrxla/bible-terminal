/**
 * Posts the day's reading into the family WhatsApp group each morning.
 *
 * The reading itself is chosen and interpreted by the website -- this process
 * only reads /api/daily and relays it, so the group and the site always show
 * the same passage and the model is never called twice for it.
 */

import cron from 'node-cron';
import { config } from './config.js';
import { fetchDaily } from './daily.js';
import { messagesFor } from './messages.js';
import { acquireLock, SendLog } from './state.js';
import { takeRequest, type SendRequest } from './request.js';
import { createListener } from './listen.js';
import type { ReadingContext } from './converse.js';
import { connect } from './whatsapp.js';

const log = (message: string) => console.log(`[${new Date().toISOString()}] ${message}`);

// Before anything else. Two bots would mean two schedules, two sends of the
// same reading, and two Baileys sockets writing one auth directory.
let releaseLock: () => Promise<void>;
try {
  releaseLock = await acquireLock(config.dataDir);
} catch (error) {
  log((error as Error).message);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void releaseLock().finally(() => process.exit(0));
  });
}

const sendLog = new SendLog(config.dataDir);

/**
 * The day's reading, for answering questions about it. Cached per reading day
 * so a busy conversation does not refetch it on every message.
 */
let readingCache: { day: string; value: ReadingContext } | null = null;
async function currentReading(): Promise<ReadingContext | null> {
  const payload = await fetchDaily(slotForToday(), { attempts: 1 });
  if (readingCache?.day !== payload.day) {
    readingCache = { day: payload.day, value: { reference: payload.reference, text: payload.text } };
  }
  return readingCache.value;
}

const listener = config.conversation
  ? createListener({ groupJid: config.groupJid, reading: currentReading, log })
  : null;

// Connected lazily so a dry run -- and `npm run groups` -- does not need a
// paired session just to print what the morning message would say.
let connection: ReturnType<typeof connect> | null = null;
const whatsapp = () => (connection ??= connect(log, (socket) => listener?.(socket)));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wall-clock hour in the configured zone, for the catch-up window. */
function hourIn(timezone: string, date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(date),
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Day of week in the configured zone, 0 = Sunday. */
function weekdayIn(timezone: string, date = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date);
  return WEEKDAYS.indexOf(name);
}

/**
 * The passage one day a week, a single verse the rest. Reading a full passage
 * every morning is more than a group sustains; a verse every morning never
 * gives anyone something to sit with.
 */
function slotForToday(): 'verse' | 'passage' | 'ethiopian' {
  return weekdayIn(config.timezone) === config.weeklyPassageDay ? 'passage' : config.dailySlot;
}

async function run(trigger: string, request?: SendRequest): Promise<void> {
  log(`Run triggered by ${trigger}.`);

  const slot = request?.slot ?? slotForToday();
  const parts = request?.parts ?? config.sendParts;

  const payload = await fetchDaily(slot, {
    onRetry: (attempt, wait, reason) =>
      log(`Attempt ${attempt} not ready (${reason}); retrying in ${wait / 1000}s.`),
  });

  // Checked after the fetch, because the server owns the definition of "which
  // day it is" -- deriving it here would mean a second copy of the 6am
  // boundary and its DST handling.
  //
  // Guarded on payload.day, the reading day, never on the edition key: the
  // hourly slots change key every hour, so keying on that would let the same
  // morning go out again from the next hour.
  //
  // A one-off request is exempt -- asking for a send is the point of it.
  const guarded = !request;
  if (guarded) {
    const { lastSentDay } = await sendLog.read();
    if (lastSentDay === payload.day) {
      log(`${payload.day} has already been sent; nothing to do.`);
      return;
    }
  }

  const messages = messagesFor(payload, parts, { includeLink: config.includeLink });
  if (messages.length === 0) {
    log(`SEND_PARTS selected nothing to send (${parts.join(',') || 'empty'}).`);
    return;
  }
  log(`${payload.day} ${slot}: ${payload.reference} (${messages.length} messages, parts: ${parts.join('+')}).`);

  if (config.dryRun) {
    messages.forEach((message, index) => {
      console.log(`\n--- message ${index + 1}/${messages.length} (${message.length} chars) ---\n${message}`);
    });
    log('DRY_RUN is set; nothing was sent.');
    return;
  }

  const socket = await whatsapp().ready();
  for (const [index, text] of messages.entries()) {
    await socket.sendMessage(config.groupJid, { text });
    // A human-shaped gap. Three messages landing in the same instant read as
    // a dump rather than a conversation, and a burst from a linked device is
    // the pattern WhatsApp's abuse detection looks for.
    if (index < messages.length - 1) await sleep(2_500 + Math.random() * 1_500);
  }

  // Only after every message landed. A crash midway re-sends the whole day on
  // the next run -- a rare duplicate is easier to live with than a passage
  // whose interpretation never arrived.
  if (guarded) await sendLog.markSent(payload.day);
  log(`Sent ${payload.day} (${slot}).`);
}

function fire(trigger: string, request?: SendRequest): void {
  run(trigger, request).catch((error: Error) => log(`Run failed: ${error.message}`));
}

// A scheduled one-off cannot start a second process (the lock refuses it) and
// a signal cannot carry a slot, so requests arrive as a small file.
setInterval(() => {
  void takeRequest(config.dataDir).then((request) => {
    if (request) fire(`request file (${request.slot})`, request);
  });
}, 15_000);

if (!config.dryRun) whatsapp();

cron.schedule(config.sendAt, () => fire('schedule'), { timezone: config.timezone });
const weeklyName = WEEKDAYS[config.weeklyPassageDay] ?? 'never';
log(`Scheduled "${config.sendAt}" (${config.timezone}). Posting to ${config.groupJid}.`);
log(`${weeklyName}: passage. Other days: ${config.dailySlot}. Parts: ${config.sendParts.join('+')}.`);
log(`Today is ${WEEKDAYS[weekdayIn(config.timezone)]} -> ${slotForToday()}.`);
log(config.conversation ? 'Answering questions in the group.' : 'Conversation off; sending only.');

// Catch up on a send missed while the process was down, but only shortly
// after the fact -- see CATCH_UP_HOURS. Outside that window a restart must be
// silent rather than posting a stale reading at an odd hour.
const scheduledHour = Number(config.sendAt.split(' ')[1]);
const nowHour = hourIn(config.timezone);
if (Number.isFinite(scheduledHour) && nowHour >= scheduledHour && nowHour < scheduledHour + config.catchUpHours) {
  const { lastSentDay } = await sendLog.read();
  log(`Inside the catch-up window (last sent: ${lastSentDay ?? 'never'}).`);
  fire('catch-up');
} else {
  log('Outside the catch-up window; waiting for the schedule.');
}
