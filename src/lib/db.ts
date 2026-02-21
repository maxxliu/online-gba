export interface StorageProvider {
  saveRom(id: string, data: ArrayBuffer, metadata: RomMetadata): Promise<void>;
  getRom(id: string): Promise<ArrayBuffer | null>;
  listRoms(): Promise<RomMetadata[]>;
  deleteRom(id: string): Promise<void>;
  saveSaveState(romId: string, slot: number, data: ArrayBuffer, metadata: SaveStateMetadata): Promise<void>;
  loadSaveState(romId: string, slot: number): Promise<ArrayBuffer | null>;
  listSaveStates(romId: string): Promise<SaveStateMetadata[]>;
  deleteSaveState(romId: string, slot: number): Promise<void>;
}

export interface RomMetadata {
  id: string;
  name: string;
  size: number;
  addedAt: number;
  lastPlayedAt?: number;
}

export interface SaveStateMetadata {
  romId: string;
  slot: number;
  createdAt: number;
  playtime: number;
  screenshotDataUrl?: string;
}
