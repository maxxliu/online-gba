'use client';

import type { ReactNode } from 'react';
import styles from './GameBoyShell.module.css';

interface ScreenBezelProps {
  isPoweredOn?: boolean;
  children?: ReactNode;
}

export function ScreenBezel({ isPoweredOn = false, children }: ScreenBezelProps) {
  return (
    <div className={styles.bezel} data-powered={isPoweredOn}>
      <div className={styles.screen}>
        {children ?? (
          <div className={styles.screenPlaceholder}>
            <span className={styles.screenLogo}>RetroPlay</span>
            <span className={styles.screenHint}>Upload a ROM to play</span>
          </div>
        )}
      </div>
    </div>
  );
}
