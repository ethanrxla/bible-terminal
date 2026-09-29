/**
 * Replying in the group.
 *
 * The model is reached through the site's own /api/nvidia proxy rather than
 * NVIDIA directly, so the API key stays on Vercel and never lands on the
 * droplet. The proxy enforces its own model allowlist and rate limits.
 */

import { config } from './config.js';
import { looksLikeReasoning } from './reasoning.js';

/** Must be on ALLOWED_MODELS in api/nvidia/chat/completions.ts. */
const MODEL = 'nvidia/nemotron-3-super-120b-a12b';

export interface Turn {
  who: string;
  text: string;
}

export interface ReadingContext {
  reference: string;
  text: string;
}

/**
 * Short on purpose. This is a group chat, not the website: the long-form
 * interpretation already exists there, and a paragraph-long reply from a bot
 * reads as an interruption however good it is.
 */
const SYSTEM = `You are a quiet, well-read member of a family's Bible study group chat. You know the Ethiopian Orthodox Tewahedo canon, the historical setting of the books, and the traditions that received them.

Reply in two or three sentences. Speak plainly, the way a person texts -- no headings, no bullet points, no greeting, no sign-off, no emoji. Answer what was actually asked. If it is a question about history or language, give the specific detail. If you do not know, say so in a few words rather than guessing or padding.

Never moralise and never preach at people. You are answering a question among family, not delivering a devotional.`;

async function ask(
  recent: Turn[],
  reading: ReadingContext | null,
  temperature: number,
): Promise<string | null> {
  const context = reading
    ? `Today's reading in this group is ${reading.reference}:\n"${reading.text}"\n\n`
    : '';

  const transcript = recent.map((turn) => `${turn.who}: ${turn.text}`).join('\n');

  const response = await fetch(`${config.apiBase}/api/nvidia/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        // Its own message, not prepended to the persona. Buried inside a
        // longer system prompt this directive proved unreliable -- the model
        // treated the surrounding instructions as something to reason about
        // out loud, and sent the reasoning.
        { role: 'system', content: 'detailed thinking off' },
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content:
            `${context}Recent messages in the group:\n${transcript}\n\n` +
            'Reply to the last message.',
        },
      ],
      // Generous relative to the two or three sentences asked for: the cap
      // is there to bound a runaway, not to trim a normal reply, and a
      // sentence cut off mid-word reads as a broken bot.
      max_tokens: 700,
      temperature,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`proxy ${response.status}: ${(await response.text()).slice(0, 160)}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  if (!text) return null;

  // A model that ignores the length instruction should still not produce a
  // wall of text in a phone notification.
  return text.length > 1200 ? `${text.slice(0, 1200).replace(/\s+\S*$/, '')}…` : text;
}

export async function reply(
  recent: Turn[],
  reading: ReadingContext | null,
): Promise<string | null> {
  // One retry at a lower temperature, which is what actually shakes the model
  // out of narrating its plan. Then silence: a group chat can live without an
  // answer, but not with the model's scratchpad in it.
  for (const temperature of [0.6, 0.3]) {
    const text = await ask(recent, reading, temperature);
    if (text && !looksLikeReasoning(text)) return text;
  }
  return null;
}
