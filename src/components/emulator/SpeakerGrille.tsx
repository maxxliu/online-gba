'use client';

import styles from './GameBoyShell.module.css';

export function SpeakerGrille() {
  return (
    <div className={styles.speaker} aria-hidden="true">
      <div className={styles.speakerLines} />
    </div>
  );
}
