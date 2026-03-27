'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type PanelType = 'library' | 'saves' | 'settings' | 'profile';

interface DeleteConfirm {
  romId: string;
  romName: string;
}

interface UiState {
  activePanel: PanelType | null;
  deleteConfirm: DeleteConfirm | null;

  openPanel: (panel: PanelType) => void;
  closePanel: () => void;
  togglePanel: (panel: PanelType) => void;
  showDeleteConfirm: (romId: string, romName: string) => void;
  hideDeleteConfirm: () => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    (set, get) => ({
      activePanel: null,
      deleteConfirm: null,

      openPanel: (panel) => set({ activePanel: panel }),
      closePanel: () => set({ activePanel: null }),
      togglePanel: (panel) => {
        const current = get().activePanel;
        set({ activePanel: current === panel ? null : panel });
      },

      showDeleteConfirm: (romId, romName) =>
        set({ deleteConfirm: { romId, romName } }),
      hideDeleteConfirm: () => set({ deleteConfirm: null }),
    }),
    { name: 'ui-store' },
  ),
);
