'use client';

import { useState, useEffect, type RefObject } from 'react';
import { GBA_SHELL } from '@/lib/constants';

interface ShellScaleOptions {
  verticalFill?: number;
  horizontalFill?: number;
  maxScale?: number;
}

export function useShellScale(
  containerRef: RefObject<HTMLElement | null>,
  options: ShellScaleOptions = {},
): number {
  const {
    verticalFill = 0.88,
    horizontalFill = 0.95,
    maxScale = 2.5,
  } = options;

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      const vScale = (height * verticalFill) / GBA_SHELL.body.height;
      const hScale = (width * horizontalFill) / GBA_SHELL.body.width;
      setScale(Math.min(vScale, hScale, maxScale));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, verticalFill, horizontalFill, maxScale]);

  return scale;
}
