import type { BibleContent } from '../hooks/useBible';

export type HourlySlot = 'verse' | 'passage' | 'ethiopian';

export interface HourlyInterpretation {
  text: string;
  /** A discussion prompt. Only the daily passage produces one. */
  question: string | null;
  model: { id: string; label: string };
}

export interface HourlyEditionData {
  content: BibleContent;
  interpretation: HourlyInterpretation | null;
}

/** UTC, so the edition turns over at the same instant for every visitor. */
export function currentHourKey(date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

const EDITION_TZ = 'America/New_York';

/**
 * The reading day, rolling over at 6am Eastern. Must agree exactly with
 * dayKey() in api/hourly.ts: disagree and the browser asks for a key the
 * server calls expired.
 */
export function currentDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EDITION_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const at = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const ymd = `${at('year')}-${at('month')}-${at('day')}`;
  if (Number(at('hour')) >= 6) return ymd;
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/** Mirrors CADENCE in api/hourly.ts. */
export function currentEditionKey(slot: HourlySlot, date = new Date()): string {
  return slot === 'passage' ? currentDayKey(date) : currentHourKey(date);
}

/**
 * One tick covers both cadences. 6am Eastern always falls exactly on a UTC
 * hour boundary, so the hourly tick already lands on the daily rollover --
 * correctness comes from the key, not from a second timer. When the passage
 * key has not changed, the client cache answers with no network at all.
 *
 * The two-second cushion keeps the browser from asking for an edition a
 * moment before the server agrees it has begun.
 */
export function millisecondsUntilNextHour(now = Date.now()): number {
  const hour = 60 * 60 * 1000;
  return (Math.floor(now / hour) + 1) * hour - now + 2000;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads the shared edition. It is the only source of the three readings, by
 * design. Two cadences pass through it: the verse and Ethiopian slots keyed
 * by hour, the passage keyed by the 6am-Eastern reading day.
 *
 * There is deliberately no client-side fallback that picks its own passage.
 * There used to be, and it was the cause of readers seeing different verses:
 * the fallback and the server both seeded from the hour, but drew from
 * slightly different pools, so they disagreed -- the fallback would offer
 * "Jubilees 29:2" where the server said "Job 22:29". Whenever the server was
 * slow (a cold generation takes 15-50s), a phone would quietly fall back and
 * show something nobody else was reading, and refreshing could swap between
 * the two.
 *
 * So this retries the endpoint instead. If it truly cannot be reached the
 * caller is told, and the reader sees an honest "unavailable" rather than a
 * private edition of scripture.
 */
class HourlyEditionClient {
  // v6: the payload gained interpretation.question, and the passage slot's
  // key changed shape from an hour to a day.
  private static readonly CACHE_PREFIX = 'bible-terminal:edition:v6';
  private static readonly ATTEMPTS = 3;

  private readonly memory = new Map<string, HourlyEditionData>();
  private readonly inflight = new Map<string, Promise<HourlyEditionData>>();

  private key(editionKey: string, slot: HourlySlot): string {
    return `${HourlyEditionClient.CACHE_PREFIX}:${editionKey}:${slot}`;
  }

  private readCache(key: string): HourlyEditionData | undefined {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as HourlyEditionData) : undefined;
    } catch {
      return undefined;
    }
  }

  private writeCache(key: string, value: HourlyEditionData): void {
    try {
      // Drop superseded editions so storage cannot grow without bound. Both
      // live keys are spared: evicting everything but the current hour, as
      // this once did, would throw away the daily passage every hour and make
      // the client refetch it 23 more times a day than it needs to.
      const live = [
        `${HourlyEditionClient.CACHE_PREFIX}:${currentHourKey()}`,
        `${HourlyEditionClient.CACHE_PREFIX}:${currentDayKey()}`,
      ];
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const existing = localStorage.key(i);
        if (!existing?.startsWith(HourlyEditionClient.CACHE_PREFIX)) continue;
        if (live.some((prefix) => existing.startsWith(prefix))) continue;
        localStorage.removeItem(existing);
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The CDN copy is still shared; this only affects reload speed.
    }
  }

  async get(editionKey: string, slot: HourlySlot): Promise<HourlyEditionData> {
    const key = this.key(editionKey, slot);

    const inMemory = this.memory.get(key);
    if (inMemory) return inMemory;

    // A complete stored edition is exactly what the server would return, so a
    // reload can be served from it without another round trip.
    const stored = this.readCache(key);
    if (stored?.content?.text && stored.interpretation) {
      this.memory.set(key, stored);
      return stored;
    }

    const running = this.inflight.get(key);
    if (running) return running;

    const promise = this.fetchEdition(editionKey, slot)
      .then((edition) => {
        this.memory.set(key, edition);
        this.writeCache(key, edition);
        return edition;
      })
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, promise);
    return promise;
  }

  private async fetchEdition(editionKey: string, slot: HourlySlot): Promise<HourlyEditionData> {
    const query = new URLSearchParams({ key: editionKey, slot });
    let lastError: unknown;

    for (let attempt = 1; attempt <= HourlyEditionClient.ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(`/api/hourly?${query}`, {
          signal: AbortSignal.timeout(58_000),
        });

        // A dev server answers unknown /api paths with the SPA shell: HTTP 200
        // carrying HTML. Parsing that yields an empty object which would sail
        // past an `ok` check and blank the scripture.
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Hourly endpoint returned ${contentType || 'no content type'}`);
        }

        const body = (await response.json()) as HourlyEditionData & { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? `Hourly endpoint returned ${response.status}`);
        }
        if (!body.content?.text) throw new Error('Hourly endpoint returned no scripture');

        return {
          content: { ...body.content, editionKey, editionSlot: slot },
          interpretation: body.interpretation ?? null,
        };
      } catch (error) {
        lastError = error;
        if (attempt < HourlyEditionClient.ATTEMPTS) {
          // A cold generation can take most of a minute; give it room.
          await sleep(3000 * attempt);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('The shared edition could not be loaded');
  }
}

export const hourlyEdition = new HourlyEditionClient();

export async function getEditionContent(
  editionKey: string,
  slot: HourlySlot,
): Promise<BibleContent> {
  return (await hourlyEdition.get(editionKey, slot)).content;
}

export async function getEditionInterpretation(
  editionKey: string,
  slot: HourlySlot,
): Promise<HourlyInterpretation> {
  const edition = await hourlyEdition.get(editionKey, slot);
  if (!edition.interpretation) {
    throw new Error(
      slot === 'passage'
        ? 'Today’s interpretation is not ready yet.'
        : 'This hour’s interpretation is not ready yet.',
    );
  }
  return edition.interpretation;
}

/**
 * The daily passage, named separately from the hourly readings because it is
 * the one the site leads with and the one sent to the family group each
 * morning -- callers should not have to remember which slot is on which
 * cadence.
 */
export function getDailyPassage(day = currentDayKey()): Promise<BibleContent> {
  return getEditionContent(day, 'passage');
}

export function getDailyPassageInterpretation(
  day = currentDayKey(),
): Promise<HourlyInterpretation> {
  return getEditionInterpretation(day, 'passage');
}
