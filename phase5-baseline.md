# Phase 5 — Baseline (current SEO state)

Captured **2026-05-17** against `https://getaboutit.com` (post-Phase 4
merge, commit `3f6f72a`).

---

## 1. Lighthouse scores

Ran the official Lighthouse CLI against production. The SEO category
captured cleanly; the full Perf/A11y/BP audit returned
FAILED_DOCUMENT_REQUEST in this WSL/Chromium setup even with
non-throttled flags — re-audit on preview will use a fresh Chromium and
should clear. The SEO-only sweep is the metric Phase 5 needs to defend.

| URL                              | Perf | A11y | BP  | SEO |
|----------------------------------|------|------|-----|-----|
| https://getaboutit.com/          | env✗ | env✗ | env✗| **100** |
| https://getaboutit.com/snake     | env✗ | env✗ | env✗| **100** |
| https://getaboutit.com/chess     | env✗ | env✗ | env✗| **100** |
| https://getaboutit.com/2048      | env✗ | env✗ | env✗| **100** |

Baseline SEO is already 100 across the four sample pages — Phase 4's
meta cleanup paid off. Phase 5 must **defend** this score while expanding
the content depth, structured data, and internal-link graph that Google
weights *beyond* the SEO category checkmarks.

---

## 2. Structured data

**Home** — has a single CollectionPage block listing all 37 games as
`hasPart`. No `WebSite`, no `SearchAction`, no `FAQPage`, no
`Organization` (publisher logo missing).

**Per game** — single `VideoGame` block with the minimum fields:

```json
{
  "@type": "VideoGame",
  "name": "SNAKE",
  "url": "https://getaboutit.com/snake",
  "description": "eat the dots",
  "image": "https://getaboutit.com/og/snake.png",
  "genre": "Arcade",
  "gamePlatform": "WebPlatform",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Any"
}
```

Missing fields (Phase 5 will add): `playMode`, `applicationSubCategory`,
`browserRequirements`, `inLanguage`, `isAccessibleForFree`,
`aggregateRating`. `operatingSystem` is "Any" — should be "Web Browser".
No `BreadcrumbList`.

---

## 3. Meta description uniqueness

Today there are two parallel description fields with different sources:

| game  | `<meta name="description">`                                       | `<meta property="og:description">`           |
|-------|--------------------------------------------------------------------|-----------------------------------------------|
| snake | Eat. Grow. Don't bite your tail.                                   | eat the dots. Free, no signup.                |
| chess | Chess — full rules, beat the AI, easy or hard.                     | the eternal game. Free, no signup.            |
| 2048  | Merge tiles. Reach 2048.                                           | merge to win. Free, no signup.                |
| stack | A one-tap stacking game. Climb from ground to deep space. Daily seed. | A one-tap stacking game. Climb from ground to deep space. |
| words | Guess the five-letter word in six tries. Daily puzzle.             | guess in six. Free, no signup.                |
| pong  | First to eleven. Vaporwave Pong.                                   | first to eleven. Free, no signup.             |

Two problems:

- **Mismatch within page** — the two description fields tell different stories.
- **og:description is a stamped template** (`{tag}. Free, no signup.`) so
  all 37 are near-identical when crawlers compare them.

Phase 5 will write 140-160 char unique descriptions and apply them to
all three (description, og:description, twitter:description).

---

## 4. Favicon surface inventory

```
200  /favicon.svg
308  /favicon.ico              → /favicon.svg
404  /favicon.png
404  /favicon-32.png
404  /favicon-16.png
404  /apple-touch-icon.png
404  /icon-192.png
404  /icon-512.png
404  /maskable-icon.png
```

Only the SVG and the redirected ICO resolve. iOS home-screen icon and
all PWA install surfaces 404 today.

---

## 5. Sitemap.xml & robots.txt

**sitemap.xml** — 40 entries: 1 home + 37 games + /stats + /settings.
Mixed `changefreq` (weekly / daily / monthly), all games at
`priority: 0.9` (too uniform), **no `lastmod`** on any entry. Missing:
the 7 category landing pages that Section 5 will introduce, and /about
from Section 9.

**robots.txt** — minimal. Does not Disallow `/og-generator.html` (a
development tool we don't want crawled).

```
User-agent: *
Allow: /
Sitemap: https://getaboutit.com/sitemap.xml
```

**humans.txt** — present and respectable (TEAM/TECH/THANKS sections).
Will refresh as part of §8 to reflect post-Phase-4 reality.

---

## 6. Meta head completeness (per-page audit)

|                              | home | snake | utility (/stats, /settings) |
|------------------------------|------|-------|------------------------------|
| `charset`                    | ✓    | ✓     | ✓ |
| `viewport`                   | ✓    | ✓     | ✓ |
| `theme-color`                | ✓    | ✓     | ✓ |
| `canonical`                  | ✓    | ✓     | partial |
| `referrer`                   | ✗    | ✗     | ✗ |
| `color-scheme`               | ✗    | ✗     | ✗ |
| `keywords`                   | ✗    | ✗     | ✗ |
| `og:locale`                  | ✗    | ✗     | ✗ |
| `og:site_name`               | ✗    | ✗     | ✗ |
| `og:image:alt`               | ✗    | ✗     | ✗ |
| `twitter:image:alt`          | ✗    | ✗     | ✗ |
| `article:published_time`     | ✗    | ✗     | ✗ |

Every page is missing the same 7-8 polish fields. Phase 5 §7 sweeps
them in.

---

## 7. Gap summary that Phase 5 must close

1. Lighthouse SEO score — will measure first, target 100 across home + 3 games.
2. Add WebSite + SearchAction + Organization + FAQPage to home schema.
3. Add BreadcrumbList + expanded VideoGame to every game schema.
4. Generate 6 PNG icon sizes (no service worker — manifest only).
5. Write 37 unique meta descriptions; consolidate description / og: / twitter:.
6. Add "About this game" indexable content block per game.
7. Add "More games" deterministic internal-link footer per game.
8. Build 7 category landing pages (/arcade /puzzle /board /cards /casino /mind /skill).
9. Add home FAQ section + FAQPage schema.
10. Sweep meta heads for color-scheme, referrer, og:locale, og:site_name, og:image:alt, twitter:image:alt, keywords.
11. Refresh sitemap (add /about + 7 category landings, add lastmod, retune priorities). Update robots to block og-generator.
12. Create /about page (400-600 words of indexable copy).
13. Critical CSS inline on home + font preload + asset preload + ?v=phase5.
14. Verification: Rich Results, OpenGraph, Twitter Card, schema linter, Lighthouse, GSC + IndexNow submission docs.
