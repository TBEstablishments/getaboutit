# getaboutit

A free retro-vaporwave arcade at getaboutit.com — **16 classic games**, no signup, no tracking, no build step.

## What this is

GETABOUTIT is the entire identity — domain, arcade name, brand. The home page is the lobby. Each game lives at its own clean URL (`/snake`, `/chess`, `/blackjack`, `/connect4`, …) and is fully self-contained.

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
- **No service workers** (yet)
- **AI engines stay client-side and original** — no Stockfish, no external engines

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
│   ├── core.css                            palette vars, scanlines, .chrom, .arcade, .hud, .shake, toast, tab, play-next, pause, etc
│   ├── core.js                             window.GAI namespace (all subsystems)
│   └── shell.js                            auto-mounts back+mute on every game page
├── stats/                                  /stats dashboard (canvas charts)
├── settings/                               /settings — export/import, theme, achievements
├── stack/ snake/ blocks/ p2048/ breakout/ pong/ flap/
│   invaders/ runner/ slither/ tictactoe/ chess/ checkers/
│   connect4/ blackjack/ solitaire/
│       ├── index.html                      sets window.GAME_KEY, loads core + game
│       ├── style.css                       game-specific layout
│       └── game.js                         self-contained game
├── favicon.svg / manifest.webmanifest / robots.txt / sitemap.xml / humans.txt
├── vercel.json                             cleanUrls + /2048 rewrite + headers
├── og-generator.html                       procedural 16-variant OG image generator
└── README.md / CLAUDE.md / plan*.md / audit*.md
```

`/2048` is rewritten to `/p2048/` because numeric-leading paths can break some tooling — folder is `p2048/` internally.

## shared/core.js — the GAI namespace

Every game uses `window.GAI`. Subsystems:

- `GAI.PALETTE` / `GAME_KEYS` / `GAME_PATHS` / `GAME_NAMES` / `GAME_CATEGORIES` — registry of all 16 games
- `GAI.storage.{get,set,del,getJSON,setJSON}` — try/catch wrapped localStorage
- `GAI.bestScore(key, current)` / `GAI.recordPlay(key)` / `GAI.recordWin(key)`
- `GAI.streak.get()` / `GAI.totalPlays()` / `GAI.gamePlays(key)`
- `GAI.rng(seed)` / `GAI.todayUTC()` / `GAI.dailySeed(salt)`
- `GAI.audio.{ensure,tone,arpeggio,noiseBurst,startPad,stopPad,setMuted,isMuted}`
- `GAI.canvas.fit(canvas, opts)`
- `GAI.input.{tap,swipe,keys,drag}` — drag is unified mouse+touch
- `GAI.haptic(pattern)` / `GAI.haptics = { TAP, DOUBLE, HEAVY, BOOST, ERROR }`
- `GAI.transition.glitchTo(url)`
- `GAI.shell.init()`
- `GAI.util.{clamp,lerp,lerpColor,shade,smoothstep}`
- `GAI.fx.{screenShake, particleBurst, chromaticFlash, confetti, outrunBg, roundRect, fireworks, scanlineSweep, ripple}`
- `GAI.ui.{splash, gameOver, toast, countdown, pause, shareCard, playNext}`
- `GAI.cards.{SUITS, RANKS, newDeck, shuffle, handValue, evalPoker, draw, cardBack}`
- `GAI.dice.{roll, drawDie, rollWithAnim}`
- `GAI.text.{measure, wrap, drawChromatic}`
- `GAI.path.{bezier, ease, lerp, distance}`
- `GAI.ai.{minimax, mcts}`
- `GAI.achievements.{list, has, unlock, unlocked, check, total}`
- `GAI.theme.{get, set, cycle, list}`
- `GAI.exportData.{dump, load}`
- `GAI.cleanup.{on, raf, dispose}` — auto-fires on pagehide
- `GAI.pins.{get, toggle, has, max}` — pinned games (max 5)
- `GAI.blitz.{isOn, set}` — per-game blitz mode toggle
- `GAI.stats.{sessionStart, sessionEnd, timeFor, dailyCounts}` — session time tracking
- `GAI.welcomeBack()` — toast on return after 24h+

## shared/shell.js

Runs on every game page. Reads `window.GAME_KEY`, calls `GAI.shell.init()`, which mounts:
- floating ← ARCADE button (top-left)
- floating 🔊/🔇 mute button (top-right)
- `#scanlines` and `#vignette` overlays
- records the play via `GAI.recordPlay(key)`

