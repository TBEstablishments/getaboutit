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
const zones = document.getElementById('zones');

let W = 800, H = 600, dpr = 1;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fit();
window.addEventListener('resize', fit);

let ship, asteroids, bullets, particles;
let score = 0, lives = 3, level = 1;
let state = 'splash';
let invuln = 0;
let best = +(GAI.storage.get('gai_best_asteroids') || 0);
bestEl.textContent = best;

const KEYS = {};
document.addEventListener('keydown', (e) => { KEYS[e.key] = true; if (e.key === ' ' || e.key === 'ArrowUp') e.preventDefault(); });
document.addEventListener('keyup', (e) => { KEYS[e.key] = false; });

function reset() {
  ship = { x: W/2, y: H/2, vx: 0, vy: 0, a: -Math.PI/2 };
  asteroids = [];
  bullets = [];
  particles = [];
  score = 0; lives = 3; level = 1; invuln = 2;
  scoreEl.textContent = '0';
  livesEl.textContent = '▲'.repeat(lives);
  spawnAsteroids(4);
}

function spawnAsteroids(n) {
  for (let i = 0; i < n; i++) {
    let x, y;
    do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - ship.x, y - ship.y) < 150);
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 30;
    asteroids.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 40, sz: 3, shape: makeShape(40) });
  }
}
function makeShape(r) {
  const pts = [];
  const n = 7 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) pts.push(r * (0.8 + Math.random() * 0.4));
  return pts;
}

function startGame() {
  GAI.audio.ensure();
  reset();
  splash.classList.add('hidden'); over.classList.add('hidden');
  hud.classList.remove('hidden');
  zones.classList.remove('hidden');
  setTimeout(() => zones.classList.add('hidden'), 4000);
  state = 'playing';
}

function endGame() {
  state = 'over';
  hud.classList.add('hidden');
  zones.classList.add('hidden');
  GAI.audio.arpeggio([440, 369.99, 311.13], 130, 'sawtooth', 0.16);
  finalEl.textContent = score;
  if (score > best) { best = score; GAI.bestScore('asteroids', best); }
  bestEl.textContent = best;
  setTimeout(() => over.classList.remove('hidden'), 300);
}

function fire() {
  if (bullets.length >= 4) return;
  bullets.push({
    x: ship.x + Math.cos(ship.a) * 14,
    y: ship.y + Math.sin(ship.a) * 14,
    vx: Math.cos(ship.a) * 480 + ship.vx,
    vy: Math.sin(ship.a) * 480 + ship.vy,
    life: 1.2
  });
  GAI.audio.tone(880, 0.04, 'square', 0.13, 0.003, 0.04);
}

let touchLeft = false, touchRight = false, touchThrust = false;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state !== 'playing') { startGame(); return; }
  for (const t of e.changedTouches) handleTouch(t, true);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (state !== 'playing') return;
  for (const t of e.changedTouches) handleTouch(t, true);
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) handleTouch(t, false);
}, { passive: false });

function handleTouch(t, active) {
  const x = t.clientX, y = t.clientY;
  if (y < H * 0.5) { // top → thrust + fire alternates
    if (active) { touchThrust = true; if (Math.random() < 0.3) fire(); }
    else touchThrust = false;
  } else if (x < W / 2) {
    touchLeft = active;
  } else {
    touchRight = active;
  }
  // tap-top to fire if quick
  if (active && y < H * 0.2) fire();
}

