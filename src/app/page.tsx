'use client';

import { useCallback, useRef } from 'react';
import { PixelBackground } from '@/components/background/PixelBackground';
import { GameBoyShell } from '@/components/emulator/GameBoyShell';
import { ScreenPlaceholder } from '@/components/emulator/ScreenPlaceholder';
import { TouchControls } from '@/components/emulator/TouchControls';
import { MobileToolbar } from '@/components/emulator/MobileToolbar';
import { useButtonState } from '@/hooks/useButtonState';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useShellScale } from '@/hooks/useShellScale';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useShellScale(containerRef);
  const { pressedButtons, press, release, releaseAll } = useButtonState();
  const { isMobile, isLandscape } = useMediaQuery();

  useKeyboardControls({ press, release, releaseAll });

  const handlePointerPress = useCallback(
    (name: string) => press(name, 'pointer'),
    [press],
  );

  const handlePointerRelease = useCallback(
    (name: string) => release(name, 'pointer'),
    [release],
  );

  return (
    <>
      <PixelBackground />

      {/* ─── Mobile Landscape ──────────────────────────── */}
      {isMobile && isLandscape && (
        <div className="mobile-landscape-container">
          <div className="mobile-screen mobile-screen--landscape">
            <div className="mobile-screen-inner">
              <ScreenPlaceholder variant="mobile" />
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
              <div className="mobile-screen-inner">
                <ScreenPlaceholder variant="mobile" />
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
          <MobileToolbar />
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
          />
        </div>
      </div>
    </>
  );
}
