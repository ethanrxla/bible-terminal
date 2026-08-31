import React, { useEffect, useState } from 'react';
import { Book, Scroll, BookText, Sun, Moon, Sparkles, Search as SearchIcon } from 'lucide-react';
import Terminal from './components/Terminal';
import BibleVerse from './components/BibleVerse';
import BiblePassage from './components/BiblePassage';
import TranslationSelector from './components/TranslationSelector';
import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import MultiTranslationVerse from './components/MultiTranslationVerse';
import { useBible } from './hooks/useBible';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFontSize } from './hooks/useFontSize';
import TimeDisplay from './components/TimeDisplay';
import FontSizeControl from './components/FontSizeControl';

function App() {
  const { 
    dailyVerse, 
    dailyPassage, 
    fetchData, 
    isLoading,
    searchResults,
    isSearching,
    searchQuery,
    selectedTranslations,
    searchBible,
    getVerseInTranslations,
    clearSearch,
    setSelectedTranslations,
    availableTranslations
  } = useBible();
  const { theme, toggleTheme } = useTheme();
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSize();
  const [showSearch, setShowSearch] = useState(false);
  const [multiTranslationVerse, setMultiTranslationVerse] = useState<any[]>([]);

  const handleSearch = (query: string) => {
    setShowSearch(true);
    searchBible(query);
  };

  const handleClearSearch = () => {
    clearSearch();
    setShowSearch(false);
    setMultiTranslationVerse([]);
  };

  useKeyboardShortcuts({
    onSearch: () => setShowSearch(true),
    onToggleTheme: toggleTheme,
    onClearSearch: handleClearSearch,
  });

  useEffect(() => {
    fetchData();

    // Set up a timer to refresh data every hour
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const timeUntilNextHour = nextHour.getTime() - now.getTime();

    // Initial fetch and then refresh every hour
    const timer = setTimeout(() => {
      fetchData();
      // After the first hour, set up hourly interval
      const hourlyInterval = setInterval(fetchData, 60 * 60 * 1000); // 1 hour
      return () => clearInterval(hourlyInterval);
    }, timeUntilNextHour);

    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleVerseClick = async (reference: string) => {
    const verses = await getVerseInTranslations(reference);
    setMultiTranslationVerse(verses);
  };

  const getSectionIcon = (type?: string) => {
    switch (type) {
      case 'story':
        return <BookText className="h-5 w-5 text-amber-400" />;
      case 'passage':
        return <Scroll className="h-5 w-5 text-amber-400" />;
      default:
        return <Scroll className="h-5 w-5 text-amber-400" />;
    }
  };

  const getSectionTitle = (content: any) => {
    if (content?.type === 'story') {
      return 'Hourly Story';
    } else if (content?.type === 'passage') {
      return 'Hourly Passage';
    }
    return 'Hourly Verse';
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-slate-900 text-amber-50' 
        : 'bg-amber-50 text-slate-900'
    }`}>
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Book className="h-8 w-8 text-amber-400" />
            <h1 className="font-terminal font-bold text-2xl md:text-3xl tracking-tight">
              Bible Terminal
            </h1>
            <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-terminal text-xs text-amber-600 dark:text-amber-400">
                Hourly Updates • Multi-Translation • Keyboard Shortcuts
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TranslationSelector
              selectedTranslations={selectedTranslations}
              onTranslationsChange={setSelectedTranslations}
              maxSelections={3}
            />
            <FontSizeControl
              fontSize={fontSize}
              onIncrease={increaseFontSize}
              onDecrease={decreaseFontSize}
            />
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-full transition-colors ${
                showSearch
                  ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                  : theme === 'dark'
                    ? 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                    : 'bg-amber-100 text-slate-700 hover:bg-amber-200'
              }`}
              aria-label="Toggle search"
            >
              <SearchIcon size={20} />
            </button>
            <TimeDisplay />
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                  : 'bg-amber-100 text-slate-700 hover:bg-amber-200'
              }`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Search Bar */}
        {showSearch && (
          <div className="mb-8">
            <SearchBar
              onSearch={handleSearch}
              onClear={handleClearSearch}
              isSearching={isSearching}
              hasResults={searchResults.length > 0}
            />
          </div>
        )}

        <Terminal isLoading={isLoading}>
          {showSearch && searchQuery ? (
            <div className="space-y-8 py-4">
              {/* Multi-translation verse display */}
              {multiTranslationVerse.length > 0 && (
                <div className="mb-8">
                  <MultiTranslationVerse
                    verses={multiTranslationVerse}
                    title="Verse in Multiple Translations"
                  />
                </div>
              )}
              
              {/* Search Results */}
              <SearchResults
                results={searchResults}
                onVerseClick={handleVerseClick}
              />
            </div>
          ) : (
            <div className="space-y-10 py-4">
              {/* Regular hourly content */}
            {dailyVerse && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  {getSectionIcon(dailyVerse.type)}
                  <h2 className="font-terminal text-xl font-bold">
                    {getSectionTitle(dailyVerse)}
                  </h2>
                  {dailyVerse.type === 'story' && (
                    <span className="text-xs font-terminal bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                      BIBLICAL STORY
                    </span>
                  )}
                  <span className="text-xs font-terminal bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                    UPDATES HOURLY
                  </span>
                </div>
                <BibleVerse verse={dailyVerse} />
              </div>
            )}

            {dailyPassage && (
              <div className="space-y-6 mt-10">
                <div className="flex items-center gap-2">
                  {getSectionIcon(dailyPassage.type)}
                  <h2 className="font-terminal text-xl font-bold">
                    {getSectionTitle(dailyPassage)}
                  </h2>
                  {dailyPassage.type === 'story' && (
                    <span className="text-xs font-terminal bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                      BIBLICAL STORY
                    </span>
                  )}
                  <span className="text-xs font-terminal bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                    UPDATES HOURLY
                  </span>
                </div>
                <BiblePassage passage={dailyPassage} />
              </div>
            )}
          </div>
          )}
        </Terminal>
      </div>
    </div>
  );
}

export default App;