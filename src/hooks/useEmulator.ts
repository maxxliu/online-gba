'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEmulatorStore } from '@/stores/emulator-store';
import { useLibraryStore } from '@/stores/library-store';
import { storage } from '@/lib/db';
import { loadMgbaModule, volumeToMultiplier } from '@/lib/emulator-bridge';
import { GBA_SCREEN_WIDTH, GBA_SCREEN_HEIGHT, SPEED_OPTIONS } from '@/lib/constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports
type MgbaModule = import('@thenick775/mgba-wasm').mGBAEmulator;

interface UseEmulatorOptions {
  desktopScreenRef: React.RefObject<HTMLDivElement | null>;
  mobileScreenRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  isLandscape: boolean;
}

export function useEmulator({ desktopScreenRef, mobileScreenRef, isMobile, isLandscape }: UseEmulatorOptions) {
  const moduleRef = useRef<MgbaModule | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const wasRunningBeforeHideRef = useRef(false);

  const setStatus = useEmulatorStore((s) => s.setStatus);
  const setCurrentRom = useEmulatorStore((s) => s.setCurrentRom);
  const setError = useEmulatorStore((s) => s.setError);
  const setStoreSpeed = useEmulatorStore((s) => s.setSpeed);
  const setStoreVolume = useEmulatorStore((s) => s.setVolume);
  const reset = useEmulatorStore((s) => s.reset);
  const loadRoms = useLibraryStore((s) => s.loadRoms);

  // Create canvas element once and manage its container placement
  useEffect(() => {
    if (canvasRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = GBA_SCREEN_WIDTH;
    canvas.height = GBA_SCREEN_HEIGHT;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
    canvas.setAttribute('aria-label', 'Game screen');

    // Monkey-patch getContext to inject preserveDrawingBuffer for WebGL screenshots.
    // Without this, mGBA's WebGL2 context clears the buffer after compositing,
    // causing canvas.toDataURL() to return a black image.
    const originalGetContext = canvas.getContext.bind(canvas);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (canvas as any).getContext = function (type: string, attrs?: any) {
      if (type === 'webgl2' || type === 'webgl') {
        return originalGetContext(type, { ...attrs, preserveDrawingBuffer: true });
      }
      return originalGetContext(type, attrs);
    };

    canvasRef.current = canvas;
  }, []);

  // Move canvas to the active screen container when layout changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const target = isMobile ? mobileScreenRef.current : desktopScreenRef.current;
    if (target && canvas.parentElement !== target) {
      target.appendChild(canvas);
    }
  }, [isMobile, isLandscape, desktopScreenRef, mobileScreenRef]);

  // Initialize mGBA module
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || initPromiseRef.current) return;

    initPromiseRef.current = (async () => {
      try {
        setStatus('initializing');
        const mGBA = await loadMgbaModule();
        const Module = await mGBA({ canvas });
        await Module.FSInit();
        Module.toggleInput(false); // We handle keyboard ourselves
        Module.addCoreCallbacks({
          coreCrashedCallback: () => {
            setError('Emulator core crashed');
          },
        });
        moduleRef.current = Module;
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to initialize emulator');
        initPromiseRef.current = null;
      }
    })();

    return () => {
      const mod = moduleRef.current;
      if (mod) {
        try {
          mod.pauseGame();
          mod.quitGame();
        } catch {
          // Ignore cleanup errors
        }
        moduleRef.current = null;
      }
    };
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visibility change: auto-pause/resume
  useEffect(() => {
    function handleVisibility() {
      const mod = moduleRef.current;
      if (!mod) return;

      const status = useEmulatorStore.getState().status;
      if (document.hidden) {
        if (status === 'running') {
          wasRunningBeforeHideRef.current = true;
          mod.pauseGame();
          setStatus('paused');
        }
      } else {
        if (wasRunningBeforeHideRef.current) {
          wasRunningBeforeHideRef.current = false;
          mod.resumeGame();
          setStatus('running');
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [setStatus]);

  const resumeAudioContext = useCallback(() => {
    const mod = moduleRef.current;
    if (mod?.SDL2?.audioContext?.state === 'suspended') {
      mod.SDL2.audioContext.resume();
    }
  }, []);

  const loadRom = useCallback(async (romId: string) => {
    const mod = moduleRef.current;
    if (!mod) return;

    try {
      // Quit current game if any
      const currentStatus = useEmulatorStore.getState().status;
      if (currentStatus === 'running' || currentStatus === 'paused') {
        mod.pauseGame();
        mod.quitGame();
      }

      // Fetch ROM from IndexedDB
      const rom = await storage.getRom(romId);
      if (!rom) {
        setError('ROM not found in storage');
        return;
      }

      // Write ROM to mGBA's virtual filesystem
      const paths = mod.filePaths();
      const romPath = `${paths.gamePath}/${rom.filename}`;
      mod.FS.writeFile(romPath, new Uint8Array(rom.data));

      // Load and start the game
      const success = mod.loadGame(romPath);
      if (!success) {
        setError('Failed to load ROM');
        return;
      }

      // Resume audio context (must happen after user interaction)
      resumeAudioContext();

      // Apply current store settings
      const state = useEmulatorStore.getState();
      mod.setVolume(volumeToMultiplier(state.volume));
      if (state.speed > 1) {
        mod.setFastForwardMultiplier(state.speed);
      }

      // Update store
      setCurrentRom(romId, rom.name);
      setStatus('running');

      // Update lastPlayedAt in IndexedDB and refresh library
      const updated = { ...rom, lastPlayedAt: Date.now() };
      delete (updated as Record<string, unknown>).data;
      await storage.saveRom({ ...rom, lastPlayedAt: Date.now() });
      loadRoms();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ROM');
    }
  }, [setStatus, setCurrentRom, setError, resumeAudioContext, loadRoms]);

  const quitGame = useCallback(() => {
    const mod = moduleRef.current;
    if (!mod) return;

    try {
      mod.pauseGame();
      mod.quitGame();
    } catch {
      // Ignore quit errors
    }
    reset();
  }, [reset]);

  const pause = useCallback(() => {
    const mod = moduleRef.current;
    if (!mod) return;
    mod.pauseGame();
    setStatus('paused');
  }, [setStatus]);

  const resume = useCallback(() => {
    const mod = moduleRef.current;
    if (!mod) return;
    resumeAudioContext();
    mod.resumeGame();
    setStatus('running');
  }, [setStatus, resumeAudioContext]);

  const togglePause = useCallback(() => {
    const status = useEmulatorStore.getState().status;
    if (status === 'running') {
      pause();
    } else if (status === 'paused') {
      resume();
    }
  }, [pause, resume]);

  const setSpeed = useCallback((n: number) => {
    const mod = moduleRef.current;
    if (!mod) return;
    mod.setFastForwardMultiplier(n);
    setStoreSpeed(n);
  }, [setStoreSpeed]);

  const cycleSpeed = useCallback(() => {
    const current = useEmulatorStore.getState().speed;
    const idx = SPEED_OPTIONS.indexOf(current as typeof SPEED_OPTIONS[number]);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
  }, [setSpeed]);

  const setVolume = useCallback((percent: number) => {
    const mod = moduleRef.current;
    if (!mod) return;
    mod.setVolume(volumeToMultiplier(percent));
    setStoreVolume(percent);
  }, [setStoreVolume]);

  const saveState = useCallback((slot: number) => {
    const mod = moduleRef.current;
    if (!mod) return false;
    const success = mod.saveState(slot);
    if (success) {
      mod.FSSync();
    }
    return success;
  }, []);

  const loadState = useCallback((slot: number) => {
    const mod = moduleRef.current;
    if (!mod) return false;
    return mod.loadState(slot);
  }, []);

  const saveStateToVfs = useCallback((slot: number): ArrayBuffer | null => {
    const mod = moduleRef.current;
    if (!mod) return null;
    const success = mod.saveState(slot);
    if (!success) return null;
    try {
      // Derive state file path from gameName
      const gameName: string = (mod as unknown as Record<string, unknown>).gameName as string ?? '';
      const basename = gameName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
      const statePath = `/data/states/${basename}.ss${slot}`;
      const data = mod.FS.readFile(statePath);
      // Copy to new ArrayBuffer to avoid referencing shared WASM memory
      return new Uint8Array(data).buffer.slice(0);
    } catch {
      return null;
    }
  }, []);

  const loadStateFromData = useCallback((slot: number, data: ArrayBuffer): boolean => {
    const mod = moduleRef.current;
    if (!mod) return false;
    try {
      const gameName: string = (mod as unknown as Record<string, unknown>).gameName as string ?? '';
      const basename = gameName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
      const statePath = `/data/states/${basename}.ss${slot}`;
      mod.FS.writeFile(statePath, new Uint8Array(data));
      return mod.loadState(slot);
    } catch {
      return false;
    }
  }, []);

  const getScreenshot = useCallback((): string | null => {
    return canvasRef.current?.toDataURL('image/png') ?? null;
  }, []);

  const pressButton = useCallback((name: string) => {
    const mod = moduleRef.current;
    if (!mod) return;
    mod.buttonPress(name);
  }, []);

  const releaseButton = useCallback((name: string) => {
    const mod = moduleRef.current;
    if (!mod) return;
    mod.buttonUnpress(name);
  }, []);

  return {
    loadRom,
    quitGame,
    pause,
    resume,
    togglePause,
    setSpeed,
    cycleSpeed,
    setVolume,
    saveState,
    loadState,
    saveStateToVfs,
    loadStateFromData,
    getScreenshot,
    pressButton,
    releaseButton,
    resumeAudioContext,
  };
}
