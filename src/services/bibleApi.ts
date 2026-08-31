// Bible API service for fetching verses, chapters, and translations
// Integrates with both bible-api.com and the jsdelivr Bible API

export interface BibleVerse {
  text: string;
  reference: string;
  translation_id: string;
  translation_name: string;
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
}

export interface BibleChapter {
  reference: string;
  verses: BibleVerse[];
  translation_id: string;
  translation_name: string;
  book_id: string;
  book_name: string;
  chapter: number;
}

export interface Translation {
  identifier: string;
  name: string;
  language: string;
}

export interface SearchResult {
  verse: BibleVerse;
  matchedText: string;
  context: string;
}

// Available translations from bible-api.com
export const AVAILABLE_TRANSLATIONS: Translation[] = [
  { identifier: 'web', name: 'World English Bible', language: 'English' },
  { identifier: 'kjv', name: 'King James Version', language: 'English' },
  { identifier: 'asv', name: 'American Standard Version (1901)', language: 'English' },
  { identifier: 'bbe', name: 'Bible in Basic English', language: 'English' },
  { identifier: 'darby', name: 'Darby Bible', language: 'English' },
  { identifier: 'dra', name: 'Douay-Rheims 1899 American Edition', language: 'English' },
  { identifier: 'ylt', name: "Young's Literal Translation", language: 'English' },
  { identifier: 'webbe', name: 'World English Bible, British Edition', language: 'English (UK)' },
  { identifier: 'oeb-cw', name: 'Open English Bible, Commonwealth Edition', language: 'English (UK)' },
  { identifier: 'oeb-us', name: 'Open English Bible, US Edition', language: 'English (US)' },
  { identifier: 'almeida', name: 'João Ferreira de Almeida', language: 'Portuguese' },
  { identifier: 'clementine', name: 'Clementine Latin Vulgate', language: 'Latin' },
  { identifier: 'cuv', name: 'Chinese Union Version', language: 'Chinese' },
  { identifier: 'bkr', name: 'Bible kralická', language: 'Czech' },
  { identifier: 'rccv', name: 'Protestant Romanian Corrected Cornilescu Version', language: 'Romanian' },
  { identifier: 'cherokee', name: 'Cherokee New Testament', language: 'Cherokee' }
];

// Bible books mapping for API calls
export const BIBLE_BOOKS = [
  // Old Testament
  { id: 'GEN', name: 'Genesis', chapters: 50 },
  { id: 'EXO', name: 'Exodus', chapters: 40 },
  { id: 'LEV', name: 'Leviticus', chapters: 27 },
  { id: 'NUM', name: 'Numbers', chapters: 36 },
  { id: 'DEU', name: 'Deuteronomy', chapters: 34 },
  { id: 'JOS', name: 'Joshua', chapters: 24 },
  { id: 'JDG', name: 'Judges', chapters: 21 },
  { id: 'RUT', name: 'Ruth', chapters: 4 },
  { id: '1SA', name: '1 Samuel', chapters: 31 },
  { id: '2SA', name: '2 Samuel', chapters: 24 },
  { id: '1KI', name: '1 Kings', chapters: 22 },
  { id: '2KI', name: '2 Kings', chapters: 25 },
  { id: '1CH', name: '1 Chronicles', chapters: 29 },
  { id: '2CH', name: '2 Chronicles', chapters: 36 },
  { id: 'EZR', name: 'Ezra', chapters: 10 },
  { id: 'NEH', name: 'Nehemiah', chapters: 13 },
  { id: 'EST', name: 'Esther', chapters: 10 },
  { id: 'JOB', name: 'Job', chapters: 42 },
  { id: 'PSA', name: 'Psalms', chapters: 150 },
  { id: 'PRO', name: 'Proverbs', chapters: 31 },
  { id: 'ECC', name: 'Ecclesiastes', chapters: 12 },
  { id: 'SNG', name: 'Song of Solomon', chapters: 8 },
  { id: 'ISA', name: 'Isaiah', chapters: 66 },
  { id: 'JER', name: 'Jeremiah', chapters: 52 },
  { id: 'LAM', name: 'Lamentations', chapters: 5 },
  { id: 'EZK', name: 'Ezekiel', chapters: 48 },
  { id: 'DAN', name: 'Daniel', chapters: 12 },
  { id: 'HOS', name: 'Hosea', chapters: 14 },
  { id: 'JOL', name: 'Joel', chapters: 3 },
  { id: 'AMO', name: 'Amos', chapters: 9 },
  { id: 'OBA', name: 'Obadiah', chapters: 1 },
  { id: 'JON', name: 'Jonah', chapters: 4 },
  { id: 'MIC', name: 'Micah', chapters: 7 },
  { id: 'NAM', name: 'Nahum', chapters: 3 },
  { id: 'HAB', name: 'Habakkuk', chapters: 3 },
  { id: 'ZEP', name: 'Zephaniah', chapters: 3 },
  { id: 'HAG', name: 'Haggai', chapters: 2 },
  { id: 'ZEC', name: 'Zechariah', chapters: 14 },
  { id: 'MAL', name: 'Malachi', chapters: 4 },
  // New Testament
  { id: 'MAT', name: 'Matthew', chapters: 28 },
  { id: 'MRK', name: 'Mark', chapters: 16 },
  { id: 'LUK', name: 'Luke', chapters: 24 },
  { id: 'JHN', name: 'John', chapters: 21 },
  { id: 'ACT', name: 'Acts', chapters: 28 },
  { id: 'ROM', name: 'Romans', chapters: 16 },
  { id: '1CO', name: '1 Corinthians', chapters: 16 },
  { id: '2CO', name: '2 Corinthians', chapters: 13 },
  { id: 'GAL', name: 'Galatians', chapters: 6 },
  { id: 'EPH', name: 'Ephesians', chapters: 6 },
  { id: 'PHP', name: 'Philippians', chapters: 4 },
  { id: 'COL', name: 'Colossians', chapters: 4 },
  { id: '1TH', name: '1 Thessalonians', chapters: 5 },
  { id: '2TH', name: '2 Thessalonians', chapters: 3 },
  { id: '1TI', name: '1 Timothy', chapters: 6 },
  { id: '2TI', name: '2 Timothy', chapters: 4 },
  { id: 'TIT', name: 'Titus', chapters: 3 },
  { id: 'PHM', name: 'Philemon', chapters: 1 },
  { id: 'HEB', name: 'Hebrews', chapters: 13 },
  { id: 'JAS', name: 'James', chapters: 5 },
  { id: '1PE', name: '1 Peter', chapters: 5 },
  { id: '2PE', name: '2 Peter', chapters: 3 },
  { id: '1JN', name: '1 John', chapters: 5 },
  { id: '2JN', name: '2 John', chapters: 1 },
  { id: '3JN', name: '3 John', chapters: 1 },
  { id: 'JUD', name: 'Jude', chapters: 1 },
  { id: 'REV', name: 'Revelation', chapters: 22 }
];

