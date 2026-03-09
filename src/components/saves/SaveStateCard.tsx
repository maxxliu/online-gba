'use client';

import { motion } from 'framer-motion';
import type { SaveStateMetadata } from '@/types';
import { formatRelativeTime, formatPlaytime } from '@/lib/format';
import { AUTO_SAVE_SLOTS } from '@/lib/constants';
import styles from './SaveStateCard.module.css';

interface SaveStateCardProps {
  state?: SaveStateMetadata;
  slot: number;
  onSave?: (slot: number) => void;
  onLoad?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function SaveStateCard({ state, slot, onSave, onLoad, onDelete }: SaveStateCardProps) {
  const isAuto = (AUTO_SAVE_SLOTS as readonly number[]).includes(slot);
  const slotLabel = isAuto ? `Auto ${slot}` : `Slot ${slot}`;

  if (!state) {
    return (
      <div className={styles.cardEmpty}>
        <div className={styles.emptyContent}>
          <span className={styles.slotBadge}>{slotLabel}</span>
          <span className={styles.emptyLabel}>Empty Slot</span>
        </div>
        {onSave && !isAuto && (
          <button
            className={styles.saveBtn}
            onClick={() => onSave(slot)}
            aria-label={`Save to slot ${slot}`}
            type="button"
          >
            Save Here
          </button>
        )}
      </div>
    );
  }

  const id = state.id ?? `${state.romId}-slot-${state.slot}`;

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className={styles.cardTop}>
        {state.screenshotDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className={styles.thumbnail}
            src={state.screenshotDataUrl}
            alt={`Save state slot ${slot}`}
            width={120}
            height={80}
          />
        ) : (
          <div className={styles.thumbnailPlaceholder} />
        )}
        <div className={styles.meta}>
          <span className={styles.slotBadge}>{slotLabel}</span>
          <span className={styles.timestamp}>{formatRelativeTime(state.createdAt)}</span>
          <span className={styles.playtime}>{formatPlaytime(state.playtime)}</span>
        </div>
      </div>
      <div className={styles.cardActions}>
        {onLoad && (
          <button
            className={styles.loadBtn}
            onClick={() => onLoad(id)}
            aria-label={`Load slot ${slot}`}
            type="button"
          >
            Load
          </button>
        )}
        {onDelete && (
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(id)}
            aria-label={`Delete slot ${slot}`}
            type="button"
          >
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}
