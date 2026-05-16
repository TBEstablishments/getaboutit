(() => {
'use strict';
const GAI = window.GAI;
const ARENA = 2400;
const MAX_AI = 5;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('mini');
const mctx = mini.getContext('2d');
const splash = document.getElementById('splash');
const over = document.getElementById('over');
const lenEl = document.getElementById('len');
const bestEl = document.getElementById('best');
const finalEl = document.getElementById('final');
const best2El = document.getElementById('best2');

let W = 0, H = 0;
let state = 'splash';
let player = null;
let snakes = []; // includes player at [0]
let food = [];
let lastT = 0;
let raf = 0;
let pointerX = null, pointerY = null;
let boosting = false;
let boostDecay = 0;
let best = +(GAI.storage.get('gai_best_slither') || 12);
bestEl.textContent = best;

function fit() {
  W = window.innerWidth; H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = 110 * dpr;
  mini.width = m; mini.height = m;
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function newSnake(x, y, color, isAi) {
  return {
    segments: [{ x, y }],
    targetLen: 12,
    angle: Math.random() * Math.PI * 2,
    speed: 110,
    color,
    isAi,
    dead: false,
    boostTimer: 0
  };
}

function spawnFood(count) {
  while (food.length < count) {
    food.push({
      x: Math.random() * ARENA,
      y: Math.random() * ARENA,
      color: GAI.PALETTE[Math.floor(Math.random() * GAI.PALETTE.length)]
    });
  }
}

function start() {
  splash.classList.add('hidden');
  over.classList.add('hidden');
  state = 'play';
  player = newSnake(ARENA / 2, ARENA / 2, '#06ffa5', false);
  for (let i = 0; i < player.targetLen; i++) player.segments.push({ x: player.segments[0].x - i, y: player.segments[0].y });
  snakes = [player];
  for (let i = 0; i < MAX_AI; i++) {
    const c = GAI.PALETTE[(i + 2) % GAI.PALETTE.length];
    const s = newSnake(Math.random() * ARENA, Math.random() * ARENA, c, true);
    s.targetLen = 8 + Math.floor(Math.random() * 14);
    for (let j = 0; j < s.targetLen; j++) s.segments.push({ x: s.segments[0].x - j, y: s.segments[0].y });
    snakes.push(s);
  }
  food = [];
  spawnFood(180);
  lastT = performance.now();
  if (!raf) raf = requestAnimationFrame(loop);
  GAI.stats.sessionStart('slither');
}

function loop(now) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
  if (state === 'play') update(dt);
  draw();
  drawMini();
}

function update(dt) {
  // player steer
  if (pointerX != null && pointerY != null) {
    const head = player.segments[0];
    // world position of pointer
    const cam = camera();
    const wx = pointerX + cam.x - W / 2;
    const wy = pointerY + cam.y - H / 2;
    const target = Math.atan2(wy - head.y, wx - head.x);
    const da = ((target - player.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const turn = Math.sign(da) * Math.min(Math.abs(da), 4 * dt);
    player.angle += turn;
  }
  // boost
  if (boosting && player.segments.length > 12) {
    player.speed = 220;
    boostDecay += dt;
    if (boostDecay >= 1) {
      boostDecay -= 1;
      player.segments.pop(); // shrink by 1 per second
      // drop a food orb
      const last = player.segments[player.segments.length - 1];
      food.push({ x: last.x, y: last.y, color: player.color });
    }
  } else {
    player.speed = 130;
  }
  // AI steer
  for (const s of snakes) {
    if (s === player || s.dead) continue;
    // pick nearest food and head toward
    let nearest = null, nd = Infinity;
    for (const f of food) {
      const d = Math.hypot(f.x - s.segments[0].x, f.y - s.segments[0].y);
      if (d < nd) { nd = d; nearest = f; }
    }
    if (nearest) {
      const target = Math.atan2(nearest.y - s.segments[0].y, nearest.x - s.segments[0].x);
      const da = ((target - s.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      s.angle += Math.sign(da) * Math.min(Math.abs(da), 2 * dt);
    } else {
      s.angle += (Math.random() - 0.5) * 0.4;
    }
    // wall avoidance
    const h = s.segments[0];
    if (h.x < 80) s.angle = 0;
    if (h.x > ARENA - 80) s.angle = Math.PI;
    if (h.y < 80) s.angle = Math.PI / 2;
    if (h.y > ARENA - 80) s.angle = -Math.PI / 2;
  }
  // move snakes
  for (const s of snakes) {
    if (s.dead) continue;
    const head = s.segments[0];
    const nx = head.x + Math.cos(s.angle) * s.speed * dt;
    const ny = head.y + Math.sin(s.angle) * s.speed * dt;
    s.segments.unshift({ x: nx, y: ny });
    while (s.segments.length > s.targetLen) s.segments.pop();
  }
  // collisions: head vs anyone else's body, or boundary
  for (const s of snakes) {
    if (s.dead) continue;
    const h = s.segments[0];
    if (h.x < 20 || h.x > ARENA - 20 || h.y < 20 || h.y > ARENA - 20) {
      kill(s);
      continue;
    }
    for (const o of snakes) {
      if (o === s || o.dead) continue;
      for (let i = 4; i < o.segments.length; i++) {
        const seg = o.segments[i];
        if (Math.hypot(seg.x - h.x, seg.y - h.y) < 8) {
          kill(s);
          break;
        }
      }
      if (s.dead) break;
    }
  }
  // food eating
  for (const s of snakes) {
    if (s.dead) continue;
    const h = s.segments[0];
    for (let i = food.length - 1; i >= 0; i--) {
      const f = food[i];
      if (Math.hypot(f.x - h.x, f.y - h.y) < 14) {
        food.splice(i, 1);
        s.targetLen += 1;
        if (s === player) {
          lenEl.textContent = s.targetLen;
          if (s.targetLen > best) { best = s.targetLen; GAI.storage.set('gai_best_slither', best); bestEl.textContent = best; }
          GAI.audio.tone(660 + Math.min(20, s.targetLen - 12) * 30, 0.04, 'square', 0.10);
        }
      }
    }
  }
  // respawn AI
  for (let i = 0; i < snakes.length; i++) {
    const s = snakes[i];
    if (s === player) continue;
    if (s.dead) {
      snakes[i] = newSnake(Math.random() * ARENA, Math.random() * ARENA, GAI.PALETTE[(i + 2) % GAI.PALETTE.length], true);
      snakes[i].targetLen = 8 + Math.floor(Math.random() * 14);
      for (let j = 0; j < snakes[i].targetLen; j++) snakes[i].segments.push({ x: snakes[i].segments[0].x - j, y: snakes[i].segments[0].y });
    }
  }
  spawnFood(180);
  // player death
  if (player.dead) {
    state = 'over';
    over.classList.remove('hidden');
    finalEl.textContent = player.targetLen;
    best2El.textContent = best;
    GAI.audio.arpeggio([440, 369.99, 311.13, 261.63], 110, 'sawtooth', 0.16);
    GAI.fx.screenShake(canvas, 8, 320);
    GAI.bestScore('slither', player.targetLen);
    GAI.stats.sessionEnd('slither');
  }
}

function kill(s) {
  if (s.dead) return;
  s.dead = true;
  // body becomes food orbs (player kill = big payday)
  const orbs = s === player ? 0 : s.segments.length;
  for (let i = 0; i < orbs; i += 2) {
    const seg = s.segments[i];
    food.push({ x: seg.x, y: seg.y, color: s.color });
  }
  if (s !== player) {
    GAI.audio.tone(220, 0.15, 'sawtooth', 0.14);
    GAI.fx.particleBurst(ctx, W / 2, H / 2, s.color, 20);
  }
}

function camera() {
  const head = player.segments[0];
  return { x: head.x, y: head.y };
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const cam = camera();
  // grid background
  ctx.strokeStyle = 'rgba(58,12,163,0.18)';
  ctx.lineWidth = 1;
  const grid = 80;
  const offX = -cam.x % grid + W / 2;
  const offY = -cam.y % grid + H / 2;
  for (let x = offX; x < W; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let x = offX - grid; x > 0; x -= grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = offY; y < H; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let y = offY - grid; y > 0; y -= grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // boundary
  const bxs = [{ x: 0, y: 0 }, { x: ARENA, y: 0 }, { x: ARENA, y: ARENA }, { x: 0, y: ARENA }];
  const w2 = (px, py) => ({ x: px - cam.x + W / 2, y: py - cam.y + H / 2 });
  ctx.strokeStyle = '#ff006e'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const p = w2(bxs[i].x, bxs[i].y);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath(); ctx.stroke();
  // food
  for (const f of food) {
    const p = w2(f.x, f.y);
    if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  // snakes
  for (const s of snakes) {
    if (s.dead) continue;
    const r = s === player ? 8 : 6;
    for (let i = s.segments.length - 1; i >= 0; i--) {
      const seg = s.segments[i];
      const p = w2(seg.x, seg.y);
      if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // head: chromatic
    const head = s.segments[0];
    const hp = w2(head.x, head.y);
    if (s === player) {
      ctx.fillStyle = '#ff006e'; ctx.beginPath(); ctx.arc(hp.x + 2, hp.y, r + 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00f5ff'; ctx.beginPath(); ctx.arc(hp.x - 2, hp.y, r + 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hp.x, hp.y, r + 1, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawMini() {
  const w = mini.clientWidth, h = mini.clientHeight;
  mctx.fillStyle = 'rgba(10,10,30,0.95)';
  mctx.fillRect(0, 0, w, h);
  const scale = w / ARENA;
  // boundary
  mctx.strokeStyle = '#ff006e'; mctx.lineWidth = 1;
  mctx.strokeRect(0, 0, w, h);
  // snakes as dots
  for (const s of snakes) {
    if (s.dead) continue;
    mctx.fillStyle = s.color;
    mctx.fillRect(s.segments[0].x * scale - 1, s.segments[0].y * scale - 1, 3, 3);
  }
}

function onMove(clientX, clientY) {
  pointerX = clientX; pointerY = clientY;
}

canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
canvas.addEventListener('touchmove', (e) => {
  if (!e.touches[0]) return;
  e.preventDefault();
  onMove(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return;
  e.preventDefault();
  onMove(e.touches[0].clientX, e.touches[0].clientY);
  if (state === 'splash' || state === 'over') { GAI.audio.ensure(); start(); return; }
  boosting = true;
}, { passive: false });
canvas.addEventListener('touchend', () => { boosting = false; });
canvas.addEventListener('mousedown', () => { boosting = true; });
canvas.addEventListener('mouseup', () => { boosting = false; });
splash.addEventListener('click', () => { GAI.audio.ensure(); start(); });
over.addEventListener('click', () => { GAI.audio.ensure(); start(); });
document.addEventListener('keydown', (e) => {
  if (e.key === ' ') boosting = true;
});
document.addEventListener('keyup', (e) => {
  if (e.key === ' ') boosting = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
  else if (!raf && state === 'play') { lastT = performance.now(); raf = requestAnimationFrame(loop); }
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 150); });
window.addEventListener('pagehide', () => GAI.stats.sessionEnd('slither'));

fit();
})();
