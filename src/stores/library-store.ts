'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { storage, hashRomData } from '@/lib/db';
import type { RomMetadata, UploadProgress } from '@/types';

const VALID_EXTENSIONS = ['.gba', '.gbc', '.gb'];
const MAX_ROM_SIZE = 32 * 1024 * 1024; // 32 MB

interface LibraryState {
  roms: RomMetadata[];
  loaded: boolean;
  searchQuery: string;
  upload: UploadProgress;

  loadRoms: () => Promise<void>;
  uploadRom: (file: File) => Promise<string | null>;
  deleteRom: (id: string) => Promise<void>;
  renameRom: (id: string, newName: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  getFilteredRoms: () => RomMetadata[];
}

function sortRoms(roms: RomMetadata[]): RomMetadata[] {
  return [...roms].sort((a, b) => {
    // Last played first, then newest added
    if (a.lastPlayedAt && b.lastPlayedAt)
      return b.lastPlayedAt - a.lastPlayedAt;
    if (a.lastPlayedAt) return -1;
    if (b.lastPlayedAt) return 1;
    return b.addedAt - a.addedAt;
  });
}

export const useLibraryStore = create<LibraryState>()(
  devtools(
    (set, get) => ({
      roms: [],
      loaded: false,
      searchQuery: '',
      upload: { status: 'idle' },

      loadRoms: async () => {
        const roms = await storage.listRoms();
        set({ roms: sortRoms(roms), loaded: true });
      },

      uploadRom: async (file: File) => {
        const ext = file.name
          .substring(file.name.lastIndexOf('.'))
          .toLowerCase();
        if (!VALID_EXTENSIONS.includes(ext)) {
          set({
            upload: {
              status: 'error',
              filename: file.name,
              error: `Invalid file type. Accepted: ${VALID_EXTENSIONS.join(', ')}`,
            },
          });
          return null;
        }

        if (file.size > MAX_ROM_SIZE) {
          set({
            upload: {
              status: 'error',
              filename: file.name,
              error: 'File too large. Maximum size is 32 MB.',
            },
          });
          return null;
        }

        try {
          // Reading
          set({ upload: { status: 'reading', filename: file.name } });
          const data = await file.arrayBuffer();

          // Hashing
          set({ upload: { status: 'hashing', filename: file.name } });
          const id = await hashRomData(data);

          // Check duplicate
          const existing = get().roms.find((r) => r.id === id);
          if (existing) {
            set({ upload: { status: 'done', filename: file.name } });
            setTimeout(() => set({ upload: { status: 'idle' } }), 2000);
            return id;
          }

          // Storing
          set({ upload: { status: 'storing', filename: file.name } });
          const name = file.name.replace(/\.[^.]+$/, '');
          const rom = {
            id,
            name,
            filename: file.name,
            size: file.size,
            addedAt: Date.now(),
            data,
          };
          await storage.saveRom(rom);

          // Refresh list
          const roms = await storage.listRoms();
          set({
            roms: sortRoms(roms),
            upload: { status: 'done', filename: file.name },
          });

          setTimeout(() => set({ upload: { status: 'idle' } }), 2000);
          return id;
        } catch (e) {
          set({
            upload: {
              status: 'error',
              filename: file.name,
              error:
                e instanceof Error ? e.message : 'Failed to upload ROM.',
            },
          });
          return null;
        }
      },

      deleteRom: async (id: string) => {
        // Optimistic removal
        set({ roms: get().roms.filter((r) => r.id !== id) });
        await storage.deleteRom(id);
      },

      renameRom: async (id: string, newName: string) => {
        // Optimistic update
        set({
          roms: get().roms.map((r) =>
            r.id === id ? { ...r, name: newName } : r,
          ),
        });
        await storage.renameRom(id, newName);
      },

      setSearchQuery: (query: string) => set({ searchQuery: query }),

      getFilteredRoms: () => {
        const { roms, searchQuery } = get();
        if (!searchQuery.trim()) return roms;
        const q = searchQuery.toLowerCase();
        return roms.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.filename.toLowerCase().includes(q),
        );
      },
    }),
    { name: 'library-store' },
  ),
);
