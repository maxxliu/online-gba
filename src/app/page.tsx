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

  const emulator = useEmulator({ desktopScreenRef, mobileScreenRef, isMobile });
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

  const { pressedButtons, press, release, releaseAll } = useButtonState({
    onButtonPress: emulator.pressButton,
    onButtonRelease: emulator.releaseButton,
  });

  useKeyboardControls({ press, release, releaseAll });
  useEmulatorShortcuts({
    togglePause: emulator.togglePause,
    setSpeed: emulator.setSpeed,
    saveState: emulator.saveState,
    loadState: emulator.loadState,
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

  return (
    <>
      <PixelBackground />

      {/* ─── Mobile Landscape ──────────────────────────── */}
      {isMobile && isLandscape && (
        <div className="mobile-landscape-container">
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
      )}

      {/* ─── Mobile Portrait ───────────────────────────── */}
      {isMobile && !isLandscape && (
        <>
          <div className="mobile-portrait-container">
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
          <MobileToolbar
            onLibraryPress={() => togglePanel('library')}
            onSavesPress={() => togglePanel('saves')}
          />
        </>
      )}

      {/* ─── Desktop / Tablet ──────────────────────────── */}
      <div
        ref={containerRef}
        className="relative z-10 flex min-h-screen flex-col items-center justify-center"
        style={isMobile ? { display: 'none' } : undefined}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          <GameBoyShell
            onButtonPress={handlePointerPress}
            onButtonRelease={handlePointerRelease}
            pressedButtons={pressedButtons}
            isPoweredOn={isPlaying}
          >
            <div ref={desktopScreenRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
              {!isPlaying && <ScreenPlaceholder error={emulatorError} />}
            </div>
          </GameBoyShell>
        </div>
        {isPlaying && (
          <div style={{ marginTop: 12 }}>
            <SpeedControl currentSpeed={emulatorSpeed} onSpeedChange={emulator.setSpeed} />
          </div>
        )}
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
    </>
  );
}
