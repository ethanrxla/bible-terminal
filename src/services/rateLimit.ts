/**
 * Client-side pacing for AI requests.
 *
 * NVIDIA's free tier allows roughly 40 requests/minute per model and answers
 * with a bare `{"status":429,"title":"Too Many Requests"}` once you exceed it.
 * The app can easily burst past that -- the home screen alone fires an
 * interpretation for the verse and another for the passage the moment it
 * mounts -- so every call is funnelled through one shared queue that caps
 * concurrency and spaces requests out, then retried with backoff if the
 * server says no anyway.
 */

export interface RateLimitInfo {
  /** Attempt number that just failed, 1-based. */
  attempt: number;
  /** Milliseconds we are about to wait before retrying. */
  waitMs: number;
}

/** Thrown when retries are exhausted, so callers can distinguish this case. */
export class RateLimitedError extends Error {
  constructor(public readonly attempts: number) {
    super(`AI provider unavailable after ${attempts} attempts`);
    this.name = 'RateLimitedError';
  }
}

interface HttpishError {
  status?: number;
  headers?: Headers | Record<string, string>;
}

export function isRateLimitError(error: unknown): boolean {
  return (error as HttpishError | null)?.status === 429;
}

/**
 * Phrases NVIDIA uses for load and capacity problems.
 *
 * These have to be matched on text because the failure can arrive *inside* a
 * successful response: the endpoint answers HTTP 200, starts the SSE stream,
 * and only then emits "Service temporarily overloaded" as a stream event. The
 * SDK surfaces that from the stream iterator with no HTTP status attached, so
 * a status-only check silently treats a retryable overload as a hard failure.
 */
const TRANSIENT_MESSAGE =
  /overload|temporarily unavailable|not ready to serve|try again|capacity|timed? ?out/i;

/**
 * Errors worth retrying against the same model: rate limits, the 5xx a
 * provider returns when a model is momentarily overloaded rather than
 * withdrawn, and mid-stream capacity errors. A 400/404 means this model is not
 * coming back on its own, so it is handled by falling through the model chain
 * instead.
 */
export function isTransientError(error: unknown): boolean {
  const err = error as HttpishError | null;
  if (!err) return false;

  const status = err.status;
  if (status === 429 || (status !== undefined && status >= 500)) return true;

  const message = `${(err as { message?: string }).message ?? ''}`;
  return status === undefined && TRANSIENT_MESSAGE.test(message);
}

/** Reads `Retry-After` (seconds) from an SDK error, if the server sent one. */
function retryAfterMs(error: unknown): number | undefined {
  const headers = (error as HttpishError | null)?.headers;
  if (!headers) return undefined;

  const raw =
    typeof (headers as Headers).get === 'function'
      ? (headers as Headers).get('retry-after')
      : (headers as Record<string, string>)['retry-after'];

  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs tasks at most `concurrency` at a time, never starting two within
 * `minIntervalMs` of each other. Order is preserved.
 */
export class RequestQueue {
  private pending: Array<() => void> = [];
  private active = 0;
  private lastStart = 0;

  constructor(
    private readonly concurrency: number,
    private readonly minIntervalMs: number
  ) {}

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.drain();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.pending.push(resolve));
    }
    this.active += 1;

    const wait = this.lastStart + this.minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastStart = Date.now();
  }

  private drain(): void {
    const next = this.pending.shift();
    if (next) next();
  }
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Called before each backoff wait, so the UI can say "rate limited". */
  onRateLimit?: (info: RateLimitInfo) => void;
  signal?: AbortSignal;
}

/**
 * Retries `task` on transient failures with exponential backoff plus jitter,
 * honouring `Retry-After` when the server provides it. Other errors propagate
 * immediately -- a bad request will not become good by waiting.
 */
export async function withRateLimitRetry<T>(
  task: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    // NVIDIA's limit is a per-minute window, so a run of retries needs to be
    // able to outlast a full window: 4s + 8s + 16s + 30s ~= 58s.
    maxAttempts = 5,
    baseDelayMs = 4000,
    maxDelayMs = 30000,
    onRateLimit,
    signal,
  } = options;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (signal?.aborted) throw error;
      if (!isTransientError(error)) throw error;
      if (attempt >= maxAttempts) throw new RateLimitedError(attempt);

      // Jitter keeps several panels retrying at once from re-colliding.
      const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const waitMs = retryAfterMs(error) ?? backoff + Math.random() * 500;

      onRateLimit?.({ attempt, waitMs });
      await sleep(waitMs);
    }
  }
}

/**
 * The single queue every AI call goes through.
 *
 * Three in flight, started at least 2s apart. Concurrency matters more than it
 * looks: the largest models take one to three minutes per answer, so running
 * the home screen's three panels one after another left the last one waiting
 * several minutes. Three at a time with 2s spacing still peaks well under the
 * ~40 requests/minute free-tier ceiling.
 */
export const aiRequestQueue = new RequestQueue(3, 2000);
