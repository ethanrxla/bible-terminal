import React, { useEffect, useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';

interface BiblePassageProps {
  passage: {
    text: string;
    reference: string;
    title?: string;
    type?: 'verse' | 'passage' | 'story';
    book?: string;
    testament?: 'old' | 'new';
  };
}

const BiblePassage: React.FC<BiblePassageProps> = ({ passage }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, [passage]);

  const handleCopy = async () => {
    try {
      const textToCopy = `${passage.text}\n\n— ${passage.reference}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: passage.reference,
      text: `${passage.text}\n\n— ${passage.reference}`,
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

  // Split passage text into paragraphs for better readability
  const paragraphs = passage.text ? passage.text.split('\n\n') : [];

  const getTestamentBadge = () => {
    if (!passage.testament) return null;
    
    return (
      <span className={`
        inline-block px-2 py-1 text-xs font-terminal rounded-full mb-3
        ${passage.testament === 'old' 
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        }
      `}>
        {passage.testament === 'old' ? 'Old Testament' : 'New Testament'}
      </span>
    );
  };

  const getTypeIcon = () => {
    switch (passage.type) {
      case 'story':
        return '📖';
      case 'passage':
        return '📜';
      default:
        return '✨';
    }
  };

  return (
    <div className={`
      p-6 rounded-lg relative group
      transition-all duration-1000
      transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      dark:bg-slate-800/50 dark:border-amber-700/20
      bg-white/90 border border-slate-200
      shadow-sm
    `}>
      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          title="Copy passage"
        >
          {copied ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
        <button
          onClick={handleShare}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          title="Share passage"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {getTestamentBadge()}
      
      {passage.title && (
        <h3 className="font-heading text-xl mb-4 font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <span>{getTypeIcon()}</span>
          {passage.title}
        </h3>
      )}
      
      <div className="font-verse text-base md:text-lg leading-relaxed space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        
        <footer className="font-terminal text-sm opacity-80 text-right pt-2">
          — {passage.reference}
          {passage.book && (
            <span className="block text-xs mt-1 opacity-60">
              Book of {passage.book}
            </span>
          )}
        </footer>
      </div>
    </div>
  );
};

export default BiblePassage;