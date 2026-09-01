import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, AlertTriangle, Languages, BookOpen, Bot, ScrollText } from 'lucide-react';
import {
  OLD_TESTAMENT,
  NEW_TESTAMENT,
  RELATED_TEXTS,
  ALL_BOOKS,
  chapterCount,
  isReadable,
  type CanonBook,
} from '../data/ethiopianCanon';
import { getChapter, type CanonChapter } from '../services/canonRouter';
import { ATTRIBUTION, AI_TRANSLATION_DISCLAIMER } from '../services/ethiopianBible';
import { CANON_SECTION_LABELS } from '../types/canon';
import type { CanonSection } from '../types/canon';
import GeezInterlinear from './GeezInterlinear';

const SECTION_BADGE: Record<CanonSection, string> = {
  protocanonical:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  deuterocanonical:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ethiopian:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

interface BookGroupProps {
  title: string;
  subtitle: string;
  books: CanonBook[];
  onSelect: (book: CanonBook) => void;
}

const BookGroup: React.FC<BookGroupProps> = ({ title, subtitle, books, onSelect }) => (
  <section className="space-y-3">
    <div>
      <h3 className="font-terminal text-sm font-bold">{title}</h3>
      <p className="text-xs opacity-70">{subtitle}</p>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {books.map((book) => {
        const readable = isReadable(book);
        return (
          <button
            key={book.id}
            onClick={() => readable && onSelect(book)}
            disabled={!readable}
            title={readable ? undefined : book.parts[0]?.label}
            className={`
              text-left p-3 rounded-md border transition-colors
              ${readable
                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-600'
                : 'bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 opacity-60 cursor-not-allowed'
              }
            `}
          >
            <div className="flex items-baseline gap-2">
              {book.canonNumber > 0 && (
                <span className="font-terminal text-[0.65rem] opacity-50">
                  {book.canonNumber}
                </span>
              )}
              <span className="font-terminal text-sm font-medium">{book.name}</span>
            </div>
            {book.geezName && (
              <div className="font-geez text-xs opacity-70 mt-1" lang="gez">
                {book.geezName}
              </div>
            )}
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-[0.6rem] font-terminal px-1.5 py-0.5 rounded-full ${SECTION_BADGE[book.section]}`}>
                {book.section === 'ethiopian' ? 'EOTC' : book.section === 'deuterocanonical' ? 'DEUT' : 'PROTO'}
              </span>
              <span className="text-[0.6rem] font-terminal opacity-50">
                {readable ? `${chapterCount(book)} ch` : 'no text'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  </section>
);

export interface CanonTarget {
  bookId: string;
  chapter: number;
}

interface CanonBrowserProps {
  onReadVerse?: (verse: { text: string; reference: string }) => void;
  /** Jump straight to a book and chapter, e.g. from a cited reference. */
  target?: CanonTarget | null;
}

const CanonBrowser: React.FC<CanonBrowserProps> = ({ onReadVerse, target }) => {
  const [book, setBook] = useState<CanonBook | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [content, setContent] = useState<CanonChapter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInterlinear, setShowInterlinear] = useState(false);

  const chapters = useMemo(() => (book ? chapterCount(book) : 0), [book]);

  // A citation elsewhere in the app can drive the browser to a location.
  useEffect(() => {
    if (!target) return;
    const found = ALL_BOOKS.find((candidate) => candidate.id === target.bookId);
    if (!found || !isReadable(found)) return;
    setBook(found);
    setChapter(Math.min(Math.max(target.chapter, 1), chapterCount(found)));
  }, [target]);

  useEffect(() => {
    if (!book || chapter === null) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setContent(null);

    getChapter(book.id, chapter)
      .then((result) => {
        if (!cancelled) setContent(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [book, chapter]);

  // --- chapter reader -------------------------------------------------------
  if (book && chapter !== null) {
    const hasGeez = content?.verses.some((verse) => verse.geez) ?? false;

    return (
      <div className="space-y-5 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <nav className="flex items-center gap-1 font-terminal text-sm">
            <ChevronLeft className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <button
              onClick={() => { setBook(null); setChapter(null); }}
              className="text-amber-600 dark:text-amber-400 hover:underline"
            >
              All books
            </button>
            <span className="opacity-40">/</span>
            <button
              onClick={() => setChapter(null)}
              className="text-amber-600 dark:text-amber-400 hover:underline"
            >
              {book.name}
            </button>
            <span className="opacity-40">/</span>
            <span className="opacity-60">chapter {chapter}</span>
          </nav>

          {hasGeez && (
            <button
              onClick={() => setShowInterlinear((value) => !value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-terminal border transition-colors ${
                showInterlinear
                  ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              Ge’ez interlinear
            </button>
          )}
        </div>

        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="font-terminal text-xl font-bold">
            {content ? `${content.partLabel} ${content.partChapter}` : `Chapter ${chapter}`}
          </h2>
          {content && content.partLabel !== book.name && (
            <span className="text-xs font-terminal opacity-60">
              within {book.name}, chapter {chapter}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 justify-center font-terminal text-sm opacity-70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {book.name} {chapter}…
          </div>
        )}

        {error && (
          <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30">
            <p className="font-terminal text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {content?.attribution && (
          <div className="flex gap-3 p-4 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700">
            <ScrollText className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-terminal text-sm text-slate-700 dark:text-slate-300">
                Transcribed from a printed edition
              </p>
              <p className="text-xs mt-1 text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                {content.attribution} Transcribed from a page scan, so occasional
                scanning errors survive in the text.
              </p>
            </div>
          </div>
        )}

        {content?.aiTranslated && (
          <div className="flex gap-3 p-4 rounded-md bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-400 dark:border-rose-700">
            <Bot className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-terminal text-sm font-bold text-rose-700 dark:text-rose-300">
                AI-GENERATED TRANSLATION — NOT AUTHORITATIVE
              </p>
              <p className="text-xs mt-1 text-rose-700/90 dark:text-rose-400/90 leading-relaxed max-w-2xl">
                {AI_TRANSLATION_DISCLAIMER} No public-domain English translation of
                this book exists, so the English below was produced by{' '}
                <span className="font-terminal">{content.aiModel}</span> from the
                Ge’ez. It will contain errors. The Ge’ez text beside it is the
                primary source — turn on the interlinear view to read it.
              </p>
            </div>
          </div>
        )}

        {content?.untranslated && (
          <div className="flex gap-3 p-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-terminal text-sm text-amber-800 dark:text-amber-300">
                No English translation available
              </p>
              <p className="text-xs mt-1 text-amber-700 dark:text-amber-400/80">
                This book survives in Ge’ez, and no public-domain English translation
                exists for it. The Ge’ez text and its transliteration are shown as-is.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {content?.verses.map((verse) => (
            <div
              key={verse.verse}
              className="group flex gap-3 p-3 rounded-md hover:bg-amber-50/60 dark:hover:bg-slate-800/40 transition-colors"
              onClick={() => verse.text && onReadVerse?.({ text: verse.text, reference: verse.reference })}
            >
              <span className="font-terminal text-xs opacity-40 pt-1 w-6 shrink-0 text-right">
                {verse.verse}
              </span>
              <div className="space-y-2 min-w-0">
                {showInterlinear && verse.geez && (
                  <GeezInterlinear words={verse.words ?? []} fallback={verse.geez} />
                )}
                {verse.text ? (
                  <p className="font-verse text-base md:text-lg leading-relaxed">
                    {verse.text}
                  </p>
                ) : (
                  !showInterlinear && verse.geez && (
                    <p className="font-geez text-lg text-amber-900 dark:text-amber-200" lang="gez">
                      {verse.geez}
                    </p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- chapter picker -------------------------------------------------------
  if (book) {
    return (
      <div className="space-y-5 py-4">
        <button
          onClick={() => setBook(null)}
          className="flex items-center gap-1 font-terminal text-sm text-amber-600 dark:text-amber-400 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          All books
        </button>

        <div>
          <h2 className="font-terminal text-xl font-bold">{book.name}</h2>
          {book.geezName && (
            <p className="font-geez text-base opacity-70 mt-1" lang="gez">{book.geezName}</p>
          )}
          <p className="text-xs font-terminal opacity-60 mt-2">
            {CANON_SECTION_LABELS[book.section]}
            {book.canonNumber > 0 &&
              ` · book ${book.canonNumber} of the ${book.testament === 'old' ? 'Old' : 'New'} Testament`}
          </p>
          {book.note && (
            <p className="text-sm opacity-80 mt-3 max-w-2xl leading-relaxed">{book.note}</p>
          )}
        </div>

        {book.parts.length > 1 && (
          <div className="text-xs font-terminal opacity-70">
            Contains: {book.parts.map((part) => part.label).join(' · ')}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: chapters }, (_, index) => index + 1).map((n) => (
            <button
              key={n}
              onClick={() => setChapter(n)}
              className="w-11 h-11 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-terminal text-sm hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- book grid ------------------------------------------------------------
  return (
    <div className="space-y-8 py-4">
      <div className="flex items-start gap-3">
        <BookOpen className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-terminal text-xl font-bold">
            The Ethiopian Orthodox Tewahedo Canon
          </h2>
          <p className="text-sm opacity-70 mt-1 max-w-2xl leading-relaxed">
            81 books — 46 in the Old Testament and 35 in the New — as numbered by the
            Church itself. Books the wider church does not receive are marked EOTC.
          </p>
        </div>
      </div>

      <BookGroup
        title="Old Testament · 46 books"
        subtitle="Including Enoch, Jubilees, and the Meqabyan"
        books={OLD_TESTAMENT}
        onSelect={setBook}
      />

      <BookGroup
        title="New Testament · 35 books"
        subtitle="The 27 shared books plus the eight books of church order"
        books={NEW_TESTAMENT}
        onSelect={setBook}
      />

      <BookGroup
        title="Related texts"
        subtitle="Read in the tradition, but not separately numbered among the 81"
        books={RELATED_TEXTS}
        onSelect={setBook}
      />

      <footer className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-1 text-[0.7rem] font-terminal opacity-60 leading-relaxed">
        <p>{ATTRIBUTION.geez.text} — {ATTRIBUTION.geez.license}</p>
        {ATTRIBUTION.english.map((line) => <p key={line}>{line}</p>)}
        <p>{ATTRIBUTION.dataset}. Protocanonical and deuterocanonical text via bible-api.com (public domain).</p>
      </footer>
    </div>
  );
};

export default CanonBrowser;