function update(dt) {
  if (state !== 'playing') return;
  // input
  const rot = (KEYS.ArrowLeft || KEYS.a || touchLeft ? -1 : 0) + (KEYS.ArrowRight || KEYS.d || touchRight ? 1 : 0);
  ship.a += rot * 4 * dt;
  const thrust = KEYS.ArrowUp || KEYS.w || touchThrust;
  if (thrust) {
    ship.vx += Math.cos(ship.a) * 280 * dt;
    ship.vy += Math.sin(ship.a) * 280 * dt;
    // particles
    particles.push({
      x: ship.x - Math.cos(ship.a) * 10,
      y: ship.y - Math.sin(ship.a) * 10,
      vx: -Math.cos(ship.a) * 100 + (Math.random() - 0.5) * 80,
      vy: -Math.sin(ship.a) * 100 + (Math.random() - 0.5) * 80,
      life: 0.4, c: PAL[7]
    });
    if (Math.random() < 0.2) GAI.audio.tone(120 + Math.random() * 30, 0.04, 'sawtooth', 0.06, 0.005, 0.04);
  }
  if (KEYS[' ']) { if (!ship.fired) { fire(); ship.fired = true; setTimeout(() => ship.fired = false, 220); } }
  // physics
  ship.x += ship.vx * dt; ship.y += ship.vy * dt;
  ship.vx *= 0.99; ship.vy *= 0.99;
  ship.x = wrap(ship.x, W); ship.y = wrap(ship.y, H);
  for (const a of asteroids) {
    a.x = wrap(a.x + a.vx * dt, W);
    a.y = wrap(a.y + a.vy * dt, H);
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x = wrap(b.x + b.vx * dt, W);
    b.y = wrap(b.y + b.vy * dt, H);
    b.life -= dt;
    if (b.life <= 0) { bullets.splice(i, 1); continue; }
    for (let j = asteroids.length - 1; j >= 0; j--) {
      const a = asteroids[j];
      if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
        bullets.splice(i, 1);
        asteroids.splice(j, 1);
        explode(a.x, a.y, a.r);
        score += a.sz === 3 ? 20 : a.sz === 2 ? 50 : 100;
        scoreEl.textContent = score;
        if (a.sz > 1) {
          for (let k = 0; k < 2; k++) {
            const aa = Math.random() * Math.PI * 2;
            const sp = 40 + Math.random() * 40;
            const nr = a.r * 0.55;
            asteroids.push({ x: a.x, y: a.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, r: nr, sz: a.sz - 1, shape: makeShape(nr) });
          }
        }
        break;
      }
    }
  }
  // collisions
  invuln = Math.max(0, invuln - dt);
  if (invuln <= 0) {
    for (const a of asteroids) {
      if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.r) {
        explode(ship.x, ship.y, 20);
        lives--;
        livesEl.textContent = '▲'.repeat(Math.max(0, lives));
        if (lives <= 0) { endGame(); return; }
        ship.x = W/2; ship.y = H/2; ship.vx = 0; ship.vy = 0; invuln = 2;
        break;
      }
    }
  }
  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  // next level
  if (asteroids.length === 0) {
    level++;
    spawnAsteroids(3 + level);
  }
}

function explode(x, y, r) {
  const n = 12 + Math.floor(r / 4);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 180;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.4 + Math.random() * 0.3,
      c: PAL[Math.floor(Math.random() * PAL.length)]
    });
  }
  GAI.audio.tone(80 + r * 1.5, 0.12, 'sawtooth', 0.18, 0.005, 0.08);
  GAI.haptic(20);
}
function wrap(v, max) { if (v < 0) return v + max; if (v > max) return v - max; return v; }

function render() {
  ctx.fillStyle = '#020008';
  ctx.fillRect(0, 0, W, H);
  // stars
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  for (let i = 0; i < 30; i++) ctx.fillRect((i * 79) % W, (i * 67 + Math.floor(performance.now() / 100) * 0.4) % H, 1, 1);
  // asteroids
  for (const a of asteroids) {
    ctx.strokeStyle = '#fff';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 4;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < a.shape.length; i++) {
      const ang = i / a.shape.length * Math.PI * 2;
      const x = a.x + Math.cos(ang) * a.shape[i];
      const y = a.y + Math.sin(ang) * a.shape[i];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // particles
  for (const p of particles) {
    ctx.fillStyle = p.c;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;
  // bullets
  for (const b of bullets) {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
    ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
    ctx.shadowBlur = 0;
  }
  // ship
  if (state === 'playing' && (invuln === 0 || Math.floor(performance.now() / 100) % 2 === 0)) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.a + Math.PI / 2);
    ctx.strokeStyle = PAL[5];
    ctx.shadowColor = PAL[5]; ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(10, 10); ctx.lineTo(0, 6); ctx.lineTo(-10, 10); ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

let lastT = 0, raf = null;
function loop(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  update(dt); render();
  raf = requestAnimationFrame(loop);
}
function startL() { if (raf) return; lastT = performance.now(); raf = requestAnimationFrame(loop); }
function stopL() { if (raf) cancelAnimationFrame(raf); raf = null; }
startL();
document.addEventListener('visibilitychange', () => { if (document.hidden) stopL(); else startL(); });

splash.addEventListener('click', startGame);
over.addEventListener('click', (e) => { if (e.target.closest('button, a')) return; startGame(); });

reset();
})();
