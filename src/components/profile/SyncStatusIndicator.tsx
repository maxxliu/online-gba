'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import styles from './SyncStatusIndicator.module.css';

const SYNCING_DEBOUNCE_MS = 1000;

interface SyncStatusIndicatorProps {
  className?: string;
}

export function SyncStatusIndicator({ className }: SyncStatusIndicatorProps) {
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const pendingSyncCount = useAuthStore((s) => s.pendingSyncCount);

  // Debounce the "syncing" visual so quick operations (playtime ticks) don't flash
  const [displayStatus, setDisplayStatus] = useState(syncStatus);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (syncStatus === 'syncing' && displayStatus !== 'syncing') {
      // Delay showing "syncing" — if it resolves quickly, user never sees it
      timerRef.current = setTimeout(() => setDisplayStatus('syncing'), SYNCING_DEBOUNCE_MS);
    } else if (syncStatus !== 'syncing') {
      // All other transitions (synced, error, offline, idle) apply immediately
      setDisplayStatus(syncStatus);
    }

    return () => clearTimeout(timerRef.current);
  }, [syncStatus, displayStatus]);

  if (!user) return null;

  const statusLabel =
    displayStatus === 'synced'
      ? 'Synced'
      : displayStatus === 'syncing'
        ? `Syncing${pendingSyncCount > 0 ? ` (${pendingSyncCount})` : '...'}`
        : displayStatus === 'error'
          ? 'Sync error'
          : displayStatus === 'offline'
            ? 'Offline'
            : '';

  if (displayStatus === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`${styles.indicator} ${styles[displayStatus]} ${className ?? ''}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        title={statusLabel}
        aria-label={statusLabel}
      >
        {/* Cloud Icon */}
        <svg className={styles.cloudIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
            fill="currentColor"
          />
        </svg>

        {/* Status overlay icon */}
        {displayStatus === 'synced' && (
          <svg className={styles.statusIcon} viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
        {displayStatus === 'syncing' && (
          <svg className={`${styles.statusIcon} ${styles.syncingAnim}`} viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 2v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M6 10V7l-2-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        )}
        {displayStatus === 'error' && (
          <svg className={styles.statusIcon} viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 3v4M6 9v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        )}
        {displayStatus === 'offline' && (
          <svg className={styles.statusIcon} viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 8V4M4 6h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
