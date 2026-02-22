'use client';

import { useEffect, useRef, useMemo } from 'react';
import { DEFAULT_KEY_BINDINGS } from '@/lib/constants';

interface UseKeyboardControlsOptions {
  press: (name: string, source: 'keyboard') => void;
  release: (name: string, source: 'keyboard') => void;
  releaseAll: (source: 'keyboard') => void;
  keyBindings?: Record<string, string>;
  enabled?: boolean;
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

export function useKeyboardControls({
  press,
  release,
  releaseAll,
  keyBindings = DEFAULT_KEY_BINDINGS,
  enabled = true,
}: UseKeyboardControlsOptions) {
  // Build reverse lookup: key -> button name
  const keyToButton = useMemo(() => {
    const map = new Map<string, string>();
    for (const [button, key] of Object.entries(keyBindings)) {
      map.set(normalizeKey(key), button);
    }
    return map;
  }, [keyBindings]);

  const heldKeysRef = useRef(new Set<string>());

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

      const normalized = normalizeKey(e.key);
      const button = keyToButton.get(normalized);
      if (!button) return;

      e.preventDefault();
      heldKeysRef.current.add(normalized);
      press(button, 'keyboard');
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (isTextInput(e.target)) return;

      const normalized = normalizeKey(e.key);
      const button = keyToButton.get(normalized);
      if (!button) return;

      e.preventDefault();
      heldKeysRef.current.delete(normalized);
      release(button, 'keyboard');
    }

    function handleBlur() {
      heldKeysRef.current.clear();
      releaseAll('keyboard');
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        heldKeysRef.current.clear();
        releaseAll('keyboard');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const heldKeys = heldKeysRef.current;
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      heldKeys.clear();
    };
  }, [enabled, keyToButton, press, release, releaseAll]);
}
