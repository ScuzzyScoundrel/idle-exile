import { useState, useEffect } from 'react';

const HEARTBEAT_KEY = 'idle-exile-tab-heartbeat';
const STALE_MS = 5000;
const HEARTBEAT_INTERVAL = 2000;

/**
 * Prevents multiple tabs from writing to the same localStorage save.
 * Returns true if another tab is already active (this tab should be blocked).
 */
export function useTabGuard(): boolean {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    // Check if another tab has a recent heartbeat
    const existing = parseInt(localStorage.getItem(HEARTBEAT_KEY) ?? '0', 10);
    if (Date.now() - existing < STALE_MS) {
      setBlocked(true);
      return;
    }

    // Claim this tab with a heartbeat
    const beat = () => localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL);

    // If another tab writes a heartbeat, we detect it via the storage event
    // (storage events only fire in OTHER tabs, not the one that wrote)
    const onStorage = (e: StorageEvent) => {
      if (e.key === HEARTBEAT_KEY) {
        setBlocked(true);
      }
    };
    window.addEventListener('storage', onStorage);

    // Clean up heartbeat on unload so next tab can claim
    const onUnload = () => localStorage.removeItem(HEARTBEAT_KEY);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('beforeunload', onUnload);
      localStorage.removeItem(HEARTBEAT_KEY);
    };
  }, []);

  return blocked;
}
