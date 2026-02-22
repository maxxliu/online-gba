'use client';

import { useCallback } from 'react';
import styles from './GameBoyShell.module.css';

interface BumpersProps {
  onButtonPress?: (name: string) => void;
  onButtonRelease?: (name: string) => void;
  pressedButtons?: Record<string, boolean>;
}

export function Bumpers({ onButtonPress, onButtonRelease, pressedButtons }: BumpersProps) {
  const handlePointerDown = useCallback(
    (name: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      (e.target as HTMLButtonElement).setPointerCapture(e.pointerId);
      onButtonPress?.(name);
    },
    [onButtonPress],
  );

  const handlePointerUp = useCallback(
    (name: string) => (e: React.PointerEvent) => {
      e.preventDefault();
      onButtonRelease?.(name);
    },
    [onButtonRelease],
  );

  return (
    <div className={styles.bumperGroup}>
      {(['L', 'R'] as const).map((label) => (
        <button
          key={label}
          className={`${styles.bumper} ${label === 'L' ? styles.bumperL : styles.bumperR}`}
          data-pressed={pressedButtons?.[label] || undefined}
          onPointerDown={handlePointerDown(label)}
          onPointerUp={handlePointerUp(label)}
          onPointerLeave={handlePointerUp(label)}
          onPointerCancel={handlePointerUp(label)}
          aria-label={`${label} bumper`}
        >
          <span className={styles.bumperLabel}>{label}</span>
        </button>
      ))}
    </div>
  );
}
