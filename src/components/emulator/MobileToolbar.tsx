'use client';

import styles from './MobileToolbar.module.css';

interface MobileToolbarProps {
  onLibraryPress?: () => void;
  onSavesPress?: () => void;
}

export function MobileToolbar({ onLibraryPress, onSavesPress }: MobileToolbarProps) {
  return (
    <nav className={styles.toolbar} aria-label="Game controls">
      <button
        className={styles.toolbarBtn}
        onClick={onLibraryPress}
        aria-label="Library"
      >
        <svg
          className={styles.toolbarIcon}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h14v2H3v-2z" />
        </svg>
        Library
      </button>
      <button
        className={styles.toolbarBtn}
        onClick={onSavesPress}
        aria-label="Saves"
      >
        <svg
          className={styles.toolbarIcon}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3 3h11l3 3v11H3V3zm2 2v12h10V7l-2-2H9v4H5V5zm4 0v3h2V5H9z" />
        </svg>
        Saves
      </button>
    </nav>
  );
}
