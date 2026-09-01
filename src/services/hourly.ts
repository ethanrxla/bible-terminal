import type { BibleContent } from '../hooks/useBible';

export type HourlySlot = 'verse' | 'passage' | 'ethiopian';

export interface HourlyInterpretation {
  text: string;
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

export function millisecondsUntilNextHour(now = Date.now()): number {
  const hour = 60 * 60 * 1000;
  return (Math.floor(now / hour) + 1) * hour - now;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads the shared hourly edition. It is the only source of the three hourly
 * readings, by design.
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
  private static readonly CACHE_PREFIX = 'bible-terminal:edition:v5';
  private static readonly ATTEMPTS = 3;

  private readonly memory = new Map<string, HourlyEditionData>();
  private readonly inflight = new Map<string, Promise<HourlyEditionData>>();

  private key(hour: string, slot: HourlySlot): string {
    return `${HourlyEditionClient.CACHE_PREFIX}:${hour}:${slot}`;
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
      // Drop other hours so storage cannot grow without bound.
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const existing = localStorage.key(i);
        if (
          existing?.startsWith(HourlyEditionClient.CACHE_PREFIX) &&
          !existing.startsWith(`${HourlyEditionClient.CACHE_PREFIX}:${value.content.hourlyHour}`)
        ) {
          localStorage.removeItem(existing);
        }
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The CDN copy is still shared; this only affects reload speed.
    }
  }

  async get(hour: string, slot: HourlySlot): Promise<HourlyEditionData> {
    const key = this.key(hour, slot);

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

    const promise = this.fetchEdition(hour, slot)
      .then((edition) => {
        this.memory.set(key, edition);
        this.writeCache(key, edition);
        return edition;
      })
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, promise);
    return promise;
  }

  private async fetchEdition(hour: string, slot: HourlySlot): Promise<HourlyEditionData> {
    const query = new URLSearchParams({ hour, slot });
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
          content: { ...body.content, hourlyHour: hour, hourlySlot: slot },
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

export async function getHourlyContent(hour: string, slot: HourlySlot): Promise<BibleContent> {
  return (await hourlyEdition.get(hour, slot)).content;
}

export async function getHourlyInterpretation(
  hour: string,
  slot: HourlySlot,
): Promise<HourlyInterpretation> {
  const edition = await hourlyEdition.get(hour, slot);
  if (!edition.interpretation) {
    throw new Error('This hour’s interpretation is not ready yet.');
  }
  return edition.interpretation;
}
