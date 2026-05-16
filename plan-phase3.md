# GETABOUTIT — Phase 3 Plan

Status: pre-execution.
Scope: 29 → 37 games. 8 new + the most thorough optimization sweep yet + home page evolution.

## Honest scoping (what I can and can't do in this environment)

I can read/write files, run node, run a python http server, and grep the codebase. I cannot:
- Run an actual browser (Chrome/Safari/headless) to take FPS recordings or measure TTI under throttle
- Generate 37 PNG OG images (no Node canvas lib available; would violate the "no npm" rule)
- Test on a real iOS Safari device

What I'll do instead, listed up-front so we're honest:
- **Perf profiling**: static-code review (search for rAF chains without cleanup, audio nodes without disposal, listeners without removal). Manual measurement of gzipped payload per file. No runtime FPS numbers.
- **OG images**: extend `og-generator.html` to render all 37 variants procedurally so the user (or a CI step) can save the PNGs. The current single `og.png` will remain the fallback in HTML meta until the user runs the generator and uploads the per-game PNGs.
- **iOS Safari testing**: deferred to the user. I'll fix every iOS-specific code path I can spot, and flag anything I'm uncertain about.

## (a) Audit findings — what's still wrong at 29 games

1. **Stack is 2081 lines** (it's the merged v2). Other games are 200–650. It would benefit from extracting reusable patterns into shared, but I'll leave it alone unless I find a bug — risk of regression is high and the user merged it deliberately.
2. **Drag is missing** — solitaire, hearts, battleship-placement all use tap-tap. New games (backgammon, spider) will need it. Time to add `GAI.input.drag`.
3. **Dice rendering duplicated** — there's no shared helper, and three new games (craps, backgammon, possibly cribbage cut card) will need it.
4. **MCTS missing** — Go can't use minimax (branching factor too high). Need a Monte Carlo Tree Search helper.
5. **Share button only on Stack** — every game's game-over should generate a 1080×1920 share card.
6. **No play-next** — once you finish a game, you bounce back to the lobby. A "PLAY NEXT" panel keeps the loop alive.
7. **No pin/favorites** — heavy users want quick access; 37 tiles is a lot to scroll.
8. **No search** — finding "tic tac toe" by scrolling is annoying.
9. **No stats page** — the user has all this score data and no way to see a digest.
10. **OG image** — same for every game. A glaring inconsistency at 37 games.

## (b) Anti-patterns to kill this phase

- **Inline oscillator boilerplate** — every game should use only `GAI.audio.*` (already mostly true).
- **Per-game share button** — should be a single helper called from the game-over screen.
- **Per-game pause overlay** — make a single `GAI.ui.pause()` helper.
- **Per-game dice** — never reimplement; use `GAI.dice.*`.
- **AI engines that block UI** — chess and go searches should yield via `setTimeout(0)` or `requestIdleCallback` so the click feels instant.

## (c) Pattern reuse for the 8 new games

- **Go** — board-grid input (like checkers), but stones are placed on intersections not squares. MCTS-only AI.
- **Backgammon** — drag + dice; reuses `GAI.cards`-like spritesheet pattern for checkers (but procedural).
- **Cribbage** — `GAI.cards.draw` for hands + crib; new pegging board widget.
- **Spider** — drag system + Klondike-style column layout from solitaire; same shuffle from `GAI.cards`.
- **Craps** — dice + table mat; simplest of the new games.
- **Slither** — single-canvas arena, camera-follow; reuses runner's auto-loop + GAI.fx particle bursts.
- **Pixel/Nonogram** — grid tap-fill (like minesweeper); deterministic puzzle from embedded designs.
- **Type Race** — keyboard-focused; new pattern, low complexity.

## (d) shared/core.js additions

```
GAI.dice = { roll(n, sides), drawDie(ctx, x, y, size, value, opts), rollWithAnim(ctx, x, y, count, cb) }
GAI.text = { measure, wrap, drawChromatic }
GAI.path = { bezier, ease('out-cubic'|'in-out-quad'|...), lerp, distance }
GAI.ai.mcts(state, rollouts, movesFn, applyFn, evalFn, terminalFn)
GAI.input.drag(target, opts) — unified mouse+touch drag with ghost rendering
GAI.haptic.preset = { TAP, DOUBLE, HEAVY, BOOST, ERROR }
GAI.fx.fireworks(x, y, palette)
GAI.fx.starfield(canvas, layers, opts)
GAI.fx.scanlineSweep(canvas, color)
GAI.fx.ripple(x, y, color)
GAI.ui.pause({onResume}) — single overlay used by all games that pause
GAI.ui.shareCard({title, score, best, color, key}) — generates 1080×1920 + emits {blob, dataUrl, text}
GAI.ui.playNext(currentKey) — render 3 same-category tiles as game-over footer
GAI.ui.search({games, onPick}) — used on home
GAI.pins = { get(), add(k), remove(k), toggle(k), max: 5 }
GAI.stats = { sessionStart(key), sessionEnd(key), heatmap(), perGameTime(), dailyCounts() }
GAI.blitz = { isOn(key), set(key, on) }
GAI.welcomeBack() — fires if last visit > 24h ago
```

## (e) Home page structural changes

- 7 categories: ARCADE, PUZZLE, BOARD, CARDS, CASINO, MIND, SKILL
- A pinned strip above the grid (collapses when empty)
- A search bar (mobile: collapsed under 🔍 icon)
- "ALL" sorted by play count
- /stats page linked in footer
- 37-game JSON-LD CollectionPage

## (f) Performance risks

- Stack is 2081 lines and runs at high frame rate. Static review only — won't refactor unless something is broken.
- Chess minimax can stall the UI on complex positions. Will wrap search in `setTimeout(0)` chunks (cooperative scheduling) so the AI thinking text actually paints.
- Go MCTS at 800 rollouts × ~80 game length = 64k simulations per move. Need to budget carefully; if too slow on mobile, drop to 500 hard / 200 easy.
- Slither at 4000×4000 with multiple AI snakes will tax GC. Mitigation: pool particles, avoid per-frame allocations, cap AI count.

## (g) Accessibility gaps to deepen

- Many game canvases have generic `aria-label`. Should describe game state where reasonable.
- Solitaire has no keyboard alternative to drag. New `GAI.input.drag` will support keyboard mode too.
- Battleship hits/misses use color only — add `◇` for hits and `◯` for misses.
- Some game-over screens lack a `role="dialog"` and `aria-live` for screen reader announcement of the final score.

## (h) Out-of-scope but tempting

- A "demo mode" that plays itself when idle (nice for kiosks)
- A "ghost replay" sharing system for stack/snake
- Real-time multiplayer (explicitly forbidden by constraints — not even tempted)
- A second visual theme set (90s, monochrome) — would dilute the brand

## (i) Execution order

1. plan-phase3.md → commit `docs: phase 3 plan`
2. Static audit findings → commit `docs: phase 3 audit findings`
3. Shared core expansion (dice, text, path, mcts, drag, fx, ui.pause, ui.shareCard, ui.playNext, pins, blitz, welcomeBack) → commit
4. 8 new games in this order: craps → type → pixel → spider → cribbage → slither → backgammon → go. One commit per game.
5. Home page evolution: 7 categories, search, pins, sorted-by-play-count → commit
6. /stats page (canvas charts, no library) → commit
7. Cross-game: blitz mode (3 critical games), share cards (via shared helper), play-next, welcome-back → commit
8. Optimization sweep: payload audit + dead code removal where high-value → commit
9. Per-game OG generator (procedural HTML page that renders all 37 variants) + per-game JSON-LD → commit (no per-PNG output — needs browser; documented in commit)
10. README + CLAUDE.md + sitemap + manifest update for 37 games → commit
11. Static smoke tests (HTTP 200, node --check syntax, GAI.* reference validity, HTML ID linkage) → commit any final fixes
12. `git push origin main`

## (j) What I'll cut if scope is tight (named explicitly, never games)

- **Per-game PNG OG generation** — write the HTML generator, defer the actual rendering to the user
- **Per-game OG meta tags in HTML** — leave shared `og.png` reference in place, just update the home page meta
- **Blitz mode** — implement on 3 most-fitting games (snake, blocks, bubbles), not all
- **Sound design audio panel** (Section 5.3) — defer to a future phase
- **Per-card-game tiny details** like blackjack chip stacks or shuffle animation (Section 10) — defer
- **Welcome-back animation** — implement minimal version (single toast) not the full cinematic
- **Stats heatmap calendar** — implement plays-per-day bar chart + most-played; defer the GitHub-style 365-day grid (which needs more session data than most users have yet)
- **AI minimax extraction** — leave per-game (chess, checkers, connect4 each work fine); add the generic helper but don't migrate. `GAI.ai.minimax` will be available but is opt-in.

## (k) Quality bar

- All 37 routes HTTP 200; all JS syntax-valid (node --check)
- All GAI.* references resolve (validated by linting script)
- All HTML `getElementById` calls have matching IDs in the HTML
- All key game logic unit-tested where reasonable (poker eval, blackjack hand, chess opening = 20 moves, go ko, cribbage scoring)
- No console.{log,warn,error} statements in production code
- Gzipped per-game game.js stays within budget (chess/go ≤ 25KB, other complex ≤ 15KB, medium ≤ 10KB, simple ≤ 5KB)
- shared/core.js gzipped ≤ 18KB
- All games keep working in `prefers-reduced-motion`
- New games respect existing patterns: 100dvh, safe-area-inset-*, touch-action: manipulation, debounced resize, visibilitychange handler where rAF runs
