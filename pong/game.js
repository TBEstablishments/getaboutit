(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const splash = document.getElementById('splash');
const over = document.getElementById('over');
const hud = document.getElementById('hud');
const pscoreEl = document.getElementById('pscore');
const ascoreEl = document.getElementById('ascore');
const psEl = document.getElementById('ps');
const asEl = document.getElementById('as');
const resultEl = document.getElementById('result');
const bestEl = document.getElementById('best');

let W = 800, H = 500, dpr = 1;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fit();
window.addEventListener('resize', fit);

const PAD_H = 84, PAD_W = 10, BALL = 10;
let state = 'splash';
let lp, rp, ball, vx, vy, pScore, aScore;
let best = +(GAI.storage.get('gai_best_pong') || 0);
bestEl.textContent = best;
let lastT = 0;

function reset(serveDir) {
  lp = H / 2 - PAD_H / 2;
  rp = H / 2 - PAD_H / 2;
  ball = { x: W / 2, y: H / 2 };
  const angle = (Math.random() - 0.5) * 0.6;
  const sp = Math.min(W, H) * 0.7;
  vx = serveDir * sp * Math.cos(angle);
  vy = sp * Math.sin(angle);
}
function newGame() {
  pScore = 0; aScore = 0;
  pscoreEl.textContent = '0'; ascoreEl.textContent = '0';
  reset(1);
  splash.classList.add('hidden'); over.classList.add('hidden');
  hud.classList.remove('hidden');
  state = 'playing';
}

function point(side) {
  if (side === 'p') pScore++; else aScore++;
  pscoreEl.textContent = pScore; ascoreEl.textContent = aScore;
  GAI.audio.tone(side === 'p' ? 880 : 330, 0.12, 'square', 0.16, 0.005, 0.1);
  if (pScore >= 11 || aScore >= 11) endGame();
  else reset(side === 'p' ? -1 : 1);
}

function endGame() {
  state = 'over';
  hud.classList.add('hidden');
  if (pScore > aScore) {
    resultEl.textContent = 'YOU WIN';
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 80, 'triangle', 0.18);
    if (pScore > best) { best = pScore; GAI.bestScore('pong', best); }
  } else {
    resultEl.textContent = 'AI WINS';
    GAI.audio.arpeggio([440, 369.99, 311.13], 130, 'sawtooth', 0.16);
  }
  bestEl.textContent = best;
  psEl.textContent = pScore; asEl.textContent = aScore;
  setTimeout(() => over.classList.remove('hidden'), 300);
}

let targetLp = lp;
function update(dt) {
  if (state !== 'playing') return;
  // player paddle to target
  if (lp != null) lp += (targetLp - lp) * Math.min(1, dt * 14);
  // AI
  const aiDiff = Math.min(1, 0.55 + (aScore + pScore) * 0.03);
  const target = ball.y - PAD_H / 2 + (Math.sin(performance.now() / 200) * 18 * (1 - aiDiff));
  const lag = (1 - aiDiff) * 0.5 + 0.4;
  rp += (target - rp) * Math.min(1, dt * (4 + aiDiff * 6)) * lag * 1.2;
  rp = Math.max(0, Math.min(H - PAD_H, rp));
  lp = Math.max(0, Math.min(H - PAD_H, lp));
  // ball
  ball.x += vx * dt; ball.y += vy * dt;
  if (ball.y < BALL / 2) { ball.y = BALL / 2; vy = -vy; GAI.audio.tone(440, 0.04, 'square', 0.1, 0.003, 0.04); }
  if (ball.y > H - BALL / 2) { ball.y = H - BALL / 2; vy = -vy; GAI.audio.tone(440, 0.04, 'square', 0.1, 0.003, 0.04); }
  // paddles
  if (ball.x - BALL/2 < 18 + PAD_W && ball.y > lp && ball.y < lp + PAD_H && vx < 0) {
    vx = -vx * 1.04;
    const rel = (ball.y - (lp + PAD_H / 2)) / (PAD_H / 2);
    vy += rel * 200;
    GAI.audio.tone(660, 0.04, 'square', 0.14, 0.003, 0.04);
  }
  if (ball.x + BALL/2 > W - 18 - PAD_W && ball.y > rp && ball.y < rp + PAD_H && vx > 0) {
    vx = -vx * 1.04;
    const rel = (ball.y - (rp + PAD_H / 2)) / (PAD_H / 2);
    vy += rel * 200;
    GAI.audio.tone(523.25, 0.04, 'square', 0.14, 0.003, 0.04);
  }
  if (ball.x < -20) point('a');
  else if (ball.x > W + 20) point('p');
}

function render() {
  // sunset bg
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a0535');
  g.addColorStop(0.55, '#3a0ca3');
  g.addColorStop(1, '#6a1b9a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sun
  const sg = ctx.createRadialGradient(W/2, H * 0.82, 8, W/2, H * 0.82, Math.min(W, H) * 0.4);
  sg.addColorStop(0, '#ffd60a');
  sg.addColorStop(0.4, '#ff9500');
  sg.addColorStop(0.8, 'rgba(255, 0, 110, 0.35)');
  sg.addColorStop(1, 'rgba(255,0,110,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(W/2, H * 0.82, Math.min(W, H) * 0.4, 0, Math.PI*2); ctx.fill();
  // horizon line
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(0, H * 0.6, W, 1);
  // dashed center
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < H; i += 16) ctx.fillRect(W/2 - 1, i, 2, 10);
  // paddles
  ctx.fillStyle = PAL[5];
  ctx.shadowColor = PAL[5]; ctx.shadowBlur = 10;
  ctx.fillRect(18, lp, PAD_W, PAD_H);
  ctx.fillStyle = PAL[0];
  ctx.shadowColor = PAL[0]; ctx.shadowBlur = 10;
  ctx.fillRect(W - 18 - PAD_W, rp, PAD_W, PAD_H);
  ctx.shadowBlur = 0;
  // ball
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
  ctx.fillRect(ball.x - BALL/2, ball.y - BALL/2, BALL, BALL);
  ctx.shadowBlur = 0;
}

let raf = null;
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

reset(1);

// input
function clamp(y) { return Math.max(0, Math.min(H - PAD_H, y)); }
function setTarget(y) { targetLp = clamp(y - PAD_H / 2); }

canvas.addEventListener('mousemove', (e) => setTarget(e.clientY));
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); setTarget(e.touches[0].clientY); }, { passive: false });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); setTarget(e.touches[0].clientY); }, { passive: false });

document.addEventListener('keydown', (e) => {
  if (state !== 'playing') {
    if (e.key === ' ' || e.key === 'Enter') newGame();
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'w') targetLp = clamp(targetLp - 40);
  if (e.key === 'ArrowDown' || e.key === 's') targetLp = clamp(targetLp + 40);
});

function input() {
  GAI.audio.ensure();
  if (state === 'splash' || state === 'over') newGame();
}
splash.addEventListener('click', input);
over.addEventListener('click', (e) => { if (e.target.closest('button, a')) return; input(); });

})();
