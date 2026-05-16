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

const GRID = 20;
let CELL = 18;
let W = GRID * CELL, H = GRID * CELL, dpr = 1;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const m = Math.min(window.innerWidth, window.innerHeight, 600);
  CELL = Math.floor(m / GRID);
  W = GRID * CELL; H = GRID * CELL;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fit();
window.addEventListener('resize', fit);

let snake = [], dir = { x: 1, y: 0 }, nextDirs = [];
let food = { x: 10, y: 10 }, gold = null;
let speed = 6, accum = 0;
let score = 0;
let state = 'splash';
let trail = [];
let best = +(GAI.storage.get('gai_best_snake') || 0);
bestEl.textContent = best;

function reset() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 }; nextDirs = [];
  speed = 6; accum = 0; score = 0;
  scoreEl.textContent = '0';
  trail = [];
  placeFood();
  gold = null;
}

function placeFood() {
  let x, y, tries = 0;
  do {
    x = Math.floor(Math.random() * GRID);
    y = Math.floor(Math.random() * GRID);
    tries++;
  } while (occupied(x, y) && tries < 200);
  food = { x, y };
  if (Math.random() < 1 / 15 && !gold) {
    let gx, gy, t2 = 0;
    do { gx = Math.floor(Math.random() * GRID); gy = Math.floor(Math.random() * GRID); t2++; }
    while ((occupied(gx, gy) || (gx === x && gy === y)) && t2 < 200);
    gold = { x: gx, y: gy, life: 6 };
  }
}
function occupied(x, y) { return snake.some(s => s.x === x && s.y === y); }

function startGame() {
  GAI.audio.ensure();
  reset();
  splash.classList.add('hidden');
  over.classList.add('hidden');
  hud.classList.remove('hidden');
  state = 'playing';
  if (GAI.blitz && GAI.blitz.isOn('snake')) {
    blitzStartTs = performance.now();
  } else {
    blitzStartTs = 0;
  }
}

let blitzStartTs = 0;
const BLITZ_DURATION_MS = 60000;
const blitzToggle = document.getElementById('blitzToggle');
const blitzState = document.getElementById('blitzState');
function syncBlitzUI() {
  if (!blitzState || !GAI.blitz) return;
  blitzState.textContent = GAI.blitz.isOn('snake') ? 'ON' : 'OFF';
}
if (blitzToggle && GAI.blitz) {
  syncBlitzUI();
  blitzToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    GAI.audio.ensure();
    GAI.audio.tone(560, 0.05, 'triangle', 0.10);
    GAI.blitz.set('snake', !GAI.blitz.isOn('snake'));
    syncBlitzUI();
  });
}

function gameOver() {
  state = 'over';
  hud.classList.add('hidden');
  GAI.audio.arpeggio([440, 369.99, 311.13], 130, 'sawtooth', 0.16);
  GAI.haptic([20, 30, 20]);
  finalEl.textContent = score;
  const isBlitz = GAI.blitz && GAI.blitz.isOn('snake');
  if (isBlitz) {
    const bestBlitz = +(GAI.storage.get('gai_best_snake_blitz') || 0);
    if (score > bestBlitz) GAI.storage.set('gai_best_snake_blitz', String(score));
  } else if (score > best) { best = score; GAI.bestScore('snake', best); }
  bestEl.textContent = best;
  // share + play-next (rendered once per game-over)
  setTimeout(() => {
    over.classList.remove('hidden');
    addOverExtras(score, best);
  }, 300);
}

function addOverExtras(finalScore, bestScore) {
  // remove previous extras if present
  for (const el of over.querySelectorAll('.share-row, .gai-play-next')) el.remove();
  const row = document.createElement('div');
  row.className = 'share-row';
  const shareBtn = document.createElement('button');
  shareBtn.className = 'arcade cyan'; shareBtn.type = 'button'; shareBtn.textContent = '🔗 SHARE';
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    GAI.audio.ensure();
    const c = GAI.ui.shareCard({ title: 'SNAKE', score: finalScore, best: bestScore, color: '#06ffa5', key: 'snake', label: 'SCORE' });
    c.share();
  });
  const copyBtn = document.createElement('button');
  copyBtn.className = 'arcade'; copyBtn.type = 'button'; copyBtn.textContent = '⎘ COPY';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    GAI.audio.ensure();
    const c = GAI.ui.shareCard({ title: 'SNAKE', score: finalScore, best: bestScore, color: '#06ffa5', key: 'snake', label: 'SCORE' });
    c.copy();
  });
  row.appendChild(shareBtn); row.appendChild(copyBtn);
  over.appendChild(row);
  GAI.ui.playNext('snake', over);
}

