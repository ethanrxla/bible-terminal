import OpenAI from 'openai';
import type { CanonSection } from '../types/canon';
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
 * All AI traffic goes to NVIDIA's OpenAI-compatible endpoint through our own
 * proxy. The SDK builds request URLs with `new URL(...)`, which rejects a bare
 * path, so the origin has to be spelled out even though this is same-origin.
 */
const PROXY_BASE_URL = `${globalThis.location?.origin ?? 'http://localhost:5173'}/api/nvidia`;

const client = new OpenAI({
  baseURL: PROXY_BASE_URL,
  apiKey: 'proxied-server-side',
  dangerouslyAllowBrowser: true,
  // Retries live in ./rateLimit so the UI can show a "retrying" state rather
  // than sitting silent inside the SDK.
  maxRetries: 0,
});

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

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// --- interpretations ---------------------------------------------------------

export type InterpretationType = 'verse' | 'passage' | 'story';

export interface InterpretationRequest {
  text: string;
  reference: string;
  type: InterpretationType;
  /** Where the book sits in the EOTC canon; steers the reading tradition. */
  canon?: CanonSection;
  /** Ge'ez title, when we have one, so the model can name the book properly. */
  geezName?: string;
  /**
   * Surrounding verses. Supplying these is what lets the model describe what is
   * happening around the passage instead of guessing from the reference alone.
   */
  context?: { before: string; after: string; chapterReference: string };
}

function canonGuidance(canon: CanonSection | undefined, geezName?: string): string {
  const geez = geezName ? ` Its Ge’ez title is ${geezName}.` : '';

  if (canon === 'ethiopian') {
    return (
      ` This passage is from a book canonical in the Ethiopian Orthodox Tewahedo Church ` +
      `and not found in the Protestant or Catholic canons.${geez} Interpret it from within ` +
      `the Ethiopian Orthodox Tewahedo tradition, noting briefly why it is received there.`
    );
  }
  if (canon === 'deuterocanonical') {
    return (
      ` This passage is deuterocanonical: received as scripture by the Ethiopian Orthodox ` +
      `Tewahedo, Catholic, and Eastern Orthodox churches, though not in the Protestant canon.${geez}`
    );
  }
  return geez;
}

/**
 * Kept deliberately identical to `interpretationMessages` in api/hourly.ts.
 * Both paths exist -- the server one for a shared hourly answer where the plan
 * allows a long enough function, this one for streaming in the browser -- and
 * they must not drift into producing differently-shaped interpretations.
 */
function interpretationMessages(request: InterpretationRequest): ChatMessage[] {
  const system = `You are a biblical scholar and historian writing for a reader of the Ethiopian Orthodox Tewahedo Bible. You know the historical setting of each book, the literary shape of its argument, and the tradition that received it.${canonGuidance(request.canon, request.geezName)}

Write three short paragraphs, with no headings and no bullet points. First, place the passage in its historical setting, naming the period, place, audience, and relevant political or religious pressure where known. Second, explain what happens in the supplied surrounding verses and how the passage connects to them, including an original-language detail or custom only when it materially helps. Third, draw out its meaning for a reader today, grounded in that setting. Be specific; do not write generic encouragement or merely restate the verse. State uncertainty rather than inventing detail.`;

  let user = `Interpret this Bible ${request.type} from ${request.reference}:\n\n"${request.text}"`;
  const context = request.context;
  if (context && (context.before || context.after)) {
    user += `\n\nSurrounding text from ${context.chapterReference}:`;
    if (context.before) user += `\n\nImmediately before:\n"${context.before}"`;
    if (context.after) user += `\n\nImmediately after:\n"${context.after}"`;
    user += '\n\nUse this context, but interpret only the selected passage.';
  }

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export async function generateInterpretationStream(
  request: InterpretationRequest,
  onToken: (delta: string) => void,
  options: AiCallOptions = {},
): Promise<AiResult> {
  return streamChat(interpretationMessages(request), onToken, {
    ...options,
    temperature: 0.7,
    maxTokens: 2048,
  });
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

            const stream = await client.chat.completions.create(
              {
                model: model.id,
                messages: withPrefix,
                max_tokens: maxTokens,
                temperature,
                stream: true,
                ...model.params,
              },
              { signal },
            );

            onModel?.(model);

            let full = '';
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                full += delta;
                onToken(delta);
              }
            }

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
