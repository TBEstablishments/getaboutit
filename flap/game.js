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

let W = 400, H = 600, dpr = 1;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fit();
let rT = null;
window.addEventListener('resize', () => { if (rT) clearTimeout(rT); rT = setTimeout(fit, 150); });

const G = 1500;
const FLAP_V = -380;
const PIPE_SPEED = 140;
const GAP = 140;
const PIPE_W = 56;
const PIPE_GAP_X = 220;

let state = 'splash';
let bird = { x: 0, y: 0, vy: 0 };
let pipes = [];
let score = 0;
let best = +(GAI.storage.get('gai_best_flap') || 0);
bestEl.textContent = best;

let lastT = 0;
let spawnT = 0;
let rainbowFor = 0;
let trail = [];

function reset() {
  bird = { x: Math.min(80, W * 0.25), y: H * 0.4, vy: 0 };
  pipes = []; score = 0; spawnT = 0; rainbowFor = 0; trail = [];
  scoreEl.textContent = '0';
}

function flap() {
  bird.vy = FLAP_V;
  GAI.audio.tone(523.25, 0.06, 'triangle', 0.14, 0.003, 0.05);
}

function startGame() {
  GAI.audio.ensure();
  reset();
  splash.classList.add('hidden');
  over.classList.add('hidden');
  hud.classList.remove('hidden');
  state = 'playing';
  flap();
}

function gameOver() {
  if (state !== 'playing') return;
  state = 'over';
  hud.classList.add('hidden');
  GAI.audio.arpeggio([440, 369.99, 311.13, 277.18], 120, 'triangle', 0.18);
  GAI.haptic([20, 30, 20]);
  finalEl.textContent = score;
  if (score > best) { best = score; GAI.bestScore('flap', best); }
  bestEl.textContent = best;
  setTimeout(() => over.classList.remove('hidden'), 350);
}

function update(dt) {
  if (state !== 'playing') return;
  bird.vy += G * dt;
  bird.y += bird.vy * dt;
  if (bird.y < 0) { bird.y = 0; bird.vy = 0; }

  spawnT -= dt;
  if (spawnT <= 0) {
    spawnT = PIPE_GAP_X / PIPE_SPEED;
    const gapY = 80 + Math.random() * (H - 160 - GAP);
    pipes.push({ x: W + 10, gapY, scored: false });
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= PIPE_SPEED * dt;
    if (!p.scored && p.x + PIPE_W < bird.x) {
      p.scored = true; score++;
      scoreEl.textContent = score;
      GAI.audio.tone(880, 0.05, 'sine', 0.12, 0.003, 0.06);
      if (score === 10) { rainbowFor = 3; GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 70, 'square', 0.16); }
    }
    if (p.x + PIPE_W < -10) pipes.splice(i, 1);
  }

  // collisions
  if (bird.y > H - 14) { gameOver(); return; }
  for (const p of pipes) {
    if (bird.x + 10 > p.x && bird.x - 10 < p.x + PIPE_W) {
      if (bird.y - 10 < p.gapY || bird.y + 10 > p.gapY + GAP) { gameOver(); return; }
    }
  }

  if (rainbowFor > 0) {
    rainbowFor = Math.max(0, rainbowFor - dt);
    trail.push({ x: bird.x, y: bird.y, t: 0, c: PAL[score % PAL.length] });
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].t += dt;
    if (trail[i].t > 0.5) trail.splice(i, 1);
  }
}

function render() {
  // sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a0535'); g.addColorStop(0.7, '#3a0ca3'); g.addColorStop(1, '#6a1b9a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // pipes
  for (const p of pipes) {
    ctx.fillStyle = PAL[6];
    ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
    ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP);
    // lip
    ctx.fillStyle = PAL[2];
    ctx.fillRect(p.x - 4, p.gapY - 10, PIPE_W + 8, 10);
    ctx.fillRect(p.x - 4, p.gapY + GAP, PIPE_W + 8, 10);
  }

  // ground
  ctx.fillStyle = '#0a0a1e';
  ctx.fillRect(0, H - 14, W, 14);
  ctx.fillStyle = PAL[0];
  ctx.fillRect(0, H - 14, W, 2);

  // rainbow trail
  for (const t of trail) {
    const a = 1 - t.t / 0.5;
    ctx.fillStyle = t.c;
    ctx.globalAlpha = a * 0.7;
    ctx.fillRect(t.x - 8, t.y - 8, 16, 16);
  }
  ctx.globalAlpha = 1;

  // bird (chromatic G)
  const tilt = Math.max(-0.4, Math.min(0.8, bird.vy / 600));
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(tilt);
  ctx.font = 'bold 26px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL[0]; ctx.fillText('G', 2, 0);
  ctx.fillStyle = PAL[5]; ctx.fillText('G', -2, 0);
  ctx.fillStyle = '#fff'; ctx.fillText('G', 0, 0);
  ctx.restore();
}

let raf = null;
function loop(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  update(dt); render();
  raf = requestAnimationFrame(loop);
}
function startLoop() { if (raf) return; lastT = performance.now(); raf = requestAnimationFrame(loop); }
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = null; }
startLoop();
document.addEventListener('visibilitychange', () => { if (document.hidden) stopLoop(); else startLoop(); });

function input() {
  GAI.audio.ensure();
  if (state === 'splash' || state === 'over') startGame();
  else if (state === 'playing') flap();
}
document.body.addEventListener('click', (e) => { if (e.target.closest('button, a')) return; input(); });
document.body.addEventListener('touchstart', (e) => {
  if (e.target.closest('button, a')) return;
  e.preventDefault(); input();
}, { passive: false });
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { e.preventDefault(); input(); }
});

reset();
})();
