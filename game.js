(() => {
'use strict';

// ============================================================
// CONSTANTS
// ============================================================
const W = 800, H = 1400;
const BLOCK_H = 38;
const PALETTE = [
  '#ff006e', '#d100d1', '#8338ec', '#3a0ca3', '#4361ee',
  '#00f5ff', '#06ffa5', '#ffd60a', '#ff9500', '#ef233c'
];
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);
const PERFECT_TOL = 4;
const SPEED_BASE = 4.2;
const SPEED_GROWTH = 0.08;
const SPEED_CAP = 2.5;
const RECOVERY = 4;
const INPUT_DEBOUNCE = 100;
const INITIAL_SIZE = 200;
const SLIDE_RANGE_FACTOR = 1.55;
const BAND_EMOJI = ['🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬜','🟥','🟧'];
const PENT = [261.63, 293.66, 329.63, 392.00, 440.00];

// ============================================================
// DOM
// ============================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const splash = document.getElementById('splash');
const gameover = document.getElementById('gameover');
const hud = document.getElementById('hud');
const hudFloor = document.getElementById('hud-floor');
const hudPerfect = document.getElementById('hud-perfect');
const perfectCount = document.getElementById('perfect-count');
const hudToday = document.getElementById('hud-today');
const muteBtn = document.getElementById('mute');
const dailyDate = document.getElementById('daily-date');
const finalFloor = document.getElementById('final-floor');
const statBest = document.getElementById('stat-best');
const statToday = document.getElementById('stat-today');
const statAlltime = document.getElementById('stat-alltime');
const scorecard = document.getElementById('scorecard');
const btnCopy = document.getElementById('btn-copy');
const btnShare = document.getElementById('btn-share');

const perfectPopup = document.createElement('div');
perfectPopup.id = 'perfect-popup';
stage.appendChild(perfectPopup);

// ============================================================
// CANVAS SCALING
// ============================================================
let dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ratio = W / H;
  const winRatio = window.innerWidth / window.innerHeight;
  let cssW, cssH;
  if (winRatio > ratio) {
    cssH = window.innerHeight;
    cssW = cssH * ratio;
  } else {
    cssW = window.innerWidth;
    cssH = cssW / ratio;
  }
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// ============================================================
// DAILY SEED
// ============================================================
function todayUTC() {
  const d = new Date();
  return d.getUTCFullYear().toString().padStart(4, '0') +
         (d.getUTCMonth() + 1).toString().padStart(2, '0') +
         d.getUTCDate().toString().padStart(2, '0');
}
const todayKey = todayUTC();
const todayInt = parseInt(todayKey, 10);
dailyDate.textContent = 'DAILY · ' + todayKey.slice(0,4) + '.' + todayKey.slice(4,6) + '.' + todayKey.slice(6,8);

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(todayInt);

// ============================================================
// STORAGE
// ============================================================
const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const safeDel = (k) => { try { localStorage.removeItem(k); } catch {} };

function cleanupOldDaily() {
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('gai_daily_')) continue;
      const dp = k.slice('gai_daily_'.length);
      if (!/^\d{8}$/.test(dp)) continue;
      const t = Date.UTC(+dp.slice(0,4), +dp.slice(4,6) - 1, +dp.slice(6,8));
      if (t < cutoff) toRemove.push(k);
    }
    toRemove.forEach(safeDel);
  } catch {}
}
cleanupOldDaily();

const getAlltime = () => +(safeGet('gai_alltime_best') || 0);
const getToday   = () => +(safeGet('gai_daily_' + todayKey) || 0);
const setAlltime = (v) => safeSet('gai_alltime_best', String(v));
const setTodayLS = (v) => safeSet('gai_daily_' + todayKey, String(v));

let muted = safeGet('gai_muted') === '1';

