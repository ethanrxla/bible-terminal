import React, { useEffect, useState } from 'react';
import { BibleContent } from '../hooks/useBible';

interface MultiTranslationVerseProps {
  verses: BibleContent[];
  title?: string;
}

const MultiTranslationVerse: React.FC<MultiTranslationVerseProps> = ({ verses, title }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [verses]);

  if (verses.length === 0) return null;

  return (
    <div className={`
      space-y-4
      transition-all duration-1000
      transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
    `}>
      {title && (
        <h3 className="font-terminal text-lg font-bold text-amber-700 dark:text-amber-400">
          {title}
        </h3>
      )}
      
      <div className="space-y-4">
        {verses.map((verse, index) => (
          <div
            key={`${verse.translation_id}-${index}`}
            className={`
              p-5 rounded-lg border
              ${index === 0 
                ? 'dark:bg-slate-800/70 dark:border-amber-700/30 bg-white border-amber-200'
                : 'dark:bg-slate-800/30 dark:border-slate-700 bg-slate-50 border-slate-200'
              }
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`
                  px-2 py-1 text-xs font-terminal rounded-full
                  ${verse.testament === 'old'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }
                `}>
                  {verse.testament === 'old' ? 'Old Testament' : 'New Testament'}
                </span>
                <span className="font-terminal text-sm font-bold text-amber-600 dark:text-amber-400">
                  {verse.translation_name}
                </span>
              </div>
            </div>
            
            <blockquote className="font-verse text-base md:text-lg leading-relaxed">
              <p className="mb-3 italic">"{verse.text}"</p>
              <footer className="font-terminal text-sm opacity-80 text-right">
                — {verse.reference}
                {verse.book && (
                  <span className="block text-xs mt-1 opacity-60">
                    Book of {verse.book}
                  </span>
                )}
              </footer>
            </blockquote>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiTranslationVerse;