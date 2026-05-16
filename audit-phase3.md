# GETABOUTIT Phase 3 — Pre-Execution Audit (29 games)

Static analysis run 2026-05-16. No runtime profiling (no browser available in this environment).

## Clean

- **Console statements**: 0 found across all production JS
- **TODO/FIXME/XXX**: 0 found
- **Inline AudioContext** outside `shared/core.js`: 0 found (all games use `GAI.audio.ensure()`)
- **Direct localStorage** outside `shared/core.js`: only via `GAI.storage.*` — clean
- **Missing reduced-motion guard**: 0 (Phase 2 patched the 6 games that had local animations)

## Payload status (gzipped)

| File | raw | gz | Phase 3 budget | OK? |
| --- | --- | --- | --- | --- |
| `shared/core.js` | 39.7KB | 12.2KB | 18KB | ✓ 6KB headroom |
| `shared/core.css` | 12.9KB | 3.4KB | (combined ≤ 18KB) | ✓ |
| `arcade.js` | 44.0KB | 11.4KB | 15KB | ✓ ~4KB headroom |
| `chess/game.js` | 20.5KB | 5.6KB | 25KB | ✓ |
| `stack/game.js` | 65.1KB | 17.2KB | 25KB | ✓ (v2 — large but in budget) |
| `solitaire/game.js` | 14.3KB | 3.9KB | 15KB | ✓ |
| `hearts/game.js` | 12.8KB | 4.1KB | 15KB | ✓ |

All current games comfortably within Phase 3 budgets. The 6KB headroom in core.js comfortably accommodates `GAI.dice`, `GAI.text`, `GAI.path`, `GAI.ai.mcts`, `GAI.input.drag`, `GAI.fx.*` additions, and `GAI.ui.{pause,shareCard,playNext}`.

## Risks identified

1. **Stack (v2) is the largest game at 65KB raw / 17KB gz.** This is by design (zones, audio overhaul, share v2, streak). Won't refactor; will leave untouched unless a bug appears.
2. **Chess minimax can stall UI on complex positions** at depth 3. Mitigation: wrap top-level search in cooperative chunks (`setTimeout(0)` after move ordering) so the "AI THINKING…" status actually paints before search starts.
3. **AI snake counts in Slither** will affect GC. Plan: cap at 5–8, pool particles, no per-frame allocations.
4. **Go MCTS at 800 rollouts × ~80 moves** could exceed mobile budget. Plan: drop to 500 hard / 200 easy if profiling (eventually) shows lag.

## Audit summary

The codebase is in excellent shape going into Phase 3. No leaks visible from static review, no anti-patterns, all games respect reduced-motion, all use shared helpers. Phase 3 work is purely additive (8 games + helpers + home evolution) and structural (categories, search, pins, stats).

The optimization sweep this phase will focus on:
- **Extracting** patterns into shared (no migration of working games — additive only)
- **Adding** budget tests to prevent future regressions
- **Documenting** the per-game contract more strictly in CLAUDE.md
- **Polishing** game-over screens through the new `GAI.ui.shareCard` + `playNext` helpers (games opt in; existing games left alone unless trivial to upgrade)
