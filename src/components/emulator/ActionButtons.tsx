'use client';

import { useCallback } from 'react';
import styles from './GameBoyShell.module.css';

interface ActionButtonsProps {
  onButtonPress?: (name: string) => void;
  onButtonRelease?: (name: string) => void;
  pressedButtons?: Record<string, boolean>;
}

export function ActionButtons({ onButtonPress, onButtonRelease, pressedButtons }: ActionButtonsProps) {
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
    <div className={styles.actionButtonGroup}>
      <button
        className={`${styles.actionBtn} ${styles.btnA}`}
        data-pressed={pressedButtons?.['A'] || undefined}
        onPointerDown={handlePointerDown('A')}
        onPointerUp={handlePointerUp('A')}
        onPointerLeave={handlePointerUp('A')}
        onPointerCancel={handlePointerUp('A')}
        aria-label="A button"
      >
        <span className={styles.actionBtnLabel}>A</span>
      </button>
      <button
        className={`${styles.actionBtn} ${styles.btnB}`}
        data-pressed={pressedButtons?.['B'] || undefined}
        onPointerDown={handlePointerDown('B')}
        onPointerUp={handlePointerUp('B')}
        onPointerLeave={handlePointerUp('B')}
        onPointerCancel={handlePointerUp('B')}
        aria-label="B button"
      >
        <span className={styles.actionBtnLabel}>B</span>
      </button>
    </div>
  );
}