## Game contract

Every game folder:

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

Opt-in patterns (recommended in new games):
- Call `GAI.stats.sessionStart(key)` at boot and `GAI.stats.sessionEnd(key)` on `pagehide`
- Append `GAI.ui.shareCard({title, score, best, color, key, label})` buttons + `GAI.ui.playNext(key, container)` to the game-over screen
- Use `GAI.input.drag` for drag-based input (e.g. solitaire)
- Use `GAI.ai.minimax` or `GAI.ai.mcts` for AI opponents
- Use `GAI.dice.drawDie` / `GAI.dice.rollWithAnim` for any dice rendering

## Categories (3)

- **ARCADE** (10) — Stack, Snake, Blocks, 2048, Breakout, Pong, Flap, Invaders, Runner, Slither
- **BOARD** (4) — Tic Tac Toe, Chess, Checkers, Connect 4
- **CARDS** (2) — Blackjack, Solitaire

## Workflow

- **Commits**: conventional — `feat:`, `fix:`, `chore:`, `style:`, `refactor:`, `polish:`, `docs:`, `perf:`, `a11y:`, `mobile:`. Present tense, lowercase.
- **Branch**: work on `main`. Small static site, no PR ceremony needed.
- **Do not push** unless asked — only the human pushes. Stage and commit locally.
- **One commit per logical change.**

## Testing

- Local dev: `python3 -m http.server 8000` from the repo root.
- Visit `http://localhost:8000/` for the lobby, then `http://localhost:8000/stack/` etc.
- Test on actual mobile via Vercel preview URL.

## Common pitfalls

- **AudioContext autoplay**: never instantiate before first gesture; `GAI.audio.ensure()` handles this.
- **Touch + click double-fire**: debounce input ~100ms (or use `GAI.input.tap` which already debounces).
- **Mobile pull-to-refresh**: `overscroll-behavior: contain` on body (already in core).
- **Canvas blur on high-DPR**: use `GAI.canvas.fit()` or scale ctx by DPR yourself.
- **localStorage in private mode**: `GAI.storage.*` already try/catch wrapped.
- **iOS Safari audio**: AudioContext suspends on backgrounding — shell wires `visibilitychange` to resume.
- **AI search blocking UI**: wrap top-level minimax/mcts in `setTimeout(0)` so the "AI THINKING…" status paints first.

## Cross-game features

- **Daily challenges** — 3-game rotation per day, one per major category
- **Pinned games** — long-press / right-click any tile (max 5; persisted in `gai_pinned`)
- **Search** — `/` to focus search input on home; filters by name/tag/key
- **Sort-by-plays** — ALL tab orders tiles by play count
- **Streak** — `gai_streak_global` (current/max/lastPlayDate)
- **Recently played** — `gai_recent` (5 most recent)
- **Surprise me** — random; long-press cycles category mode
- **Achievements** — 9 unlock IDs in `gai_achievements`; toast on unlock; full list at `/settings` and `/stats`
- **Stats** — `/stats` page: per-game best, time played, daily plays chart, most played chart, achievement grid
- **Themes** — `gai_theme` (default | deepnight | highcontrast); type "mood" or use `/settings`
- **Export / import scores** — JSON backup at `/settings`
- **Share cards** — `GAI.ui.shareCard` generates 1080×1920 PNG; opt-in per game in game-over
- **Play next** — `GAI.ui.playNext` appends 3 same-category tiles to game-over
- **Blitz mode** — `GAI.blitz.set(key, on)`; some games (snake) expose a splash toggle
- **Welcome back** — fires on home after 24h+ absence
- **Konami code** (↑↑↓↓←→←→BA) — toggles `gai_rainbow_unlocked`
- **`gai` typed on home** — CRT-collapse effect
- **100+ lifetime plays** — adds ⚡ VETERAN ⚡ tag below the wordmark

## Per-game OG images

`og-generator.html` renders one 1200×630 OG per game procedurally. Open it in a browser, click SAVE ALL, drop the 16 PNGs into `/og/`, then update each game's index.html OG meta to reference `https://getaboutit.com/og/<key>.png`. (Not done yet for individual game pages — they currently share the home `og.png`.)

## Deploy

`main` auto-deploys to Vercel. Custom domains: `getaboutit.com` + `www.getaboutit.com`.
