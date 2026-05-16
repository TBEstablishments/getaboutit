(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const splash = document.getElementById('splash');
const over = document.getElementById('over');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const finalEl = document.getElementById('final');
const bestEl = document.getElementById('best');
const resultEl = document.getElementById('result');

let W = 480, H = 720, dpr = 1;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fit();
window.addEventListener('resize', fit);

const COLS = 7, ROWS = 4;
let aliens = [];
let ship, bullet, alienBullets, ufo;
let dir = 1;
let stepT = 0;
let score = 0;
let state = 'splash';
let best = +(GAI.storage.get('gai_best_invaders') || 0);
bestEl.textContent = best;
let stars1 = [], stars2 = [];

function buildStars() {
  stars1 = []; stars2 = [];
  for (let i = 0; i < 50; i++) stars1.push({ x: Math.random() * W, y: Math.random() * H, s: 1 });
  for (let i = 0; i < 25; i++) stars2.push({ x: Math.random() * W, y: Math.random() * H, s: 2 });
}
buildStars();

function reset() {
  aliens = [];
  const startX = (W - COLS * 50) / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      aliens.push({ x: startX + c * 50, y: 80 + r * 40, w: 32, h: 24, alive: true, color: PAL[r % PAL.length], frame: 0 });
    }
  }
  ship = { x: W / 2, y: H - 70, w: 36, h: 14 };
  bullet = null;
  alienBullets = [];
  ufo = null;
  dir = 1; stepT = 0;
  score = 0; scoreEl.textContent = '0';
}

function startGame() {
  GAI.audio.ensure();
  reset();
  splash.classList.add('hidden'); over.classList.add('hidden');
  hud.classList.remove('hidden');
  state = 'playing';
}

function endGame(won) {
  state = 'over';
  hud.classList.add('hidden');
  resultEl.textContent = won ? 'CLEARED' : 'GAME OVER';
  if (won) GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 80, 'triangle', 0.18);
  else GAI.audio.arpeggio([440, 369.99, 311.13], 130, 'sawtooth', 0.16);
  finalEl.textContent = score;
  if (score > best) { best = score; GAI.bestScore('invaders', best); }
  bestEl.textContent = best;
  setTimeout(() => over.classList.remove('hidden'), 300);
}

function aliveCount() { return aliens.filter(a => a.alive).length; }

function step() {
  let edge = false;
  for (const a of aliens) {
    if (!a.alive) continue;
    a.x += 12 * dir;
    a.frame = 1 - a.frame;
    if (a.x < 8 || a.x + a.w > W - 8) edge = true;
    if (a.y + a.h > ship.y) { endGame(false); return; }
  }
  if (edge) {
    dir = -dir;
    for (const a of aliens) if (a.alive) a.y += 18;
  }
  GAI.audio.tone(120 - aliveCount() * 1.2, 0.04, 'square', 0.08, 0.005, 0.04);
  // alien fire (rare)
  if (Math.random() < 0.15) {
    const alive = aliens.filter(a => a.alive);
    if (alive.length) {
      const a = alive[Math.floor(Math.random() * alive.length)];
      alienBullets.push({ x: a.x + a.w / 2, y: a.y + a.h, vy: 220 });
    }
  }
  // ufo
  if (!ufo && Math.random() < 0.04 && aliveCount() > 4) {
    ufo = { x: -40, y: 40, vx: 200, color: PAL[7] };
  }
}

function update(dt) {
  if (state !== 'playing') return;
  const speed = Math.max(0.18, 1.0 - (28 - aliveCount()) * 0.025);
  stepT += dt;
  while (stepT >= speed) { step(); stepT -= speed; if (state !== 'playing') break; }
  // ship target
  ship.x = Math.max(20, Math.min(W - 20, ship.x));
  // bullet
  if (bullet) {
    bullet.y -= 420 * dt;
    for (const a of aliens) {
      if (!a.alive) continue;
      if (bullet.x > a.x - 2 && bullet.x < a.x + a.w + 2 && bullet.y > a.y && bullet.y < a.y + a.h) {
        a.alive = false; bullet = null; score += 10;
        scoreEl.textContent = score;
        GAI.audio.tone(660 + Math.random() * 200, 0.04, 'square', 0.12, 0.005, 0.05);
        break;
      }
    }
    if (bullet && ufo) {
      if (bullet.x > ufo.x - 2 && bullet.x < ufo.x + 40 && bullet.y > ufo.y && bullet.y < ufo.y + 12) {
        score += 100 + Math.floor(Math.random() * 200); scoreEl.textContent = score;
        canvas.classList.remove('shake'); void canvas.offsetWidth; canvas.classList.add('shake');
        GAI.audio.arpeggio([880, 1175, 1568, 1175, 880], 50, 'square', 0.15);
        ufo = null; bullet = null;
      }
    }
    if (bullet && bullet.y < 0) bullet = null;
  }
  // alien bullets
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const b = alienBullets[i];
    b.y += b.vy * dt;
    if (b.x > ship.x - ship.w/2 && b.x < ship.x + ship.w/2 && b.y > ship.y && b.y < ship.y + ship.h) {
      endGame(false); return;
    }
    if (b.y > H) alienBullets.splice(i, 1);
  }
  if (ufo) {
    ufo.x += ufo.vx * dt;
    if (ufo.x > W + 50) ufo = null;
  }
  if (aliveCount() === 0) endGame(true);
}

