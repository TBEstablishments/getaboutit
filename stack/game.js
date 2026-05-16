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
const PERFECT_PLUS_TOL = 2;
const SPEED_BASE = 4.2;
const SPEED_GROWTH = 0.08;
const SPEED_CAP = 2.5;
const RECOVERY = 4;
const INPUT_DEBOUNCE = 100;
const INITIAL_SIZE = 200;
const SLIDE_RANGE_FACTOR = 1.55;
const BAND_EMOJI = ['🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬜','🟥','🟧'];
// C major pentatonic semitone offsets from zone root
const PENT_ST = [0, 2, 4, 7, 9];
const semi = (root, st) => root * Math.pow(2, st / 12);

// ============================================================
// ZONES
// ============================================================
const ZONES = [
  {
    name: 'GROUND',       min: 1,   max: 10,
    rootHz: 261.63,                 // C4
    motif: [0, 7, 12],              // root, P5, octave
    padType: 'sine',     padFreq: 65.41,  padQ: 1.4, padCutoff: 800,
    accent: '#ff006e', accent2: '#00f5ff', accent3: '#d100d1'
  },
  {
    name: 'NEON CITY',    min: 11,  max: 25,
    rootHz: 293.66,                 // D4
    motif: [0, 4, 11],
    padType: 'sawtooth', padFreq: 73.42,  padQ: 2.0, padCutoff: 600,
    accent: '#d100d1', accent2: '#8338ec', accent3: '#00f5ff'
  },
  {
    name: 'CLOUDS',       min: 26,  max: 40,
    rootHz: 329.63,                 // E4
    motif: [0, 5, 9],
    padType: 'sine',     padFreq: 82.41,  padQ: 1.0, padCutoff: 1200,
    accent: '#ffb3d9', accent2: '#d8b4f8', accent3: '#fff3d6'
  },
  {
    name: 'STRATOSPHERE', min: 41,  max: 60,
    rootHz: 392.00,                 // G4
    motif: [0, 5, 12],
    padType: 'triangle', padFreq: 98.00,  padQ: 1.8, padCutoff: 900,
    accent: '#3a0ca3', accent2: '#06ffa5', accent3: '#ffd60a'
  },
  {
    name: 'ORBIT',        min: 61,  max: 80,
    rootHz: 440.00,                 // A4
    motif: [0, 7, 14],
    padType: 'sine',     padFreq: 110.00, padQ: 2.4, padCutoff: 700,
    accent: '#4361ee', accent2: '#00f5ff', accent3: '#ffffff'
  },
  {
    name: 'DEEP SPACE',   min: 81,  max: 110,
    rootHz: 261.63,                 // C4
    motif: [0, 3, 10],
    padType: 'sawtooth', padFreq: 55.00,  padQ: 3.0, padCutoff: 500,
    accent: '#ff006e', accent2: '#06ffa5', accent3: '#8338ec'
  },
  {
    name: 'NEBULA',       min: 111, max: 150,
    rootHz: 329.63,                 // E4
    motif: [0, 4, 7],
    padType: 'triangle', padFreq: 65.41,  padQ: 2.6, padCutoff: 1000,
    accent: '#d100d1', accent2: '#00f5ff', accent3: '#8338ec'
  },
  {
    name: 'THE VOID',     min: 151, max: 99999,
    rootHz: 220.00,                 // A3
    motif: [0, 5, 12],
    padType: 'sine',     padFreq: 55.00,  padQ: 0.6, padCutoff: 300,
    accent: '#ffffff', accent2: '#ffffff', accent3: '#ffffff'
  }
];
const zoneOf = (f) => {
  for (const z of ZONES) if (f >= z.min && f <= z.max) return z;
  return ZONES[ZONES.length - 1];
};

// Rare events keyed by floor — includes Kian Easter egg at 33
const EVENT_FLOORS = {
  13:  'shootingStar',
  27:  'billboard',
  33:  'kianEgg',
  42:  'sunFlare',
  55:  'earthRotate',
  77:  'satellite',
  88:  'luckyNumber',     // only triggers as game-over flavor
  99:  'almostThere',
  100: 'confetti',
  144: 'comet',
  200: 'chromaShift'
};

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
const audioHint = document.getElementById('audio-hint');
const dailyDate = document.getElementById('daily-date');
const finalFloor = document.getElementById('final-floor');
const zoneReachedEl = document.getElementById('zone-reached');
const statBest = document.getElementById('stat-best');
const statToday = document.getElementById('stat-today');
const statAlltime = document.getElementById('stat-alltime');
const scorecard = document.getElementById('scorecard');
const btnCopy = document.getElementById('btn-copy');
const btnShare = document.getElementById('btn-share');
const btnImage = document.getElementById('btn-image');
const zoneBanner = document.getElementById('zone-banner');
const zoneBannerSpan = zoneBanner.querySelector('.chrom > span');
const streakTag = document.getElementById('streak-tag');
const streakCount = document.getElementById('streak-count');
const lifetimeTag = document.getElementById('lifetime-tag');
const lifetimeCount = document.getElementById('lifetime-count');
const veteranTag = document.getElementById('veteran-tag');
const streakBroken = document.getElementById('streak-broken');

const perfectPopup = document.createElement('div');
perfectPopup.id = 'perfect-popup';
stage.appendChild(perfectPopup);

// ============================================================
// CANVAS SCALING
// ============================================================
let dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
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
let resizeTimer = null;
function scheduleResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { resizeTimer = null; resize(); }, 150);
}
window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', scheduleResize);
resize();

const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const highContrast  = !!(window.matchMedia && window.matchMedia('(prefers-contrast: more)').matches);

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
// Separate RNG for visual event details so the gameplay seed stays clean
function eventRng(floor) {
  return mulberry32(todayInt * 1009 + floor * 7919);
}

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

const getAlltime  = () => +(safeGet('gai_alltime_best') || 0);
const getToday    = () => +(safeGet('gai_daily_' + todayKey) || 0);
const setAlltime  = (v) => safeSet('gai_alltime_best', String(v));
const setTodayLS  = (v) => safeSet('gai_daily_' + todayKey, String(v));
const getLifetime = () => +(safeGet('gai_lifetime_floors') || 0);
const addLifetime = (v) => safeSet('gai_lifetime_floors', String(getLifetime() + v));
const getGames    = () => +(safeGet('gai_games_played') || 0);
const incGames    = () => safeSet('gai_games_played', String(getGames() + 1));

// Streak: consecutive UTC days played
function processStreakOnLoad() {
  const last = safeGet('gai_streak_last_day');
  const cur  = +(safeGet('gai_streak') || 0);
  if (!last) return { streak: 0, broken: 0 };
  const lastD = Date.UTC(+last.slice(0,4), +last.slice(4,6) - 1, +last.slice(6,8));
  const todayD = Date.UTC(+todayKey.slice(0,4), +todayKey.slice(4,6) - 1, +todayKey.slice(6,8));
  const diff = Math.round((todayD - lastD) / 86400000);
  if (diff <= 0) return { streak: cur, broken: 0 };
  if (diff === 1) return { streak: cur, broken: 0 };          // same streak, no play yet today
  // missed at least one day
  return { streak: 0, broken: cur };
}
function recordPlayedToday() {
  const last = safeGet('gai_streak_last_day');
  let s = +(safeGet('gai_streak') || 0);
  if (last === todayKey) return s;
  const lastD = last ? Date.UTC(+last.slice(0,4), +last.slice(4,6) - 1, +last.slice(6,8)) : 0;
  const todayD = Date.UTC(+todayKey.slice(0,4), +todayKey.slice(4,6) - 1, +todayKey.slice(6,8));
  const diff = last ? Math.round((todayD - lastD) / 86400000) : null;
  s = (diff === 1) ? s + 1 : 1;
  safeSet('gai_streak', String(s));
  safeSet('gai_streak_last_day', todayKey);
  return s;
}

