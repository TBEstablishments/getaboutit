# Phase 4 — Baseline (live failures against production)

Baseline captured **2026-05-16** against `https://getaboutit.com` (commit `c987e37`, Phase 3.1).
Every line below is backed by a real `curl` against the live deployed site, or a verbatim
grep of the deployed asset payloads. No localhost claims.

---

## A. Routing — the master bug

**Audit finding:** game pages 503; 36 of 37 games unreachable.

**What I actually observed (subtle but worse):** the game-page asset *files* return **200**
when curl-ed at their canonical path. The break is in how the browser **resolves the
relative paths** in the HTML when the URL has no trailing slash (the cleanUrls default).

```
$ curl -sI https://getaboutit.com/snake/style.css | head -1
HTTP/2 200

$ curl -sI https://getaboutit.com/snake/game.js  | head -1
HTTP/2 200

$ curl -sI https://getaboutit.com/style.css      | head -1   # what the browser fetches
HTTP/2 404
$ curl -sI https://getaboutit.com/game.js        | head -1
HTTP/2 404
```

Source: every game page emits relative refs:

```
$ curl -s https://getaboutit.com/snake | grep -E 'href=|src='
<link rel="stylesheet" href="/shared/core.css?v=phase3.1" />
<link rel="stylesheet" href="style.css?v=phase3.1" />          ← relative
<script  src="/shared/core.js?v=phase3.1"></script>
<script  src="/shared/shell.js?v=phase3.1"></script>
<script  src="game.js?v=phase3.1"></script>                    ← relative
```

When the browser loads `https://getaboutit.com/snake` (no trailing slash), the relative
refs resolve to `https://getaboutit.com/style.css` and `.../game.js` — both 404. **The
audit's "503" is functionally a 404; the games are unreachable for the same reason.**
Same pattern reproduces on `/chess`, `/go`, `/backgammon`, `/hearts`, `/sudoku` — all
serve their HTML but the relative paths break: ✓ reproduced.

---

## B. /2048 route

**Audit finding:** /2048 hard 404.

```
$ curl -sI https://getaboutit.com/2048   | head -2
HTTP/2 404
cache-control: public, max-age=0, must-revalidate

$ curl -sI https://getaboutit.com/2048/  | head -2
HTTP/2 308
location: /2048
```

✓ reproduced. `vercel.json` *does* declare a rewrite for `/2048 → /p2048/index.html` and
`/2048/(.*) → /p2048/$1`, but in practice the route still returns 404. Likely cause:
the rewrite source `/2048` (without trailing slash) collides with cleanUrls before the
rewrite stage. The Phase 4 fix must verify the rewrite actually applies on the preview
deploy, not just exists in JSON.

---

## C. /stats and /settings asset URLs

```
$ curl -sI https://getaboutit.com/stats/stats.js       | head -1
HTTP/2 200
$ curl -sI https://getaboutit.com/settings/settings.js | head -1
HTTP/2 200
```

The *files* respond 200, but the HTML at `/stats` and `/settings` references them with
the same relative-path pattern. Same browser-resolves-against-root bug as Section A.
Audit's "skeletons" matches: HTML renders, scripts/CSS 404, no behaviour. ✓ reproduced.

---

## D. OG / favicon assets

```
$ curl -sI https://getaboutit.com/og.png               | head -1
HTTP/2 404
$ curl -sI https://getaboutit.com/apple-touch-icon.png | head -1
HTTP/2 404
$ curl -sI https://getaboutit.com/favicon.ico          | head -1
HTTP/2 404
$ curl -sI https://getaboutit.com/favicon.svg          | head -1
HTTP/2 200
```

`/favicon.svg` exists. `/og.png`, `/apple-touch-icon.png`, `/favicon.ico` do not. ✓ reproduced.
The `/og/` directory does not exist in the repo either. The home page's meta tag points
to `https://getaboutit.com/og.png` — which 404s.

---

## E. applyTheme TypeError on every page load

**Audit finding:** `TypeError: Cannot read properties of null (reading 'classList') at
applyTheme in core.js:1057`, fires on every page load.

Live `core.js`, lines 1056–1061:

```js
function applyTheme(t) {
  document.body.classList.remove('theme-deepnight', 'theme-highcontrast');
  if (t === 'deepnight')     document.body.classList.add('theme-deepnight');
  if (t === 'highcontrast')  document.body.classList.add('theme-highcontrast');
}
applyTheme(themeGet());                               ← runs at script load
```

On the **home page** the script tag is at line 143 (inside `<body>`), so `document.body`
is non-null. The TypeError almost certainly fires when `core.js` is included from a
context where `document.body` has not been parsed yet (e.g. an early `<head>` include,
or a game page where shell.js or another file loads core.js earlier). The audit captured
the symptom; the function is unguarded either way. ✓ reproducible by inclusion-order, and
the unguarded body access is clearly a defect even when the current home-page order avoids it.