function render() {
  ctx.fillStyle = '#020008';
  ctx.fillRect(0, 0, W, H);
  // parallax stars
  for (const s of stars2) {
    s.y += 12 * 0.016;
    if (s.y > H) s.y = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(s.x, s.y, 2, 2);
  }
  for (const s of stars1) {
    s.y += 6 * 0.016;
    if (s.y > H) s.y = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(s.x, s.y, 1, 1);
  }
  // aliens
  for (const a of aliens) {
    if (!a.alive) continue;
    drawAlien(a.x, a.y, a.frame, a.color);
  }
  // ship
  ctx.fillStyle = PAL[5];
  ctx.shadowColor = PAL[5]; ctx.shadowBlur = 10;
  ctx.fillRect(ship.x - 18, ship.y, 36, 6);
  ctx.fillRect(ship.x - 4, ship.y - 6, 8, 6);
  ctx.fillRect(ship.x - 14, ship.y + 6, 4, 4);
  ctx.fillRect(ship.x + 10, ship.y + 6, 4, 4);
  ctx.shadowBlur = 0;
  // bullets
  if (bullet) {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
    ctx.fillRect(bullet.x - 1, bullet.y - 6, 2, 12);
    ctx.shadowBlur = 0;
  }
  for (const b of alienBullets) {
    ctx.fillStyle = PAL[0];
    ctx.fillRect(b.x - 2, b.y, 4, 8);
  }
  // ufo
  if (ufo) {
    ctx.fillStyle = ufo.color;
    ctx.shadowColor = ufo.color; ctx.shadowBlur = 12;
    ctx.fillRect(ufo.x, ufo.y + 4, 40, 8);
    ctx.fillRect(ufo.x + 14, ufo.y, 12, 4);
    ctx.shadowBlur = 0;
  }
}

function drawAlien(x, y, frame, color) {
  ctx.fillStyle = color;
  const px = [
    [0,1,0,0,0,1,0],
    [1,1,1,1,1,1,1],
    [1,0,1,1,1,0,1],
    [1,1,0,1,0,1,1]
  ];
  const px2 = [
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
    [1,0,1,1,1,0,1],
    [0,1,0,1,0,1,0]
  ];
  const pxx = frame ? px : px2;
  const u = 4;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) if (pxx[r][c]) ctx.fillRect(x + c * u, y + r * u, u, u);
}

let lastT = 0, raf = null;
function loop(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  update(dt); render();
  raf = requestAnimationFrame(loop);
}
function start() { if (raf) return; lastT = performance.now(); raf = requestAnimationFrame(loop); }
function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
start();
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

function fire() { if (!bullet && state === 'playing') { bullet = { x: ship.x, y: ship.y - 6 }; GAI.audio.tone(880, 0.04, 'square', 0.14, 0.003, 0.04); } }

document.addEventListener('keydown', (e) => {
  if (state !== 'playing') { if (e.key === ' ' || e.key === 'Enter') startGame(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ship.x -= 30;
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') ship.x += 30;
  else if (e.key === ' ') { e.preventDefault(); fire(); }
});

let touchActive = false, tapT = 0;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state !== 'playing') { startGame(); return; }
  const t = e.touches[0];
  ship.x = t.clientX;
  touchActive = true; tapT = performance.now();
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (state !== 'playing') return;
  const t = e.touches[0]; ship.x = t.clientX;
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (state === 'playing' && touchActive && performance.now() - tapT < 250) fire();
  touchActive = false;
}, { passive: false });

splash.addEventListener('click', startGame);
over.addEventListener('click', (e) => { if (e.target.closest('button, a')) return; startGame(); });

reset();
})();