function step() {
  if (nextDirs.length) {
    const nd = nextDirs.shift();
    if (!(nd.x === -dir.x && nd.y === -dir.y)) dir = nd;
  }
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) { gameOver(); return; }
  if (occupied(head.x, head.y)) { gameOver(); return; }
  snake.unshift(head);
  let grew = false;
  if (head.x === food.x && head.y === food.y) {
    score += 1; grew = true;
    GAI.audio.tone(660 + score * 10, 0.07, 'square', 0.14, 0.005, 0.05);
    if (score % 5 === 0) speed = Math.min(14, speed + 0.4);
    placeFood();
  }
  if (gold && head.x === gold.x && head.y === gold.y) {
    score += 5; grew = true; gold = null;
    GAI.audio.arpeggio([523.25, 783.99, 1046.5], 50, 'triangle', 0.16);
  }
  if (!grew) snake.pop();
  scoreEl.textContent = score;
  // trail
  trail.push({ x: head.x, y: head.y, life: 1 });
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].life -= 1 / 8;
    if (trail[i].life <= 0) trail.splice(i, 1);
  }
}

let lastT = 0;
function loop(now) {
  const dt = Math.min((now - lastT) / 1000, 0.1);
  lastT = now;
  if (state === 'playing') {
    accum += dt;
    const stepT = 1 / speed;
    while (accum >= stepT) {
      step();
      accum -= stepT;
      if (state !== 'playing') break;
    }
    if (gold) {
      gold.life -= dt;
      if (gold.life <= 0) gold = null;
    }
    if (blitzStartTs > 0 && now - blitzStartTs >= BLITZ_DURATION_MS) {
      blitzStartTs = 0;
      gameOver();
    }
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function render() {
  // bg
  ctx.fillStyle = '#0a0a1e';
  ctx.fillRect(0, 0, W, H);
  // grid (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
  }
  // trail
  for (const t of trail) {
    ctx.fillStyle = `rgba(6,255,165,${(t.life * 0.4).toFixed(3)})`;
    ctx.fillRect(t.x * CELL, t.y * CELL, CELL, CELL);
  }
  // food
  ctx.fillStyle = PAL[6];
  ctx.shadowColor = PAL[6]; ctx.shadowBlur = 10;
  ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
  ctx.shadowBlur = 0;
  // gold
  if (gold) {
    const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 100);
    ctx.fillStyle = PAL[7];
    ctx.shadowColor = PAL[7]; ctx.shadowBlur = 14;
    ctx.globalAlpha = pulse;
    ctx.fillRect(gold.x * CELL + 2, gold.y * CELL + 2, CELL - 4, CELL - 4);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // snake
  for (let i = 0; i < snake.length; i++) {
    const s = snake[i];
    if (i === 0) {
      ctx.fillStyle = PAL[2];
      ctx.shadowColor = PAL[2]; ctx.shadowBlur = 10;
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.shadowBlur = 0;
      // eye
      ctx.fillStyle = '#fff';
      const ex = s.x * CELL + CELL/2 + dir.x * (CELL * 0.2);
      const ey = s.y * CELL + CELL/2 + dir.y * (CELL * 0.2);
      ctx.fillRect(ex - 2, ey - 2, 4, 4);
    } else {
      ctx.fillStyle = PAL[(i % PAL.length)];
      ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
    }
  }
}

function turn(d) {
  if (nextDirs.length >= 1) return;
  nextDirs.push(d);
}
document.addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') turn({ x: -1, y: 0 });
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') turn({ x: 1, y: 0 });
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') turn({ x: 0, y: -1 });
  else if (k === 'ArrowDown' || k === 's' || k === 'S') turn({ x: 0, y: 1 });
  else if ((k === ' ' || k === 'Enter') && (state === 'splash' || state === 'over')) startGame();
});

let sx = 0, sy = 0;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
  if (state === 'splash' || state === 'over') { startGame(); return; }
}, { passive: true });
canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - sx, dy = t.clientY - sy;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) turn({ x: dx > 0 ? 1 : -1, y: 0 });
  else turn({ x: 0, y: dy > 0 ? 1 : -1 });
}, { passive: true });

splash.addEventListener('click', startGame);
over.addEventListener('click', (e) => {
  if (e.target.closest('button, a')) return;
  startGame();
});

reset();
})();
