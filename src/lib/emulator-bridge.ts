import type { GbaButton } from '@/types';

/**
 * Maps UI button names (uppercase GbaButton) to mGBA button names (lowercase).
 */
export const MGBA_BUTTON_NAMES: Record<GbaButton, string> = {
  A: 'a',
  B: 'b',
  L: 'l',
  R: 'r',
  START: 'start',
  SELECT: 'select',
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
};

/**
 * Convert UI volume (0-100) to mGBA volume multiplier (0.0-1.0).
 * mGBA supports up to 2.0 but we cap at 1.0.
 */
export function volumeToMultiplier(percent: number): number {
  return Math.max(0, Math.min(1, percent / 100));
}

type MgbaFactory = (opts: { canvas: HTMLCanvasElement }) => Promise<import('@thenick775/mgba-wasm').mGBAEmulator>;

/**
 * Load mgba-wasm from /public/mgba/ to avoid Next.js webpack bundling issues.
 * Emscripten's pthread workers need the raw mgba.js file, not a webpack chunk.
 */
export async function loadMgbaModule(): Promise<MgbaFactory> {
  // Use webpackIgnore to bypass bundling — loads the raw ESM from public/
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await (Function('return import("/mgba/mgba.js")')());
  return mod.default as MgbaFactory;
}
