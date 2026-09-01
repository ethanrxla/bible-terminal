import type { CanonSection, Testament } from '../types/canon';

/**
 * The Ethiopian Orthodox Tewahedo "narrower" canon: 46 Old Testament books and
 * 35 New Testament books, 81 in total, numbered as the Church itself numbers
 * them (see https://www.ethiopianorthodox.org/english/canonical/books.html).
 *
 * Two things about that numbering routinely trip people up, so they are
 * modelled explicitly rather than smoothed over:
 *
 *  - Several entries bundle what other traditions count separately. "I and II
 *    Samuel" is one book here, so a canon entry maps to one *or more* source
 *    texts via `parts`.
 *  - The Ethiopian Meqabyan books are NOT the Greek books of Maccabees. They
 *    are unrelated compositions that share a name in English translation. Both
 *    are represented, and kept distinct.
 *
 * Every part declares where its text comes from, so nothing here silently
 * pretends to have a text it cannot fetch.
 */

export type CanonPart =
  /** Served by bible-api.com. `bookId` is its (sometimes undocumented) book id. */
  | { source: 'bible-api'; bookId: string; label: string; chapters: number }
  /** Served from the LPettay/ethiopian-bible dataset over jsDelivr. */
  | {
      source: 'jsdelivr';
      abbrev: string;
      label: string;
      chapters: number;
      /** How much English the dataset actually carries for this book. */
      english: 'full' | 'partial' | 'none';
    }
  /**
   * A public-domain translation transcribed into the repo, for books neither
   * upstream source carries. See scripts/ingest-*.mjs.
   */
  | {
      source: 'local';
      dir: string;
      label: string;
      chapters: number;
      /** Shown so readers know which edition they are reading. */
      attribution: string;
    }
  /** Canonical, but we have no digital text we can lawfully serve. */
  | { source: 'unavailable'; label: string; reason: string };

export interface CanonBook {
  /** Stable slug used in UI state and URLs. */
  id: string;
  /** Position within its testament, per the EOTC numbering. */
  canonNumber: number;
  name: string;
  /** Ge'ez/Amharic title where we have one. */
  geezName?: string;
  section: CanonSection;
  testament: Testament;
  parts: CanonPart[];
  note?: string;
}

const api = (bookId: string, label: string, chapters: number): CanonPart => ({
  source: 'bible-api',
  bookId,
  label,
  chapters,
});

const geez = (
  abbrev: string,
  label: string,
  chapters: number,
  english: 'full' | 'partial' | 'none'
): CanonPart => ({ source: 'jsdelivr', abbrev, label, chapters, english });

const local = (
  dir: string,
  label: string,
  chapters: number,
  attribution: string,
): CanonPart => ({ source: 'local', dir, label, chapters, attribution });

const missing = (label: string, reason: string): CanonPart => ({
  source: 'unavailable',
  label,
  reason,
});

const NO_PUBLIC_TEXT =
  'No public-domain digital text in Ge’ez or English is available to this app yet.';

