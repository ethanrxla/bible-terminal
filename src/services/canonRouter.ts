import {
  ETHIOPIAN_CANON,
  ALL_BOOKS,
  getBook,
  isReadable,
  type CanonBook,
  type CanonPart,
} from '../data/ethiopianCanon';
import { bibleApiService, type BibleVerse } from './bibleApi';
import {
  ethiopianBibleService,
  type EthiopianVerse,
  type GeezWord,
  type TranslationSource,
} from './ethiopianBible';
import type { CanonSection } from '../types/canon';
import { getLocalChapter } from './localTexts';

/**
 * One entry point for reading anything in the canon, whichever source holds it.
 *
 * Callers work in terms of a canon book id plus a 1-based chapter number that
 * runs across the whole book. That matters because several canon books bundle
 * multiple underlying texts -- the Ethiopian Jeremiah is Jeremiah plus
 * Lamentations plus Baruch -- so "chapter 55 of Jeremiah" has to land in
 * Lamentations 3, not fall off the end of Jeremiah.
 */

import { ETHIOPIAN_EDITION_ID, getEdition } from '../data/translations';

/**
 * The edition currently being read. Module-level rather than passed through
 * every call because the canon router is consumed from several places that do
 * not otherwise share state; `useEdition` keeps it in sync with the picker.
 */
let currentEditionId = ETHIOPIAN_EDITION_ID;

export function setEdition(id: string): void {
  currentEditionId = id;
  // Chapters are cached per translation id, so switching editions must not
  // hand back the previous edition's text.
  bibleApiService.clearCache();
}

export function getCurrentEditionId(): string {
  return currentEditionId;
}

/**
 * bible-api translation used for protocanonical and deuterocanonical text.
 * The Ethiopian edition uses KJV here because it is the only public-domain
 * translation on that source carrying the deuterocanon in full; the books that
 * make the canon Ethiopian come from the Ge'ez dataset either way.
 */
function apiTranslation(): string {
  return getEdition(currentEditionId).apiId;
}

export interface CanonVerse extends BibleVerse {
  bookId: string;
  bookLabel: string;
  section: CanonSection;
  geezName?: string;
  /** Present only for verses served from the Ge'ez dataset. */
  geez?: string;
  /** Word-level Ge'ez + transliteration, for the interlinear view. */
  words?: GeezWord[];
  translationSource?: TranslationSource;
  needsTranslation?: boolean;
}

export interface CanonChapter {
  book: CanonBook;
  /** Chapter number within the whole canon book. */
  chapter: number;
  /** Label of the underlying text this chapter came from. */
  partLabel: string;
  /** Chapter number within that underlying text. */
  partChapter: number;
  verses: CanonVerse[];
  untranslated: boolean;
  /** Some or all of the English here came from the model, not a human. */
  aiTranslated: boolean;
  aiModel?: string;
  /** Edition credit for a transcribed public-domain text. */
  attribution?: string;
}

/** A part we can actually fetch -- `resolveChapter` never returns the others. */
type ReadablePart = Exclude<CanonPart, { source: 'unavailable' }>;

interface ResolvedChapter {
  part: ReadablePart;
  localChapter: number;
}

/**
 * Maps a whole-book chapter number onto the underlying text that holds it.
 * Unavailable parts are skipped, so numbering reflects what can be read.
 */
export function resolveChapter(
  book: CanonBook,
  chapter: number
): ResolvedChapter | undefined {
  let remaining = chapter;

  for (const part of book.parts) {
    if (part.source === 'unavailable') continue;
    if (remaining <= part.chapters) {
      return { part, localChapter: remaining };
    }
    remaining -= part.chapters;
  }

  return undefined;
}

function decorate(
  verse: BibleVerse | EthiopianVerse,
  book: CanonBook,
  partLabel: string
): CanonVerse {
  const ethiopian = verse as EthiopianVerse;

  return {
    ...verse,
    bookId: book.id,
    bookLabel: partLabel,
    section: book.section,
    geezName: book.geezName,
    geez: ethiopian.geez,
    words: ethiopian.words,
    translationSource: ethiopian.translationSource,
    needsTranslation: ethiopian.needsTranslation,
  };
}

