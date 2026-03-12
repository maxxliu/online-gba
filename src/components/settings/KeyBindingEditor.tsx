'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import type { KeyBindings, Shortcuts } from '@/types';
import styles from './KeyBindingEditor.module.css';

type BindingTarget =
  | { type: 'button'; key: keyof KeyBindings }
  | { type: 'shortcut'; key: keyof Shortcuts };

const BUTTON_LABELS: Record<keyof KeyBindings, string> = {
  A: 'A',
  B: 'B',
  L: 'L',
  R: 'R',
  START: 'Start',
  SELECT: 'Select',
  UP: 'Up',
  DOWN: 'Down',
  LEFT: 'Left',
  RIGHT: 'Right',
};

const SHORTCUT_LABELS: Record<keyof Shortcuts, string> = {
  togglePause: 'Pause',
  speed1: 'Speed 1x',
  speed2: 'Speed 2x',
  speed3: 'Speed 3x',
  speed4: 'Speed 4x',
  speed5: 'Speed 5x',
  saveState: 'Quick Save',
  loadState: 'Quick Load',
};

function displayKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key === 'ArrowUp') return '↑';
  if (key === 'ArrowDown') return '↓';
  if (key === 'ArrowLeft') return '←';
  if (key === 'ArrowRight') return '→';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function findConflict(
  targetKey: string,
  currentTarget: BindingTarget,
  keyBindings: KeyBindings,
  shortcuts: Shortcuts,
): string | null {
  for (const [btn, bound] of Object.entries(keyBindings)) {
    if (bound === targetKey) {
      if (currentTarget.type === 'button' && currentTarget.key === btn) continue;
      return BUTTON_LABELS[btn as keyof KeyBindings] ?? btn;
    }
  }
  for (const [action, bound] of Object.entries(shortcuts)) {
    if (bound === targetKey) {
      if (currentTarget.type === 'shortcut' && currentTarget.key === action) continue;
      return SHORTCUT_LABELS[action as keyof Shortcuts] ?? action;
    }
  }
  return null;
}

export function KeyBindingEditor() {
  const keyBindings = useSettingsStore((s) => s.keyBindings);
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const setKeyBinding = useSettingsStore((s) => s.setKeyBinding);
  const setShortcut = useSettingsStore((s) => s.setShortcut);
  const resetAllBindings = useSettingsStore((s) => s.resetAllBindings);

  const [listening, setListening] = useState<BindingTarget | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{ key: string; label: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleRowClick = useCallback((target: BindingTarget) => {
    setListening(target);
    setConflictInfo(null);
  }, []);

  useEffect(() => {
    if (!listening) return;
    const target = listening;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setListening(null);
        setConflictInfo(null);
        return;
      }

      const capturedKey = e.key;
      const conflict = findConflict(capturedKey, target, keyBindings, shortcuts);

      if (conflict && (!conflictInfo || conflictInfo.key !== capturedKey)) {
        setConflictInfo({ key: capturedKey, label: conflict });
        return;
      }

      // If conflict was acknowledged (same key pressed again), swap the bindings
      if (conflict && conflictInfo && conflictInfo.key === capturedKey) {
        const currentValue = target.type === 'button'
          ? keyBindings[target.key]
          : shortcuts[target.key];

        for (const [btn, bound] of Object.entries(keyBindings)) {
          if (bound === capturedKey && !(target.type === 'button' && target.key === btn)) {
            setKeyBinding(btn as keyof KeyBindings, currentValue);
            break;
          }
        }
        for (const [action, bound] of Object.entries(shortcuts)) {
          if (bound === capturedKey && !(target.type === 'shortcut' && target.key === action)) {
            setShortcut(action as keyof Shortcuts, currentValue);
            break;
          }
        }
      }

      if (target.type === 'button') {
        setKeyBinding(target.key, capturedKey);
      } else {
        setShortcut(target.key, capturedKey);
      }

      setListening(null);
      setConflictInfo(null);
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listening, conflictInfo, keyBindings, shortcuts, setKeyBinding, setShortcut]);

  const buttonKeys = Object.keys(BUTTON_LABELS) as (keyof KeyBindings)[];
  const shortcutKeys = Object.keys(SHORTCUT_LABELS) as (keyof Shortcuts)[];

  return (
    <div>
      {/* GBA Buttons */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>GBA Buttons</h3>
        {buttonKeys.map((btn) => {
          const isActive = listening?.type === 'button' && listening.key === btn;
          return (
            <div key={btn}>
              <div
                className={isActive ? styles.rowListening : styles.row}
                onClick={() => handleRowClick({ type: 'button', key: btn })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !listening) handleRowClick({ type: 'button', key: btn });
                }}
              >
                <span className={styles.label}>{BUTTON_LABELS[btn]}</span>
                <span className={isActive ? styles.keyBadgeListening : styles.keyBadge}>
                  {isActive ? 'Press a key…' : displayKey(keyBindings[btn])}
                </span>
              </div>
              {isActive && conflictInfo && (
                <p className={styles.warning}>
                  Already used for {conflictInfo.label}. Press again to swap, or Escape to cancel.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Shortcuts */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Shortcuts</h3>
        {shortcutKeys.map((action) => {
          const isActive = listening?.type === 'shortcut' && listening.key === action;
          return (
            <div key={action}>
              <div
                className={isActive ? styles.rowListening : styles.row}
                onClick={() => handleRowClick({ type: 'shortcut', key: action })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !listening) handleRowClick({ type: 'shortcut', key: action });
                }}
              >
                <span className={styles.label}>{SHORTCUT_LABELS[action]}</span>
                <span className={isActive ? styles.keyBadgeListening : styles.keyBadge}>
                  {isActive ? 'Press a key…' : displayKey(shortcuts[action])}
                </span>
              </div>
              {isActive && conflictInfo && (
                <p className={styles.warning}>
                  Already used for {conflictInfo.label}. Press again to swap, or Escape to cancel.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset */}
      {confirmReset ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={styles.resetBtn}
            onClick={() => setConfirmReset(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles.resetBtn}
            onClick={() => {
              resetAllBindings();
              setConfirmReset(false);
            }}
            type="button"
            style={{ color: 'var(--color-red)' }}
          >
            Confirm Reset
          </button>
        </div>
      ) : (
        <button
          className={styles.resetBtn}
          onClick={() => setConfirmReset(true)}
          type="button"
        >
          Reset All to Defaults
        </button>
      )}
    </div>
  );
}
