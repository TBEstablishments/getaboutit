# GETABOUTIT

> free arcade · no signup · just play

A retro-vaporwave arcade with **16 classic games**. No accounts. No tracking. No ads. Just a tab full of bright tiny games.

**Play:** [getaboutit.com](https://getaboutit.com)

## The games

### Arcade
| URL | Game | About |
| --- | --- | --- |
| [/stack](https://getaboutit.com/stack) | STACK | one-tap tower |
| [/snake](https://getaboutit.com/snake) | SNAKE | eat the dots · BLITZ mode |
| [/blocks](https://getaboutit.com/blocks) | BLOCKS | falling tetrominoes |
| [/2048](https://getaboutit.com/2048) | 2048 | merge to win |
| [/breakout](https://getaboutit.com/breakout) | BREAKOUT | smash the bricks |
| [/pong](https://getaboutit.com/pong) | PONG | first to eleven |
| [/flap](https://getaboutit.com/flap) | FLAP | mind the gap |
| [/invaders](https://getaboutit.com/invaders) | INVADERS | hold the line |
| [/runner](https://getaboutit.com/runner) | RUNNER | one tap to jump |
| [/slither](https://getaboutit.com/slither) | SLITHER | grow, dodge, dominate |

### Board
| URL | Game | About |
| --- | --- | --- |
| [/tictactoe](https://getaboutit.com/tictactoe) | TIC TAC TOE | three in a row |
| [/chess](https://getaboutit.com/chess) | CHESS | the eternal game |
| [/checkers](https://getaboutit.com/checkers) | CHECKERS | king me |
| [/connect4](https://getaboutit.com/connect4) | CONNECT 4 | four in a row |

### Cards
| URL | Game | About |
| --- | --- | --- |
| [/blackjack](https://getaboutit.com/blackjack) | BLACKJACK | 21 or bust |
| [/solitaire](https://getaboutit.com/solitaire) | SOLITAIRE | classic time killer |

## Stack

Pure static. No build, no deps.

- Vanilla ES6+ JavaScript
- Canvas 2D for game rendering
- Web Audio API (procedural, no asset files)
- localStorage for scores and preferences
- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) from Google Fonts (only external resource)

## Local development

    python3 -m http.server 8000
    # visit http://localhost:8000/ for the lobby
    # visit http://localhost:8000/stack/ for a game

There's no build step. Just plain files served as-is.

## Deploy

`main` auto-deploys to [Vercel](https://vercel.com). Config in `vercel.json` (clean URLs, `/2048` rewrite, cache headers, security headers).

## Cross-game features

- **Daily challenges** — three rotating picks per day (one arcade, one board, one card)
- **Streak counter** — keeps track of consecutive days you played anything
- **Recently played** — quick re-entry from the lobby
- **Pinned games** — long-press / right-click any tile to pin (max 5); pinned strip appears above the grid
- **Search** — type `/` to focus, search any game by name or tag
- **Sort-by-plays** — default ALL view orders by your play count, daily-drivers float to the top
- **Surprise me** — picks a random game (never the one you just played); long-press cycles category mode
- **Achievements** — 8 milestones to unlock; view at /settings
- **Stats** — overview tiles + 30-day daily-plays chart + most-played + best scores + time per game + achievements
- **Themes** — default, deep night, high contrast; cycle by typing "mood" on home or via /settings
- **Export / import scores** — JSON backup at /settings, no account needed
- **Share cards** — game-over screen on supported games generates a 1080×1920 share PNG
- **Play next** — game-over screen suggests 3 same-category games to keep you in the loop
- **Welcome back** — returning after 24h+ shows a toast counting how many days
- **Konami code** — ↑↑↓↓←→←→BA unlocks rainbow mode site-wide
- **MOOD typed** — cycles themes
- **GAI typed** — CRT-collapse effect
- **🔥 HOT streak** — 7+ days lights the streak emoji on fire

## Layout

```
.
├── index.html / arcade.css / arcade.js    home page (the lobby)
├── shared/core.css / core.js / shell.js   GAI namespace + shared styles
├── stack/ snake/ … solitaire/             one folder per game (16 total)
├── stats/                                 stats dashboard
├── settings/                              progress backup, themes, achievements
├── favicon.svg / manifest.webmanifest
├── og-generator.html                      16-variant procedural OG image generator
├── robots.txt / sitemap.xml / humans.txt
├── vercel.json / CLAUDE.md / README.md / plan*.md
```

## License

Code is released under the [MIT License](LICENSE).

The **GETABOUTIT** name, wordmark, visual brand, and the curated
Golden Ticket word list are **not** covered by the MIT license and
remain the property of the project. Fork the code freely — just give
your arcade its own name and identity.
