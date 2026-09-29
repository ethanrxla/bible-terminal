/**
 * Detecting a model that narrated its plan instead of answering.
 *
 * Nemotron sometimes emits its planning as the reply -- "We need to answer
 * the question...", "The instruction says never moralise..." -- despite the
 * thinking-off directive. In a family group that is worse than silence.
 *
 * Free of config and I/O on purpose: this is the last thing standing between
 * the model and seven people's phones, so it has to be testable on its own.
 */

const REASONING = [
  /^\s*(?:we|i)\s+(?:need to|should|must|can|will)\b/i,
  /\bthe user (?:wants|asks|is asking)\b/i,
  /\bthe (?:instruction|prompt|system message)s?\s+says?\b/i,
  /\bwe (?:must|should) (?:avoid|keep|not)\b/i,
  /^\s*(?:okay|ok|alright),?\s+(?:so\s+)?(?:we|i|let'?s)\b/i,
  /<\/?think>/i,
];

/** Only the opening matters: a real answer does not start by planning. */
export function looksLikeReasoning(text: string): boolean {
  const head = text.slice(0, 400);
  return REASONING.some((pattern) => pattern.test(head));
}
