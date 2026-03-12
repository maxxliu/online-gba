'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DEFAULT_KEY_BINDINGS, DEFAULT_SHORTCUTS } from '@/lib/constants';
import { storage } from '@/lib/db';
import type { KeyBindings, Shortcuts, UserSettings } from '@/types';

const defaultKeyBindings: KeyBindings = DEFAULT_KEY_BINDINGS as unknown as KeyBindings;
const defaultShortcuts: Shortcuts = DEFAULT_SHORTCUTS as unknown as Shortcuts;

interface SettingsState {
  keyBindings: KeyBindings;
  shortcuts: Shortcuts;
  volume: number;
  scanlinesEnabled: boolean;
  backgroundAnimationEnabled: boolean;
  hydrated: boolean;

  setKeyBinding: (button: keyof KeyBindings, key: string) => void;
  setShortcut: (action: keyof Shortcuts, key: string) => void;
  setVolume: (v: number) => void;
  toggleScanlines: () => void;
  toggleBackgroundAnimation: () => void;
  resetAllBindings: () => void;
  hydrate: () => Promise<void>;
}

function persistSettings(state: SettingsState) {
  const settings: UserSettings = {
    keyBindings: state.keyBindings,
    shortcuts: state.shortcuts,
    volume: state.volume,
    scanlinesEnabled: state.scanlinesEnabled,
    backgroundAnimationEnabled: state.backgroundAnimationEnabled,
  };
  storage.setSetting('userSettings', settings).catch(() => {
    // Silently fail — settings will reload from defaults next session
  });
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      keyBindings: { ...defaultKeyBindings },
      shortcuts: { ...defaultShortcuts },
      volume: 100,
      scanlinesEnabled: false,
      backgroundAnimationEnabled: true,
      hydrated: false,

      setKeyBinding: (button, key) => {
        set((s) => ({
          keyBindings: { ...s.keyBindings, [button]: key },
        }));
        persistSettings(get());
      },

      setShortcut: (action, key) => {
        set((s) => ({
          shortcuts: { ...s.shortcuts, [action]: key },
        }));
        persistSettings(get());
      },

      setVolume: (v) => {
        const clamped = Math.max(0, Math.min(100, v));
        set({ volume: clamped });
        persistSettings(get());
      },

      toggleScanlines: () => {
        set((s) => ({ scanlinesEnabled: !s.scanlinesEnabled }));
        persistSettings(get());
      },

      toggleBackgroundAnimation: () => {
        set((s) => ({ backgroundAnimationEnabled: !s.backgroundAnimationEnabled }));
        persistSettings(get());
      },

      resetAllBindings: () => {
        set({
          keyBindings: { ...defaultKeyBindings },
          shortcuts: { ...defaultShortcuts },
        });
        persistSettings(get());
      },

      hydrate: async () => {
        try {
          const saved = await storage.getSetting<UserSettings>('userSettings');
          if (saved) {
            set({
              keyBindings: { ...defaultKeyBindings, ...saved.keyBindings },
              shortcuts: { ...defaultShortcuts, ...saved.shortcuts },
              volume: saved.volume ?? 100,
              scanlinesEnabled: saved.scanlinesEnabled ?? false,
              backgroundAnimationEnabled: saved.backgroundAnimationEnabled ?? true,
              hydrated: true,
            });
          } else {
            set({ hydrated: true });
          }
        } catch {
          set({ hydrated: true });
        }
      },
    }),
    { name: 'settings-store' },
  ),
);
