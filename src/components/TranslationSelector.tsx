import React from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import { AVAILABLE_TRANSLATIONS } from '../services/bibleApi';

interface TranslationSelectorProps {
  selectedTranslations: string[];
  onTranslationsChange: (translations: string[]) => void;
  maxSelections?: number;
}

const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  selectedTranslations,
  onTranslationsChange,
  maxSelections = 3
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleTranslationToggle = (translationId: string) => {
    if (selectedTranslations.includes(translationId)) {
      // Remove translation (but keep at least one)
      if (selectedTranslations.length > 1) {
        onTranslationsChange(selectedTranslations.filter(id => id !== translationId));
      }
    } else {
      // Add translation (up to max limit)
      if (selectedTranslations.length < maxSelections) {
        onTranslationsChange([...selectedTranslations, translationId]);
      }
    }
  };

  const getSelectedTranslationNames = () => {
    return selectedTranslations
      .map(id => AVAILABLE_TRANSLATIONS.find(t => t.identifier === id)?.name || id)
      .join(', ');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-terminal
          transition-colors border
          ${isOpen 
            ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' 
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700'
          }
        `}
      >
        <Languages className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="hidden md:inline">
          {selectedTranslations.length === 1 
            ? AVAILABLE_TRANSLATIONS.find(t => t.identifier === selectedTranslations[0])?.name || selectedTranslations[0]
            : `${selectedTranslations.length} Translations`
          }
        </span>
        <span className="md:hidden">
          {selectedTranslations.length}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-terminal text-sm font-bold mb-1">Select Translations</h3>
              <p className="text-xs opacity-70">
                Choose up to {maxSelections} translations to compare
              </p>
            </div>
            
            <div className="p-2">
              {AVAILABLE_TRANSLATIONS.map((translation) => {
                const isSelected = selectedTranslations.includes(translation.identifier);
                const isDisabled = !isSelected && selectedTranslations.length >= maxSelections;
                
                return (
                  <button
                    key={translation.identifier}
                    onClick={() => handleTranslationToggle(translation.identifier)}
                    disabled={isDisabled}
                    className={`
                      w-full text-left p-2 rounded-md text-sm transition-colors
                      ${isSelected 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' 
                        : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{translation.name}</div>
                        <div className="text-xs opacity-70">{translation.language}</div>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="text-xs opacity-70">
                Selected: {getSelectedTranslationNames()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TranslationSelector;