'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useUiStore } from '@/stores/ui-store';
import { useLibraryStore } from '@/stores/library-store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { UploadRom } from './UploadRom';
import { RomCard } from './RomCard';
import styles from './RomLibrary.module.css';

const DESKTOP_SPRING = { type: 'spring' as const, damping: 25, stiffness: 300 };
const MOBILE_SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 };

interface RomLibraryProps {
  onPlayRom?: (id: string) => void;
}

export function RomLibrary({ onPlayRom }: RomLibraryProps) {
  const isOpen = useUiStore((s) => s.activePanel === 'library');
  const closePanel = useUiStore((s) => s.closePanel);
  const deleteConfirm = useUiStore((s) => s.deleteConfirm);
  const showDeleteConfirm = useUiStore((s) => s.showDeleteConfirm);
  const hideDeleteConfirm = useUiStore((s) => s.hideDeleteConfirm);

  const allRoms = useLibraryStore((s) => s.roms);
  const loaded = useLibraryStore((s) => s.loaded);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const loadRoms = useLibraryStore((s) => s.loadRoms);
  const deleteRom = useLibraryStore((s) => s.deleteRom);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);

  const roms = useMemo(() => {
    if (!searchQuery.trim()) return allRoms;
    const q = searchQuery.toLowerCase();
    return allRoms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.filename.toLowerCase().includes(q),
    );
  }, [allRoms, searchQuery]);

  const { isMobile } = useMediaQuery();
  const searchRef = useRef<HTMLInputElement>(null);

  // Load ROMs on first open
  useEffect(() => {
    if (isOpen && !loaded) {
      loadRoms();
    }
  }, [isOpen, loaded, loadRoms]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirm) {
          hideDeleteConfirm();
        } else {
          closePanel();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closePanel, deleteConfirm, hideDeleteConfirm]);

  const handlePlay = useCallback((id: string) => {
    onPlayRom?.(id);
  }, [onPlayRom]);

  const handleRequestDelete = useCallback(
    (id: string, name: string) => {
      showDeleteConfirm(id, name);
    },
    [showDeleteConfirm],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirm) {
      deleteRom(deleteConfirm.romId);
      hideDeleteConfirm();
    }
  }, [deleteConfirm, deleteRom, hideDeleteConfirm]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        closePanel();
      }
    },
    [closePanel],
  );

  const panelContent = (
    <>
      {/* Header */}
      <div className={styles.header}>
        {isMobile && <div className={styles.dragHandle} />}
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Library</h2>
          <button
            className={styles.closeBtn}
            onClick={closePanel}
            aria-label="Close library"
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

      {/* Search */}
      <div className={styles.search}>
        <svg
          className={styles.searchIcon}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          className={styles.searchInput}
          type="text"
          placeholder="Search ROMs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search ROMs"
        />
      </div>

      {/* Upload Zone */}
      <div className={styles.section}>
        <UploadRom />
      </div>

      {/* ROM Grid */}
      <div className={styles.section}>
        {loaded && roms.length === 0 && !searchQuery && (
          <div className={styles.empty}>
            <svg
              className={styles.emptyIcon}
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="6"
                y="12"
                width="36"
                height="24"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect x="18" y="16" width="12" height="8" rx="1" fill="currentColor" opacity="0.2" />
              <circle cx="32" cy="28" r="3" fill="currentColor" opacity="0.2" />
            </svg>
            <p className={styles.emptyTitle}>No ROMs yet</p>
            <p className={styles.emptyHint}>
              Drop a .gba file above to get started.
              <br />
              Your ROMs never leave this device.
            </p>
          </div>
        )}

        {loaded && roms.length === 0 && searchQuery && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No matches</p>
            <p className={styles.emptyHint}>
              No ROMs match &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}

        {roms.length > 0 && (
          <div className={styles.grid}>
            <AnimatePresence mode="popLayout">
              {roms.map((rom) => (
                <RomCard
                  key={rom.id}
                  rom={rom}
                  onPlay={handlePlay}
                  onDelete={handleRequestDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
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
              <p className={styles.confirmText}>
                Delete <strong>{deleteConfirm.romName}</strong>?
              </p>
              <p className={styles.confirmHint}>
                This will also remove any save states.
              </p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={hideDeleteConfirm}
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
              onDragEnd={handleDragEnd}
              role="dialog"
              aria-label="ROM Library"
            >
              {panelContent}
            </motion.aside>
          ) : (
            <motion.aside
              className={styles.panelDesktop}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={DESKTOP_SPRING}
              role="dialog"
              aria-label="ROM Library"
            >
              {panelContent}
            </motion.aside>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
