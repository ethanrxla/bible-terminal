import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { millisecondsUntilNextHour } from '../services/hourly';

/**
 * Built once at module scope rather than per render. This component renders
 * once a second, and constructing an Intl formatter is not free -- which is
 * also why date-fns is no longer a dependency for what these two lines do.
 */
const CLOCK = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});
const DATE = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const TimeDisplay: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    // A clock nobody can see is not worth a wake-up every second on a phone.
    const start = () => {
      if (timer) return;
      setCurrentTime(new Date());
      timer = setInterval(() => setCurrentTime(new Date()), 1000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
        <span className="font-bold">{CLOCK.format(currentTime)}</span>
        <span className="text-xs opacity-70">{DATE.format(currentTime)}</span>
        <span className="text-xs opacity-50 text-blue-600 dark:text-blue-400">
          Next hourly: {getTimeUntilUpdate()}
        </span>
      </div>
    </div>
  );
};

export default TimeDisplay;
