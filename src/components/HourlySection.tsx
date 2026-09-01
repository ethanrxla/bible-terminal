import React from 'react';
import { Scroll, BookText, Library } from 'lucide-react';
import BibleVerse from './BibleVerse';
import BiblePassage from './BiblePassage';
import AIInterpretation from './AIInterpretation';
import PassageChat from './PassageChat';
import type { BibleContent } from '../hooks/useBible';

interface HourlySectionProps {
  title: string;
  content: BibleContent;
  /** Renders the multi-verse passage card instead of the single-verse one. */
  variant: 'verse' | 'passage';
  /** Extra badge, e.g. to mark the Ethiopian-canon slot. */
  badge?: string;
  onNavigate?: (bookId: string, chapter: number) => void;
}

const HourlySection: React.FC<HourlySectionProps> = ({
  title,
  content,
  variant,
  badge,
  onNavigate,
}) => {
  const icon =
    badge === 'ETHIOPIAN CANON' ? (
      <Library className="h-5 w-5 text-amber-400" />
    ) : variant === 'passage' ? (
      <BookText className="h-5 w-5 text-amber-400" />
    ) : (
      <Scroll className="h-5 w-5 text-amber-400" />
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {icon}
        <h2 className="font-terminal text-xl font-bold">{title}</h2>
        {badge && (
          <span className="text-xs font-terminal bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
        <span className="text-xs font-terminal bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
          UPDATES HOURLY
        </span>
      </div>

      {variant === 'passage' ? (
        <BiblePassage passage={content} />
      ) : (
        <BibleVerse verse={content} />
      )}

      <AIInterpretation
        text={{ text: content.text, reference: content.reference }}
        type={variant}
        hour={content.hourlyHour}
        slot={content.hourlySlot}
        canon={content.section}
        onNavigate={onNavigate}
      />

      <PassageChat
        passage={{
          text: content.text,
          reference: content.reference,
          canon: content.section,
        }}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default HourlySection;
