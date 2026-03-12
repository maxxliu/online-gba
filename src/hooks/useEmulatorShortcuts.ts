'use client';

import { useEffect } from 'react';
import { DEFAULT_SHORTCUTS } from '@/lib/constants';
import type { Shortcuts } from '@/types';

interface UseEmulatorShortcutsOptions {
  togglePause: () => void;
  setSpeed: (n: number) => void;
  saveState: (slot: number) => boolean;
  loadState: (slot: number) => boolean;
  shortcuts?: Shortcuts;
  enabled?: boolean;
}

export function useEmulatorShortcuts({
  togglePause,
  setSpeed,
  saveState,
  loadState,
  shortcuts,
  enabled = true,
}: UseEmulatorShortcutsOptions) {
  const activeShortcuts = shortcuts ?? DEFAULT_SHORTCUTS;

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

      if (key === activeShortcuts.togglePause) {
        e.preventDefault();
        togglePause();
        return;
      }

      if (key === activeShortcuts.saveState) {
        e.preventDefault();
        saveState(0);
        return;
      }

      if (key === activeShortcuts.loadState) {
        e.preventDefault();
        loadState(0);
        return;
      }

      // Speed keys 1-5
      for (let i = 1; i <= 5; i++) {
        const speedKey = `speed${i}` as keyof typeof activeShortcuts;
        if (key === activeShortcuts[speedKey]) {
          e.preventDefault();
          setSpeed(i);
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, togglePause, setSpeed, saveState, loadState, activeShortcuts]);
}