let { streak: savedStreak, broken: brokenStreak } = processStreakOnLoad();

// audio intro flag (audio default-muted only on first ever load)
let audioIntrod = safeGet('gai_audio_introd') === '1';
let muted;
if (!audioIntrod) {
  muted = true;
} else {
  muted = safeGet('gai_muted') === '1';
}

// ============================================================
// AUDIO
// ============================================================
let audioCtx = null;
let masterGain = null;
let activePad = null;   // { osc, gain, filter, lfo, lfoGain, zoneIdx }

function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.55;
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
  o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (_) {} };
  o.start(t);
  o.stop(t + attack + dur + release + 0.02);
}

function dropTone(floor) {
  const z = zoneOf(floor);
  const idx = (floor - z.min) % PENT_ST.length;
  const f = semi(z.rootHz, PENT_ST[idx]);
  tone(f, 0.14, 'sine', 0.22, 0.005, 0.06);
}

function perfectTone(floor, plus) {
  const z = zoneOf(floor);
  const idx = (floor - z.min) % PENT_ST.length;
  let base = semi(z.rootHz, PENT_ST[idx]) * 4;     // bell range
  if (plus) base *= 2;                              // perfect+ octave higher
  const gainMain = plus ? 0.24 : 0.18;
  tone(base,           0.06, 'sine', gainMain, 0.003, 0.45);
  tone(base * 1.4983,  0.06, 'sine', gainMain * 0.55, 0.003, 0.40); // P5
  tone(base * 2,       0.06, 'sine', gainMain * 0.38, 0.003, 0.35); // P8
}

function comboTone() {
  [523.25, 659.25, 783.99].forEach((f, i) =>
    setTimeout(() => tone(f, 0.10, 'triangle', 0.20, 0.005, 0.18), i * 80));
}

function boostTone() {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    setTimeout(() => tone(f, 0.08, 'sawtooth', 0.14, 0.003, 0.18), i * 60));
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
  o.onended = () => { try { o.disconnect(); f.disconnect(); g.disconnect(); } catch (_) {} };
  o.start(t);
  o.stop(t + 0.75);
}

function zoneSting(zone) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  zone.motif.forEach((st, i) => {
    const f = semi(zone.rootHz * 2, st);
    setTimeout(() => tone(f, 0.18, 'triangle', 0.20, 0.005, 0.25), i * 110);
  });
}

function gameoverTone(zone) {
  // descending minor cadence in zone key: root → m3 below → P5 below → octave below root
  const root = zone.rootHz;
  const steps = [
    [root,            0],
    [semi(root, -3),  0.18],
    [semi(root, -7),  0.38],
    [root / 2,        0.6]
  ];
  steps.forEach(([f, t]) =>
    setTimeout(() => tone(f, 0.34, 'triangle', 0.20, 0.005, 0.30), t * 1000));
}

function startPad(zone) {
  if (!audioCtx || muted) { activePad = { _zone: zone }; return; }
  stopPad(0.25);
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const filt = audioCtx.createBiquadFilter();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  osc.type = zone.padType;
  osc.frequency.setValueAtTime(zone.padFreq, t);
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(zone.padCutoff, t);
  filt.Q.value = zone.padQ;
  lfo.type = 'sine';
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = zone.padCutoff * 0.4;
  lfo.connect(lfoGain).connect(filt.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.045, t + 1.2);
  osc.connect(filt).connect(g).connect(masterGain);
  osc.start(t);
  lfo.start(t);
  activePad = { osc, gain: g, filter: filt, lfo, lfoGain, _zone: zone };
}

function stopPad(fade) {
  if (!activePad || !audioCtx || !activePad.osc) { activePad = null; return; }
  const t = audioCtx.currentTime;
  const f = fade || 0.5;
  try {
    activePad.gain.gain.cancelScheduledValues(t);
    activePad.gain.gain.setValueAtTime(activePad.gain.gain.value, t);
    activePad.gain.gain.exponentialRampToValueAtTime(0.0001, t + f);
    const old = activePad;
    setTimeout(() => {
      try {
        old.osc.stop();
        old.lfo.stop();
        old.osc.disconnect();
        old.lfo.disconnect();
        old.lfoGain.disconnect();
        old.filter.disconnect();
        old.gain.disconnect();
      } catch (_) {}
    }, (f + 0.1) * 1000);
  } catch (_) {}
  activePad = null;
}

// ============================================================
// HAPTICS
// ============================================================
function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

// ============================================================
// STATE
// ============================================================
let state = 'splash';          // splash | playing | dying | gameover
let stack = [];
let moving = null;
let chunks = [];
let stars = [];
let nebulaParticles = [];
let nebulaCache = null;
let activeEvents = [];          // list of running visual events
let triggeredEvents = new Set();// events already fired this run
let currentZone = ZONES[0];
let currentZoneIdx = 0;
let zoneTransitionT = 0;        // 0..1 progress of last transition
let zoneFromIdx = 0;
let glowDropsRemaining = 0;     // post-100 tower glow countdown
let earthAngle = 0;             // permanent per-run from event #55
let chromaIntensity = 0;        // event #200 boost
let fireflyActive = false;      // cloud zone w/ streak ≥ 5
let firefly = null;
let streakLocal = 0;            // perfects streak this run (was `streak` global before)
let floorNum = 0;
let cameraY = 0;
let cameraTarget = 0;
let cameraXOff = 0;
let cameraXOffTarget = 0;
let cameraZoom = 1;
let cameraZoomTarget = 1;
let lastInput = 0;
let pendingBoost = false;
let boostQueue = 0;
let perfectFlash = 0;
let perfectFlashGold = 0;
let lastTime = 0;
let collapseTime = 0;
let splashPhase = 0;
let scoreCacheForBillboard = 0;
let sessionFloor88Lucky = false;

function buildStars() {
  stars.length = 0;
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.95,
      sz: Math.random() * 1.6 + 0.4,
      tw: Math.random() * Math.PI * 2,
      tws: 0.4 + Math.random() * 0.8
    });
  }
}
buildStars();

function buildNebula() {
  const r = eventRng(7);
  nebulaParticles.length = 0;
  for (let i = 0; i < 16; i++) {
    nebulaParticles.push({
      x: r() * W,
      y: r() * H * 0.9,
      rx: 160 + r() * 200,
      ry: 60 + r() * 120,
      hue: r() * 360,
      a: 0.06 + r() * 0.10,
      drift: -0.04 + r() * 0.08
    });
  }
  // Pre-render to offscreen for cheap drift draws
  try {
    const off = ('OffscreenCanvas' in window)
      ? new OffscreenCanvas(W, H)
      : Object.assign(document.createElement('canvas'), { width: W, height: H });
    const c = off.getContext('2d');
    for (const p of nebulaParticles) {
      const g = c.createRadialGradient(p.x, p.y, 10, p.x, p.y, Math.max(p.rx, p.ry));
      g.addColorStop(0, `hsla(${p.hue},80%,65%,${p.a})`);
      g.addColorStop(1, `hsla(${p.hue},80%,40%,0)`);
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      c.fill();
    }
    nebulaCache = off;
  } catch (_) { nebulaCache = null; }
}
buildNebula();

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