// ============================================================
// AUDIO
// ============================================================
let audioCtx = null;
let masterGain = null;
function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(audioCtx.destination);
  } catch {}
}
function tone(freq, dur, type = 'sine', gain = 0.18, attack = 0.005, release = 0.05) {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur + release);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + attack + dur + release + 0.02);
}
function dropTone(floor) {
  const idx = (floor - 1) % PENT.length;
  const climb = 1 + Math.floor((floor - 1) / 25) * 0.06;
  tone(PENT[idx] * climb, 0.14, 'sine', 0.22, 0.005, 0.06);
}
function perfectTone() {
  tone(1046.5, 0.05, 'sine', 0.18, 0.003, 0.4);
  tone(1568.0, 0.05, 'sine', 0.10, 0.003, 0.35);
}
function comboTone() {
  [523.25, 659.25, 783.99].forEach((f, i) =>
    setTimeout(() => tone(f, 0.10, 'triangle', 0.20, 0.005, 0.18), i * 80));
}
function boostTone() {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  // arpeggio
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    setTimeout(() => tone(f, 0.08, 'sawtooth', 0.14, 0.003, 0.18), i * 60));
  // lowpass sweep pad underneath
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(300, t);
  f.frequency.linearRampToValueAtTime(4000, t + 0.5);
  f.Q.value = 4;
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(130.81, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(f).connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + 0.75);
}
function gameoverTone() {
  // descending minor 6th: A4 -> F4 (minor 6th down? actually 8th down. A4 -> Cs4 is minor 6th)
  const steps = [[440, 0], [369.99, 0.18], [311.13, 0.38], [277.18, 0.6]];
  steps.forEach(([f, t]) =>
    setTimeout(() => tone(f, 0.32, 'triangle', 0.20, 0.005, 0.25), t * 1000));
}

// ============================================================
// STATE
// ============================================================
let state = 'splash'; // splash | playing | dying | gameover
let stack = [];
let moving = null;
let chunks = [];
let stars = [];
let streak = 0;
let floorNum = 0;
let cameraY = 0;
let cameraTarget = 0;
let cameraXOff = 0;
let cameraXOffTarget = 0;
let lastInput = 0;
let pendingBoost = false;
let boostQueue = 0;
let perfectFlash = 0;
let lastTime = 0;
let collapseTime = 0;
let splashPhase = 0;

function buildStars() {
  stars.length = 0;
  for (let i = 0; i < 160; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.85,
      sz: Math.random() * 1.6 + 0.4,
      tw: Math.random() * Math.PI * 2,
      tws: 0.4 + Math.random() * 0.8
    });
  }
}
buildStars();

// ============================================================
// SPAWN / DROP
// ============================================================
function spawnMoving() {
  const top = stack[stack.length - 1];
  const nextFloor = top.floor + 1;
  const axis = (nextFloor % 2 === 1) ? 'x' : 'z';
  const speedMult = Math.min(1 + Math.floor(nextFloor / 10) * SPEED_GROWTH, SPEED_CAP);
  const range = INITIAL_SIZE * SLIDE_RANGE_FACTOR;
  const startSide = rng() < 0.5 ? -1 : 1;
  const phaseJitter = (rng() - 0.5) * 0.15;
  moving = {
    cx: axis === 'x' ? top.cx + startSide * range : top.cx,
    cz: axis === 'z' ? top.cz + startSide * range : top.cz,
    w: top.w,
    d: top.d,
    color: PALETTE[nextFloor % PALETTE.length],
    axis,
    dir: -startSide,
    speed: SPEED_BASE * speedMult * (1 + phaseJitter),
    range,
    cx0: top.cx,
    cz0: top.cz,
    floor: nextFloor
  };
}

