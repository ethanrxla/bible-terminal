/**
 * A minimal client for the proxy's OpenAI-shaped chat completions.
 *
 * This replaces the `openai` SDK, which cost 102 kB raw / 26.5 kB gzipped --
 * a quarter of the JavaScript the site shipped, and roughly 175 ms of
 * download on a throttled phone -- to talk to a same-origin endpoint whose
 * wire format is a few lines of JSON and SSE.
 */

/** Shaped so `isModelUnavailable` and `isRateLimited` can read `.status`. */
export class ChatHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ChatHttpError';
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
  signal?: AbortSignal;
  params?: Record<string, unknown>;
}

/**
 * Streams a completion, calling `onToken` with each delta and resolving with
 * the full text.
 *
 * Unlike the SDK's streaming path, a failed request's body is read and
 * included in the error. The SDK discarded it -- which is why a withdrawn
 * model surfaced only as "400 status code (no body)" and models.ts had to
 * treat every 400 as an outage.
 */
export async function streamCompletion(
  options: StreamOptions,
  onToken: (delta: string) => void,
): Promise<string> {
  const { model, messages, max_tokens, temperature, signal, params } = options;

  const response = await fetch('/api/nvidia/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens, temperature, stream: true, ...params }),
  });

  if (!response.ok || !response.body) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    throw new ChatHttpError(response.status, `${model}: HTTP ${response.status} ${detail}`.trim());
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Events are separated by a blank line, and a chunk boundary can fall
      // anywhere -- including mid-event -- so only whole events are consumed
      // and the remainder stays buffered.
      let split = buffer.indexOf('\n\n');
      while (split !== -1) {
        const event = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        split = buffer.indexOf('\n\n');

        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') return full;
          if (!payload) continue;

          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              onToken(delta);
            }
          } catch {
            // A malformed frame mid-stream is not worth failing the whole
            // answer over; the rest of the stream is usually fine.
          }
        }
      }
    }
  } finally {
    // Releasing matters on the abort path: without it the connection is held
    // open until GC.
    reader.releaseLock();
  }

  return full;
}
