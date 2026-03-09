'use client';

import { useCallback, useRef } from 'react';
import { PixelBackground } from '@/components/background/PixelBackground';
import { GameBoyShell } from '@/components/emulator/GameBoyShell';
import { ScreenPlaceholder } from '@/components/emulator/ScreenPlaceholder';
import { TouchControls } from '@/components/emulator/TouchControls';
import { MobileToolbar } from '@/components/emulator/MobileToolbar';
import { RomLibrary } from '@/components/library/RomLibrary';
import { useButtonState } from '@/hooks/useButtonState';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useEmulator } from '@/hooks/useEmulator';
import { useEmulatorShortcuts } from '@/hooks/useEmulatorShortcuts';
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
  const emulatorError = useEmulatorStore((s) => s.error);
  const isPlaying = emulatorStatus === 'running' || emulatorStatus === 'paused';

  const emulator = useEmulator({ desktopScreenRef, mobileScreenRef, isMobile });

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
            <div className="mobile-speed-bar" />
            <TouchControls
              layout="portrait"
              onButtonPress={handlePointerPress}
              onButtonRelease={handlePointerRelease}
              pressedButtons={pressedButtons}
            />
          </div>
          <MobileToolbar onLibraryPress={() => togglePanel('library')} />
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

      {/* ─── Library Panel ───────────────────────────── */}
      <RomLibrary onPlayRom={handlePlayRom} />
    </>
  );
}
