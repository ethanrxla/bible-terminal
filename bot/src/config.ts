/**
 * Configuration, read once and validated loudly.
 *
 * A bot that only speaks at 6am is the worst place to discover a typo in an
 * environment variable: the failure is invisible for a day. So everything is
 * checked at startup and a missing value stops the process immediately.
 */

export const PARTS = ['scripture', 'interpretation', 'question'] as const;
export type SendPart = (typeof PARTS)[number];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. See bot/.env.example.`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  /** Origin of the deployed site, no trailing slash. */
  apiBase: optional('API_BASE', 'https://bible-terminal.vercel.app').replace(/\/+$/, ''),
  /** Must match BOT_TOKEN on the Vercel project, when that is set. */
  botToken: process.env.BOT_TOKEN?.trim() || '',
  /** The group to post into, e.g. "1203...@g.us". Found with `npm run groups`. */
  groupJid: required('WHATSAPP_GROUP_JID'),
  /**
   * Digits only, country code included. Punctuation is stripped, so
   * "+1 (555) 123-4567" is accepted as written.
   */
  phoneNumber: (process.env.WHATSAPP_NUMBER ?? '').replace(/\D/g, ''),
  /** 'qr' forces the QR path, which is renewable where a code is not. */
  pairMode: (process.env.PAIR_MODE ?? '').trim().toLowerCase(),

  authDir: optional('AUTH_DIR', './auth'),
  dataDir: optional('DATA_DIR', './data'),

  /** Cron expression and zone for the morning send. */
  sendAt: optional('SEND_AT', '10 6 * * *'),
  timezone: optional('TZ_NAME', 'America/New_York'),

  /**
   * One day a week gets the full passage; the rest get a single verse. A
   * passage every morning is more than a group will read, and a verse every
   * morning never gives anyone something to sit with.
   * 0 = Sunday. Set to -1 for a verse every day.
   */
  weeklyPassageDay: Number(optional('WEEKLY_PASSAGE_DAY', '0')),
  /** What the other six days send. */
  dailySlot: optional('DAILY_SLOT', 'verse') as 'verse' | 'passage' | 'ethiopian',

  /**
   * On boot, send a reading that was missed while the process was down --
   * but only this many hours past the scheduled time. Without a bound, a
   * droplet that was off for a week would wake up and post a stale passage at
   * whatever hour it happened to come back.
   */
  catchUpHours: Number(optional('CATCH_UP_HOURS', '6')),

  /**
   * Which parts of the reading to send, in order. The interpretation is three
   * paragraphs and runs past 2000 characters, which is a lot to land in a
   * group chat every morning -- it is always on the site, so leaving it out
   * here is a reasonable default rather than a loss.
   */
  sendParts: (process.env.SEND_PARTS ?? 'scripture,question')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part): part is SendPart => PARTS.includes(part as SendPart)),

  /** Answer questions in the group. Set CONVERSATION=0 to send only. */
  conversation: (process.env.CONVERSATION ?? '1') !== '0',

  /** Print the messages instead of sending them. */
  dryRun: process.env.DRY_RUN === '1',
} as const;

export type Config = typeof config;
