# GETABOUTIT

> how high can you go

A one-tap stacking game. Retro vaporwave, infinite tower, daily seed, shareable score.

**Play:** [getaboutit.com](https://getaboutit.com)

## How to play

Tap, click, or press any key to drop the moving block. Land it flush for a **perfect** — chain three perfects and your block grows back. Chain five and unlock a rainbow boost.

Miss entirely and the tower collapses. How high you climb is your score.

Each day's run uses the same random seed for everyone, so today's score is directly comparable to anyone else playing today.

## Stack

Pure static. No build, no deps.

- HTML, CSS, vanilla ES6+ JavaScript
- Canvas 2D for the game
- Web Audio API for procedurally generated sound
- localStorage for scores and preferences
- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) from Google Fonts

## Local development

    python3 -m http.server 8000
    # visit http://localhost:8000

Or just open `index.html` directly. There's no build step.

## Deploy

`main` auto-deploys to [Vercel](https://vercel.com). Config in `vercel.json`.

## Layout

    ├── index.html      markup, meta, font loading
    ├── style.css       overlays + retro UI
    ├── game.js         game loop, rendering, audio, storage
    ├── vercel.json     static hosting config
    ├── CLAUDE.md       guidance for Claude Code
    └── README.md       you are here
