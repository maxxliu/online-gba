import type { SupabaseClient } from '@supabase/supabase-js';
import type { RomMetadata, SaveStateMetadata } from '@/types';
import type { IndexedDBProvider } from './db';
import type { SyncQueue } from './sync-queue';
import { blobToDataUrl } from './image-utils';

interface CloudRom {
  rom_id: string;
  name: string;
  filename: string;
  size: number;
  added_at: number;
  last_played_at: number | null;
  storage_path: string;
  updated_at: number;
}

interface CloudSaveState {
  id: string;
  rom_id: string;
  slot: number;
  created_at: number;
  playtime: number;
  screenshot_path: string | null;
  storage_path: string;
  updated_at: number;
}

interface CloudPlaytime {
  rom_id: string;
  seconds: number;
  last_played: number;
  updated_at: number;
}

interface CloudSettings {
  settings: Record<string, unknown>;
  updated_at: number;
}

async function downloadScreenshot(
  supabase: SupabaseClient,
  screenshotPath: string | null,
): Promise<string | undefined> {
  if (!screenshotPath) return undefined;
  try {
    const { data: blob } = await supabase.storage
      .from('save-state-data')
      .download(screenshotPath);
    if (blob) return await blobToDataUrl(blob);
  } catch {
    // Best-effort — screenshot loss is non-critical
  }
  return undefined;
}

