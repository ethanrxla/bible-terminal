/**
 * Selectable editions.
 *
 * Every entry here was probed against bible-api.com rather than taken from its
 * advertised list, because that list overstates what actually resolves. Six of
 * the sixteen translations the original app offered return 404 for most or all
 * of the Bible, and only three carry the deuterocanonical books at all -- which
 * matters here, since the Ethiopian canon is largely made of them.
 */

export type Coverage =
  /** Ge'ez-derived text for the Ethiopian books, KJV elsewhere. */
  | 'ethiopian'
  /** Whole Bible including the deuterocanon. */
  | 'full'
  /** The Protestant 66 only; Ethiopian-canon books fall back to the standard. */
  | 'protestant';

export interface Edition {
  id: string;
  name: string;
  language: string;
  coverage: Coverage;
  /** bible-api.com translation id used for protocanonical text. */
  apiId: string;
  note?: string;
}

export const ETHIOPIAN_EDITION_ID = 'ethiopian';

export const EDITIONS: Edition[] = [
  {
    id: ETHIOPIAN_EDITION_ID,
    name: 'Ethiopian Orthodox Tewahedo',
    language: 'Ge’ez sources, English',
    coverage: 'ethiopian',
    apiId: 'kjv',
    note:
      'The standard edition. Enoch, Jubilees, Meqabyan and the other Ethiopian ' +
      'books are served from the Ge’ez with their own English; the rest of the ' +
      'canon uses the King James text, which is the only public-domain source ' +
      'that carries the deuterocanon in full.',
  },
  {
    id: 'kjv',
    name: 'King James Version',
    language: 'English',
    coverage: 'full',
    apiId: 'kjv',
    note: 'Includes the Apocrypha, so it covers the deuterocanonical books.',
  },
  {
    id: 'web',
    name: 'World English Bible',
    language: 'English',
    coverage: 'full',
    apiId: 'web',
    note: 'Modern English. Includes the deuterocanonical books.',
  },
  {
    id: 'webbe',
    name: 'World English Bible, British Edition',
    language: 'English (UK)',
    coverage: 'full',
    apiId: 'webbe',
    note: 'Includes the deuterocanonical books.',
  },
  {
    id: 'asv',
    name: 'American Standard Version (1901)',
    language: 'English',
    coverage: 'protestant',
    apiId: 'asv',
  },
  {
    id: 'bbe',
    name: 'Bible in Basic English',
    language: 'English',
    coverage: 'protestant',
    apiId: 'bbe',
  },
  {
    id: 'darby',
    name: 'Darby Bible',
    language: 'English',
    coverage: 'protestant',
    apiId: 'darby',
  },
  {
    id: 'dra',
    name: 'Douay-Rheims (1899)',
    language: 'English',
    coverage: 'protestant',
    apiId: 'dra',
    note:
      'A Catholic translation, but this source serves only its protocanonical ' +
      'books — its deuterocanon is not available.',
  },
];

/**
 * Dropped from the picker after probing every entry against eleven references
 * spanning Old Testament narrative, poetry, prophecy, the Gospels, the
 * epistles, and the deuterocanon. Everything listed below failed at least one
 * ordinary lookup, and offering it would mean offering blank chapters.
 *
 *   ylt, oeb-cw, oeb-us   New Testament only
 *   clementine            Old Testament only
 *   cuv, cherokee         do not resolve for English book names at all
 *   almeida  6/8 core     Portuguese; needs Portuguese book names
 *   rccv     6/8 core     Romanian; needs Romanian book names
 *   bkr      3/8 core     Czech; needs Czech book names
 *
 * The three non-English translations could be restored by shipping localised
 * book-name tables, since the failure is in how references are addressed
 * rather than in the underlying text.
 */
export const UNAVAILABLE_TRANSLATIONS = [
  "Young's Literal Translation",
  'Open English Bible',
  'Clementine Latin Vulgate',
  'Chinese Union Version',
  'Cherokee New Testament',
  'João Ferreira de Almeida',
  'Bible kralická',
  'Cornilescu Version',
];

const BY_ID = new Map(EDITIONS.map((edition) => [edition.id, edition]));

export function getEdition(id: string): Edition {
  return BY_ID.get(id) ?? EDITIONS[0];
}

export const COVERAGE_LABEL: Record<Coverage, string> = {
  ethiopian: 'Full 81-book canon',
  full: 'Full canon incl. deuterocanon',
  protestant: 'Protestant 66 only',
};
