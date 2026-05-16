# getaboutit

A free retro-vaporwave arcade at getaboutit.com — **29 classic games**, no signup, no tracking, no build step.

## What this is

GETABOUTIT is the entire identity — domain, arcade name, brand. The home page is the lobby. Each game lives at its own clean URL (`/snake`, `/chess`, `/blackjack`, …) and is fully self-contained.

## Hard constraints

These are non-negotiable for this project:

- **Static site only** — no build, no bundlers, no transpilation
- **Multi-page architecture** — one folder per game; no SPA router
- **No npm dependencies, no frameworks** — vanilla ES6+, Canvas 2D, Web Audio API, localStorage
- **No backend** — all state in localStorage
- **External resources from CDNs only** — Google Fonts for Press Start 2P; anything else needs a strong reason
- **Procedural audio only** — no asset files; tones built from oscillators
- **10-color palette is sacred** — see `--c-*` CSS variables in `shared/core.css`. Only other colors allowed: `#0a0a1e` (bg), `#ffffff` (rare accent), pure black for void.
- **One font** — Press Start 2P; system monospace as pre-load fallback
- **No analytics, no trackers, no telemetry, no ads, no signup, no accounts**
- **Card games render procedurally** — no image assets, no emoji-substitute cards

If a request would break these, push back and propose an alternative.

## Brand system

- **Wordmark**: "GETABOUTIT" — always uppercase, always chromatic aberration (white + `#ff006e` shifted right + `#00f5ff` shifted left)
- **Font**: Press Start 2P (Google Fonts)
- **Palette** (cycle for block colors): `#ff006e #d100d1 #8338ec #3a0ca3 #4361ee #00f5ff #06ffa5 #ffd60a #ff9500 #ef233c`
- **Background**: `#0a0a1e` base; vaporwave outrun horizon on home page

## Architecture

```
/
├── index.html / arcade.css / arcade.js     home page (the lobby)
├── shared/
│   ├── core.css                            palette vars, scanlines, .chrom, .arcade, .hud, .shake, toast, tab
│   ├── core.js                             window.GAI namespace
│   └── shell.js                            auto-mounts back+mute on every game page
├── settings/                               export/import, theme, achievements
├── stack/ snake/ blocks/ p2048/ breakout/ pong/ memory/ minesweeper/
│   flap/ invaders/ asteroids/ simon/ tictactoe/ lightsout/ slide/
│   reaction/ words/ blackjack/ poker/ solitaire/ hearts/ chess/
│   checkers/ sudoku/ connect4/ battleship/ runner/ bubbles/ dots/
│       ├── index.html                      sets window.GAME_KEY, loads core + game
│       ├── style.css                       game-specific layout
│       └── game.js                         self-contained game
├── favicon.svg / manifest.webmanifest / robots.txt / sitemap.xml
├── vercel.json                             cleanUrls + /2048 rewrite + headers
├── og-generator.html / og.png              social share image
└── README.md / CLAUDE.md / plan.md
```

`/2048` is rewritten to `/p2048/` because numeric-leading paths can break some tooling — folder is `p2048/` internally.

## shared/core.js — the GAI namespace

Every game uses `window.GAI`. Highlights:

- `GAI.PALETTE` — array of 10 hex strings
- `GAI.GAME_KEYS / GAME_PATHS / GAME_NAMES / GAME_CATEGORIES` — registry of all 29 games
- `GAI.storage.{get,set,del,getJSON,setJSON}` — try/catch wrapped localStorage
- `GAI.bestScore(key, current)` — read/write best score per game
- `GAI.recordPlay(key)` — increment per-game and total play counts, update streak, push to recently-played
- `GAI.recordWin(key)` — increment win counter, fires achievements
- `GAI.streak.get()` — global play streak object
- `GAI.totalPlays()` / `GAI.gamePlays(key)`
- `GAI.rng(seed)` — mulberry32
- `GAI.todayUTC()` — `YYYYMMDD`
- `GAI.dailySeed(salt)` — stable seed for daily challenges
- `GAI.audio.{ensure,tone,arpeggio,noiseBurst,startPad,stopPad,setMuted,isMuted}`
- `GAI.canvas.fit(canvas, opts)` — DPR-aware fit
- `GAI.input.{tap,swipe,keys}` — input helpers
- `GAI.transition.glitchTo(url)` — 200ms glitch overlay + navigate
- `GAI.shell.init()` — mounts back button + mute button + scanlines + vignette + records play
- `GAI.util.{clamp,lerp,lerpColor,shade,smoothstep}`
- `GAI.fx.{screenShake, particleBurst, chromaticFlash, confetti, outrunBg, roundRect}` — shared visual effects
- `GAI.ui.{splash, gameOver, toast, countdown}` — shared screen builders
- `GAI.cards.{SUITS,RANKS,newDeck,shuffle,handValue,evalPoker,draw,cardBack}` — shared card system
- `GAI.ai.minimax(state, depth, alpha, beta, isMax, opts)` — generic minimax with alpha-beta
- `GAI.achievements.{list,has,unlock,unlocked,check,total}` — achievement system
- `GAI.theme.{get,set,cycle,list}` — default/deepnight/highcontrast
- `GAI.exportData.{dump,load}` — JSON backup/restore of all gai_* keys
- `GAI.cleanup.{on,raf,dispose}` — auto-cleanup helpers (auto-fires on pagehide)

