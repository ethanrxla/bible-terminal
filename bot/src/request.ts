/**
 * One-off send requests.
 *
 * A signal cannot carry arguments and a second process cannot run (the
 * single-instance lock refuses it), so a scheduled one-off reaches the
 * running bot through a small request file that it picks up and deletes.
 *
 *   echo '{"slot":"verse"}' > $DATA_DIR/send-now.json
 */

import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import type { SendPart } from './messages.js';

export interface SendRequest {
  slot: 'verse' | 'passage' | 'ethiopian';
  parts?: SendPart[];
}

/**
 * Reads and consumes a pending request. Deleted before the send runs, not
 * after: a request that crashes the process must not be retried forever on
 * every restart.
 */
export async function takeRequest(dir: string): Promise<SendRequest | null> {
  const file = path.join(dir, 'send-now.json');
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    return null;
  }
  await rm(file, { force: true });

  try {
    const parsed = JSON.parse(raw) as Partial<SendRequest>;
    const slot = parsed.slot ?? 'passage';
    if (!['verse', 'passage', 'ethiopian'].includes(slot)) return null;
    return { slot, parts: parsed.parts };
  } catch {
    return null;
  }
}
