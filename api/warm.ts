/**
 * Pre-generates the three readings so no visitor has to wait for them.
 *
 * Without this the first person to arrive pays the whole generation cost
 * (15-50s while the CDN entry is cold) and watches a slot sit on "loading";
 * everyone after them is served from the edge in milliseconds. Running this on
 * the hour moves that cost off the reader entirely.
 *
 * It also covers the daily passage, and that is why no second cron exists.
 * The passage's key comes from Intl inside the function rather than from the
 * time this runs, so a UTC schedule cannot drift away from a 6am-Eastern
 * boundary that shifts with DST: whichever UTC hour happens to contain 6am ET
 * that week, that hour's run does the cold daily generation. The other 23 runs
 * re-request a key already at the edge and cost nothing.
 *
 * Each slot is warmed by requesting /api/hourly, which means every slot gets
 * its own function invocation and its own 60s budget rather than sharing this
 * one. This handler only needs them to start, so it does not insist on
 * awaiting all three: an invocation already in flight finishes and populates
 * the CDN whether or not this request is still listening.
 *
 * Self-contained by necessity -- Vercel does not bundle imports for functions
 * in api/. See the note at the top of api/hourly.ts.
 */

export const config = { runtime: 'nodejs', maxDuration: 60 };

const EDITION_TZ = 'America/New_York';

function hourKey(date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

/**
 * Copied from api/hourly.ts, which cannot be imported here. Must stay
 * identical to it -- a disagreement would warm a key nobody reads.
 */
function dayKey(date = new Date()): string {
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
  return Number(at('hour')) >= 6 ? ymd : previousDayKey(ymd);
}

function previousDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

function targets() {
  return [
    { slot: 'verse', key: hourKey() },
    { slot: 'ethiopian', key: hourKey() },
    { slot: 'passage', key: dayKey() },
  ];
}

function originFor(request: Request): string {
  // VERCEL_URL is the deployment host and has no protocol.
  const fromEnv = process.env.VERCEL_URL;
  if (fromEnv) return `https://${fromEnv}`;
  const host = request.headers.get('host');
  return host ? `https://${host}` : 'http://localhost:3000';
}

export async function GET(request: Request): Promise<Response> {
  // Vercel signs scheduled invocations when CRON_SECRET is configured. When it
  // is set, refuse anything that cannot present it, so the endpoint cannot be
  // used by a stranger to force generations.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.headers.get('authorization');
    if (provided !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const slots = targets();
  const origin = originFor(request);
  const budget = Date.now() + 50_000;

  const results = await Promise.allSettled(
    slots.map(async ({ slot, key }) => {
      const response = await fetch(`${origin}/api/hourly?key=${key}&slot=${slot}`, {
        signal: AbortSignal.timeout(Math.max(1000, budget - Date.now())),
      });
      const body = (await response.json().catch(() => ({}))) as {
        content?: { reference?: string };
        interpretation?: { question?: string | null } | null;
      };
      return {
        slot,
        key,
        status: response.status,
        reference: body.content?.reference ?? null,
        interpreted: Boolean(body.interpretation),
        // Only the passage asks for one; null here on the passage line means
        // the family group loses its discussion message.
        question: body.interpretation?.question ?? null,
      };
    }),
  );

  const warmed = results.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : { slot: slots[index].slot, key: slots[index].key, error: String(result.reason).slice(0, 120) },
  );

  return new Response(JSON.stringify({ hour: hourKey(), day: dayKey(), warmed }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
