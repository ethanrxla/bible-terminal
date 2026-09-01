import React from 'react';
import { segmentReferences } from '../services/references';

interface ScriptureTextProps {
  text: string;
  /** Opens a cited reference in the canon browser. Plain text without it. */
  onNavigate?: (bookId: string, chapter: number) => void;
}

/**
 * Renders model output with any scripture references it cites turned into
 * buttons that open the canon browser at that book and chapter.
 */
const ScriptureText: React.FC<ScriptureTextProps> = ({ text, onNavigate }) => (
  <>
    {segmentReferences(text).map((segment, index) =>
      segment.kind === 'text' || !onNavigate ? (
        <React.Fragment key={index}>{segment.text}</React.Fragment>
      ) : (
        <button
          key={index}
          onClick={() => onNavigate(segment.reference.bookId, segment.reference.chapter)}
          title={`Open ${segment.reference.bookName} in the canon browser`}
          className="font-terminal text-[0.9em] px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
        >
          {segment.text}
        </button>
      )
    )}
  </>
);

export default ScriptureText;
