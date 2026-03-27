import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StorageProvider,
  IndexedDBProvider,
} from './db';
import type { SyncQueue } from './sync-queue';
import type {
  StoredRom,
  RomMetadata,
  SaveStateMetadata,
  PlaytimeRecord,
  SyncOperation,
} from '@/types';
import { compressScreenshot, blobToDataUrl } from './image-utils';

export class SyncProvider implements StorageProvider {
  private userId: string;
  private supabase: SupabaseClient;
  private localDb: IndexedDBProvider;
  private queue: SyncQueue;

  constructor(
    userId: string,
    supabase: SupabaseClient,
    localDb: IndexedDBProvider,
    queue: SyncQueue,
  ) {
    this.userId = userId;
    this.supabase = supabase;
    this.localDb = localDb;
    this.queue = queue;
  }

  // ── ROM Operations ──────────────────────────────

  async saveRom(rom: StoredRom): Promise<void> {
    await this.localDb.saveRom(rom);
    await this.queue.enqueue({
      type: 'upload-rom',
      dedupKey: `rom:${rom.id}`,
      romId: rom.id,
      timestamp: Date.now(),
    });
  }

  async getRom(id: string): Promise<StoredRom | null> {
    const local = await this.localDb.getRom(id);
    if (local && local.data.byteLength > 0) return local;

    // cloudOnly: download from Supabase Storage
    if (local) {
      const storagePath = `${this.userId}/${id}`;
      const { data, error } = await this.supabase.storage
        .from('rom-data')
        .download(storagePath);
      if (error || !data) return null;

      const arrayBuffer = await data.arrayBuffer();
      const fullRom: StoredRom = { ...local, data: arrayBuffer, cloudOnly: undefined };
      await this.localDb.saveRom(fullRom);
      return fullRom;
    }

    return null;
  }

  async listRoms(): Promise<RomMetadata[]> {
    return this.localDb.listRoms();
  }

  async deleteRom(id: string): Promise<void> {
    await this.localDb.deleteRom(id);
    await this.queue.enqueue({
      type: 'delete-rom',
      dedupKey: `rom:${id}`,
      romId: id,
      timestamp: Date.now(),
    });
  }

  async renameRom(id: string, name: string): Promise<void> {
    await this.localDb.renameRom(id, name);
    await this.queue.enqueue({
      type: 'update-rom-metadata',
      dedupKey: `rom-meta:${id}`,
      romId: id,
      timestamp: Date.now(),
    });
  }

  // ── Save State Operations ──────────────────────────

  async saveSaveState(
    romId: string,
    slot: number,
    data: ArrayBuffer,
    metadata: SaveStateMetadata,
  ): Promise<void> {
    await this.localDb.saveSaveState(romId, slot, data, metadata);
    await this.queue.enqueue({
      type: 'upload-save-state',
      dedupKey: `save:${romId}-slot-${slot}`,
      romId,
      slot,
      timestamp: Date.now(),
    });
  }

  async loadSaveState(romId: string, slot: number): Promise<ArrayBuffer | null> {
    const local = await this.localDb.loadSaveState(romId, slot);
    if (local && local.byteLength > 0) return local;

    // cloudOnly: download from Supabase Storage
    const storagePath = `${this.userId}/${romId}/slot-${slot}.ss`;
    const { data, error } = await this.supabase.storage
      .from('save-state-data')
      .download(storagePath);
    if (error || !data) return null;

    const arrayBuffer = await data.arrayBuffer();
    // Save locally for future access
    const metas = await this.localDb.listSaveStates(romId);
    const meta = metas.find((m) => m.slot === slot);
    if (meta) {
      // Download screenshot if not already present
      let { screenshotDataUrl } = meta;
      if (!screenshotDataUrl) {
        try {
          const screenshotPath = `${this.userId}/${romId}/slot-${slot}.jpg`;
          const { data: screenshotBlob } = await this.supabase.storage
            .from('save-state-data')
            .download(screenshotPath);
          if (screenshotBlob) {
            screenshotDataUrl = await blobToDataUrl(screenshotBlob);
          }
        } catch {
          // Best-effort — screenshot loss is non-critical
        }
      }
      await this.localDb.saveSaveState(romId, slot, arrayBuffer, {
        ...meta,
        screenshotDataUrl,
        cloudOnly: undefined,
      });
    }
    return arrayBuffer;
  }

  async listSaveStates(romId: string): Promise<SaveStateMetadata[]> {
    return this.localDb.listSaveStates(romId);
  }

  async deleteSaveState(romId: string, slot: number): Promise<void> {
    await this.localDb.deleteSaveState(romId, slot);
    await this.queue.enqueue({
      type: 'delete-save-state',
      dedupKey: `save:${romId}-slot-${slot}`,
      romId,
      slot,
      timestamp: Date.now(),
    });
  }

  // ── Settings ────────────────────────────────────

  async getSetting<T>(key: string): Promise<T | null> {
    return this.localDb.getSetting(key);
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.localDb.setSetting(key, value);
    await this.queue.enqueue({
      type: 'update-settings',
      dedupKey: 'settings',
      timestamp: Date.now(),
    });
  }

  // ── Playtime ────────────────────────────────────

  async getPlaytime(romId: string): Promise<PlaytimeRecord | null> {
    return this.localDb.getPlaytime(romId);
  }

  async updatePlaytime(record: PlaytimeRecord): Promise<void> {
    await this.localDb.updatePlaytime(record);
    await this.queue.enqueue({
      type: 'update-playtime',
      dedupKey: `playtime:${record.romId}`,
      romId: record.romId,
      timestamp: Date.now(),
    });
  }

  // ── Queue Processing ────────────────────────────

