# Architecture Decisions

## ADR-001: Emulator Core — @thenick775/mgba-wasm

### Options Considered
1. **gbajs / gbajs2** — Pure JS. Outdated, poor compatibility, unmaintained.
2. **EmulatorJS** — RetroArch to WASM. Massive bundle, opinionated UI, hard to customize.
3. **@thenick775/mgba-wasm** — mGBA to WASM with JS bindings. Powers gbajs3. ✅ CHOSEN

### Why
- Best GBA accuracy (mGBA is the gold standard)
- Clean JS API with TypeScript types
- Built-in save state, fast-forward, volume control
- Actively maintained (v2.4.1+)
- Designed to be embedded in custom UIs

### Trade-offs
- Requires COOP/COEP headers (SharedArrayBuffer)
- ~3MB WASM bundle (lazy load it)
- Threading needs careful Next.js handling

---

## ADR-002: Framework — Next.js with App Router

### Why
- Vercel deployment
- TypeScript + Tailwind out of the box
- Font optimization (Press Start 2P)
- Image optimization for thumbnails
- Good DX

### Note
The emulator page is entirely client-side. Use `'use client'` on emulator components. Configure COOP/COEP in `next.config.js`.

---

## ADR-003: Storage — IndexedDB

ROMs (2-32MB each) and save states (binary ArrayBuffers) are too large for localStorage.

### Schema
```
Database: "retroplay"
  "roms"         — key: romId → { metadata, data: ArrayBuffer }
  "saveStates"   — key: id, index on romId → SaveState
  "settings"     — key: name → value
  "playtime"     — key: romId → { seconds, lastPlayed }
```

Use `idb` library for Promise-based API.

---

## ADR-004: Background — Procedural Canvas

Generate pixel art backgrounds procedurally using Canvas 2D:
- Enables subtle animation (twinkling, drifting)
- No copyright concerns
- Better perf than CSS-animated DOM elements
- Can be themed/randomized

---

## ADR-005: User-Upload Only ROMs

No pre-loaded ROM catalog. Users upload their own .gba files.

**Rationale:**
- Zero legal risk — no ROM distribution
- Simpler architecture — no catalog JSON, no CDN, no fetching
- All data stays local in IndexedDB
- Users have full control over their library

**UX consequence:** The empty state must be compelling and the upload flow must be dead simple (drag-and-drop + file picker, big inviting drop zone).

---

## ADR-006: Mobile-First Responsive

**Desktop is the enhanced version, not the other way around.**

- Base CSS targets mobile (<768px)
- `min-width` media queries add desktop enhancements
- GBA shell is desktop-only; mobile gets fullscreen canvas + touch controls
- Touch controls designed first, keyboard added as enhancement
- All interactive elements ≥ 44×44px touch targets
- Panels are bottom sheets on mobile, slide-outs on desktop
