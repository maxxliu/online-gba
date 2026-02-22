'use client';

import { useState, useCallback, useRef } from 'react';
import type { InputSource } from '@/types';

interface UseButtonStateOptions {
  onButtonPress?: (name: string) => void;
  onButtonRelease?: (name: string) => void;
}

export function useButtonState({ onButtonPress, onButtonRelease }: UseButtonStateOptions = {}) {
  const [pressedButtons, setPressedButtons] = useState<Record<string, boolean>>({});
  const sourcesRef = useRef<Record<string, Set<InputSource>>>({});

  const press = useCallback(
    (name: string, source: InputSource) => {
      if (!sourcesRef.current[name]) {
        sourcesRef.current[name] = new Set();
      }
      const isFirstSource = sourcesRef.current[name].size === 0;
      sourcesRef.current[name].add(source);

      if (isFirstSource) {
        setPressedButtons((prev) => ({ ...prev, [name]: true }));
        onButtonPress?.(name);
      }
    },
    [onButtonPress],
  );

  const release = useCallback(
    (name: string, source: InputSource) => {
      const sources = sourcesRef.current[name];
      if (!sources) return;

      sources.delete(source);

      if (sources.size === 0) {
        setPressedButtons((prev) => ({ ...prev, [name]: false }));
        onButtonRelease?.(name);
      }
    },
    [onButtonRelease],
  );

  const releaseAll = useCallback(
    (source?: InputSource) => {
      const entries = Object.entries(sourcesRef.current);
      for (const [name, sources] of entries) {
        if (source) {
          sources.delete(source);
          if (sources.size === 0) {
            setPressedButtons((prev) => ({ ...prev, [name]: false }));
            onButtonRelease?.(name);
          }
        } else {
          sources.clear();
          setPressedButtons((prev) => ({ ...prev, [name]: false }));
          onButtonRelease?.(name);
        }
      }
    },
    [onButtonRelease],
  );

  return { pressedButtons, press, release, releaseAll };
}
