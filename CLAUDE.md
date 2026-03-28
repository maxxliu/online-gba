# RetroPlay — Online GBA Emulator

## Project Overview
A beautifully designed, browser-based Game Boy Advance emulator where users upload their own ROMs. The aesthetic is retro pixel art with subtle animations, housing the emulator inside a 3D Game Boy Advance shell. Must work beautifully on both desktop and mobile.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS + CSS Modules for complex animations
- **Emulator Core**: `@thenick775/mgba-wasm` (mGBA compiled to WASM) — the **only** emulator library to use
- **State Management**: Zustand with devtools middleware
- **Storage**: IndexedDB (via `idb` library) for ROMs, save states, settings, playtime — content-addressed with SHA-256
- **Animations**: Framer Motion (panels, cards) + CSS animations for pixel backgrounds
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
Verified API for `@thenick775/mgba-wasm@2.4.1`:
```typescript
Module.FSInit()                          // Initialize filesystem
Module.filePaths()                       // Returns { gamePath, savePath, saveStatePath, ... }
Module.loadGame(romPath)                 // Load a ROM (returns boolean)
Module.saveState(slot)                   // Save state to slot (0-9)
Module.loadState(slot)                   // Load state from slot
Module.setFastForwardMultiplier(n)       // Set speed (1=normal, 2+=fast)
Module.pauseGame() / Module.resumeGame() // Pause / Resume
Module.quitGame()                        // Quit current game
Module.buttonPress(name)                 // Press button (case-insensitive: 'a','b','start','select','up','down','left','right','l','r')
Module.buttonUnpress(name)               // Release button
Module.setVolume(multiplier)             // 0.0-2.0 (NOT 0-100; 1.0 = 100%)
Module.toggleInput(enabled)              // Enable/disable built-in keyboard handling
Module.addCoreCallbacks({...})           // Register crash/save/frame callbacks
Module.FS.writeFile(path, data)          // Write to virtual filesystem
Module.FSSync()                          // Sync VFS to IndexedDB
Module.SDL2.audioContext                 // Web Audio context (resume after user interaction)
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
- All emulator interactions through `useEmulator` hook (implemented)
- All IndexedDB ops through `storage` singleton from `src/lib/db.ts` (IndexedDBProvider implemented)
- Zustand stores: select primitive/stable values in components, derive filtered lists with `useMemo` — do NOT call store methods (e.g. `getFilteredRoms()`) inside selectors (creates new refs → infinite re-renders)
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
- `lib/constants.ts` — key mappings, GBA dimensions, breakpoints, shell geometry, emulator shortcuts
- `lib/emulator-bridge.ts` — mGBA button name mapping, volume conversion, dynamic import helper
- `emulator/TouchControls.tsx` + `TouchControls.module.css` — mobile virtual controls (portrait: 3-row layout, landscape: side columns)
- `emulator/ScreenPlaceholder.tsx` — placeholder screen for mobile layout
- `emulator/MobileToolbar.tsx` + `MobileToolbar.module.css` — bottom toolbar for mobile portrait
- `library/UploadRom.tsx` + `.module.css` — drag-and-drop upload with status state machine (idle/reading/hashing/storing/done/error)
- `library/RomCard.tsx` + `.module.css` — ROM card with Framer Motion animations, play/delete buttons
- `library/RomLibrary.tsx` + `.module.css` — responsive panel (desktop slide-out / mobile bottom sheet with drag-to-dismiss), search, ROM grid, delete confirmation
- `stores/ui-store.ts` — panel state (activePanel, deleteConfirm) with Zustand + devtools
- `stores/library-store.ts` — ROM library state (upload flow, search, CRUD) with Zustand + devtools
- `lib/db.ts` — StorageProvider interface + IndexedDBProvider (ROM CRUD, cascading deletes, SHA-256 hashing, save state CRUD, playtime tracking)
- `stores/emulator-store.ts` — emulator state (status, currentRom, speed, volume, error) with Zustand + devtools
- `hooks/useEmulator.ts` — mGBA lifecycle, ROM loading, button forwarding, canvas container management (requires `isLandscape` for orientation switches), visibility auto-pause
- `hooks/useEmulatorShortcuts.ts` — speed/save/pause keyboard shortcuts (Space, 1-5, F5, F8)
- `hooks/usePlaytime.ts` — per-ROM playtime tracking with 1s tick, 30s persist, flush on pause/quit
- `hooks/useSaveStates.ts` — save state CRUD orchestration, auto-save cycling slots 0-2 every 5 min
- `lib/format.ts` — shared formatters (formatRelativeTime, formatPlaytime)
- `emulator/SpeedControl.tsx` + `.module.css` — horizontal pill bar (1x-5x) with Framer Motion animated indicator
- `saves/SaveStateCard.tsx` + `.module.css` — filled (screenshot/timestamp/playtime/Load/Delete) and empty (Save Here) variants
- `saves/SaveStateManager.tsx` + `.module.css` — responsive panel (desktop slides right / mobile bottom sheet), 10-slot grid, Save Now, delete confirmation
- `types/index.ts` — GbaButton, InputSource, EmulatorStatus, RomMetadata, StoredRom, SaveState, SaveStateMetadata, PlaytimeRecord, KeyBindings, Shortcuts, UserSettings, SyncStatus, SyncOperation, UploadStatus/Progress
- `stores/settings-store.ts` — user settings (key bindings, shortcuts, volume, scanlines, background animation) with IndexedDB hydration
- `settings/SettingsPanel.tsx` + `.module.css` — settings panel with toggles and key binding editor
- `settings/KeyBindingEditor.tsx` + `.module.css` — interactive key rebinding UI
- `profile/AuthForm.tsx`, `ProfilePanel.tsx`, `SyncStatusIndicator.tsx` — auth UI and sync status display
- `stores/auth-store.ts` — auth state (user, session, sync status) with Supabase auth + sync lifecycle
- `lib/supabase.ts` — Supabase client singleton
- `lib/sync-engine.ts` — `performInitialSync()` — bidirectional merge of ROMs, save states, playtime, settings on sign-in
- `lib/sync-provider.ts` — `SyncProvider` implements `StorageProvider`, wraps `IndexedDBProvider` + enqueues sync ops on every write
- `lib/sync-queue.ts` — `SyncQueue` — persistent FIFO queue in IndexedDB, FIFO drain with exponential backoff, online/offline awareness
- `lib/image-utils.ts` — `compressScreenshot` (data URL → JPEG blob for upload), `blobToDataUrl` (blob → data URL for download)

**Still stubs:** `ui/`
```
public/
  mgba/                    # mgba.js + mgba.wasm copied from node_modules (NOT bundled by webpack)
