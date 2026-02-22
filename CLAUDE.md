# RetroPlay — Online GBA Emulator

## Project Overview
A beautifully designed, browser-based Game Boy Advance emulator where users upload their own ROMs. The aesthetic is retro pixel art with subtle animations, housing the emulator inside a 3D Game Boy Advance shell. Must work beautifully on both desktop and mobile.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS + CSS Modules for complex animations
- **Emulator Core**: `@thenick775/mgba-wasm` (mGBA compiled to WASM) — the **only** emulator library to use
- **State Management**: Zustand (installed, stores are stubs — not yet wired up)
- **Storage**: IndexedDB (via `idb` library) for save states and ROM caching
- **Animations**: Framer Motion (installed, not yet used) + CSS animations for pixel backgrounds
- **Deployment**: Vercel

## Critical Technical Requirements

### WASM / Cross-Origin Isolation
The mgba-wasm core uses SharedArrayBuffer and requires these headers on EVERY page:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
Already configured in `next.config.js` headers. Non-negotiable — the emulator will not work without it.

### Emulator Core API (mgba-wasm)
Approximate API — verify against `@thenick775/mgba-wasm@2.4.1` source before use:
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
- **Tablet (768-1024px)**: Dynamically scaled GBA shell (~88% viewport height). Overlay panels. Touch + keyboard.
- **Desktop (>1024px)**: Dynamically scaled GBA shell centered (~88% viewport height, max 2.5×). Slide-out panels. Keyboard controls.

## Code Conventions
- ES modules, functional components with hooks, destructured imports
- `'use client'` only where needed
- Named exports for components
- CSS custom properties for theme colors
- CSS Modules (`.module.css`) for complex component-scoped styles (e.g. GameBoyShell)
- Pointer events (`pointerdown/up/leave/cancel`) with `setPointerCapture()` for all interactive controls
- `touch-action: none` + `preventDefault()` on all touch-interactive elements
- `aria-label` on all interactive elements
- All emulator interactions through `useEmulator` hook (planned — hook not yet implemented)
- All IndexedDB ops in `src/lib/db.ts` (planned — interface only, no implementation yet)
- **Mobile-first CSS**: base styles for mobile, `min-width` breakpoints for desktop
- Shell button components receive `pressedButtons` prop (no internal pressed state) — `useButtonState` in page.tsx is the single source of truth
- `useButtonState` tracks input sources (keyboard/pointer) per button — button stays pressed until all sources release
- Shell sizing uses wrapper `transform: scale()` — all internal shell positioning remains in absolute px

## Directory Structure
Most directories are scaffolded. The following are **implemented**:
- `background/PixelBackground.tsx` — animated canvas with dithered sky, stars, clouds, fireflies
- `emulator/GameBoyShell.tsx` + sub-components (DPad, ActionButtons, Bumpers, SystemButtons, ScreenBezel, SpeakerGrille)
- `emulator/GameBoyShell.module.css` — 3D shell styling with press animations, responsive scaling
- `hooks/useShellScale.ts` — ResizeObserver-based dynamic shell scaling (wrapper `transform: scale()`)
- `hooks/useMediaQuery.ts` — responsive breakpoint hook (SSR-defaults to mobile)
- `app/globals.css` — full color token system (CSS custom properties)
- `lib/constants.ts` — key mappings, GBA dimensions, breakpoints, shell geometry
- `emulator/TouchControls.tsx` + `TouchControls.module.css` — mobile virtual controls (portrait: 3-row layout, landscape: side columns)
- `emulator/ScreenPlaceholder.tsx` — placeholder screen for mobile layout
- `emulator/MobileToolbar.tsx` + `MobileToolbar.module.css` — bottom toolbar for mobile portrait

**Still stubs:** stores, `lib/db.ts` (interface only), `library/`, `saves/`, `settings/`, `ui/`
```
src/
  app/                     # Next.js App Router
  components/
    emulator/              # GameBoyShell + sub-components, TouchControls, MobileToolbar, ScreenPlaceholder
    library/               # RomLibrary, RomCard, UploadRom
    saves/                 # SaveStateManager, SaveStateCard
    settings/              # SettingsPanel, KeyBindingEditor
    background/            # PixelBackground (animated canvas)
    ui/                    # Shared components
  hooks/                   # useButtonState (input source tracking), useKeyboardControls, useShellScale (dynamic sizing), useMediaQuery (responsive) — planned: useEmulator, useSaveStates, usePlaytime
  lib/
    db.ts                  # StorageProvider interface (IndexedDBProvider not yet implemented)
    constants.ts           # Default key mappings, colors, breakpoints
  stores/
    emulator-store.ts      # Emulator state (stub)
    ui-store.ts            # UI state — panels, modals (stub)
    settings-store.ts      # User settings — key bindings, volume, toggles (stub)
  types/                   # GbaButton, InputSource types
```

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

## Future Roadmap (design for these NOW, build LATER)
- **Cloud Sync**: `StorageProvider` interface in `db.ts` ready for `CloudProvider` swap. ROM IDs must be content-hashed.
- **Key Rebinding**: Defaults in `constants.ts`, active mappings from settings store. Touch layout eventually draggable.

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
- In useEffect cleanup, capture `ref.current` in a local variable before the return — React exhaustive-deps rule requires it
- Do NOT conditionally render elements that carry refs used by ResizeObserver/hooks — `useMediaQuery` SSR-defaults to `isMobile: true`, so conditional returns remove desktop ref targets before hooks attach. Always render ref targets in the DOM and hide with `style={{ display: 'none' }}` instead.
- Mobile portrait (375px viewport): ~343px usable width after padding. Verify touch control row totals fit before adding elements to a single flex row.
