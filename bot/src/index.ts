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
import { SendLog } from './state.js';
import { connect } from './whatsapp.js';

const log = (message: string) => console.log(`[${new Date().toISOString()}] ${message}`);

const sendLog = new SendLog(config.dataDir);

// Connected lazily so a dry run -- and `npm run groups` -- does not need a
// paired session just to print what the morning message would say.
let connection: ReturnType<typeof connect> | null = null;
const whatsapp = () => (connection ??= connect(log));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wall-clock hour in the configured zone, for the catch-up window. */
function hourIn(timezone: string, date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(date),
  );
}

async function run(trigger: string): Promise<void> {
  log(`Run triggered by ${trigger}.`);

  const payload = await fetchDaily({
    onRetry: (attempt, wait, reason) =>
      log(`Attempt ${attempt} not ready (${reason}); retrying in ${wait / 1000}s.`),
  });

  // Checked after the fetch, because the server owns the definition of "which
  // day it is" -- deriving it here would mean a second copy of the 6am
  // boundary and its DST handling.
  const { lastSentDay } = await sendLog.read();
  if (lastSentDay === payload.day) {
    log(`${payload.day} has already been sent; nothing to do.`);
    return;
  }

  const messages = messagesFor(payload);
  log(`${payload.day}: ${payload.reference} (${messages.length} messages).`);

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
  await sendLog.markSent(payload.day);
  log(`Sent ${payload.day}.`);
}

function guarded(trigger: string): void {
  run(trigger).catch((error: Error) => log(`Run failed: ${error.message}`));
}

if (!config.dryRun) whatsapp();

cron.schedule(config.sendAt, () => guarded('schedule'), { timezone: config.timezone });
log(`Scheduled "${config.sendAt}" (${config.timezone}). Posting to ${config.groupJid}.`);

// Catch up on a send missed while the process was down, but only shortly
// after the fact -- see CATCH_UP_HOURS. Outside that window a restart must be
// silent rather than posting a stale reading at an odd hour.
const scheduledHour = Number(config.sendAt.split(' ')[1]);
const nowHour = hourIn(config.timezone);
if (Number.isFinite(scheduledHour) && nowHour >= scheduledHour && nowHour < scheduledHour + config.catchUpHours) {
  const { lastSentDay } = await sendLog.read();
  log(`Inside the catch-up window (last sent: ${lastSentDay ?? 'never'}).`);
  guarded('catch-up');
} else {
  log('Outside the catch-up window; waiting for the schedule.');
}
