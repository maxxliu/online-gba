'use client';

import { useEffect } from 'react';
import { DEFAULT_SHORTCUTS } from '@/lib/constants';

interface UseEmulatorShortcutsOptions {
  togglePause: () => void;
  setSpeed: (n: number) => void;
  saveState: (slot: number) => boolean;
  loadState: (slot: number) => boolean;
  enabled?: boolean;
}

export function useEmulatorShortcuts({
  togglePause,
  setSpeed,
  saveState,
  loadState,
  enabled = true,
}: UseEmulatorShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function isTextInput(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (isTextInput(e.target)) return;

      const key = e.key;

      if (key === DEFAULT_SHORTCUTS.togglePause) {
        e.preventDefault();
        togglePause();
        return;
      }

      if (key === DEFAULT_SHORTCUTS.saveState) {
        e.preventDefault();
        saveState(0);
        return;
      }

      if (key === DEFAULT_SHORTCUTS.loadState) {
        e.preventDefault();
        loadState(0);
        return;
      }

      // Speed keys 1-5
      for (let i = 1; i <= 5; i++) {
        if (key === String(i) && DEFAULT_SHORTCUTS[`speed${i}`] === key) {
          e.preventDefault();
          setSpeed(i);
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, togglePause, setSpeed, saveState, loadState]);
}
