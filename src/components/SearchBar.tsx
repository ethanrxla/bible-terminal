import React, { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
  hasResults: boolean;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  isSearching,
  hasResults,
  placeholder = "Search the Bible... (e.g., 'love', 'faith', 'John 3:16')"
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    onSearch(searchTerm);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className={`
              w-full pl-10 pr-12 py-3 rounded-lg border font-terminal text-sm
              transition-all duration-200
              dark:bg-slate-800 dark:border-slate-600 dark:text-amber-50
              bg-white border-slate-300 text-slate-900
              focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
              placeholder:text-slate-400 dark:placeholder:text-slate-500
            `}
          />
          
          {(query || hasResults) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          )}
        </div>
        
        {isSearching && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
          </div>
        )}
      </form>
      
      {/* Search tips */}
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-terminal">
        <span>Try: </span>
        <button
          onClick={() => handleQuickSearch('John 3:16')}
          className="text-amber-600 dark:text-amber-400 hover:underline mr-3"
        >
          "John 3:16"
        </button>
        <button
          onClick={() => handleQuickSearch('Psalm 23')}
          className="text-amber-600 dark:text-amber-400 hover:underline mr-3"
        >
          "Psalm 23"
        </button>
        <button
          onClick={() => handleQuickSearch('love')}
          className="text-amber-600 dark:text-amber-400 hover:underline mr-3"
        >
          "love"
        </button>
        <button
          onClick={() => handleQuickSearch('Romans 8:28-39')}
          className="text-amber-600 dark:text-amber-400 hover:underline"
        >
          "Romans 8:28-39"
        </button>
      </div>
    </div>
  );
};

export default SearchBar;