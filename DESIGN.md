# DESIGN.md — getaboutit canonical design spec

## Table of contents

- [0 · Preamble](#0--preamble)
- [1 · The brand](#1--the-brand)
  - [1.1 · Wordmark](#11--wordmark)
  - [1.2 · The 10-color palette](#12--the-10-color-palette)
  - [1.3 · The chromatic aberration rule](#13--the-chromatic-aberration-rule)
  - [1.4 · Typography — Press Start 2P + monospace fallback](#14--typography--press-start-2p--monospace-fallback)
  - [1.5 · Iconography — pixel icon set, joystick mark, favicon rule](#15--iconography--pixel-icon-set-joystick-mark-favicon-rule)
  - [1.6 · The five signature moves](#16--the-five-signature-moves)
- [2 · The three modes](#2--the-three-modes)
  - [2.1 · The Floor](#21--the-floor)
  - [2.2 · The Cabinet](#22--the-cabinet)
  - [2.3 · The Lobby](#23--the-lobby)
  - [2.4 · Mode crossover rules](#24--mode-crossover-rules)
- [3 · Per-game accent registry](#3--per-game-accent-registry)
- [4 · The Floor specifics](#4--the-floor-specifics)
  - [4.1 · Outrun horizon spec](#41--outrun-horizon-spec)
  - [4.2 · Tile state taxonomy](#42--tile-state-taxonomy)
  - [4.3 · Daily challenges surface](#43--daily-challenges-surface)
  - [4.4 · Search interaction](#44--search-interaction)
  - [4.5 · Empty states](#45--empty-states)
  - [4.6 · Wordmark entrance + breathing](#46--wordmark-entrance--breathing)
- [5 · The Cabinet specifics](#5--the-cabinet-specifics)
  - [5.1 · Per-game contract](#51--per-game-contract)
  - [5.2 · CRT power-on ceremony](#52--crt-power-on-ceremony)
  - [5.3 · Pause + how-to overlays](#53--pause--how-to-overlays)
  - [5.4 · Game Over screen](#54--game-over-screen--gaiuigameover)
  - [5.5 · Share card](#55--share-card)
  - [5.6 · Per-game bezel + accent rendering](#56--per-game-bezel--accent-rendering)
- [6 · The Lobby specifics](#6--the-lobby-specifics)
  - [6.1 · The Golden Ticket — visual spec](#61--the-golden-ticket--visual-spec)
  - [6.2 · The Reveal Ceremony — storyboard](#62--the-reveal-ceremony--storyboard)
  - [6.3 · The Player Card — visual spec](#63--the-player-card--visual-spec)
  - [6.4 · Card customization rules](#64--card-customization-rules)
  - [6.5 · /p/&lt;handle&gt; public page](#65--phandle-public-page)
  - [6.6 · Leaderboards](#66--leaderboards)
  - [6.7 · Friend addition flow](#67--friend-addition-flow)
  - [6.8 · Handle validation](#68--handle-validation)
- [7 · Motion & feel](#7--motion--feel)
  - [7.1 · Timing curves](#71--timing-curves)
  - [7.2 · Toast positions + durations](#72--toast-positions--durations)
  - [7.3 · prefers-reduced-motion behavior](#73--prefers-reduced-motion-behavior)
- [8 · Sound design](#8--sound-design)
  - [8.1 · The 10-tone sound palette](#81--the-10-tone-sound-palette)
  - [8.2 · Sound-surface mapping](#82--sound-surface-mapping)
  - [8.3 · Sound grammar rules](#83--sound-grammar-rules)
- [9 · Effects vocabulary](#9--effects-vocabulary)
  - [9.1 · Scanlines · vignette · chromatic aberration · glitch · breathe](#91--scanlines--vignette--chromatic-aberration--glitch--breathe)
  - [9.2 · Where each is allowed, where forbidden](#92--where-each-is-allowed-where-forbidden)
- [10 · Theme variants](#10--theme-variants)
- [11 · Stats + Settings surfaces](#11--stats--settings-surfaces)
  - [11.1 · Stats page](#111--stats-page-stats)
  - [11.2 · Settings sections](#112--settings-sections-visitor--player)
- [12 · OG card system](#12--og-card-system)
- [13 · Mobile breakpoints + touch behavior](#13--mobile-breakpoints--touch-behavior)
- [14 · Forbidden moves](#14--forbidden-moves)
- [15 · Easter eggs](#15--easter-eggs)
- [16 · Living document conventions](#16--living-document-conventions)

---

## 0 · Preamble

DESIGN.md is the canonical visual + interaction spec for getaboutit.com — the source of truth for how the arcade looks, feels, sounds, and behaves. `CLAUDE.md` covers architecture. `README.md` covers what's playable. This file covers everything about how it looks and feels doing it.

Living document. Updated when decisions explicitly change in planning chats, never via PR-comment drift. Open questions are marked `> TBD`. Change history is not tracked here — `git log` is authoritative.

Companion: `BRAND.md` (elevator-pitch version).

---

## 1 · The brand

### 1.1 · Wordmark

GETABOUTIT. **Always uppercase. Always chromatic.** White center, `#ff006e` pink offset 2px right, `#00f5ff` cyan offset 2px left. Press Start 2P, set via `--font-arcade`.

On home (and other hero contexts) breathes at ~0.125Hz via the `chromBreathe` keyframe — **8s `ease-in-out` infinite** (cited from `shared/core.css` line 72). The keyframe is *not* a simple sine pulse: it runs four 0.5Hz "breaths" (±0.3px ↔ ±0.8px) and then a brief 200ms pulse near the end (85% mark) that spikes to ±3px and immediately settles.

At ≤32px size, chromatic offset collapses to mud — substitute monochrome white-on-bg "G" or use the joystick mark (see [§1.5](#15--iconography--pixel-icon-set-joystick-mark-favicon-rule)).

### 1.2 · The 10-color palette

Sacred. Never alter, never add:

| Token | Hex | Name |
|---|---|---|
| `--c-pink`       | `#ff006e` | pink |
| `--c-magenta`    | `#d100d1` | magenta |
| `--c-purple`     | `#8338ec` | purple |
| `--c-deeppurple` | `#3a0ca3` | deep purple |
| `--c-blue`       | `#4361ee` | blue |
| `--c-cyan`       | `#00f5ff` | cyan |
| `--c-teal`       | `#06ffa5` | teal |
| `--c-yellow`     | `#ffd60a` | yellow |
| `--c-orange`     | `#ff9500` | orange |
| `--c-red`        | `#ef233c` | red |

Plus `--c-bg` `#0a0a1e` (background), `--c-bg-deep` `#05050f` (vignette/inner-frame floor), `#ffffff` sparingly, pure black only for void.

`#ffd60a` yellow is the **celebration verb** — reserved for wins, achievements, top-3 ranks, gold-tier frames, "+NEW BEST" tags, daily-done ribbons, Ticket trim. Don't dilute for ordinary UI accent.

Never use two adjacent palette colors at the same scale within a single tile/panel/surface — pick one primary, one secondary, max.

### 1.3 · The chromatic aberration rule

The brand signature, but it costs clarity.

**Allowed on:** wordmark (≥64px), h1 headlines (≥24px), Game Over titles, Ticket recovery phrase words, Card title + handle.

**Forbidden on:** body copy, tile labels in the grid, leaderboard rank numbers, in-game score displays, anything <32px.

Standard offset 2px; at hero scales offset scales as `floor(fontSize / 32)` px.

`prefers-reduced-motion: reduce` clamps offset to 1px. In the `highcontrast` theme the offset stays at 3px (no animation) — see `body.theme-highcontrast .chrom` in core.css.

### 1.4 · Typography — Press Start 2P + monospace fallback

Two fonts only:

```css
:root {
  --font-arcade: 'Press Start 2P', 'Courier New', monospace;
  --font-body: ui-monospace, 'SFMono-Regular', Menlo, Consolas,
               'Liberation Mono', 'DejaVu Sans Mono', monospace;
}
```

**Arcade font (Press Start 2P)** — wordmark, h1–h3, tile labels, score numbers, button text, leaderboard rank, badge tokens, achievement names, nav items, scoring overlays, splash screens, any text that's a label/number/chrome element ≤8 words.

**Body font (system monospace)** — paragraphs, FAQ answers, settings descriptions, /about prose, any continuous sentence longer than 8 words. Render at 14–16px with `line-height: 1.7`, `letter-spacing: 0.02em`.

**Bright line:** sentence → body font. Label or number → arcade font. No exceptions.

> TBD — Today every game page sets `font-family: 'Press Start 2P', 'Courier New', monospace` globally on `html, body` (core.css line 21). A future pass needs to either (a) introduce a `<p>` / `.body-text` reset to `--font-body`, or (b) keep arcade font globally and let body copy opt-in via class. Pick one before /about or settings prose grows further.

### 1.5 · Iconography — pixel icon set

**Full pixel-icon system. Replaces all emoji.** Sprited inline in `shared/icons.svg` (to be created in a later phase) as `<symbol id="i-NAME" viewBox="0 0 16 16">…</symbol>` blocks, referenced via `<svg><use href="#i-NAME"/></svg>`. All 16×16, explicit pixel-aligned `<rect>` elements, recolor-able via `currentColor`.

| ID | Form | Used for |
|---|---|---|
| `i-die` | 12×12 isometric die, palette pips | Surprise me; rolls (4-frame anim) on hover on home only |
| `i-pin` | 10×10 thumbtack, pink head | Pinned-tile overlay |
| `i-joystick` | 14×14 isometric joystick, black base + red ball | Secondary brand mark; favicon at ≤32px; hero badge |
| `i-flame-1` | 8×10 small flame, yellow/orange/red | Streak tier 1 (1–6 days) |
| `i-flame-2` | 8×10 flame with 1px chromatic offset | Streak tier 2 HOT (7–29 days) |
| `i-flame-3` | 12×14 twin chromatic flame | Streak tier 3 BLAZING (30+ days) |
| `i-speaker-on` | 10×10 speaker + 3 sound-wave pixels | Audio on |
| `i-speaker-off` | 10×10 speaker + X | Audio muted |
| `i-rainbow` | 8-step horizontal rainbow strip | Konami unlock indicator |
| `i-spark` | 6×6 four-point star, cyan+white | Achievement count badge |
| `i-crown` | 10×8 crown, gold + purple shadow | Royal flush sticky on Poker tile |
| `i-29` | rendered "29" chromatic | Cribbage perfect-hand sticky |
| `i-chevron-left` | 8×8 chevron, white | Back-to-arcade button |
| `i-ticket` | 12×8 chamfered rect, deep-purple + gold trim | Card footer ticket-toggle indicator |
| `i-trophy` | 10×12 trophy, gold | Leaderboard rank #1 |
| `i-medal-silver` | 10×10 medal, silver | Leaderboard rank #2 |
| `i-medal-bronze` | 10×10 medal, bronze | Leaderboard rank #3 |
| `i-player` | 8×10 silhouette head+shoulders | Player indicator |
| `i-friend` | Two overlapping `i-player` | Friend list rows |
| `i-eye` | 8×6 eye + pupil | Privacy / visibility toggle |

Icons stay static by default. Exceptions: `i-die` rolls on home hover; `i-flame-*` pulses near the wordmark when current streak is active.

**Favicon rule:** chromatic G collapses below 32px → `favicon.ico` uses `i-joystick` (recommended) or a monochrome white-on-bg pixel "G".

### 1.6 · The five signature moves

The moves that distinguish getaboutit.com from generic vaporwave-arcade. Lock #1–3 as foundational. #4 and #5 are Phase 1 (Polish) targets.

1. **The breathing wordmark.** GETABOUTIT chromatic on home breathes at 0.125Hz — `chromBreathe`, 8s ease-in-out infinite (core.css:72). Same curve everywhere the wordmark renders at hero scale.

2. **Game-owned color identity.** Every game has a sworn primary + secondary accent from the palette (see [§3](#3--per-game-accent-registry), the 16-row registry). The accent appears on home tile, in-cabinet bezel, Card top-3 display, OG card, achievement badge, and leaderboard rank when the player tops it. Color → game mapping develops over repeat plays.

3. **The deterministic pixel signature.** Every Golden Ticket has a unique pixel-grid pattern derived from the phrase hash. Same phrase, same pattern, forever. A 4-pixel vertical slice of that pattern travels onto: Card frame inner edge, leaderboard row marker, Player OG card.

4. **The reactive horizon.** Outrun horizon parallaxes 8px max — mouse position on desktop, device gyro on mobile (opt-in prompt). Subtle, below conscious perception until you notice.

5. **The CRT power-on ceremony.** Every game launch, first time per session per game (localStorage `gai_crt_<key>`), gets a ~600ms CRT power-on: screen pinches to a 4px horizontal line, vertical scanlines sweep down, then the game appears. Sound: RISE ([§8.1](#81--the-10-tone-sound-palette)). Once per session per game so it never wears out.

---

## 2 · The three modes

### 2.1 · The Floor

Home, /about, /arcade, category landings. Public, vaporwave-maximal layer.

- Outrun horizon ([§4.1](#41--outrun-horizon-spec)) at bottom 50% of viewport
- `#0a0a1e` solid above the horizon
- Scanlines sitewide overlay: 1px-on / 2px-off overlay @ `rgba(255,255,255,0.04)`, `mix-blend-mode: overlay` (core.css:46–54). `theme-deepnight` raises layer opacity to 0.5; `theme-highcontrast` hides scanlines entirely.
- Vignette sitewide overlay: radial gradient — transparent at 55%, `rgba(0,0,0,0.45)` at 100% (core.css:57). `theme-deepnight` raises outer ring to 0.65; `theme-highcontrast` hides the vignette.
- Wordmark breathing at hero scale on /, smaller on /about
- Tile grid uses each game's primary accent ([§3](#3--per-game-accent-registry))
- All 10 colors visible in the grid — only mode where the full palette appears simultaneously

Sound: TAP on tile hover, PICK on activate, TICK on tab switch. No ambient bed by default (toggleable in /settings → `floor_ambient_on`, default OFF).

### 2.2 · The Cabinet

Per-game pages (`/<game-key>`). Focused, game-specific layer.

- Scanlines + vignette **stay** (the anchor — never lose them)
- Horizon **removed**
- Palette narrows to: game's primary + bg + white + game's secondary
- Primary accent dominates: bezel, score color, particle spark, splash accent, game-over panel border, RETRY button bg
- Wordmark only at splash + game-over title (not persistent in-game)

Sound: RISE on power-on (once per session per game), game's own audio, FALL on back-to-arcade, optional HUM ambient (off by default, toggleable in pause overlay).

### 2.3 · The Lobby

Cards, Tickets, leaderboards, friends. Routes: `/p/<handle>`, `/leaderboard/<game-key>`, `/friends`. Social, gold-accented layer.

- Scanlines + vignette stay
- Horizon stays but **desaturated** (60% saturation, dimmer)
- `#ffd60a` yellow is the celebration verb: top-3 ranks, achievement frames, Ticket trim, gold-tier Card border, "MASTER" titles, +NEW tags
- Pink/cyan/teal still appear; yellow is the highlight

Sound: FLIP on Ticket reveal (one per word), TICK on every leaderboard rank update, WIN_HI on achievement unlock, PICK on Card section interactions, FLIP on theme/frame change.

### 2.4 · Mode crossover rules

- **Floor → Cabinet** — `GAI.transition.glitchTo(url)` runs the `page-glitch` overlay (`pageGlitch` keyframe, 0.22s steps(4, end) — core.css:190) and navigates at 200ms (core.js:446), then CRT power-on fires if first-of-session for that game
- **Cabinet → Floor** — back button: FALL sound, scanline collapse-up 200ms, Floor re-renders
- **Floor → Lobby** — fade-through 300ms (no glitch; the Lobby is a social space, softer transition)
- **Lobby → Floor** — fade-through reversed
- **Cabinet → Lobby** — never direct; must route through Floor (games are events, the Lobby is a state)

---

## 3 · Per-game accent registry

| # | Game | Primary | Secondary | Logic |
|---|---|---|---|---|
| 1 | Stack | palette cycle | `#ffffff` | Each block uses next palette color; white = lost-edge trim |
| 2 | Snake | `#06ffa5` teal | `#ef233c` red | Green snake, red apple. Sacred. |
| 3 | Blocks | per-piece | `#ffffff` | I=cyan O=yellow T=purple S=green Z=red L=orange J=blue; white = ghost + line-clear |
| 4 | 2048 | `#ff9500` orange | `#ffd60a` yellow | Heat ramp orange→gold to the winning 2048 |
| 5 | Breakout | row palette cycle | `#ffffff` | Brick rows cycle warm→cool top-to-bottom; paddle/ball white |
| 6 | Pong | `#ffffff` white | `#00f5ff` cyan | White paddles, cyan court line. Sacred. |
| 7 | Flap | `#ffd60a` yellow | `#06ffa5` teal | Yellow bird, teal pipes |
| 8 | Invaders | `#06ffa5` teal | `#ef233c` red | Alien teal-green, red explosion. Pure 1978. |
| 9 | Runner | `#ff9500` orange | `#ff006e` pink | The vaporwave-sunset game — orange runner, pink sky |
| 10 | Slither | `#8338ec` purple | `#06ffa5` teal | Deeper purple distinguishes from Snake; teal orbs |
| 11 | Tic Tac Toe | `#00f5ff` cyan | `#ff006e` pink | Cyan X, pink O. Maximum chromatic. |
| 12 | Chess | `#4361ee` blue | `#ffd60a` gold | Royal blue board, gold king accent |
| 13 | Checkers | `#ef233c` red | `#4361ee` blue | Red vs blue checkers, gold crown on kings |
| 14 | Connect 4 | `#ffd60a` yellow | `#ef233c` red | Classic yellow + red discs |
| 15 | Blackjack | `#06ffa5` teal | `#ffd60a` gold | Teal felt, gold chip on 21 |
| 16 | Solitaire | `#4361ee` blue | `#ef233c` red | Classic Windows-Solitaire blue callback, red suits |

Family note: Blue primary on Chess and Solitaire is an emergent "thinking family" — a feature, not a bug.

---

## 4 · The Floor specifics

### 4.1 · Outrun horizon spec

Below the horizon line at viewport-center-Y:
- 1px sun-disc at horizon center, `#ff006e`
- 12-line grid in alternating `#ff006e` and `#00f5ff`, perspective-converging to the sun
- Background gradient `#3a0ca3` (horizon) → `#0a0a1e` (bottom)
- Rendered via canvas, animated via `GAI.fx.outrunBg`

Above the horizon:
- Solid `#0a0a1e`
- 8 small white pixels at fixed deterministic-seeded positions as stars

Parallax (Signature Move #4):
- Desktop: `transform: translate3d(x, y, 0)` where `x = (mouseX - vCenterX) / 80`, `y = (mouseY - vCenterY) / 160`. Max ±8px.
- Mobile: same math via `deviceorientation` gamma/beta. Opt-in prompt on first mobile visit, persisted.
- `prefers-reduced-motion` → parallax disabled, horizon static.

On `/arcade` et al category landings, horizon saturation drops to 60%.

### 4.2 · Tile state taxonomy

Seven states, can stack:

- **Default** — bg in game's primary accent at 100% saturation, label white, 0.5px white border @ 30%, mini-preview canvas rendered onto tile. Subtle vertical gradient accent → accent×0.7 at bottom.
- **Hover** (mouse only) — border to 60%, 1px chromatic offset on label, TAP sound on enter, scale 1.02. Touch skips this state. (Current implementation lifts via `translateY(-4px)` and a 2px `currentColor` ring at `transition: transform/box-shadow/background 0.15s ease` — arcade.css:157,162. The 1.02 scale + chromatic label nudge are Phase 6 polish targets.)
- **Active** (pressed) — scale 0.96, accent shifts 1.1× brightness, PICK sound, then `glitchTo()` begins.
- **Pinned** — 8×8 `i-pin` overlay top-right.
- **Recently-played** — 1px gold border replaces 0.5px white border.
- **Daily-challenge** — gold "DAILY" ribbon top-left (60×10), plus daily-seed 2-pixel hash strip along bottom edge. After play: ribbon → "✓ DONE" with score below.
- **Achievement-unlocked sticky** — small unique badge top-left (8×8), one per earned achievement.

States stack without colliding (a pinned + daily + recently-played tile shows all three simultaneously).

### 4.3 · Daily challenges surface

Home section "TODAY'S CHALLENGES" — three rotating challenges, one per major category (arcade / board / card).

Each tile uses the regular game tile + Daily-challenge state overlays (per [§4.2](#42--tile-state-taxonomy)). Above the section, a small `DAILY SEED · YYYY.MM.DD` 8-pixel hash visualization confirms the seed is shared globally.

After completing all 3 today: section header morphs to "✓ DAILY DONE · COME BACK TOMORROW" in gold + 3-flame pulse animation. Streak counter increments.

### 4.4 · Search interaction

`/` focuses search input on home. Filters tile grid live. Matching tiles bright; non-matches drop to 30% opacity (NEVER hidden — spatial memory preserved). `ESC` clears + closes. `Enter` activates the top match.

Sort indicator chip near input: `SORT: PLAYS` (default) · `SORT: A→Z` · `SORT: RECENT` · `SORT: CATEGORY`. Tap to cycle. Persisted in `gai_sort_mode`.

### 4.5 · Empty states

Never render an empty header — always include encouraging copy + a 1-action CTA:

- **No pins** — "PIN YOUR FAVORITES · long-press any game to pin · max 5" with `i-pin` at 16px
- **No recently played** — "JUST START PLAYING · your last 5 games appear here"
- **No streak** — wordmark shows "🔥 0 DAY STREAK" where flame is a single grey pixel. First play today → animates to small yellow flame with FLIP sound
- **Stats, 0 plays** — "NOTHING TO STAT YET · open a game · come back to see your numbers" + ghost-faded chart axis
- **No friends (Lobby)** — "FIND A PLAYER · every player has a /p/<handle> link · paste one here" + paste-target input
- **Visitor visits /p/<own>** — "YOU'RE A VISITOR · claim a handle · get a Ticket"

### 4.6 · Wordmark entrance + breathing

First-ever visit: `body.entrance` class set, `wmEnter` animation plays once — **0.85s cubic-bezier(.2,.7,.2,1) both** (arcade.css:308,315). The keyframe fades opacity 0→1 and pulls a `±8px` chromatic offset back down to the standard `±2px` while scaling from 0.94→1.0.

On `animationend`: **remove the `body.entrance` class** so `chromBreathe` takes over. This fixes the Phase 4 known-issue where entrance froze and breathing never started.

> TBD — The `animationend` → class-removal hook is not yet wired in `arcade.js`. Phase 6 implementation target. Until then, `body.entrance` persists and the wordmark's breathing is dormant on first visit; manual refresh restores breathing because the entrance class isn't reapplied on subsequent loads.

Subsequent visits: skip entrance, straight to breathing.

`prefers-reduced-motion` → entrance is a 200ms fade; breathing static (covered by `.chrom-jitter { animation: none !important; }` in the existing core.css media query at line 239).

---

## 5 · The Cabinet specifics

### 5.1 · Per-game contract

Every game folder (`/<game-key>/`) must export:

```js
window.GAME_KEY = '<key>';
// In game.js:
function renderPreview(ctx, w, h) {
  // Single-frame static preview for home tile grid. Must complete <16ms.
}
function howTo() {
  return {
    title: 'HOW TO PLAY',
    body: '...',  // ≤80 words plain text
    controls: [
      { keys: ['ARROWS', 'WASD'], action: 'move' },
      { keys: ['SPACE'], action: 'fire' }
    ]
  };
}
```

Plus: `index.html` loads `shared/core.css`, `shared/core.js`, `shared/shell.js`, then `game.js`. Sets `window.GAME_KEY` before loading core.js.

### 5.2 · CRT power-on ceremony

Every game launch, first time per session per game (localStorage flag `gai_crt_<key>`):
- 0–80ms: viewport pinches to 4px horizontal white line
- 80–200ms: pinch holds, scanlines sweep down across new page
- 200–400ms: vertical expand to full viewport, game canvas appears
- 400–600ms: 6px chromatic offset settles to 0
- Sound: RISE at 0ms ([§8.1](#81--the-10-tone-sound-palette))

After ceremony, set `gai_crt_<key> = 1` (cleared on tab close via `sessionStorage` if using session-scoped behavior). Subsequent launches in the same session skip the ceremony.

`prefers-reduced-motion` → 0ms cut.

### 5.3 · Pause + how-to overlays

Trigger: `P` or `ESC` key, or pause button (mounted by `shell.js`). Black scrim @ 60%, centered panel: "PAUSED" in chromatic, buttons `[RESUME]` `[QUIT]` `[HUM ON/OFF]` `[MUTE]` `[HOW TO PLAY]`. Resume on `P` again, ESC, or scrim tap.

How-to-play overlay: triggered from pause. Reads game's `howTo()` return. Arcade font for title, body font for instructions, arcade font for control keys.

### 5.4 · Game Over screen — `GAI.ui.gameOver`

Overlay layout:
- Black scrim 80% over game canvas
- 320×500 centered panel with 2px game-primary-accent border
- "GAME OVER" or "YOU WIN" at top — 18px chromatic title with **game's primary accent as the center fill** (not white)
- SCORE row: label 11px white@50%, value 32px chromatic white
- BEST row: shows current best; if just beat it, append "+NEW" in gold
- Action row: `[RETRY]` `[SHARE]` 44px-tall, equal width, bg = game's primary accent
- Play-next strip: "PLAY NEXT" 11px label + 3 mini-tiles 80×80 of same-category games in their accents
- Footer: `i-chevron-left` + "ARCADE"

Motion: 200ms slide-up + scrim-fade in; 150ms each out. Sound: WIN_HI on victory, WIN_LO on loss.

> TBD — Today `GAI.ui.gameOver` (core.js:745) toggles `.hidden` (display:none/block) with no transition. The 200ms slide-up + scrim fade is a Phase 6 polish target; until then game-over snaps in.

### 5.5 · Share card

`GAI.ui.shareCard({title, score, best, color, key, label})` generates 1080×1920 PNG via offscreen canvas:
- GETABOUTIT chromatic wordmark top, 80px
- Game name in chromatic, 64px, game's primary accent
- "SCORE" label small, score value 256px chromatic white
- "BEST" label + value smaller
- Vertical bar on left edge in game's primary accent
- Tile preview at 4× scale + `getaboutit.com/<key>` URL at bottom
- Scanlines + chromatic noise overlay

Render ~500ms with "GENERATING…" overlay. Result slides up from bottom 200ms ease-out, PICK sound, tap-outside dismisses.

### 5.6 · Per-game bezel + accent rendering

Each game's `style.css` MUST use the game's primary accent ([§3](#3--per-game-accent-registry)) for:
- Score display color
- Splash header chromatic center fill (instead of white)
- Game-over panel border (2px game-accent)
- RETRY button background
- Sparks / particle effects where appropriate
- Achievement-unlock flash within this game

Secondary accent for: alternate state, hit/miss feedback, opponent color (2-player games), highlight on key element.

---

## 6 · The Lobby specifics

### 6.1 · The Golden Ticket — visual spec

<svg viewBox="0 0 680 720" xmlns="http://www.w3.org/2000/svg" role="img" style="max-width:400px;display:block;margin:1rem auto;">
<title>Golden Ticket mockup</title>
<desc>Digital arcade ticket with chromatic GETABOUTIT wordmark, serial GAI Y26 00042, four-word recovery phrase TIGER NEON ORBIT STACK, and an 8x4 pixel signature grid. Yellow trim, deep purple gradient background, scanline overlay, chamfered top-right corner.</desc>
<defs>
<linearGradient id="tBg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#3a0ca3"/>
<stop offset="40%" stop-color="#1a0a3e"/>
<stop offset="100%" stop-color="#0a0a1e"/>
</linearGradient>
<pattern id="tScan" width="20" height="3" patternUnits="userSpaceOnUse">
<rect width="20" height="1" fill="#ffffff" opacity="0.06"/>
</pattern>
<clipPath id="tClip">
<path d="M 200 30 L 460 30 L 480 50 L 480 690 L 200 690 Z"/>
</clipPath>
</defs>
<rect width="680" height="720" fill="#0a0a1e"/>
<g clip-path="url(#tClip)">
<rect x="200" y="30" width="280" height="660" fill="url(#tBg)"/>
<rect x="200" y="30" width="280" height="660" fill="url(#tScan)"/>
</g>
<path d="M 204 34 L 458 34 L 476 52 L 476 686 L 204 686 Z" fill="none" stroke="#ffd60a" stroke-width="1.5" opacity="0.85"/>
<g font-family="ui-monospace, monospace" font-weight="700" font-size="20" letter-spacing="2">
<text x="342" y="92" text-anchor="middle" fill="#ff006e">GETABOUTIT</text>
<text x="338" y="92" text-anchor="middle" fill="#00f5ff">GETABOUTIT</text>
<text x="340" y="92" text-anchor="middle" fill="#ffffff">GETABOUTIT</text>
</g>
<text x="340" y="116" text-anchor="middle" fill="#00f5ff" font-family="ui-monospace, monospace" font-size="11" letter-spacing="5">ARCADE TICKET</text>
<line x1="225" y1="140" x2="455" y2="140" stroke="#ffd60a" stroke-width="0.5" opacity="0.4" stroke-dasharray="3,3"/>
<text x="225" y="166" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">SERIAL №</text>
<text x="225" y="192" fill="#ffd60a" font-family="ui-monospace, monospace" font-size="16" letter-spacing="2" font-weight="700">GAI · Y26 · 00042</text>
<text x="225" y="214" fill="#ffffff" opacity="0.55" font-family="ui-monospace, monospace" font-size="11">ISSUED · 2026.05.17 · 14:32 UTC</text>
<line x1="225" y1="236" x2="455" y2="236" stroke="#ffd60a" stroke-width="0.5" opacity="0.4" stroke-dasharray="3,3"/>
<text x="340" y="264" text-anchor="middle" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">RECOVERY PHRASE</text>
<g font-family="ui-monospace, monospace" font-weight="700" font-size="26" letter-spacing="4" text-anchor="middle">
<text x="342" y="308" fill="#ff006e">TIGER</text><text x="338" y="308" fill="#00f5ff">TIGER</text><text x="340" y="308" fill="#ffffff">TIGER</text>
<text x="342" y="348" fill="#ff006e">NEON</text><text x="338" y="348" fill="#00f5ff">NEON</text><text x="340" y="348" fill="#ffffff">NEON</text>
<text x="342" y="388" fill="#ff006e">ORBIT</text><text x="338" y="388" fill="#00f5ff">ORBIT</text><text x="340" y="388" fill="#ffffff">ORBIT</text>
<text x="342" y="428" fill="#ff006e">STACK</text><text x="338" y="428" fill="#00f5ff">STACK</text><text x="340" y="428" fill="#ffffff">STACK</text>
</g>
<line x1="225" y1="460" x2="455" y2="460" stroke="#ffd60a" stroke-width="0.5" opacity="0.4" stroke-dasharray="3,3"/>
<text x="340" y="488" text-anchor="middle" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">SIGNATURE</text>
<g transform="translate(238, 504)">
<rect x="0" y="0" width="22" height="22" fill="#ff006e"/><rect x="52" y="0" width="22" height="22" fill="#00f5ff"/><rect x="104" y="0" width="22" height="22" fill="#ffd60a"/><rect x="156" y="0" width="22" height="22" fill="#06ffa5"/><rect x="182" y="0" width="22" height="22" fill="#d100d1"/>
<rect x="26" y="26" width="22" height="22" fill="#8338ec"/><rect x="78" y="26" width="22" height="22" fill="#ef233c"/><rect x="130" y="26" width="22" height="22" fill="#ff9500"/><rect x="182" y="26" width="22" height="22" fill="#4361ee"/>
<rect x="0" y="52" width="22" height="22" fill="#00f5ff"/><rect x="52" y="52" width="22" height="22" fill="#ffd60a"/><rect x="104" y="52" width="22" height="22" fill="#ff006e"/><rect x="156" y="52" width="22" height="22" fill="#06ffa5"/>
<rect x="26" y="78" width="22" height="22" fill="#d100d1"/><rect x="78" y="78" width="22" height="22" fill="#8338ec"/><rect x="104" y="78" width="22" height="22" fill="#ef233c"/><rect x="156" y="78" width="22" height="22" fill="#4361ee"/><rect x="182" y="78" width="22" height="22" fill="#ffd60a"/>
</g>
<line x1="225" y1="632" x2="455" y2="632" stroke="#ffd60a" stroke-width="0.5" opacity="0.4" stroke-dasharray="3,3"/>
<text x="340" y="660" text-anchor="middle" fill="#ffffff" opacity="0.6" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">KEEP THIS SAFE</text>
<text x="340" y="678" text-anchor="middle" fill="#ffd60a" opacity="0.8" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">GETABOUTIT ARCADE</text>
</svg>

**Anatomy (top to bottom):**
- Chamfered top-right corner (30px chamfer)
- 1.5px `#ffd60a` yellow trim
- Bg: `#3a0ca3` → `#1a0a3e` (40%) → `#0a0a1e` (100%) gradient
- Scanline overlay @ 6% opacity
- GETABOUTIT chromatic wordmark (20px) + "ARCADE TICKET" subtitle (cyan, 11px)
- Dashed yellow dividers (`stroke-dasharray="3,3"`, opacity 0.4)
- SERIAL section: "SERIAL №" (11px white@50%), value (16px gold), ISSUED date (11px white@55%)
- RECOVERY PHRASE (11px white@50% label) + 4 words stacked, each 26px chromatic, ~40px line-height
- SIGNATURE label + 8×4 pixel barcode grid (cells 22×22, 4px gap), deterministic from phrase hash
- Footer: "KEEP THIS SAFE" + "GETABOUTIT ARCADE"

**Serial format:** `GAI · Y<2-digit-year> · <5-digit-ordinal>` — e.g. `GAI · Y26 · 00042`. Ordinal counts across all Tickets ever issued.

**Timestamp format:** `ISSUED · YYYY.MM.DD · HH:MM UTC` — always UTC.

**Pixel barcode generation:** SHA-256 the recovery phrase, slice first 96 bits, map each 3-bit nibble to one of 10 palette colors + "empty" (`#0a0a1e`). 8 cols × 4 rows = 32 cells. Same phrase = same pattern, forever.

### 6.2 · The Reveal Ceremony — storyboard

10-step storyboard for first-time Ticket reveal:

```
Step 0  (t=0ms)        User clicks [REVEAL MY TICKET] in claim flow.
Step 1  (0–600ms)      Screen pinches to a 4px white line, sweeps open. Sound: RISE.
Step 2  (600–1600ms)   Ticket template materializes: bg gradient, frame, scanlines,
                       wordmark fade-in (600ms ease-out).
Step 3  (1600–1800ms)  Pause. Tension.
Step 4  (1800–2400ms)  Serial typewriters in left-to-right, 50ms per char. Sound: TICK per char.
Step 5  (2400–3000ms)  "RECOVERY PHRASE" label fades in (300ms). Pause.
Step 6  (3000–4200ms)  Word 1 (TIGER) types in chromatic, ~100ms per char. Sound: FLIP on completion.
Step 7  (4200–5400ms)  Word 2 (NEON), same treatment.
Step 8  (5400–6600ms)  Word 3 (ORBIT).
Step 9  (6600–7800ms)  Word 4 (STACK).
Step 10 (7800–9300ms)  Pixel signature appears row-by-row, 100ms/row. Sound: TICK per row.
Step 11 (9300–9800ms)  Footer fades in. Pause for awe.
Step 12 (9800ms+)      [SAVE TO YOUR WALLET] button slides up from bottom, pulses gold.
                       Sound: WIN_HI on tap. Confetti via GAI.fx.confetti.
                       Toast "TICKET SAVED" bottom-center.
```

**Skip path:** After Step 6 begins, a "tap to skip" hint appears bottom-right. Tap → animations cut to end state, no sound. localStorage `ticket_revealed_<phrase_hash> = true` set on completion so this never replays for this Player. Re-play via /settings → Data → "PRINT MY TICKET AGAIN".

**Reduced motion:** Steps 1, 6–10 collapse to instant fades. Total duration ≤1500ms. Sound stays.

### 6.3 · The Player Card — visual spec

<svg viewBox="0 0 680 720" xmlns="http://www.w3.org/2000/svg" role="img" style="max-width:420px;display:block;margin:1rem auto;">
<title>Player Card mockup</title>
<desc>Player Card at /p/vaporwave-kid. GRANDMASTER title in chromatic gold, large chromatic handle. Three top-game tiles (Chess blue, Snake teal, 2048 orange) in their accent colors. Achievement badge grid: 6 unlocked, 2 locked. Large pixel flame, 12-day HOT streak. Gold-tier frame border. Footer with mini wordmark and ticket chip.</desc>
<defs>
<linearGradient id="pBg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#1a0a3e"/><stop offset="100%" stop-color="#0a0a1e"/>
</linearGradient>
<pattern id="pScan" width="20" height="3" patternUnits="userSpaceOnUse">
<rect width="20" height="1" fill="#ffffff" opacity="0.05"/>
</pattern>
</defs>
<rect width="680" height="720" fill="#0a0a1e"/>
<rect x="180" y="20" width="320" height="680" fill="url(#pBg)" rx="6"/>
<rect x="180" y="20" width="320" height="680" fill="url(#pScan)" rx="6"/>
<rect x="182" y="22" width="316" height="676" fill="none" stroke="#ffd60a" stroke-width="3" rx="5"/>
<g font-family="ui-monospace, monospace" font-weight="700" font-size="11" letter-spacing="4" text-anchor="middle">
<text x="342" y="60" fill="#ff006e">GRANDMASTER</text><text x="338" y="60" fill="#00f5ff">GRANDMASTER</text><text x="340" y="60" fill="#ffd60a">GRANDMASTER</text>
</g>
<g font-family="ui-monospace, monospace" font-weight="700" font-size="22" letter-spacing="1" text-anchor="middle">
<text x="342" y="100" fill="#ff006e">@vaporwave_kid</text><text x="338" y="100" fill="#00f5ff">@vaporwave_kid</text><text x="340" y="100" fill="#ffffff">@vaporwave_kid</text>
</g>
<line x1="210" y1="124" x2="470" y2="124" stroke="#ffd60a" stroke-width="0.5" opacity="0.4" stroke-dasharray="3,3"/>
<text x="340" y="148" text-anchor="middle" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">TOP GAMES</text>
<rect x="200" y="160" width="88" height="88" fill="#4361ee" rx="4"/>
<rect x="232" y="178" width="24" height="5" fill="#ffd60a"/><rect x="232" y="186" width="5" height="9" fill="#ffd60a"/><rect x="244" y="186" width="5" height="9" fill="#ffd60a"/><rect x="232" y="198" width="24" height="5" fill="#ffd60a"/><rect x="236" y="206" width="16" height="18" fill="#ffd60a"/><rect x="226" y="226" width="36" height="6" fill="#ffd60a"/>
<text x="244" y="264" text-anchor="middle" fill="#ffffff" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">CHESS</text>
<text x="244" y="278" text-anchor="middle" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11">147 plays</text>
<rect x="296" y="160" width="88" height="88" fill="#06ffa5" rx="4"/>
<rect x="310" y="200" width="40" height="6" fill="#0a4d33"/><rect x="344" y="180" width="6" height="26" fill="#0a4d33"/><rect x="344" y="180" width="22" height="6" fill="#0a4d33"/><rect x="366" y="180" width="6" height="14" fill="#0a4d33"/><rect x="318" y="216" width="10" height="10" fill="#ef233c"/>
<text x="340" y="264" text-anchor="middle" fill="#ffffff" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">SNAKE</text>
<text x="340" y="278" text-anchor="middle" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11">132 plays</text>
<rect x="392" y="160" width="88" height="88" fill="#ff9500" rx="4"/>
<text x="436" y="214" text-anchor="middle" fill="#ffd60a" font-family="ui-monospace, monospace" font-size="22" letter-spacing="2" font-weight="700">2048</text>
<text x="436" y="264" text-anchor="middle" fill="#ffffff" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">2048</text>
<text x="436" y="278" text-anchor="middle" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11">98 plays</text>
<line x1="210" y1="296" x2="470" y2="296" stroke="#ffd60a" stroke-width="0.5" opacity="0.4" stroke-dasharray="3,3"/>
<text x="340" y="320" text-anchor="middle" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">ACHIEVEMENTS</text>
<g transform="translate(240, 332)"><circle cx="22" cy="22" r="20" fill="#00f5ff"/><rect x="20" y="10" width="4" height="6" fill="#ffffff"/><rect x="20" y="28" width="4" height="6" fill="#ffffff"/><rect x="10" y="20" width="6" height="4" fill="#ffffff"/><rect x="28" y="20" width="6" height="4" fill="#ffffff"/><rect x="20" y="20" width="4" height="4" fill="#ffffff"/></g>
<g transform="translate(296, 332)"><circle cx="22" cy="22" r="20" fill="#ffd60a"/><polygon points="22,10 28,10 23,21 28,21 18,36 22,25 16,25" fill="#3a0ca3"/></g>
<g transform="translate(352, 332)"><circle cx="22" cy="22" r="21" fill="none" stroke="#ffd60a" stroke-width="2"/><circle cx="22" cy="22" r="18" fill="#ffd60a"/><rect x="12" y="22" width="20" height="4" fill="#3a0ca3"/><rect x="12" y="26" width="20" height="6" fill="#3a0ca3"/><rect x="12" y="14" width="4" height="8" fill="#3a0ca3"/><rect x="20" y="14" width="4" height="8" fill="#3a0ca3"/><rect x="28" y="14" width="4" height="8" fill="#3a0ca3"/></g>
<g transform="translate(408, 332)"><circle cx="22" cy="22" r="20" fill="#06ffa5"/><rect x="10" y="14" width="3" height="16" fill="#0a4d33"/><rect x="13" y="26" width="3" height="4" fill="#0a4d33"/><rect x="16" y="14" width="3" height="16" fill="#0a4d33"/><rect x="19" y="26" width="3" height="4" fill="#0a4d33"/><rect x="22" y="14" width="3" height="16" fill="#0a4d33"/><rect x="25" y="26" width="3" height="4" fill="#0a4d33"/><rect x="28" y="14" width="3" height="16" fill="#0a4d33"/></g>
<g transform="translate(240, 388)"><circle cx="22" cy="22" r="20" fill="#4361ee"/><rect x="14" y="20" width="16" height="4" fill="#ffd60a"/><rect x="14" y="24" width="16" height="8" fill="#ffd60a"/><rect x="13" y="14" width="3" height="6" fill="#ffd60a"/><rect x="20" y="12" width="3" height="8" fill="#ffd60a"/><rect x="27" y="14" width="3" height="6" fill="#ffd60a"/></g>
<g transform="translate(296, 388)"><circle cx="22" cy="22" r="20" fill="#ef233c"/><rect x="20" y="12" width="4" height="4" fill="#ffd60a"/><rect x="18" y="16" width="8" height="6" fill="#ffd60a"/><rect x="16" y="22" width="12" height="6" fill="#ff9500"/><rect x="14" y="28" width="16" height="6" fill="#ffd60a"/></g>
<g transform="translate(352, 388)" opacity="0.3"><circle cx="22" cy="22" r="20" fill="#3a3a4a"/><text x="22" y="28" text-anchor="middle" fill="#888888" font-family="ui-monospace, monospace" font-size="13" font-weight="700">29</text></g>
<g transform="translate(408, 388)" opacity="0.3"><circle cx="22" cy="22" r="20" fill="#3a3a4a"/><text x="22" y="28" text-anchor="middle" fill="#888888" font-family="ui-monospace, monospace" font-size="13" font-weight="700">16</text></g>
<line x1="210" y1="456" x2="470" y2="456" stroke="#ffd60a" stroke-width="0.5" opacity="0.4" stroke-dasharray="3,3"/>
<text x="340" y="480" text-anchor="middle" fill="#ffffff" opacity="0.5" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">STREAK</text>
<g transform="translate(308, 492)">
<rect x="28" y="0" width="8" height="8" fill="#ffd60a"/><rect x="20" y="8" width="8" height="8" fill="#ffd60a"/><rect x="28" y="8" width="8" height="8" fill="#ffd60a"/><rect x="36" y="8" width="8" height="8" fill="#ffd60a"/>
<rect x="12" y="16" width="8" height="8" fill="#ff9500"/><rect x="20" y="16" width="24" height="8" fill="#ffd60a"/><rect x="44" y="16" width="8" height="8" fill="#ff9500"/>
<rect x="12" y="24" width="40" height="8" fill="#ff9500"/><rect x="20" y="24" width="24" height="8" fill="#ffd60a"/>
<rect x="4" y="32" width="56" height="8" fill="#ef233c"/><rect x="20" y="32" width="24" height="8" fill="#ff9500"/>
<rect x="4" y="40" width="56" height="8" fill="#ef233c"/><rect x="20" y="40" width="24" height="8" fill="#ff006e"/>
<rect x="12" y="48" width="40" height="8" fill="#ef233c"/>
</g>
<text x="340" y="592" text-anchor="middle" fill="#ffd60a" font-family="ui-monospace, monospace" font-size="13" letter-spacing="2" font-weight="700">12 DAY STREAK · HOT</text>
<line x1="210" y1="618" x2="470" y2="618" stroke="#ffd60a" stroke-width="0.5" opacity="0.4" stroke-dasharray="3,3"/>
<g font-family="ui-monospace, monospace" font-weight="700" font-size="11" letter-spacing="2">
<text x="219" y="654" fill="#ff006e">GETABOUTIT</text><text x="215" y="654" fill="#00f5ff">GETABOUTIT</text><text x="217" y="654" fill="#ffffff">GETABOUTIT</text>
</g>
<g transform="translate(415, 634)">
<path d="M 0 0 L 40 0 L 50 10 L 50 36 L 0 36 Z" fill="#3a0ca3" stroke="#ffd60a" stroke-width="1"/>
<text x="25" y="23" text-anchor="middle" fill="#ffd60a" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2" font-weight="700">TKT</text>
</g>
</svg>

**Anatomy:**
- Card dimensions 320×680
- Background: `#1a0a3e` → `#0a0a1e` vertical gradient, scanlines @ 5% opacity, `rx=6` rounded corners
- Frame stroke = **tier signal**: NONE → BRONZE (2px desat-bronze at 10+ plays) → SILVER (2px cyan at 100+) → GOLD (3px `#ffd60a` at 1000+)
- Title bar: displayed title in 11px chromatic with **`#ffd60a` gold center fill** (signals rank/achievement)
- Handle: `@<handle>` at 22px chromatic with **white center fill** (signals identity)
- TOP GAMES section: 3 tiles 88×88 in each game's primary accent with stylized pixel glyph + play count
- ACHIEVEMENTS grid: 4×2 of 44×44 round badges; unlocked = filled in earned color with white pixel-icon glyph; currently-displayed-title gets a gold ring; locked = grey @ 30% opacity with token-only
- STREAK section: large pixel flame (yellow tip → orange middle → red base) + gold tag below
- Footer: mini chromatic GETABOUTIT wordmark left; small chamfered `i-ticket` chip right (if `ticket_display` toggle ON)
- **4-pixel signature strip:** Inner-left edge of the frame, 4px wide × full height, renders the player's pixel barcode as a vertical stripe. Continuity link to Ticket. (Not shown in the mockup above — add it during implementation.)

Player may override displayed tier downward (e.g. show BRONZE despite earning GOLD) via /settings.

### 6.4 · Card customization rules

**Frame tiers:** NONE → BRONZE (10+ lifetime plays) → SILVER (100+) → GOLD (1000+). Player can downgrade via /settings → Player → Frame Override.

**Titles** (8 unlocked-by-achievement, player picks one to display):

| Title | Unlocks on |
|---|---|
| `FIRST SPARK` | first play |
| `VETERAN` | 100+ lifetime plays |
| `ROYAL FLUSH` | first royal flush in Poker |
| `WORDSMITH` | first Words win |
| `GRANDMASTER` | first Chess AI win |
| `STREAK MASTER` | 30-day streak |
| `COMPLETIONIST` | tried all 16 games |
| `PERFECT 29` | first perfect 29 in Cribbage |

**Top-3 derivation:** by lifetime plays per game (matches existing sort-by-plays heuristic). Player can pin one game as locked-top-3 via /settings → Player → drag-drop.

**Streak flame tiers:**
- 0 days — no flame
- 1–6 days — `i-flame-1` small flame
- 7–29 days — `i-flame-2` (HOT)
- 30+ days — `i-flame-3` (BLAZING) with chromatic offset

### 6.5 · /p/&lt;handle&gt; public page

Full Card rendered at viewport center. Above: small breathing wordmark in /p header.

- **Visitor visits /p/<handle>** — sees Card. Below: `[ADD AS FRIEND]` CTA + "CLAIM YOUR OWN HANDLE" card.
- **Player visits /p/<own>** — sees their Card. Below: `[EDIT IN SETTINGS]`. No friend CTA.
- **Player visits /p/<friend>** — sees Card. Below: `[ADD AS FRIEND]` or `[UNFOLLOW]` based on state.

Public by default. `public_visible = false` (set in /settings) makes the page show "THIS PLAYER IS PRIVATE" instead.

### 6.6 · Leaderboards

Three surfaces (tabs at top in arcade font): `DAILY · WEEKLY · ALL-TIME`. Sub-filter chip: `ALL · FRIENDS`.

Row anatomy (60px tall, 600px wide content):
- Cols 1–24: rank — `i-trophy` for #1, `i-medal-silver/bronze` for #2/3, arcade-font numbers for #4+
- Cols 28–40: 4-pixel-wide vertical signature strip from that player's hash
- Cols 48–168: handle (chromatic if YOU, plain white@90% otherwise)
- Cols 180–280: score, right-aligned, arcade font 18px
- Cols 290–340: timestamp small white@40%
- Bg: alternating 0% / 3% white opacity rows

**YOU row** always visible: if in top 100, 1px gold border + pulse animation. If outside, fixed pinned row at bottom of visible list: `YOUR RANK: 247 · 4,820 pts` in gold.

Daily resets midnight UTC. Weekly is rolling 7-day. All-time is best-ever per game.

### 6.7 · Friend addition flow

One-way follow. Player A clicks `[ADD AS FRIEND]` on /p/<B>. Backend appends B's UUID to A's `friends[]` column. B notified (toast on next /p/<B> visit). No mutual approval required.

A can `[UNFOLLOW]` from /p/<B> or /settings → Friends.

B can `[BLOCK A]` from /settings → Friends → "FOLLOWING YOU". Block removes A from B's followers AND prevents A from re-following.

### 6.8 · Handle validation

3–20 characters, `[a-z0-9_]+` only, lowercase enforced server-side. Checked against vendored profanity list (LDNOOBW base + curated additions, stored in Supabase project as `/profanity.json`, not in this repo).

Reserved: `admin`, `getaboutit`, `gai`, `staff`, `mod`, `system`, `support`, `null`, `none`, plus the 50 most common bad-word patterns.

Validation errors shown inline:
- `TOO SHORT` / `TOO LONG`
- `INVALID CHARACTERS`
- `HANDLE TAKEN`
- `HANDLE RESERVED`
- `HANDLE NOT ALLOWED`

After valid + available: button shifts to `[CLAIM]` in gold.

---

## 7 · Motion & feel

### 7.1 · Timing curves

Values cited from `shared/core.css` and `arcade.css`. Where the spec calls for behavior not yet implemented, the cell is marked `> TBD`.

| Animation / transition | Where | Duration / easing |
|---|---|---|
| `chromBreathe` (wordmark breathing) | core.css:72 | **8s `ease-in-out` infinite** (four 0.5Hz breaths + a 200ms pulse near the 85% mark) |
| `wmEnter` (wordmark entrance) | arcade.css:308,315 | **0.85s `cubic-bezier(.2,.7,.2,1)` both** |
| Tagline / stat-strip / motd entrance fadeUp | arcade.css:309-312 | 0.4s `ease`, staggered delays 0.2s / 0.3s / 0.4s / 0.45s |
| Tile entrance (`tileRise`) | arcade.css:313,320 | 0.5s `cubic-bezier(.2,.7,.2,1)` both |
| `glitchTo` page-transition JS timeout | core.js:446 | **200ms** before `window.location.href = url` |
| `pageGlitch` overlay keyframe | core.css:190 | 0.22s `steps(4, end)` forwards (4-step jitter + hue rotate) |
| `glitch` (generic) keyframe | core.css:218 | 0.4s `steps(4, end)` once |
| `pulse` keyframe (start prompts) | core.css:219 | 1.1s `ease-in-out` infinite |
| `gaiShake` keyframe | core.css:305 | 0.32s `steps(6, end)` once |
| Tile hover transition | arcade.css:157 | `transform/box-shadow/background 0.15s ease`; hover lifts `translateY(-4px)` + adds 2px `currentColor` ring |
| Tile preview hover filter | arcade.css:176 | `filter 0.18s ease` (brightness 1.18 on hover) |
| Daily-tile hover | arcade.css:80 | `transform/box-shadow 0.12s ease`; lift `translateY(-2px)` |
| Recent-tile hover | arcade.css:134 | `transform 0.12s ease`; lift `translateY(-2px)` |
| Toast slide / fade | core.css:325, core.js:783-787 | opacity + transform `0.28s ease`; default hold 2200ms; cleanup remove +400ms after fade-out |
| Arcade button press | core.css:124 | `transform 0.06s ease`, `box-shadow 0.06s ease`, `background 0.12s ease` |
| Category tab | core.css:376 | `color / border-color / box-shadow 0.12s ease` |
| Search input focus | core.css:559 | `border-color 0.12s ease` |
| Play-next tile hover | core.css:493 | `border-color 0.12s ease, background 0.12s ease` |
| Flash overlay | core.css:415 | `opacity 0.18s ease` |
| `fxChromaticFlash` | core.js:630 | `opacity (durationMs/2)ms ease-out`; element removed at `durationMs/2 + 50ms` |
| `fxRipple` | core.js:1416 | `transform 0.5s ease-out, opacity 0.5s ease-out`; removed at 600ms |
| `fxScanlineSweep` | core.js:1406 | `top 0.6s linear`; removed at 650ms |
| `fxConfetti` / `fxParticleBurst` | core.js:1392 | `transform/opacity 0.6s ease-out`; removed at 700ms |
| Scanline overlay opacity | core.css:48 | white pixels at `rgba(255,255,255,0.04)` (4%) on 1px-on / 2px-off pattern, `mix-blend-mode: overlay`. Theme overrides: `theme-deepnight` boosts to 50% opacity on the layer; `theme-highcontrast` hides entirely. |
| Vignette opacity | core.css:57 | radial `transparent 55% → rgba(0,0,0,0.45) 100%`. `theme-deepnight` → `rgba(0,0,0,0.65)`; `theme-highcontrast` → hidden. |
| Splash transition | core.js:727 | > TBD — uses `.hidden { display: none }`; no fade. Phase 6 target: 200ms fade-in/out. |
| Game-Over scrim fade | core.js:745 | > TBD — same as splash; snaps via `.hidden`. Phase 6 target: 200ms slide-up + scrim fade per [§5.4](#54--game-over-screen--gaiuigameover). |
| CRT power-on ceremony | (not yet implemented) | > TBD — target ~600ms per [§5.2](#52--crt-power-on-ceremony); not in core.css/core.js yet. |
| Floor → Lobby fade-through | (not yet implemented) | > TBD — target 300ms per [§2.4](#24--mode-crossover-rules). |
| Cabinet ← Floor scanline collapse-up | (not yet implemented) | > TBD — target 200ms per [§2.4](#24--mode-crossover-rules). |

### 7.2 · Toast positions + durations

Default: **bottom-center, 80px from bottom (`calc(80px + env(safe-area-inset-bottom))` per core.css:313), fade-up 280ms, hold 2.2s (overridable via `durationMs` arg to `GAI.ui.toast`), fade-down 280ms (cleanup remove +400ms) — core.css:325, core.js:783–787.**

Exceptions:
- Welcome-back → top-center, larger, 5s hold
- Achievement unlock → bottom-center + WIN_HI sound + 6s hold + 1px chromatic offset on text
- Streak ignited (first play today) → top-center, larger, 5s hold, flame icon pulses
- Mute toggle → micro toast bottom-right, icon only, 1.5s hold
- Error / invalid → bottom-center, BUZZ sound, 0.5px red border, 2s hold

### 7.3 · prefers-reduced-motion behavior

Implementation hook: `GAI.reducedMotion` (exported in core.js) returns true when `prefers-reduced-motion: reduce` is set. Use this in any `game.js` that adds custom animation rather than re-querying the media query.

Where `@media (prefers-reduced-motion: reduce)` applies (already covered in core.css:238-242 and arcade.css:325-328 for `.chrom-jitter`, `.pulse`, `.glitch`, `body.rainbow .chrom`, `.page-glitch`, `.shake`, `.arcade` transition, `body.entrance .*`):
- Wordmark `chromBreathe` → static
- Scanlines → static (no shimmer/sweep)
- Horizon parallax → static
- CRT power-on/off → 0ms cuts
- `glitchTo` transitions → 0ms cuts (core.js:439-440 checks `prefers-reduced-motion` and skips the overlay, navigating immediately)
- Screen-shake → disabled
- Konami rainbow → still triggers but color shifts instant not transitioned
- Toast fades → kept (functional, not decorative)
- Game-internal animation: each game responsible; DESIGN.md notes the rule applies sitewide

---

## 8 · Sound design

### 8.1 · The 10-tone sound palette

All procedural via `GAI.audio`. No sample files, ever.

| Tone | Frequency | Envelope | Used for |
|---|---|---|---|
| TAP | 880Hz sine, 60ms | A=2ms D=40ms | Generic button click, tile hover-confirm |
| PICK | 660Hz + 990Hz, 80ms | A=2ms D=60ms | Selection, pin gesture, "I chose this" |
| WIN_HI | C5→E5→G5 arpeggio, 240ms | A=2ms each | Achievement unlock, game won |
| WIN_LO | C4→G3 descending, 200ms | A=2ms D=150ms | Game lost, hand busted |
| BUZZ | 80Hz square + noise, 100ms | A=1ms D=80ms | Error, invalid move, locked badge tap |
| FLIP | Filtered noise burst 200Hz, 60ms | A=1ms D=50ms | Card flip, Ticket reveal each word, leaderboard rank reshuffle |
| HUM | 60Hz sine bed, looped @ −24dB | — | Cabinet ambient (opt-in toggle) |
| RISE | 220Hz→880Hz sweep, 400ms | Linear | CRT power-on (Cabinet ceremony) |
| FALL | 880Hz→110Hz sweep, 300ms | Exp | CRT power-off (back-to-Floor) |
| TICK | 1320Hz pulse, 20ms | A=1ms D=15ms | Leaderboard rank-update, countdown, typing feedback |

### 8.2 · Sound-surface mapping

**The Floor** — TAP on tile hover, PICK on activate, TICK on tab switch, RISE on game launch. No ambient bed by default.

**The Cabinet** — RISE on power-on (once per session per game), HUM as opt-in ambient, game's own audio, FALL on back-button.

**The Lobby** — FLIP on Ticket reveal (one per word), TICK on every leaderboard rank update, WIN_HI on achievement unlock toast, PICK on Card section interactions, FLIP on theme/frame change.

### 8.3 · Sound grammar rules

- All sounds ≤500ms unless HUM ambient bed
- Procedural only — no sample files, ever
- ≤4 oscillators per sound (keeps `GAI.audio` fast)
- Mute toggle silences everything except UI safety chimes (none currently exist)
- Audio mutes when tab hidden (already done via `visibilitychange`)
- iOS Safari respects existing AudioContext-on-first-gesture pattern
- New sounds require an entry in [§8.1](#81--the-10-tone-sound-palette) — don't add ad-hoc tones in `game.js`

---

## 9 · Effects vocabulary

### 9.1 · Scanlines · vignette · chromatic aberration · glitch · breathe

| Effect | What it does | Where allowed | Where forbidden |
|---|---|---|---|
| **Scanlines** | 1px-on / 2px-off overlay @ `rgba(255,255,255,0.04)`, `mix-blend-mode: overlay` (core.css:46–54) | Sitewide, all modes. `theme-deepnight` raises layer opacity to 0.5. | `theme-highcontrast` hides scanlines entirely. |
| **Vignette** | Radial gradient: transparent at 55%, `rgba(0,0,0,0.45)` at 100% (core.css:57). `theme-deepnight` raises outer ring to 0.65. `theme-highcontrast` hides the vignette. | Sitewide, all modes | Hidden in `theme-highcontrast` |
| **Chromatic aberration** | RGB channel separation, 2px+ offset | Wordmark ≥64px, h1 ≥24px, Game Over titles, Ticket phrase, Card title + handle | Body copy, sub-32px, leaderboard ranks, in-game scores |
| **Glitch** | `GAI.transition.glitchTo()` page-transition (`pageGlitch` 0.22s + 200ms nav) | Floor↔Cabinet only | Floor↔Lobby (use fade), Cabinet↔Lobby (forbidden) |
| **Breathe** | `chromBreathe` 8s `ease-in-out` chromatic pulse | Wordmark at hero scale, Card title, Ticket header | Sub-hero scales, body, anything with `prefers-reduced-motion` |

### 9.2 · Where each is allowed, where forbidden

For the writer skimming "can I use X here?":

**Scanlines**

- *Allowed:* every page, every mode, every theme except `highcontrast`. Render via `#scanlines` overlay element already mounted by `shell.js`. `theme-deepnight` may amp the layer opacity to 50%.
- *Forbidden:* never disable on regular pages. Never tint a color other than white. Never animate (no sweep, no shimmer).

**Vignette**

- *Allowed:* every page, every mode, every theme except `highcontrast`. `theme-deepnight` may darken outer ring to 0.65.
- *Forbidden:* never disable in default / deepnight themes. Never re-tint (must stay neutral black).

**Chromatic aberration**

- *Allowed:* wordmark (≥64px), h1 / h2 / h3 headlines (≥24px), Game Over title, Ticket recovery-phrase words, Player Card title + handle, OG card hero text.
- *Forbidden:* body copy, tile labels, leaderboard rank numbers, in-game live scores, button labels, any text under 32px, any text the user is reading-for-meaning.

**Glitch (page transition)**

- *Allowed:* Floor → Cabinet, Cabinet → Floor.
- *Forbidden:* Floor ↔ Lobby (use fade-through), Cabinet ↔ Lobby (forbidden traversal entirely — must route via Floor), in-app navigation that stays within one mode (use no transition or local fade).

**Breathe**

- *Allowed:* the GETABOUTIT wordmark at hero scale (home, /about hero), Player Card title bar, Ticket header.
- *Forbidden:* sub-hero wordmarks (footers, mini headers — those stay static `.chrom`), all body copy, anything when `prefers-reduced-motion` is on.

---

## 10 · Theme variants

Three themes, all preserve the 10-color palette identity, but vary bg + effects.

- **default** — as specified throughout. `#0a0a1e` bg, scanlines at 4% white, vignette `rgba(0,0,0,0.45)` at outer ring, full chromatic, breathing wordmark, outrun horizon. The brand standard.
- **deepnight** — `#050510` bg via core.css `--c-bg-deep`, `#scanlines` opacity boosted (`body.theme-deepnight #scanlines { opacity: 0.5 }`), vignette outer ring `rgba(0,0,0,0.65)`, full chromatic, horizon dimmer @ 60%, palette saturation ~−10% (each `--c-*` value remapped in `body.theme-deepnight {}`, e.g. `--c-pink: #cf0058`). "The arcade at 3am."
- **highcontrast** — `#0a0a1e` bg, `#scanlines` and `#vignette` hidden via `body.theme-highcontrast` selector, chromatic offset boosted to 3px (no animation under `prefers-reduced-motion`), all borders forced to 2px, body weight forced to bold. "Accessibility first."

Cycles via typing "mood" on home or via /settings → Themes. Stored in `gai_theme` via `GAI.theme.{get,set,cycle,list}`. Never alters palette colors — only how-they-render context.

---

## 11 · Stats + Settings surfaces

### 11.1 · Stats page (/stats)

Sections:
- Header: chromatic wordmark + "STATS" h1
- Overview tiles (4 metric cards): TOTAL PLAYS · CURRENT STREAK · GAMES TRIED · ACHIEVEMENTS UNLOCKED
- 30-day daily plays chart — cyan line, daily totals
- Most-played bar chart — each bar in that game's primary accent ([§3](#3--per-game-accent-registry))
- Best scores list — top 10 per category, in game's primary accent
- Time per game — sorted desc
- Achievement grid — mirror of /settings achievements section

### 11.2 · Settings sections (Visitor + Player)

**Visitor sees** (top-down): a top CTA card "CLAIM A HANDLE · become a Player", then Achievements, Themes, Audio, Data, About.

**Player sees** (top-down):
- Player: handle (read-only), displayed title (dropdown of unlocked titles), frame override (auto = highest, or manual), top-3 pin (drag-drop), Ticket display toggle, public visibility (default ON)
- Friends: list of followed Players + unfollow buttons; "FOLLOWING YOU" sub-section + block buttons
- Achievements: 8 unlocks (growing) with status
- Themes: 3 themes with previews
- Audio: master volume, floor ambient toggle, cabinet hum toggle
- Data: export progress as JSON, import from JSON, "PRINT MY TICKET AGAIN" button (re-runs Reveal Ceremony)
- About: footer with /about + repo links

---

## 12 · OG card system

- **Per-game OG (1200×630)** — bg game-primary @ 30% saturation, GETABOUTIT chromatic wordmark top-left small, game's tile preview 4× center, game name 64px chromatic bottom-left, `getaboutit.com/<game>` URL bottom-right 24px white@60%, diagonal scanlines. Already exists from Phase 4 via `og-generator.html`.
- **Per-category landing OG (1200×630)** — same template but center shows the category's mini-tile grid (e.g. /arcade = 10 mini-tiles, /board = 4). Deferred from Phase 5.
- **Player Card OG (1200×630)** — live Player Card cropped, "PLAYER · @vaporwave_kid" header band top.
- **Ticket OG (1200×630, opt-in)** — Ticket template with phrase + serial REDACTED to `●●●●●● ●●●● ●●●●● ●●●●●` for security. Only generated if `ticket_share = true` in /settings (default OFF).

---

## 13 · Mobile breakpoints + touch behavior

Tile grid columns:
- ≥1200px → 4 columns
- 768–1199 → 3 columns
- 480–767 → 2 columns
- ≤479 → 2 columns

Decision locked at 4/3/2/2 — preserves the shipped desktop max of 4 cols, sets mobile floor at 2 cols for browse-density across 16 games.

Touch target floor: 44×44 (already shipped — `min-height: 44px` on `.tab`, `.search-toggle`, etc.). Surprise dock: pill at ≥600px, full-width bottom-dock at <600px (Phase 4). Mini-previews stay rendered at all sizes; at 2-col mobile, tiles enlarge and previews scale up. Game pages: `GAI.canvas.fit()` handles canvas. No horizontal scroll anywhere.

---

## 14 · Forbidden moves

These are not "consider later." These are not.

- No avatar images (no uploaded photos, no animated GIFs)
- No audio sample packs (procedural only via `GAI.audio`)
- No trading systems (no economy, no marketplace, no skins)
- No real-time multiplayer (no synchronous coordination, no live chat, no spectator, no replays)
- No advertising (no banners, no popups, no sponsored, no affiliate)
- No tracking (no analytics, no telemetry, no third-party scripts, no surviving cookies)
- No engagement metrics surfaced to the player ("you played 47 minutes today" guilt-trips → forbidden)
- No A/B tests on players
- No ML on player behavior
- No newsletter signup
- No social login
- No password authentication (Tickets only)
- No PII collection (no email, no name, no phone, no real names ever)
- No emoji as functional icons (use pixel icons per [§1.5](#15--iconography--pixel-icon-set-joystick-mark-favicon-rule))
- No fonts beyond Press Start 2P + system mono fallback
- No colors beyond the 10 palette + bg + white
- No service worker (out of scope; if added later, document here)

---

## 15 · Easter eggs

Documented but never promoted in UI:

- **Konami code** (↑↑↓↓←→←→BA) — Rainbow mode. Toggles `gai_rainbow_unlocked`. While active: wordmark cycles 10 palette colors 800ms each; tile borders animate hue-cycle (`body.rainbow .chrom { animation: rainbowHue 8s linear infinite; }` per core.css:230); tile-preview canvases get 4px chromatic offset; TICK on each color step. Same sequence toggles off. Persists across refresh.
- **MOOD typed on home** — cycles themes (default → deepnight → highcontrast → default)
- **GAI typed on home** — 1s CRT-collapse effect (viewport pinches and re-expands), FALL sound. For the meme.
- **100+ lifetime plays** — adds "⚡ VETERAN ⚡" tag below wordmark on home, persistent
- **First Royal Flush in Poker** — adds `i-crown` sticky overlay to Poker tile
- **First Perfect 29 in Cribbage** — adds `i-29` sticky overlay to Cribbage tile
- **7+ day streak** — `i-flame-2` (HOT) replaces `i-flame-1`
- **30+ day streak** — `i-flame-3` (BLAZING) twin chromatic

---

## 16 · Living document conventions

DESIGN.md is canonical but not frozen:

- Updated when decisions explicitly change in claude.ai planning chats (not via PR-comment drift)
- TBD blocks use this format:
  > TBD — Question that needs answering. Context: why it's still open.
- Change history NOT in DESIGN.md (lives in `git log`)
- Companion: BRAND.md (elevator-pitch version)
- When in doubt, ask in claude.ai. Don't decide unilaterally.
