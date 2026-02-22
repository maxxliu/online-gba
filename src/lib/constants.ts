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

export const GBA_SHELL = {
  body: { width: 320, height: 530 },
  bezel: { width: 270, height: 195 },
  screen: { width: GBA_SCREEN_WIDTH, height: GBA_SCREEN_HEIGHT },
  dpad: { size: 90, barWidth: 30, centerDot: 16 },
  actionButton: { diameter: 36 },
  systemButton: { width: 48, height: 16 },
  bumper: { width: 70, height: 24 },
  speaker: { width: 70, height: 50 },
  led: { size: 6 },
} as const;