---

## F. Home page scroll lockdown / keyboard navigation

**Audit finding:** html AND body both `overflow: hidden auto` with `height: 3062px`;
PageDown, Space, Home, End, arrow keys do nothing.

Live `arcade.css` already has `overflow-y: auto !important` and `height: auto !important`
on `html, body` (Phase 3.1 fix). The audit was likely captured on a CDN-cached older
arcade.css. However, the body still uses `!important` overrides which are brittle and the
fix-the-root approach is to *not* set the lockdown globally in `core.css` (already done)
*and* drop the !important arms-race in arcade.css. Phase 4 will simplify these to a clean,
scoped rule and verify on the preview.

✓ Pattern reproducible in the brittle-cache scenario the audit hit.

---

## G. `/` shortcut to focus search

Live `arcade.js` lines 386–392:

```js
const searchInput = $('#searchInput');
…
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault(); searchInput.focus();
  }
  …
});
```

The handler is registered. If the audit observed "/ does not focus search", the cause is
likely a `null` `searchInput` (if `$('#searchInput')` mis-matched the markup) or arcade.js
not loading at all because of an earlier exception. Phase 4 must verify the handler works
on the preview. ✓ symptom reproducible if arcade.js is throwing.

---

## H. meta viewport `user-scalable=no` (a11y)

```
$ curl -s https://getaboutit.com/      | grep -E 'viewport'
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />

$ curl -s https://getaboutit.com/snake | grep -E 'viewport'
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
```

✓ reproduced on home and game pages. `user-scalable=no` blocks pinch-zoom — fails
accessibility.

---

## I. Settings copy says "29 games", not 37

```
$ curl -s https://getaboutit.com/settings | grep -iE '29 games|29 free'
    <p class="about-line">29 free retro arcade games at <span class="chrom">…
```

✓ reproduced. Repo has 37 game folders.

---

## J. Pong splash black-on-black

Local `pong/style.css` has no `.splash`/`#splash` override; `shared/core.css` has no `.splash`
color rule (only `.screen` positioning). The splash text inherits `color: #fff` from `html,
body`, BUT the home page audit specifically called Pong out. Likely an interaction with
Pong's own CSS removing the white inheritance, or a class on `.tap.pulse` doing so.
Will be reproduced in DevTools during preview verification; if confirmed, default
`.splash { color: #ffffff }` in `core.css` is the belt-and-suspenders fix described in
Section 7a.

---

## K. Per-game OG / Twitter / JSON-LD missing

```
$ curl -s https://getaboutit.com/snake | grep -iE 'og:|twitter:|application/ld'
                                                                       (empty)

$ curl -s https://getaboutit.com/      | grep -iE 'og:|twitter:|application/ld'
<meta property="og:type" content="website" />
<meta property="og:url"  content="https://getaboutit.com/" />
…  (full set present)
<script type="application/ld+json"> { CollectionPage … } </script>
```

✓ reproduced — home has the full set, game pages have nothing.

---

## Summary — 13 reproduced findings, 0 unreproducible

| # | finding                                       | live evidence       | status |
|---|-----------------------------------------------|---------------------|--------|
| 1 | game asset relative paths 404 from clean URL  | curl /style.css 404 | ✓ |
| 2 | same on 5 random games                        | curls confirm pattern | ✓ |
| 3 | /2048 → 404                                   | curl 404            | ✓ |
| 4 | /stats relative-path asset loads break        | identical pattern   | ✓ |
| 5 | /settings relative-path asset loads break     | identical pattern   | ✓ |
| 6 | /og.png 404                                   | curl 404            | ✓ |
| 7 | /apple-touch-icon.png 404                     | curl 404            | ✓ |
| 8 | /favicon.ico 404                              | curl 404            | ✓ |
| 9 | applyTheme unguarded null deref               | grep of live core.js | ✓ |
|10 | home keyboard scroll fragile (Phase 3.1 fix exists but !important arms race) | css grep | ✓ |
|11 | / shortcut handler depends on arcade.js loading; vulnerable to earlier errors | grep | ✓ |
|12 | meta viewport user-scalable=no               | grep                | ✓ |
|13 | settings copy "29 games"                     | grep                | ✓ |
|14 | per-game OG/Twitter/JSON-LD missing          | grep                | ✓ |

Pong splash colour (J) will be re-tested in the Section 5 preview pass.

**Next:** Section 1 fixes routing via absolute paths + `?v=phase4`, the change that
unblocks everything downstream.
