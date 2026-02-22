'use client';

import { useCallback } from 'react';
import styles from './GameBoyShell.module.css';

interface DPadProps {
  onButtonPress?: (name: string) => void;
  onButtonRelease?: (name: string) => void;
  pressedButtons?: Record<string, boolean>;
}

const DPAD_DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

const directionStyles: Record<string, string> = {
  UP: styles.dpadUp,
  DOWN: styles.dpadDown,
  LEFT: styles.dpadLeft,
  RIGHT: styles.dpadRight,
};

export function DPad({ onButtonPress, onButtonRelease, pressedButtons }: DPadProps) {
  // Derive active direction from pressedButtons (first pressed direction wins for visual)
  const activeDirection = DPAD_DIRECTIONS.find((d) => pressedButtons?.[d]) ?? null;

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
    <div className={styles.dpad}>
      <div
        className={styles.dpadBody}
        data-direction={activeDirection ?? undefined}
      >
        <div className={styles.dpadVertical} />
        <div className={styles.dpadHorizontal} />
        <div className={styles.dpadCenter} />
      </div>
      {DPAD_DIRECTIONS.map((name) => (
        <button
          key={name}
          className={`${styles.dpadZone} ${directionStyles[name]}`}
          onPointerDown={handlePointerDown(name)}
          onPointerUp={handlePointerUp(name)}
          onPointerLeave={handlePointerUp(name)}
          onPointerCancel={handlePointerUp(name)}
          aria-label={name}
        />
      ))}
    </div>
  );
}