function resetRunState() {
  rng = mulberry32(todayInt);
  stack.length = 0;
  chunks.length = 0;
  activeEvents.length = 0;
  triggeredEvents = new Set();
  streakLocal = 0;
  runBestStreak = 0;
  runPerfectCount = 0;
  floorNum = 0;
  cameraY = -380;
  cameraTarget = -380;
  cameraXOff = 0;
  cameraXOffTarget = 0;
  cameraZoom = 1;
  cameraZoomTarget = 1;
  pendingBoost = false;
  boostQueue = 0;
  perfectFlash = 0;
  perfectFlashGold = 0;
  collapseTime = 0;
  glowDropsRemaining = 0;
  earthAngle = 0;
  chromaIntensity = 0;
  fireflyActive = false;
  firefly = null;
  sessionFloor88Lucky = false;
  scoreCacheForBillboard = Math.max(getAlltime(), getToday());
  currentZoneIdx = 0;
  currentZone = ZONES[0];
  zoneTransitionT = 1;
  zoneFromIdx = 0;
}

function startGame() {
  resetRunState();

  recordPlayedToday();
  incGames();

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
  audioHint.classList.add('hidden');
  if (!audioIntrod) { audioIntrod = true; safeSet('gai_audio_introd', '1'); }
  if (activePad) stopPad(0.15);
  startPad(ZONES[0]);
  updateHUD();
  updateAriaLabel();
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
  let plus = false;

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
    const off = Math.abs(mv.cx - top.cx);
    if (off <= PERFECT_TOL) {
      perfect = true; plus = (off <= PERFECT_PLUS_TOL);
      newCx = top.cx; newW = top.w;
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
    const off = Math.abs(mv.cz - top.cz);
    if (off <= PERFECT_TOL) {
      perfect = true; plus = (off <= PERFECT_PLUS_TOL);
      newCz = top.cz; newD = top.d;
    } else {
      if (movB < topB) overhang = { axis: 'z', a: movB, b: topB };
      else if (movF > topF) overhang = { axis: 'z', a: topF, b: movF };
    }
  }

  if (perfect) registerPerfect(mv.floor, plus);
  else registerMiss();

  if (perfect && streakLocal > 0 && streakLocal % 3 === 0) {
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
  buzz(plus ? [3, 12, 4, 12, 10] : (perfect ? [4, 30, 12] : 6));

  bumpHUD();
  if (glowDropsRemaining > 0) glowDropsRemaining--;

  if (floorNum > getToday()) setTodayLS(floorNum);

  // Zone change?
  checkZoneTransition();
  // Fire events for this floor (if not already)
  checkEvents(floorNum);

  if (pendingBoost) {
    pendingBoost = false;
    boostQueue = 2;
    setTimeout(autoBoostDrop, 260);
    return;
  }

  spawnMoving();
  updateHUD();
  updateAriaLabel();
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
  streakLocal++;
  runPerfectCount++;
  if (streakLocal > runBestStreak) runBestStreak = streakLocal;
  if (streakLocal > 5 && streakLocal % 5 === 0) pendingBoost = true;
  perfectFlash = 220;
  flashPerfect('RAINBOW');
  dropTone(nextFloor);
  perfectTone(nextFloor, false);
  bumpHUD();
  if (nextFloor > getToday()) setTodayLS(nextFloor);

  checkZoneTransition();
  checkEvents(nextFloor);

  boostQueue--;
  updateHUD();
  updateAriaLabel();
  if (boostQueue > 0) setTimeout(autoBoostDrop, 260);
  else if (pendingBoost) {
    pendingBoost = false;
    boostQueue = 2;
    setTimeout(autoBoostDrop, 260);
  } else {
    spawnMoving();
  }
}

function registerPerfect(floor, plus) {
  streakLocal++;
  runPerfectCount++;
  if (streakLocal > runBestStreak) runBestStreak = streakLocal;
  perfectTone(floor, plus);
  flashPerfect(plus ? 'PERFECT+' : 'PERFECT', plus);
  perfectFlash = 250;
  if (plus) perfectFlashGold = 320;
  if (streakLocal === 3) comboTone();
  if (streakLocal === 5) { pendingBoost = true; boostTone(); flashPerfect('RAINBOW BOOST'); buzz([8, 20, 8, 20, 30]); }
  if (streakLocal > 5 && streakLocal % 5 === 0) { pendingBoost = true; boostTone(); buzz([8, 20, 8, 20, 30]); }
}

function registerMiss() {
  streakLocal = 0;
}

function flashPerfect(msg = 'PERFECT', golden) {
  perfectPopup.textContent = msg;
  perfectPopup.classList.remove('show', 'golden');
  void perfectPopup.offsetWidth;
  perfectPopup.classList.add('show');
  if (golden) perfectPopup.classList.add('golden');
}

function bumpHUD() {
  hudFloor.classList.remove('bump');
  void hudFloor.offsetWidth;
  hudFloor.classList.add('bump');
}

function updateHUD() {
  hudFloor.querySelector('.chrom > span').textContent = String(floorNum);
  const today = getToday();
  hudToday.textContent = 'TODAY ' + today;
  // pulse when close to beating today
  if (today > 0 && floorNum > 0 && floorNum >= today - 3 && floorNum <= today) {
    hudToday.classList.add('about-to-beat');
  } else {
    hudToday.classList.remove('about-to-beat');
  }
  if (streakLocal >= 2) {
    hudPerfect.classList.remove('hidden');
    perfectCount.textContent = '×' + streakLocal;
    hudPerfect.style.color = PALETTE[(streakLocal - 2) % PALETTE.length];
  } else {
    hudPerfect.classList.add('hidden');
  }
}

function updateAriaLabel() {
  canvas.setAttribute('aria-label',
    `GETABOUTIT — floor ${floorNum} in ${currentZone.name} zone`);
}

// ============================================================
// ZONES — transitions
// ============================================================
function checkZoneTransition() {
  const z = zoneOf(floorNum);
  const newIdx = ZONES.indexOf(z);
  if (newIdx === currentZoneIdx) return;
  zoneFromIdx = currentZoneIdx;
  currentZoneIdx = newIdx;
  currentZone = z;
  zoneTransitionT = 0;
  // Zone-entry banner
  zoneBannerSpan.textContent = `✦ ${z.name} ✦`;
  zoneBanner.classList.remove('show', 'hidden');
  void zoneBanner.offsetWidth;
  zoneBanner.classList.add('show');
  zoneSting(z);
  // Pad swap
  if (audioCtx && !muted) startPad(z);
  // Camera nudge — slight zoom out
  cameraZoomTarget = 0.92;
  setTimeout(() => { cameraZoomTarget = 1; }, 900);
  // Cloud-zone firefly easter egg
  if (z.name === 'CLOUDS' && streakLocal >= 5) {
    fireflyActive = true;
    const r = eventRng(2600);
    firefly = { x: 80 + r() * (W - 160), y: 200 + r() * (H * 0.5), tw: 0 };
  }
  updateAriaLabel();
}

// ============================================================
// EVENTS — deterministic, atmospheric
// ============================================================
function checkEvents(floor) {
  const kind = EVENT_FLOORS[floor];
  if (!kind) return;
  const key = `${kind}:${floor}`;
  if (triggeredEvents.has(key)) return;
  triggeredEvents.add(key);
  spawnEvent(kind, floor);
}

function spawnEvent(kind, floor) {
  const r = eventRng(floor);
  const now = performance.now();
  switch (kind) {
    case 'shootingStar':
      activeEvents.push({
        kind, t: 0, dur: 1500,
        x0: W * (0.1 + r() * 0.2),
        y0: H * (0.1 + r() * 0.15),
        x1: W * (0.7 + r() * 0.25),
        y1: H * (0.35 + r() * 0.2)
      });
      break;
    case 'billboard':
      activeEvents.push({
        kind, t: 0, dur: 3000,
        x: W * (0.18 + r() * 0.5),
        y: H * (0.45 + r() * 0.05),
        text: 'BEST ' + scoreCacheForBillboard,
        flickerSeed: r()
      });
      break;
    case 'kianEgg':
      activeEvents.push({ kind, t: 0, dur: 1400, text: '✦ KIAN WAS HERE ✦' });
      break;
    case 'sunFlare':
      activeEvents.push({ kind, t: 0, dur: 1200 });
      break;
    case 'earthRotate':
      earthAngle += Math.PI / 180; // one degree
      activeEvents.push({ kind, t: 0, dur: 600 });
      break;
    case 'satellite':
      activeEvents.push({
        kind, t: 0, dur: 5000,
        y: H * (0.1 + r() * 0.2),
        dir: r() < 0.5 ? -1 : 1
      });
      break;
    case 'almostThere':
      activeEvents.push({ kind, t: 0, dur: 1000, text: 'ALMOST THERE' });
      break;
    case 'confetti': {
      const parts = [];
      for (let i = 0; i < 80; i++) {
        parts.push({
          x: W / 2 + (r() - 0.5) * 120,
          y: H * 0.35,
          vx: (r() - 0.5) * 11,
          vy: -5 - r() * 5,
          color: PALETTE[Math.floor(r() * PALETTE.length)],
          sz: 4 + r() * 4,
          life: 1
        });
      }
      activeEvents.push({ kind, t: 0, dur: 2200, parts });
      glowDropsRemaining = 3;
      tone(659.25, 0.16, 'triangle', 0.22, 0.005, 0.4);
      tone(987.77, 0.16, 'triangle', 0.18, 0.005, 0.4);
      tone(1318.5, 0.20, 'sine',     0.22, 0.005, 0.5);
      break;
    }
    case 'comet':
      activeEvents.push({
        kind, t: 0, dur: 2500,
        x0: -80, y0: H * 0.1,
        x1: W + 80, y1: H * 0.6
      });
      break;
    case 'chromaShift':
      chromaIntensity = 1;
      activeEvents.push({ kind, t: 0, dur: 3000 });
      break;
  }
}

function updateEvents(dt) {
  for (let i = activeEvents.length - 1; i >= 0; i--) {
    const e = activeEvents[i];
    e.t += dt;
    if (e.kind === 'confetti') {
      for (const p of e.parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.life -= 0.012;
      }
    }
    if (e.kind === 'chromaShift') {
      chromaIntensity = Math.max(0, 1 - e.t / e.dur);
    }
    if (e.t >= e.dur) activeEvents.splice(i, 1);
  }
  // firefly idle
  if (fireflyActive && firefly) {
    firefly.tw += dt * 0.004;
    firefly.x += Math.sin(firefly.tw * 1.3) * 0.5;
    firefly.y += Math.cos(firefly.tw) * 0.4;
  }
}

function drawEventsBehind() {
  // Things that should sit BEHIND the tower
  for (const e of activeEvents) {
    switch (e.kind) {
      case 'shootingStar': drawShootingStar(e); break;
      case 'billboard':    drawBillboard(e); break;
      case 'satellite':    drawSatellite(e); break;
      case 'comet':        drawComet(e); break;
      case 'sunFlare':     drawSunFlare(e); break;
      case 'almostThere':
      case 'kianEgg':      drawGhostText(e); break;
    }
  }
  if (fireflyActive && firefly && currentZone.name === 'CLOUDS') drawFirefly();
}
function drawEventsForeground() {
  for (const e of activeEvents) {
    if (e.kind === 'confetti') drawConfetti(e);
  }
}

function drawShootingStar(e) {
  const p = Math.min(1, e.t / e.dur);
  const x = e.x0 + (e.x1 - e.x0) * p;
  const y = e.y0 + (e.y1 - e.y0) * p;
  const len = 120;
  const dx = (e.x1 - e.x0), dy = (e.y1 - e.y0);
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const grad = ctx.createLinearGradient(x - ux * len, y - uy * len, x, y);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(255,255,255,0.95)');
  ctx.save();
  ctx.globalAlpha = 1 - p * 0.4;
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - ux * len, y - uy * len);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBillboard(e) {
  const p = e.t / e.dur;
  const opacity = (p < 0.15) ? p / 0.15 : (p > 0.85 ? (1 - p) / 0.15 : 1);
  ctx.save();
  ctx.globalAlpha = opacity;
  const flicker = 0.85 + 0.15 * Math.sin(e.t * 0.04 + e.flickerSeed * 7);
  ctx.fillStyle = `rgba(0, 245, 255, ${0.18 * flicker})`;
  ctx.fillRect(e.x - 92, e.y - 22, 184, 44);
  ctx.strokeStyle = `rgba(0, 245, 255, ${0.9 * flicker})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x - 92, e.y - 22, 184, 44);
  ctx.fillStyle = `rgba(255, 255, 255, ${flicker})`;
  ctx.font = "16px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e.text, e.x, e.y);
  ctx.restore();
}

function drawSatellite(e) {
  const p = e.t / e.dur;
  const x = e.dir > 0 ? -40 + (W + 80) * p : W + 40 - (W + 80) * p;
  ctx.save();
  ctx.translate(x, e.y);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(-6, -2, 12, 4);    // body
  ctx.fillRect(-14, -1, 6, 2);    // left wing
  ctx.fillRect(8, -1, 6, 2);      // right wing
  ctx.fillStyle = 'rgba(0,245,255,0.6)';
  ctx.fillRect(-1, -4, 2, 2);     // antenna
  ctx.restore();
}

function drawComet(e) {
  const p = Math.min(1, e.t / e.dur);
  const x = e.x0 + (e.x1 - e.x0) * p;
  const y = e.y0 + (e.y1 - e.y0) * p;
  const tx = e.x0 + (e.x1 - e.x0) * Math.max(0, p - 0.18);
  const ty = e.y0 + (e.y1 - e.y0) * Math.max(0, p - 0.18);
  const grad = ctx.createLinearGradient(tx, ty, x, y);
  grad.addColorStop(0, 'rgba(0,245,255,0)');
  grad.addColorStop(0.6, 'rgba(0,245,255,0.85)');
  grad.addColorStop(1, '#fff');
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
}

function drawSunFlare(e) {
  const p = e.t / e.dur;
  const r = 60 + p * 320;
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.7;
  const g = ctx.createRadialGradient(W/2, H * 0.62 - 20, 10, W/2, H * 0.62 - 20, r);
  g.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
  g.addColorStop(0.5, 'rgba(255, 149, 0, 0.4)');
  g.addColorStop(1, 'rgba(255, 0, 110, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(W/2, H * 0.62 - 20, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGhostText(e) {
  const p = e.t / e.dur;
  const opacity = (p < 0.2) ? p / 0.2 : (p > 0.75 ? (1 - p) / 0.25 : 1);
  ctx.save();
  ctx.globalAlpha = opacity * 0.55;
  ctx.font = "26px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // chromatic ghost
  ctx.fillStyle = '#ff006e';
  ctx.fillText(e.text, W / 2 + 3, H * 0.30);
  ctx.fillStyle = '#00f5ff';
  ctx.fillText(e.text, W / 2 - 3, H * 0.30);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(e.text, W / 2, H * 0.30);
  ctx.restore();
}

function drawConfetti(e) {
  ctx.save();
  for (const p of e.parts) {
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
  }
  ctx.restore();
}

function drawFirefly() {
  const tw = 0.55 + 0.45 * Math.sin(firefly.tw * 3);
  ctx.save();
  ctx.shadowColor = '#ffd60a';
  ctx.shadowBlur = 14 * tw;
  ctx.fillStyle = `rgba(255, 232, 120, ${tw})`;
  ctx.beginPath();
  ctx.arc(firefly.x, firefly.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ============================================================
// GAME OVER
// ============================================================
function gameOver() {
  state = 'dying';
  collapseTime = 0;
  moving = null;
  const zone = zoneOf(Math.max(1, floorNum));
  gameoverTone(zone);
  stopPad(0.6);
  const cur = floorNum;
  const aTime = getAlltime();
  const tBest = getToday();
  if (cur > aTime) setAlltime(cur);
  if (cur > tBest) setTodayLS(cur);
  addLifetime(cur);

  finalFloor.textContent = String(cur);
  zoneReachedEl.textContent = '✦ ' + zone.name + ' ✦';
  statBest.textContent = cur;
  statToday.textContent = Math.max(tBest, cur);
  statAlltime.textContent = Math.max(aTime, cur);

  // floor 88 lucky number flavor
  if (cur === 88 && !sessionFloor88Lucky) {
    sessionFloor88Lucky = true;
    zoneReachedEl.textContent = '🍀 LUCKY NUMBER · ' + zone.name;
  }

  scorecard.textContent = buildScoreCard(cur, zone);

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

// ============================================================
// SHARE CARD V2
// ============================================================
function moonForFloor(f) {
  if (f >= 150) return '🌕';
  if (f >= 120) return '🌔';
  if (f >= 100) return '🌓';
  if (f >= 80)  return '🌒';
  return null;
}

function tauntFor(f) {
  if (f < 10)  return 'got distracted';
  if (f < 25)  return 'warmed up';
  if (f < 50)  return 'found the rhythm';
  if (f < 80)  return 'broke the cloud line';
  if (f < 110) return 'reached orbit';
  if (f < 150) return 'deep space brain';
  return 'transcendent';
}

function buildScoreCard(f, zone) {
  let bands = '';
  for (let i = 1; i <= 10; i++) {
    const filled = (f >= (i - 1) * 10 + 1);
    if (i === 10 && filled) {
      const moon = moonForFloor(f);
      bands += moon ? moon : BAND_EMOJI[i - 1];
    } else {
      bands += filled ? BAND_EMOJI[i - 1] : '⬛';
    }
  }
  const subtitle = `streak ${runBestStreak} · perfect ${runPerfectCount}`;
  return `GETABOUTIT — floor ${f} ✦ ${zone.name}\n${bands}\n${subtitle}\n${tauntFor(f)}\ngetaboutit.com`;
}

// ============================================================
// SCREENSHOT CARD (1080x1920 portrait image)
// ============================================================
function buildScreenshotCard(f, zone) {
  const SW = 1080, SH = 1920;
  const off = ('OffscreenCanvas' in window)
    ? new OffscreenCanvas(SW, SH)
    : Object.assign(document.createElement('canvas'), { width: SW, height: SH });
  const c = off.getContext('2d');

  // Sky based on zone
  const sky = c.createLinearGradient(0, 0, 0, SH);
  if (f >= 81) {
    sky.addColorStop(0, '#020008');
    sky.addColorStop(1, '#0a0020');
  } else if (f >= 41) {
    sky.addColorStop(0, '#0a0220');
    sky.addColorStop(1, '#1a0535');
  } else {
    sky.addColorStop(0, '#1a0535');
    sky.addColorStop(0.55, '#3a0ca3');
    sky.addColorStop(1, '#6a1b9a');
  }
  c.fillStyle = sky;
  c.fillRect(0, 0, SW, SH);

  // Stars for space
  if (f >= 60) {
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * SW;
      const y = Math.random() * SH * 0.7;
      const sz = Math.random() * 3 + 1;
      c.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
      c.fillRect(x, y, sz, sz);
    }
  } else if (f < 40) {
    // Outrun horizon
    const horY = SH * 0.7;
    const sunR = 360;
    const sunY = horY - 30;
    const sg = c.createRadialGradient(SW/2, sunY, 20, SW/2, sunY, sunR);
    sg.addColorStop(0, '#ffd60a');
    sg.addColorStop(0.3, '#ff9500');
    sg.addColorStop(0.7, '#ff006e');
    sg.addColorStop(1, 'rgba(255,0,110,0)');
    c.fillStyle = sg;
    c.beginPath(); c.arc(SW/2, sunY, sunR, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a0a1e';
    for (let i = 0; i < 6; i++) c.fillRect(SW/2 - sunR, sunY + 90 + i * 36, sunR * 2, 9 - i);
    const lg = c.createLinearGradient(0, horY - 3, 0, horY + 3);
    lg.addColorStop(0, '#ffd60a'); lg.addColorStop(1, '#ff006e');
    c.fillStyle = lg; c.fillRect(0, horY - 2, SW, 4);
    c.strokeStyle = '#ff006e'; c.lineWidth = 2;
    for (let i = -11; i <= 11; i++) {
      const xBot = SW/2 + i * (SW / 9);
      c.beginPath(); c.moveTo(xBot, SH); c.lineTo(SW/2, horY); c.stroke();
    }
  }

  // Tower silhouette — iso, centered, scaled to fit
  const tower = stack.length > 1 ? stack : [{ cx: 0, cz: 0, w: 200, d: 200, color: PALETTE[0], floor: 0 }];
  const maxFloor = Math.max(1, f);
  const blockH = Math.min(40, (SH * 0.6) / Math.max(1, maxFloor));
  const baseSize = Math.min(280, blockH * 5);
  const cxScreen = SW / 2;
  const baseY = SH * 0.85;
  const isoCos = COS30, isoSin = SIN30;

  for (let i = 0; i < tower.length; i++) {
    const b = tower[i];
    const scale = baseSize / 200;
    const w = b.w * scale, d = b.d * scale;
    const cx = b.cx * scale, cz = b.cz * scale;
    const yBot = baseY - i * blockH;
    const yTop = yBot - blockH;
    const x = cx, z = cz;
    const tFR = [cxScreen + (x + w/2 - (z + d/2)) * isoCos, yTop + (x + w/2 + z + d/2) * isoSin];
    const tBR = [cxScreen + (x + w/2 - (z - d/2)) * isoCos, yTop + (x + w/2 + z - d/2) * isoSin];
    const tBL = [cxScreen + (x - w/2 - (z - d/2)) * isoCos, yTop + (x - w/2 + z - d/2) * isoSin];
    const tFL = [cxScreen + (x - w/2 - (z + d/2)) * isoCos, yTop + (x - w/2 + z + d/2) * isoSin];
    const bFR = [cxScreen + (x + w/2 - (z + d/2)) * isoCos, yBot + (x + w/2 + z + d/2) * isoSin];
    const bBR = [cxScreen + (x + w/2 - (z - d/2)) * isoCos, yBot + (x + w/2 + z - d/2) * isoSin];
    const bFL = [cxScreen + (x - w/2 - (z + d/2)) * isoCos, yBot + (x - w/2 + z + d/2) * isoSin];

    const col = b.color;
    c.fillStyle = shadeHex(col, 0.7);
    c.beginPath(); c.moveTo(...tFR); c.lineTo(...tBR); c.lineTo(...bBR); c.lineTo(...bFR); c.closePath(); c.fill();
    c.fillStyle = shadeHex(col, 0.55);
    c.beginPath(); c.moveTo(...tFR); c.lineTo(...tFL); c.lineTo(...bFL); c.lineTo(...bFR); c.closePath(); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.moveTo(...tFR); c.lineTo(...tBR); c.lineTo(...tBL); c.lineTo(...tFL); c.closePath(); c.fill();
  }

  // Wordmark
  c.font = "110px 'Press Start 2P', monospace";
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ff006e';
  c.fillText('GETABOUTIT', SW / 2 + 5, 220);
  c.fillStyle = '#00f5ff';
  c.fillText('GETABOUTIT', SW / 2 - 5, 220);
  c.fillStyle = '#ffffff';
  c.fillText('GETABOUTIT', SW / 2, 220);

  // Floor number — huge
  c.font = "360px 'Press Start 2P', monospace";
  c.fillStyle = '#ff006e';
  c.fillText(String(f), SW / 2 + 8, 480);
  c.fillStyle = '#00f5ff';
  c.fillText(String(f), SW / 2 - 8, 480);
  c.fillStyle = '#ffffff';
  c.fillText(String(f), SW / 2, 480);

  // Zone
  c.font = "36px 'Press Start 2P', monospace";
  c.fillStyle = '#00f5ff';
  c.fillText('✦ ' + zone.name + ' ✦', SW / 2, 700);

  // Taunt
  c.font = "28px 'Press Start 2P', monospace";
  c.fillStyle = '#06ffa5';
  c.fillText(tauntFor(f), SW / 2, 760);

  // Footer
  c.font = "30px 'Press Start 2P', monospace";
  c.fillStyle = 'rgba(0, 245, 255, 0.9)';
  c.fillText('getaboutit.com', SW / 2, SH - 70);

  return off;
}

function shadeHex(hex, m) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * m)},${Math.round(g * m)},${Math.round(b * m)})`;
}

function saveScreenshot() {
  const cur = +finalFloor.textContent || floorNum;
  const z = zoneOf(Math.max(1, cur));
  const off = buildScreenshotCard(cur, z);
  const finish = (blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `getaboutit-floor-${cur}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    btnImage.classList.add('copied');
    btnImage.textContent = '✓ SAVED';
    setTimeout(() => { btnImage.classList.remove('copied'); btnImage.textContent = '📸 SAVE IMAGE'; }, 1600);
  };
  if (off.convertToBlob) {
    off.convertToBlob({ type: 'image/png' }).then(finish);
  } else {
    off.toBlob(finish, 'image/png');
  }
}

// Per-run stats — set during play, consumed by share card on game over
let runBestStreak = 0;
let runPerfectCount = 0;

// ============================================================
// INPUT
// ============================================================
function handleDrop(e) {
  if (e && e.target && e.target.closest && e.target.closest('button, a')) return;
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
  if (e.target && e.target.closest && e.target.closest('button, a')) return;
  e.preventDefault();
  handleDrop(e);
}, { passive: false });
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'A')) return;
  handleDrop(e);
});

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  muted = !muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
  safeSet('gai_muted', muted ? '1' : '0');
  safeSet('gai_audio_introd', '1');
  audioHint.classList.add('hidden');
  if (!muted && audioCtx && state === 'playing') startPad(currentZone);
  if (muted) stopPad(0.2);
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
  const txt = scorecard.textContent + '\nhttps://getaboutit.com';
  if (navigator.share) {
    try { await navigator.share({ title: 'GETABOUTIT', text: txt, url: 'https://getaboutit.com' }); return; } catch {}
  }
  try {
    await navigator.clipboard.writeText(txt);
    btnShare.textContent = 'COPIED ✓';
  } catch {}
  setTimeout(() => { btnShare.textContent = 'SHARE'; }, 1400);
});
btnImage.addEventListener('click', (e) => {
  e.stopPropagation();
  saveScreenshot();
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

  // Zone transition crossfade progress
  if (zoneTransitionT < 1) zoneTransitionT = Math.min(1, zoneTransitionT + dt / 500);

  // Active events
  updateEvents(dt);

  // Camera tracking
  let topFloor = stack.length > 0 ? stack[stack.length - 1].floor : 0;
  if (state === 'playing' && moving) topFloor = moving.floor;
  const topWorldY = (topFloor + 1) * BLOCK_H;
  cameraTarget = topWorldY - 380;

  if (state === 'playing' && stack.length > 1) {
    const t = stack[stack.length - 1];
    cameraXOffTarget = (t.cx - t.cz) * COS30 * 0.45;
  } else {
    cameraXOffTarget = 0;
  }

  if (reducedMotion) {
    cameraY = cameraTarget;
    cameraXOff = cameraXOffTarget;
    cameraZoom = cameraZoomTarget;
  } else {
    cameraY += (cameraTarget - cameraY) * Math.min(0.10 * k, 1);
    cameraXOff += (cameraXOffTarget - cameraXOff) * Math.min(0.06 * k, 1);
    cameraZoom += (cameraZoomTarget - cameraZoom) * Math.min(0.05 * k, 1);
  }

  // exactly 0.5 Hz (period 2000ms); Math.sin(splashPhase) cycles once per 2π rad
  if (state === 'splash') splashPhase += dt * 0.00314;

  for (const s of stars) s.tw += dt * 0.003 * s.tws;

  if (perfectFlash > 0) perfectFlash = Math.max(0, perfectFlash - dt);
  if (perfectFlashGold > 0) perfectFlashGold = Math.max(0, perfectFlashGold - dt);

  if (state === 'dying') collapseTime += dt;
}

// ============================================================
// PROJECTION
// ============================================================
function iso(x, z, y) {
  const sx = W / 2 + ((x - z) * COS30) * cameraZoom - cameraXOff;
  const sy = H * 0.70 + ((x + z) * SIN30 - y + cameraY) * cameraZoom;
  return { sx, sy };
}

function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ra = (pa >> 16) & 0xff, ga = (pa >> 8) & 0xff, ba = pa & 0xff;
  const rb = (pb >> 16) & 0xff, gb = (pb >> 8) & 0xff, bb = pb & 0xff;
  return `rgb(${Math.round(ra+(rb-ra)*t)},${Math.round(ga+(gb-ga)*t)},${Math.round(ba+(bb-ba)*t)})`;
}

// ============================================================
// DRAW BLOCK
// ============================================================
function drawBlock(b, opts) {
  opts = opts || {};
  const rot = opts.rot || 0;
  const opacity = opts.opacity != null ? opts.opacity : 1;
  const screenYAdd = opts.screenYAdd || 0;
  const glow = opts.glow || false;
  const flash = opts.flash || 0;
  const screenXAdd = opts.screenXAdd || 0;

  const x = b.cx, z = b.cz, w = b.w, d = b.d;
  const yBot = b.floor * BLOCK_H;
  const yTop = (b.floor + 1) * BLOCK_H;

  const tFR = iso(x + w/2, z + d/2, yTop);
  const tBR = iso(x + w/2, z - d/2, yTop);
  const tBL = iso(x - w/2, z - d/2, yTop);
  const tFL = iso(x - w/2, z + d/2, yTop);
  const bFR = iso(x + w/2, z + d/2, yBot);
  const bBR = iso(x + w/2, z - d/2, yBot);
  const bFL = iso(x - w/2, z + d/2, yBot);

  ctx.save();
  if (screenXAdd || screenYAdd) ctx.translate(screenXAdd, screenYAdd);
  if (rot !== 0) {
    const cxR = (tFR.sx + tBL.sx) / 2;
    const cyR = (tFR.sy + tBL.sy) / 2;
    ctx.translate(cxR, cyR);
    ctx.rotate(rot);
    ctx.translate(-cxR, -cyR);
  }
  ctx.globalAlpha = opacity;

  ctx.fillStyle = shadeHex(b.color, 0.70);
  ctx.beginPath();
  ctx.moveTo(tFR.sx, tFR.sy);
  ctx.lineTo(tBR.sx, tBR.sy);
  ctx.lineTo(bBR.sx, bBR.sy);
  ctx.lineTo(bFR.sx, bFR.sy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shadeHex(b.color, 0.55);
  ctx.beginPath();
  ctx.moveTo(tFR.sx, tFR.sy);
  ctx.lineTo(tFL.sx, tFL.sy);
  ctx.lineTo(bFL.sx, bFL.sy);
  ctx.lineTo(bFR.sx, bFR.sy);
  ctx.closePath();
  ctx.fill();

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

  ctx.shadowBlur = 0;
  ctx.strokeStyle = highContrast ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)';
  ctx.lineWidth = highContrast ? 2 : 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tFR.sx, tFR.sy); ctx.lineTo(bFR.sx, bFR.sy);
  ctx.moveTo(tBR.sx, tBR.sy); ctx.lineTo(bBR.sx, bBR.sy);
  ctx.moveTo(tFL.sx, tFL.sy); ctx.lineTo(bFL.sx, bFL.sy);
  ctx.stroke();

  ctx.restore();
}

// ============================================================
// DRAW BACKGROUND — zone-aware
// ============================================================
function drawBackgroundForZone(zone, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  switch (zone.name) {
    case 'GROUND':       drawZoneGround(); break;
    case 'NEON CITY':    drawZoneNeonCity(); break;
    case 'CLOUDS':       drawZoneClouds(); break;
    case 'STRATOSPHERE': drawZoneStrato(); break;
    case 'ORBIT':        drawZoneOrbit(); break;
    case 'DEEP SPACE':   drawZoneDeepSpace(); break;
    case 'NEBULA':       drawZoneNebula(); break;
    case 'THE VOID':     drawZoneVoid(); break;
  }
  ctx.restore();
}

function drawZoneGround() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a0535');
  sky.addColorStop(0.55, '#3a0ca3');
  sky.addColorStop(1, '#6a1b9a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const horY = H * 0.62;
  const sunR = 230;
  const sunY = horY - 20;
  const sunG = ctx.createRadialGradient(W/2, sunY, 10, W/2, sunY, sunR);
  sunG.addColorStop(0, '#ffd60a');
  sunG.addColorStop(0.3, '#ff9500');
  sunG.addColorStop(0.7, '#ff006e');
  sunG.addColorStop(1, 'rgba(255,0,110,0)');
  ctx.fillStyle = sunG;
  ctx.beginPath(); ctx.arc(W/2, sunY, sunR, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#0a0a1e';
  for (let i = 0; i < 5; i++) {
    const sy = sunY + 60 + i * 22;
    const sh = 7 - i;
    if (sh > 0) ctx.fillRect(W/2 - sunR, sy, sunR * 2, sh);
  }

  const lineG = ctx.createLinearGradient(0, horY - 2, 0, horY + 2);
  lineG.addColorStop(0, '#ffd60a');
  lineG.addColorStop(1, '#ff006e');
  ctx.fillStyle = lineG;
  ctx.fillRect(0, horY - 1, W, 2);

  ctx.strokeStyle = '#ff006e';
  ctx.lineWidth = 1.2;
  const tSec = performance.now() * 0.001;
  for (let i = 1; i <= 16; i++) {
    const t = ((i / 16) + (tSec * 0.04) % (1/16)) % 1;
    const yLine = horY + Math.pow(t, 1.9) * (H - horY) * 1.1;
    ctx.globalAlpha = (1 - t * 0.5);
    ctx.beginPath(); ctx.moveTo(0, yLine); ctx.lineTo(W, yLine); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = -11; i <= 11; i++) {
    const xBot = W/2 + i * (W / 9);
    ctx.beginPath(); ctx.moveTo(xBot, H); ctx.lineTo(W/2, horY); ctx.stroke();
  }
}

function drawZoneNeonCity() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0e0028');
  sky.addColorStop(0.6, '#3a0ca3');
  sky.addColorStop(1, '#5e1a8a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // City silhouette parallax
  const tSec = performance.now() * 0.001;
  const baseY = H * 0.78;
  ctx.fillStyle = '#0a0020';
  for (let i = 0; i < 14; i++) {
    const xC = (i * 60 + (tSec * 6) % 60) - 30;
    const hC = 60 + (Math.sin(i * 1.3) + 1) * 40;
    ctx.fillRect(xC, baseY - hC, 44, hC);
    // window dots
    ctx.fillStyle = (i % 3 === 0) ? '#00f5ff' : '#ffd60a';
    for (let w = 0; w < 4; w++) {
      const wy = baseY - hC + 10 + w * 14;
      if (Math.sin(i * 9 + w + tSec * 2) > 0.3) ctx.fillRect(xC + 6, wy, 4, 4);
      if (Math.sin(i * 7 + w * 2 + tSec * 1.7) > 0.4) ctx.fillRect(xC + 28, wy, 4, 4);
    }
    ctx.fillStyle = '#0a0020';
  }
  // drifting hologram glyphs
  for (let i = 0; i < 3; i++) {
    const x = ((tSec * 12 + i * 240) % (W + 100)) - 50;
    const y = H * (0.25 + i * 0.12);
    ctx.fillStyle = `rgba(0, 245, 255, ${0.15 + (Math.sin(tSec + i) + 1) * 0.08})`;
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.fillText('▲ ✦ △ ◇ ▣ ✦', x, y);
  }
}

function drawZoneClouds() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#3a1a5a');
  sky.addColorStop(0.5, '#6e3aa0');
  sky.addColorStop(1, '#a070c8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const tSec = performance.now() * 0.001;
  // sunbeams from off-screen top-left
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const ang = -0.5 + i * 0.06;
    const len = H * 1.4;
    ctx.save();
    ctx.translate(-100, -80);
    ctx.rotate(ang + 1.0);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(255, 240, 200, 0.20)');
    g.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, -30, len, 60);
    ctx.restore();
  }
  ctx.restore();

  for (let i = 0; i < 9; i++) {
    const yC = H * (0.12 + i * 0.085) + Math.sin(tSec * 0.4 + i) * 8;
    const wC = 240 + (i % 3) * 100;
    const speedPx = 28 + i * 9;
    const xC = ((tSec * speedPx) + i * 240) % (W + 600) - 300;
    ctx.fillStyle = `rgba(255, 230, 250, ${(0.18 + (i%2)*0.05).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(xC, yC, wC, 22 + (i % 2) * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawZoneStrato() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#04021c');
  sky.addColorStop(0.6, '#1a103a');
  sky.addColorStop(1, '#321a5a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // sparse stars
  for (const s of stars) {
    if (s.y > H * 0.7) continue;
    const tw = 0.55 + 0.45 * Math.sin(s.tw);
    ctx.fillStyle = `rgba(255,255,255,${(0.55 * tw).toFixed(3)})`;
    ctx.fillRect(s.x, s.y, s.sz, s.sz);
  }
  // aurora ribbons
  const tSec = performance.now() * 0.001;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const yBase = H * (0.30 + i * 0.12);
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = yBase + Math.sin(x * 0.012 + tSec * 0.6 + i * 1.7) * 28
                      + Math.cos(x * 0.005 + tSec * 0.3 + i) * 18;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    const g = ctx.createLinearGradient(0, yBase - 40, 0, yBase + 40);
    g.addColorStop(0, `rgba(6, 255, 165, 0)`);
    g.addColorStop(0.5, `rgba(${i === 0 ? '255,214,10' : (i === 1 ? '6,255,165' : '0,245,255')}, 0.25)`);
    g.addColorStop(1, 'rgba(255, 214, 10, 0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 28;
    ctx.stroke();
  }
  ctx.restore();
}

function drawZoneOrbit() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#02000f');
  sky.addColorStop(1, '#0a0220');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(s.tw);
    ctx.fillStyle = `rgba(255,255,255,${tw.toFixed(3)})`;
    ctx.fillRect(s.x, s.y, s.sz, s.sz);
  }
  // Earth's curved horizon at bottom
  const earthY = H * 1.05;
  const earthR = W * 1.0;
  const eg = ctx.createRadialGradient(W/2, earthY, earthR * 0.7, W/2, earthY, earthR * 1.05);
  eg.addColorStop(0, '#1a4d8c');
  eg.addColorStop(0.6, '#0a2540');
  eg.addColorStop(1, '#020010');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(W/2, earthY, earthR, 0, Math.PI * 2);
  ctx.fill();
  // Atmosphere highlight arc — rotated by earthAngle (event #55)
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W/2, earthY, earthR + 2, Math.PI + 0.3 + earthAngle, 2 * Math.PI - 0.3 + earthAngle);
  ctx.stroke();
}

function drawZoneDeepSpace() {
  ctx.fillStyle = '#01000c';
  ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(s.tw);
    ctx.fillStyle = `rgba(255,255,255,${tw.toFixed(3)})`;
    ctx.fillRect(s.x, s.y, s.sz, s.sz);
  }
  // distant galaxy
  const tSec = performance.now() * 0.001;
  ctx.save();
  ctx.translate(W * 0.78, H * 0.18);
  ctx.rotate(0.4 + tSec * 0.005);
  const galG = ctx.createRadialGradient(0, 0, 6, 0, 0, 160);
  galG.addColorStop(0, 'rgba(255,210,255,0.95)');
  galG.addColorStop(0.35, 'rgba(180,120,220,0.5)');
  galG.addColorStop(1, 'rgba(80,40,140,0)');
  ctx.fillStyle = galG;
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // drifting asteroid silhouette
  const ax = ((tSec * 18) % (W + 200)) - 100;
  ctx.fillStyle = 'rgba(20,12,30,1)';
  ctx.beginPath();
  ctx.ellipse(ax, H * 0.55, 22, 14, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawZoneNebula() {
  ctx.fillStyle = '#080018';
  ctx.fillRect(0, 0, W, H);
  // stars
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(s.tw);
    ctx.fillStyle = `rgba(180, 255, 255, ${tw.toFixed(3)})`;
    ctx.fillRect(s.x, s.y, s.sz, s.sz);
  }
  // nebula cache, slow drift
  const tSec = performance.now() * 0.001;
  if (nebulaCache) {
    const dx = Math.sin(tSec * 0.04) * 20;
    const dy = Math.cos(tSec * 0.03) * 12;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(nebulaCache, dx, dy);
    ctx.globalAlpha = 1;
  } else {
    for (const p of nebulaParticles) {
      const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, Math.max(p.rx, p.ry));
      g.addColorStop(0, `hsla(${p.hue},80%,65%,${p.a})`);
      g.addColorStop(1, `hsla(${p.hue},80%,40%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawZoneVoid() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // nothing — the tower is the universe
}

function drawBackground() {
  if (zoneTransitionT < 1 && currentZoneIdx !== zoneFromIdx) {
    drawBackgroundForZone(ZONES[zoneFromIdx], 1 - zoneTransitionT);
    drawBackgroundForZone(currentZone, zoneTransitionT);
  } else {
    drawBackgroundForZone(currentZone, 1);
  }
}

// ============================================================
// RENDER
// ============================================================
function render() {
  drawBackground();
  drawEventsBehind();

  // Tower glow on parallax behind it
  if (stack.length > 1 && currentZone.name !== 'GROUND') {
    const top = stack[stack.length - 1];
    const tip = iso(top.cx, top.cz, (top.floor + 1) * BLOCK_H);
    ctx.save();
    const glowG = ctx.createRadialGradient(tip.sx, tip.sy, 8, tip.sx, tip.sy, 280);
    glowG.addColorStop(0, `rgba(255, 0, 110, ${0.18 + (glowDropsRemaining > 0 ? 0.18 : 0)})`);
    glowG.addColorStop(1, 'rgba(255, 0, 110, 0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

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
    let extraX = 0;
    if (state === 'dying') {
      const t = collapseTime / 1000;
      const heightFactor = (i / Math.max(1, stack.length - 1));
      const dirSeed = Math.sin(i * 17.31);
      extraRot = dirSeed * 0.25 * t * (0.4 + heightFactor);
      extraY += i * 6 * t;
      extraX = dirSeed * 60 * heightFactor * t;
    }
    const flash = (state === 'playing' && i === stack.length - 1 && perfectFlash > 0)
      ? (perfectFlash / 250) * (perfectFlashGold > 0 ? 0.9 : 0.6) : 0;
    const glowBlock = (state === 'playing' && i === stack.length - 1 && glowDropsRemaining > 0);
    drawBlock(b, { rot: extraRot, screenXAdd: extraX, screenYAdd: extraY, flash, glow: glowBlock });
  }

  // Chunks
  for (const c of chunks) {
    const fake = { cx: c.cx, cz: c.cz, w: c.w, d: c.d, color: c.color, floor: c.floor };
    drawBlock(fake, { rot: c.rot, screenYAdd: -c.fallY, opacity: c.opacity });
  }

  // Moving block
  if (state === 'playing' && moving) {
    const glow = perfectFlash > 0 || glowDropsRemaining > 0;
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

  drawEventsForeground();

  // Chroma desaturation overlay (event #200)
  if (chromaIntensity > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128,128,128,${chromaIntensity * 0.5})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ============================================================
// SPLASH SETUP
// ============================================================
function showSplash() {
  state = 'splash';
  stack.length = 0;
  chunks.length = 0;
  activeEvents.length = 0;
  moving = null;
  floorNum = 0;
  cameraY = -380;
  cameraTarget = -380;
  cameraXOff = 0;
  cameraXOffTarget = 0;
  cameraZoom = 1;
  cameraZoomTarget = 1;
  streakLocal = 0;
  runBestStreak = 0;
  runPerfectCount = 0;
  currentZone = ZONES[0];
  currentZoneIdx = 0;
  zoneFromIdx = 0;
  zoneTransitionT = 1;
  stack.push({
    cx: 0, cz: 0,
    w: INITIAL_SIZE, d: INITIAL_SIZE,
    color: PALETTE[0],
    floor: 0
  });

  // Splash UI: streak, lifetime, veteran, audio hint
  if (savedStreak >= 2) {
    streakTag.classList.remove('hidden');
    streakCount.textContent = savedStreak;
  } else {
    streakTag.classList.add('hidden');
  }
  const lifetime = getLifetime();
  if (lifetime > 0) {
    lifetimeTag.classList.remove('hidden');
    lifetimeCount.textContent = lifetime.toLocaleString();
  } else {
    lifetimeTag.classList.add('hidden');
  }
  const games = getGames();
  if (games >= 50) veteranTag.classList.remove('hidden');
  else veteranTag.classList.add('hidden');
  if (brokenStreak >= 2) {
    streakBroken.classList.remove('hidden');
    streakBroken.textContent = `streak ended at ${brokenStreak} — start a new one`;
  } else {
    streakBroken.classList.add('hidden');
  }
  if (!audioIntrod) {
    audioHint.classList.remove('hidden');
  }
}
showSplash();

// ============================================================
// MAIN LOOP
// ============================================================
let rafId = null;
function loop(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;
  update(dt);
  render();
  rafId = requestAnimationFrame(loop);
}
function startLoop() {
  if (rafId !== null) return;
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}
function stopLoop() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopLoop();
    if (audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(() => {});
  } else {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    startLoop();
  }
});

startLoop();

// Today's best on splash
hudToday.textContent = 'TODAY ' + getToday();

})();
