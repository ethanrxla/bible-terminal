/**
 * Pre-generates the hour's three readings so no visitor has to wait for them.
 *
 * Without this the first person to arrive in a given hour pays the whole
 * generation cost (15-50s while the CDN entry is cold) and watches a slot sit
 * on "loading"; everyone after them is served from the edge in milliseconds.
 * Running this on the hour moves that cost off the reader entirely.
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

const SLOTS = ['verse', 'passage', 'ethiopian'] as const;

function hourKey(date = new Date()): string {
  return date.toISOString().slice(0, 13);
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

  const hour = hourKey();
  const origin = originFor(request);
  const budget = Date.now() + 50_000;

  const results = await Promise.allSettled(
    SLOTS.map(async (slot) => {
      const response = await fetch(`${origin}/api/hourly?hour=${hour}&slot=${slot}`, {
        signal: AbortSignal.timeout(Math.max(1000, budget - Date.now())),
      });
      const body = (await response.json().catch(() => ({}))) as {
        content?: { reference?: string };
        interpretation?: unknown;
      };
      return {
        slot,
        status: response.status,
        reference: body.content?.reference ?? null,
        interpreted: Boolean(body.interpretation),
      };
    }),
  );

  const warmed = results.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : { slot: SLOTS[index], error: String(result.reason).slice(0, 120) },
  );

  return new Response(JSON.stringify({ hour, warmed }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
