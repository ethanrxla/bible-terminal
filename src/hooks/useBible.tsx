import { useState, useCallback } from 'react';
import { bibleApiService, BibleVerse, SearchResult, AVAILABLE_TRANSLATIONS } from '../services/bibleApi';

export interface BibleContent extends BibleVerse {
  title?: string;
  type: 'verse' | 'passage' | 'story';
  testament: 'old' | 'new';
}

export const useBible = () => {
  const [dailyVerse, setDailyVerse] = useState<BibleContent | null>(null);
  const [dailyPassage, setDailyPassage] = useState<BibleContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>(['web', 'kjv']);
  const [searchQuery, setSearchQuery] = useState('');

  // Function to get hourly content from Bible API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Get random content from the primary translation
      const primaryTranslation = selectedTranslations[0] || 'web';
      const { verse, passage } = await bibleApiService.getHourlyContent(primaryTranslation);
      
      // Convert API response to our BibleContent format
      const convertToBibleContent = (apiVerse: BibleVerse): BibleContent => ({
        ...apiVerse,
        type: 'verse' as const,
        testament: isNewTestament(apiVerse.book_id) ? 'new' : 'old',
        book: apiVerse.book_name
      });
      
      setDailyVerse(convertToBibleContent(verse));
      setDailyPassage(convertToBibleContent(passage));
    } catch (error) {
      console.error('Error fetching Bible content:', error);
      // Keep existing content if API fails
    } finally {
      setIsLoading(false);
    }
  }, [selectedTranslations]);

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
        testament: isNewTestament(verse.book_id) ? 'new' : 'old',
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
    availableTranslations: AVAILABLE_TRANSLATIONS
  };
};

// Helper function to determine if a book is in the New Testament
function isNewTestament(bookId: string): boolean {
  const newTestamentBooks = [
    'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 
    'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', 
    '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
  ];
  return newTestamentBooks.includes(bookId.toUpperCase());
}