src/
  app/                     # Next.js App Router
  components/
    emulator/              # GameBoyShell + sub-components, TouchControls, MobileToolbar, ScreenPlaceholder
    library/               # RomLibrary, RomCard, UploadRom
    saves/                 # SaveStateManager, SaveStateCard
    settings/              # SettingsPanel, KeyBindingEditor
    profile/               # AuthForm, ProfilePanel, SyncStatusIndicator
    background/            # PixelBackground (animated canvas)
    ui/                    # Shared components
  hooks/                   # useButtonState, useKeyboardControls, useEmulator, useEmulatorShortcuts, useShellScale, useMediaQuery, usePlaytime, useSaveStates
  lib/
    db.ts                  # StorageProvider interface + IndexedDBProvider (ROM CRUD, save state CRUD, playtime, settings)
    constants.ts           # Default key mappings, colors, breakpoints, shortcuts
    format.ts              # Shared formatters (formatRelativeTime, formatPlaytime)
    emulator-bridge.ts     # mGBA button mapping, volume conversion, dynamic import
    supabase.ts            # Supabase client singleton
    sync-engine.ts         # performInitialSync — bidirectional cloud merge
    sync-provider.ts       # SyncProvider — StorageProvider wrapper with cloud sync
    sync-queue.ts          # SyncQueue — persistent FIFO with retry/backoff
    image-utils.ts         # Screenshot compression (upload) and blob→dataUrl (download)
  stores/
    emulator-store.ts      # Emulator state (status, ROM, speed, volume, error)
    ui-store.ts            # UI state — activePanel, deleteConfirm (implemented)
    library-store.ts       # ROM library — upload, search, CRUD (implemented)
    settings-store.ts      # User settings — key bindings, volume, scanlines, background animation (IndexedDB hydration)
    auth-store.ts          # Auth state, sync lifecycle, SyncProvider setup
  types/                   # GbaButton, InputSource, RomMetadata, StoredRom, SaveState, UploadStatus/Progress types
tests/
  fixtures/                # Test ROM binaries + generator scripts
  *.spec.ts                # Playwright e2e tests (config: playwright.config.ts at root)
```

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
# After upgrading @thenick775/mgba-wasm:
cp node_modules/@thenick775/mgba-wasm/dist/mgba.{js,wasm} public/mgba/
npm run test:e2e     # Playwright e2e tests (Chromium, needs SharedArrayBuffer)
npx tsx tests/fixtures/generate-test-rom.ts  # Regenerate test ROM fixture
```

## Roadmap
- **Touch Layout Customization**: Draggable touch control positioning (not yet implemented).

