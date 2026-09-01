/**
 * Shared vocabulary for describing where a book sits in the Ethiopian Orthodox
 * Tewahedo canon. Kept separate from the canon data itself so the AI service
 * can reason about canon status without importing the whole 81-book table.
 */

export type CanonSection =
  /** In the Protestant 66 as well. */
  | 'protocanonical'
  /** In the EOTC canon and the Catholic/Orthodox deuterocanon, not the Protestant 66. */
  | 'deuterocanonical'
  /** Canonical in the EOTC and essentially nowhere else (Enoch, Jubilees, Meqabyan...). */
  | 'ethiopian';

export type Testament = 'old' | 'new';

export const CANON_SECTION_LABELS: Record<CanonSection, string> = {
  protocanonical: 'Protocanonical',
  deuterocanonical: 'Deuterocanonical',
  ethiopian: 'Unique to Ethiopian Orthodox Tewahedo',
};
