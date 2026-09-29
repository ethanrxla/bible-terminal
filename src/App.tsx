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

  // The edition applies to the canon browser only. The three readings are
  // generated once per edition on the server and shared by every reader, so
  // they cannot follow a per-visitor translation preference without ceasing
  // to be shared -- which is the whole point of them.
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

    // One tick serves both cadences. 6am Eastern always falls on a UTC hour
    // boundary, so the hourly alignment already lands on the daily rollover;
    // a slot whose key has not changed is answered from cache without a
    // request. See millisecondsUntilNextHour.
    //
    // Rescheduled each time rather than left on an interval: an interval
    // drifts, and a laptop waking from sleep fires every missed tick at once.
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      timer = setTimeout(() => {
        fetchData();
        scheduleNext();
      }, millisecondsUntilNextHour());
    };
    scheduleNext();

    // A backgrounded tab's timers are throttled or suspended, so a phone
    // reopened the next morning would otherwise sit on yesterday's passage
    // until the next tick fired.
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Wraps rather than overflowing: the control cluster is six items
            wide and used to push ~330px past the right edge of a phone. */}
        <header className="flex flex-wrap justify-between items-center gap-y-3 mb-6 sm:mb-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Book className="h-7 w-7 shrink-0 text-amber-400 sm:h-8 sm:w-8" />
            <h1 className="font-terminal font-bold text-xl sm:text-2xl md:text-3xl tracking-tight truncate">
              Bible Terminal
            </h1>
            <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-terminal text-xs text-amber-600 dark:text-amber-400">
                Hourly Updates • Multi-Translation • Keyboard Shortcuts
              </span>
            </div>
          </div>
          <div className="order-3 flex w-full items-center justify-between gap-2 sm:order-none sm:w-auto sm:justify-end sm:gap-3">
            <TranslationSelector
              editionId={editionId}
              onEditionChange={handleEditionChange}
            />
            {/* Phones have browser text zoom; this is the first thing that can
                go when horizontal room runs out. */}
            <div className="hidden sm:flex">
              <FontSizeControl
                fontSize={fontSize}
                onIncrease={increaseFontSize}
                onDecrease={decreaseFontSize}
              />
            </div>
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
            {/* Three stacked lines of monospace, and purely decorative --
                the largest single consumer of header width. */}
            <div className="hidden lg:flex">
              <TimeDisplay />
            </div>
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
                  title="Daily Passage"
                  content={dailyPassage}
                  variant="passage"
                  cadence="daily"
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
