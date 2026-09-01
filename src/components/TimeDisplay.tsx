import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { millisecondsUntilNextHour } from '../services/hourly';

const TimeDisplay: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const getTimeUntilUpdate = () => {
    const diff = millisecondsUntilNextHour();
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="font-terminal text-sm flex items-center gap-2">
      <Clock className="h-4 w-4 text-amber-400" />
      <div className="flex flex-col items-end">
        <span className="font-bold">{format(currentTime, 'h:mm:ss a')}</span>
        <span className="text-xs opacity-70">{format(currentTime, 'MMMM d, yyyy')}</span>
        <span className="text-xs opacity-50 text-blue-600 dark:text-blue-400">
          Next update: {getTimeUntilUpdate()}
        </span>
      </div>
    </div>
  );
};

export default TimeDisplay;
