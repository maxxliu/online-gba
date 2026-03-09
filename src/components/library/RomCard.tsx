'use client';

import { motion } from 'framer-motion';
import type { RomMetadata } from '@/types';
import styles from './RomCard.module.css';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

interface RomCardProps {
  rom: RomMetadata;
  onPlay: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function RomCard({ rom, onPlay, onDelete }: RomCardProps) {
  return (
    <motion.div
      className={styles.card}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={styles.info}>
        <h3 className={styles.title} title={rom.name}>
          {rom.name}
        </h3>
        <div className={styles.meta}>
          <span>{formatSize(rom.size)}</span>
          <span className={styles.dot}>·</span>
          {rom.lastPlayedAt ? (
            <span>{formatRelativeTime(rom.lastPlayedAt)}</span>
          ) : (
            <span className={styles.badge}>New</span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.playBtn}
          onClick={() => onPlay(rom.id)}
          aria-label={`Play ${rom.name}`}
          type="button"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6 4l10 6-10 6V4z" />
          </svg>
        </button>
        <button
          className={styles.deleteBtn}
          onClick={() => onDelete(rom.id, rom.name)}
          aria-label={`Delete ${rom.name}`}
          type="button"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
