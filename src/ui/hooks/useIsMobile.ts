import { useState, useEffect } from 'react';

const query = '(pointer: coarse)';

function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

/** Returns true on touch-primary devices (phones, tablets). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
