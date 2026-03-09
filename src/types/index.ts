export type GbaButton =
  | 'A'
  | 'B'
  | 'L'
  | 'R'
  | 'START'
  | 'SELECT'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT';

export type InputSource = 'keyboard' | 'pointer';

// ─── ROM ────────────────────────────────────────

export interface RomMetadata {
  id: string;
  name: string;
  filename: string;
  size: number;
  addedAt: number;
  lastPlayedAt?: number;
}

export interface StoredRom extends RomMetadata {
  data: ArrayBuffer;
}

// ─── Save States ────────────────────────────────

export interface SaveState {
  id: string;
  romId: string;
  romTitle: string;
  slot: number;
  timestamp: number;
  playtimeSeconds: number;
  screenshotDataUrl?: string;
  stateData: ArrayBuffer;
  saveData?: ArrayBuffer;
}

export interface SaveStateMetadata {
  romId: string;
  slot: number;
  createdAt: number;
  playtime: number;
  screenshotDataUrl?: string;
}

// ─── Playtime ───────────────────────────────────

// ─── Emulator ──────────────────────────────────

export type EmulatorStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'running'
  | 'paused'
  | 'error';

// ─── Playtime ───────────────────────────────────

export interface PlaytimeRecord {
  romId: string;
  seconds: number;
  lastPlayed: number;
}

// ─── Upload ─────────────────────────────────────

export type UploadStatus =
  | 'idle'
  | 'reading'
  | 'hashing'
  | 'storing'
  | 'done'
  | 'error';

export interface UploadProgress {
  status: UploadStatus;
  filename?: string;
  error?: string;
}
