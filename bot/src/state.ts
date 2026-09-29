/**
 * Which reading day has already been sent.
 *
 * One small file, because the alternative is posting scripture to the family
 * group twice. Written to a temporary name and renamed into place: rename is
 * atomic on a single filesystem, so a crash mid-write cannot leave a
 * half-written file that parses as "nothing has been sent".
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface SentState {
  lastSentDay: string | null;
  sentAt: string | null;
}

const EMPTY: SentState = { lastSentDay: null, sentAt: null };

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