## Pitfalls to Avoid
- Do NOT use `gbajs`/`gbajs2` — use `@thenick775/mgba-wasm` only
- Do NOT forget COOP/COEP headers
- Do NOT import `@thenick775/mgba-wasm` through webpack/Next.js bundling — Emscripten's pthread workers fail with `_N_E is not defined`. The files are copied to `public/mgba/` and loaded via `Function('return import("/mgba/mgba.js")')()` to bypass webpack. When upgrading mgba-wasm, re-copy `dist/mgba.js` and `dist/mgba.wasm` to `public/mgba/`.
- Do NOT store ROM data in React state — use IndexedDB
- Do NOT render canvas with React re-renders — use refs. The emulator canvas is created imperatively via `document.createElement('canvas')` and moved between desktop/mobile containers with `appendChild`.
- Canvas: 240x160 native, scaled via CSS with `image-rendering: pixelated`
- Audio context must resume after user interaction
- Design mobile-first, NOT desktop-first
- Touch events need `preventDefault()` to avoid double-firing
- Test on real mobile devices, not just devtools resize
- In useEffect cleanup, capture `ref.current` in a local variable before the return — React exhaustive-deps rule requires it
- Do NOT conditionally render elements that carry refs used by ResizeObserver/hooks — `useMediaQuery` SSR-defaults to `isMobile: true`, so conditional returns remove desktop ref targets before hooks attach. Always render ref targets in the DOM and hide with `style={{ display: 'none' }}` instead. This applies to **both** desktop/mobile toggling AND portrait/landscape toggling within mobile — both orientation containers must stay in the DOM.
- Mobile portrait (375px viewport): ~343px usable width after padding. Verify touch control row totals fit before adding elements to a single flex row.
- Do NOT call Zustand store methods inside selectors (e.g. `useStore(s => s.getList())`) — returns new array refs each render, causing infinite loops. Select raw state + `useMemo` instead.
- ESLint in this project rejects underscore-prefixed unused params (`_param`). For stub methods, use `// eslint-disable-next-line @typescript-eslint/no-unused-vars` on the line above.
- mGBA `gameName` property is not in the TypeScript types — access via `(mod as unknown as Record<string, unknown>).gameName`. VFS save state path: `/data/states/{basename}.ss{slot}` where basename = gameName stripped of path + extension.
- When reading VFS files (e.g. save states), MUST copy to a new ArrayBuffer: `new Uint8Array(data).buffer.slice(0)` — WASM shared memory can relocate, making the original reference invalid.
- For `<img>` with data URLs (e.g. save state screenshots), use native `<img>` with `/* eslint-disable-next-line @next/next/no-img-element */` — `next/image` doesn't handle data URLs and `image-rendering: pixelated` is needed.
- To exclude a field during destructuring without triggering unused-var lint, explicitly pick needed fields instead of `{ data: _data, ...rest }` — ESLint rejects underscore prefixes.
- Panel slide directions: Library slides from **left**, Saves slides from **right** — keep visually distinct. New panels should pick a consistent side.
- Save state IDs use deterministic format `${romId}-slot-${slot}` — enables upsert and ID parsing with regex `^(.+)-slot-(\d+)$`.
- CSS Module-scoped `::after` pseudo-elements cannot be toggled by global CSS classes — pass a boolean prop and conditionally apply a module class instead (e.g. `styles.screenScanlines`).
- Desktop SpeedControl is absolutely positioned inside the shell scale wrapper at `top: 244px` (bezel bottom = 239px, D-pad top = 306px).
- Canvas `getContext` is monkey-patched in `useEmulator.ts` to inject `preserveDrawingBuffer: true` for WebGL — DO NOT remove, `toDataURL()` returns black without it.
- Cloud sync: `usePlaytime` persists every 30s while playing, each triggering a sync op via `SyncProvider`. UI indicators for sync status should debounce the "syncing" state (~1s) to avoid constant flicker from these background updates.
- Cloud sync: `SyncProvider` is swapped in as the active `StorageProvider` on sign-in (`setStorageProvider()` in `auth-store.ts`). All storage calls automatically enqueue cloud sync ops — no manual sync triggers needed.
- Cloud sync: Save states synced from cloud are stored locally with `cloudOnly: true` and empty `ArrayBuffer(0)` — binary is lazy-downloaded on first load via `SyncProvider.loadSaveState()`.
- Cloud sync: Supabase Storage paths follow `{userId}/{romId}` for ROMs, `{userId}/{romId}/slot-{n}.ss` for save binaries, `{userId}/{romId}/slot-{n}.jpg` for screenshots.