function startGame() {
  rng = mulberry32(todayInt);
  stack.length = 0;
  chunks.length = 0;
  streak = 0;
  floorNum = 0;
  cameraY = -380;
  cameraTarget = -380;
  cameraXOff = 0;
  cameraXOffTarget = 0;
  pendingBoost = false;
  boostQueue = 0;
  perfectFlash = 0;
  collapseTime = 0;

  stack.push({
    cx: 0, cz: 0,
    w: INITIAL_SIZE, d: INITIAL_SIZE,
    color: PALETTE[0],
    floor: 0
  });

  spawnMoving();

  splash.classList.add('hidden');
  gameover.classList.add('hidden');
  hud.classList.remove('hidden');
  updateHUD();
  state = 'playing';
}

function dropMoving() {
  if (!moving) return;
  const mv = moving;
  moving = null;
  const top = stack[stack.length - 1];

  let newCx = mv.cx, newCz = mv.cz, newW = mv.w, newD = mv.d;
  let overhang = null;
  let perfect = false;

  if (mv.axis === 'x') {
    const movL = mv.cx - mv.w / 2;
    const movR = mv.cx + mv.w / 2;
    const topL = top.cx - top.w / 2;
    const topR = top.cx + top.w / 2;
    const overL = Math.max(movL, topL);
    const overR = Math.min(movR, topR);
    if (overR - overL <= 0) { gameOver(); return; }
    newCx = (overL + overR) / 2;
    newW = overR - overL;
    if (Math.abs(mv.cx - top.cx) <= PERFECT_TOL) {
      perfect = true;
      newCx = top.cx;
      newW = top.w;
    } else {
      if (movL < topL) overhang = { axis: 'x', a: movL, b: topL };
      else if (movR > topR) overhang = { axis: 'x', a: topR, b: movR };
    }
  } else {
    const movB = mv.cz - mv.d / 2;
    const movF = mv.cz + mv.d / 2;
    const topB = top.cz - top.d / 2;
    const topF = top.cz + top.d / 2;
    const overB = Math.max(movB, topB);
    const overF = Math.min(movF, topF);
    if (overF - overB <= 0) { gameOver(); return; }
    newCz = (overB + overF) / 2;
    newD = overF - overB;
    if (Math.abs(mv.cz - top.cz) <= PERFECT_TOL) {
      perfect = true;
      newCz = top.cz;
      newD = top.d;
    } else {
      if (movB < topB) overhang = { axis: 'z', a: movB, b: topB };
      else if (movF > topF) overhang = { axis: 'z', a: topF, b: movF };
    }
  }

  if (perfect) registerPerfect();
  else registerMiss();

  // Recovery grow on every 3rd perfect (3, 6, 9, ...)
  if (perfect && streak > 0 && streak % 3 === 0) {
    newW = Math.min(newW + RECOVERY, INITIAL_SIZE);
    newD = Math.min(newD + RECOVERY, INITIAL_SIZE);
  }

  if (overhang) {
    const ch = { color: mv.color, floor: mv.floor };
    if (overhang.axis === 'x') {
      ch.cx = (overhang.a + overhang.b) / 2;
      ch.cz = mv.cz;
      ch.w = overhang.b - overhang.a;
      ch.d = mv.d;
    } else {
      ch.cz = (overhang.a + overhang.b) / 2;
      ch.cx = mv.cx;
      ch.w = mv.w;
      ch.d = overhang.b - overhang.a;
    }
    ch.fallY = 0;
    ch.fallVy = 0.3;
    ch.rot = 0;
    ch.vrot = (rng() - 0.5) * 0.06;
    ch.opacity = 1;
    chunks.push(ch);
  }

  floorNum = mv.floor;
  stack.push({
    cx: newCx, cz: newCz,
    w: newW, d: newD,
    color: mv.color,
    floor: floorNum
  });
  dropTone(floorNum);
  bumpHUD();

  // Update today's best in real time so HUD reflects current run
  if (floorNum > getToday()) setTodayLS(floorNum);

  if (pendingBoost) {
    pendingBoost = false;
    boostQueue = 2;
    setTimeout(autoBoostDrop, 260);
    return;
  }

  spawnMoving();
  updateHUD();
}

