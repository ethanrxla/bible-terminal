import React from 'react';
import type { GeezWord } from '../services/ethiopianBible';

interface GeezInterlinearProps {
  words: GeezWord[];
  /** Whole-verse Ge'ez, used when the dataset has no word-level breakdown. */
  fallback?: string;
}

/**
 * Ge'ez with its transliteration underneath, word by word.
 *
 * Words wrap as units so a line break never separates a word from its
 * transliteration.
 */
const GeezInterlinear: React.FC<GeezInterlinearProps> = ({ words, fallback }) => {
  if (words.length === 0) {
    if (!fallback) return null;
    return (
      <p className="font-geez text-lg text-amber-900 dark:text-amber-200" lang="gez">
        {fallback}
      </p>
    );
  }

  return (
    <p className="flex flex-wrap gap-x-4 gap-y-3" lang="gez">
      {words.map((word, index) => (
        <span key={`${word.g}-${index}`} className="inline-flex flex-col items-center">
          <span className="font-geez text-lg leading-tight text-amber-900 dark:text-amber-200">
            {word.g}
          </span>
          <span className="font-terminal text-[0.65rem] leading-tight text-slate-500 dark:text-slate-400">
            {word.t}
          </span>
        </span>
      ))}
    </p>
  );
};

export default GeezInterlinear;
