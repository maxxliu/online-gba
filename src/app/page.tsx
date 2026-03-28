'use client';

import { useCallback, useEffect, useRef } from 'react';
import { PixelBackground } from '@/components/background/PixelBackground';
import { GameBoyShell } from '@/components/emulator/GameBoyShell';
import { ScreenPlaceholder } from '@/components/emulator/ScreenPlaceholder';
import { TouchControls } from '@/components/emulator/TouchControls';
import { MobileToolbar } from '@/components/emulator/MobileToolbar';
import { SpeedControl } from '@/components/emulator/SpeedControl';
import { RomLibrary } from '@/components/library/RomLibrary';
import { SaveStateManager } from '@/components/saves/SaveStateManager';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { ProfilePanel } from '@/components/profile/ProfilePanel';
import { SyncStatusIndicator } from '@/components/profile/SyncStatusIndicator';
import { useButtonState } from '@/hooks/useButtonState';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useEmulator } from '@/hooks/useEmulator';
import { useEmulatorShortcuts } from '@/hooks/useEmulatorShortcuts';
import { usePlaytime } from '@/hooks/usePlaytime';
import { useSaveStates } from '@/hooks/useSaveStates';
import { useShellScale } from '@/hooks/useShellScale';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useUiStore } from '@/stores/ui-store';
import { useEmulatorStore } from '@/stores/emulator-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useAuthStore } from '@/stores/auth-store';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const desktopScreenRef = useRef<HTMLDivElement>(null);
  const mobileScreenRef = useRef<HTMLDivElement>(null);

  const scale = useShellScale(containerRef);
  const { isMobile, isLandscape } = useMediaQuery();
  const togglePanel = useUiStore((s) => s.togglePanel);
  const closePanel = useUiStore((s) => s.closePanel);

  const emulatorStatus = useEmulatorStore((s) => s.status);
  const emulatorSpeed = useEmulatorStore((s) => s.speed);
  const emulatorError = useEmulatorStore((s) => s.error);
  const currentRomId = useEmulatorStore((s) => s.currentRomId);
  const activePanel = useUiStore((s) => s.activePanel);
  const isPlaying = emulatorStatus === 'running' || emulatorStatus === 'paused';

  const settingsKeyBindings = useSettingsStore((s) => s.keyBindings);
  const settingsShortcuts = useSettingsStore((s) => s.shortcuts);
  const settingsVolume = useSettingsStore((s) => s.volume);
  const scanlinesEnabled = useSettingsStore((s) => s.scanlinesEnabled);
  const backgroundAnimationEnabled = useSettingsStore((s) => s.backgroundAnimationEnabled);

  // Hydrate settings from IndexedDB on mount
  useEffect(() => {
    useSettingsStore.getState().hydrate();
  }, []);

  // Initialize auth (Supabase session restore + sync)
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  const emulator = useEmulator({ desktopScreenRef, mobileScreenRef, isMobile, isLandscape });
  const { getCurrentPlaytime } = usePlaytime();
  const saveStates = useSaveStates({
    saveStateToVfs: emulator.saveStateToVfs,
    loadStateFromData: emulator.loadStateFromData,
    getScreenshot: emulator.getScreenshot,
    getCurrentPlaytime,
  });

  // Load save states list when saves panel opens
  useEffect(() => {
    if (activePanel === 'saves' && currentRomId) {
      saveStates.loadList(currentRomId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, currentRomId]);

  // Sync volume from settings to emulator
  useEffect(() => {
    emulator.setVolume(settingsVolume);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsVolume]);

  const { pressedButtons, press, release, releaseAll } = useButtonState({
    onButtonPress: emulator.pressButton,
    onButtonRelease: emulator.releaseButton,
  });

  useKeyboardControls({ press, release, releaseAll, keyBindings: settingsKeyBindings as unknown as Record<string, string> });
  useEmulatorShortcuts({
    togglePause: emulator.togglePause,
    setSpeed: emulator.setSpeed,
    saveState: emulator.saveState,
    loadState: emulator.loadState,
    shortcuts: settingsShortcuts,
    enabled: isPlaying,
  });

  const handlePointerPress = useCallback(
    (name: string) => {
      emulator.resumeAudioContext();
      press(name, 'pointer');
    },
    [press, emulator],
  );

  const handlePointerRelease = useCallback(
    (name: string) => release(name, 'pointer'),
    [release],
  );

  const handlePlayRom = useCallback(
    (id: string) => {
      emulator.loadRom(id);
      closePanel();
    },
    [emulator, closePanel],
  );

  const scanlinesClass = scanlinesEnabled ? 'scanlines-enabled' : 'scanlines-disabled';

  return (
    <div className={scanlinesClass}>
      <PixelBackground animationEnabled={backgroundAnimationEnabled} />

      {/* ─── Mobile ─────────────────────────────────────── */}
      {isMobile && (
        <>
          {/* Landscape — always in DOM, hidden when portrait */}
          <div className="mobile-landscape-container" style={!isLandscape ? { display: 'none' } : undefined}>
            <div className="mobile-screen mobile-screen--landscape">
              <div className="mobile-screen-inner" ref={isLandscape ? mobileScreenRef : undefined}>
                {!isPlaying && <ScreenPlaceholder variant="mobile" error={emulatorError} />}
              </div>
            </div>
            <TouchControls
              layout="landscape"
              onButtonPress={handlePointerPress}
              onButtonRelease={handlePointerRelease}
              pressedButtons={pressedButtons}
            />
          </div>

          {/* Portrait — always in DOM, hidden when landscape */}
          <div className="mobile-portrait-container" style={isLandscape ? { display: 'none' } : undefined}>
            <div className="mobile-screen mobile-screen--portrait">
              <div className="mobile-screen-inner" ref={!isLandscape ? mobileScreenRef : undefined}>
                {!isPlaying && <ScreenPlaceholder variant="mobile" error={emulatorError} />}
              </div>
            </div>
            <div className="mobile-speed-bar">
              {isPlaying && (
                <SpeedControl currentSpeed={emulatorSpeed} onSpeedChange={emulator.setSpeed} />
              )}
            </div>
            <TouchControls
              layout="portrait"
              onButtonPress={handlePointerPress}
              onButtonRelease={handlePointerRelease}
              pressedButtons={pressedButtons}
            />
          </div>

          {/* MobileToolbar — portrait only (no refs, safe to conditionally render) */}
          {!isLandscape && (
            <MobileToolbar
              onLibraryPress={() => togglePanel('library')}
              onSavesPress={() => togglePanel('saves')}
              onSettingsPress={() => togglePanel('settings')}
              onProfilePress={() => togglePanel('profile')}
            />
          )}
        </>
      )}

      {/* ─── Desktop / Tablet ──────────────────────────── */}
      <div
        ref={containerRef}
        className="relative z-10 flex min-h-screen flex-col items-center justify-center"
        style={isMobile ? { display: 'none' } : undefined}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center', position: 'relative' }}>
          <GameBoyShell
            onButtonPress={handlePointerPress}
            onButtonRelease={handlePointerRelease}
            pressedButtons={pressedButtons}
            isPoweredOn={isPlaying}
            scanlinesEnabled={scanlinesEnabled}
          >
            <div ref={desktopScreenRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
              {!isPlaying && <ScreenPlaceholder error={emulatorError} />}
            </div>
          </GameBoyShell>
          {isPlaying && (
            <div style={{ position: 'absolute', top: 244, left: 0, right: 0, zIndex: 3 }}>
              <SpeedControl currentSpeed={emulatorSpeed} onSpeedChange={emulator.setSpeed} />
            </div>
          )}
        </div>
      </div>

      {/* ─── Desktop Library FAB ─────────────────────── */}
      <button
        className="library-fab font-pixel"
        onClick={() => togglePanel('library')}
        aria-label="Open library"
        type="button"
        style={isMobile ? { display: 'none' } : undefined}
      >
        Library
      </button>

      {/* ─── Desktop Saves FAB ──────────────────────── */}
      <button
        className="saves-fab font-pixel"
        onClick={() => togglePanel('saves')}
        aria-label="Open saves"
        type="button"
        style={isMobile ? { display: 'none' } : undefined}
      >
        Saves
      </button>

      {/* ─── Desktop Settings FAB ────────────────────── */}
      <button
        className="settings-fab"
        onClick={() => togglePanel('settings')}
        aria-label="Settings"
        type="button"
        style={isMobile ? { display: 'none' } : undefined}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M11.1 1.5l.7 2.1c.4.2.8.4 1.2.6l2.1-.5 1.5 1.5-.5 2.1c.3.4.5.8.6 1.2l2.1.7v2.1l-2.1.7c-.2.4-.4.8-.6 1.2l.5 2.1-1.5 1.5-2.1-.5c-.4.3-.8.5-1.2.6l-.7 2.1H8.9l-.7-2.1c-.4-.2-.8-.4-1.2-.6l-2.1.5-1.5-1.5.5-2.1c-.3-.4-.5-.8-.6-1.2L1.2 11V8.9l2.1-.7c.2-.4.4-.8.6-1.2l-.5-2.1L4.9 3.4l2.1.5c.4-.3.8-.5 1.2-.6l.7-2.1h2.2zM10 7a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
      </button>

      {/* ─── Desktop Profile FAB ──────────────────────── */}
      <button
        className="profile-fab"
        onClick={() => togglePanel('profile')}
        aria-label="Profile"
        type="button"
        style={isMobile ? { display: 'none' } : undefined}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
        </svg>
      </button>

      {/* ─── Desktop Sync Indicator ──────────────────── */}
      <div className="sync-indicator" style={isMobile ? { display: 'none' } : undefined}>
        <SyncStatusIndicator />
      </div>

      {/* ─── Library Panel ───────────────────────────── */}
      <RomLibrary onPlayRom={handlePlayRom} />

      {/* ─── Saves Panel ─────────────────────────────── */}
      <SaveStateManager
        states={saveStates.states}
        loading={saveStates.loading}
        onSave={saveStates.saveToSlot}
        onLoad={saveStates.loadFromSlot}
        onDelete={saveStates.deleteSlot}
      />

      {/* ─── Settings Panel ──────────────────────────── */}
      <SettingsPanel />

      {/* ─── Profile Panel ──────────────────────────── */}
      <ProfilePanel />
    </div>
  );
}
