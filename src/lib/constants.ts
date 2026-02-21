export const DEFAULT_KEY_BINDINGS: Record<string, string> = {
  A: 'x',
  B: 'z',
  L: 'a',
  R: 's',
  START: 'Enter',
  SELECT: 'Shift',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
};

export const GBA_SCREEN_WIDTH = 240;
export const GBA_SCREEN_HEIGHT = 160;

export const SPEED_OPTIONS = [1, 2, 3, 4, 5] as const;

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;
