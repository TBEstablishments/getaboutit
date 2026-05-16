# GETABOUTIT — Phase 2 Plan

Status: pre-execution.
Scope: 17 → 29 games. Audit. Hardening. Home redesign. Achievements. Themes.

## (a) Audit findings — what's wrong with the 17

1. **Event listener leaks site-wide.** Zero `removeEventListener` calls across all 17 games. Every game accumulates input listeners that survive page-hide. Memory leak on rapid retry cycles.
2. **rAF cleanup spotty.** Only 6/17 games cancel rAF on `visibilitychange`. The rest keep frames running while hidden (audio nodes too in some).
3. **CSS duplication.** `.big`, `.sub`, `.tap`, `.stats`, `.hud`, `.shake`, `.screen-bg-gradient` redefined in 12+ style.css files. ~300 lines of duplication.
4. **prefers-reduced-motion ignored by 14/17.** Only stack, reaction, and shared/core.css respect it; other animations (shake, flip, bounce) run regardless.
5. **Best-score display drift.** `BEST 0` vs `BEST: 0` vs `BEST —` vs `BEST — ms`. No central formatter.
6. **Audio cue hardcoding.** Every game inlines frequencies/envelopes for score-up, death, win, etc. No shared cue catalog → drift across games.
7. **Effects scattered.** Screen shake in 3 different forms (blocks via CSS class, invaders via reflow hack, words inline). Particle bursts re-implemented in asteroids, memory, stack with no sharing.
8. **Mobile touch gaps.** simon/tictactoe/minesweeper/lightsout/memory have weak keyboard or no-key support; rely entirely on canvas clicks.
9. **`GAI.input.*` exists but unused everywhere.** Every game uses raw `addEventListener`. Wasted abstraction.

## (b) Pattern reuse for the 12 new games

- **Card games (blackjack, poker, solitaire, hearts):** share new `GAI.cards` subsystem — deck, shuffle, draw, render. Solitaire and Hearts are heaviest (drag-on-touch + AI); blackjack/poker are simpler hand-rendering loops.
- **Board games with AI (chess, checkers, connect4):** all use the same `minimax + alpha-beta` shape. Build one generic minimax that takes an evaluator + move generator. Chess will be the only depth-3+ user; checkers/connect4 can be depth-4–5 cheaply.
- **Battleship:** grid input identical to minesweeper; reuse its grid-tap pattern.
- **Sudoku:** grid render shares structure with minesweeper but with sub-3x3 borders. Daily-seed pattern from words/lightsout.
- **Connect Four:** column-drop animation reuses falling-block ease from blocks; piece pitch borrows from simon tones.
- **Dots and Boxes:** edge-tap input is new; box-fill animation borrows from lightsout flip.
- **Bubbles:** grid+projectile hybrid; aim arrow + shot velocity adapted from asteroids' shot system. Pop chains borrow chain logic from p2048 merge.
- **Runner:** procedural-terrain auto-runner; parallax horizon already in arcade.js bg — extract to GAI.fx.outrunBg().
- **Chess:** the heaviest unique piece. Self-contained legal-move generator, perft-tested mentally for castling/ep/promotion.

## (c) shared/core.js additions

```
GAI.fx = {
  screenShake(el, intensity, duration)
  particleBurst(ctx, x, y, color, count, opts)
  chromaticFlash(durationMs, color?)
  confetti(ctx, opts) — returns dispose handle
  outrunBg(ctx, w, h, time)
}
GAI.ui = {
  splash({title, sub, tapLabel}) → root element + show/hide
  gameOver({score, best, label, retry}) → root + show/hide
  scoreCard({score, best, format}) → renders "SCORE X · BEST Y"
  countdown(seconds, onTick, onDone)
  toast(message, duration)
}
GAI.cards = {
  SUITS, RANKS
  newDeck(seed?)
  shuffle(arr, rng?)
  rankValue(card, aceHigh)
  handValue(cards) — blackjack 1/11 logic
  evalPoker(hand) — returns hand rank (1..9 jacks..royal)
  draw(ctx, x, y, w, h, card, opts)
  cardBack(ctx, x, y, w, h)
}
GAI.ai = {
  minimax(state, depth, alpha, beta, isMax, evalFn, moveGenFn, applyFn, terminalFn)
}
GAI.cleanup = {
  on(target, event, fn, opts?) — registers + auto-removes on pagehide
  raf(fn) — returns wrapped rAF that auto-cancels on pagehide
  dispose() — manual flush
}
GAI.achievements = {
  list (read-only catalog)
  unlock(id) — fires toast if first time
  has(id), unlocked() (array), count(), total()
}
GAI.theme = { get(), set('default'|'deepnight'|'highcontrast'), cycle() }
GAI.export = { dump() → JSON string, load(jsonString) → boolean }
```

CSS additions to core.css:
- `.hud` positioning + safe-area padding
- `.score`, `.big`, `.sub`, `.tap`, `.stats` typography
- `.shake` + `@keyframes shake`
- `.flash-overlay` for chromatic flashes
- `.toast` for achievement notifications
- `.tab` / `.tab.active` for home category nav
- prefers-reduced-motion + prefers-contrast variants for new patterns

## (d) Anti-patterns to NOT carry forward

- **Don't add a new game without `GAI.cleanup`**. Every listener through the helper.
- **Don't write a custom shake or flash.** Use GAI.fx.
- **Don't hardcode best-score HTML.** Use GAI.ui.scoreCard / GAI.ui.gameOver.
- **Don't repaint a static screen at 60fps.** Card games + chess + sudoku should be DOM/event-driven where possible; canvas paint only when state changes.
- **Don't ship a game without prefers-reduced-motion.** Pause/skip non-essential animations.
- **Don't grow stack-style file size (2081 lines).** New games budget ≤ 500 lines for game.js; spill helpers to shared.
- **Don't introduce gradients outside the 2-stop bubble radial exception.** Cards/board surfaces use flat palette colors.
- **Don't add a checkbox feature flag, scaffolding, or hypothetical extensibility.** If a game has one difficulty, hardcode one difficulty.

## Execution order (Section 6)

1. plan.md → commit `docs: phase 2 plan`
2. Audit pass on 17 games — extract `GAI.fx`, `GAI.ui`, `GAI.cleanup`. Migrate games to use them. Unify best-score display. Fix listener leaks. Add reduced-motion everywhere → commit
3. Card subsystem (`GAI.cards`) → commit
4. 12 new games in this order: connect4 → checkers → dots → battleship → bubbles → runner → sudoku → hearts → solitaire → poker → blackjack → chess. One commit per game.
5. Home page categories + 29-tile grid + dynamic featured set → commit
6. Achievements + 3-game daily rotation + export/import (/settings) + theme cycle → commit
7. Final cross-cutting polish sweep → commit
8. Meta refresh: index meta, sitemap (29 URLs), JSON-LD, README, CLAUDE.md → commit
9. Manual smoke pass per game (load test + console clean)
10. `git push origin main`

## Quality bar

- No console errors/warnings in any game.
- Every game playable on 360×640 with touch only.
- Chess never plays an illegal move (perft-verified at depth 3 mentally on opening positions).
- Card games look like cards, not characters.
- 30-second cold-start home → game → play → game-over → back-to-home flow always under 200ms transitions and silky.
