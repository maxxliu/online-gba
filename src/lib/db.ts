import { openDB, type IDBPDatabase } from 'idb';
import type {
  RomMetadata,
  StoredRom,
  SaveStateMetadata,
  PlaytimeRecord,
} from '@/types';

// ─── Storage Interface ──────────────────────────

export interface StorageProvider {
  // ROM operations
  saveRom(rom: StoredRom): Promise<void>;
  getRom(id: string): Promise<StoredRom | null>;
  listRoms(): Promise<RomMetadata[]>;
  deleteRom(id: string): Promise<void>;

  // Save state operations (stubs for now)
  saveSaveState(
    romId: string,
    slot: number,
    data: ArrayBuffer,
    metadata: SaveStateMetadata,
  ): Promise<void>;
  loadSaveState(romId: string, slot: number): Promise<ArrayBuffer | null>;
  listSaveStates(romId: string): Promise<SaveStateMetadata[]>;
  deleteSaveState(romId: string, slot: number): Promise<void>;

  // Settings
  getSetting<T>(key: string): Promise<T | null>;
  setSetting<T>(key: string, value: T): Promise<void>;

  // Playtime
  getPlaytime(romId: string): Promise<PlaytimeRecord | null>;
  updatePlaytime(record: PlaytimeRecord): Promise<void>;
}

// ─── Content-Addressed Hashing ──────────────────

export async function hashRomData(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── IndexedDB Implementation ───────────────────

const DB_NAME = 'retroplay';
const DB_VERSION = 1;

interface RetroPlayDB {
  roms: {
    key: string;
    value: StoredRom;
  };
  saveStates: {
    key: string;
    value: SaveStateMetadata & { data: ArrayBuffer };
    indexes: { 'by-romId': string };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
  playtime: {
    key: string;
    value: PlaytimeRecord;
  };
}

class IndexedDBProvider implements StorageProvider {
  private dbPromise: Promise<IDBPDatabase<RetroPlayDB>> | null = null;

  private getDB(): Promise<IDBPDatabase<RetroPlayDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<RetroPlayDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('roms')) {
            db.createObjectStore('roms', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('saveStates')) {
            const store = db.createObjectStore('saveStates', {
              keyPath: 'id',
            });
            store.createIndex('by-romId', 'romId');
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('playtime')) {
            db.createObjectStore('playtime', { keyPath: 'romId' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  // ── ROM Operations ──────────────────────────────

  async saveRom(rom: StoredRom): Promise<void> {
    const db = await this.getDB();
    await db.put('roms', rom);
  }

  async getRom(id: string): Promise<StoredRom | null> {
    const db = await this.getDB();
    return (await db.get('roms', id)) ?? null;
  }

  async listRoms(): Promise<RomMetadata[]> {
    const db = await this.getDB();
    const tx = db.transaction('roms', 'readonly');
    const store = tx.objectStore('roms');
    const roms: RomMetadata[] = [];

    let cursor = await store.openCursor();
    while (cursor) {
      const { id, name, filename, size, addedAt, lastPlayedAt } = cursor.value;
      roms.push({ id, name, filename, size, addedAt, lastPlayedAt });
      cursor = await cursor.continue();
    }

    return roms;
  }

  async deleteRom(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['roms', 'saveStates', 'playtime'], 'readwrite');

    // Delete ROM
    await tx.objectStore('roms').delete(id);

    // Cascade: delete associated save states
    const saveIndex = tx.objectStore('saveStates').index('by-romId');
    let cursor = await saveIndex.openCursor(id);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Cascade: delete playtime record
    await tx.objectStore('playtime').delete(id);

    await tx.done;
  }

  // ── Save State Operations (stubs) ───────────────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveSaveState(romId: string, slot: number, data: ArrayBuffer, metadata: SaveStateMetadata): Promise<void> {
    // Stub — will be implemented when save states feature is built
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async loadSaveState(romId: string, slot: number): Promise<ArrayBuffer | null> {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listSaveStates(romId: string): Promise<SaveStateMetadata[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteSaveState(romId: string, slot: number): Promise<void> {
    // Stub
  }

  // ── Settings ────────────────────────────────────

  async getSetting<T>(key: string): Promise<T | null> {
    const db = await this.getDB();
    const entry = await db.get('settings', key);
    return (entry?.value as T) ?? null;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    await db.put('settings', { key, value });
  }

  // ── Playtime ────────────────────────────────────

  async getPlaytime(romId: string): Promise<PlaytimeRecord | null> {
    const db = await this.getDB();
    return (await db.get('playtime', romId)) ?? null;
  }

  async updatePlaytime(record: PlaytimeRecord): Promise<void> {
    const db = await this.getDB();
    await db.put('playtime', record);
  }
}

export const storage: StorageProvider = new IndexedDBProvider();
