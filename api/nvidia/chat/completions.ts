/**
 * Vercel Edge Function proxying chat completions to NVIDIA's OpenAI-compatible
 * endpoint.
 *
 * This proxy exists because `integrate.api.nvidia.com` sends no
 * `Access-Control-Allow-Origin` header, so the browser cannot call it directly.
 * Routing through here also keeps NVIDIA_API_KEY out of the client bundle.
 *
 * Nested filesystem routing means the client's `/api/nvidia/chat/completions`
 * resolves here without a vercel.json rewrite. That path is also exactly what
 * the OpenAI SDK produces from `baseURL: '/api/nvidia'`.
 */

export const config = { runtime: 'edge' };

const UPSTREAM = 'https://integrate.api.nvidia.com/v1/chat/completions';

// A deployed proxy is unauthenticated, so anything not on this list is refused
// rather than letting a stranger spend the account's NVIDIA credits on any
// model in the catalog.
// Keep in sync with MODEL_CHAIN in src/services/models.ts. The client falls
// through this list when a model is degraded upstream, so every id it may
// attempt has to be accepted here.
const ALLOWED_MODELS = new Set([
  'moonshotai/kimi-k3',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3-super-120b-a12b',
]);
const MAX_TOKENS = 4096;
const MAX_MESSAGES = 40;
const MAX_BODY_BYTES = 256 * 1024;

/**
 * Rate limiting.
 *
 * Two windows, because they defend different things. The per-IP window stops
 * one visitor monopolising the endpoint; the global window protects the
 * NVIDIA account quota itself, which is shared across every visitor and sits
 * at roughly 40 requests/minute on the free tier.
 *
 * State is in-module, so it is per edge instance and resets on cold start --
 * best-effort, not a hard guarantee. Swap `hit()` for a Vercel KV / Upstash
 * counter if this ever needs to hold across instances.
 */
const WINDOW_MS = 60_000;
// One honest page load is three interpretations, each of which may walk the
// model chain and retry a transient failure, so a dozen requests a minute is
// well within normal use -- the old limit of 12 throttled a single reader.
const PER_IP_LIMIT = 30;
// The global ceiling exists to protect the shared NVIDIA account quota
// (roughly 40 requests/minute on the free tier), not to stop any one visitor.
const GLOBAL_LIMIT = 40;

interface Window { count: number; resetAt: number; }

const perIp = new Map<string, Window>();
const globalWindow: Window = { count: 0, resetAt: 0 };

function hit(win: Window, limit: number, now: number): { ok: boolean; retryAfter: number } {
  if (now >= win.resetAt) {
    win.count = 0;
    win.resetAt = now + WINDOW_MS;
  }
  win.count += 1;
  return {
    ok: win.count <= limit,
    retryAfter: Math.max(1, Math.ceil((win.resetAt - now) / 1000)),
  };
}

/** Drops windows that have aged out, so the map cannot grow without bound. */
function sweep(now: number): void {
  if (perIp.size < 1000) return;
  for (const [key, win] of perIp) {
    if (now >= win.resetAt) perIp.delete(key);
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function tooManyRequests(retryAfter: number, scope: string): Response {
  return new Response(
    JSON.stringify({ error: `Rate limit exceeded (${scope}). Retry in ${retryAfter}s.` }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  if (!process.env.NVIDIA_API_KEY) {
    return json({ error: 'NVIDIA_API_KEY is not configured on the server' }, 500);
  }

  const now = Date.now();
  sweep(now);

  const ip = clientIp(req);
  let ipWindow = perIp.get(ip);
  if (!ipWindow) {
    ipWindow = { count: 0, resetAt: 0 };
    perIp.set(ip, ipWindow);
  }

  const ipHit = hit(ipWindow, PER_IP_LIMIT, now);
  if (!ipHit.ok) return tooManyRequests(ipHit.retryAfter, 'per-IP');

  const globalHit = hit(globalWindow, GLOBAL_LIMIT, now);
  if (!globalHit.ok) return tooManyRequests(globalHit.retryAfter, 'global');

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'Request body too large' }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body.model !== 'string' || !ALLOWED_MODELS.has(body.model)) {
    return json(
      { error: `Model not allowed. Permitted: ${[...ALLOWED_MODELS].join(', ')}` },
      400
    );
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json({ error: '`messages` must be a non-empty array' }, 400);
  }
  if (body.messages.length > MAX_MESSAGES) {
    return json({ error: `Too many messages (max ${MAX_MESSAGES})` }, 400);
  }

  const requested = typeof body.max_tokens === 'number' ? body.max_tokens : 512;
  body.max_tokens = Math.min(Math.max(requested, 1), MAX_TOKENS);

  const stream = body.stream === true;

  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: stream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return json({ error: `Upstream request failed: ${String(error)}` }, 502);
  }

  const headers: Record<string, string> = {
    'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    'Cache-Control': 'no-cache, no-transform',
  };

  // NVIDIA's own 429s carry the authoritative backoff; hand it to the client
  // rather than letting it guess.
  const upstreamRetryAfter = upstream.headers.get('retry-after');
  if (upstreamRetryAfter) headers['Retry-After'] = upstreamRetryAfter;

  // Pass the body straight through so SSE chunks reach the client as they
  // arrive rather than being buffered into a single response.
  return new Response(upstream.body, { status: upstream.status, headers });
}
