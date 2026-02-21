# Design Reference

## Mood & Inspiration
Reference images (in `/design/references/`) show:
1. **Pixel mountain lake scene** — Rich blues, detailed pixel trees, atmospheric clouds. Key takeaway: use deep blues and teals as primary palette, layered depth.
2. **Pixel cityscape sunset** — Blue-grey buildings, green-yellow sky glow. Key takeaway: clean geometric pixel shapes, atmospheric lighting.
3. **Pixel noir alleyway** — Deep night blues, neon accents, vertical composition. Key takeaway: dark backgrounds with pops of warm color.
4. **Synthwave sunset** — Pink/purple clouds, golden sun, grid floor. Key takeaway: warm accent colors, retro grid aesthetic, scan lines.
5. **Pixel space volcano** — Red terrain, colorful nebula sky. Key takeaway: dramatic color contrast, space/fantasy elements.
6. **8-bit gradient sky** — Simple horizontal color bands. Key takeaway: minimal pixel art can be beautiful with good color gradients.

## Color System

### Primary Palette
```css
:root {
  /* Backgrounds */
  --color-bg-darkest: #080810;
  --color-bg-dark: #0f0f2a;
  --color-bg-mid: #1a1a3e;
  --color-bg-light: #2a2a5e;
  
  /* Accent - Cool */
  --color-blue: #4a9eff;
  --color-blue-glow: #4a9eff44;
  --color-teal: #00d4aa;
  --color-purple: #8b5cf6;
  
  /* Accent - Warm */
  --color-pink: #ff6b9d;
  --color-gold: #ffd700;
  --color-orange: #ff8c42;
  --color-red: #ef4444;
  
  /* Text */
  --color-text: #e0e0ff;
  --color-text-secondary: #8888bb;
  --color-text-muted: #555580;
  
  /* GBA Shell */
  --color-shell-primary: #2d1b4e;
  --color-shell-secondary: #1e1236;
  --color-shell-highlight: #3d2b5e;
  --color-screen-bezel: #111122;
  
  /* Buttons */
  --color-btn-a: #ef4444;
  --color-btn-b: #3b82f6;
  --color-btn-start: #555580;
  --color-btn-dpad: #333355;
  
  /* UI Surfaces */
  --color-panel-bg: rgba(15, 15, 42, 0.85);
  --color-panel-border: rgba(74, 158, 255, 0.2);
  --color-card-bg: rgba(26, 26, 62, 0.6);
  --color-card-hover: rgba(42, 42, 94, 0.8);
}
```

### Background Layer Colors
```
Layer 1 (Stars):     #ffffff at 20-80% opacity, sizes 1-3px
Layer 2 (Nebula):    Gradient blend of --color-purple and --color-blue at 10% opacity
Layer 3 (Mountains): #0a0a2a silhouette with --color-blue-glow edge highlight
Layer 4 (Clouds):    #1a1a3e to #2a2a5e, 30-50% opacity, pixel-blocky shapes
Layer 5 (Particles): --color-teal and --color-gold, 1-2px, fade in/out
```

## GBA Shell Design Specifications

### Dimensions (CSS units, scaled proportionally)
```
Shell body:        520px wide × 340px tall (desktop)
Screen area:       240px × 160px (native GBA resolution)  
Screen with bezel: 280px × 200px
D-pad:             80px × 80px cross shape
A/B buttons:       36px diameter each
Start/Select:      48px × 16px pill shape
L/R bumpers:       80px × 20px
```

### 3D Effect
```css
.gba-shell {
  perspective: 1000px;
  transform: rotateX(2deg);  /* Very subtle tilt */
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(74, 158, 255, 0.1);  /* Subtle blue underglow */
}
```

### Button Press Animation
```css
.gba-button:active {
  transform: translateY(2px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);  /* Reduced shadow */
  filter: brightness(0.9);
  transition: all 50ms ease-out;
}
```

### Screen Effects
- Optional CRT scanlines: horizontal lines at 50% opacity, 2px apart
- Screen glow: subtle box-shadow inset with --color-blue-glow
- Power-on animation: screen "turns on" from center outward with a brief white flash

## Typography

### Fonts
```css
/* Headers, labels, buttons */
font-family: 'Press Start 2P', monospace;

/* Body text, descriptions */
font-family: 'JetBrains Mono', 'Fira Code', monospace;

/* Fallback */
font-family: ui-monospace, 'Cascadia Code', 'Courier New', monospace;
```

### Scale
```
Hero/Title:    24px Press Start 2P
Section head:  16px Press Start 2P
Labels/badges: 10px Press Start 2P
Body text:     14px JetBrains Mono
Small text:    12px JetBrains Mono
```

## Animation Guidelines

### Background (ambient)
- Star twinkle: opacity oscillates 0.2–1.0 over 2-5 seconds (random per star)
- Cloud drift: 0.5–1px per frame at 30fps horizontal
- Mountain parallax: 0.1px per frame (barely perceptible)
- Particles: spawn randomly, float upward, fade over 3-8 seconds

### UI Transitions
- Panel slide-in: 300ms ease-out with slight overshoot
- Card appear: stagger 50ms between cards, fade + translateY(10px)
- Button hover: scale(1.02) over 150ms
- Modal backdrop: fade 200ms

### Respect User Preferences
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all background animation */
  /* Reduce transitions to opacity-only, shorter duration */
}
```

## Component Visual Specs

### ROM Card
```
┌─────────────────────────┐
│  ┌───────────────────┐  │
│  │   Thumbnail        │  │
│  │   (160×106px)      │  │
│  └───────────────────┘  │
│  Title                   │
│  [Platformer] [2023]     │
│  ▶ Play                  │
└─────────────────────────┘
```
- Background: var(--color-card-bg)
- Border: 1px solid var(--color-panel-border)
- Rounded: 8px
- Hover: glow + slight lift

### Save State Card
```
┌─────────────────────────┐
│  ┌────────┐  Slot 3      │
│  │ Screen │  2h ago       │
│  │  shot  │  Playtime:    │
│  └────────┘  4h 23m       │
│  [Load] [Delete]         │
└─────────────────────────┘
```
- Screenshot: 120×80px with pixel-art border
- Timestamp: relative ("2h ago", "yesterday")
- Actions: icon buttons, confirm before delete

### Speed Control Bar
```
[ 1x ][ 2x ][ 3x ][ 4x ][ 5x ]
         ^^^^ active (glowing)
```
- Pill-shaped container
- Active segment has glow + accent color
- Keyboard shortcut hint below on hover
