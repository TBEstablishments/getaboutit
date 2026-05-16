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
const livesEl = document.getElementById('lives');
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

const COLS = 9, ROWS = 6;
const BRICK_TOP = 60;
let BRICK_W, BRICK_H = 18, PADW = 80, PADH = 8;
let bricks = [];
let paddleX = 0, paddleY = 0;
let balls = [];
let powerups = [];
let activePowers = {};
let score = 0;
let lives = 3;
let state = 'splash';
let best = +(GAI.storage.get('gai_best_breakout') || 0);
bestEl.textContent = best;

function setupLevel() {
  BRICK_W = (W - 8) / COLS;
  bricks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: 4 + c * BRICK_W,
        y: BRICK_TOP + r * (BRICK_H + 4),
        w: BRICK_W - 4,
        h: BRICK_H,
        hits: r < 2 ? 2 : 1,
        color: PAL[r % PAL.length],
        alive: true
      });
    }
  }
}

function reset() {
  setupLevel();
  paddleX = W / 2;
  paddleY = H - 36;
  balls = [];
  spawnBall();
  powerups = [];
  activePowers = {};
  score = 0; lives = 3;
  scoreEl.textContent = '0';
  livesEl.textContent = '♥♥♥';
}

function spawnBall() {
  const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 0.6;
  const sp = Math.min(W, H) * 0.55;
  balls.push({ x: paddleX, y: paddleY - 10, vx: sp * Math.cos(angle), vy: sp * Math.sin(angle), trail: [] });
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
  resultEl.textContent = won ? 'CLEARED!' : 'GAME OVER';
  if (won) GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 80, 'triangle', 0.18);
  else GAI.audio.arpeggio([440, 369.99, 311.13], 130, 'sawtooth', 0.16);
  finalEl.textContent = score;
  if (score > best) { best = score; GAI.bestScore('breakout', best); }
  bestEl.textContent = best;
  setTimeout(() => { over.classList.remove('hidden'); addOverExtras(score, best); }, 300);
}

function addOverExtras(finalScore, finalBest) {
  for (const el of over.querySelectorAll('.share-row, .gai-play-next')) el.remove();
  const row = document.createElement('div');
  row.className = 'share-row';
  const sBtn = document.createElement('button');
  sBtn.className = 'arcade cyan'; sBtn.type = 'button'; sBtn.textContent = '🔗 SHARE';
  sBtn.addEventListener('click', (e) => { e.stopPropagation(); GAI.ui.shareCard({ title: 'BREAKOUT', score: finalScore, best: finalBest, color: '#ff9500', key: 'breakout', label: 'SCORE' }).share(); });
  const cBtn = document.createElement('button');
  cBtn.className = 'arcade'; cBtn.type = 'button'; cBtn.textContent = '⎘ COPY';
  cBtn.addEventListener('click', (e) => { e.stopPropagation(); GAI.ui.shareCard({ title: 'BREAKOUT', score: finalScore, best: finalBest, color: '#ff9500', key: 'breakout', label: 'SCORE' }).copy(); });
  row.appendChild(sBtn); row.appendChild(cBtn);
  over.appendChild(row);
  GAI.ui.playNext('breakout', over);
}

let targetX = W / 2;
canvas.addEventListener('mousemove', (e) => { targetX = e.clientX; });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); targetX = e.touches[0].clientX; }, { passive: false });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); targetX = e.touches[0].clientX; }, { passive: false });
document.addEventListener('keydown', (e) => {
  if (state !== 'playing') {
    if (e.key === ' ' || e.key === 'Enter') startGame();
    return;
  }
  if (e.key === 'ArrowLeft') targetX -= 30;
  if (e.key === 'ArrowRight') targetX += 30;
});

