# Known Issues — getaboutit.com

Tracked items for future passes. Not regressions; opportunities.

---

## Gameplay polish (future phase)

- **Difficulty calibration**: several games have inconsistent difficulty
  curves — too easy from the first move, too hard out of the gate, or
  unclear progression of stakes. Needs a per-game audit with target
  difficulty notes.
- **Control ergonomics**: some games feel awkward on desktop, others on
  mobile. Needs a per-input-mode review (mouse, trackpad, touch,
  keyboard) per game.
- **Rule fidelity**: a few card / board games may diverge from the
  canonical rules of their reference game. Needs reference-rule
  comparison per game.

(Specific games will be listed here as the user surfaces them — empty
deliberately to start.)

---

## Visual / branding assets

- **`/apple-touch-icon.png`** (180×180) and **`/favicon.png`** (32×32)
  are not yet generated. `og-generator.html` produces 1200×630 per-game
  cards but no root-asset renderers. Workarounds in place:
  - `/favicon.ico` 308-redirects to `/favicon.svg` (modern browsers ok)
  - `/og.png` (1200×630 home OG) is a copy of `/og/stack.png` (visually
    strong)
  - iOS Home Screen icon will currently fall back to a screenshot
- **Fix**: extend `og-generator.html` with four root-asset renderers
  (`og.png`, `apple-touch-icon.png` 180×180, `favicon.png` 32×32,
  `favicon.ico` 32×32), regenerate, commit.

---

## Verification gaps from Phase 4

- **Live preview curl never completed** from the CLI environment that
  ran Phase 4 — the Vercel preview URL returned `DEPLOYMENT_NOT_FOUND`
  to anonymous fetches (likely auth-protected or aliased differently
  than the URL string passed back to me). The human verified
  preview-deploy behaviour visually; mechanical post-merge production
  curl ran instead.
- **Lighthouse end-to-end** scores not captured per game (would need 37
  separate runs; deferred).
- **True mobile device testing** not done — only DevTools mobile
  preview was used.
- **Achievement toast in-game observation** not exercised on preview
  (toast logic itself wasn't touched in Phase 4, but visual
  verification didn't include an unlock event).

---

## Carried over from audit, not addressed in Phase 4

- **Splash click target** — audit suggested moving the click handler
  from `#splash` to its parent or canvas. Could not identify the
  specific game where this misbehaves; left as preventative fix.
  Re-test if specific game reports come in.
- **First-time entrance animation overrides the new wordmark breathing**
  because `body.entrance .wordmark { animation: wmEnter ... }` has
  higher specificity than `.chrom-jitter` and `body.entrance` is never
  removed. Result: first-visit users freeze on the entrance final
  frame; subsequent visits get the new 8s `chromBreathe`. If breathing
  is meant to be the hero behaviour everywhere, remove the entrance
  class after `animationend` on `.wordmark`.

---

## Carried over from prior phases

- **Pong "black-on-black splash"** — audit reported, source inspection
  could not reproduce. `core.css` now defaults `#splash` to white as
  preventative. Live re-test if the symptom recurs.
- **Mini-preview eager start** — first 9 tiles now pinned as visible,
  every tile gets one stamped frame at boot. If specific tiles still
  render blank on certain devices, the issue is in the preview tick
  function rather than the IntersectionObserver gating.