function autoBoostDrop() {
  if (state !== 'playing') return;
  const top = stack[stack.length - 1];
  const nextFloor = top.floor + 1;
  const color = PALETTE[nextFloor % PALETTE.length];
  floorNum = nextFloor;
  stack.push({
    cx: top.cx, cz: top.cz,
    w: top.w, d: top.d,
    color,
    floor: nextFloor
  });
  streak++;
  if (streak > 5 && streak % 5 === 0) pendingBoost = true;
  perfectFlash = 220;
  flashPerfect('RAINBOW');
  dropTone(nextFloor);
  perfectTone();
  bumpHUD();
  if (nextFloor > getToday()) setTodayLS(nextFloor);

  boostQueue--;
  updateHUD();
  if (boostQueue > 0) setTimeout(autoBoostDrop, 260);
  else if (pendingBoost) {
    pendingBoost = false;
    boostQueue = 2;
    setTimeout(autoBoostDrop, 260);
  } else {
    spawnMoving();
  }
}

function registerPerfect() {
  streak++;
  perfectTone();
  flashPerfect();
  perfectFlash = 250;
  if (streak === 3) comboTone();
  if (streak === 5) { pendingBoost = true; boostTone(); flashPerfect('RAINBOW BOOST'); }
  if (streak > 5 && streak % 5 === 0) { pendingBoost = true; boostTone(); }
}

function registerMiss() {
  streak = 0;
}

function flashPerfect(msg = 'PERFECT') {
  perfectPopup.textContent = msg;
  perfectPopup.classList.remove('show');
  void perfectPopup.offsetWidth;
  perfectPopup.classList.add('show');
}

function bumpHUD() {
  hudFloor.classList.remove('bump');
  void hudFloor.offsetWidth;
  hudFloor.classList.add('bump');
}

function updateHUD() {
  const span = hudFloor.querySelector('.chrom');
  span.setAttribute('data-text', String(floorNum));
  span.querySelector('span').textContent = String(floorNum);
  hudToday.textContent = 'TODAY ' + getToday();
  if (streak >= 2) {
    hudPerfect.classList.remove('hidden');
    perfectCount.textContent = '×' + streak;
    hudPerfect.style.color = PALETTE[(streak - 2) % PALETTE.length];
  } else {
    hudPerfect.classList.add('hidden');
  }
}

function gameOver() {
  state = 'dying';
  collapseTime = 0;
  moving = null;
  gameoverTone();
  const cur = floorNum;
  const aTime = getAlltime();
  const tBest = getToday();
  if (cur > aTime) setAlltime(cur);
  if (cur > tBest) setTodayLS(cur);

  finalFloor.textContent = String(cur);
  finalFloor.parentElement.setAttribute('data-text', String(cur));
  statBest.textContent = cur;
  statToday.textContent = Math.max(tBest, cur);
  statAlltime.textContent = Math.max(aTime, cur);
  scorecard.textContent = buildScoreCard(cur);

  setTimeout(() => {
    state = 'gameover';
    const collapseEl = gameover.querySelector('.collapse');
    collapseEl.classList.remove('glitch');
    void collapseEl.offsetWidth;
    collapseEl.classList.add('glitch');
    gameover.classList.remove('hidden');
    hud.classList.add('hidden');
  }, 900);
}

function buildScoreCard(f) {
  let bands = '';
  for (let i = 1; i <= 10; i++) {
    bands += (f >= (i - 1) * 10 + 1) ? BAND_EMOJI[i - 1] : '⬛';
  }
  return `GETABOUTIT — floor ${f}\n${bands}\ngetaboutit.com`;
}

// ============================================================
// INPUT
// ============================================================
function handleDrop(e) {
  if (e && e.target && e.target.closest && e.target.closest('button')) return;
  const now = performance.now();
  if (now - lastInput < INPUT_DEBOUNCE) return;
  lastInput = now;
  ensureAudio();

  if (state === 'splash')   { startGame(); return; }
  if (state === 'gameover') { startGame(); return; }
  if (state === 'playing')  { dropMoving(); return; }
}