export async function getChapter(
  bookId: string,
  chapter: number
): Promise<CanonChapter> {
  const book = getBook(bookId);
  if (!book) throw new Error(`Unknown canon book: ${bookId}`);

  const resolved = resolveChapter(book, chapter);
  if (!resolved) {
    throw new Error(`${book.name} has no readable chapter ${chapter}`);
  }

  const { part, localChapter } = resolved;

  if (part.source === 'bible-api') {
    const data = await bibleApiService.getChapter(
      part.bookId,
      localChapter,
      apiTranslation()
    );

    return {
      book,
      chapter,
      partLabel: part.label,
      partChapter: localChapter,
      verses: data.verses.map((verse) => decorate(verse, book, part.label)),
      untranslated: false,
      aiTranslated: false,
    };
  }

  if (part.source === 'local') {
    const data = await getLocalChapter(part.dir, localChapter, part.label);
    return {
      book,
      chapter,
      partLabel: part.label,
      partChapter: localChapter,
      verses: data.verses.map((verse) => decorate(verse, book, part.label)),
      untranslated: false,
      aiTranslated: false,
      attribution: data.attribution,
    };
  }

  const data = await ethiopianBibleService.getChapter(
    part.abbrev,
    localChapter,
    part.label
  );

  return {
    book,
    chapter,
    partLabel: part.label,
    partChapter: localChapter,
    verses: data.verses.map((verse) => decorate(verse, book, part.label)),
    untranslated: data.untranslated,
    aiTranslated: data.aiTranslated,
    aiModel: data.aiModel,
  };
}

/** Books that can actually be opened, for the browser UI. */
export function readableBooks(): CanonBook[] {
  return ALL_BOOKS.filter(isReadable);
}

function readableChapters(book: CanonBook): number {
  return book.parts.reduce(
    (total, part) => total + (part.source === 'unavailable' ? 0 : part.chapters),
    0
  );
}

/**
 * Chapters we can show English for. Parts are ordered so translated ones come
 * first within a book, which keeps this a valid prefix of the chapter range
 * that `resolveChapter` walks.
 */
function translatableChapters(book: CanonBook): number {
  let total = 0;
  for (const part of book.parts) {
    if (part.source === 'unavailable') continue;
    if (part.source === 'jsdelivr' && part.english === 'none') break;
    total += part.chapters;
  }
  return total;
}

export type RandomScope = 'all' | 'protestant' | 'ethiopian';

/**
 * True when a book has at least one part we can show English for. Ge'ez-only
 * books (Sinodos, Meqabyan, the Testament of Our Lord) would otherwise win a
 * large share of the random draw on chapter count alone and render a blank
 * card, since the dataset carries their Ge'ez but no translation.
 */
function hasReadableText(book: CanonBook): boolean {
  return book.parts.some(
    (part) =>
      part.source === 'bible-api' ||
      part.source === 'local' ||
      (part.source === 'jsdelivr' && part.english !== 'none')
  );
}

function scopeFilter(scope: RandomScope, requireText: boolean) {
  return (book: CanonBook): boolean => {
    if (!isReadable(book)) return false;
    if (requireText && !hasReadableText(book)) return false;
    if (scope === 'protestant') return book.section === 'protocanonical';
    if (scope === 'ethiopian') return book.section !== 'protocanonical';
    return true;
  };
}

/**
 * Picks a verse at random from anywhere in the canon.
 *
 * Books are weighted by chapter count so a 150-chapter Psalter is not as likely
 * to be picked as one-chapter Obadiah -- otherwise "random" would mean
 * "usually one of the short books".
 */
export interface VerseContext {
  /** Verses immediately before the one being interpreted. */
  before: string;
  /** Verses immediately after it. */
  after: string;
  /** e.g. "Genesis 1" -- the chapter the verse sits in. */
  chapterReference: string;
}

/**
 * Fetches the verses surrounding a given one, so an interpretation can speak
 * about a verse in its setting rather than in isolation.
 *
 * The chapter is already cached by both underlying services, so for a verse
 * drawn from a chapter we have loaded this costs nothing.
 */
export async function getVerseContext(
  verse: CanonVerse,
  { before = 4, after = 4 }: { before?: number; after?: number } = {}
): Promise<VerseContext | undefined> {
  const book = getBook(verse.bookId);
  if (!book) return undefined;

  // Convert the verse's chapter within its own text back to a whole-book
  // chapter number, which is what getChapter expects.
  let offset = 0;
  for (const part of book.parts) {
    if (part.source === 'unavailable') continue;
    const matches =
      (part.source === 'bible-api' && part.bookId === verse.book_id) ||
      (part.source === 'jsdelivr' && part.abbrev === verse.book_id) ||
      part.label === verse.bookLabel;
    if (matches) break;
    offset += part.chapters;
  }

  try {
    const chapter = await getChapter(book.id, offset + verse.chapter);
    const index = chapter.verses.findIndex((candidate) => candidate.verse === verse.verse);
    if (index === -1) return undefined;

    const join = (list: CanonVerse[]) =>
      list
        .map((item) => item.text.trim())
        .filter(Boolean)
        .join(' ');

    return {
      before: join(chapter.verses.slice(Math.max(0, index - before), index)),
      after: join(chapter.verses.slice(index + 1, index + 1 + after)),
      chapterReference: `${chapter.partLabel} ${chapter.partChapter}`,
    };
  } catch (error) {
    console.warn('Could not load surrounding verses:', error);
    return undefined;
  }
}

