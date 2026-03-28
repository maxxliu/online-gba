'use client';

import { useEffect, useRef } from 'react';

/**
 * Keeps the screen awake while `active` is true.
 * Automatically re-acquires the lock when the tab regains visibility.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    if (!active) {
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      return;
    }

    const acquire = async () => {
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock denied (e.g. low battery)
      }
    };

    acquire();

    // Re-acquire when tab becomes visible again (lock is released on visibility change)
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && active) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
