/**
 * Deciding when the bot should speak.
 *
 * The hard part of a bot in a family group is not generating a reply, it is
 * staying quiet. Seven people are talking to each other, not to software, so
 * the default is silence and every reason to speak has to be explicit.
 *
 * Two reasons qualify: being addressed, and a question that is plainly about
 * scripture. Ordinary conversation -- including questions about dinner -- is
 * ignored.
 */

/** Books, in the spellings people actually type. */
const BOOKS = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
  'samuel', 'kings', 'chronicles', 'ezra', 'nehemiah', 'esther', 'job', 'psalm', 'psalms',
  'proverbs', 'ecclesiastes', 'song of solomon', 'isaiah', 'jeremiah', 'lamentations',
  'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum',
  'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi', 'matthew', 'mark', 'luke',
  'john', 'acts', 'romans', 'corinthians', 'galatians', 'ephesians', 'philippians',
  'colossians', 'thessalonians', 'timothy', 'titus', 'philemon', 'hebrews', 'james',
  'peter', 'jude', 'revelation',
  // Books of the Ethiopian canon this app exists to surface.
  'enoch', 'jubilees', 'sirach', 'tobit', 'judith', 'maccabees', 'baruch', 'esdras',
  'wisdom', 'meqabyan', 'clement', 'didascalia', 'sinodos',
];

/**
 * Deliberately narrow. Words like "god" or "pray" appear constantly in a
 * family that talks about faith, and treating those as a summons would make
 * the bot interrupt every other message.
 */
const SCRIPTURE_WORDS = [
  'verse', 'passage', 'scripture', 'chapter', 'parable', 'gospel', 'epistle',
  'canon', 'testament', 'translation', 'hebrew', 'greek', "ge'ez", 'geez',
  'this reading', "today's reading", 'the reading',
];

/** "John 3:16", "1 Cor 13", "Enoch 1:9". */
const REFERENCE = /\b(?:[1-3]\s*)?[a-z][a-z'\s]{2,20}\s+\d{1,3}(?::\d{1,3})?/i;

export interface Candidate {
  text: string;
  /** True when the message quotes or @-mentions the bot. */
  addressedDirectly: boolean;
}

export type TriggerReason = 'addressed' | 'scripture-question' | null;

/**
 * Phones autocorrect ' to the typographic ’, so "Ge’ez" and "today’s reading"
 * are what actually arrive -- matching straight apostrophes alone missed
 * every real message.
 */
function normalise(text: string): string {
  return text.replace(/[\u2018\u2019\u02BC]/g, "'").toLowerCase();
}

export function triggerFor(candidate: Candidate): TriggerReason {
  const text = candidate.text.trim();
  if (text.length < 2) return null;

  if (candidate.addressedDirectly) return 'addressed';
  if (/\bbible\s?bot\b/i.test(text)) return 'addressed';

  // Everything below here is a question about scripture, or nothing.
  if (!text.includes('?')) return null;

  const lower = normalise(text);
  const mentionsBook = BOOKS.some((book) => lower.includes(book));
  const mentionsWord = SCRIPTURE_WORDS.some((word) => lower.includes(word));
  // A bare reference only counts alongside a book name; otherwise "table 5?"
  // and "flight 2:30?" would qualify.
  const looksLikeReference = mentionsBook && REFERENCE.test(text);

  return mentionsBook || mentionsWord || looksLikeReference ? 'scripture-question' : null;
}

/**
 * How often the bot may speak.
 *
 * Three windows rather than one: a gap so it cannot reply to a burst of
 * messages in a row, an hourly cap so a long thread cannot turn into the bot
 * talking to itself, and a daily cap as a backstop against a loop nobody
 * noticed.
 */
export class SpeakingLimit {
  private readonly spokenAt: number[] = [];

  constructor(
    private readonly gapMs = 45_000,
    private readonly perHour = 8,
    private readonly perDay = 30,
  ) {}

  allows(now = Date.now()): { ok: true } | { ok: false; reason: string } {
    const last = this.spokenAt[this.spokenAt.length - 1];
    if (last !== undefined && now - last < this.gapMs) {
      return { ok: false, reason: `only ${Math.round((now - last) / 1000)}s since the last reply` };
    }
    const hour = this.spokenAt.filter((at) => now - at < 3_600_000).length;
    if (hour >= this.perHour) return { ok: false, reason: `${hour} replies in the last hour` };
    const day = this.spokenAt.filter((at) => now - at < 86_400_000).length;
    if (day >= this.perDay) return { ok: false, reason: `${day} replies in the last day` };
    return { ok: true };
  }

  record(now = Date.now()): void {
    this.spokenAt.push(now);
    // Keep only what the widest window can still see.
    while (this.spokenAt.length > 0 && now - this.spokenAt[0] > 86_400_000) this.spokenAt.shift();
  }
}
