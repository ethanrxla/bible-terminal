/**
 * Configuration, read once and validated loudly.
 *
 * A bot that only speaks at 6am is the worst place to discover a typo in an
 * environment variable: the failure is invisible for a day. So everything is
 * checked at startup and a missing value stops the process immediately.
 */

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
  /** Digits only, country code included, for pairing-code login. */
  phoneNumber: (process.env.WHATSAPP_NUMBER ?? '').replace(/\D/g, ''),

  authDir: optional('AUTH_DIR', './auth'),
  dataDir: optional('DATA_DIR', './data'),

  /** Cron expression and zone for the morning send. */
  sendAt: optional('SEND_AT', '10 6 * * *'),
  timezone: optional('TZ_NAME', 'America/New_York'),

  /**
   * On boot, send a reading that was missed while the process was down --
   * but only this many hours past the scheduled time. Without a bound, a
   * droplet that was off for a week would wake up and post a stale passage at
   * whatever hour it happened to come back.
   */
  catchUpHours: Number(optional('CATCH_UP_HOURS', '6')),

  /** Print the messages instead of sending them. */
  dryRun: process.env.DRY_RUN === '1',
} as const;

export type Config = typeof config;
