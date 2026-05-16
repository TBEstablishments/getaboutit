# Phase 4 — Verification

**Branch:** `phase4-recovery` · **Tip:** `bcce7a4` (15 commits ahead of `main`).
**Last update:** 2026-05-16

This is the verification artifact required by Rule 2 ("baseline before fix, verify
after fix"). It pairs with `phase4-baseline.md` and documents the state I can
verify from this CLI environment, plus an explicit list of the verification
steps that require human eyes / a browser / a Vercel preview URL I could not
discover from this environment.

---

## 1. Audit Findings Resolution

| # | original audit finding                                  | status   | evidence / commit |
|---|---------------------------------------------------------|----------|-------------------|
| 1 | 36 of 37 games unreachable (relative-path 503/404)      | FIXED    | `ea63d5d` absolute /<key>/* refs; local curl 200 on all 37 game asset sets |
| 2 | /2048 hard 404                                          | FIXED*   | `ecba11d` modern :path* rewrite. *needs preview-deploy curl to confirm Vercel honors it |
| 3 | /stats renders skeleton                                 | FIXED    | `ea63d5d` /stats/stats.js + /stats/style.css now absolute |
| 4 | /settings renders skeleton                              | FIXED    | `ea63d5d` /settings/settings.js + /settings/style.css now absolute |
| 5 | /og.png 404                                             | DEFERRED | meta still points to /og.png; PNG generation is a browser-bound task (see §7) |
| 6 | /apple-touch-icon.png 404                               | DEFERRED | same reason as 5 |
| 7 | /favicon.ico 404                                        | FIXED    | `4dff84a` 308 redirect /favicon.ico → /favicon.svg in vercel.json |
| 8 | applyTheme TypeError at core.js:1057                    | FIXED    | `6f81d7c` null-guard + DOMContentLoaded self-defer |
| 9 | Home keyboard scroll broken (PageDown does nothing)     | FIXED    | `047976d` arcade.css scoped scroll rules; removed !important arms race |
| 10 | "/" doesn't focus search                                | FIXED    | `047976d` defensive handler; the handler already existed but TypeError in (8) may have aborted arcade.js before registration |
| 11 | meta viewport contains user-scalable=no                 | FIXED    | `047976d` swept across all 40 HTMLs |
| 12 | Settings copy "29 games" → should be 37                 | FIXED    | `c3cfa06` |
| 13 | Pong splash black-on-black                              | MITIGATED| `f9d6186` defensive `#splash/.splash/#over/#gameover { color: #fff }` default in core.css. Symptom could not be reproduced from source inspection — Pong's own .tap is yellow, .sub is teal — so the fix is preventative. Live verification on preview needed to confirm. |
| 14 | Per-game OG/Twitter/JSON-LD missing                     | FIXED    | `bcce7a4` 36 games now have full meta sets (Stack already had it pre-Phase-4) |
| 15 | Splash click handlers attached to overly specific child | NOT REPRODUCED | could not identify a specific game where this is broken from source; .screen has `pointer-events: auto` on all children — clicks bubble. Re-test on preview. |
| 16 | Mini-preview tiles 10+ empty until scrolled to          | FIXED    | `56d7b74` eager one-frame paint on every tile at boot; first 9 pinned visible |
| 17 | Tap targets below 44×44 (tabs, search clear)            | FIXED    | `5f3d5ef` min-height/width 44px on .tab, .search-input, .search-toggle |
| 18 | Surprise Me overlaps tiles on narrow viewports          | FIXED    | `77a903e` @media (max-width: 600px) full-width dock |
| 19 | MOOD theme cycle unfulfilled                            | NO-OP / WIRED | Option A: already fully wired in main pre-Phase 4 — arcade.js:553 cycles theme, settings.js:7-18 sets directly, footer indicator at arcade.js:185-188, CSS rules for both alt themes are non-trivial visual changes. Not a regression. |
| 20 | Wordmark jitter too rapid                               | FIXED    | `4781021` replaced 3.3s stepwise chromJitter with 8s ease-in-out chromBreathe (0.5Hz breaths + occasional 200ms pulse) |
| 21 | Asset cache wasn't immutable for versioned files        | FIXED    | `cd8fd09` vercel.json headers: ?v= → immutable 1y, unversioned → must-revalidate |
| 22 | Stale Phase 3 assets cached by browsers                 | FIXED    | `ea63d5d` ?v=phase3.1 → ?v=phase4 across every HTML + SITE_VERSION in core.js |

\* Items marked FIXED* are correct in source but their preview-deploy
behavior is the verification step blocked on the preview URL.

---

## 2. Live Verification (Preview Deploy)

**Blocked on preview URL.** The phase4-recovery branch was pushed
(`origin/phase4-recovery` at `bcce7a4`) but I could not auto-discover the
Vercel preview URL from this environment:

- `mcp__claude_ai_Vercel__list_teams` returned `{teams: []}` (personal account)
- `mcp__claude_ai_Vercel__list_projects` returns `error: Failed to list projects` without a teamId, and no plausible teamId guess worked
- Probed five common URL patterns (`getaboutit-git-phase4-recovery-<scope>.vercel.app`) — all 404'd
- No `.vercel/` directory in the repo with a project ID

What I need from the user for §2 to complete:
```
the Vercel preview URL — usually visible in the Vercel dashboard's
deployments tab or in the GitHub PR's "vercel" bot comment for the
phase4-recovery branch.
```

Once provided, the verification steps I will run are:
```bash
curl -sI <preview>/                              # 200
curl -sI <preview>/snake                         # 200 (cleanUrls)
curl -sI <preview>/2048                          # 200 (rewrite)
curl -sI <preview>/stats                         # 200
curl -sI <preview>/settings                      # 200
curl -sI <preview>/favicon.ico                   # 308 → favicon.svg
curl -sI <preview>/shared/core.js?v=phase4       # 200, Cache-Control immutable
curl -sI <preview>/shared/core.js                # 200, must-revalidate
curl -s  <preview>/snake | grep og:type          # the new meta is in the wire
```

---

## 3. Local Verification (best-effort substitute)

Ran a 40-row sweep against `python3 -m http.server`:

| pages       | HTML 200 | assets 200       | meta correct |
|-------------|----------|------------------|--------------|
| 37 games    | 37/37    | every asset 200  | 37/37 have og:type + canonical + json-ld + window.GAME_KEY (Stack exempted on last) |
| /stats      | 200      | 5/5              | n/a |
| /settings   | 200      | 5/5              | n/a |
| / (home)    | 200      | 4/4              | already has full meta |

`node --check` passes on all 42 JS files in the repo.

This proves the absolute-path fix and the per-game meta injection are correct
at source. It does NOT replace browser-side verification of cleanUrls, Vercel
rewrites, the applyTheme deferral landing cleanly, or actual gameplay — those
need the preview URL.

---

## 4. Mobile / a11y Verification

What I changed:
- `user-scalable=no` removed from every viewport meta (40 HTMLs)
- Tap targets bumped to ≥ 44×44 on `.tab`, `.search-input`, `.search-toggle`,
  and `#surprise`
- Below 600px, `#surprise` docks full-width along the bottom (no overlap with
  bottom-row tiles)
- Game-page scroll lockdown stays scoped to `body.game` (in `shared/core.css`)
- Non-game pages get clean scoll rules (no !important)

What needs a browser to verify:
- DevTools mobile preview at 390×844 and 360×640 — confirm tile grid + dock
- Pinch-zoom on mobile — confirm now works
- Keyboard PageDown / Space / Home / End on home — confirm scrolls

---

## 5. OG / Social Verification

What I changed:
- 36 game HTMLs received a full og:type/url/title/description/image set, a
  matching twitter:card set, and a VideoGame JSON-LD block
- Stack was already wired pre-Phase 4 (not re-touched)
- All meta point to `https://getaboutit.com/og/<key>.png`

What's missing:
- **The actual `/og/<key>.png` PNGs do not exist** and cannot be generated
  from this CLI environment. `og-generator.html` is browser-bound (uses
  HTMLCanvas to draw and `<a download>` to save). ImageMagick / rsvg-convert
  / inkscape are not available in this shell.
- `/og.png` (the home OG) and `/apple-touch-icon.png` likewise need
  browser-bound generation.

For OG previews to render correctly on Twitter/Discord/etc., the user needs
to do this one-time browser pass:

```
1. Open /og-generator.html locally (python3 -m http.server, then visit it)
2. Click "⬇ SAVE ALL 37"
3. Each saved file lands in Downloads as og-<key>.png
4. mkdir og/ in the repo root, drop the 37 PNGs in, rename strip the og- prefix
5. Also save og.png (home) and create apple-touch-icon.png (1 size) and favicon.png (32×32)
6. git add og/ og.png apple-touch-icon.png favicon.png && commit
```

The meta tags are in place, so previews start working the moment the PNGs
land. Doing this in a future commit doesn't require any HTML edits.

---

## 6. Performance Snapshot

Cannot run Lighthouse from this environment. The cache-header change
(`cd8fd09`) is a definite improvement: every CSS/JS request with
`?v=phase4` now serves immutable for 1y, so navigation between games
saves a round-trip. The wordmark animation change reduces paint pressure
(8s ease-in-out vs 3.3s stepwise).

Per-game payload baseline unchanged from Phase 3 — no new shared code,
only HTML meta tags (~1KB per game).

---

## 7. Anti-Pattern Check

| check                                                          | status |
|----------------------------------------------------------------|--------|
| Every claim backed by curl/screenshot/grep evidence            | ✓ for source-side claims; ✗ for browser-side (called out explicitly in §2) |
| All testing done against deployed URL, not localhost           | ✗ — local only, preview URL unavailable from this env |
| All 37 games personally played to gameplay state               | ✗ — no browser available; node syntax + curl coverage substituted, called out as limitation |
| Console clean confirmed via DevTools screenshot, not assumption | ✗ — needs human eyes on preview deploy |

I am explicitly NOT claiming "Phase 4 is done." I am claiming "everything
the CLI environment can do is done." The remaining work is a 10-minute
manual pass on the preview URL plus a one-time browser pass to generate
the OG PNGs.

---

## 8. Known Remaining Issues

1. **OG PNGs not generated.** Meta tags point to `/og/<key>.png` × 37, plus
   `/og.png` and `/apple-touch-icon.png` — none of these files exist yet.
   `/favicon.ico` redirects to `favicon.svg` (acceptable fallback), so
   the favicon line is solved.
   - Mitigation: one-time browser pass with `og-generator.html`.
   - Impact while unresolved: social-link previews show no image.

2. **Preview-deploy curl/console verification not done.** Listed in §2.
   The user needs to provide the preview URL, or merge to main (with the
   understanding that production will redeploy on merge and can be curl'd
   then — but the spec says no merge without user sign-off).

3. **/2048 rewrite is the only fix that's not "proven correct from source
   alone."** Vercel rewrite semantics are not fully testable locally
   (python http.server has no rewrites). The new `:path*` syntax is what
   Vercel currently recommends, but if it still 404s on the preview, the
   fallback is a `redirects` block (308 to `/p2048`) — that change would
   be a single-line vercel.json edit if needed.

4. **Pong "black-on-black splash" symptom not reproduced** from source.
   `core.css` now defaults `#splash` to white, which prevents the class
   of bug going forward. If the live preview still shows it, the deeper
   fix lives in `pong/style.css` and would need a screenshot to debug.

5. **Splash click handlers (audit item 15)** I could not identify the
   specific broken game from source — `.screen *` has `pointer-events: auto`
   site-wide. Defer to per-game preview testing.

6. **First-time visitors don't see the new wordmark breathing** because the
   `body.entrance .wordmark { animation: wmEnter ... }` rule has higher
   specificity than `.chrom-jitter` and persists (body.entrance is never
   removed). Existing behavior — not a Phase 4 regression. Worth a Phase 5
   ticket if the gentler breathing is meant to be a hero feature.

---

# Phase 4 Wrap-Up Addendum

After the initial verification report, the user confirmed visual review of
the preview ("games play, console clean"), provided the preview URL, and
asked for three final commits plus the merge.

## Wrap-up commits

| commit  | purpose                                                              |
|---------|----------------------------------------------------------------------|
| cf82c52 | chore: og images named to match meta references (37 PNGs + og.png)   |
| f166585 | fix: device-aware play/retry prompts                                 |
| d3abc34 | docs: known issues for future phases                                 |
| (this)  | docs: phase 4 verification finalized                                 |

## Final live curl sweep (attempted)

Attempted against the preview URL the user provided
(`getaboutit-git-phase4-recovery-tbestablishments.vercel.app`). Anonymous
curl returned `HTTP 404` with `x-vercel-error: DEPLOYMENT_NOT_FOUND` —
either the preview is auth-protected (Vercel logged-in session required),
or the URL string differs from the one the deployment is actually aliased
to. The Vercel MCP's `get_access_to_vercel_url` and `web_fetch_vercel_url`
both also returned `Unable to create shareable URL`.

Per spec Section 6 the same curl sweep is required against production
after merge — that is the version I will run and paste into "Production
sign-off" below.

## Audit Findings — Final Status (one-liner per item)

| # | finding                                       | status                        |
|---|-----------------------------------------------|-------------------------------|
| 1 | 36 of 37 games unreachable                    | FIXED · ea63d5d               |
| 2 | /2048 hard 404                                | FIXED · ecba11d (Vercel rewrite verified post-merge below) |
| 3 | /stats skeleton                               | FIXED · ea63d5d               |
| 4 | /settings skeleton                            | FIXED · ea63d5d               |
| 5 | /og.png 404                                   | FIXED · cf82c52 (Stack image as home OG) |
| 6 | /apple-touch-icon.png 404                     | DEFERRED · known-issues.md (needs 180×180 generator) |
| 7 | /favicon.ico 404                              | FIXED · 4dff84a (308 → favicon.svg) |
| 8 | applyTheme TypeError on every page load       | FIXED · 6f81d7c               |
| 9 | Home keyboard scroll broken                   | FIXED · 047976d               |
| 10 | / shortcut doesn't focus search              | FIXED · 047976d               |
| 11 | meta viewport user-scalable=no               | FIXED · 047976d               |
| 12 | Settings copy "29 games"                     | FIXED · c3cfa06               |
| 13 | Pong splash black-on-black                   | MITIGATED · f9d6186 (preventative #splash default) |
| 14 | Per-game OG/Twitter/JSON-LD missing          | FIXED · bcce7a4 + cf82c52     |
| 15 | Splash click handler over-specific           | NOT REPRODUCED · known-issues.md |
| 16 | Mini-preview tiles 10+ empty                 | FIXED · 56d7b74               |
| 17 | Tap targets below 44×44                      | FIXED · 5f3d5ef               |
| 18 | Surprise Me overlaps tiles narrow viewports  | FIXED · 77a903e               |
| 19 | MOOD theme cycle promise unfulfilled         | NO-OP · already wired pre-Phase 4 |
| 20 | Wordmark jitter too rapid                    | FIXED · 4781021               |
| 21 | Asset cache not immutable for versioned files | FIXED · cd8fd09              |
| 22 | Stale Phase 3 assets cached                  | FIXED · ea63d5d (?v=phase4)   |
| NEW | "TAP TO PLAY" misleading on desktop         | FIXED · f166585 (device-aware) |

## What This Phase Did Not Address (moved to known-issues.md)

- Gameplay difficulty calibration (per-game audit needed)
- Per-game rule-fidelity comparison
- Live mobile device testing (only DevTools mobile preview)
- Achievement toast in-game observation
- Lighthouse end-to-end per game
- /apple-touch-icon.png + /favicon.png generation
- First-visit entrance vs new wordmark breathing interaction

## Sign-off

- **User visual review on preview:** YES (user reply 2026-05-17)
- **Preview URL provided:** `getaboutit-git-phase4-recovery-tbestablishments.vercel.app`
  (anonymous fetch from this env returned DEPLOYMENT_NOT_FOUND — see above)
- **Commit at sign-off (pre-merge):** `d3abc34` (this addendum then bumps to its own hash)
- **Remaining items moved to known-issues.md:** YES

## Production sign-off (post-merge)

Merge: `fe80025` (--no-ff merge of phase4-recovery into main). Vercel
auto-redeployed; production reflected `v=phase4` on the first poll.

Full `curl` battery against `https://getaboutit.com`:

```
Game pages (cleanUrls):
  200  /snake
  200  /chess
  200  /go
  200  /backgammon
  200  /hearts
  200  /pong
  200  /stack

/2048 rewrite:
  200  /2048                                  ← the Vercel rewrite works

Versioned game assets:
  200  /snake/style.css?v=phase4
  200  /snake/game.js?v=phase4
  200  /chess/style.css?v=phase4
  200  /chess/game.js?v=phase4
  200  /p2048/game.js?v=phase4

Utility pages:
  200  /stats
  200  /settings
  200  /stats/stats.js?v=phase4
  200  /settings/settings.js?v=phase4

Branding / OG:
  200  /og.png
  200  /og/snake.png
  200  /og/chess.png
  200  /og/p2048.png
  200  /favicon.svg
  308  /favicon.ico              → /favicon.svg
  404  /apple-touch-icon.png     (deferred; known-issues.md)

Cache headers:
  /shared/core.js?v=phase4   public, max-age=31536000, immutable
  /shared/core.js            public, max-age=0, must-revalidate

Meta sanity:
  /snake has 1 og:type meta line   ✓
  viewport (home + snake) is "width=device-width, initial-scale=1,
    viewport-fit=cover"   ✓  (no user-scalable=no)
```

**All targets PASS** except `/apple-touch-icon.png`, which is flagged
in known-issues.md as deferred to a future phase (needs a 180×180
generator).

Browser-side verification (console clean, gameplay) was done by the
user on the preview before the merge.

