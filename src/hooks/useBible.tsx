import { useState, useCallback } from 'react';
import { bibleApiService, BibleVerse, SearchResult, AVAILABLE_TRANSLATIONS, testamentOf } from '../services/bibleApi';
import type { VerseContext } from '../services/canonRouter';
import {
  currentHourKey,
  getHourlyContent,
  type HourlySlot,
} from '../services/hourly';
import type { CanonSection } from '../types/canon';

export interface BibleContent extends BibleVerse {
  title?: string;
  type: 'verse' | 'passage' | 'story';
  testament: 'old' | 'new';
  /** Display alias for `book_name`, used by the verse/passage cards. */
  book?: string;
  /** Where the book sits in the EOTC canon; drives the AI's reading tradition. */
  section?: CanonSection;
  geezName?: string;
  /** Surrounding verses, so the interpretation can discuss the setting. */
  context?: VerseContext;
  /** Immutable server edition that owns this content and its interpretation. */
  hourlyHour?: string;
  hourlySlot?: HourlySlot;
}

export const useBible = () => {
  const [dailyVerse, setDailyVerse] = useState<BibleContent | null>(null);
  const [dailyPassage, setDailyPassage] = useState<BibleContent | null>(null);
  const [ethiopianVerse, setEthiopianVerse] = useState<BibleContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hourlyError, setHourlyError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>(['web', 'kjv']);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Loads the server-owned UTC edition. The endpoint's deterministic selection
   * and CDN cache mean every visitor receives these exact same three slots.
   * `force` only bypasses this browser's cache; it never redraws the edition.
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setHourlyError(null);
    const hour = currentHourKey();
    const [verseResult, passageResult, ethiopianResult] = await Promise.allSettled([
      getHourlyContent(hour, 'verse').then((content) => {
        setDailyVerse(content);
        setIsLoading(false);
        return content;
      }),
      getHourlyContent(hour, 'passage').then((content) => {
        setDailyPassage(content);
        setIsLoading(false);
        return content;
      }),
      getHourlyContent(hour, 'ethiopian').then((content) => {
        setEthiopianVerse(content);
        setIsLoading(false);
        return content;
      }),
    ]);
    if (verseResult.status === 'rejected') {
      console.error('Error fetching hourly verse:', verseResult.reason);
    }
    if (passageResult.status === 'rejected') {
      console.error('Error fetching hourly passage:', passageResult.reason);
    }
    if (ethiopianResult.status === 'rejected') {
      console.error('Error fetching Ethiopian canon verse:', ethiopianResult.reason);
    }
    if (
      verseResult.status === 'rejected' &&
      passageResult.status === 'rejected' &&
      ethiopianResult.status === 'rejected'
    ) {
      setHourlyError('Scripture sources are temporarily unavailable. Reload this hour’s edition to try again.');
    }
    setIsLoading(false);
  }, []);

  // Search function
  const searchBible = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchQuery('');
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      // Check if query looks like a verse reference (e.g., "john 3:16", "psalm 23", "matt 25:31-33")
      const versePattern = /^[\d\s]*[a-z]+\s+\d+(?::\d+)?(?:[-,]\d+)?/i;

      if (versePattern.test(query.trim())) {
        // It's a verse reference - fetch it directly
        try {
          const verse = await bibleApiService.getVerse(query, selectedTranslations[0] || 'web');
          setSearchResults([{
            verse,
            matchedText: query,
            context: verse.text
          }]);
          setIsSearching(false);
          return;
        } catch (verseError) {
          console.warn('Failed to fetch as verse reference, falling back to search:', verseError);
        }
      }

      // Fall back to text search
      const results = await bibleApiService.searchVerses(query, selectedTranslations, 20);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching Bible:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedTranslations]);

  // Get verse in multiple translations
  const getVerseInTranslations = useCallback(async (reference: string) => {
    try {
      const verses = await bibleApiService.getVerseInMultipleTranslations(reference, selectedTranslations);
      return verses.map(verse => ({
        ...verse,
        type: 'verse' as const,
        testament: testamentOf(verse.book_id),
        book: verse.book_name
      }));
    } catch (error) {
      console.error('Error fetching verse in multiple translations:', error);
      return [];
    }
  }, [selectedTranslations]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
  }, []);

  return {
    dailyVerse,
    dailyPassage,
    ethiopianVerse,
    fetchData,
    isLoading,
    hourlyError,
    searchResults,
    isSearching,
    searchQuery,
    selectedTranslations,
    searchBible,
    getVerseInTranslations,
    clearSearch,
    setSelectedTranslations,
    availableTranslations: AVAILABLE_TRANSLATIONS
  };
};
