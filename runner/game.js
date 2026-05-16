(() => {
'use strict';
const GAI = window.GAI;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const splash = document.getElementById('splash');
const over = document.getElementById('over');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const finalEl = document.getElementById('final');
const best2El = document.getElementById('best2');

let W = 0, H = 0, dpr = 1;
let state = 'splash'; // splash | play | over
let player = { x: 0, y: 0, vy: 0, jumping: false, holding: false };
let groundY = 0;
let speed = 240;
let dist = 0;
let obstacles = [];
let orbs = [];
let particles = [];
let nextObstacleAt = 0;
let nextOrbAt = 0;
let boostUntil = 0;
let bgTime = 0;
let nextBoostAt = 1000;
let last = 0;
let raf = 0;

let best = +(GAI.storage.get('gai_best_runner') || 0);
bestEl.textContent = best;

function fit() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = H * 0.78;
  player.x = W * 0.22; player.y = groundY;
}

function start() {
  splash.classList.add('hidden');
  over.classList.add('hidden');
  state = 'play';
  speed = 240;
  dist = 0;
  obstacles = []; orbs = []; particles = [];
  player.y = groundY; player.vy = 0; player.jumping = false;
  nextObstacleAt = 1.0;
  nextOrbAt = 1.5;
  nextBoostAt = 1000;
  boostUntil = 0;
  last = performance.now();
  if (!raf) raf = requestAnimationFrame(loop);
}

function loop(now) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  bgTime += dt;
  if (state === 'play') update(dt);
  draw();
}

function update(dt) {
  // boost
  const boosted = now() < boostUntil;
  const curSpeed = (speed + dist * 0.06) * (boosted ? 2 : 1);
  // physics
  player.vy += 1900 * dt;
  if (player.holding && player.jumping && player.vy < 0 && player.vy > -200) {
    player.vy -= 280 * dt;
  }
  player.y += player.vy * dt;
  if (player.y >= groundY) { player.y = groundY; player.vy = 0; player.jumping = false; }
  // distance
  dist += curSpeed * dt * 0.06;
  scoreEl.textContent = Math.floor(dist);
  // boost trigger
  if (Math.floor(dist) >= nextBoostAt) {
    boostUntil = now() + 3000;
    nextBoostAt += 1000;
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 60, 'square', 0.16);
    GAI.fx.chromaticFlash(220);
  }
  // spawn obstacles
  nextObstacleAt -= dt;
  if (nextObstacleAt <= 0) {
    spawnObstacle();
    nextObstacleAt = (0.9 + Math.random() * 0.6) * Math.max(0.55, 1 - dist / 4000);
  }
  // spawn orbs
  nextOrbAt -= dt;
  if (nextOrbAt <= 0) {
    spawnOrb();
    nextOrbAt = 1.0 + Math.random() * 1.5;
  }
  // move obstacles
  for (const o of obstacles) o.x -= curSpeed * dt;
  obstacles = obstacles.filter(o => o.x + o.w > -20);
  // move orbs
  for (const o of orbs) { o.x -= curSpeed * dt; o.rot += dt * 4; }
  orbs = orbs.filter(o => o.x > -20);
  // collide obstacles
  for (const o of obstacles) {
    if (player.x + 12 > o.x && player.x - 12 < o.x + o.w) {
      if (player.y + 4 > o.y && player.y - 30 < o.y + o.h) {
        die();
        return;
      }
    }
  }
  // collect orbs
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    if (Math.abs(player.x - o.x) < 24 && Math.abs(player.y - 20 - o.y) < 24) {
      orbs.splice(i, 1);
      dist += 5;
      GAI.audio.tone(880, 0.06, 'square', 0.16);
      burst(o.x, o.y, '#ffd60a', 10);
    }
  }
  // boost particles
  if (boosted) {
    for (let i = 0; i < 2; i++) {
      const c = GAI.PALETTE[(Math.random() * 10) | 0];
      particles.push({ x: player.x - 8, y: player.y - 12 + Math.random() * 18, vx: -120 - Math.random() * 80, vy: (Math.random() - 0.5) * 40, life: 0.5, max: 0.5, color: c });
    }
  }
  // tick particles
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
}