## shared/shell.js

Runs on every game page. Reads `window.GAME_KEY` (set in HTML before `<script>` tags), calls `GAI.shell.init()` which mounts:
- floating ← ARCADE button (top-left)
- floating 🔊/🔇 mute button (top-right)
- `#scanlines` and `#vignette` overlays
- records the play via `GAI.recordPlay(key)`

## Game contract

Every game folder follows this template:

```html
<!-- index.html -->
<link rel="stylesheet" href="/shared/core.css" />
<link rel="stylesheet" href="style.css" />
<script>window.GAME_KEY = 'snake';</script>
<script src="/shared/core.js"></script>
<script src="/shared/shell.js"></script>
<script src="game.js"></script>
```

In `game.js`, never instantiate `AudioContext` at module load — use `GAI.audio.ensure()` on first user gesture.

## Categories

The home page filters by:
- **ARCADE** — Stack, Snake, Blocks, 2048, Breakout, Pong, Flap, Invaders, Asteroids, Bubbles, Runner
- **PUZZLE** — Memory, Minesweeper, Slide, Lights Out, Words, Sudoku, Dots & Boxes
- **BOARD** — Tic Tac Toe, Chess, Checkers, Connect 4, Battleship
- **CARDS** — Blackjack, Poker, Solitaire, Hearts
- **MIND** — Simon, Reaction

## Workflow

- **Commits**: conventional — `feat:`, `fix:`, `chore:`, `style:`, `refactor:`, `docs:`. Present tense, lowercase.
- **Branch**: work on `main`. Small static site, no PR ceremony needed.
- **Do not push** unless asked — only the human pushes. Stage and commit locally.
- **One commit per logical change.**

## Testing

- Local dev: `python3 -m http.server 8000` from the repo root.
- Visit `http://localhost:8000/` for the lobby, then `http://localhost:8000/stack/` etc.
  (Locally you need the trailing slash; Vercel's cleanUrls handles bare paths in prod.)
- Test on actual mobile via Vercel preview URL.

## Common pitfalls

- **AudioContext autoplay**: never instantiate before first gesture; `GAI.audio.ensure()` handles this.
- **Touch + click double-fire**: debounce input ~100ms.
- **Mobile pull-to-refresh**: `overscroll-behavior: contain` on body (already in core).
- **Canvas blur on high-DPR**: use `GAI.canvas.fit()` or scale ctx by DPR yourself.
- **localStorage in private mode**: `GAI.storage.*` already try/catch wrapped.
- **iOS Safari audio**: AudioContext suspends on backgrounding — shell wires `visibilitychange` to resume.

## Cross-game features

- **Daily challenges** — three rotating picks per day (one arcade, one puzzle/board, one card/mind); displayed in `#dailyTrio` + tiles get 🌟
- **Global streak** — `gai_streak_global` (current/max/lastPlayDate)
- **Recently played** — `gai_recent` (5 most recent { key, ts })
- **Surprise me** — picks random game excluding most-recently-played; long-press to cycle category mode
- **Achievements** — 9 unlock IDs in `gai_achievements`; toast on unlock; full list at /settings
- **Themes** — `gai_theme` cycles default/deepnight/highcontrast; trigger by typing "mood" on home or via /settings
- **Konami code** (↑↑↓↓←→←→BA) — toggles `gai_rainbow_unlocked` rainbow mode site-wide
- **`gai` typed on home page** — CRT-collapse effect
- **100+ lifetime plays** — adds ⚡ VETERAN ⚡ tag below the wordmark
- **Royal flush** — adds sticky 👑 to the poker tile after first royal

## Deploy

`main` auto-deploys to Vercel. Custom domains: `getaboutit.com` + `www.getaboutit.com`.
