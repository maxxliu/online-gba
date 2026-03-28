'use client';

import { useCallback, useRef } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import styles from './TouchControls.module.css';

interface TouchControlsProps {
  onButtonPress: (name: string) => void;
  onButtonRelease: (name: string) => void;
  pressedButtons: Record<string, boolean>;
  layout: 'portrait' | 'landscape';
}

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

const DPAD_DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
type DpadDir = (typeof DPAD_DIRECTIONS)[number];

/** Compute which directions are pressed from pointer position relative to D-pad center */
function getDpadDirections(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): DpadDir[] {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const deadZone = rect.width * 0.12;
  if (dist < deadZone) return [];

  const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180, 0=right
  const dirs: DpadDir[] = [];

  // 8-directional zones: each cardinal +-22.5deg pure, between is diagonal
  // Right: -22.5 to 22.5
  // Down-Right: 22.5 to 67.5
  // Down: 67.5 to 112.5
  // Down-Left: 112.5 to 157.5
  // Left: 157.5 to 180 or -180 to -157.5
  // Up-Left: -157.5 to -112.5
  // Up: -112.5 to -67.5
  // Up-Right: -67.5 to -22.5

  if (angle >= -67.5 && angle <= 67.5) dirs.push('RIGHT');
  if (angle >= 112.5 || angle <= -112.5) dirs.push('LEFT');
  if (angle >= 22.5 && angle <= 157.5) dirs.push('DOWN');
  if (angle >= -157.5 && angle <= -22.5) dirs.push('UP');

  return dirs;
}

export function TouchControls({
  onButtonPress,
  onButtonRelease,
  pressedButtons,
  layout,
}: TouchControlsProps) {
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const controlOpacity = useSettingsStore((s) => s.controlOpacity);

  // Track which D-pad directions are currently pressed by the touch surface
  const activeDpadDirs = useRef<Set<DpadDir>>(new Set());
  const dpadRef = useRef<HTMLDivElement>(null);
  const dpadPointerDown = useRef(false);

  // Compute visual direction attribute for the 3D tilt effect
  const activeDirections = DPAD_DIRECTIONS.filter((d) => pressedButtons[d]);
  const dpadDataDir = activeDirections.length > 0 ? activeDirections.join('-') : undefined;

  const handlePointerDown = useCallback(
    (name: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      (e.target as HTMLButtonElement).setPointerCapture(e.pointerId);
      if (canVibrate && hapticEnabled) {
        navigator.vibrate(name === 'L' || name === 'R' ? 12 : 8);
      }
      onButtonPress(name);
    },
    [onButtonPress, hapticEnabled],
  );

  const handlePointerUp = useCallback(
    (name: string) => (e: React.PointerEvent) => {
      e.preventDefault();
      onButtonRelease(name);
    },
    [onButtonRelease],
  );

  // D-pad unified touch surface handlers
  const updateDpadFromPointer = useCallback(
    (e: React.PointerEvent) => {
      const el = dpadRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const newDirs = getDpadDirections(e.clientX, e.clientY, rect);
      const prev = activeDpadDirs.current;

      // Release directions no longer active
      Array.from(prev).forEach((d) => {
        if (!newDirs.includes(d)) {
          prev.delete(d);
          onButtonRelease(d);
        }
      });
      // Press newly active directions
      newDirs.forEach((d) => {
        if (!prev.has(d)) {
          prev.add(d);
          onButtonPress(d);
        }
      });
    },
    [onButtonPress, onButtonRelease],
  );

  const handleDpadDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dpadPointerDown.current = true;
      // Touch devices get implicit pointer capture; only capture explicitly for mouse/pen
      if (e.pointerType !== 'touch') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (canVibrate && hapticEnabled) {
        navigator.vibrate(8);
      }
      updateDpadFromPointer(e);
    },
    [updateDpadFromPointer, hapticEnabled],
  );

  const handleDpadMove = useCallback(
    (e: React.PointerEvent) => {
      // Use ref instead of e.pressure — iOS reports pressure: 0 on devices without 3D Touch
      if (dpadPointerDown.current) {
        updateDpadFromPointer(e);
      }
    },
    [updateDpadFromPointer],
  );

  const handleDpadUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dpadPointerDown.current = false;
      const prev = activeDpadDirs.current;
      Array.from(prev).forEach((d) => {
        onButtonRelease(d);
      });
      prev.clear();
    },
    [onButtonRelease],
  );

  // Shared sub-renders

  const dpad = (
    <div className={styles.dpad} ref={dpadRef}>
      <div
        className={styles.dpadBody}
        data-direction={dpadDataDir}
      >
        <div className={styles.dpadVertical} />
        <div className={styles.dpadHorizontal} />
        <div className={styles.dpadCenter} />
      </div>
      {/* Single unified touch surface covering entire D-pad */}
      <div
        className={styles.dpadTouchSurface}
        onPointerDown={handleDpadDown}
        onPointerMove={handleDpadMove}
        onPointerUp={handleDpadUp}
        onPointerLeave={handleDpadUp}
        onPointerCancel={handleDpadUp}
        role="button"
        aria-label="D-pad"
        tabIndex={-1}
      />
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

  const opacityStyle = { '--control-opacity': controlOpacity } as React.CSSProperties;

  if (layout === 'portrait') {
    return (
      <div className={styles.controls} data-layout="portrait" style={opacityStyle}>
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
    <div className={styles.controls} data-layout="landscape" style={opacityStyle}>
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
