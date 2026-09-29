/**
 * The model chain.
 *
 * Models are tried in order and the first healthy one answers. A model that
 * fails with an outage-shaped error is put in a cooldown rather than being
 * abandoned, so the chain heals by itself: when NVIDIA brings kimi-k3 back,
 * the next request after its cooldown expires picks it up again with no
 * redeploy and no config change.
 */

export interface ModelProfile {
  id: string;
  /** Shown in the UI so a reader can see which model answered. */
  label: string;
  /**
   * Prepended to the system message. Nemotron reads the literal phrase
   * "detailed thinking off" and will otherwise spill its reasoning into the
   * visible answer; kimi-k3 uses a parameter instead.
   */
  systemPrefix: string;
  params: Record<string, unknown>;
}

export const MODEL_CHAIN: ModelProfile[] = [
  {
    id: 'moonshotai/kimi-k3',
    label: 'Kimi K3',
    systemPrefix: '',
    params: { reasoning_effort: 'low' },
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    label: 'Nemotron 3 Ultra',
    systemPrefix: 'detailed thinking off\n\n',
    params: {},
  },
  // Last resort. Much faster than Ultra (~15s against one to three minutes)
  // and perfectly capable of an English interpretation, though far weaker on
  // Ge'ez -- which is why the offline translation script does not use it.
  // Having it here means a reader gets a real answer rather than static filler
  // when the larger models are saturated.
  //
  // This slot previously held nvidia/nemotron-3-nano-30b-a3b, which NVIDIA
  // retired; it now answers 410 "end of life", so the chain had no working
  // last resort. Models here go away without warning -- verify a replacement
  // against the live endpoint before trusting it.
  {
    id: 'nvidia/nemotron-3-super-120b-a12b',
    label: 'Nemotron 3 Super',
    systemPrefix: 'detailed thinking off\n\n',
    params: {},
  },
];

/** Every id the proxy must accept. Keep in sync with the edge function. */
export const ALLOWED_MODEL_IDS = MODEL_CHAIN.map((model) => model.id);

const COOLDOWN_MS = 10 * 60 * 1000;
const STORAGE_KEY = 'bible-terminal:model-health';

/**
 * Cooldowns are persisted. Held only in memory, every page load re-probed a
 * model that is known to be down -- one wasted round trip per panel, per
 * reload, which on a free tier is quota that could have gone to a model that
 * actually answers.
 */
function loadHealth(): Map<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const entries = JSON.parse(raw) as Array<[string, number]>;
    const now = Date.now();
    return new Map(entries.filter(([, until]) => until > now));
  } catch {
    return new Map();
  }
}

function saveHealth(map: Map<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...map]));
  } catch {
    // Falls back to in-memory only.
  }
}

const unhealthyUntil = loadHealth();

interface HttpishError {
  status?: number;
  message?: string;
  error?: { message?: string };
}

/**
 * True for errors that mean "this model is not serving right now" as opposed
 * to "this request was wrong".
 *
 * NVIDIA reports a withdrawn model as `400 DEGRADED function cannot be
 * invoked` and an unprovisioned one as 404, so a bare status check is not
 * enough -- the 400 has to be read.
 */
export function isModelUnavailable(error: unknown): boolean {
  const err = error as HttpishError | null;
  if (!err) return false;

  const status = err.status;
  if (status === undefined) return false;

  // 5xx is deliberately absent: an overloaded model is retried by
  // withRateLimitRetry rather than being written off and cooled down.
  if (status === 404 || status === 410) return true;

  // NVIDIA reports a withdrawn model as `400 DEGRADED function cannot be
  // invoked`. We cannot match on that text: on a streaming request the SDK
  // surfaces only "400 status code (no body)", because the error body never
  // survives the SSE error path. So a 400 is treated as "this model is not
  // serving" and the chain falls through.
  //
  // The trade-off is deliberate. A genuinely malformed request would also fall
  // through, but it would then fail on every model and surface anyway, whereas
  // treating a real outage as fatal takes the whole feature down -- which is
  // exactly what happened before this was fixed.
  if (status === 400) return true;

  return false;
}

export function markUnavailable(modelId: string): void {
  unhealthyUntil.set(modelId, Date.now() + COOLDOWN_MS);
  saveHealth(unhealthyUntil);
}

export function markHealthy(modelId: string): void {
  if (unhealthyUntil.delete(modelId)) saveHealth(unhealthyUntil);
}

function isCoolingDown(modelId: string): boolean {
  const until = unhealthyUntil.get(modelId);
  if (until === undefined) return false;
  if (Date.now() >= until) {
    // Cooldown expired: let it be tried again so recovery is automatic.
    unhealthyUntil.delete(modelId);
    saveHealth(unhealthyUntil);
    return false;
  }
  return true;
}

/**
 * Models to try, preferred first. If every model is cooling down we return the
 * whole chain anyway — better to attempt a call and fail loudly than to refuse
 * outright on possibly stale health data.
 */
export function candidateModels(): ModelProfile[] {
  const healthy = MODEL_CHAIN.filter((model) => !isCoolingDown(model.id));
  return healthy.length > 0 ? healthy : MODEL_CHAIN;
}