class BibleApiService {
  private baseUrl = 'https://bible-api.com';
  private cache = new Map<string, any>();

  // Get a random verse from the entire Bible or specific books
  async getRandomVerse(translation: string = 'web', bookIds?: string[]): Promise<BibleVerse> {
    try {
      let url = `${this.baseUrl}/data/${translation}/random`;

      if (bookIds && bookIds.length > 0) {
        url += `/${bookIds.join(',')}`;
      }

      console.log('Fetching random verse from:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received verse data:', data);

      return {
        text: data.text,
        reference: data.reference,
        translation_id: translation,
        translation_name: this.getTranslationName(translation),
        book_id: data.book_id || '',
        book_name: data.book_name || '',
        chapter: data.chapter || 1,
        verse: data.verse || 1
      };
    } catch (error) {
      console.error('Error fetching random verse:', error);
      throw error;
    }
  }

  // Get a specific verse or passage
  async getVerse(reference: string, translation: string = 'web'): Promise<BibleVerse> {
    try {
      const url = `${this.baseUrl}/${encodeURIComponent(reference)}?translation=${translation}`;
      const cacheKey = `verse-${translation}-${reference}`;

      if (this.cache.has(cacheKey)) {
        console.log('Returning cached verse:', reference);
        return this.cache.get(cacheKey);
      }

      console.log('Fetching verse from:', url);
      const response = await fetch(url);
      console.log('Verse response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received verse:', reference, data);

      // Parse the reference to extract book, chapter, verse info
      const parsedRef = this.parseReference(data.reference || reference);

      const verse: BibleVerse = {
        text: data.text,
        reference: data.reference || reference,
        translation_id: translation,
        translation_name: this.getTranslationName(translation),
        book_id: parsedRef.bookId,
        book_name: parsedRef.bookName,
        chapter: parsedRef.chapter,
        verse: parsedRef.verse
      };

      this.cache.set(cacheKey, verse);
      return verse;
    } catch (error) {
      console.error('Error fetching verse:', error);
      throw error;
    }
  }

  // Parse a reference string to extract book, chapter, and verse
  private parseReference(reference: string): { bookId: string; bookName: string; chapter: number; verse: number } {
    // Match patterns like "John 3:16" or "1 Corinthians 13:4-7"
    const match = reference.match(/^([\d\s]*[A-Za-z]+)\s+(\d+):?(\d+)?/);

    if (match) {
      const bookName = match[1].trim();
      const chapter = parseInt(match[2]);
      const verse = match[3] ? parseInt(match[3]) : 1;

      // Find matching book
      const book = BIBLE_BOOKS.find(b =>
        b.name.toLowerCase() === bookName.toLowerCase() ||
        b.id.toLowerCase() === bookName.toLowerCase()
      );

      return {
        bookId: book?.id || '',
        bookName: book?.name || bookName,
        chapter,
        verse
      };
    }

    return { bookId: '', bookName: '', chapter: 1, verse: 1 };
  }

