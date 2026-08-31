import { useState, useEffect } from 'react';

type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

const FONT_SIZE_KEY = 'bible-terminal-font-size';

export const useFontSize = () => {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return (saved as FontSize) || 'medium';
  });

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  const increaseFontSize = () => {
    const sizes: FontSize[] = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex < sizes.length - 1) {
      setFontSize(sizes[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const sizes: FontSize[] = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(sizes[currentIndex - 1]);
    }
  };

  return {
    fontSize,
    setFontSize,
    increaseFontSize,
    decreaseFontSize
  };
};
