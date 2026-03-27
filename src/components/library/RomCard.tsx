'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { RomMetadata } from '@/types';
import { formatRelativeTime } from '@/lib/format';
import styles from './RomCard.module.css';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RomCardProps {
  rom: RomMetadata;
  onPlay: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onRename: (id: string, newName: string) => void;
}

export function RomCard({ rom, onPlay, onDelete, onRename }: RomCardProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(rom.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== rom.name) {
      onRename(rom.id, trimmed);
    } else {
      setEditValue(rom.name);
    }
    setEditing(false);
  }, [editValue, rom.name, rom.id, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditValue(rom.name);
        setEditing(false);
      }
    },
    [commitRename, rom.name],
  );

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
        {editing ? (
          <input
            ref={inputRef}
            className={styles.titleInput}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            aria-label="Rename ROM"
          />
        ) : (
          <div className={styles.titleRow}>
            <h3
              className={styles.title}
              title={rom.name}
              onClick={() => {
                setEditValue(rom.name);
                setEditing(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setEditValue(rom.name);
                  setEditing(true);
                }
              }}
            >
              {rom.name}
            </h3>
            <svg
              className={styles.editIcon}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <div className={styles.meta}>
          <span>{formatSize(rom.size)}</span>
          <span className={styles.dot}>·</span>
          {rom.lastPlayedAt ? (
            <span>{formatRelativeTime(rom.lastPlayedAt)}</span>
          ) : (
            <span className={styles.badge}>New</span>
          )}
          {rom.cloudOnly && (
            <svg className={styles.cloudBadge} viewBox="0 0 16 16" fill="currentColor" aria-label="Cloud only" role="img">
              <path d="M13.5 7.02C13.12 4.73 11.18 3 8.8 3c-1.76 0-3.3 1-4.06 2.43C2.68 5.63 1 7.38 1 9.5 1 12 3 14 5.5 14h7.8c1.6 0 2.7-1.3 2.7-2.9 0-1.5-1.1-2.7-2.5-2.88v-1.2zM10 10l-2 2-2-2h1.5V7.5h1V10H10z" />
            </svg>
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
