import React, { ReactNode } from 'react';
import { Terminal as TerminalIcon, Loader2 } from 'lucide-react';

interface TerminalProps {
  children: ReactNode;
  isLoading?: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ children, isLoading = false }) => {
  return (
    <div className={`
      rounded-lg overflow-hidden shadow-xl 
      border border-opacity-20
      transition-all duration-500
      dark:bg-slate-800 dark:border-amber-700/30
      bg-amber-50 border-slate-400/20
    `}>
      <div className="flex items-center p-3 border-b border-opacity-20 dark:border-amber-700/30 border-slate-400/20 bg-opacity-80 dark:bg-slate-900/80 bg-amber-100/80">
        <TerminalIcon className="h-5 w-5 mr-2 text-amber-500" />
        <div className="font-terminal text-sm font-bold">bible@kjv:~</div>
      </div>
      
      <div className="p-6 overflow-auto max-h-[80vh]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-amber-400 animate-spin mb-4" />
            <p className="font-terminal text-sm opacity-80">Loading scripture...</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default Terminal;