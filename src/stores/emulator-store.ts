'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { EmulatorStatus } from '@/types';

interface EmulatorState {
  status: EmulatorStatus;
  currentRomId: string | null;
  currentRomName: string | null;
  speed: number;
  volume: number;
  error: string | null;

  setStatus: (status: EmulatorStatus) => void;
  setCurrentRom: (id: string | null, name: string | null) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  status: 'idle' as EmulatorStatus,
  currentRomId: null,
  currentRomName: null,
  speed: 1,
  volume: 100,
  error: null,
};

export const useEmulatorStore = create<EmulatorState>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,

      setStatus: (status) => set({ status, error: status === 'error' ? undefined : null }),
      setCurrentRom: (id, name) => set({ currentRomId: id, currentRomName: name }),
      setSpeed: (speed) => set({ speed }),
      setVolume: (volume) => set({ volume }),
      setError: (error) => set({ error, status: 'error' }),
      reset: () => set(INITIAL_STATE),
    }),
    { name: 'emulator-store' },
  ),
);