export async function performInitialSync(
  userId: string,
  supabase: SupabaseClient,
  localDb: IndexedDBProvider,
  queue: SyncQueue,
): Promise<void> {
  // Fetch all cloud metadata in parallel
  const [cloudRomsRes, cloudSavesRes, cloudPlaytimeRes, cloudSettingsRes] = await Promise.all([
    supabase.from('user_roms').select('*').eq('user_id', userId),
    supabase.from('user_save_states').select('*').eq('user_id', userId),
    supabase.from('user_playtime').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
  ]);

  const cloudRoms: CloudRom[] = cloudRomsRes.data ?? [];
  const cloudSaves: CloudSaveState[] = cloudSavesRes.data ?? [];
  const cloudPlaytime: CloudPlaytime[] = cloudPlaytimeRes.data ?? [];
  const cloudSettings: CloudSettings | null = cloudSettingsRes.data;

  // ROM names are stored as plaintext — no decryption needed
  const decryptedCloudRoms = cloudRoms;

  // Fetch all local metadata
  const localRoms = await localDb.listRoms();
  const localSettings = await localDb.getSetting<Record<string, unknown>>('userSettings');

  // ── Merge ROMs ──────────────────────────────────

  const cloudRomMap = new Map(decryptedCloudRoms.map((r) => [r.rom_id, r]));
  const localRomMap = new Map(localRoms.map((r) => [r.id, r]));

  // Cloud-only ROMs: insert metadata locally with cloudOnly flag
  for (const cr of decryptedCloudRoms) {
    if (!localRomMap.has(cr.rom_id)) {
      const meta: RomMetadata = {
        id: cr.rom_id,
        name: cr.name,
        filename: cr.filename,
        size: cr.size,
        addedAt: cr.added_at,
        lastPlayedAt: cr.last_played_at ?? undefined,
        cloudOnly: true,
      };
      // Save as StoredRom with empty data (cloudOnly marker)
      await localDb.saveRom({ ...meta, data: new ArrayBuffer(0) });
    }
  }

  // Local-only ROMs: enqueue upload
  for (const lr of localRoms) {
    if (!cloudRomMap.has(lr.id)) {
      await queue.enqueue({
        type: 'upload-rom',
        dedupKey: `rom:${lr.id}`,
        romId: lr.id,
        timestamp: Date.now(),
      });
    }
  }

  // Both exist: newer updated_at wins for metadata
  for (const lr of localRoms) {
    const cr = cloudRomMap.get(lr.id);
    if (!cr) continue;

    const localUpdated = lr.lastPlayedAt ?? lr.addedAt;
    if (cr.updated_at > localUpdated) {
      // Cloud is newer — update local metadata (keep local binary)
      await localDb.renameRom(lr.id, cr.name);
    } else if (localUpdated > cr.updated_at) {
      // Local is newer — enqueue metadata update
      await queue.enqueue({
        type: 'update-rom-metadata',
        dedupKey: `rom-meta:${lr.id}`,
        romId: lr.id,
        timestamp: Date.now(),
      });
    }
  }

  // ── Merge Save States (keep-all) ──────────────────

  const cloudSaveMap = new Map(cloudSaves.map((s) => [s.id, s]));

  // Get all local save states for all ROMs
  const allLocalRomIds = Array.from(new Set([...Array.from(localRomMap.keys()), ...Array.from(cloudRomMap.keys())]));
  const allLocalSaves: SaveStateMetadata[] = [];
  for (const romId of allLocalRomIds) {
    const saves = await localDb.listSaveStates(romId);
    allLocalSaves.push(...saves);
  }
  const localSaveMap = new Map(allLocalSaves.map((s) => [s.id ?? `${s.romId}-slot-${s.slot}`, s]));

  // Cloud-only saves: insert metadata locally with cloudOnly flag
  for (const cs of cloudSaves) {
    if (!localSaveMap.has(cs.id)) {
      const screenshotDataUrl = await downloadScreenshot(supabase, cs.screenshot_path);
      const meta: SaveStateMetadata = {
        id: cs.id,
        romId: cs.rom_id,
        slot: cs.slot,
        createdAt: cs.created_at,
        playtime: cs.playtime,
        screenshotDataUrl,
        cloudOnly: true,
      };
      await localDb.saveSaveState(cs.rom_id, cs.slot, new ArrayBuffer(0), meta);
    }
  }

  // Local-only saves: enqueue upload
  for (const ls of allLocalSaves) {
    const id = ls.id ?? `${ls.romId}-slot-${ls.slot}`;
    if (!cloudSaveMap.has(id)) {
      await queue.enqueue({
        type: 'upload-save-state',
        dedupKey: `save:${id}`,
        romId: ls.romId,
        slot: ls.slot,
        timestamp: Date.now(),
      });
    }
  }

  // Both exist — same slot conflict: keep-all (move older to next empty slot)
  for (const ls of allLocalSaves) {
    const id = ls.id ?? `${ls.romId}-slot-${ls.slot}`;
    const cs = cloudSaveMap.get(id);
    if (!cs) continue;

    if (cs.updated_at > ls.createdAt) {
      // Cloud is newer for this slot — move local to next empty slot
      const usedSlots = new Set(
        allLocalSaves.filter((s) => s.romId === ls.romId).map((s) => s.slot),
      );
      let newSlot = -1;
      for (let i = 0; i < 10; i++) {
        if (!usedSlots.has(i) && i !== ls.slot) {
          newSlot = i;
          break;
        }
      }
      if (newSlot >= 0) {
        // Load existing local data, save to new slot
        const data = await localDb.loadSaveState(ls.romId, ls.slot);
        if (data && data.byteLength > 0) {
          await localDb.saveSaveState(ls.romId, newSlot, data, { ...ls, slot: newSlot });
          await queue.enqueue({
            type: 'upload-save-state',
            dedupKey: `save:${ls.romId}-slot-${newSlot}`,
            romId: ls.romId,
            slot: newSlot,
            timestamp: Date.now(),
          });
        }
      }
      // Overwrite original slot with cloud metadata (cloudOnly for lazy download)
      const screenshotDataUrl = await downloadScreenshot(supabase, cs.screenshot_path);
      const meta: SaveStateMetadata = {
        id: cs.id,
        romId: cs.rom_id,
        slot: cs.slot,
        createdAt: cs.created_at,
        playtime: cs.playtime,
        screenshotDataUrl,
        cloudOnly: true,
      };
      await localDb.saveSaveState(cs.rom_id, cs.slot, new ArrayBuffer(0), meta);
    } else if (ls.createdAt > cs.updated_at) {
      // Local is newer — enqueue upload to overwrite cloud
      await queue.enqueue({
        type: 'upload-save-state',
        dedupKey: `save:${id}`,
        romId: ls.romId,
        slot: ls.slot,
        timestamp: Date.now(),
      });
    }
  }

  // ── Merge Settings (last-write-wins) ──────────────

  if (cloudSettings && localSettings) {
    const localUpdated = (localSettings as Record<string, unknown>).__updatedAt as number ?? 0;
    if (cloudSettings.updated_at > localUpdated) {
      await localDb.setSetting('userSettings', {
        ...cloudSettings.settings,
        __updatedAt: cloudSettings.updated_at,
      });
    } else {
      await queue.enqueue({
        type: 'update-settings',
        dedupKey: 'settings',
        timestamp: Date.now(),
      });
    }
  } else if (cloudSettings && !localSettings) {
    await localDb.setSetting('userSettings', {
      ...cloudSettings.settings,
      __updatedAt: cloudSettings.updated_at,
    });
  } else if (!cloudSettings && localSettings) {
    await queue.enqueue({
      type: 'update-settings',
      dedupKey: 'settings',
      timestamp: Date.now(),
    });
  }

  // ── Merge Playtime (max-merge) ──────────────────

  const cloudPlaytimeMap = new Map(cloudPlaytime.map((p) => [p.rom_id, p]));

  for (let i = 0; i < allLocalRomIds.length; i++) {
    const romId = allLocalRomIds[i];
    const local = await localDb.getPlaytime(romId);
    const cloud = cloudPlaytimeMap.get(romId);

    if (cloud && !local) {
      await localDb.updatePlaytime({
        romId: cloud.rom_id,
        seconds: cloud.seconds,
        lastPlayed: cloud.last_played,
      });
    } else if (!cloud && local) {
      await queue.enqueue({
        type: 'update-playtime',
        dedupKey: `playtime:${romId}`,
        romId,
        timestamp: Date.now(),
      });
    } else if (cloud && local) {
      const mergedSeconds = Math.max(cloud.seconds, local.seconds);
      const mergedLastPlayed = Math.max(cloud.last_played, local.lastPlayed);
      await localDb.updatePlaytime({
        romId,
        seconds: mergedSeconds,
        lastPlayed: mergedLastPlayed,
      });
      if (local.seconds > cloud.seconds || local.lastPlayed > cloud.last_played) {
        await queue.enqueue({
          type: 'update-playtime',
          dedupKey: `playtime:${romId}`,
          romId,
          timestamp: Date.now(),
        });
      }
    }
    // Remove from cloud map so we know which are cloud-only
    cloudPlaytimeMap.delete(romId);
  }

  // Cloud-only playtime records
  const remainingPlaytime = Array.from(cloudPlaytimeMap.entries());
  for (const [romId, cloud] of remainingPlaytime) {
    await localDb.updatePlaytime({
      romId,
      seconds: cloud.seconds,
      lastPlayed: cloud.last_played,
    });
  }

  // Start draining the queue
  queue.drain();
}
