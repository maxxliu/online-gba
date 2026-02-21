# RetroPlay — Full Specification

## 1. Core Emulation

### 1.1 Emulator Engine
- Use `@thenick775/mgba-wasm` — mGBA compiled to WebAssembly
- Canvas: 240x160 native resolution, scaled with CSS `image-rendering: pixelated`
- Audio: Web Audio API, resume on first user interaction
- Input: Keyboard + virtual touchscreen buttons

### 1.2 Speed Control
- Normal (1x), Fast (2x), Faster (3x), Turbo (4x), Ultra (5x)
- Via `Module.setFastForwardMultiplier(n)`
- UI: Pill-shaped toggle bar, visual indicator pulses above 1x
- Desktop: `Space` toggles fast-forward, number keys `1-5` for specific speeds
- Mobile: Tap speed segments in the control bar

### 1.3 Controls Mapping
Desktop keyboard defaults:
```
A → Z   |   B → X   |   L → A   |   R → S
Start → Enter   |   Select → Backspace   |   D-Pad → Arrow Keys
```
Mobile: Virtual buttons overlaid below or on top of screen (see §5.3)

## 2. ROM Library (User-Upload Only)

### 2.1 Upload Flow
- Users upload their own .gba files via file picker or drag-and-drop
- ROM stored in IndexedDB — persists across sessions
- Appears immediately in "My Library"
- No server upload — everything stays in the browser

### 2.2 My Library UI
- Shows all previously uploaded ROMs as cards
- Each card: ROM filename (cleaned up as title), file size, last played date
- Delete button to remove ROM from library
- "Upload ROM" is the primary CTA when library is empty

### 2.3 Library Panel
- **Collapsed**: Floating button/tab — "Library" with pixel game icon
- **Expanded**:
  - Desktop: Slide-out panel from left
  - Mobile: Full-screen bottom sheet with drag handle
  - Search/filter bar at top
  - Grid of ROM cards
  - "Upload ROM" area (large drop zone + file picker button)
  - Close: click outside / Escape / X / swipe down (mobile)
- **Animations**: Panel slides in with slight overshoot, cards stagger-fade in

### 2.4 Empty State
When no ROMs uploaded yet:
- Beautiful pixel art illustration (procedural or simple SVG)
- "Drop a .gba file here or tap to browse"
- Animated dashed border on the drop zone
- Brief explanation: "Your ROMs stay in your browser — nothing is uploaded to any server"

## 3. Save State System

### 3.1 Data Model
```typescript
interface SaveState {
  id: string;
  romId: string;                 // Hash of ROM data
  romTitle: string;
  slot: number;                  // 0-9
  timestamp: number;             // Unix ms
  playtimeSeconds: number;
  screenshotDataUrl: string;     // Base64 PNG
  stateData: ArrayBuffer;        // Raw save state
  saveData: ArrayBuffer;         // In-game .sav data
}
```

### 3.2 Save/Load Flow
- **Quick Save**: F5 (desktop) or save button (mobile) → next available slot
- **Quick Load**: F8 (desktop) or load button → most recent save for current ROM
- **Manual**: Open save manager → pick slot to save/load/delete
- **Auto-save**: Every 5 minutes of active play

### 3.3 Save State Browser
- **Collapsed**: "Saves" tab
- **Expanded**:
  - Desktop: Slide-out panel from right
  - Mobile: Full-screen bottom sheet
  - Header: "Save States" + current ROM title
  - Grid of save state cards (most recent first)
  - Each card: screenshot thumbnail, slot badge, relative timestamp, playtime, Load/Delete buttons
  - Empty slots: dashed border, "Save Here" button

### 3.4 Playtime Tracking
- Timer runs when game is unpaused and tab is visible
- Stored per-ROM in IndexedDB
- Displayed on save cards and ROM cards

## 4. Visual Design

### 4.1 Theme
**Retro meets modern.** Pixel art studio designing a premium web app.

