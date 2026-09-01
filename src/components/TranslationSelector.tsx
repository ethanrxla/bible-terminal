import React from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';
import {
  EDITIONS,
  COVERAGE_LABEL,
  UNAVAILABLE_TRANSLATIONS,
  getEdition,
  type Coverage,
} from '../data/translations';

interface TranslationSelectorProps {
  editionId: string;
  onEditionChange: (id: string) => void;
}

const COVERAGE_BADGE: Record<Coverage, string> = {
  ethiopian: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  full: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  protestant: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  editionId,
  onEditionChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selected = getEdition(editionId);

  const groups: Array<{ heading: string; coverage: Coverage }> = [
    { heading: 'Standard', coverage: 'ethiopian' },
    { heading: 'Covers the full canon', coverage: 'full' },
    { heading: 'Protestant 66 only', coverage: 'protestant' },
  ];

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
        <span className="hidden md:inline max-w-[14rem] truncate">{selected.name}</span>
        <span className="md:hidden">{selected.id === 'ethiopian' ? 'EOTC' : selected.id.toUpperCase()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full right-0 mt-2 w-[22rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 max-h-[32rem] overflow-y-auto">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-terminal text-sm font-bold mb-1">Edition</h3>
              <p className="text-xs opacity-70">
                Applies when you browse the canon. Only the Ethiopian edition covers
                all 81 books; others fall back to it for books they do not contain.
              </p>
              <p className="text-[0.7rem] opacity-55 mt-2 leading-relaxed">
                The three hourly readings above are the same for every visitor, so
                they always use the standard Ethiopian text.
              </p>
            </div>

            {groups.map(({ heading, coverage }) => {
              const items = EDITIONS.filter((edition) => edition.coverage === coverage);
              if (items.length === 0) return null;

              return (
                <div key={coverage} className="p-2 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="px-2 py-1 font-terminal text-[0.65rem] uppercase tracking-wide opacity-50">
                    {heading}
                  </div>
                  {items.map((edition) => {
                    const isSelected = edition.id === editionId;
                    return (
                      <button
                        key={edition.id}
                        onClick={() => { onEditionChange(edition.id); setIsOpen(false); }}
                        className={`
                          w-full text-left p-2 rounded-md text-sm transition-colors
                          ${isSelected
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium">{edition.name}</div>
                            <div className="text-xs opacity-70">{edition.language}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[0.6rem] font-terminal px-1.5 py-0.5 rounded-full ${COVERAGE_BADGE[edition.coverage]}`}>
                              {COVERAGE_LABEL[edition.coverage]}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                        </div>
                        {edition.note && (
                          <p className="text-[0.7rem] opacity-60 mt-1 leading-relaxed">
                            {edition.note}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50">
              <p className="text-[0.65rem] opacity-60 leading-relaxed">
                Not offered because this source does not serve them completely:{' '}
                {UNAVAILABLE_TRANSLATIONS.join(', ')}.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TranslationSelector;
