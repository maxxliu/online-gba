'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion';
import { useUiStore } from '@/stores/ui-store';
import { useEmulatorStore } from '@/stores/emulator-store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { TOTAL_SAVE_SLOTS } from '@/lib/constants';
import type { SaveStateMetadata } from '@/types';
import { SaveStateCard } from './SaveStateCard';
import styles from './SaveStateManager.module.css';

const DESKTOP_SPRING = { type: 'spring' as const, damping: 25, stiffness: 300 };
const MOBILE_SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 };

interface SaveStateManagerProps {
  states: SaveStateMetadata[];
  loading: boolean;
  onSave: (slot: number) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SaveStateManager({ states, loading, onSave, onLoad, onDelete }: SaveStateManagerProps) {
  const isOpen = useUiStore((s) => s.activePanel === 'saves');
  const closePanel = useUiStore((s) => s.closePanel);
  const currentRomName = useEmulatorStore((s) => s.currentRomName);
  const isPlaying = useEmulatorStore((s) => s.status === 'running' || s.status === 'paused');
  const { isMobile } = useMediaQuery();
  const dragControls = useDragControls();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmId) {
          setDeleteConfirmId(null);
        } else {
          closePanel();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closePanel, deleteConfirmId]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        closePanel();
      }
    },
    [closePanel],
  );

  const handleDelete = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, onDelete]);

  // Build slot map for rendering all 10 slots
  const stateBySlot = new Map<number, SaveStateMetadata>();
  for (const s of states) {
    stateBySlot.set(s.slot, s);
  }

  const panelContent = (
    <>
      {/* Header */}
      <div className={styles.header} onPointerDown={(e) => { if (isMobile) dragControls.start(e); }}>
        {isMobile && <div className={styles.dragHandle} />}
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title}>Save States</h2>
            {currentRomName && (
              <p className={styles.subtitle}>{currentRomName}</p>
            )}
          </div>
          <button
            className={styles.closeBtn}
            onClick={closePanel}
            aria-label="Close saves panel"
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
        {!isPlaying ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No game running</p>
            <p className={styles.emptyHint}>Load a ROM to manage save states.</p>
          </div>
        ) : loading ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Loading...</p>
          </div>
        ) : (
          <>
            {/* Save Now button for manual saves */}
            <button
              className={styles.saveNowBtn}
              onClick={() => {
                // Find first empty manual slot (3-9), fallback to slot 3
                let targetSlot = 3;
                for (let i = 3; i < TOTAL_SAVE_SLOTS; i++) {
                  if (!stateBySlot.has(i)) {
                    targetSlot = i;
                    break;
                  }
                }
                onSave(targetSlot);
              }}
              type="button"
            >
              Save Now
            </button>

            <div className={styles.grid}>
              <AnimatePresence mode="popLayout">
                {Array.from({ length: TOTAL_SAVE_SLOTS }, (_, slot) => (
                  <SaveStateCard
                    key={slot}
                    slot={slot}
                    state={stateBySlot.get(slot)}
                    onSave={onSave}
                    onLoad={onLoad}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            className={styles.confirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.confirmDialog}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <p className={styles.confirmText}>Delete this save state?</p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setDeleteConfirmId(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmDeleteBtn}
                  onClick={handleConfirmDelete}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
              aria-label="Save States"
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
              aria-label="Save States"
            >
              {panelContent}
            </motion.aside>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
