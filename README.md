# GETABOUTIT

> free arcade · no signup · just play

A retro-vaporwave arcade with **29 classic games**. No accounts. No tracking. No ads. Just a tab full of bright tiny games.

**Play:** [getaboutit.com](https://getaboutit.com)

## The games

### Arcade
| URL | Game | About |
| --- | --- | --- |
| [/stack](https://getaboutit.com/stack) | STACK | one-tap tower |
| [/snake](https://getaboutit.com/snake) | SNAKE | eat the dots |
| [/blocks](https://getaboutit.com/blocks) | BLOCKS | falling tetrominoes |
| [/2048](https://getaboutit.com/2048) | 2048 | merge to win |
| [/breakout](https://getaboutit.com/breakout) | BREAKOUT | smash the bricks |
| [/pong](https://getaboutit.com/pong) | PONG | first to eleven |
| [/flap](https://getaboutit.com/flap) | FLAP | mind the gap |
| [/invaders](https://getaboutit.com/invaders) | INVADERS | hold the line |
| [/asteroids](https://getaboutit.com/asteroids) | ASTEROIDS | rotate, thrust, shoot |
| [/bubbles](https://getaboutit.com/bubbles) | BUBBLES | pop chain combos |
| [/runner](https://getaboutit.com/runner) | RUNNER | one tap to jump |

### Puzzle
| URL | Game | About |
| --- | --- | --- |
| [/memory](https://getaboutit.com/memory) | MEMORY | match the cards |
| [/minesweeper](https://getaboutit.com/minesweeper) | MINES | clear safe cells |
| [/slide](https://getaboutit.com/slide) | SLIDE | order the tiles |
| [/lightsout](https://getaboutit.com/lightsout) | LIGHTS OUT | turn them all off |
| [/words](https://getaboutit.com/words) | WORDS | guess in six |
| [/sudoku](https://getaboutit.com/sudoku) | SUDOKU | fill the grid |
| [/dots](https://getaboutit.com/dots) | DOTS & BOXES | claim the squares |

### Board
| URL | Game | About |
| --- | --- | --- |
| [/tictactoe](https://getaboutit.com/tictactoe) | TIC TAC TOE | three in a row |
| [/chess](https://getaboutit.com/chess) | CHESS | the eternal game |
| [/checkers](https://getaboutit.com/checkers) | CHECKERS | king me |
| [/connect4](https://getaboutit.com/connect4) | CONNECT 4 | four in a row |
| [/battleship](https://getaboutit.com/battleship) | BATTLESHIP | fire when ready |

### Cards
| URL | Game | About |
| --- | --- | --- |
| [/blackjack](https://getaboutit.com/blackjack) | BLACKJACK | 21 or bust |
| [/poker](https://getaboutit.com/poker) | POKER | jacks or better |
| [/solitaire](https://getaboutit.com/solitaire) | SOLITAIRE | classic time killer |
| [/hearts](https://getaboutit.com/hearts) | HEARTS | shoot the moon |

### Mind
| URL | Game | About |
| --- | --- | --- |
| [/simon](https://getaboutit.com/simon) | SIMON | remember the sequence |
| [/reaction](https://getaboutit.com/reaction) | REACTION | how fast can you tap |

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

- **Daily challenges** — three rotating picks per day (one arcade, one puzzle/board, one card/mind)
- **Daily puzzles** — Words, Lights Out, Slide, and Sudoku use a daily seed so today's puzzle matches across visitors
- **Streak counter** — keeps track of consecutive days you played anything
- **Recently played** — quick re-entry from the lobby
- **Surprise me** — picks a random game (never the one you just played); long-press to scope by category
- **Achievements** — 9 milestones to unlock; view at /settings
- **Themes** — default, deep night, high contrast; cycle by typing "mood" on home or via /settings
- **Export / import scores** — JSON backup at /settings, no account needed
- **Konami code** — ↑↑↓↓←→←→BA unlocks rainbow mode site-wide
- **MOOD** — typed anywhere on home cycles themes

## Layout

```
.
├── index.html / arcade.css / arcade.js    home page (the lobby)
├── shared/core.css / core.js / shell.js   GAI namespace + shared styles
├── stack/ snake/ … dots/                  one folder per game (29 total)
├── settings/                              progress backup, themes, achievements
├── favicon.svg / manifest.webmanifest
├── og-generator.html / og.png
├── robots.txt / sitemap.xml
├── vercel.json / CLAUDE.md / README.md
```