  // Get a full chapter
  async getChapter(bookId: string, chapter: number, translation: string = 'web'): Promise<BibleChapter> {
    try {
      const url = `${this.baseUrl}/data/${translation}/${bookId.toUpperCase()}/${chapter}`;
      const cacheKey = `chapter-${translation}-${bookId}-${chapter}`;
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const book = BIBLE_BOOKS.find(b => b.id === bookId.toUpperCase());
      
      const chapterData: BibleChapter = {
        reference: `${book?.name || bookId} ${chapter}`,
        verses: data.verses.map((v: any, index: number) => ({
          text: v.text,
          reference: `${book?.name || bookId} ${chapter}:${index + 1}`,
          translation_id: translation,
          translation_name: this.getTranslationName(translation),
          book_id: bookId.toUpperCase(),
          book_name: book?.name || bookId,
          chapter: chapter,
          verse: index + 1
        })),
        translation_id: translation,
        translation_name: this.getTranslationName(translation),
        book_id: bookId.toUpperCase(),
        book_name: book?.name || bookId,
        chapter: chapter
      };

      this.cache.set(cacheKey, chapterData);
      return chapterData;
    } catch (error) {
      console.error('Error fetching chapter:', error);
      throw error;
    }
  }

  // Search for verses containing specific text
  async searchVerses(query: string, translations: string[] = ['web'], limit: number = 50): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    if (searchTerms.length === 0) return results;

    try {
      // For demonstration, we'll search through some popular books
      // In a production app, you'd want to implement server-side search or use a search API
      const popularBooks = ['GEN', 'PSA', 'PRO', 'ISA', 'MAT', 'JHN', 'ROM', '1CO', 'EPH', 'PHP'];
      
      for (const translation of translations) {
        for (const bookId of popularBooks) {
          if (results.length >= limit) break;
          
          try {
            // Search through first few chapters of each book
            const chaptersToSearch = Math.min(5, BIBLE_BOOKS.find(b => b.id === bookId)?.chapters || 1);
            
            for (let chapter = 1; chapter <= chaptersToSearch; chapter++) {
              if (results.length >= limit) break;
              
              const chapterData = await this.getChapter(bookId, chapter, translation);
              
              for (const verse of chapterData.verses) {
                if (results.length >= limit) break;
                
                const verseText = verse.text.toLowerCase();
                const hasMatch = searchTerms.some(term => verseText.includes(term));
                
                if (hasMatch) {
                  const matchedTerm = searchTerms.find(term => verseText.includes(term)) || '';
                  results.push({
                    verse,
                    matchedText: matchedTerm,
                    context: this.highlightSearchTerms(verse.text, searchTerms)
                  });
                }
              }
            }
          } catch (error) {
            console.warn(`Error searching in ${bookId}:`, error);
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Error during search:', error);
    }

    return results;
  }

  // Get multiple random verses for hourly updates
  async getHourlyContent(translation: string = 'web'): Promise<{ verse: BibleVerse; passage: BibleVerse }> {
    try {
      // Try to get random verses from the API
      const verse = await this.getRandomVerse(translation, ['NT']);
      const passage = await this.getRandomVerse(translation, ['OT']);

      return { verse, passage };
    } catch (error) {
      console.error('Error fetching random verses, using fallback verses:', error);

      // Fallback to popular, well-known verses
      const ntVerses = [
        'John 3:16',
        'John 1:1',
        'Romans 8:28',
        'Philippians 4:13',
        'Matthew 5:16',
        '1 Corinthians 13:4-7',
        'Ephesians 2:8-9',
        'Romans 12:2'
      ];

      const otVerses = [
        'Psalm 23',
        'Psalm 91:1-2',
        'Proverbs 3:5-6',
        'Isaiah 40:31',
        'Jeremiah 29:11',
        'Genesis 1:1',
        'Exodus 20:1-17',
        'Joshua 1:9'
      ];

      const randomNt = ntVerses[Math.floor(Math.random() * ntVerses.length)];
      const randomOt = otVerses[Math.floor(Math.random() * otVerses.length)];

      try {
        const verse = await this.getVerse(randomNt, translation);
        const passage = await this.getVerse(randomOt, translation);
        return { verse, passage };
      } catch (fallbackError) {
        console.error('Even fallback verses failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Get verses in multiple translations
  async getVerseInMultipleTranslations(reference: string, translations: string[]): Promise<BibleVerse[]> {
    const promises = translations.map(translation => 
      this.getVerse(reference, translation).catch(error => {
        console.warn(`Failed to fetch ${reference} in ${translation}:`, error);
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    return results.filter((verse): verse is BibleVerse => verse !== null);
  }

  private getTranslationName(identifier: string): string {
    const translation = AVAILABLE_TRANSLATIONS.find(t => t.identifier === identifier);
    return translation?.name || identifier.toUpperCase();
  }

  private highlightSearchTerms(text: string, searchTerms: string[]): string {
    let highlightedText = text;
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  }

  // Clear cache (useful for memory management)
  clearCache(): void {
    this.cache.clear();
  }
}

export const bibleApiService = new BibleApiService();