export interface CanonPassage {
  book: CanonBook;
  /** e.g. "1 Enoch 1:1-6" */
  reference: string;
  /** The verses joined into readable prose. */
  text: string;
  verses: CanonVerse[];
  section: CanonSection;
  geezName?: string;
}

/**
 * Draws a run of consecutive verses, so the passage slot shows an actual
 * passage rather than one isolated line.
 */
export async function getRandomPassage(
  scope: RandomScope = 'all',
  { length = 6, attempts = 3 }: { length?: number; attempts?: number } = {}
): Promise<CanonPassage> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { book, chapter } = pickLocation(scope, true);
      const loaded = await getChapter(book.id, chapter);

      // Only verses with readable text can form a passage.
      const usable = loaded.verses.filter((verse) => verse.text.trim().length > 0);
      if (usable.length === 0) throw new Error(`${book.name} ${chapter} has no text`);

      const span = Math.min(length, usable.length);
      const start = Math.floor(Math.random() * (usable.length - span + 1));
      const verses = usable.slice(start, start + span);

      const first = verses[0];
      const last = verses[verses.length - 1];
      const reference =
        verses.length === 1
          ? first.reference
          : `${loaded.partLabel} ${loaded.partChapter}:${first.verse}-${last.verse}`;

      return {
        book,
        reference,
        text: verses.map((verse) => verse.text.trim()).join(' '),
        verses,
        section: book.section,
        geezName: book.geezName,
      };
    } catch (error) {
      lastError = error;
      console.warn(`Random passage attempt ${attempt} failed:`, error);
    }
  }

  throw lastError;
}

/** Weighted choice of a book and a chapter within it. */
function pickLocation(
  scope: RandomScope,
  requireText: boolean
): { book: CanonBook; chapter: number } {
  const candidates = ETHIOPIAN_CANON.filter(scopeFilter(scope, requireText));
  if (candidates.length === 0) throw new Error('No books available for scope');

  const weights = candidates.map((book) =>
    requireText ? translatableChapters(book) : readableChapters(book)
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  let target = Math.random() * total;
  let book = candidates[candidates.length - 1];
  for (let i = 0; i < candidates.length; i += 1) {
    target -= weights[i];
    if (target <= 0) {
      book = candidates[i];
      break;
    }
  }

  const span = requireText ? translatableChapters(book) : readableChapters(book);
  return { book, chapter: 1 + Math.floor(Math.random() * span) };
}

export async function getRandomVerse(
  scope: RandomScope = 'all',
  { requireText = true, attempts = 3 }: { requireText?: boolean; attempts?: number } = {}
): Promise<CanonVerse> {
  let lastError: unknown;

  // Both upstreams rate-limit, and bible-api.com in particular will refuse a
  // burst. A failed draw is not fatal -- re-rolling lands on a different book
  // and often a different source entirely.
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await drawRandomVerse(scope, requireText);
    } catch (error) {
      lastError = error;
      console.warn(`Random verse attempt ${attempt} failed:`, error);
    }
  }

  throw lastError;
}

async function drawRandomVerse(
  scope: RandomScope,
  requireText: boolean
): Promise<CanonVerse> {
  const { book, chapter } = pickLocation(scope, requireText);
  const resolved = resolveChapter(book, chapter);
  if (!resolved) throw new Error(`Could not resolve a chapter in ${book.name}`);

  const { part, localChapter } = resolved;

  if (part.source === 'bible-api') {
    // bible-api can pick the verse for us, and its random endpoint accepts the
    // apocryphal book ids even though they are absent from its book listing.
    const verse = await bibleApiService.getRandomVerse(apiTranslation(), [
      part.bookId,
    ]);
    return decorate(verse, book, part.label);
  }

  if (part.source === 'local') {
    const local = await getLocalChapter(part.dir, localChapter, part.label);
    const pool = local.verses.filter((verse) => verse.text.trim().length > 0);
    if (pool.length === 0) throw new Error(`${book.name} ${chapter} is empty`);
    return decorate(pool[Math.floor(Math.random() * pool.length)], book, part.label);
  }

  const data = await ethiopianBibleService.getChapter(
    part.abbrev,
    localChapter,
    part.label
  );

  // Prefer a verse that has English; fall back to any verse so Ge'ez-only
  // books still take their turn rather than being silently skipped.
  const translated = data.verses.filter((verse) => verse.text.length > 0);
  const pool = translated.length > 0 ? translated : data.verses;
  if (pool.length === 0) throw new Error(`${book.name} ${chapter} is empty`);

  return decorate(pool[Math.floor(Math.random() * pool.length)], book, part.label);
}
