# GETABOUTIT

> how high can you go

A one-tap stacking game. Retro vaporwave, infinite tower, daily seed, shareable score.

**Play:** [getaboutit.com](https://getaboutit.com)

## How to play

Tap, click, or press any key to drop the moving block. Land it flush for a **perfect** — chain three perfects and your block grows back. Chain five and unlock a rainbow boost. Land dead-center (within 2px) for a **perfect+** golden bell.

Miss entirely and the tower collapses. How high you climb is your score.

The climb passes through eight zones — GROUND, NEON CITY, CLOUDS, STRATOSPHERE, ORBIT, DEEP SPACE, NEBULA, THE VOID — each with its own palette, ambient pad, and entry sting. Specific floors trigger one-shot atmospheric events (shooting stars, comets, confetti at 100, and more).

Each day's run uses the same random seed for everyone, so today's score is directly comparable to anyone else playing today. Atmospheric events are seeded too — every player sees the same wow moments at the same floors today.

After a run you can copy the text card, share it via the system share sheet, or **📸 SAVE IMAGE** to grab a 1080×1920 portrait screenshot for stories. Daily streaks (🔥) and a lifetime floor count track on the splash.

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

    ├── index.html          markup, meta, JSON-LD, font loading
    ├── style.css           overlays + retro UI, vignette, scanlines, a11y rules
    ├── game.js             game loop, rendering, audio, storage, share card
    ├── og-generator.html   regenerates og.png / apple-touch-icon / favicon
    ├── vercel.json         static hosting config
    ├── CLAUDE.md           guidance for Claude Code
    └── README.md           you are here