export const OLD_TESTAMENT: CanonBook[] = [
  { id: 'genesis', canonNumber: 1, name: 'Genesis', geezName: 'ኦሪት ዘፍጥረት', section: 'protocanonical', testament: 'old', parts: [api('GEN', 'Genesis', 50)] },
  { id: 'exodus', canonNumber: 2, name: 'Exodus', geezName: 'ኦሪት ዘጸአት', section: 'protocanonical', testament: 'old', parts: [api('EXO', 'Exodus', 40)] },
  { id: 'leviticus', canonNumber: 3, name: 'Leviticus', geezName: 'ኦሪት ዘሌዋውያን', section: 'protocanonical', testament: 'old', parts: [api('LEV', 'Leviticus', 27)] },
  { id: 'numbers', canonNumber: 4, name: 'Numbers', geezName: 'ኦሪት ዘሱሦ', section: 'protocanonical', testament: 'old', parts: [api('NUM', 'Numbers', 36)] },
  { id: 'deuteronomy', canonNumber: 5, name: 'Deuteronomy', geezName: 'ኦሪት ዘዳግም', section: 'protocanonical', testament: 'old', parts: [api('DEU', 'Deuteronomy', 34)] },
  { id: 'joshua', canonNumber: 6, name: 'Joshua', geezName: 'መጽሐፈ ኢያሱ', section: 'protocanonical', testament: 'old', parts: [api('JOS', 'Joshua', 24)] },
  { id: 'judges', canonNumber: 7, name: 'Judges', geezName: 'መጽሐፈ መሳፍንት', section: 'protocanonical', testament: 'old', parts: [api('JDG', 'Judges', 21)] },
  { id: 'ruth', canonNumber: 8, name: 'Ruth', geezName: 'መጽሐፈ ሩት', section: 'protocanonical', testament: 'old', parts: [api('RUT', 'Ruth', 4)] },
  { id: 'samuel', canonNumber: 9, name: 'I and II Samuel', geezName: 'መጽሐፈ ሳሙኤል', section: 'protocanonical', testament: 'old', parts: [api('1SA', '1 Samuel', 31), api('2SA', '2 Samuel', 24)], note: 'Counted as a single book in the Ethiopian canon.' },
  { id: 'kings', canonNumber: 10, name: 'I and II Kings', geezName: 'መጽሐፈ ነገሥት', section: 'protocanonical', testament: 'old', parts: [api('1KI', '1 Kings', 22), api('2KI', '2 Kings', 25)], note: 'Counted as a single book in the Ethiopian canon.' },
  { id: '1-chronicles', canonNumber: 11, name: 'I Chronicles', geezName: 'መጽሐፈ ዜና መዋዕል ቀዳማዊ', section: 'protocanonical', testament: 'old', parts: [api('1CH', '1 Chronicles', 29)] },
  { id: '2-chronicles', canonNumber: 12, name: 'II Chronicles', geezName: 'መጽሐፈ ዜና መዋዕል ካልዕ', section: 'protocanonical', testament: 'old', parts: [api('2CH', '2 Chronicles', 36)] },
  { id: 'jubilees', canonNumber: 13, name: 'Jubilees', geezName: 'መጽሐፈ ኩፋሌ', section: 'ethiopian', testament: 'old', parts: [geez('Jub', 'Jubilees', 50, 'partial')], note: 'Also called Kufale, "the Book of Division". English is R.H. Charles (1902); its versification does not always line up with the Ge’ez.' },
  { id: 'enoch', canonNumber: 14, name: 'Enoch', geezName: 'መጽሐፈ ሄኖክ', section: 'ethiopian', testament: 'old', parts: [geez('1En', '1 Enoch', 108, 'full')], note: 'Survives complete only in Ge’ez. English is R.H. Charles (1917).' },
  { id: 'ezra-nehemiah', canonNumber: 15, name: 'Ezra and Nehemiah', geezName: 'ዕዝራ ወነሐምያ', section: 'protocanonical', testament: 'old', parts: [api('EZR', 'Ezra', 10), api('NEH', 'Nehemiah', 13)], note: 'Counted as a single book in the Ethiopian canon.' },
  { id: 'ezra-sutuel', canonNumber: 16, name: 'Ezra (2nd) and Ezra Sutuel', geezName: 'መጽሐፈ ዕዝራ ሱቱኤል', section: 'deuterocanonical', testament: 'old', parts: [api('1ES', '1 Esdras', 9), api('2ES', '2 Esdras', 16)], note: 'Ezra Sutuel corresponds to the apocalypse known elsewhere as 2 Esdras / 4 Ezra.' },
  { id: 'tobit', canonNumber: 17, name: 'Tobit', geezName: 'መጽሐፈ ጠቦቲ', section: 'deuterocanonical', testament: 'old', parts: [api('TOB', 'Tobit', 14)] },
  { id: 'judith', canonNumber: 18, name: 'Judith', geezName: 'መጽሐፈ ዮዲት', section: 'deuterocanonical', testament: 'old', parts: [api('JDT', 'Judith', 16)] },
  { id: 'esther', canonNumber: 19, name: 'Esther', geezName: 'መጽሐፈ አስቴር', section: 'protocanonical', testament: 'old', parts: [api('EST', 'Esther', 10)], note: 'The Ethiopian text includes the Greek additions to Esther, which the available English source does not carry separately.' },
  { id: '1-meqabyan', canonNumber: 20, name: '1 Meqabyan', geezName: 'መጽሐፈ መቃብያን ቀዳማዊ', section: 'ethiopian', testament: 'old', parts: [geez('1Meq', '1 Meqabyan', 36, 'none')], note: 'An Ethiopian composition unrelated to the Greek books of Maccabees despite the shared English name.' },
  { id: '2-3-meqabyan', canonNumber: 21, name: 'II and III Meqabyan', geezName: 'መጽሐፈ መቃብያን ካልእ ወሳልስ', section: 'ethiopian', testament: 'old', parts: [missing('2 Meqabyan', 'No digital Ge’ez or English text of 2 Meqabyan is available in any open dataset we could find.'), geez('3Meq', '3 Meqabyan', 10, 'none')], note: 'Counted as a single book. 2 Meqabyan is the one gap in this app’s coverage of the 81.' },
  { id: 'job', canonNumber: 22, name: 'Job', geezName: 'መጽሐፈ ኢዮብ', section: 'protocanonical', testament: 'old', parts: [api('JOB', 'Job', 42)] },
  { id: 'psalms', canonNumber: 23, name: 'Psalms', geezName: 'መዝሙረ ዳዊት', section: 'protocanonical', testament: 'old', parts: [api('PSA', 'Psalms', 150)], note: 'The Ethiopian Psalter also contains Psalm 151 and the Song of Songs as an appendix.' },
  { id: 'proverbs', canonNumber: 24, name: 'Proverbs', geezName: 'መጽሐፈ ምሳሌ', section: 'protocanonical', testament: 'old', parts: [api('PRO', 'Proverbs', 31)] },
  { id: 'tegsats', canonNumber: 25, name: 'Tegsats (Reproof)', geezName: 'መጽሐፈ ትግሳጽ', section: 'ethiopian', testament: 'old', parts: [missing('Tegsats', 'Transmitted within the Ethiopian Proverbs tradition; no separate digital text is available.')] },
  { id: 'wisdom', canonNumber: 26, name: 'Metsihafe Tibeb (Wisdom)', geezName: 'መጽሐፈ ጥበብ', section: 'deuterocanonical', testament: 'old', parts: [api('WIS', 'Wisdom of Solomon', 19)] },
  { id: 'ecclesiastes', canonNumber: 27, name: 'Ecclesiastes', geezName: 'መጽሐፈ መክብብ', section: 'protocanonical', testament: 'old', parts: [api('ECC', 'Ecclesiastes', 12)] },
  { id: 'song-of-songs', canonNumber: 28, name: 'The Song of Songs', geezName: 'ማሕልየ መሓልይ', section: 'protocanonical', testament: 'old', parts: [api('SNG', 'Song of Solomon', 8)] },
  { id: 'isaiah', canonNumber: 29, name: 'Isaiah', geezName: 'ትንቢት ኢሳይያስ', section: 'protocanonical', testament: 'old', parts: [api('ISA', 'Isaiah', 66)] },
  { id: 'jeremiah', canonNumber: 30, name: 'Jeremiah', geezName: 'ትንቢት ኤርምያስ', section: 'protocanonical', testament: 'old', parts: [api('JER', 'Jeremiah', 52), api('LAM', 'Lamentations', 5), api('BAR', 'Baruch', 5)], note: 'The Ethiopian book of Jeremiah is a cycle: the prophecy itself together with Lamentations, Baruch, and 4 Baruch.' },
  { id: 'ezekiel', canonNumber: 31, name: 'Ezekiel', geezName: 'ትንቢት ሄዜቅኤል', section: 'protocanonical', testament: 'old', parts: [api('EZK', 'Ezekiel', 48)] },
  { id: 'daniel', canonNumber: 32, name: 'Daniel', geezName: 'ትንቢት ዳንኤል', section: 'protocanonical', testament: 'old', parts: [api('DAN', 'Daniel', 12), api('SUS', 'Susanna', 1), api('BEL', 'Bel and the Dragon', 1), api('S3Y', 'The Prayer of Azariah', 1)], note: 'Includes the Greek additions to Daniel.' },
  { id: 'hosea', canonNumber: 33, name: 'Hosea', geezName: 'ትንቢት ሆሴዕ', section: 'protocanonical', testament: 'old', parts: [api('HOS', 'Hosea', 14)] },
  { id: 'amos', canonNumber: 34, name: 'Amos', geezName: 'ትንቢት አሞጽ', section: 'protocanonical', testament: 'old', parts: [api('AMO', 'Amos', 9)] },
  { id: 'micah', canonNumber: 35, name: 'Micah', geezName: 'ትንቢት ሚኪያስ', section: 'protocanonical', testament: 'old', parts: [api('MIC', 'Micah', 7)] },
  { id: 'joel', canonNumber: 36, name: 'Joel', geezName: 'ትንቢት ኢያኤል', section: 'protocanonical', testament: 'old', parts: [api('JOL', 'Joel', 3)] },
  { id: 'obadiah', canonNumber: 37, name: 'Obadiah', geezName: 'ትንቢት አብዲዮ', section: 'protocanonical', testament: 'old', parts: [api('OBA', 'Obadiah', 1)] },
  { id: 'jonah', canonNumber: 38, name: 'Jonah', geezName: 'ትንቢት ዮናስ', section: 'protocanonical', testament: 'old', parts: [api('JON', 'Jonah', 4)] },
  { id: 'nahum', canonNumber: 39, name: 'Nahum', geezName: 'ትንቢት ናዘም', section: 'protocanonical', testament: 'old', parts: [api('NAM', 'Nahum', 3)] },
  { id: 'habakkuk', canonNumber: 40, name: 'Habakkuk', geezName: 'ትንቢት እንባቁም', section: 'protocanonical', testament: 'old', parts: [api('HAB', 'Habakkuk', 3)] },
  { id: 'zephaniah', canonNumber: 41, name: 'Zephaniah', geezName: 'ትንቢት ሶፈኒያስ', section: 'protocanonical', testament: 'old', parts: [api('ZEP', 'Zephaniah', 3)] },
  { id: 'haggai', canonNumber: 42, name: 'Haggai', geezName: 'ትንቢት ሓጊ', section: 'protocanonical', testament: 'old', parts: [api('HAG', 'Haggai', 2)] },
  { id: 'zechariah', canonNumber: 43, name: 'Zechariah', geezName: 'ትንቢት ዘካርያስ', section: 'protocanonical', testament: 'old', parts: [api('ZEC', 'Zechariah', 14)] },
  { id: 'malachi', canonNumber: 44, name: 'Malachi', geezName: 'ትንቢት ሚልኪያስ', section: 'protocanonical', testament: 'old', parts: [api('MAL', 'Malachi', 4)] },
  { id: 'sirach', canonNumber: 45, name: 'Sirach', geezName: 'መጽሐፈ ሲራክ', section: 'deuterocanonical', testament: 'old', parts: [api('SIR', 'Sirach', 51)], note: 'Listed in the canon as "the Book of Joshua son of Sirach".' },
  { id: 'josippon', canonNumber: 46, name: 'Josippon', geezName: 'ዘና አይሁድ', section: 'ethiopian', testament: 'old', parts: [missing('Josippon', NO_PUBLIC_TEXT)], note: 'A history of the Jewish people, listed in the canon as "the Book of Josephas son of Bengorion".' },
];

