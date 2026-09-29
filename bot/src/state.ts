/**
 * Which reading day has already been sent.
 *
 * One small file, because the alternative is posting scripture to the family
 * group twice. Written to a temporary name and renamed into place: rename is
 * atomic on a single filesystem, so a crash mid-write cannot leave a
 * half-written file that parses as "nothing has been sent".
 */

import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface SentState {
  lastSentDay: string | null;
  sentAt: string | null;
}

const EMPTY: SentState = { lastSentDay: null, sentAt: null };

/**
 * A single-instance guard.
 *
 * The send log alone cannot prevent a duplicate: two processes both read
 * "not sent yet", both send, and only then does either write. What actually
 * prevents it is there being one process. This also protects the Baileys
 * auth directory, which two sockets writing at once will corrupt.
 *
 * Exclusive create (wx) is the lock: the filesystem decides the winner, so
 * there is no window between checking and claiming. A lock left behind by a
 * killed process is taken over only after confirming that pid is gone.
 */
export async function acquireLock(dir: string): Promise<() => Promise<void>> {
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, 'bot.lock');

  const claim = async () => {
    const handle = await open(file, 'wx');
    await handle.writeFile(JSON.stringify({ pid: process.pid, since: new Date().toISOString() }));
    await handle.close();
  };

  try {
    await claim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;

    const holder = Number(
      JSON.parse(await readFile(file, 'utf8').catch(() => '{}')).pid ?? 0,
    );
    if (holder && holder !== process.pid && isRunning(holder)) {
      throw new Error(
        `Another bible-bot is already running (pid ${holder}). ` +
          'Stop it first -- two processes would send the day twice.',
      );
    }
    // The holder is gone; the lock is stale.
    await rm(file, { force: true });
    await claim();
  }

  return async () => {
    await rm(file, { force: true });
  };
}

function isRunning(pid: number): boolean {
  try {
    // Signal 0 checks for the process without touching it.
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export class SendLog {
  private readonly file: string;

  constructor(private readonly dir: string) {
    this.file = path.join(dir, 'sent.json');
  }

  async read(): Promise<SentState> {
    try {
      return { ...EMPTY, ...(JSON.parse(await readFile(this.file, 'utf8')) as SentState) };
    } catch {
      // Missing or unreadable: treat as "nothing sent yet". The catch-up
      // window in index.ts is what keeps that from meaning "send anything".
      return EMPTY;
    }
  }

  async markSent(day: string): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const body = JSON.stringify({ lastSentDay: day, sentAt: new Date().toISOString() }, null, 2);
    const temporary = `${this.file}.tmp`;
    await writeFile(temporary, body, 'utf8');
    await rename(temporary, this.file);
  }
}
