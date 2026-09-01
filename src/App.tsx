import { useEffect, useState } from 'react';
import { Book, Sun, Moon, Sparkles, Library, Search as SearchIcon } from 'lucide-react';
import Terminal from './components/Terminal';
import HourlySection from './components/HourlySection';
import TranslationSelector from './components/TranslationSelector';
import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import MultiTranslationVerse from './components/MultiTranslationVerse';
import CanonBrowser, { type CanonTarget } from './components/CanonBrowser';
import { useBible, BibleContent } from './hooks/useBible';
import { useTheme } from './hooks/useTheme';
import { useEdition } from './hooks/useEdition';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFontSize } from './hooks/useFontSize';
import TimeDisplay from './components/TimeDisplay';
import FontSizeControl from './components/FontSizeControl';
import { millisecondsUntilNextHour } from './services/hourly';

function App() {
  const { 
    dailyVerse, 
    dailyPassage,
    ethiopianVerse,
    fetchData, 
    isLoading,
    hourlyError,
    searchResults,
    isSearching,
    searchQuery,
    searchBible,
    getVerseInTranslations,
    clearSearch,
  } = useBible();
  const { theme, toggleTheme } = useTheme();
  const { editionId, changeEdition } = useEdition();

  // The edition applies to the canon browser only. The three hourly slots are
  // generated once per hour on the server and shared by every reader, so they
  // cannot follow a per-visitor translation preference without ceasing to be
  // shared -- which is the whole point of them.
  const handleEditionChange = (id: string) => {
    changeEdition(id);
  };
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSize();
  const [showSearch, setShowSearch] = useState(false);
  const [showCanon, setShowCanon] = useState(false);
  const [canonTarget, setCanonTarget] = useState<CanonTarget | null>(null);

  // A cited reference opens the canon browser at that book and chapter.
  const handleNavigateToReference = (bookId: string, chapter: number) => {
    setCanonTarget({ bookId, chapter });
    setShowCanon(true);
    setShowSearch(false);
  };
  const [multiTranslationVerse, setMultiTranslationVerse] = useState<BibleContent[]>([]);

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

    // Align the first refresh with the top of the hour, then repeat hourly.
    // Both handles are owned by the effect so cleanup can clear each one --
    // returning the interval cleanup from inside the timeout callback (as this
    // did previously) leaks an interval on every remount.
    let hourlyInterval: ReturnType<typeof setInterval> | undefined;

    const timer = setTimeout(() => {
      fetchData();
      hourlyInterval = setInterval(fetchData, 60 * 60 * 1000);
    }, millisecondsUntilNextHour());

    return () => {
      clearTimeout(timer);
      if (hourlyInterval) clearInterval(hourlyInterval);
    };
  }, [fetchData]);

  const handleVerseClick = async (reference: string) => {
    const verses = await getVerseInTranslations(reference);
    setMultiTranslationVerse(verses);
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
              editionId={editionId}
              onEditionChange={handleEditionChange}
            />
            <FontSizeControl
              fontSize={fontSize}
              onIncrease={increaseFontSize}
              onDecrease={decreaseFontSize}
            />
            <button
              onClick={() => { setShowCanon((v) => !v); setShowSearch(false); }}
              className={`p-2 rounded-full transition-colors ${
                showCanon
                  ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                  : theme === 'dark'
                    ? 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                    : 'bg-amber-100 text-slate-700 hover:bg-amber-200'
              }`}
              aria-label="Browse the Ethiopian canon"
              title="Browse the Ethiopian canon"
            >
              <Library size={20} />
            </button>
            <button
              onClick={() => { setShowSearch(!showSearch); setShowCanon(false); }}
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

        <Terminal
          isLoading={
            isLoading &&
            !showCanon &&
            !dailyVerse &&
            !dailyPassage &&
            !ethiopianVerse
          }
        >
          {showCanon ? (
            <CanonBrowser target={canonTarget} />
          ) : showSearch && searchQuery ? (
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
            <div className="space-y-12 py-4">
              {hourlyError && !dailyVerse && !dailyPassage && !ethiopianVerse && (
                <div className="rounded-md border border-red-300 bg-red-50 p-5 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                  <p className="font-terminal text-sm">{hourlyError}</p>
                </div>
              )}
              {dailyVerse && (
                <HourlySection
                  title="Hourly Verse"
                  content={dailyVerse}
                  variant="verse"
                  onNavigate={handleNavigateToReference}
                />
              )}

              {dailyPassage && (
                <HourlySection
                  title="Hourly Passage"
                  content={dailyPassage}
                  variant="passage"
                  onNavigate={handleNavigateToReference}
                />
              )}

              {ethiopianVerse && (
                <HourlySection
                  title="From the Ethiopian Canon"
                  content={ethiopianVerse}
                  variant="verse"
                  badge="ETHIOPIAN CANON"
                  onNavigate={handleNavigateToReference}
                />
              )}
            </div>
          )}
        </Terminal>
      </div>
    </div>
  );
}

export default App;
