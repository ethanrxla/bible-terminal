import type { CanonSection } from '../types/canon';
import { streamCompletion, type ChatMessage } from './sse';
import {
  aiRequestQueue,
  withRateLimitRetry,
  RateLimitedError,
  type RateLimitInfo,
} from './rateLimit';
import {
  candidateModels,
  isModelUnavailable,
  markHealthy,
  markUnavailable,
  type ModelProfile,
} from './models';

/**
 * Reasoning models spend thinking tokens from the same `max_tokens` budget as
 * the answer. Too small a ceiling and the reasoning consumes everything,
 * leaving `content` empty with `finish_reason: "length"`.
 */
const MAX_TOKENS = 2048;

export interface AiCallOptions {
  signal?: AbortSignal;
  /** Fires each time a 429 sends us into a backoff wait. */
  onRateLimit?: (info: RateLimitInfo) => void;
  /** Fires when a model is chosen, so the UI can attribute the answer. */
  onModel?: (model: ModelProfile) => void;
}

export interface AiResult {
  text: string;
  model: ModelProfile;
}

// --- scripture-grounded question answering -----------------------------------

export interface PassageQuestion {
  question: string;
  passage?: { text: string; reference: string; canon?: CanonSection };
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const QA_SYSTEM_PROMPT = `You are a biblical scholar answering questions for a reader of the Ethiopian Orthodox Tewahedo Bible.

Ground rules:
- Scripture is your primary source. Answer from the biblical text first, and cite it.
- Cite every substantive claim with a specific reference in "Book Chapter:Verse" form, for example "Genesis 1:1" or "1 Enoch 1:9". Put the citation inline, right after the claim it supports.
- The reader's canon is the Ethiopian Orthodox Tewahedo canon of 81 books. It includes Enoch, Jubilees, the Meqabyan, and the deuterocanonical books. When you cite a book that is canonical in this tradition but not in the Protestant canon, say so briefly the first time you cite it.
- Distinguish clearly between what the text says, what the Ethiopian Orthodox tradition teaches, and what is scholarly reconstruction. Do not present the last two as if they were the first.
- If scripture does not settle the question, say so plainly rather than inventing support for an answer.
- Never invent a citation. If you are not certain a verse says what you need, do not cite it.
- Answer with substance, but stay under roughly four paragraphs.`;

export async function askAboutPassage(
  request: PassageQuestion,
  onToken: (delta: string) => void,
  options: AiCallOptions = {},
): Promise<AiResult> {
  const messages: ChatMessage[] = [{ role: 'system', content: QA_SYSTEM_PROMPT }];

  if (request.passage) {
    const { text, reference, canon } = request.passage;
    const canonNote =
      canon === 'ethiopian'
        ? ' This book is canonical in the Ethiopian Orthodox Tewahedo Church and not in the Protestant or Catholic canons.'
        : canon === 'deuterocanonical'
          ? ' This book is deuterocanonical.'
          : '';

    messages.push({
      role: 'user',
      content: `The reader is currently looking at ${reference}:\n\n"${text}"${canonNote}`,
    });
    messages.push({ role: 'assistant', content: 'Understood. I have that passage in view.' });
  }

  for (const turn of request.history ?? []) messages.push(turn);
  messages.push({ role: 'user', content: request.question });

  return streamChat(messages, onToken, { ...options, temperature: 0.4, maxTokens: 2048 });
}

// --- shared plumbing ---------------------------------------------------------

/**
 * Streams a completion, walking the model chain until one answers.
 *
 * A model that reports itself unavailable is cooled down and the next is tried
 * immediately, so an upstream outage costs one failed request rather than
 * taking the feature down for as long as the outage lasts.
 */
async function streamChat(
  messages: ChatMessage[],
  onToken: (delta: string) => void,
  options: AiCallOptions & { temperature: number; maxTokens?: number },
): Promise<AiResult> {
  const { signal, onRateLimit, onModel, temperature, maxTokens = MAX_TOKENS } = options;

  return aiRequestQueue.schedule(async () => {
    const models = candidateModels();
    let lastError: unknown;

    for (const model of models) {
      try {
        return await withRateLimitRetry(
          async () => {
            const [system, ...rest] = messages;
            const withPrefix: ChatMessage[] = [
              { ...system, content: model.systemPrefix + system.content },
              ...rest,
            ];

            onModel?.(model);

            const full = await streamCompletion(
              {
                model: model.id,
                messages: withPrefix,
                max_tokens: maxTokens,
                temperature,
                signal,
                params: model.params,
              },
              onToken,
            );

            markHealthy(model.id);
            return { text: full.trim(), model };
          },
          { signal, onRateLimit },
        );
      } catch (error) {
        if (signal?.aborted) throw error;

        // A model that stayed overloaded through every retry is worth stepping
        // past too, but it is not marked unavailable -- it is busy, not gone.
        if (error instanceof RateLimitedError) {
          console.warn(`${model.id} stayed unavailable through retries.`, error);
          lastError = error;
          continue;
        }

        if (isModelUnavailable(error)) {
          console.warn(`${model.id} unavailable, falling through to the next model.`, error);
          markUnavailable(model.id);
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('No AI model is currently available');
  });
}
