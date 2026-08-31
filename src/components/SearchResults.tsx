import React from 'react';
import { SearchResult } from '../services/bibleApi';
import { BookOpen, ExternalLink } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResult[];
  onVerseClick?: (reference: string) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, onVerseClick }) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="font-terminal text-slate-600 dark:text-slate-400">
          No results found. Try different search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-terminal text-xl font-bold">
          Search Results ({results.length})
        </h2>
      </div>
      
      <div className="grid gap-4">
        {results.map((result, index) => (
          <div
            key={`${result.verse.reference}-${index}`}
            className={`
              p-5 rounded-lg border transition-all duration-200
              dark:bg-slate-800/50 dark:border-slate-700 dark:hover:border-amber-700/50
              bg-white border-slate-200 hover:border-amber-300
              hover:shadow-md cursor-pointer
            `}
            onClick={() => onVerseClick?.(result.verse.reference)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`
                  px-2 py-1 text-xs font-terminal rounded-full
                  ${result.verse.testament === 'old'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }
                `}>
                  {result.verse.testament === 'old' ? 'OT' : 'NT'}
                </span>
                <span className="font-terminal text-sm font-bold text-amber-600 dark:text-amber-400">
                  {result.verse.reference}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {result.verse.translation_name}
                </span>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <blockquote className="font-verse text-base md:text-lg leading-relaxed mb-3">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: result.context || result.verse.text 
                }}
                className="[&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-900/50 [&_mark]:px-1 [&_mark]:rounded"
              />
            </blockquote>
            
            {result.matchedText && (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-terminal">
                Matched: "{result.matchedText}"
              </div>
            )}
          </div>
        ))}
      </div>
      
      {results.length >= 20 && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-terminal">
            Showing first 20 results. Refine your search for more specific results.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;