document.body.addEventListener('click', handleDrop);
document.body.addEventListener('touchstart', (e) => {
  if (e.target && e.target.closest && e.target.closest('button')) return;
  e.preventDefault();
  handleDrop(e);
}, { passive: false });
document.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'BUTTON') return;
  handleDrop(e);
});

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  muted = !muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
  safeSet('gai_muted', muted ? '1' : '0');
});
muteBtn.textContent = muted ? '🔇' : '🔊';

btnCopy.addEventListener('click', async (e) => {
  e.stopPropagation();
  const txt = scorecard.textContent;
  try {
    await navigator.clipboard.writeText(txt);
    btnCopy.classList.add('copied');
    btnCopy.textContent = 'COPIED ✓';
  } catch {
    btnCopy.textContent = 'COPY';
  }
  setTimeout(() => {
    btnCopy.classList.remove('copied');
    btnCopy.textContent = 'COPY';
  }, 1400);
});
btnShare.addEventListener('click', async (e) => {
  e.stopPropagation();
  const txt = scorecard.textContent;
  if (navigator.share) {
    try { await navigator.share({ title: 'GETABOUTIT', text: txt }); return; } catch {}
  }
  try {
    await navigator.clipboard.writeText(txt);
    btnShare.textContent = 'COPIED ✓';
  } catch {}
  setTimeout(() => { btnShare.textContent = 'SHARE'; }, 1400);
});

// ============================================================
// UPDATE
// ============================================================
function update(dt) {
  const k = dt / 16.6667;

  if (state === 'playing' && moving) {
    const ax = moving.axis;
    const cur = ax === 'x' ? moving.cx : moving.cz;
    const ctr = ax === 'x' ? moving.cx0 : moving.cz0;
    const nxt = cur + moving.dir * moving.speed * k;
    if (nxt > ctr + moving.range) {
      moving.dir = -1;
      if (ax === 'x') moving.cx = ctr + moving.range;
      else moving.cz = ctr + moving.range;
    } else if (nxt < ctr - moving.range) {
      moving.dir = 1;
      if (ax === 'x') moving.cx = ctr - moving.range;
      else moving.cz = ctr - moving.range;
    } else {
      if (ax === 'x') moving.cx = nxt;
      else moving.cz = nxt;
    }
  }

  // Chunks falling
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i];
    c.fallVy += 0.55 * k;
    c.fallY -= c.fallVy * k;
    c.rot += c.vrot * k;
    c.opacity -= 0.012 * k;
    if (c.opacity <= 0 || c.fallY < -2400) chunks.splice(i, 1);
  }

  // Camera tracking
  let topFloor = stack.length > 0 ? stack[stack.length - 1].floor : 0;
  if (state === 'playing' && moving) topFloor = moving.floor;
  const topWorldY = (topFloor + 1) * BLOCK_H;
  cameraTarget = topWorldY - 380;
  const camLerp = Math.min(0.10 * k, 1);
  cameraY += (cameraTarget - cameraY) * camLerp;

  if (state === 'playing' && stack.length > 1) {
    const t = stack[stack.length - 1];
    cameraXOffTarget = (t.cx - t.cz) * COS30 * 0.45;
  } else {
    cameraXOffTarget = 0;
  }
  cameraXOff += (cameraXOffTarget - cameraXOff) * Math.min(0.06 * k, 1);

  // Splash demo
  if (state === 'splash') splashPhase += dt * 0.0024;

  // Stars twinkle
  for (const s of stars) s.tw += dt * 0.003 * s.tws;

  if (perfectFlash > 0) perfectFlash = Math.max(0, perfectFlash - dt);

  if (state === 'dying') collapseTime += dt;
}

