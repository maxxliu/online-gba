# RetroPlay — Online GBA Emulator

## Project Overview
A beautifully designed, browser-based Game Boy Advance emulator where users upload their own ROMs. The aesthetic is retro pixel art with subtle animations, housing the emulator inside a 3D Game Boy Advance shell. Must work beautifully on both desktop and mobile.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS + CSS Modules for complex animations
- **Emulator Core**: `@thenick775/mgba-wasm` (mGBA compiled to WASM) — the **only** emulator library to use
- **State Management**: Zustand
- **Storage**: IndexedDB (via `idb` library) for save states and ROM caching
- **Animations**: Framer Motion for UI transitions, CSS animations for pixel backgrounds
- **Deployment**: Vercel

## Critical Technical Requirements

### WASM / Cross-Origin Isolation
The mgba-wasm core uses SharedArrayBuffer and requires these headers on EVERY page:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
Configure in `next.config.js` headers. Non-negotiable — the emulator will not work without it.

### Emulator Core API (mgba-wasm)
```typescript
Module.FSInit()                          // Initialize filesystem
Module.loadGame(romPath)                 // Load a ROM
Module.saveState(slot)                   // Save state to slot (0-9)
Module.loadState(slot)                   // Load state from slot
Module.setFastForwardMultiplier(n)       // Set speed (2, 3, 4, 5)
Module.pauseGame() / Module.resumeGame() // Pause / Resume
Module.quitGame()                        // Quit current game
Module.buttonPress(name)                 // Press button
Module.buttonUnpress(name)               // Release button
Module.setVolume(percent)                // 0-100
Module.uploadRom(file, callback)         // Upload ROM file
Module.screenshot(fileName)              // Take screenshot
Module.getSave()                         // Get save data
```

### ROM Strategy
- **User-upload only** — no pre-loaded ROMs
- ROMs stored in IndexedDB after upload, persist across sessions
- "My Library" shows previously uploaded ROMs
- Drag-and-drop + file picker
- ROM data never leaves the browser

### Responsive Design — CRITICAL
Mobile-first. Every component designed for touch first, enhanced for desktop.

- **Mobile (<768px)**: No GBA shell. Fullscreen canvas + virtual touch controls. Panels are full-screen bottom sheets. Landscape: canvas fills width.
- **Tablet (768-1024px)**: Scaled GBA shell. Overlay panels. Touch + keyboard.
- **Desktop (>1024px)**: Full GBA shell centered. Slide-out panels. Keyboard controls.

## Code Conventions
- ES modules, functional components with hooks, destructured imports
- `'use client'` only where needed
- Named exports for components
- CSS custom properties for theme colors
- All emulator interactions through `useEmulator` hook
- All IndexedDB ops in `src/lib/db.ts`
- **Mobile-first CSS**: base styles for mobile, `min-width` breakpoints for desktop

## Directory Structure
```
src/
  app/                     # Next.js App Router
  components/
    emulator/              # GameBoyShell, EmulatorScreen, SpeedControl, Controls, TouchControls
    library/               # RomLibrary, RomCard, UploadRom
    saves/                 # SaveStateManager, SaveStateCard
    settings/              # SettingsPanel, KeyBindingEditor
    background/            # PixelBackground (animated canvas)
    ui/                    # Shared components
  hooks/                   # useEmulator, useSaveStates, usePlaytime, useKeyboardControls, useMediaQuery
  lib/
    db.ts                  # StorageProvider interface + IndexedDBProvider implementation
    constants.ts           # Default key mappings, colors, breakpoints
  stores/
    emulator-store.ts      # Emulator state
    ui-store.ts            # UI state (panels, modals)
    settings-store.ts      # User settings (key bindings, volume, toggles)
  types/                   # index.ts
```

## Commands
```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

## Future Roadmap (design for these NOW, build LATER)
These features are coming post-MVP. Architect current code so they slot in cleanly:

### Cloud Sync (Accounts)
- Users will eventually create accounts and sync ROMs + save states across devices
- **Design for this now**: keep all IndexedDB operations behind an abstract `StorageProvider` interface in `src/lib/db.ts`. The interface exposes `saveRom`, `getRom`, `listRoms`, `saveSaveState`, `loadSaveState`, etc. The MVP implementation is `IndexedDBProvider`. Later we swap/layer in a `CloudProvider` that syncs to a backend (likely Supabase or similar).
- Don't couple any component directly to IndexedDB — always go through the provider
- Save state metadata (not the binary data) should be JSON-serializable for easy API transport
- ROM IDs must be stable and deterministic (content hash) so the same ROM on two devices maps to the same saves

### Key Rebinding
- Users will be able to customize keyboard and touch control mappings
- **Design for this now**: store key mappings in a `keyBindings` object in the settings store, NOT as hardcoded constants. The default mappings live in `src/lib/constants.ts` but the active mappings come from the store (which falls back to defaults).
- The `useKeyboardControls` hook should read from the store, not from constants directly
- Touch control layout positions should also eventually be customizable (drag to reposition)

## Pitfalls to Avoid
- Do NOT use `gbajs`/`gbajs2` — use `@thenick775/mgba-wasm` only
- Do NOT forget COOP/COEP headers
- Do NOT store ROM data in React state — use IndexedDB
- Do NOT render canvas with React re-renders — use refs
- Canvas: 240x160 native, scaled via CSS with `image-rendering: pixelated`
- Audio context must resume after user interaction
- Design mobile-first, NOT desktop-first
- Touch events need `preventDefault()` to avoid double-firing
- Test on real mobile devices, not just devtools resize