function spawnObstacle() {
  const tall = Math.random() < 0.3;
  const w = 22 + Math.random() * 20;
  const h = tall ? 80 : 40 + Math.random() * 30;
  obstacles.push({ x: W + 20, y: groundY - h, w, h });
}
function spawnOrb() {
  const y = groundY - 80 - Math.random() * 80;
  orbs.push({ x: W + 20, y, rot: 0 });
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 80 + Math.random() * 100;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.6, max: 0.6, color });
  }
}
function now() { return performance.now(); }

function jump() {
  if (state === 'splash') { start(); return; }
  if (state === 'over') { start(); return; }
  if (!player.jumping) {
    player.jumping = true;
    player.vy = -560;
    player.holding = true;
    GAI.audio.tone(560, 0.04, 'triangle', 0.10);
  }
}

function die() {
  state = 'over';
  player.holding = false;
  const m = Math.floor(dist);
  finalEl.textContent = m;
  if (m > best) { best = m; GAI.storage.set('gai_best_runner', best); bestEl.textContent = best; }
  best2El.textContent = best;
  over.classList.remove('hidden');
  GAI.audio.arpeggio([440, 369.99, 311.13, 261.63], 110, 'sawtooth', 0.16);
  GAI.fx.screenShake(canvas, 8, 280);
  addOverExtras(m, best);
}

function addOverExtras(finalScore, finalBest) {
  for (const el of over.querySelectorAll('.share-row, .gai-play-next')) el.remove();
  const row = document.createElement('div');
  row.className = 'share-row';
  const sBtn = document.createElement('button');
  sBtn.className = 'arcade cyan'; sBtn.type = 'button'; sBtn.textContent = '🔗 SHARE';
  sBtn.addEventListener('click', (e) => { e.stopPropagation(); GAI.ui.shareCard({ title: 'RUNNER', score: finalScore, best: finalBest, color: '#00f5ff', key: 'runner', label: 'METERS' }).share(); });
  const cBtn = document.createElement('button');
  cBtn.className = 'arcade'; cBtn.type = 'button'; cBtn.textContent = '⎘ COPY';
  cBtn.addEventListener('click', (e) => { e.stopPropagation(); GAI.ui.shareCard({ title: 'RUNNER', score: finalScore, best: finalBest, color: '#00f5ff', key: 'runner', label: 'METERS' }).copy(); });
  row.appendChild(sBtn); row.appendChild(cBtn);
  over.appendChild(row);
  GAI.ui.playNext('runner', over);
}

function draw() {
  // outrun bg
  GAI.fx.outrunBg(ctx, W, H, bgTime * 60);
  // ground
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = 'rgba(255,0,110,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
  // obstacles
  for (const o of obstacles) {
    ctx.fillStyle = '#ef233c';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(o.x, o.y, o.w, 4);
  }
  // orbs
  for (const o of orbs) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.fillStyle = '#ffd60a';
    ctx.shadowColor = '#ffd60a';
    ctx.shadowBlur = 10;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // particles
  for (const p of particles) {
    const a = p.life / p.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  // player (chromatic G)
  const px = player.x, py = player.y;
  ctx.save();
  ctx.translate(px, py - 14);
  const tilt = player.jumping ? -0.4 : 0;
  ctx.rotate(tilt);
  ctx.font = 'bold ' + 28 + 'px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff006e'; ctx.fillText('G', 2, 1);
  ctx.fillStyle = '#00f5ff'; ctx.fillText('G', -2, -1);
  ctx.fillStyle = '#ffffff'; ctx.fillText('G', 0, 0);
  ctx.restore();
  // boost UI
  if (now() < boostUntil) {
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BOOST', W / 2, 36);
  }
}

function onTapDown(e) { e.preventDefault(); GAI.audio.ensure(); jump(); }
function onTapUp() { player.holding = false; }

canvas.addEventListener('touchstart', onTapDown, { passive: false });
canvas.addEventListener('touchend', onTapUp);
canvas.addEventListener('mousedown', (e) => { GAI.audio.ensure(); jump(); });
canvas.addEventListener('mouseup', onTapUp);
splash.addEventListener('click', () => { GAI.audio.ensure(); start(); });
over.addEventListener('click', () => { GAI.audio.ensure(); start(); });
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    GAI.audio.ensure(); jump();
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') player.holding = false;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  else { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => fit(), 150); });

fit();
raf = requestAnimationFrame(loop);
})();
