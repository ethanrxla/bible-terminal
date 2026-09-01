import React, { useEffect, useState } from 'react';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { currentHourKey, getHourlyInterpretation, type HourlySlot } from '../services/hourly';
import ScriptureText from './ScriptureText';
import type { CanonSection } from '../types/canon';

interface AIInterpretationProps {
  text: {
    text: string;
    reference: string;
    type?: 'verse' | 'passage' | 'story';
  };
  type: 'verse' | 'passage' | 'story';
  /** Where the book sits in the EOTC canon, so the reading matches the tradition. */
  canon?: CanonSection;
  /** Identifies the shared edition this interpretation belongs to. */
  hour?: string;
  slot?: HourlySlot;
  /** Opens a cited reference in the canon browser. */
  onNavigate?: (bookId: string, chapter: number) => void;
}

const AIInterpretation: React.FC<AIInterpretationProps> = ({
  text,
  type,
  canon,
  hour,
  slot,
  onNavigate,
}) => {
  const [interpretation, setInterpretation] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(false);
  const [model, setModel] = useState<{ id: string; label: string } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!text.text) return;

    let cancelled = false;
    setInterpretation('');
    setIsFetching(true);
    setIsVisible(true);
    setError(false);
    setModel(null);

    // Read, never generate. One interpretation is produced per hour on the
    // server and cached at the CDN, so every visitor on every device sees the
    // same words -- and the model is called once an hour rather than once per
    // page view.
    getHourlyInterpretation(
      hour ?? currentHourKey(),
      slot ?? (type === 'passage' ? 'passage' : 'verse'),
    )
      .then((result) => {
        if (cancelled) return;
        setIsFetching(false);
        setModel(result.model);
        setInterpretation(result.text);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load this hour\u2019s interpretation:', err);
        setError(true);
        setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [text.text, text.reference, type, hour, slot, retry]);

  const getTypeLabel = () => {
    switch (type) {
      case 'story': return 'AI STORY INTERPRETATION';
      case 'passage': return 'AI PASSAGE INTERPRETATION';
      default: return 'AI VERSE INTERPRETATION';
    }
  };

  return (
    <div
      className={`
        transition-all duration-1000
        transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        {error ? (
          <AlertCircle className="h-4 w-4 text-red-400" />
        ) : (
          <Sparkles className={`h-4 w-4 text-purple-400 ${isFetching ? 'animate-slow-pulse' : ''}`} />
        )}
        <h3 className={`font-terminal text-sm ${error ? 'text-red-400' : 'text-purple-400 dark:text-purple-300'}`}>
          {getTypeLabel()}
        </h3>
        {canon === 'ethiopian' && !error && (
          <span className="text-xs font-terminal bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
            ETHIOPIAN CANON
          </span>
        )}
        <span className="ml-auto text-[0.65rem] font-terminal opacity-60">
          {error ? 'unavailable' : model ? `${model.label} \u00b7 shared` : ''}
        </span>
      </div>

      <div className={`
        p-5 rounded-md
        ${error
          ? 'dark:bg-red-900/20 dark:border-red-700/30 bg-red-50 border border-red-200'
          : 'dark:bg-purple-900/20 dark:border-purple-700/30 bg-purple-50 border border-purple-200'
        }
      `}>
        {isFetching ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <span className="font-terminal text-sm text-purple-400 animate-pulse">
              Loading this hour&apos;s shared interpretation...
            </span>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="font-terminal text-sm text-red-600 dark:text-red-400 mb-2">
              This hour&apos;s interpretation is not ready yet.
            </p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="inline-flex items-center gap-2 font-terminal text-xs text-red-600 dark:text-red-300 underline underline-offset-4"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        ) : (
          <p className="font-verse text-base md:text-lg leading-relaxed text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
            <ScriptureText text={interpretation} onNavigate={onNavigate} />

          </p>
        )}
      </div>
    </div>
  );
};

export default AIInterpretation;