  async processOp(op: SyncOperation): Promise<void> {
    switch (op.type) {
      case 'upload-rom':
        return this.pushRom(op.romId!);
      case 'delete-rom':
        return this.pushDeleteRom(op.romId!);
      case 'update-rom-metadata':
        return this.pushRomMetadata(op.romId!);
      case 'upload-save-state':
        return this.pushSaveState(op.romId!, op.slot!);
      case 'delete-save-state':
        return this.pushDeleteSaveState(op.romId!, op.slot!);
      case 'update-settings':
        return this.pushSettings();
      case 'update-playtime':
        return this.pushPlaytime(op.romId!);
    }
  }

  private async pushRom(romId: string): Promise<void> {
    const rom = await this.localDb.getRom(romId);
    if (!rom || rom.data.byteLength === 0) return;

    // Upload binary to storage
    const storagePath = `${this.userId}/${romId}`;
    const { error: uploadErr } = await this.supabase.storage
      .from('rom-data')
      .upload(storagePath, rom.data, { upsert: true, contentType: 'application/octet-stream' });
    if (uploadErr) throw uploadErr;

    // Upsert metadata
    const { error } = await this.supabase.from('user_roms').upsert({
      rom_id: romId,
      user_id: this.userId,
      name: rom.name,
      filename: rom.filename,
      size: rom.size,
      added_at: rom.addedAt,
      last_played_at: rom.lastPlayedAt ?? null,
      storage_path: storagePath,
      updated_at: Date.now(),
    });
    if (error) throw error;
  }

  private async pushDeleteRom(romId: string): Promise<void> {
    // Delete binary from storage
    await this.supabase.storage.from('rom-data').remove([`${this.userId}/${romId}`]);
    // Delete save state files
    const { data: saveFiles } = await this.supabase.storage
      .from('save-state-data')
      .list(`${this.userId}/${romId}`);
    if (saveFiles?.length) {
      const paths = saveFiles.map((f) => `${this.userId}/${romId}/${f.name}`);
      await this.supabase.storage.from('save-state-data').remove(paths);
    }
    // Delete metadata (cascading saves + playtime handled by app-level logic)
    await this.supabase.from('user_save_states').delete().match({ user_id: this.userId, rom_id: romId });
    await this.supabase.from('user_playtime').delete().match({ user_id: this.userId, rom_id: romId });
    await this.supabase.from('user_roms').delete().match({ user_id: this.userId, rom_id: romId });
  }

  private async pushRomMetadata(romId: string): Promise<void> {
    const roms = await this.localDb.listRoms();
    const rom = roms.find((r) => r.id === romId);
    if (!rom) return;

    const { error } = await this.supabase.from('user_roms').upsert({
      rom_id: romId,
      user_id: this.userId,
      name: rom.name,
      filename: rom.filename,
      size: rom.size,
      added_at: rom.addedAt,
      last_played_at: rom.lastPlayedAt ?? null,
      storage_path: `${this.userId}/${romId}`,
      updated_at: Date.now(),
    });
    if (error) throw error;
  }

  private async pushSaveState(romId: string, slot: number): Promise<void> {
    const data = await this.localDb.loadSaveState(romId, slot);
    if (!data || data.byteLength === 0) return;

    const metas = await this.localDb.listSaveStates(romId);
    const meta = metas.find((m) => m.slot === slot);
    if (!meta) return;

    // Upload state binary
    const statePath = `${this.userId}/${romId}/slot-${slot}.ss`;
    const { error: stateErr } = await this.supabase.storage
      .from('save-state-data')
      .upload(statePath, data, { upsert: true, contentType: 'application/octet-stream' });
    if (stateErr) throw stateErr;

    // Upload compressed screenshot if available
    let screenshotPath: string | null = null;
    if (meta.screenshotDataUrl) {
      try {
        const blob = await compressScreenshot(meta.screenshotDataUrl);
        screenshotPath = `${this.userId}/${romId}/slot-${slot}.jpg`;
        await this.supabase.storage
          .from('save-state-data')
          .upload(screenshotPath, blob, { upsert: true, contentType: 'image/jpeg' });
      } catch {
        // Screenshot compression failed, skip it
      }
    }

    const id = `${romId}-slot-${slot}`;
    const { error } = await this.supabase.from('user_save_states').upsert({
      id,
      user_id: this.userId,
      rom_id: romId,
      slot,
      created_at: meta.createdAt,
      playtime: meta.playtime,
      screenshot_path: screenshotPath,
      storage_path: statePath,
      updated_at: Date.now(),
    });
    if (error) throw error;
  }

  private async pushDeleteSaveState(romId: string, slot: number): Promise<void> {
    const id = `${romId}-slot-${slot}`;
    await this.supabase.storage.from('save-state-data').remove([
      `${this.userId}/${romId}/slot-${slot}.ss`,
      `${this.userId}/${romId}/slot-${slot}.jpg`,
    ]);
    await this.supabase.from('user_save_states').delete().match({ user_id: this.userId, id });
  }

  private async pushSettings(): Promise<void> {
    const settings = await this.localDb.getSetting<Record<string, unknown>>('userSettings');
    if (!settings) return;

    const { error } = await this.supabase.from('user_settings').upsert({
      user_id: this.userId,
      settings,
      updated_at: Date.now(),
    });
    if (error) throw error;
  }

  private async pushPlaytime(romId: string): Promise<void> {
    const record = await this.localDb.getPlaytime(romId);
    if (!record) return;

    const { error } = await this.supabase.from('user_playtime').upsert({
      user_id: this.userId,
      rom_id: romId,
      seconds: record.seconds,
      last_played: record.lastPlayed,
      updated_at: Date.now(),
    });
    if (error) throw error;
  }

}
