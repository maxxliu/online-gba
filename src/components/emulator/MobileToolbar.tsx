'use client';

import styles from './MobileToolbar.module.css';

interface MobileToolbarProps {
  onLibraryPress?: () => void;
  onSavesPress?: () => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
}

export function MobileToolbar({ onLibraryPress, onSavesPress, onSettingsPress, onProfilePress }: MobileToolbarProps) {
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
      <button
        className={styles.toolbarBtn}
        onClick={onSettingsPress}
        aria-label="Settings"
      >
        <svg
          className={styles.toolbarIcon}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M11.1 1.5l.7 2.1c.4.2.8.4 1.2.6l2.1-.5 1.5 1.5-.5 2.1c.3.4.5.8.6 1.2l2.1.7v2.1l-2.1.7c-.2.4-.4.8-.6 1.2l.5 2.1-1.5 1.5-2.1-.5c-.4.3-.8.5-1.2.6l-.7 2.1H8.9l-.7-2.1c-.4-.2-.8-.4-1.2-.6l-2.1.5-1.5-1.5.5-2.1c-.3-.4-.5-.8-.6-1.2L1.2 11V8.9l2.1-.7c.2-.4.4-.8.6-1.2l-.5-2.1L4.9 3.4l2.1.5c.4-.3.8-.5 1.2-.6l.7-2.1h2.2zM10 7a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
        Settings
      </button>
      <button
        className={styles.toolbarBtn}
        onClick={onProfilePress}
        aria-label="Profile"
      >
        <svg
          className={styles.toolbarIcon}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
        </svg>
        Profile
      </button>
    </nav>
  );
}