Color palette:
```
Backgrounds:  #080810, #0f0f2a, #1a1a3e, #2a2a5e
Cool accents:  #4a9eff (blue), #00d4aa (teal), #8b5cf6 (purple)
Warm accents:  #ff6b9d (pink), #ffd700 (gold), #ff8c42 (orange)
Text:          #e0e0ff (primary), #8888bb (secondary), #555580 (muted)
GBA shell:     #2d1b4e → #1e1236 gradient
Buttons:       #ef4444 (A/red), #3b82f6 (B/blue)
Panels:        rgba(15,15,42,0.85) with backdrop-filter: blur(12px)
```

### 4.2 Animated Pixel Background
Full-screen procedural canvas (NOT images). Layers:
1. **Star field**: ~200 stars, twinkle (opacity oscillation, 2-5s periods)
2. **Distant mountains**: Pixel silhouette, very slow horizontal parallax
3. **Clouds**: Chunky pixel clouds, slow horizontal drift
4. **Particles**: Occasional pixel fireflies that float and fade

All movement subtle (1-3px/sec). Pause when tab hidden. Respect `prefers-reduced-motion`.

### 4.3 GBA Shell (Desktop Only)
- CSS-rendered with 3D perspective, centered on screen
- Deep purple gradient body, screen bezel with inner glow
- D-pad, A/B buttons, Start/Select, L/R bumpers, speaker grille, power LED
- Button press: translateY(+2px) + shadow shrink on press (satisfying click)
- Subtle blue underglow on the shell

### 4.4 Mobile Layout
- No GBA shell — emulator canvas stretches to full width
- Virtual touch controls below canvas (portrait) or overlaid (landscape)
- D-pad and buttons are large, thumb-friendly, semi-transparent
- Controls have press animations + optional haptic feedback
- Panels are full-screen bottom sheets with swipe-to-dismiss

### 4.5 UI Panels
- Frosted glass: `backdrop-filter: blur(12px)` + semi-transparent dark bg
- Cards: hover glow + slight lift (desktop), tap highlight (mobile)
- Spring/ease-out transitions (Framer Motion)
- Custom thin scrollbars (desktop), native momentum scrolling (mobile)

### 4.6 Typography
- Headers/labels: "Press Start 2P" (Google Fonts)
- Body text: "JetBrains Mono" or system monospace
- Min size 14-16px (pixel fonts need larger base)

## 5. Responsive Behavior

### 5.1 Desktop (>1024px)
- GBA shell centered, background visible on all sides
- Panels slide from left (library) and right (saves)
- Keyboard controls active
- Speed bar below shell

### 5.2 Tablet (768-1024px)
- Smaller GBA shell (or no shell, just framed canvas)
- Panels overlay as modal sheets
- Touch + keyboard

### 5.3 Mobile (<768px)
- **Portrait**: Canvas fills width at top. Below: speed bar, then virtual controls (D-pad left, A/B right, Start/Select center)
- **Landscape**: Canvas fills most of width. D-pad overlaid left, A/B overlaid right, translucent
- Library/saves: Full-screen bottom sheets with grab handle
- All touch targets ≥ 44×44px
- No hover states — only active/press states

### 5.4 Virtual Touch Controls
```
Portrait layout:
┌──────────────────────┐
│                      │
│   Emulator Screen    │
│     (240×160)        │
│                      │
├──────────────────────┤
│  [1x][2x][3x][4x][5x] │  ← Speed bar
├──────────────────────┤
│ ┌─┐        ┌─┐ ┌─┐  │
│ │↑│        │ A│ │ B│  │
│┌┤ ├┐       └─┘ └─┘  │
││←  →│   [Sel][Start] │
│└┤ ├┘                 │
│ │↓│        [L] [R]   │
│ └─┘                  │
├──────────────────────┤
│ [Library]    [Saves] │  ← Bottom toolbar
└──────────────────────┘
```