const nt = (
  canonNumber: number,
  id: string,
  name: string,
  bookId: string,
  chapters: number
): CanonBook => ({
  id,
  canonNumber,
  name,
  section: 'protocanonical',
  testament: 'new',
  parts: [api(bookId, name, chapters)],
});

export const NEW_TESTAMENT: CanonBook[] = [
  nt(1, 'matthew', 'Matthew', 'MAT', 28),
  nt(2, 'mark', 'Mark', 'MRK', 16),
  nt(3, 'luke', 'Luke', 'LUK', 24),
  nt(4, 'john', 'John', 'JHN', 21),
  nt(5, 'acts', 'Acts', 'ACT', 28),
  nt(6, 'romans', 'Romans', 'ROM', 16),
  nt(7, '1-corinthians', '1 Corinthians', '1CO', 16),
  nt(8, '2-corinthians', '2 Corinthians', '2CO', 13),
  nt(9, 'galatians', 'Galatians', 'GAL', 6),
  nt(10, 'ephesians', 'Ephesians', 'EPH', 6),
  nt(11, 'philippians', 'Philippians', 'PHP', 4),
  nt(12, 'colossians', 'Colossians', 'COL', 4),
  nt(13, '1-thessalonians', '1 Thessalonians', '1TH', 5),
  nt(14, '2-thessalonians', '2 Thessalonians', '2TH', 3),
  nt(15, '1-timothy', '1 Timothy', '1TI', 6),
  nt(16, '2-timothy', '2 Timothy', '2TI', 4),
  nt(17, 'titus', 'Titus', 'TIT', 3),
  nt(18, 'philemon', 'Philemon', 'PHM', 1),
  nt(19, 'hebrews', 'Hebrews', 'HEB', 13),
  nt(20, 'james', 'James', 'JAS', 5),
  nt(21, '1-peter', '1 Peter', '1PE', 5),
  nt(22, '2-peter', '2 Peter', '2PE', 3),
  nt(23, '1-john', '1 John', '1JN', 5),
  nt(24, '2-john', '2 John', '2JN', 1),
  nt(25, '3-john', '3 John', '3JN', 1),
  nt(26, 'jude', 'Jude', 'JUD', 1),
  nt(27, 'revelation', 'Revelation', 'REV', 22),
  // 28-35: the Ethiopian church-order books. Sinodos is transmitted as one
  // corpus in the available dataset, so its four canonical divisions all point
  // at it rather than pretending we can split them cleanly.
  { id: 'sirate-tsion', canonNumber: 28, name: 'Sirate Tsion (Order of Zion)', geezName: 'ስርዓተ ጽይዎን', section: 'ethiopian', testament: 'new', parts: [geez('Sinod', 'Sinodos', 36, 'none')], note: 'One of the four divisions of the Sinodos.' },
  { id: 'tizaz', canonNumber: 29, name: 'Tizaz (The Commandment)', geezName: 'ትዕዛዝ', section: 'ethiopian', testament: 'new', parts: [geez('Sinod', 'Sinodos', 36, 'none')], note: 'One of the four divisions of the Sinodos.' },
  { id: 'gitsew', canonNumber: 30, name: 'Gitsew', geezName: 'ግጽወ', section: 'ethiopian', testament: 'new', parts: [geez('Sinod', 'Sinodos', 36, 'none')], note: 'One of the four divisions of the Sinodos.' },
  { id: 'abtilis', canonNumber: 31, name: 'Abtilis', geezName: 'አብትሊስ', section: 'ethiopian', testament: 'new', parts: [geez('Sinod', 'Sinodos', 36, 'none')], note: 'One of the four divisions of the Sinodos.' },
  { id: '1-dominos', canonNumber: 32, name: 'The I Book of Dominos', geezName: 'ኪዳን ዘእግዚእነ', section: 'ethiopian', testament: 'new', parts: [geez('TestLd', 'Testament of Our Lord', 60, 'none')], note: 'The first of the two Books of the Covenant (Mets’hafe Kidan).' },
  { id: '2-dominos', canonNumber: 33, name: 'The II Book of Dominos', geezName: 'ኪዳን ዘእግዚእነ', section: 'ethiopian', testament: 'new', parts: [geez('TestLd', 'Testament of Our Lord', 60, 'none')], note: 'The second of the two Books of the Covenant.' },
  { id: 'clement', canonNumber: 34, name: 'The Book of Clement', geezName: 'ቀሌሜንጥስ', section: 'ethiopian', testament: 'new', parts: [geez('Clem', 'Ethiopic Clement', 67, 'none')] },
  { id: 'didascalia', canonNumber: 35, name: 'Didascalia', geezName: 'ዲዳስቅሊያ', section: 'ethiopian', testament: 'new', parts: [local('Didasc', 'Didascalia', 43, 'J.M. Harden, The Ethiopic Didascalia (SPCK, 1920). Public domain.')], note: 'Harden translated the Ge’ez text itself rather than the Greek Apostolic Constitutions it descends from, which is what makes it the right witness for this canon. Transcribed from a scan, so it carries occasional OCR errors.' },
];

