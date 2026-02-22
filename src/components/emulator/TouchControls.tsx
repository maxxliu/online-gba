'use client';

import { useCallback } from 'react';
import styles from './TouchControls.module.css';

interface TouchControlsProps {
  onButtonPress: (name: string) => void;
  onButtonRelease: (name: string) => void;
  pressedButtons: Record<string, boolean>;
  layout: 'portrait' | 'landscape';
}

const DPAD_DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

const dpadZoneStyles: Record<string, string> = {
  UP: styles.dpadUp,
  DOWN: styles.dpadDown,
  LEFT: styles.dpadLeft,
  RIGHT: styles.dpadRight,
};

export function TouchControls({
  onButtonPress,
  onButtonRelease,
  pressedButtons,
  layout,
}: TouchControlsProps) {
  const activeDirection =
    DPAD_DIRECTIONS.find((d) => pressedButtons[d]) ?? null;

  const handlePointerDown = useCallback(
    (name: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      (e.target as HTMLButtonElement).setPointerCapture(e.pointerId);
      onButtonPress(name);
    },
    [onButtonPress],
  );

  const handlePointerUp = useCallback(
    (name: string) => (e: React.PointerEvent) => {
      e.preventDefault();
      onButtonRelease(name);
    },
    [onButtonRelease],
  );

  // Shared sub-renders

  const dpad = (
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
          className={`${styles.dpadZone} ${dpadZoneStyles[name]}`}
          onPointerDown={handlePointerDown(name)}
          onPointerUp={handlePointerUp(name)}
          onPointerLeave={handlePointerUp(name)}
          onPointerCancel={handlePointerUp(name)}
          aria-label={name}
        />
      ))}
    </div>
  );

  const actionButtons = (
    <div className={styles.actionGroup}>
      <button
        className={`${styles.actionBtn} ${styles.btnA}`}
        onPointerDown={handlePointerDown('A')}
        onPointerUp={handlePointerUp('A')}
        onPointerLeave={handlePointerUp('A')}
        onPointerCancel={handlePointerUp('A')}
        data-pressed={pressedButtons['A'] || undefined}
        aria-label="A"
      >
        <span className={styles.actionBtnLabel}>A</span>
      </button>
      <button
        className={`${styles.actionBtn} ${styles.btnB}`}
        onPointerDown={handlePointerDown('B')}
        onPointerUp={handlePointerUp('B')}
        onPointerLeave={handlePointerUp('B')}
        onPointerCancel={handlePointerUp('B')}
        data-pressed={pressedButtons['B'] || undefined}
        aria-label="B"
      >
        <span className={styles.actionBtnLabel}>B</span>
      </button>
    </div>
  );

  const bumperL = (
    <button
      className={`${styles.bumper} ${styles.bumperL}`}
      onPointerDown={handlePointerDown('L')}
      onPointerUp={handlePointerUp('L')}
      onPointerLeave={handlePointerUp('L')}
      onPointerCancel={handlePointerUp('L')}
      data-pressed={pressedButtons['L'] || undefined}
      aria-label="L"
    >
      <span className={styles.bumperLabel}>L</span>
    </button>
  );

  const bumperR = (
    <button
      className={`${styles.bumper} ${styles.bumperR}`}
      onPointerDown={handlePointerDown('R')}
      onPointerUp={handlePointerUp('R')}
      onPointerLeave={handlePointerUp('R')}
      onPointerCancel={handlePointerUp('R')}
      data-pressed={pressedButtons['R'] || undefined}
      aria-label="R"
    >
      <span className={styles.bumperLabel}>R</span>
    </button>
  );

  const systemButtons = (
    <div className={styles.systemGroup}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div className={styles.systemBtnWrap}>
          <button
            className={styles.systemBtn}
            onPointerDown={handlePointerDown('SELECT')}
            onPointerUp={handlePointerUp('SELECT')}
            onPointerLeave={handlePointerUp('SELECT')}
            onPointerCancel={handlePointerUp('SELECT')}
            data-pressed={pressedButtons['SELECT'] || undefined}
            aria-label="SELECT"
          />
          <span className={styles.systemBtnLabel}>SELECT</span>
        </div>
        <div className={styles.systemBtnWrap}>
          <button
            className={styles.systemBtn}
            onPointerDown={handlePointerDown('START')}
            onPointerUp={handlePointerUp('START')}
            onPointerLeave={handlePointerUp('START')}
            onPointerCancel={handlePointerUp('START')}
            data-pressed={pressedButtons['START'] || undefined}
            aria-label="START"
          />
          <span className={styles.systemBtnLabel}>START</span>
        </div>
      </div>
    </div>
  );

  // ─── Portrait Layout ─────────────────────────────

  if (layout === 'portrait') {
    return (
      <div className={styles.controls} data-layout="portrait">
        <div className={styles.bumperRow}>
          {bumperL}
          {bumperR}
        </div>
        <div className={styles.controlsRow}>
          {dpad}
          {actionButtons}
        </div>
        <div className={styles.systemRow}>
          {systemButtons}
        </div>
      </div>
    );
  }

  // ─── Landscape Layout ────────────────────────────

  return (
    <div className={styles.controls} data-layout="landscape">
      <div className={styles.landscapeLeft}>
        {bumperL}
        {dpad}
      </div>
      <div className={styles.landscapeCenter}>
        {systemButtons}
      </div>
      <div className={styles.landscapeRight}>
        {bumperR}
        {actionButtons}
      </div>
    </div>
  );
}
