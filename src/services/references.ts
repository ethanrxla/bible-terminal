import { ALL_BOOKS, type CanonBook } from '../data/ethiopianCanon';

/**
 * Recognises scripture references in free text so answers can link back into
 * the canon browser.
 *
 * The lookup is built from the canon itself -- both canon book names and the
 * labels of the underlying texts they bundle -- so a citation of
 * "Lamentations 3:1" resolves to the Ethiopian book of Jeremiah that contains
 * it, at the right chapter offset.
 */

export interface ScriptureReference {
  /** The exact text that was matched. */
  raw: string;
  bookId: string;
  bookName: string;
  /** Chapter within the whole canon book, ready for the canon router. */
  chapter: number;
  verse?: number;
}

interface Alias {
  bookId: string;
  bookName: string;
  /** Chapters preceding this part within its canon book. */
  offset: number;
}

function addAlias(map: Map<string, Alias>, name: string, alias: Alias): void {
  const key = name.toLowerCase().replace(/\s+/g, ' ').trim();
  // First writer wins: canon names are registered before part labels, so
  // "Jeremiah" stays the book rather than being overwritten by a part.
  if (key && !map.has(key)) map.set(key, alias);
}

function buildAliases(): Map<string, Alias> {
  const map = new Map<string, Alias>();

  for (const book of ALL_BOOKS) {
    addAlias(map, book.name, { bookId: book.id, bookName: book.name, offset: 0 });
  }

  for (const book of ALL_BOOKS) {
    let offset = 0;
    for (const part of book.parts) {
      if (part.source === 'unavailable') continue;
      addAlias(map, part.label, { bookId: book.id, bookName: book.name, offset });
      offset += part.chapters;
    }
  }

  // Names readers actually type or that the model is likely to produce.
  const extra: Array<[string, string]> = [
    ['1 Enoch', 'enoch'],
    ['Ethiopic Enoch', 'enoch'],
    ['Book of Enoch', 'enoch'],
    ['Kufale', 'jubilees'],
    ['Ecclesiasticus', 'sirach'],
    ['Ben Sira', 'sirach'],
    ['Wisdom of Solomon', 'wisdom'],
    ['Canticles', 'song-of-songs'],
    ['Song of Solomon', 'song-of-songs'],
    ['Psalm', 'psalms'],
    ['Qohelet', 'ecclesiastes'],
    ['Apocalypse', 'revelation'],
    ['Revelations', 'revelation'],
  ];
  for (const [alias, bookId] of extra) {
    const book = ALL_BOOKS.find((candidate) => candidate.id === bookId);
    if (book) addAlias(map, alias, { bookId: book.id, bookName: book.name, offset: 0 });
  }

  return map;
}

const ALIASES = buildAliases();

/** Longest names first, so "1 Samuel" wins over "Samuel". */
const NAME_PATTERN = [...ALIASES.keys()]
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

const REFERENCE_REGEX = new RegExp(
  `\\b(${NAME_PATTERN})\\s+(\\d{1,3})(?::(\\d{1,3}))?`,
  'gi'
);

export function findReferences(text: string): ScriptureReference[] {
  const found: ScriptureReference[] = [];

  for (const match of text.matchAll(REFERENCE_REGEX)) {
    const alias = ALIASES.get(match[1].toLowerCase().replace(/\s+/g, ' '));
    if (!alias) continue;

    found.push({
      raw: match[0],
      bookId: alias.bookId,
      bookName: alias.bookName,
      chapter: alias.offset + Number(match[2]),
      verse: match[3] ? Number(match[3]) : undefined,
    });
  }

  return found;
}

/** Splits text into plain segments and recognised references, in order. */
export type TextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'reference'; text: string; reference: ScriptureReference };

export function segmentReferences(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(REFERENCE_REGEX)) {
    const alias = ALIASES.get(match[1].toLowerCase().replace(/\s+/g, ' '));
    if (!alias || match.index === undefined) continue;

    if (match.index > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, match.index) });
    }

    segments.push({
      kind: 'reference',
      text: match[0],
      reference: {
        raw: match[0],
        bookId: alias.bookId,
        bookName: alias.bookName,
        chapter: alias.offset + Number(match[2]),
        verse: match[3] ? Number(match[3]) : undefined,
      },
    });

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', text: text.slice(cursor) });
  }

  return segments;
}

export function canonBookOf(bookId: string): CanonBook | undefined {
  return ALL_BOOKS.find((book) => book.id === bookId);
}
