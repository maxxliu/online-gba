'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion';
import { useUiStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useFullscreen } from '@/hooks/useFullscreen';
import { KeyBindingEditor } from './KeyBindingEditor';
import styles from './SettingsPanel.module.css';

const DESKTOP_SPRING = { type: 'spring' as const, damping: 25, stiffness: 300 };
const MOBILE_SPRING = { type: 'spring' as const, damping: 30, stiffness: 300 };

export function SettingsPanel() {
  const isOpen = useUiStore((s) => s.activePanel === 'settings');
  const closePanel = useUiStore((s) => s.closePanel);
  const { isMobile } = useMediaQuery();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const dragControls = useDragControls();

  const volume = useSettingsStore((s) => s.volume);
  const scanlinesEnabled = useSettingsStore((s) => s.scanlinesEnabled);
  const backgroundAnimationEnabled = useSettingsStore((s) => s.backgroundAnimationEnabled);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const controlOpacity = useSettingsStore((s) => s.controlOpacity);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const toggleScanlines = useSettingsStore((s) => s.toggleScanlines);
  const toggleBackgroundAnimation = useSettingsStore((s) => s.toggleBackgroundAnimation);
  const toggleHaptic = useSettingsStore((s) => s.toggleHaptic);
  const setControlOpacity = useSettingsStore((s) => s.setControlOpacity);

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

  const panelContent = (
    <>
      {/* Header */}
      <div className={styles.header} onPointerDown={(e) => { if (isMobile) dragControls.start(e); }}>
        {isMobile && <div className={styles.dragHandle} />}
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Settings</h2>
          <button
            className={styles.closeBtn}
            onClick={closePanel}
            aria-label="Close settings panel"
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
        {/* Audio Section */}
        <h3 className={styles.sectionHeader}>Audio</h3>
        <div className={styles.volumeRow}>
          <span className={styles.volumeLabel}>Volume</span>
          <input
            className={styles.volumeSlider}
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
          <span className={styles.volumeValue}>{volume}%</span>
        </div>

        {/* Display Section */}
        <h3 className={styles.sectionHeader}>Display</h3>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Scanlines</span>
          <button
            className={styles.toggle}
            data-checked={scanlinesEnabled}
            onClick={toggleScanlines}
            aria-label="Toggle scanlines"
            type="button"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Background Animation</span>
          <button
            className={styles.toggle}
            data-checked={backgroundAnimationEnabled}
            onClick={toggleBackgroundAnimation}
            aria-label="Toggle background animation"
            type="button"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>

        {/* Touch Controls Section — mobile only */}
        {isMobile && (
          <>
            <h3 className={styles.sectionHeader}>Touch Controls</h3>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Haptic Feedback</span>
              <button
                className={styles.toggle}
                data-checked={hapticEnabled}
                onClick={toggleHaptic}
                aria-label="Toggle haptic feedback"
                type="button"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
            <div className={styles.volumeRow}>
              <span className={styles.volumeLabel}>Control Opacity</span>
              <input
                className={styles.volumeSlider}
                type="range"
                min={30}
                max={100}
                value={Math.round(controlOpacity * 100)}
                onChange={(e) => setControlOpacity(Number(e.target.value) / 100)}
                aria-label="Control opacity"
              />
              <span className={styles.volumeValue}>{Math.round(controlOpacity * 100)}%</span>
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Fullscreen</span>
              <button
                className={styles.toggle}
                data-checked={isFullscreen}
                onClick={toggleFullscreen}
                aria-label="Toggle fullscreen"
                type="button"
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </>
        )}

        {/* Keyboard Controls Section — desktop only */}
        {!isMobile && (
          <>
            <h3 className={styles.sectionHeader}>Controls</h3>
            <KeyBindingEditor />
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
              aria-label="Settings"
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
              aria-label="Settings"
            >
              {panelContent}
            </motion.aside>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
