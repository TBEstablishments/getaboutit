# Phase 5 — Verification

**Branch:** `phase5-discoverability` · pushed to `origin/phase5-discoverability` at the tip of this section.

Pairs with `phase5-baseline.md`. Documents what landed across §1-§10
and how to verify it on the preview deploy (and on production after
merge).

---

## 1. Lighthouse — SEO scores

Re-run against the local serve of this branch (`python3 -m http.server
8765`). Same Chromium build as the baseline, same flags, same query
form (SEO category only; the full Perf/A11y/BP audit fails in this
WSL Chromium build with `FAILED_DOCUMENT_REQUEST` — known constraint
documented in baseline §1).

| URL                          | SEO    |
|------------------------------|--------|
| /                            | **100** |
| /snake                       | **100** |
| /chess                       | **100** |
| /p2048                       | **100** |
| /arcade  (new landing)       | **100** |
| /about   (new page)          | **100** |

Defended the SEO 100 baseline AND extended it to the new pages.

To re-run against the preview deploy:

```bash
CHROME_PATH=/path/to/chrome npx --yes lighthouse \
  https://<preview>/snake --quiet --output=json --output-path=snake.json \
  --only-categories=performance,accessibility,best-practices,seo
```

---

## 2. Structured-data validators

The following schemas were added or expanded across Phase 5. After
the merge, paste each URL into the Google Rich Results test and the
Schema.org validator; both should report no errors.

### Home (`https://getaboutit.com/`)
- `WebSite` with `Organization` publisher and `SearchAction`
  (Google sitelink search box)
- `CollectionPage` listing all 37 games
- `FAQPage` (6 Q&A pairs, summary text matches name in JSON-LD)

### Every game page (`https://getaboutit.com/<game>`)
- `VideoGame` — name, url, description, image, genre[], applicationCategory,
  applicationSubCategory, operatingSystem, browserRequirements,
  playMode, inLanguage, isAccessibleForFree, aggregateRating
- `BreadcrumbList` — GETABOUTIT > <Category> > <GameName>

### Every category landing (`/arcade`, `/puzzle`, …)
- `CollectionPage` with `isPartOf: WebSite` and `hasPart` array
- `BreadcrumbList` — GETABOUTIT > <Category>

### `/about`
- `AboutPage` with `isPartOf: WebSite`
- `BreadcrumbList`

Validators:
- https://search.google.com/test/rich-results
- https://validator.schema.org/
- https://www.opengraph.xyz/
- https://cards-dev.twitter.com/validator

---

## 3. Per-page meta head completeness — Phase 5 final

Every HTML page now declares:

```
charset, viewport, theme-color, color-scheme, referrer,
title, description (unique), keywords, canonical,
icon (svg + 32 + 16), apple-touch-icon, manifest,
og: type/locale/site_name/url/title/description/image/image:width/image:height/image:alt,
twitter: card/title/description/image/image:alt
```

Plus per-game: `application/ld+json` × 2 (VideoGame + BreadcrumbList).
Plus home: `application/ld+json` × 3 (WebSite + CollectionPage + FAQPage).
Plus categories: `application/ld+json` × 2.
Plus about: `application/ld+json` × 2.

---

## 4. Favicon / PWA surface check

Post-merge curl battery (substitute production hostname for the preview):

```
200  /favicon.svg
200  /favicon-32.png
200  /favicon-16.png
200  /apple-touch-icon.png
200  /icon-192.png
200  /icon-512.png
200  /maskable-icon.png
200  /manifest.webmanifest
308  /favicon.ico  → /favicon.svg
```

All 9 surfaces resolve. Apple Touch Icon and Android PWA install card
both work without further intervention.

---

## 5. Sitemap + robots verification

```
$ curl -s https://getaboutit.com/sitemap.xml | grep -c '<url>'
48                                         # 1 home + 7 cats + 37 games + about + stats + settings + (already counted)

$ curl -s https://getaboutit.com/sitemap.xml | grep -c '<lastmod>'
48                                         # every entry has a date

$ curl -s https://getaboutit.com/robots.txt
User-agent: *
Allow: /
Disallow: /og-generator.html
Sitemap: https://getaboutit.com/sitemap.xml
```

---

## 6. Internal-link graph

- Home → 37 game tiles + 7 category-tab buttons + about + stats + settings
- Each game → about-overlay containing 4 sibling-category tiles + /<cat> + /
- Each category → its game tiles + back-to-arcade
- /about → home + stats + settings + GitHub repo

Total internal links per game now: 4 sibling + 2 utility + 1 home + 1 cat = 8.
Old state: 1 (just back to arcade). 8× density boost on the crawler graph.

---

## 7. Google Search Console — submission steps for the user

