/**
 * Shaping the day's reading into WhatsApp messages.
 *
 * Deliberately free of configuration and I/O: this is the part that decides
 * what the family actually reads, so it should be testable without a paired
 * phone, a network, or a set of environment variables.
 */

export type SendPart = 'scripture' | 'interpretation' | 'question';

export interface DailyPayload {
  ready: true;
  slot: 'verse' | 'passage' | 'ethiopian';
  day: string;
  reference: string;
  text: string;
  translation: string;
  section: string;
  geezName: string | null;
  interpretation: string;
  question: string | null;
  url: string;
}

/**
 * WhatsApp rejects a body over roughly 4096 characters. 3500 leaves room for
 * the heading and for the multi-byte characters -- curly quotes, Ge'ez, the
 * emoji -- that make the byte count exceed what `.length` reports.
 */
const CHUNK_LIMIT = 3500;

/**
 * Splits on blank lines, never mid-word. A single paragraph longer than the
 * limit falls back to sentence ends: a break after a full stop is survivable,
 * a break mid-word is not.
 */
export function chunkOnParagraphs(text: string, limit = CHUNK_LIMIT): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const paragraph of text.split(/\n{2,}/)) {
    const pieces =
      paragraph.length <= limit
        ? [paragraph]
        : (paragraph.match(/[^.!?]+[.!?]+\s*|.+$/g) ?? [paragraph]);

    for (const piece of pieces) {
      if (current && current.length + piece.length + 2 > limit) flush();
      current = current ? `${current}\n\n${piece}` : piece;
    }
  }
  flush();

  return chunks.length > 0 ? chunks : [text.slice(0, limit)];
}

/**
 * The morning's messages, in order.
 *
 * Three in the ordinary case -- passage, interpretation, discussion question
 * -- with two deliberate exceptions. A long interpretation splits into more
 * than one rather than being truncated, and the question is dropped entirely
 * rather than invented when the model did not produce one.
 */
export function messagesFor(
  payload: DailyPayload,
  parts: readonly SendPart[] = ['scripture', 'interpretation', 'question'],
): string[] {
  const heading = payload.geezName
    ? `*${payload.reference}*  ·  ${payload.geezName}`
    : `*${payload.reference}*`;

  const messages: string[] = [];

  if (parts.includes('scripture')) {
    messages.push(`📖 ${heading}\n_${payload.translation}_\n\n${payload.text}`);
  }

  if (parts.includes('interpretation')) {
    messages.push(...chunkOnParagraphs(`🕮 *Interpretation*\n\n${payload.interpretation}`));
  }

  const askedQuestion = parts.includes('question') && Boolean(payload.question);
  if (askedQuestion) {
    messages.push(`💬 *For reflection*\n\n${payload.question}\n\n${payload.url}`);
  }

  // The link rides on the last message whatever the selection, so there is
  // always one way through to the full reading on the site. Keyed on whether
  // a question was actually emitted, not on whether one was requested: only
  // the passage produces a question, so on the six verse days `question` is
  // selected, no question exists, and the link would otherwise be dropped
  // entirely.
  if (messages.length > 0 && !askedQuestion) {
    messages[messages.length - 1] += `\n\n${payload.url}`;
  }

  return messages;
}
