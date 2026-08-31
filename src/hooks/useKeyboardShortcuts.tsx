import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onSearch?: () => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onToggleTheme?: () => void;
  onClearSearch?: () => void;
}

export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch(event.key) {
      case '/':
        event.preventDefault();
        handlers.onSearch?.();
        break;

      case 'ArrowLeft':
        if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          handlers.onPrevChapter?.();
        }
        break;

      case 'ArrowRight':
        if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          handlers.onNextChapter?.();
        }
        break;

      case 't':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handlers.onToggleTheme?.();
        }
        break;

      case 'Escape':
        event.preventDefault();
        handlers.onClearSearch?.();
        break;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
