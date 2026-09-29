import React, { useEffect, useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';

interface BibleVerseProps {
  verse: {
    text: string;
    reference: string;
    type?: 'verse' | 'passage' | 'story';
    book?: string;
    testament?: 'old' | 'new';
  };
}

const BibleVerse: React.FC<BibleVerseProps> = ({ verse }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 30);
    return () => clearTimeout(timer);
  }, [verse]);

  const handleCopy = async () => {
    try {
      const textToCopy = `"${verse.text}"\n— ${verse.reference}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: verse.reference,
      text: `"${verse.text}"\n— ${verse.reference}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await handleCopy();
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const getTestamentBadge = () => {
    if (!verse.testament) return null;
    
    return (
      <span className={`
        inline-block px-2 py-1 text-xs font-terminal rounded-full mb-2
        ${verse.testament === 'old' 
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        }
      `}>
        {verse.testament === 'old' ? 'Old Testament' : 'New Testament'}
      </span>
    );
  };

  return (
    <div className={`
      p-5 rounded-md relative group
      transition-all duration-300 motion-reduce:transition-none
      transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      dark:bg-slate-800/50 dark:border-amber-700/30
      bg-white/90 border border-slate-200
      shadow-sm
    `}>
      {/* Reveal-on-hover only where hover exists. On a phone there is no
          hover, so these were invisible and the reader had no way to copy or
          share at all. */}
      <div className="absolute top-3 right-3 flex gap-2 transition-opacity opacity-100 focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
        <button
          onClick={handleCopy}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-slate-100 p-2.5 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          title="Copy verse"
          aria-label="Copy verse"
        >
          {copied ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-slate-100 p-2.5 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          title="Share verse"
          aria-label="Share verse"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {getTestamentBadge()}
      <blockquote className="font-verse text-lg md:text-xl leading-relaxed">
        <p className="mb-3 italic">"{verse.text}"</p>
        <footer className="font-terminal text-sm opacity-80 text-right">
          — {verse.reference}
          {verse.book && (
            <span className="block text-xs mt-1 opacity-60">
              Book of {verse.book}
            </span>
          )}
        </footer>
      </blockquote>
    </div>
  );
};

export default BibleVerse;