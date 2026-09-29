/**
 * Reading the day's passage from the site.
 */

import { config } from './config.js';
import type { DailyPayload } from './messages.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FetchOptions {
  attempts?: number;
  onRetry?: (attempt: number, waitMs: number, reason: string) => void;
}

/**
 * Reads /api/daily, waiting out a cold generation.
 *
 * A 503 means the interpretation is still being written, which is expected
 * when the hourly warm has not run yet -- and this very request is what
 * starts it. So the backoff is generous: the first attempt kicks the
 * generation off and a later one collects it.
 */
export async function fetchDaily(
  slot: DailyPayload['slot'] = 'passage',
  options: FetchOptions = {},
): Promise<DailyPayload> {
  const attempts = options.attempts ?? 5;
  const waits = [30_000, 60_000, 120_000, 240_000];
  let lastReason = 'no attempt made';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${config.apiBase}/api/daily?slot=${slot}`, {
        signal: AbortSignal.timeout(120_000),
        headers: config.botToken ? { Authorization: `Bearer ${config.botToken}` } : {},
      });
      const body = (await response.json()) as Partial<DailyPayload> & { error?: string };

      if (response.ok && body.ready && body.text && body.interpretation) {
        return { ...body, slot: body.slot ?? slot } as DailyPayload;
      }
      lastReason = body.error ?? `HTTP ${response.status}`;
    } catch (error) {
      lastReason = (error as Error).message;
    }

    if (attempt < attempts) {
      const wait = waits[Math.min(attempt - 1, waits.length - 1)];
      options.onRetry?.(attempt, wait, lastReason);
      await sleep(wait);
    }
  }

  throw new Error(`Could not fetch the daily reading: ${lastReason}`);
}
