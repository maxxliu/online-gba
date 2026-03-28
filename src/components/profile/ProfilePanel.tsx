'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLibraryStore } from '@/stores/library-store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { AuthForm } from './AuthForm';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import styles from './ProfilePanel.module.css';

const DESKTOP_SPRING = { type: 'spring' as const, damping: 25, stiffness: 300 };
const MOBILE_SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 };

export function ProfilePanel() {
  const isOpen = useUiStore((s) => s.activePanel === 'profile');
  const closePanel = useUiStore((s) => s.closePanel);
  const { isMobile } = useMediaQuery();
  const dragControls = useDragControls();

  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const pendingSyncCount = useAuthStore((s) => s.pendingSyncCount);
  const syncError = useAuthStore((s) => s.syncError);
  const signOut = useAuthStore((s) => s.signOut);

  const roms = useLibraryStore((s) => s.roms);
  const romCount = useMemo(() => roms.length, [roms]);

  // Debounce "syncing" so quick ops (playtime ticks) don't flash
  const [displaySyncStatus, setDisplaySyncStatus] = useState(syncStatus);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(syncTimerRef.current);
    if (syncStatus === 'syncing' && displaySyncStatus !== 'syncing') {
      syncTimerRef.current = setTimeout(() => setDisplaySyncStatus('syncing'), 1000);
    } else if (syncStatus !== 'syncing') {
      setDisplaySyncStatus(syncStatus);
    }
    return () => clearTimeout(syncTimerRef.current);
  }, [syncStatus, displaySyncStatus]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closePanel]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        closePanel();
      }
    },
    [closePanel],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    closePanel();
  }, [signOut, closePanel]);

  const syncStatusText =
    displaySyncStatus === 'synced'
      ? 'All synced'
      : displaySyncStatus === 'syncing'
        ? `Syncing ${pendingSyncCount} item${pendingSyncCount !== 1 ? 's' : ''}...`
        : displaySyncStatus === 'error'
          ? 'Sync error'
          : displaySyncStatus === 'offline'
            ? 'Offline — will sync when reconnected'
            : '';

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??';

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  const panelContent = (
    <>
      {/* Header */}
      <div className={styles.header} onPointerDown={(e) => { if (isMobile) dragControls.start(e); }}>
        {isMobile && <div className={styles.dragHandle} />}
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Account</h2>
          <button
            className={styles.closeBtn}
            onClick={closePanel}
            aria-label="Close profile panel"
            type="button"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!user ? (
          <>
            <AuthForm />
            <p className={styles.privacyNote}>
              Your ROMs never leave your device unless you sign in.
            </p>
          </>
        ) : (
          <>
            {/* Profile Section */}
            <div className={styles.profileSection}>
              <div className={styles.avatar}>
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="" className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarInitials}>{initials}</span>
                )}
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.email}>{user.email}</span>
                <span className={styles.signedInBadge}>Signed in</span>
              </div>
            </div>

            {/* Sync Section */}
            <h3 className={styles.sectionHeader}>Sync</h3>
            <div className={styles.syncSection}>
              <SyncStatusIndicator className={styles.syncIndicatorInline} />
              <span className={styles.syncText}>{syncStatusText}</span>
            </div>
            {syncError && (
              <p className={styles.syncError}>{syncError}</p>
            )}

            {/* Storage Info */}
            <h3 className={styles.sectionHeader}>Storage</h3>
            <div className={styles.storageInfo}>
              <span>{romCount} ROM{romCount !== 1 ? 's' : ''} in library</span>
            </div>

            {/* Sign Out */}
            <button
              className={styles.signOutBtn}
              onClick={handleSignOut}
              type="button"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePanel}
            aria-hidden="true"
          />

          {/* Panel */}
          {isMobile ? (
            <motion.aside
              className={styles.panelMobile}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={MOBILE_SPRING}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              dragControls={dragControls}
              dragListener={false}
              onDragEnd={handleDragEnd}
              role="dialog"
              aria-label="Profile"
            >
              {panelContent}
            </motion.aside>
          ) : (
            <motion.aside
              className={styles.panelDesktop}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={DESKTOP_SPRING}
              role="dialog"
              aria-label="Profile"
            >
              {panelContent}
            </motion.aside>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
