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
  id?: string;
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

// ─── Settings ────────────────────────────────

export interface KeyBindings {
  A: string;
  B: string;
  L: string;
  R: string;
  START: string;
  SELECT: string;
  UP: string;
  DOWN: string;
  LEFT: string;
  RIGHT: string;
}

export interface Shortcuts {
  togglePause: string;
  speed1: string;
  speed2: string;
  speed3: string;
  speed4: string;
  speed5: string;
  saveState: string;
  loadState: string;
}

export interface UserSettings {
  keyBindings: KeyBindings;
  shortcuts: Shortcuts;
  volume: number;
  scanlinesEnabled: boolean;
  backgroundAnimationEnabled: boolean;
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
