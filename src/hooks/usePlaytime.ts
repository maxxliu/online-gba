'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEmulatorStore } from '@/stores/emulator-store';
import { storage } from '@/lib/db';
import { formatPlaytime } from '@/lib/format';
import { PLAYTIME_PERSIST_INTERVAL_MS } from '@/lib/constants';

export function usePlaytime() {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [formattedPlaytime, setFormattedPlaytime] = useState('<1m');

  const currentRomId = useEmulatorStore((s) => s.currentRomId);
  const status = useEmulatorStore((s) => s.status);

  const secondsRef = useRef(0);
  const romIdRef = useRef<string | null>(null);

  const flush = useCallback(async () => {
    const romId = romIdRef.current;
    const secs = secondsRef.current;
    if (!romId || secs <= 0) return;
    await storage.updatePlaytime({
      romId,
      seconds: secs,
      lastPlayed: Date.now(),
    });
  }, []);

  // Load playtime when ROM changes
  useEffect(() => {
    // Flush previous ROM's playtime
    if (romIdRef.current && romIdRef.current !== currentRomId) {
      flush();
    }

    romIdRef.current = currentRomId;

    if (!currentRomId) {
      secondsRef.current = 0;
      setTotalSeconds(0);
      setFormattedPlaytime('<1m');
      return;
    }

    // Load existing playtime
    storage.getPlaytime(currentRomId).then((record) => {
      const secs = record?.seconds ?? 0;
      secondsRef.current = secs;
      setTotalSeconds(secs);
      setFormattedPlaytime(formatPlaytime(secs));
    });
  }, [currentRomId, flush]);

  // Tick every second while running
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      secondsRef.current += 1;
      setTotalSeconds(secondsRef.current);
      setFormattedPlaytime(formatPlaytime(secondsRef.current));
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Persist every 30 seconds while running
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      flush();
    }, PLAYTIME_PERSIST_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, flush]);

  // Flush on pause/quit
  useEffect(() => {
    if (status === 'paused' || status === 'idle' || status === 'ready') {
      flush();
    }
  }, [status, flush]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flush();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCurrentPlaytime = useCallback(() => secondsRef.current, []);

  return { formattedPlaytime, totalSeconds, getCurrentPlaytime };
}