function update(dt) {
  if (state !== 'playing') return;
  // paddle
  const pw = activePowers.wide ? PADW * 1.6 : PADW;
  paddleX += (targetX - paddleX) * Math.min(1, dt * 16);
  paddleX = Math.max(pw / 2 + 4, Math.min(W - pw / 2 - 4, paddleX));
  // power timers
  for (const k in activePowers) {
    activePowers[k] -= dt;
    if (activePowers[k] <= 0) delete activePowers[k];
  }
  // balls
  const slow = activePowers.slow ? 0.55 : 1;
  for (let bi = balls.length - 1; bi >= 0; bi--) {
    const b = balls[bi];
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 8) b.trail.shift();
    b.x += b.vx * dt * slow;
    b.y += b.vy * dt * slow;
    if (b.x < 4) { b.x = 4; b.vx = Math.abs(b.vx); GAI.audio.tone(440, 0.03, 'square', 0.1, 0.003, 0.04); }
    if (b.x > W - 4) { b.x = W - 4; b.vx = -Math.abs(b.vx); GAI.audio.tone(440, 0.03, 'square', 0.1, 0.003, 0.04); }
    if (b.y < 4) { b.y = 4; b.vy = Math.abs(b.vy); GAI.audio.tone(523, 0.03, 'square', 0.1, 0.003, 0.04); }
    // paddle
    if (b.vy > 0 && b.y + 4 > paddleY && b.y - 4 < paddleY + PADH && b.x > paddleX - pw/2 && b.x < paddleX + pw/2) {
      b.y = paddleY - 4;
      b.vy = -Math.abs(b.vy);
      const rel = (b.x - paddleX) / (pw / 2);
      b.vx += rel * 220;
      GAI.audio.tone(660, 0.04, 'square', 0.12, 0.003, 0.04);
    }
    // bricks
    for (const br of bricks) {
      if (!br.alive) continue;
      if (b.x > br.x - 4 && b.x < br.x + br.w + 4 && b.y > br.y - 4 && b.y < br.y + br.h + 4) {
        // determine side
        const overlapX = Math.min(b.x - (br.x - 4), (br.x + br.w + 4) - b.x);
        const overlapY = Math.min(b.y - (br.y - 4), (br.y + br.h + 4) - b.y);
        if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
        br.hits--;
        if (br.hits <= 0) {
          br.alive = false; score += 10;
          scoreEl.textContent = score;
          if (Math.random() < 0.05) spawnPowerup(br.x + br.w/2, br.y);
        }
        GAI.audio.tone(330 + Math.random() * 200, 0.03, 'square', 0.1, 0.003, 0.04);
        break;
      }
    }
    // fall
    if (b.y > H + 20) balls.splice(bi, 1);
  }
  // power-ups falling
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += 110 * dt;
    if (p.y > paddleY - 6 && p.y < paddleY + PADH + 8 && Math.abs(p.x - paddleX) < pw / 2 + 8) {
      applyPower(p.kind);
      powerups.splice(i, 1);
      continue;
    }
    if (p.y > H) powerups.splice(i, 1);
  }
  // lose life?
  if (balls.length === 0) {
    lives--;
    livesEl.textContent = '♥'.repeat(Math.max(0, lives));
    if (lives <= 0) { endGame(false); return; }
    spawnBall();
  }
  // won?
  if (bricks.every(b => !b.alive)) {
    endGame(true);
  }
}

function spawnPowerup(x, y) {
  const kinds = ['wide','slow','multi'];
  const k = kinds[Math.floor(Math.random() * kinds.length)];
  powerups.push({ x, y, kind: k });
}
function applyPower(k) {
  GAI.audio.arpeggio([523.25, 659.25, 783.99], 50, 'triangle', 0.15);
  if (k === 'wide') activePowers.wide = 15;
  else if (k === 'slow') activePowers.slow = 10;
  else if (k === 'multi') {
    const base = balls.slice();
    for (const b of base) {
      const a1 = Math.atan2(b.vy, b.vx) + 0.4;
      const a2 = Math.atan2(b.vy, b.vx) - 0.4;
      const sp = Math.hypot(b.vx, b.vy);
      balls.push({ x: b.x, y: b.y, vx: Math.cos(a1) * sp, vy: Math.sin(a1) * sp, trail: [] });
      balls.push({ x: b.x, y: b.y, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, trail: [] });
      if (balls.length > 7) break;
    }
  }
}

function render() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0020'); g.addColorStop(1, '#1a0535');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // bricks
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    if (b.hits >= 2) { ctx.shadowColor = b.color; ctx.shadowBlur = 8; }
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(b.x, b.y, b.w, 3);
  }
  // power-ups
  for (const p of powerups) {
    ctx.fillStyle = p.kind === 'wide' ? PAL[7] : (p.kind === 'slow' ? PAL[5] : PAL[6]);
    ctx.fillRect(p.x - 8, p.y - 4, 16, 8);
    ctx.fillStyle = '#0a0a1e';
    ctx.font = 'bold 7px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'wide' ? 'W' : (p.kind === 'slow' ? 'S' : 'M'), p.x, p.y);
  }
  // paddle
  const pw = activePowers.wide ? PADW * 1.6 : PADW;
  ctx.fillStyle = PAL[5];
  ctx.shadowColor = PAL[5]; ctx.shadowBlur = 10;
  ctx.fillRect(paddleX - pw/2, paddleY, pw, PADH);
  ctx.shadowBlur = 0;
  // balls + trails
  for (const b of balls) {
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      ctx.fillStyle = `rgba(0,245,255,${(i / b.trail.length * 0.5).toFixed(3)})`;
      ctx.fillRect(t.x - 3, t.y - 3, 6, 6);
    }
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
    ctx.fillRect(b.x - 4, b.y - 4, 8, 8);
    ctx.shadowBlur = 0;
  }
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

reset();
splash.addEventListener('click', startGame);
over.addEventListener('click', (e) => { if (e.target.closest('button, a')) return; startGame(); });

})();
