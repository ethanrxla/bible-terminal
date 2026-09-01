import type { BibleVerse } from './bibleApi';

/**
 * Public-domain translations transcribed into the repo for books that neither
 * bible-api.com nor the Ge'ez dataset carries.
 *
 * These are human scholarly translations, not machine output, so they carry no
 * AI warning -- but they are transcribed from page scans by
 * scripts/ingest-*.mjs, so the reader is told which edition it is and that OCR
 * errors are possible.
 */

interface LocalChapterFile {
  book: string;
  label: string;
  chapter: number;
  source: string;
  verses: Record<string, string>;
}

export interface LocalChapter {
  verses: BibleVerse[];
  attribution: string;
}

/** Lazily code-split, so a reader who never opens these never downloads them. */
const FILES = import.meta.glob<{ default: LocalChapterFile }>('../data/texts/*/*.json');

export async function getLocalChapter(
  dir: string,
  chapter: number,
  bookLabel: string,
): Promise<LocalChapter> {
  const loader = FILES[`../data/texts/${dir}/${chapter}.json`];
  if (!loader) throw new Error(`${bookLabel} ${chapter} is not available`);

  const file = (await loader()).default;

  return {
    attribution: file.source,
    verses: Object.entries(file.verses).map(([number, text]) => ({
      text,
      reference: `${bookLabel} ${chapter}:${number}`,
      translation_id: 'public-domain',
      translation_name: file.source,
      book_id: dir,
      book_name: bookLabel,
      chapter,
      verse: Number(number),
    })),
  };
}