export const ETHIOPIAN_CANON: CanonBook[] = [...OLD_TESTAMENT, ...NEW_TESTAMENT];

/**
 * Texts the Ethiopian tradition preserves and reads that are not separately
 * numbered among the 81 -- either because they are folded into another book or
 * because they sit alongside the canon. Kept out of the count, offered anyway.
 */
export const RELATED_TEXTS: CanonBook[] = [
  { id: '4-baruch', canonNumber: 0, name: '4 Baruch', geezName: 'ተረፈ ነገር ዘባሮክ', section: 'ethiopian', testament: 'old', parts: [geez('4Bar', '4 Baruch', 9, 'partial')], note: 'Read within the Ethiopian Jeremiah cycle. Also called Paralipomena of Jeremiah.' },
  { id: 'kebra-nagast', canonNumber: 0, name: 'Kebra Nagast', geezName: 'ክብረ ነገሥት', section: 'ethiopian', testament: 'old', parts: [geez('KN', 'Kebra Nagast', 119, 'partial')], note: 'The Glory of Kings. Foundational to Ethiopian national and religious identity, though not numbered among the 81.' },
  { id: 'prayer-of-manasseh', canonNumber: 0, name: 'The Prayer of Manasseh', section: 'deuterocanonical', testament: 'old', parts: [api('MAN', 'Prayer of Manasseh', 1)] },
  { id: 'greek-maccabees', canonNumber: 0, name: '1 and 2 Maccabees (Greek)', section: 'deuterocanonical', testament: 'old', parts: [api('1MA', '1 Maccabees', 16), api('2MA', '2 Maccabees', 15)], note: 'The Greek books of Maccabees. Distinct from the Ethiopian Meqabyan, despite the similar English name.' },
  { id: 'mysteries-heaven-earth', canonNumber: 0, name: 'Mysteries of Heaven and Earth', geezName: 'መጽሐፈ ምስጥረ ሰማይ ወምድር', section: 'ethiopian', testament: 'old', parts: [geez('MysHE', 'Mysteries of Heaven & Earth', 4, 'none')] },
  { id: 'lefafa-sedq', canonNumber: 0, name: 'Lefafa Sedq', geezName: 'ልፋፈ ጽድቅ', section: 'ethiopian', testament: 'old', parts: [geez('Lef', 'Lefafa Sedq', 7, 'none')], note: 'The Bandlet of Righteousness.' },
  { id: 'teaching-of-mysteries', canonNumber: 0, name: 'Teaching of the Mysteries', geezName: 'ትምህርተ ሕብኣት', section: 'ethiopian', testament: 'new', parts: [geez('Teach', 'Teaching of Mysteries', 5, 'none')] },
];

export const ALL_BOOKS: CanonBook[] = [...ETHIOPIAN_CANON, ...RELATED_TEXTS];

const BY_ID = new Map(ALL_BOOKS.map((book) => [book.id, book]));

export function getBook(id: string): CanonBook | undefined {
  return BY_ID.get(id);
}

/** Total chapters we can actually serve for a book. */
export function chapterCount(book: CanonBook): number {
  return book.parts.reduce(
    (total, part) => total + (part.source === 'unavailable' ? 0 : part.chapters),
    0
  );
}

export function isReadable(book: CanonBook): boolean {
  return book.parts.some((part) => part.source !== 'unavailable');
}

/** Books whose text we can fetch but that carry no English translation. */
export function needsTranslation(book: CanonBook): boolean {
  return book.parts.some(
    (part) => part.source === 'jsdelivr' && part.english === 'none'
  );
}

/** bible-api book ids across the whole canon, for random-verse selection. */
export function bibleApiBookIds(books: CanonBook[] = ETHIOPIAN_CANON): string[] {
  return books.flatMap((book) =>
    book.parts.flatMap((part) => (part.source === 'bible-api' ? [part.bookId] : []))
  );
}