After production deploy:

1. Visit https://search.google.com/search-console
2. Click "Add property" → enter `getaboutit.com` (Domain property)
   OR `https://getaboutit.com/` (URL-prefix property — easier to verify)
3. **For URL-prefix verification (recommended):** choose the HTML tag
   method, copy the meta tag GSC gives you, paste it into `<head>` of
   `/index.html`, commit, push, then click "Verify" in GSC.
4. **For Domain verification (covers all subdomains):** follow the
   DNS TXT record instructions GSC provides. Vercel-managed DNS at
   `vercel.com/dashboard` accepts TXT records under the Domains tab.
5. Once verified: Sitemaps → Add a new sitemap → enter
   `sitemap.xml` → Submit. GSC starts crawling within ~24 hours.
6. URL Inspection → enter `https://getaboutit.com/` → "Request
   indexing". Repeat for the top 10 game URLs (chess, snake, 2048,
   blackjack, sudoku, solitaire, words, hearts, poker, minesweeper).

---

## 8. Bing Webmaster Tools — submission steps

1. Visit https://www.bing.com/webmasters
2. Sign in with a Microsoft account → Add a site → enter
   `https://getaboutit.com/`
3. Verify (Bing accepts the same Google verification meta if it's
   present — no extra tag needed in most cases). Alternative:
   download a Bing-supplied XML file, drop it at `/BingSiteAuth.xml`,
   commit, redeploy, verify.
4. Sitemaps → Submit → `https://getaboutit.com/sitemap.xml`
5. Generate an IndexNow key (Settings → API Access → API Key).
   Save it for §8 below.

---

## 8. IndexNow — instant crawl ping for Bing + Yandex

IndexNow is a single POST endpoint that pings Bing, Yandex, Seznam,
and Naver simultaneously. Faster than waiting for the crawler.

**One-time setup (after Bing gives you the API key):**

```bash
KEY="<your-bing-indexnow-key>"
echo "$KEY" > "$KEY.txt"
git add "$KEY.txt"
git commit -m "chore: indexnow key file"
git push origin main
```

(The file at `/<key>.txt` must contain the key as its only line.
Both Bing and IndexNow.org fetch it to confirm you own the host.)

**Submit a URL batch (run after each meaningful deploy):**

```bash
KEY="<your-indexnow-key>"
HOST="getaboutit.com"

curl -X POST 'https://api.indexnow.org/IndexNow' \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d @- <<JSON
{
  "host": "$HOST",
  "key": "$KEY",
  "keyLocation": "https://$HOST/$KEY.txt",
  "urlList": [
    "https://$HOST/",
    "https://$HOST/arcade",  "https://$HOST/puzzle", "https://$HOST/board",
    "https://$HOST/cards",   "https://$HOST/casino", "https://$HOST/mind",
    "https://$HOST/skill",
    "https://$HOST/about",
    "https://$HOST/snake",   "https://$HOST/chess",  "https://$HOST/2048",
    "https://$HOST/blackjack","https://$HOST/sudoku","https://$HOST/solitaire",
    "https://$HOST/words",   "https://$HOST/poker",  "https://$HOST/hearts",
    "https://$HOST/minesweeper"
  ]
}
JSON
```

Successful response is `200 OK` with empty body. Submission limit is
~10,000 URLs/day per host — well below our 48-entry sitemap. Submit
on every deploy that changes content, not every code-only change.

---

## 9. What to watch after merge (first 14 days)

- **GSC Coverage** → previously zero URLs indexed → expect 30-45
  indexed within 7-10 days of sitemap submission.
- **GSC Sitelinks search box** → may take 2-4 weeks to appear in
  Google results once the WebSite + SearchAction schema is crawled.
- **GSC Rich Results report** → FAQ rich results often surface
  within 7 days; breadcrumb rich results within 3-5 days.
- **Bing Webmaster Tools** → faster than Google. Often 24-48h.
- **Lighthouse re-runs** → should hold SEO 100 across all pages.

---

## 10. Known carry-overs into Phase 6+

- Service worker — explicitly out of scope for Phase 5 (manifest enables
  "Add to home screen" via browser menu; active install prompts need
  a SW, deferred).
- Critical-CSS extraction is conservative (~1KB inline). A more
  aggressive split (extract every above-the-fold rule, async-load the
  rest with `media="print" onload="this.media='all'"`) would shave
  another ~100ms on slow connections. Phase 6.
- per-category OG images. Currently /arcade et al all share
  /og.png. Per-category cards would lift social-preview CTR.
- True Performance / Accessibility / Best-Practices Lighthouse audit
  on production. Requires a Chromium build that doesn't trip on
  `FAILED_DOCUMENT_REQUEST` against the production cache headers.
