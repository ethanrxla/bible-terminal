import type { BibleVerse } from './bibleApi';

/**
 * Reader for the Ge'ez side of the canon.
 *
 * Text comes from the LPettay/ethiopian-bible dataset, served over jsDelivr
 * (which, unlike NVIDIA, does send `Access-Control-Allow-Origin: *`, so the
 * browser can fetch it directly).
 *
 * Attribution is not optional here. The Ge'ez is Beta Masaheft (Universitat
 * Hamburg) under CC BY-SA 4.0; the English is public domain -- Brenton's
 * Septuagint (1851), the KJV, and R.H. Charles for Enoch (1917) and Jubilees
 * (1902). See ATTRIBUTION in this file and the app footer.
 */

const BASE_URL =
  'https://cdn.jsdelivr.net/gh/LPettay/ethiopian-bible@main/public/data';

export const ATTRIBUTION = {
  geez: {
    text: 'Ge’ez text: Beta Masaheft, Universität Hamburg',
    license: 'CC BY-SA 4.0',
    url: 'https://betamasaheft.eu/',
  },
  english: [
    'Septuagint English: Sir Lancelot Brenton (1851), public domain',
    'Masoretic English: King James Version (1611/1769), public domain',
    '1 Enoch and Jubilees: R.H. Charles (1917 / 1902), public domain',
  ],
  dataset: 'Compiled by LPettay/ethiopian-bible',
} as const;

/** Which translation stream a verse's English came from. */
export type TranslationSource = 'source' | 'lxx' | 'kjv' | 'ai' | 'none';

export const AI_TRANSLATION_DISCLAIMER =
  'AI-generated translation from Ge’ez. Not an authoritative translation and ' +
  'not approved by any church body.';

export interface GeezWord {
  /** Ge'ez script. */
  g: string;
  /** Transliteration. */
  t: string;
  /** Gloss, frequently empty in the dataset. */
  gl?: string;
}

export interface EthiopianVerse extends BibleVerse {
  geez: string;
  words: GeezWord[];
  translationSource: TranslationSource;
  /** True when no human translation exists for this verse. */
  needsTranslation: boolean;
}

export interface EthiopianChapter {
  abbrev: string;
  chapter: number;
  verses: EthiopianVerse[];
  /** True when not a single verse in the chapter carries English. */
  untranslated: boolean;
  /** True when any English shown here was produced by the model, not a human. */
  aiTranslated: boolean;
  /** Model that produced the AI translation, when there is one. */
  aiModel?: string;
}

interface AiTranslationFile {
  book: string;
  chapter: number;
  model: string;
  generatedAt: string;
  verseCount: number;
  verses: Record<string, string>;
}

/**
 * Committed AI translations for the books with no public-domain English
 * (see scripts/translate-geez.mjs). Lazily code-split by Vite, so a reader who
 * never opens Meqabyan never downloads it.
 */
const AI_TRANSLATIONS = import.meta.glob<{ default: AiTranslationFile }>(
  '../data/geez-en/*/*.json'
);

async function loadAiTranslation(
  abbrev: string,
  chapter: number
): Promise<AiTranslationFile | undefined> {
  const loader = AI_TRANSLATIONS[`../data/geez-en/${abbrev}/${chapter}.json`];
  if (!loader) return undefined;

  try {
    return (await loader()).default;
  } catch (error) {
    console.warn(`Failed to load AI translation for ${abbrev} ${chapter}:`, error);
    return undefined;
  }
}

interface RawVerse {
  num: number | string;
  geez?: string;
  translation?: string;
  words?: GeezWord[];
  translations?: Partial<Record<'lxx' | 'kjv', string>>;
}

interface RawChapter {
  book: string;
  chapter: number;
  verses: RawVerse[];
}

/**
 * The dataset stores English in two different places depending on the book:
 * `translation` for texts with a single rendering (Enoch, Jubilees), and
 * `translations.lxx` / `.kjv` for the dual-tradition books. Prefer the LXX
 * where both exist, since the Ethiopian canon descends from the Septuagint.
 */
function pickEnglish(raw: RawVerse): { text: string; source: TranslationSource } {
  const direct = raw.translation?.trim();
  if (direct) return { text: direct, source: 'source' };

  const lxx = raw.translations?.lxx?.trim();
  if (lxx) return { text: lxx, source: 'lxx' };

  const kjv = raw.translations?.kjv?.trim();
  if (kjv) return { text: kjv, source: 'kjv' };

  return { text: '', source: 'none' };
}

class EthiopianBibleService {
  private cache = new Map<string, EthiopianChapter>();
  private inflight = new Map<string, Promise<EthiopianChapter>>();

  async getChapter(
    abbrev: string,
    chapter: number,
    bookName = abbrev
  ): Promise<EthiopianChapter> {
    const key = `${abbrev}-${chapter}`;

    const cached = this.cache.get(key);
    if (cached) return cached;

    // De-duplicate concurrent requests for the same chapter; the canon browser
    // and the random-verse picker can easily ask for one at the same moment.
    const existing = this.inflight.get(key);
    if (existing) return existing;

    const request = this.fetchChapter(abbrev, chapter, bookName)
      .then((result) => {
        this.cache.set(key, result);
        return result;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, request);
    return request;
  }

  private async fetchChapter(
    abbrev: string,
    chapter: number,
    bookName: string
  ): Promise<EthiopianChapter> {
    const url = `${BASE_URL}/chapters/${abbrev}/${chapter}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${bookName} ${chapter} (${response.status})`
      );
    }

    const raw: RawChapter = await response.json();

    const verses = raw.verses.map((rawVerse): EthiopianVerse => {
      const number = Number(rawVerse.num);
      const english = pickEnglish(rawVerse);

      return {
        text: english.text,
        reference: `${bookName} ${chapter}:${number}`,
        translation_id: `geez-${english.source}`,
        translation_name:
          english.source === 'lxx'
            ? 'Brenton Septuagint'
            : english.source === 'kjv'
              ? 'King James Version'
              : english.source === 'source'
                ? 'Public-domain English'
                : 'Ge’ez only',
        book_id: abbrev,
        book_name: bookName,
        chapter,
        verse: number,
        geez: rawVerse.geez?.trim() ?? '',
        words: rawVerse.words ?? [],
        translationSource: english.source,
        needsTranslation: english.source === 'none',
      };
    });

    // Overlay committed AI translations onto the verses that have no human one.
    const overlay = verses.some((verse) => verse.needsTranslation)
      ? await loadAiTranslation(abbrev, chapter)
      : undefined;

    let aiTranslated = false;
    if (overlay) {
      for (const verse of verses) {
        if (!verse.needsTranslation) continue;

        const english = overlay.verses[String(verse.verse)]?.trim();
        if (!english) continue;

        verse.text = english;
        verse.translationSource = 'ai';
        verse.translation_name = `AI translation (${overlay.model})`;
        verse.needsTranslation = false;
        aiTranslated = true;
      }
    }

    return {
      abbrev,
      chapter,
      verses,
      untranslated: verses.every((verse) => verse.needsTranslation),
      aiTranslated,
      aiModel: aiTranslated ? overlay?.model : undefined,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const ethiopianBibleService = new EthiopianBibleService();
