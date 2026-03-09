'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SaveStateMetadata } from '@/types';
import { useEmulatorStore } from '@/stores/emulator-store';
import { storage } from '@/lib/db';
import { AUTO_SAVE_INTERVAL_MS, AUTO_SAVE_SLOTS } from '@/lib/constants';

interface UseSaveStatesOptions {
  saveStateToVfs: (slot: number) => ArrayBuffer | null;
  loadStateFromData: (slot: number, data: ArrayBuffer) => boolean;
  getScreenshot: () => string | null;
  getCurrentPlaytime: () => number;
}

export function useSaveStates({
  saveStateToVfs,
  loadStateFromData,
  getScreenshot,
  getCurrentPlaytime,
}: UseSaveStatesOptions) {
  const [states, setStates] = useState<SaveStateMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const autoSlotRef = useRef(0);

  const status = useEmulatorStore((s) => s.status);
  const currentRomId = useEmulatorStore((s) => s.currentRomId);

  const loadList = useCallback(async (romId: string) => {
    setLoading(true);
    try {
      const list = await storage.listSaveStates(romId);
      setStates(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveToSlot = useCallback(async (slot: number) => {
    if (!currentRomId) return;

    const screenshot = getScreenshot();
    const stateData = saveStateToVfs(slot);
    if (!stateData) return;

    const metadata: SaveStateMetadata = {
      romId: currentRomId,
      slot,
      createdAt: Date.now(),
      playtime: getCurrentPlaytime(),
      screenshotDataUrl: screenshot ?? undefined,
    };

    await storage.saveSaveState(currentRomId, slot, stateData, metadata);
    await loadList(currentRomId);
  }, [currentRomId, saveStateToVfs, getScreenshot, getCurrentPlaytime, loadList]);

  const loadFromSlot = useCallback(async (id: string) => {
    // Parse romId and slot from id format: "${romId}-slot-${slot}"
    const match = id.match(/^(.+)-slot-(\d+)$/);
    if (!match) return;
    const romId = match[1];
    const slot = parseInt(match[2], 10);

    const data = await storage.loadSaveState(romId, slot);
    if (!data) return;
    loadStateFromData(slot, data);
  }, [loadStateFromData]);

  const deleteSlot = useCallback(async (id: string) => {
    const match = id.match(/^(.+)-slot-(\d+)$/);
    if (!match) return;
    const romId = match[1];
    const slot = parseInt(match[2], 10);

    await storage.deleteSaveState(romId, slot);
    if (currentRomId) {
      await loadList(currentRomId);
    }
  }, [currentRomId, loadList]);

  // Auto-save: cycle through slots 0-2 every 5 minutes while running
  useEffect(() => {
    if (status !== 'running' || !currentRomId) return;

    const interval = setInterval(() => {
      const slot = AUTO_SAVE_SLOTS[autoSlotRef.current % AUTO_SAVE_SLOTS.length];
      saveToSlot(slot);
      autoSlotRef.current += 1;
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, currentRomId, saveToSlot]);

  return {
    states,
    loading,
    loadList,
    saveToSlot,
    loadFromSlot,
    deleteSlot,
  };
}
