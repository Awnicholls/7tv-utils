import { useEffect, useState } from 'react';

import { NOW_TICK_MS } from '../constants';

export const useNow = (active: boolean): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(() => {
      setNow(Date.now());
    }, NOW_TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [active]);
  return now;
};
