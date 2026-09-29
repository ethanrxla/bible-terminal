/**
 * The day's reading, flattened for the WhatsApp bot.
 *
 * The bot could read /api/hourly directly, but then it would need its own copy
 * of the 6am-Eastern day boundary -- the DST logic re-implemented in a second
 * place, in a second runtime, to drift. It also needs a clear "not ready yet"
 * signal it can retry against, which `{ interpretation: null }` is not.
 *
 * So this is a thin proxy: it resolves the day key, asks /api/hourly for that
 * key, and either returns a flat payload or a 503. The inner request is a CDN
 * hit in the normal case (the hourly warm has already populated it), so this
 * costs one edge lookup and duplicates no canon or selection logic.
 *
 * Self-contained by necessity -- Vercel does not bundle imports for functions
 * in api/. See the note at the top of api/hourly.ts. The two key functions
 * below are copies and must stay identical to the ones there.
 */

export const config = { runtime: 'nodejs', maxDuration: 60 };

const EDITION_TZ = 'America/New_York';
const SITE = 'https://bible-terminal.vercel.app';

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

function originFor(request: Request): string {
  // VERCEL_URL is the deployment host and has no protocol.
  const fromEnv = process.env.VERCEL_URL;
  if (fromEnv) return `https://${fromEnv}`;
  const host = request.headers.get('host');
  return host ? `https://${host}` : 'http://localhost:3000';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    // Not cached here: the edition underneath is already held at the edge, and
    // a stored 503 would outlive the condition that caused it.
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

interface Edition {
  content?: {
    text?: string;
    reference?: string;
    translation_name?: string;
    section?: string;
    geezName?: string;
  };
  interpretation?: { text?: string; question?: string | null } | null;
}

export async function GET(request: Request): Promise<Response> {
  // Optional, matching how CRON_SECRET guards /api/warm: unset in development,
  // set in production so only the bot can poll this.
  const token = process.env.BOT_TOKEN;
  if (token && request.headers.get('authorization') !== `Bearer ${token}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const day = dayKey();

  let edition: Edition;
  try {
    const upstream = await fetch(`${originFor(request)}/api/hourly?key=${day}&slot=passage`, {
      signal: AbortSignal.timeout(58_000),
    });
    edition = (await upstream.json()) as Edition;
    if (!upstream.ok) return json({ error: 'Passage unavailable', day, ready: false }, 503);
  } catch (error) {
    return json({ error: (error as Error).message, day, ready: false }, 503);
  }

  // Never hand the bot half an edition. A 503 tells it to back off and retry,
  // and its request has already started the generation it is waiting for.
  if (!edition.content?.text) {
    return json({ error: 'Passage unavailable', day, ready: false }, 503);
  }
  if (!edition.interpretation?.text) {
    return json({ error: 'Interpretation not ready', day, ready: false }, 503);
  }

  return json({
    ready: true,
    day, // the bot's idempotency key
    reference: edition.content.reference ?? '',
    text: edition.content.text,
    translation: edition.content.translation_name ?? '',
    section: edition.content.section ?? 'protocanonical',
    geezName: edition.content.geezName ?? null,
    interpretation: edition.interpretation.text,
    question: edition.interpretation.question ?? null,
    // The homepage, not a per-day permalink: the edition guard only serves
    // the current and previous day, so a dated link would 400 within 48
    // hours -- and on the morning the message is read, the homepage is
    // already showing exactly this passage.
    url: SITE,
  });
}
