import React from 'react';
import { Type, Plus, Minus } from 'lucide-react';

interface FontSizeControlProps {
  fontSize: string;
  onIncrease: () => void;
  onDecrease: () => void;
}

const FontSizeControl: React.FC<FontSizeControlProps> = ({ fontSize, onIncrease, onDecrease }) => {
  return (
    <div className="flex items-center gap-1 bg-amber-100 dark:bg-slate-800 rounded-full p-1">
      <button
        onClick={onDecrease}
        className="p-1.5 rounded-full hover:bg-amber-200 dark:hover:bg-slate-700 transition-colors"
        title="Decrease font size"
        aria-label="Decrease font size"
      >
        <Minus className="h-4 w-4" />
      </button>

      <div className="px-2 flex items-center gap-1" title={`Font size: ${fontSize}`}>
        <Type className="h-4 w-4" />
        <span className="text-xs font-terminal uppercase">{fontSize[0]}</span>
      </div>

      <button
        onClick={onIncrease}
        className="p-1.5 rounded-full hover:bg-amber-200 dark:hover:bg-slate-700 transition-colors"
        title="Increase font size"
        aria-label="Increase font size"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};

export default FontSizeControl;
