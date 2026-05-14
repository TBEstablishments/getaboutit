# getaboutit

One-tap stacking game at getaboutit.com. Retro vaporwave aesthetic, single-file architecture, deployed via Vercel.

## What this is

GETABOUTIT is the entire identity — domain, game name, brand. Players tap to drop blocks onto a growing tower. The world progresses from neon outrun horizon → sky → space as the tower climbs.

## Hard constraints

These are non-negotiable for this project:

- **Static site only** — three files: `index.html`, `style.css`, `game.js`
- **No build step, no bundlers, no transpilation** — runs as-is in any modern browser
- **No npm dependencies, no frameworks** — vanilla ES6+ JavaScript
- **No backend** — all state in localStorage
- **External resources OK from CDNs only** — Google Fonts for the pixel font is fine, anything else needs a strong reason
- **Pure Web APIs** — Canvas 2D for game rendering, Web Audio API for sound (procedural, no asset files), `navigator.share` + clipboard for share card

If a request would break these, push back and propose an alternative.

## Brand system

- **Wordmark**: "GETABOUTIT" — always uppercase, always with chromatic aberration (white main + #ff006e shifted +2px right + #00f5ff shifted -2px left)
- **Font**: Press Start 2P (Google Fonts) for all in-game text
- **Palette** (cycling rainbow for block colors):
  - `#ff006e` hot pink
  - `#d100d1` magenta
  - `#8338ec` purple
  - `#3a0ca3` deep purple
  - `#4361ee` blue
  - `#00f5ff` cyan
  - `#06ffa5` teal
  - `#ffd60a` yellow
  - `#ff9500` orange
  - `#ef233c` red
- **Background**: `#0a0a1e` base, vaporwave outrun horizon at ground level
- **Atmosphere**: CRT scanline overlay at ~0.04 opacity

## Files

- `index.html` — meta, OG tags, favicon, fonts, canvas + overlay containers
- `style.css` — overlays, splash, game-over screen, retro buttons, scanlines
- `game.js` — game loop, rendering, input, audio, storage, share card

Anything else (vercel.json, README.md, .gitignore, CLAUDE.md) is project meta and lives at the repo root.

## Workflow

- **Commits**: conventional — `feat:`, `fix:`, `chore:`, `style:`, `refactor:`, `docs:`. Present tense, lowercase.
- **Branch**: work directly on `main`. This is a tiny static site.
- **Do not push** — only the human pushes. Stage and commit locally, leave the push to them.
- **One commit per logical change** — don't pile up sprawling commits.

## Testing

- Local dev: `python3 -m http.server 8000` from the repo root.
- Play to floor 30+ to verify speed scaling, perfect detection, and altitude transitions.
- Test on actual mobile (Vercel preview URL on phone), not just dev tools.

## Common pitfalls to avoid

- **AudioContext autoplay** — never instantiate before first user gesture.
- **Touch + click double-fire** — debounce input by ~100ms.
- **Floating-point drift in alignment** — snap to exact center on perfect drops.
- **localStorage in private mode** — wrap reads/writes in try/catch.
- **Mobile pull-to-refresh** — `overscroll-behavior: contain` on body.
- **Canvas blur on high-DPR** — scale context by `devicePixelRatio`.

## Deploy

`main` auto-deploys to Vercel. Custom domains: `getaboutit.com` + `www.getaboutit.com`.
