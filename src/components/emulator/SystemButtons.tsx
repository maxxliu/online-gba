'use client';

import { useCallback } from 'react';
import styles from './GameBoyShell.module.css';

interface SystemButtonsProps {
  onButtonPress?: (name: string) => void;
  onButtonRelease?: (name: string) => void;
  pressedButtons?: Record<string, boolean>;
}

export function SystemButtons({ onButtonPress, onButtonRelease, pressedButtons }: SystemButtonsProps) {
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
    <div className={styles.systemButtonGroup}>
      {(['SELECT', 'START'] as const).map((label) => (
        <div key={label} className={styles.systemBtnWrap}>
          <button
            className={styles.systemBtn}
            data-pressed={pressedButtons?.[label] || undefined}
            onPointerDown={handlePointerDown(label)}
            onPointerUp={handlePointerUp(label)}
            onPointerLeave={handlePointerUp(label)}
            onPointerCancel={handlePointerUp(label)}
            aria-label={label}
          />
          <span className={styles.systemBtnLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}