// ============================================================
// PROJECTION
// ============================================================
function iso(x, z, y) {
  return {
    sx: W / 2 + (x - z) * COS30 - cameraXOff,
    sy: H * 0.70 + (x + z) * SIN30 - y + cameraY
  };
}

function shade(hex, mult) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * mult)},${Math.round(g * mult)},${Math.round(b * mult)})`;
}

function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ra = (pa >> 16) & 0xff, ga = (pa >> 8) & 0xff, ba = pa & 0xff;
  const rb = (pb >> 16) & 0xff, gb = (pb >> 8) & 0xff, bb = pb & 0xff;
  return `rgb(${Math.round(ra+(rb-ra)*t)},${Math.round(ga+(gb-ga)*t)},${Math.round(ba+(bb-ba)*t)})`;
}

function smoothstep(a, b, t) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

// ============================================================
// DRAW
// ============================================================
function drawBlock(b, opts) {
  opts = opts || {};
  const rot = opts.rot || 0;
  const opacity = opts.opacity != null ? opts.opacity : 1;
  const screenYAdd = opts.screenYAdd || 0;
  const glow = opts.glow || false;
  const flash = opts.flash || 0;

  const x = b.cx, z = b.cz, w = b.w, d = b.d;
  const yBot = b.floor * BLOCK_H;
  const yTop = (b.floor + 1) * BLOCK_H;

  // True iso corners of the box top + visible bottom-of-side corners
  const tFR = iso(x + w/2, z + d/2, yTop); // front-right (bottom vertex of rhombus)
  const tBR = iso(x + w/2, z - d/2, yTop); // back-right  (right vertex)
  const tBL = iso(x - w/2, z - d/2, yTop); // back-left   (top vertex)
  const tFL = iso(x - w/2, z + d/2, yTop); // front-left  (left vertex)
  const bFR = iso(x + w/2, z + d/2, yBot);
  const bBR = iso(x + w/2, z - d/2, yBot);
  const bFL = iso(x - w/2, z + d/2, yBot);

  ctx.save();
  if (screenYAdd) ctx.translate(0, screenYAdd);
  if (rot !== 0) {
    const cxR = (tFR.sx + tBL.sx) / 2;
    const cyR = (tFR.sy + tBL.sy) / 2;
    ctx.translate(cxR, cyR);
    ctx.rotate(rot);
    ctx.translate(-cxR, -cyR);
  }
  ctx.globalAlpha = opacity;

  // Right face (+X side): tFR, tBR, bBR, bFR
  ctx.fillStyle = shade(b.color, 0.70);
  ctx.beginPath();
  ctx.moveTo(tFR.sx, tFR.sy);
  ctx.lineTo(tBR.sx, tBR.sy);
  ctx.lineTo(bBR.sx, bBR.sy);
  ctx.lineTo(bFR.sx, bFR.sy);
  ctx.closePath();
  ctx.fill();

  // Front face (+Z side, visible to camera): tFR, tFL, bFL, bFR
  ctx.fillStyle = shade(b.color, 0.55);
  ctx.beginPath();
  ctx.moveTo(tFR.sx, tFR.sy);
  ctx.lineTo(tFL.sx, tFL.sy);
  ctx.lineTo(bFL.sx, bFL.sy);
  ctx.lineTo(bFR.sx, bFR.sy);
  ctx.closePath();
  ctx.fill();

  // Top face
  let topColor = b.color;
  if (flash > 0) topColor = lerpColor(b.color, '#ffffff', flash);
  ctx.fillStyle = topColor;
  if (glow) {
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 22;
  }
  ctx.beginPath();
  ctx.moveTo(tFR.sx, tFR.sy);
  ctx.lineTo(tBR.sx, tBR.sy);
  ctx.lineTo(tBL.sx, tBL.sy);
  ctx.lineTo(tFL.sx, tFL.sy);
  ctx.closePath();
  ctx.fill();

  // Outlines
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tFR.sx, tFR.sy); ctx.lineTo(bFR.sx, bFR.sy);
  ctx.moveTo(tBR.sx, tBR.sy); ctx.lineTo(bBR.sx, bBR.sy);
  ctx.moveTo(tFL.sx, tFL.sy); ctx.lineTo(bFL.sx, bFL.sy);
  ctx.stroke();

  ctx.restore();
}

function drawBackground() {
  const f = (state === 'playing' || state === 'dying' || state === 'gameover') ? floorNum : 0;
  const cloudT = smoothstep(22, 42, f);
  const skyT   = smoothstep(48, 70, f);
  const spaceT = smoothstep(78, 100, f);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (spaceT >= 1) {
    sky.addColorStop(0, '#020008');
    sky.addColorStop(1, '#0a0020');
  } else if (skyT > 0) {
    sky.addColorStop(0, lerpColor('#1a0535', '#020008', skyT));
    sky.addColorStop(0.55, lerpColor('#3a0ca3', '#0a0020', skyT));
    sky.addColorStop(1, lerpColor('#6a1b9a', '#1a0020', skyT));
  } else if (cloudT > 0) {
    sky.addColorStop(0, lerpColor('#1a0535', '#1a0a3a', cloudT));
    sky.addColorStop(0.55, lerpColor('#3a0ca3', '#3a0ca3', cloudT));
    sky.addColorStop(1, lerpColor('#6a1b9a', '#4a1a8a', cloudT));
  } else {
    sky.addColorStop(0, '#1a0535');
    sky.addColorStop(0.55, '#3a0ca3');
    sky.addColorStop(1, '#6a1b9a');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars
  if (skyT > 0.02) {
    const alpha = Math.min(1, skyT * 1.3);
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(s.tw);
      ctx.fillStyle = `rgba(255,255,255,${(alpha * tw).toFixed(3)})`;
      ctx.fillRect(s.x, s.y, s.sz, s.sz);
    }
  }

  // Galaxy spiral (subtle, high altitude)
  if (spaceT > 0.2) {
    ctx.save();
    ctx.globalAlpha = spaceT * 0.55;
    ctx.translate(W * 0.78, H * 0.18);
    ctx.rotate(0.4);
    const galG = ctx.createRadialGradient(0, 0, 6, 0, 0, 140);
    galG.addColorStop(0, 'rgba(255,210,255,0.9)');
    galG.addColorStop(0.35, 'rgba(180,120,220,0.45)');
    galG.addColorStop(1, 'rgba(80,40,140,0)');
    ctx.fillStyle = galG;
    ctx.beginPath();
    ctx.ellipse(0, 0, 130, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Outrun horizon, fades as you climb
  const horizonAlpha = 1 - Math.max(cloudT, skyT, spaceT);
  if (horizonAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = horizonAlpha;

    const horY = H * 0.62;

    // Sun radial
    const sunR = 230;
    const sunY = horY - 20;
    const sunG = ctx.createRadialGradient(W/2, sunY, 10, W/2, sunY, sunR);
    sunG.addColorStop(0, '#ffd60a');
    sunG.addColorStop(0.3, '#ff9500');
    sunG.addColorStop(0.7, '#ff006e');
    sunG.addColorStop(1, 'rgba(255,0,110,0)');
    ctx.fillStyle = sunG;
    ctx.beginPath();
    ctx.arc(W/2, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // Vaporwave sun stripes
    ctx.fillStyle = '#0a0a1e';
    for (let i = 0; i < 5; i++) {
      const sy = sunY + 60 + i * 22;
      const sw = sunR * 2;
      const sh = 7 - i;
      if (sh > 0) ctx.fillRect(W/2 - sunR, sy, sw, sh);
    }

    // Horizon line
    const lineG = ctx.createLinearGradient(0, horY - 2, 0, horY + 2);
    lineG.addColorStop(0, '#ffd60a');
    lineG.addColorStop(1, '#ff006e');
    ctx.fillStyle = lineG;
    ctx.fillRect(0, horY - 1, W, 2);

    // Receding grid
    ctx.strokeStyle = '#ff006e';
    ctx.lineWidth = 1.2;
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const yLine = horY + Math.pow(t, 1.9) * (H - horY) * 1.1;
      const a = 1 - t * 0.5;
      ctx.globalAlpha = horizonAlpha * a;
      ctx.beginPath();
      ctx.moveTo(0, yLine);
      ctx.lineTo(W, yLine);
      ctx.stroke();
    }
    ctx.globalAlpha = horizonAlpha;
    for (let i = -11; i <= 11; i++) {
      const xBot = W/2 + i * (W / 9);
      ctx.beginPath();
      ctx.moveTo(xBot, H);
      ctx.lineTo(W/2, horY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Clouds (during cloud transition)
  if (cloudT > 0 && spaceT < 0.95) {
    ctx.save();
    ctx.globalAlpha = cloudT * (1 - spaceT * 0.8);
    const tSec = performance.now() * 0.001;
    for (let i = 0; i < 7; i++) {
      const yC = H * (0.18 + i * 0.075) + Math.sin(tSec * 0.4 + i) * 6;
      const wC = 220 + (i % 3) * 80;
      const speedPx = 35 + i * 11;
      const xC = ((tSec * speedPx) + i * 230) % (W + 500) - 250;
      ctx.fillStyle = `rgba(255,255,255,${(0.10 + (i%2)*0.05).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(xC, yC, wC, 16 + (i % 2) * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function render() {
  drawBackground();

  // Collapse offset
  let collapseOff = 0;
  if (state === 'dying') {
    const t = collapseTime / 1000;
    collapseOff = 0.5 * 900 * t * t;
  }

  // Draw stack
  for (let i = 0; i < stack.length; i++) {
    const b = stack[i];
    let extraRot = 0;
    let extraY = collapseOff;
    if (state === 'dying') {
      // each block tumbles a little independently
      const t = collapseTime / 1000;
      extraRot = Math.sin(i * 1.3) * 0.08 * t;
      extraY += i * 6 * t;
    }
    const flash = (state === 'playing' && i === stack.length - 1 && perfectFlash > 0)
      ? (perfectFlash / 250) * 0.6 : 0;
    drawBlock(b, { rot: extraRot, screenYAdd: extraY, flash });
  }

  // Chunks
  for (const c of chunks) {
    const fake = { cx: c.cx, cz: c.cz, w: c.w, d: c.d, color: c.color, floor: c.floor };
    drawBlock(fake, { rot: c.rot, screenYAdd: -c.fallY, opacity: c.opacity });
  }

  // Moving block
  if (state === 'playing' && moving) {
    const glow = perfectFlash > 0;
    drawBlock(moving, { glow });
  }

  // Splash demo
  if (state === 'splash') {
    const demoCx = Math.sin(splashPhase) * 180;
    const demo = {
      cx: demoCx, cz: 0,
      w: INITIAL_SIZE, d: INITIAL_SIZE,
      color: PALETTE[1],
      floor: 1
    };
    drawBlock(demo);
  }
}

// ============================================================
// SPLASH SETUP
// ============================================================
function showSplash() {
  state = 'splash';
  stack.length = 0;
  chunks.length = 0;
  moving = null;
  floorNum = 0;
  cameraY = -380;
  cameraTarget = -380;
  cameraXOff = 0;
  cameraXOffTarget = 0;
  streak = 0;
  stack.push({
    cx: 0, cz: 0,
    w: INITIAL_SIZE, d: INITIAL_SIZE,
    color: PALETTE[0],
    floor: 0
  });
}
showSplash();

// ============================================================
// MAIN LOOP
// ============================================================
function loop(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame((t) => { lastTime = t; loop(t); });

// Today's best on splash
hudToday.textContent = 'TODAY ' + getToday();

})();
