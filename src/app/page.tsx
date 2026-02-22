'use client';

import { useCallback, useRef } from 'react';
import { PixelBackground } from '@/components/background/PixelBackground';
import { GameBoyShell } from '@/components/emulator/GameBoyShell';
import { useButtonState } from '@/hooks/useButtonState';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useShellScale } from '@/hooks/useShellScale';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useShellScale(containerRef);
  const { pressedButtons, press, release, releaseAll } = useButtonState();

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
      <div
        ref={containerRef}
        className="relative z-10 flex min-h-screen flex-col items-center justify-center"
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