## 6. Performance Requirements
- First paint: <1.5s
- WASM load: <3s on broadband
- Save state: <500ms
- Speed change: Instant
- Background animation: 30fps min, 60fps target
- Touch input: <16ms response (no perceptible delay)

## 7. Accessibility
- Keyboard navigable
- ARIA labels on all interactive elements
- High contrast text
- `prefers-reduced-motion` disables background animations
- Touch targets ≥ 44×44px on mobile

## 8. Key Rebinding (MVP)

### 8.1 Settings Store
All key bindings stored in `settings-store.ts` (Zustand, persisted to IndexedDB):
```typescript
interface KeyBindings {
  keyboard: {
    A: string;        // default: "z"
    B: string;        // default: "x"
    L: string;        // default: "a"
    R: string;        // default: "s"
    Start: string;    // default: "Enter"
    Select: string;   // default: "Backspace"
    Up: string;       // default: "ArrowUp"
    Down: string;     // default: "ArrowDown"
    Left: string;     // default: "ArrowLeft"
    Right: string;    // default: "ArrowRight"
    QuickSave: string;  // default: "F5"
    QuickLoad: string;  // default: "F8"
    FastForward: string; // default: " " (Space)
  };
}
```

### 8.2 Key Binding Editor UI
- Accessible from Settings panel (gear icon)
- List of all GBA buttons with current key shown
- Click a button's key → enters "listening" mode (pulsing highlight)
- Press any key → captures `event.key`, saves binding, exits listening
- "Reset to Defaults" button at bottom
- Duplicate detection: warn if same key assigned to two actions
- Mobile: show keyboard bindings as informational (touch controls aren't rebindable in MVP, but architecture supports it later)

### 8.3 Architecture Requirements
- Default bindings in `src/lib/constants.ts` as a plain object
- Active bindings come from settings store (falls back to defaults)
- `useKeyboardControls` reads from the store, NOT from constants
- Changing a binding takes effect immediately (no restart needed)

## 9. Cloud Sync — Future Roadmap

### 9.1 Overview (Not for MVP — architecture prep only)
Users will eventually create accounts and sync their ROM library + save states across devices. The MVP must be architected so this slots in without major refactoring.

### 9.2 Storage Provider Abstraction
All data access goes through a `StorageProvider` interface:
```typescript
interface StorageProvider {
  // ROMs
  saveRom(rom: RomData): Promise<void>;
  getRom(romId: string): Promise<RomData | null>;
  listRoms(): Promise<RomMetadata[]>;
  deleteRom(romId: string): Promise<void>;

  // Save States
  saveSaveState(state: SaveState): Promise<void>;
  loadSaveState(stateId: string): Promise<SaveState | null>;
  listSaveStates(romId: string): Promise<SaveStateMetadata[]>;
  deleteSaveState(stateId: string): Promise<void>;

  // Settings
  getSetting<T>(key: string): Promise<T | null>;
  setSetting<T>(key: string, value: T): Promise<void>;

  // Playtime
  getPlaytime(romId: string): Promise<PlaytimeRecord | null>;
  setPlaytime(romId: string, record: PlaytimeRecord): Promise<void>;
}
```

MVP implements `IndexedDBProvider`. Future adds `CloudProvider` (likely Supabase) that:
- Syncs metadata on login
- Uploads/downloads ROM and save state binary data lazily
- Handles conflict resolution (last-write-wins for settings, keep-all for save states)
- Works offline and syncs when connectivity returns

### 9.3 ROM ID Stability
ROM IDs must be deterministic content hashes (SHA-256 of ROM data), not random UUIDs. This ensures the same ROM uploaded on two different devices maps to the same save states.

### 9.4 Auth (Future)
- Likely: NextAuth.js or Supabase Auth
- Providers: email/password + Google OAuth
- Session persisted in cookie
- No auth required to use the emulator — it's an optional enhancement

