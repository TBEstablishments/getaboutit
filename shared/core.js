/* GETABOUTIT shared core — window.GAI */
(() => {
'use strict';

// ============== VERSION ==============
// Bump on every release that changes asset structure. Used to detect
// stale-cache scenarios and to gate future migrations. User data
// (scores, streak, achievements, pinned, etc.) is NEVER wiped here —
// the version key is informational only.
const SITE_VERSION = 'phase5';
try {
  const stored = localStorage.getItem('gai_site_version');
  if (stored && stored !== SITE_VERSION) {
    // Future-phase migrations would run here. For now: just record the
    // transition so we can detect "user came from an older version".
    // No-op migration — explicitly do NOT touch gai_best_*, gai_streak_*,
    // gai_achievements, gai_recent, gai_pinned, gai_wins, gai_time_*, etc.
  }
  localStorage.setItem('gai_site_version', SITE_VERSION);
} catch {}

const PALETTE = [
  '#ff006e', '#d100d1', '#8338ec', '#3a0ca3', '#4361ee',
  '#00f5ff', '#06ffa5', '#ffd60a', '#ff9500', '#ef233c'
];

const PALETTE_NAMES = ['pink','magenta','purple','deeppurple','blue','cyan','teal','yellow','orange','red'];

const GAME_KEYS = [
  'stack','snake','blocks','p2048','breakout','pong','memory','minesweeper',
  'flap','invaders','asteroids','simon','tictactoe','lightsout','slide',
  'reaction','words','blackjack','poker','solitaire','hearts','chess',
  'checkers','sudoku','connect4','battleship','runner','bubbles','dots',
  'craps','type','pixel','spider','cribbage','slither','backgammon','go'
];
const GAME_PATHS = {
  stack: '/stack', snake: '/snake', blocks: '/blocks', p2048: '/2048',
  breakout: '/breakout', pong: '/pong', memory: '/memory',
  minesweeper: '/minesweeper', flap: '/flap', invaders: '/invaders',
  asteroids: '/asteroids', simon: '/simon', tictactoe: '/tictactoe',
  lightsout: '/lightsout', slide: '/slide', reaction: '/reaction',
  words: '/words', blackjack: '/blackjack', poker: '/poker',
  solitaire: '/solitaire', hearts: '/hearts', chess: '/chess',
  checkers: '/checkers', sudoku: '/sudoku', connect4: '/connect4',
  battleship: '/battleship', runner: '/runner', bubbles: '/bubbles',
  dots: '/dots', craps: '/craps', type: '/type', pixel: '/pixel',
  spider: '/spider', cribbage: '/cribbage', slither: '/slither',
  backgammon: '/backgammon', go: '/go'
};
const GAME_NAMES = {
  stack: 'STACK', snake: 'SNAKE', blocks: 'BLOCKS', p2048: '2048',
  breakout: 'BREAKOUT', pong: 'PONG', memory: 'MEMORY',
  minesweeper: 'MINES', flap: 'FLAP', invaders: 'INVADERS',
  asteroids: 'ASTEROIDS', simon: 'SIMON', tictactoe: 'TIC TAC TOE',
  lightsout: 'LIGHTS OUT', slide: 'SLIDE', reaction: 'REACTION',
  words: 'WORDS', blackjack: 'BLACKJACK', poker: 'POKER',
  solitaire: 'SOLITAIRE', hearts: 'HEARTS', chess: 'CHESS',
  checkers: 'CHECKERS', sudoku: 'SUDOKU', connect4: 'CONNECT 4',
  battleship: 'BATTLESHIP', runner: 'RUNNER', bubbles: 'BUBBLES',
  dots: 'DOTS & BOXES', craps: 'CRAPS', type: 'TYPE RACE',
  pixel: 'PIXEL', spider: 'SPIDER', cribbage: 'CRIBBAGE',
  slither: 'SLITHER', backgammon: 'BACKGAMMON', go: 'GO'
};
const GAME_CATEGORIES = {
  stack: 'arcade', snake: 'arcade', blocks: 'arcade', p2048: 'arcade',
  breakout: 'arcade', pong: 'arcade', flap: 'arcade', invaders: 'arcade',
  asteroids: 'arcade', bubbles: 'arcade', runner: 'arcade', slither: 'arcade',
  memory: 'puzzle', minesweeper: 'puzzle', slide: 'puzzle',
  lightsout: 'puzzle', words: 'puzzle', sudoku: 'puzzle', dots: 'puzzle',
  pixel: 'puzzle',
  tictactoe: 'board', chess: 'board', checkers: 'board',
  connect4: 'board', battleship: 'board', go: 'board', backgammon: 'board',
  blackjack: 'cards', poker: 'cards', solitaire: 'cards', hearts: 'cards',
  cribbage: 'cards', spider: 'cards',
  craps: 'casino',
  simon: 'mind', reaction: 'mind',
  type: 'skill'
};

// ============== STORAGE ==============
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
  getJSON(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      if (v == null) return fallback;
      return JSON.parse(v);
    } catch { return fallback; }
  },
  setJSON(k, obj) {
    try { localStorage.setItem(k, JSON.stringify(obj)); return true; } catch { return false; }
  }
};

// ============== SCORES + STATS ==============
function bestScore(key, current) {
  const k = 'gai_best_' + key;
  const prev = +(storage.get(k) || 0);
  if (current != null && current > prev) {
    storage.set(k, String(current));
    return current;
  }
  return prev;
}

function bestKV(key, candidate, isBetter) {
  const k = 'gai_kv_' + key;
  const prev = storage.getJSON(k, null);
  if (candidate != null && (prev == null || isBetter(candidate, prev))) {
    storage.setJSON(k, candidate);
    return candidate;
  }
  return prev;
}

function recordPlay(gameKey) {
  // per-game count
  const gK = 'gai_plays_' + gameKey;
  storage.set(gK, String((+(storage.get(gK) || 0)) + 1));
  // total
  const tK = 'gai_plays_total';
  storage.set(tK, String((+(storage.get(tK) || 0)) + 1));
  // recently played
  let recent = storage.getJSON('gai_recent', []);
  if (!Array.isArray(recent)) recent = [];
  recent = recent.filter(r => r && r.key !== gameKey);
  recent.unshift({ key: gameKey, ts: Date.now() });
  recent = recent.slice(0, 5);
  storage.setJSON('gai_recent', recent);
  // streak
  const today = todayUTC();
  const st = storage.getJSON('gai_streak_global', { current: 0, max: 0, lastPlayDate: null });
  if (st.lastPlayDate !== today) {
    if (st.lastPlayDate && isYesterday(st.lastPlayDate, today)) {
      st.current = (st.current || 0) + 1;
    } else {
      st.current = 1;
    }
    if (st.current > (st.max || 0)) st.max = st.current;
    st.lastPlayDate = today;
    storage.setJSON('gai_streak_global', st);
  }
}

function isYesterday(prev, today) {
  const p = parseInt(prev, 10), t = parseInt(today, 10);
  if (!isFinite(p) || !isFinite(t)) return false;
  const py = Math.floor(p/10000), pm = Math.floor((p%10000)/100), pd = p%100;
  const ty = Math.floor(t/10000), tm = Math.floor((t%10000)/100), td = t%100;
  const pDate = Date.UTC(py, pm-1, pd);
  const tDate = Date.UTC(ty, tm-1, td);
  return tDate - pDate === 86400000;
}

const streak = {
  get() {
    const st = storage.getJSON('gai_streak_global', { current: 0, max: 0, lastPlayDate: null });
    // decay: if today is more than 1 day past lastPlayDate, current is 0 (not yet incremented)
    const today = todayUTC();
    if (st.lastPlayDate && st.lastPlayDate !== today) {
      if (!isYesterday(st.lastPlayDate, today)) {
        return { current: 0, max: st.max || 0, lastPlayDate: st.lastPlayDate };
      }
    }
    return st;
  }
};

function totalPlays() { return +(storage.get('gai_plays_total') || 0); }
function gamePlays(key) { return +(storage.get('gai_plays_' + key) || 0); }

// ============== RNG ==============
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayUTC() {
  const d = new Date();
  return d.getUTCFullYear().toString().padStart(4,'0') +
         (d.getUTCMonth()+1).toString().padStart(2,'0') +
         d.getUTCDate().toString().padStart(2,'0');
}

function dailySeed(salt) {
  const t = parseInt(todayUTC(), 10);
  let h = (t >>> 0) ^ 0x9e3779b1;
  if (salt) {
    for (let i = 0; i < salt.length; i++) {
      h = Math.imul(h ^ salt.charCodeAt(i), 16777619) >>> 0;
    }
  }
  return h >>> 0;
}

// ============== AUDIO ==============
let audioCtx = null;
let masterGain = null;
let muted = storage.get('gai_muted') === '1';
let padNode = null;

function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 0.55;
    masterGain.connect(audioCtx.destination);
  } catch {}
  return audioCtx;
}

function tone(freq, dur, type, gain, attack, release) {
  if (muted) return;
  if (!audioCtx) ensureAudio();
  if (!audioCtx) return;
  type = type || 'sine';
  gain = gain == null ? 0.18 : gain;
  attack = attack == null ? 0.005 : attack;
  release = release == null ? 0.06 : release;
  dur = dur == null ? 0.1 : dur;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur + release);
  o.connect(g).connect(masterGain);
  o.onended = () => { try { o.disconnect(); g.disconnect(); } catch {} };
  o.start(t);
  o.stop(t + attack + dur + release + 0.02);
}

function arpeggio(freqs, step, type, gain) {
  step = step == null ? 70 : step;
  freqs.forEach((f, i) => setTimeout(() => tone(f, 0.1, type || 'triangle', gain == null ? 0.18 : gain, 0.005, 0.2), i * step));
}

function noiseBurst(dur, gain) {
  if (muted) return;
  if (!audioCtx) ensureAudio();
  if (!audioCtx) return;
  dur = dur || 0.1;
  gain = gain || 0.1;
  const t = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const g = audioCtx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(masterGain);
  src.onended = () => { try { src.disconnect(); g.disconnect(); } catch {} };
  src.start(t);
}

function startPad(freq, gain) {
  if (muted) return;
  stopPad();
  if (!audioCtx) ensureAudio();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 800;
  f.Q.value = 4;
  o.type = 'sawtooth';
  o.frequency.value = freq || 130.81;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain || 0.05, t + 0.6);
  o.connect(f).connect(g).connect(masterGain);
  o.start(t);
  padNode = { o, g, f };
}
function stopPad() {
  if (!padNode || !audioCtx) return;
  const t = audioCtx.currentTime;
  try {
    padNode.g.gain.cancelScheduledValues(t);
    padNode.g.gain.setValueAtTime(padNode.g.gain.value, t);
    padNode.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    padNode.o.stop(t + 0.45);
    const n = padNode;
    n.o.onended = () => { try { n.o.disconnect(); n.g.disconnect(); n.f.disconnect(); } catch {} };
  } catch {}
  padNode = null;
}

function setMuted(v) {
  muted = !!v;
  storage.set('gai_muted', muted ? '1' : '0');
  if (masterGain && audioCtx) {
    try {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.55, audioCtx.currentTime, 0.01);
    } catch {}
  }
}
function isMuted() { return muted; }

// ============== CANVAS ==============
function fit(canvas, opts) {
  opts = opts || {};
  const dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2);
  const aspect = opts.aspect;
  const maxW = opts.maxW || Infinity;
  const maxH = opts.maxH || Infinity;
  const parent = canvas.parentElement;
  const availW = Math.min(parent ? parent.clientWidth : window.innerWidth, maxW, window.innerWidth);
  const availH = Math.min(parent ? parent.clientHeight : window.innerHeight, maxH, window.innerHeight);
  let cssW, cssH;
  if (aspect) {
    if (availW / availH > aspect) {
      cssH = availH; cssW = cssH * aspect;
    } else {
      cssW = availW; cssH = cssW / aspect;
    }
  } else {
    cssW = availW; cssH = availH;
  }
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (opts.pixelated) {
    canvas.style.imageRendering = 'pixelated';
    ctx.imageSmoothingEnabled = false;
  }
  return { ctx, w: cssW, h: cssH, dpr };
}

// ============== INPUT ==============
function tap(el, handler, opts) {
  opts = opts || {};
  const debounce = opts.debounce == null ? 100 : opts.debounce;
  let last = 0;
  const fire = (e) => {
    const now = performance.now();
    if (now - last < debounce) return;
    last = now;
    handler(e);
  };
  const onClick = (e) => fire(e);
  const onTouch = (e) => {
    if (opts.preventDefault !== false) {
      try { e.preventDefault(); } catch {}
    }
    fire(e);
  };
  const onKey = (e) => {
    if (!opts.keys) return;
    if (opts.keys.indexOf(e.key) === -1 && opts.keys.indexOf(e.code) === -1) return;
    fire(e);
  };
  el.addEventListener('click', onClick);
  el.addEventListener('touchstart', onTouch, { passive: opts.preventDefault === false });
  if (opts.keys) document.addEventListener('keydown', onKey);
  return () => {
    el.removeEventListener('click', onClick);
    el.removeEventListener('touchstart', onTouch);
    if (opts.keys) document.removeEventListener('keydown', onKey);
  };
}

function swipe(el, handler, opts) {
  opts = opts || {};
  const min = opts.threshold || 24;
  let sx = 0, sy = 0, st = 0, active = false;
  const onStart = (e) => {
    const t = e.touches ? e.touches[0] : e;
    sx = t.clientX; sy = t.clientY; st = performance.now(); active = true;
  };
  const onEnd = (e) => {
    if (!active) return; active = false;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const dx = t.clientX - sx, dy = t.clientY - sy;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx < min && ady < min) return;
    let dir;
    if (adx > ady) dir = dx > 0 ? 'right' : 'left';
    else dir = dy > 0 ? 'down' : 'up';
    handler({ dir, dx, dy, dt: performance.now() - st, ev: e });
  };
  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchend', onEnd, { passive: true });
  el.addEventListener('mousedown', onStart);
  el.addEventListener('mouseup', onEnd);
  return () => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchend', onEnd);
    el.removeEventListener('mousedown', onStart);
    el.removeEventListener('mouseup', onEnd);
  };
}

function keys(map) {
  const onDown = (e) => {
    const fn = map[e.key] || map[e.code];
    if (fn) { fn(e); }
  };
  document.addEventListener('keydown', onDown);
  window.addEventListener('pagehide', () => document.removeEventListener('keydown', onDown), { once: true });
  return () => document.removeEventListener('keydown', onDown);
}

// ============== CHROM HTML ==============
function chromHTML(text) {
  // text-only, safe
  const s = String(text).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  return `<span class="chrom">${s}</span>`;
}

// ============== HAPTIC ==============
function haptic(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

// ============== TRANSITION ==============
function glitchTo(url) {
  // graceful fallback if reduced motion
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { window.location.href = url; return; }
  const ov = document.createElement('div');
  ov.className = 'page-glitch';
  document.body.appendChild(ov);
  // play a tiny whoosh
  try { tone(220, 0.08, 'sawtooth', 0.08, 0.005, 0.12); } catch {}
  setTimeout(() => { window.location.href = url; }, 200);
}

// ============== SHELL ==============
function shellInit(opts) {
  opts = opts || {};
  const key = opts.key || (window.GAME_KEY || '');
  const name = opts.name || GAME_NAMES[key] || key.toUpperCase();
  if (name) document.title = name + ' · GETABOUTIT';

  // back
  if (!document.querySelector('.shell-back')) {
    const back = document.createElement('a');
    back.href = '/';
    back.className = 'shell-btn shell-back';
    back.setAttribute('aria-label', 'Back to arcade');
    back.innerHTML = '← ARCADE';
    back.addEventListener('click', (e) => {
      e.preventDefault();
      glitchTo('/');
    });
    document.body.appendChild(back);
  }

  // mute
  if (!document.querySelector('.shell-mute')) {
    const mute = document.createElement('button');
    mute.type = 'button';
    mute.className = 'shell-btn shell-mute';
    mute.setAttribute('aria-label', 'Toggle sound');
    mute.textContent = muted ? '🔇' : '🔊';
    mute.addEventListener('click', (e) => {
      e.stopPropagation();
      ensureAudio();
      setMuted(!muted);
      mute.textContent = muted ? '🔇' : '🔊';
    });
    document.body.appendChild(mute);
  }

  // overlays
  if (!document.getElementById('scanlines')) {
    const s = document.createElement('div');
    s.id = 'scanlines';
    s.setAttribute('aria-hidden','true');
    document.body.appendChild(s);
  }
  if (!document.getElementById('vignette')) {
    const v = document.createElement('div');
    v.id = 'vignette';
    v.setAttribute('aria-hidden','true');
    document.body.appendChild(v);
  }

  // rainbow mode
  if (storage.get('gai_rainbow_unlocked') === '1') {
    document.body.classList.add('rainbow');
  }

  if (key) recordPlay(key);

  // audio resume on visibility
  document.addEventListener('visibilitychange', () => {
    if (!audioCtx) return;
    if (document.hidden) { try { audioCtx.suspend(); } catch {} }
    else { try { audioCtx.resume(); } catch {} }
  });
}

// ============== UTILITIES ==============
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ra = (pa >> 16) & 0xff, ga = (pa >> 8) & 0xff, ba = pa & 0xff;
  const rb = (pb >> 16) & 0xff, gb = (pb >> 8) & 0xff, bb = pb & 0xff;
  return `rgb(${Math.round(ra+(rb-ra)*t)},${Math.round(ga+(gb-ga)*t)},${Math.round(ba+(bb-ba)*t)})`;
}
function shade(hex, mult) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r*mult)},${Math.round(g*mult)},${Math.round(b*mult)})`;
}
function smoothstep(a, b, t) {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// ============== CLEANUP ==============
// Auto-removes registered listeners and cancels rAFs on pagehide.
const _cleanup_listeners = [];
const _cleanup_rafs = [];
function cleanup_on(target, event, fn, opts) {
  target.addEventListener(event, fn, opts);
  _cleanup_listeners.push([target, event, fn, opts]);
  return () => {
    try { target.removeEventListener(event, fn, opts); } catch {}
    const i = _cleanup_listeners.findIndex(e => e[0] === target && e[1] === event && e[2] === fn);
    if (i >= 0) _cleanup_listeners.splice(i, 1);
  };
}
function cleanup_raf(callback) {
  let id = 0, stopped = false;
  const wrap = (t) => { if (stopped) return; callback(t); id = requestAnimationFrame(wrap); };
  id = requestAnimationFrame(wrap);
  const rec = { stop() { stopped = true; if (id) cancelAnimationFrame(id); } };
  _cleanup_rafs.push(rec);
  return rec;
}
function cleanup_dispose() {
  for (const [t, ev, fn, opts] of _cleanup_listeners.splice(0)) {
    try { t.removeEventListener(ev, fn, opts); } catch {}
  }
  for (const r of _cleanup_rafs.splice(0)) { try { r.stop(); } catch {} }
}
window.addEventListener('pagehide', cleanup_dispose);

// ============== FX ==============
function fxScreenShake(el, intensity, durationMs) {
  if (reducedMotion) return;
  intensity = intensity == null ? 4 : intensity;
  durationMs = durationMs || 220;
  const start = performance.now();
  const orig = el.style.transform || '';
  function step() {
    const t = (performance.now() - start) / durationMs;
    if (t >= 1) { el.style.transform = orig; return; }
    const fall = 1 - t;
    const dx = (Math.random() * 2 - 1) * intensity * fall;
    const dy = (Math.random() * 2 - 1) * intensity * fall;
    el.style.transform = orig + ' translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    requestAnimationFrame(step);
  }
  step();
}

function fxParticleBurst(ctx, x, y, color, count, opts) {
  opts = opts || {};
  const parts = [];
  count = count || 18;
  const speed = opts.speed || 140;
  const grav = opts.gravity == null ? 240 : opts.gravity;
  const lifeMs = opts.life || 700;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    parts.push({
      x: x, y: y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      r: (opts.size || 3) + Math.random() * 1.5,
      color: Array.isArray(color) ? color[(Math.random()*color.length)|0] : color,
      born: performance.now(), life: lifeMs
    });
  }
  let last = performance.now();
  let raf = 0;
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    let alive = 0;
    for (const p of parts) {
      const age = now - p.born;
      if (age > p.life) continue;
      alive++;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += grav * dt;
      const a = 1 - age / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.r/2, p.y - p.r/2, p.r, p.r);
    }
    ctx.globalAlpha = 1;
    if (alive > 0) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return { stop() { if (raf) cancelAnimationFrame(raf); } };
}

function fxChromaticFlash(durationMs, color) {
  if (reducedMotion) return;
  durationMs = durationMs || 220;
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9000;pointer-events:none;mix-blend-mode:screen;background:' + (color || 'linear-gradient(90deg,rgba(255,0,110,0.35),rgba(0,245,255,0.35))') + ';opacity:0;transition:opacity ' + (durationMs/2) + 'ms ease-out;';
  document.body.appendChild(ov);
  requestAnimationFrame(() => {
    ov.style.opacity = '1';
    setTimeout(() => {
      ov.style.opacity = '0';
      setTimeout(() => { try { ov.remove(); } catch {} }, durationMs/2 + 50);
    }, durationMs/2);
  });
}

function fxConfetti(opts) {
  opts = opts || {};
  if (reducedMotion) return { stop() {} };
  const colors = opts.colors || PALETTE;
  const count = opts.count || 60;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:8500;pointer-events:none;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const parts = [];
  for (let i = 0; i < count; i++) {
    parts.push({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 60,
      vy: 80 + Math.random() * 120,
      r: 4 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 4,
      color: colors[(Math.random() * colors.length) | 0]
    });
  }
  let last = performance.now();
  let raf = 0;
  let stopped = false;
  function tick(now) {
    if (stopped) { try { canvas.remove(); } catch {} return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of parts) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y < canvas.height + 20) alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      ctx.restore();
    }
    if (alive > 0) raf = requestAnimationFrame(tick);
    else { try { canvas.remove(); } catch {} }
  }
  raf = requestAnimationFrame(tick);
  return { stop() { stopped = true; if (raf) cancelAnimationFrame(raf); try { canvas.remove(); } catch {} } };
}

function fxOutrunBg(ctx, w, h, time) {
  const g = ctx.createRadialGradient(w / 2, h * 0.65, 50, w / 2, h * 0.65, Math.max(w, h));
  g.addColorStop(0, '#1a0635');
  g.addColorStop(0.55, '#0a0a1e');
  g.addColorStop(1, '#05050f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const sunY = h * 0.65;
  const sunR = Math.min(w, h) * 0.45;
  const sg = ctx.createRadialGradient(w/2, sunY, 8, w/2, sunY, sunR);
  sg.addColorStop(0, 'rgba(255,214,10,0.55)');
  sg.addColorStop(0.4, 'rgba(255,149,0,0.30)');
  sg.addColorStop(0.8, 'rgba(255,0,110,0.10)');
  sg.addColorStop(1, 'rgba(255,0,110,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(w/2, sunY, sunR, 0, Math.PI*2); ctx.fill();
  // grid
  const offset = (time * 0.5) % 32;
  ctx.strokeStyle = 'rgba(255,0,110,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const t = (i * 32 + offset) / (32 * 14);
    const y = sunY + Math.pow(t, 1.8) * (h - sunY);
    ctx.globalAlpha = (1 - t) * 0.7;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = -8; i <= 8; i++) {
    const xB = w / 2 + i * (w / 7);
    ctx.beginPath(); ctx.moveTo(xB, h); ctx.lineTo(w / 2, sunY); ctx.stroke();
  }
  const lg = ctx.createLinearGradient(0, sunY - 1, 0, sunY + 1);
  lg.addColorStop(0, '#ffd60a'); lg.addColorStop(1, '#ff006e');
  ctx.fillStyle = lg;
  ctx.fillRect(0, sunY - 1, w, 2);
}

// ============== UI ==============
function uiSplash(opts) {
  opts = opts || {};
  const root = document.createElement('div');
  root.className = 'screen';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Start screen');
  root.innerHTML =
    '<h1 class="wordmark chrom"><span>' + (opts.title || 'PLAY') + '</span></h1>' +
    (opts.sub ? '<p class="sub">' + opts.sub + '</p>' : '') +
    '<p class="tap pulse">' + (opts.tap || '▶ TAP TO PLAY') + '</p>';
  return {
    el: root,
    mount(parent) { (parent || document.body).appendChild(root); return root; },
    show() { root.classList.remove('hidden'); },
    hide() { root.classList.add('hidden'); }
  };
}

function uiGameOver(opts) {
  opts = opts || {};
  const root = document.createElement('div');
  root.className = 'screen hidden';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Game over');
  const scoreHTML = opts.score != null
    ? '<div class="score"><span class="chrom"><span class="js-final">' + opts.score + '</span></span></div>'
    : '';
  const bestHTML = opts.best != null
    ? '<p class="stats">BEST <b class="js-best">' + opts.best + '</b>' + (opts.unit ? ' ' + opts.unit : '') + '</p>'
    : '';
  root.innerHTML =
    '<h2 class="big chrom"><span>' + (opts.label || 'GAME OVER') + '</span></h2>' +
    scoreHTML + bestHTML +
    '<p class="tap pulse">▶ TAP TO RETRY</p>';
  return {
    el: root,
    mount(parent) { (parent || document.body).appendChild(root); return root; },
    show(payload) {
      if (payload && payload.score != null) {
        const f = root.querySelector('.js-final'); if (f) f.textContent = payload.score;
      }
      if (payload && payload.best != null) {
        const b = root.querySelector('.js-best'); if (b) b.textContent = payload.best;
      }
      root.classList.remove('hidden');
    },
    hide() { root.classList.add('hidden'); }
  };
}

function uiToast(message, durationMs) {
  const t = document.createElement('div');
  t.className = 'gai-toast';
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    t.classList.add('out');
    setTimeout(() => { try { t.remove(); } catch {} }, 400);
  }, durationMs || 2200);
}

function uiCountdown(seconds, onTick, onDone) {
  let n = seconds;
  onTick && onTick(n);
  const id = setInterval(() => {
    n--;
    if (n <= 0) { clearInterval(id); onDone && onDone(); }
    else onTick && onTick(n);
  }, 1000);
  return () => clearInterval(id);
}

// ============== CARDS ==============
const CARD_SUITS = ['♠','♥','♦','♣'];
const CARD_RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function cardsNewDeck(seedRng) {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ r: CARD_RANKS[r], s: CARD_SUITS[s], ri: r, si: s });
  return cardsShuffle(d, seedRng);
}
function cardsShuffle(arr, seedRng) {
  const a = arr.slice();
  const r = seedRng || Math.random;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function cardsRankValue(card, aceHigh) {
  if (card.ri === 0) return aceHigh ? 14 : 1;
  if (card.ri >= 10) return card.ri + 1; // J=11, Q=12, K=13
  return card.ri + 1;
}
function cardsIsRed(card) { return card.si === 1 || card.si === 2; }
function cardsHandValue(cards) {
  // Blackjack value: aces 1/11, picture cards 10
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.ri === 0) { aces++; total += 11; }
    else if (c.ri >= 9) total += 10;
    else total += c.ri + 1;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function cardsEvalPoker(hand) {
  // hand of 5; returns { rank, name, score }
  // ranks: 9 royal, 8 sflush, 7 four, 6 fhouse, 5 flush, 4 straight, 3 three, 2 twopair, 1 pair, 0 nothing
  const ranks = hand.map(c => c.ri + 1).sort((a,b) => a - b); // 1..13
  const suits = hand.map(c => c.si);
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const cVals = Object.values(counts).sort((a,b) => b - a);
  const flush = suits.every(s => s === suits[0]);
  // straight: 5 consecutive, or A-2-3-4-5 ([1,2,3,4,5]) or A-T-J-Q-K (treat A as 14)
  let straight = false;
  const u = [...new Set(ranks)].sort((a,b) => a - b);
  if (u.length === 5 && u[4] - u[0] === 4) straight = true;
  if (u.length === 5 && u[0] === 1 && u[1] === 10 && u[2] === 11 && u[3] === 12 && u[4] === 13) straight = true;
  if (straight && flush && u[0] === 1 && u[1] === 10) return { rank: 9, name: 'ROYAL FLUSH' };
  if (straight && flush) return { rank: 8, name: 'STRAIGHT FLUSH' };
  if (cVals[0] === 4) return { rank: 7, name: 'FOUR OF A KIND' };
  if (cVals[0] === 3 && cVals[1] === 2) return { rank: 6, name: 'FULL HOUSE' };
  if (flush) return { rank: 5, name: 'FLUSH' };
  if (straight) return { rank: 4, name: 'STRAIGHT' };
  if (cVals[0] === 3) return { rank: 3, name: 'THREE OF A KIND' };
  if (cVals[0] === 2 && cVals[1] === 2) return { rank: 2, name: 'TWO PAIR' };
  if (cVals[0] === 2) {
    // jacks or better
    const pairRank = +Object.keys(counts).find(k => counts[k] === 2);
    if (pairRank === 1 || pairRank >= 11) return { rank: 1, name: 'JACKS OR BETTER' };
    return { rank: 0, name: 'NOTHING' };
  }
  return { rank: 0, name: 'NOTHING' };
}
function cardsDraw(ctx, x, y, w, h, card, opts) {
  opts = opts || {};
  const r = Math.max(4, Math.min(w, h) * 0.07);
  ctx.save();
  // shadow
  if (!opts.dimmed) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
  }
  // back
  if (opts.faceDown) {
    cardsDrawBack(ctx, x, y, w, h);
    ctx.restore();
    return;
  }
  // face
  ctx.fillStyle = opts.dimmed ? '#cfcfd5' : '#ffffff';
  roundRect(ctx, x, y, w, h, r); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = opts.glow ? '#00f5ff' : 'rgba(10,10,30,0.5)';
  roundRect(ctx, x, y, w, h, r); ctx.stroke();
  if (opts.glow) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,245,255,0.45)';
    roundRect(ctx, x - 2, y - 2, w + 4, h + 4, r + 2); ctx.stroke();
    ctx.restore();
  }
  // rank + suit colors
  const red = cardsIsRed(card);
  const colorMain = red ? '#ef233c' : '#1a1a30';
  ctx.fillStyle = colorMain;
  const fs = Math.max(8, Math.round(w * 0.22));
  ctx.font = 'bold ' + fs + 'px "Press Start 2P", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(card.r, x + w * 0.10, y + h * 0.08);
  ctx.font = 'bold ' + Math.round(fs * 0.85) + 'px "Press Start 2P", monospace';
  ctx.fillText(card.s, x + w * 0.10, y + h * 0.28);
  // big suit center
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const big = Math.max(14, Math.round(w * 0.45));
  ctx.font = 'bold ' + big + 'px "Press Start 2P", monospace';
  ctx.fillText(card.s, x + w/2, y + h/2);
  // rank bottom-right inverted
  ctx.save();
  ctx.translate(x + w - w * 0.10, y + h - h * 0.08);
  ctx.rotate(Math.PI);
  ctx.font = 'bold ' + fs + 'px "Press Start 2P", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(card.r, 0, 0);
  ctx.font = 'bold ' + Math.round(fs * 0.85) + 'px "Press Start 2P", monospace';
  ctx.fillText(card.s, 0, fs * 1.1);
  ctx.restore();
  ctx.restore();
}
function cardsDrawBack(ctx, x, y, w, h) {
  const r = Math.max(4, Math.min(w, h) * 0.07);
  ctx.save();
  ctx.fillStyle = '#3a0ca3';
  roundRect(ctx, x, y, w, h, r); ctx.fill();
  // chromatic split letters
  ctx.fillStyle = '#ff006e'; ctx.font = 'bold ' + Math.round(w * 0.18) + 'px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const labels = ['G','A','I'];
  for (let i = 0; i < labels.length; i++) {
    const cy = y + h * (0.25 + i * 0.25);
    ctx.fillStyle = '#ff006e'; ctx.fillText(labels[i], x + w/2 + 1.5, cy);
    ctx.fillStyle = '#00f5ff'; ctx.fillText(labels[i], x + w/2 - 1.5, cy);
    ctx.fillStyle = '#ffffff'; ctx.fillText(labels[i], x + w/2, cy);
  }
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, r - 1); ctx.stroke();
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ============== AI (generic minimax) ==============
function aiMinimax(state, depth, alpha, beta, isMax, opts) {
  const term = opts.terminal(state, depth);
  if (term !== undefined) return { score: term };
  const moves = opts.moves(state, isMax);
  if (moves.length === 0) return { score: opts.eval(state) };
  if (opts.order) moves.sort(opts.order(state, isMax));
  let bestMove = null;
  if (isMax) {
    let best = -Infinity;
    for (const m of moves) {
      const ns = opts.apply(state, m);
      const r = aiMinimax(ns, depth - 1, alpha, beta, false, opts);
      if (r.score > best) { best = r.score; bestMove = m; }
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  } else {
    let best = Infinity;
    for (const m of moves) {
      const ns = opts.apply(state, m);
      const r = aiMinimax(ns, depth - 1, alpha, beta, true, opts);
      if (r.score < best) { best = r.score; bestMove = m; }
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  }
}

// ============== ACHIEVEMENTS ==============
const ACHIEVEMENT_LIST = [
  { id: 'first_win', label: 'FIRST WIN', desc: 'win or complete any game' },
  { id: 'streak_3', label: 'STREAK STARTER', desc: 'play 3 days in a row' },
  { id: 'streak_30', label: 'STREAK MASTER', desc: 'play 30 days in a row' },
  { id: 'completionist', label: 'COMPLETIONIST', desc: 'play every game at least once' },
  { id: 'cards_shark', label: 'CARDS SHARK', desc: 'win at all four card games' },
  { id: 'board_general', label: 'BOARD GENERAL', desc: 'win at all five board games' },
  { id: 'royal_flush', label: 'ROYAL FLUSH', desc: 'hit a royal in poker' },
  { id: 'grandmaster', label: 'GRANDMASTER', desc: 'beat chess on hard' },
  { id: 'taps_100k', label: 'MILLION TAPS', desc: '100,000 plays across all games' }
];
function achievementsHas(id) {
  const list = storage.getJSON('gai_achievements', []);
  return Array.isArray(list) && list.indexOf(id) !== -1;
}
function achievementsUnlock(id) {
  if (achievementsHas(id)) return false;
  const list = storage.getJSON('gai_achievements', []);
  if (!Array.isArray(list)) return false;
  list.push(id);
  storage.setJSON('gai_achievements', list);
  const a = ACHIEVEMENT_LIST.find(x => x.id === id);
  if (a) uiToast('✦ ' + a.label, 2400);
  return true;
}
function achievementsUnlocked() {
  const list = storage.getJSON('gai_achievements', []);
  return Array.isArray(list) ? list : [];
}
function achievementsCheck() {
  // Streak achievements
  const st = streak.get();
  if (st.current >= 3) achievementsUnlock('streak_3');
  if (st.current >= 30) achievementsUnlock('streak_30');
  // Completionist
  let played = 0;
  for (const k of GAME_KEYS) if (gamePlays(k) > 0) played++;
  if (played === GAME_KEYS.length) achievementsUnlock('completionist');
  // Taps
  if (totalPlays() >= 100000) achievementsUnlock('taps_100k');
  // Card games & board games
  const winList = storage.getJSON('gai_wins', {});
  const cardKeys = ['blackjack','poker','solitaire','hearts'];
  const boardKeys = ['tictactoe','chess','checkers','connect4','battleship'];
  if (cardKeys.every(k => winList[k])) achievementsUnlock('cards_shark');
  if (boardKeys.every(k => winList[k])) achievementsUnlock('board_general');
}
function recordWin(key) {
  const w = storage.getJSON('gai_wins', {});
  w[key] = (w[key] || 0) + 1;
  storage.setJSON('gai_wins', w);
  achievementsUnlock('first_win');
  achievementsCheck();
}

// ============== THEME ==============
const THEMES = ['default', 'deepnight', 'highcontrast'];
function themeGet() {
  const t = storage.get('gai_theme');
  return THEMES.indexOf(t) >= 0 ? t : 'default';
}
function themeSet(t) {
  if (THEMES.indexOf(t) === -1) return;
  storage.set('gai_theme', t);
  applyTheme(t);
}
function themeCycle() {
  const cur = themeGet();
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  themeSet(next);
  return next;
}
function applyTheme(t) {
  // body may not be parsed yet if core.js loads in <head> without defer.
  // Self-defer until DOMContentLoaded — applyTheme runs at module load AND
  // again whenever themeSet() is called from user-triggered code.
  const body = document.body;
  if (!body || !body.classList) {
    document.addEventListener('DOMContentLoaded', () => applyTheme(t), { once: true });
    return;
  }
  body.classList.remove('theme-deepnight', 'theme-highcontrast');
  if (t === 'deepnight') body.classList.add('theme-deepnight');
  if (t === 'highcontrast') body.classList.add('theme-highcontrast');
}
applyTheme(themeGet());

// ============== DEVICE-AWARE PROMPTS ==============
// Splashes render "TAP TO PLAY" / "TAP TO RETRY". On a desktop with
// a fine pointer the real input is the spacebar — patch the text and
// bind the keyboard equivalent. Mobile pages are left alone.
function inputMode() {
  if (!window.matchMedia) return 'tap';
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches ? 'tap' : 'press';
}
const PROMPT_REPLACEMENTS = [
  [/TAP TO PLAY/g,    'PRESS SPACE TO PLAY'],
  [/TAP TO RETRY/g,   'PRESS SPACE TO RETRY'],
  [/TAP TO START/g,   'PRESS SPACE TO START'],
  [/TAP TO REMATCH/g, 'PRESS SPACE TO REMATCH'],
  [/TAP TO RESTART/g, 'PRESS SPACE TO RESTART'],
  [/TAP TO RESUME/g,  'PRESS SPACE TO RESUME'],
  [/TAP TO DROP/g,    'PRESS SPACE TO DROP']
];
function _patchTextNode(node) {
  if (!node || !node.nodeValue) return;
  let v = node.nodeValue;
  for (const [re, sub] of PROMPT_REPLACEMENTS) v = v.replace(re, sub);
  if (v !== node.nodeValue) node.nodeValue = v;
}
function _walkAndPatch(root) {
  if (!root || !document.createTreeWalker) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) _patchTextNode(n);
}
let _promptObserver = null;
function patchScreenPrompts() {
  if (inputMode() === 'tap') return;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', patchScreenPrompts, { once: true });
    return;
  }
  _walkAndPatch(document.body);
  if (_promptObserver) return;
  _promptObserver = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') _patchTextNode(m.target);
      else for (const node of m.addedNodes) {
        if (node.nodeType === 1) _walkAndPatch(node);
        else if (node.nodeType === 3) _patchTextNode(node);
      }
    }
  });
  _promptObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}
patchScreenPrompts();

// Space / Enter while a splash is visible acts as a click on that splash.
// Returns early when no splash/over screen is visible, so per-game keyboard
// handlers (snake's arrows, blocks' rotate, etc.) keep their bindings during
// actual gameplay.
function _splashKeydown(e) {
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' ||
            a.tagName === 'BUTTON' || a.isContentEditable)) return;
  const target = document.querySelector(
    '#splash:not(.hidden), #over:not(.hidden), #gameover:not(.hidden)'
  );
  if (!target) return;
  e.preventDefault();
  target.click();
}
if (typeof document !== 'undefined') document.addEventListener('keydown', _splashKeydown);

// ============== EXPORT / IMPORT ==============
function exportDump() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('gai_') === 0) data[k] = localStorage.getItem(k);
    }
  } catch {}
  return JSON.stringify({ v: 1, ts: Date.now(), data }, null, 2);
}
function exportLoad(json) {
  try {
    const o = typeof json === 'string' ? JSON.parse(json) : json;
    if (!o || !o.data) return false;
    for (const k of Object.keys(o.data)) {
      if (k.indexOf('gai_') === 0) storage.set(k, o.data[k]);
    }
    return true;
  } catch { return false; }
}

// ============== DICE (Phase 3) ==============
function diceRoll(count, sides) {
  count = count || 1; sides = sides || 6;
  const out = [];
  for (let i = 0; i < count; i++) out.push(1 + Math.floor(Math.random() * sides));
  return out;
}
function diceDrawDie(ctx, x, y, size, value, opts) {
  opts = opts || {};
  const r = size * 0.16;
  ctx.save();
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = size * 0.25; }
  ctx.fillStyle = opts.fill || '#ffffff';
  roundRect(ctx, x, y, size, size, r); ctx.fill();
  if (opts.glow) { ctx.shadowBlur = 0; }
  ctx.lineWidth = Math.max(1, size * 0.04);
  // chromatic edge (1px pink right, 1px cyan left)
  ctx.strokeStyle = '#ff006e';
  roundRect(ctx, x + 1, y, size, size, r); ctx.stroke();
  ctx.strokeStyle = '#00f5ff';
  roundRect(ctx, x - 1, y, size, size, r); ctx.stroke();
  ctx.strokeStyle = opts.stroke || 'rgba(10,10,30,0.6)';
  roundRect(ctx, x, y, size, size, r); ctx.stroke();
  // pips
  const pipColor = opts.pipColor || '#1a0635';
  ctx.fillStyle = pipColor;
  const p = size * 0.18, m = size * 0.25;
  const positions = {
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25],[0.75, 0.75]],
    3: [[0.25, 0.25],[0.5, 0.5],[0.75, 0.75]],
    4: [[0.25, 0.25],[0.75, 0.25],[0.25, 0.75],[0.75, 0.75]],
    5: [[0.25, 0.25],[0.75, 0.25],[0.5, 0.5],[0.25, 0.75],[0.75, 0.75]],
    6: [[0.25, 0.25],[0.75, 0.25],[0.25, 0.5],[0.75, 0.5],[0.25, 0.75],[0.75, 0.75]]
  };
  const pips = positions[value] || [];
  for (const [px, py] of pips) {
    ctx.beginPath();
    ctx.arc(x + px * size, y + py * size, p * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function diceRollWithAnim(ctx, x, y, size, count, callback, opts) {
  opts = opts || {};
  const sides = opts.sides || 6;
  const duration = opts.duration || 700;
  const start = performance.now();
  const finals = diceRoll(count, sides);
  let raf = 0;
  function tick(now) {
    const t = (now - start) / duration;
    ctx.clearRect(x - size * 0.2, y - size * 0.2, (size + size * 0.4) * count + size * 0.2, size * 1.4);
    for (let i = 0; i < count; i++) {
      const dx = x + i * (size + size * 0.3);
      let val;
      if (t < 0.9) val = 1 + Math.floor(Math.random() * sides);
      else val = finals[i];
      const wobble = t < 0.9 ? (Math.random() - 0.5) * size * 0.05 : 0;
      diceDrawDie(ctx, dx + wobble, y + wobble, size, val, { glow: '#00f5ff' });
    }
    if (t < 1) raf = requestAnimationFrame(tick);
    else { if (callback) callback(finals); }
  }
  raf = requestAnimationFrame(tick);
  // play rolling sound
  for (let i = 0; i < 5; i++) {
    setTimeout(() => tone(180 + Math.random() * 80, 0.04, 'sawtooth', 0.08), i * 100);
  }
  return finals;
}

// ============== TEXT ==============
function textMeasure(ctx, text, size) {
  const oldFont = ctx.font;
  ctx.font = 'bold ' + size + 'px "Press Start 2P", monospace';
  const m = ctx.measureText(text);
  ctx.font = oldFont;
  return { w: m.width, h: size };
}
function textWrap(ctx, text, maxWidth, size) {
  const oldFont = ctx.font;
  ctx.font = 'bold ' + size + 'px "Press Start 2P", monospace';
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  ctx.font = oldFont;
  return lines;
}
function textDrawChromatic(ctx, text, x, y, size, anchor) {
  ctx.save();
  ctx.textAlign = anchor || 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + size + 'px "Press Start 2P", monospace';
  ctx.fillStyle = '#ff006e'; ctx.fillText(text, x + 2, y);
  ctx.fillStyle = '#00f5ff'; ctx.fillText(text, x - 2, y);
  ctx.fillStyle = '#ffffff'; ctx.fillText(text, x, y);
  ctx.restore();
}

// ============== PATH / EASE ==============
const PathEase = {
  'linear': (t) => t,
  'in-quad': (t) => t * t,
  'out-quad': (t) => t * (2 - t),
  'in-out-quad': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'in-cubic': (t) => t * t * t,
  'out-cubic': (t) => (--t) * t * t + 1,
  'in-out-cubic': (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  'out-back': (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
};
function pathEase(t, type) { return (PathEase[type] || PathEase.linear)(t); }
function pathLerp(a, b, t) { return a + (b - a) * t; }
function pathDistance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function pathBezier(p0, p1, p2, p3, t) {
  const u = 1 - t, uu = u * u, uuu = uu * u, tt = t * t, ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

// ============== MCTS (Phase 3) ==============
// Simple flat-Monte-Carlo: pick the move with the best random-rollout outcome
// Adequate for 9x9 Go beginner; not full UCT but cheaper and lighter.
function aiMcts(state, rollouts, opts) {
  const moves = opts.moves(state);
  if (moves.length === 0) return null;
  const tally = new Array(moves.length).fill(0);
  const plays = new Array(moves.length).fill(0);
  const budget = rollouts || 200;
  for (let r = 0; r < budget; r++) {
    const mi = r % moves.length;
    const m = moves[mi];
    let s = opts.apply(state, m);
    let depth = 0;
    while (!opts.terminal(s) && depth < (opts.maxDepth || 40)) {
      const next = opts.moves(s);
      if (next.length === 0) break;
      const pick = next[Math.floor(Math.random() * next.length)];
      s = opts.apply(s, pick);
      depth++;
    }
    const score = opts.eval(s);
    tally[mi] += score;
    plays[mi]++;
  }
  let bestI = 0, bestAvg = -Infinity;
  for (let i = 0; i < moves.length; i++) {
    const avg = plays[i] ? tally[i] / plays[i] : -Infinity;
    if (avg > bestAvg) { bestAvg = avg; bestI = i; }
  }
  return moves[bestI];
}

// ============== DRAG (Phase 3) ==============
// Unified mouse + touch drag. opts.canPick(x,y) returns a payload or null.
// Emits onDragStart(payload, x, y), onDrag(payload, x, y), onDragEnd(payload, x, y).
function inputDrag(target, opts) {
  let active = null;
  let startX = 0, startY = 0;
  function px(e) {
    const r = target.getBoundingClientRect();
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX - r.left, y: e.changedTouches[0].clientY - r.top };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onDown(e) {
    const p = px(e);
    const payload = opts.canPick ? opts.canPick(p.x, p.y) : true;
    if (!payload) return;
    if (e.touches) e.preventDefault();
    active = payload; startX = p.x; startY = p.y;
    opts.onDragStart && opts.onDragStart(active, p.x, p.y);
  }
  function onMove(e) {
    if (!active) return;
    const p = px(e);
    if (e.touches) e.preventDefault();
    opts.onDrag && opts.onDrag(active, p.x, p.y, p.x - startX, p.y - startY);
  }
  function onUp(e) {
    if (!active) return;
    const p = px(e);
    opts.onDragEnd && opts.onDragEnd(active, p.x, p.y);
    active = null;
  }
  target.addEventListener('mousedown', onDown);
  target.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  target.addEventListener('touchstart', onDown, { passive: false });
  target.addEventListener('touchmove', onMove, { passive: false });
  target.addEventListener('touchend', onUp);
  return () => {
    target.removeEventListener('mousedown', onDown);
    target.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    target.removeEventListener('touchstart', onDown);
    target.removeEventListener('touchmove', onMove);
    target.removeEventListener('touchend', onUp);
  };
}

// ============== HAPTIC PRESETS ==============
const HapticPreset = {
  TAP: 6,
  DOUBLE: [4, 30, 12],
  HEAVY: [10, 20, 30],
  BOOST: [8, 20, 8, 20, 30],
  ERROR: [20, 40, 20]
};

// ============== EXTRA FX ==============
function fxFireworks(x, y, palette, opts) {
  if (reducedMotion) return;
  opts = opts || {};
  const colors = palette || PALETTE;
  const bursts = opts.bursts || 4;
  let i = 0;
  const interval = setInterval(() => {
    const cx = x + (Math.random() - 0.5) * (opts.spread || 200);
    const cy = y + (Math.random() - 0.5) * 100;
    const color = colors[Math.floor(Math.random() * colors.length)];
    // pulsing ring overlay
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;left:${cx-30}px;top:${cy-30}px;width:60px;height:60px;border:2px solid ${color};border-radius:50%;z-index:9500;pointer-events:none;transition:transform 0.6s ease-out, opacity 0.6s ease-out;transform:scale(0.2);opacity:1;`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => { ov.style.transform = 'scale(4)'; ov.style.opacity = '0'; });
    setTimeout(() => { try { ov.remove(); } catch {} }, 700);
    tone(440 + Math.random() * 300, 0.15, 'triangle', 0.10);
    i++;
    if (i >= bursts) clearInterval(interval);
  }, 180);
}

function fxScanlineSweep(canvas, color) {
  if (reducedMotion) return;
  const ov = document.createElement('div');
  const c = color || '#00f5ff';
  ov.style.cssText = `position:fixed;left:0;right:0;top:0;height:3px;background:linear-gradient(180deg, transparent, ${c}, transparent);z-index:9500;pointer-events:none;box-shadow:0 0 12px ${c};transition:top 0.6s linear;`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.top = '100%'; });
  setTimeout(() => { try { ov.remove(); } catch {} }, 650);
}

function fxRipple(x, y, color) {
  if (reducedMotion) return;
  const ov = document.createElement('div');
  const c = color || '#00f5ff';
  ov.style.cssText = `position:fixed;left:${x-20}px;top:${y-20}px;width:40px;height:40px;border:2px solid ${c};border-radius:50%;z-index:9500;pointer-events:none;transition:transform 0.5s ease-out, opacity 0.5s ease-out;transform:scale(0.5);opacity:0.9;`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.transform = 'scale(3)'; ov.style.opacity = '0'; });
  setTimeout(() => { try { ov.remove(); } catch {} }, 600);
}

// ============== UI: pause, shareCard, playNext ==============
function uiPause(opts) {
  opts = opts || {};
  const root = document.createElement('div');
  root.className = 'gai-pause';
  root.innerHTML = '<div class="gai-pause-inner"><h2 class="big chrom"><span>PAUSED</span></h2><p class="tap pulse">▶ TAP TO RESUME</p></div>';
  root.style.cssText = 'position:fixed;inset:0;z-index:9300;background:rgba(5,5,15,0.85);display:grid;place-items:center;backdrop-filter:blur(4px);';
  const onResume = (e) => {
    if (e.target.closest('.shell-btn')) return;
    try { root.remove(); } catch {}
    if (opts.onResume) opts.onResume();
  };
  root.addEventListener('click', onResume);
  root.addEventListener('touchstart', (e) => { e.preventDefault(); onResume(e); }, { passive: false });
  document.body.appendChild(root);
  return { close() { try { root.remove(); } catch {} } };
}

function uiShareCard(opts) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const accent = opts.color || '#ff006e';
  // background
  const bg = ctx.createRadialGradient(W/2, H*0.4, 100, W/2, H*0.4, Math.max(W, H));
  bg.addColorStop(0, accent);
  bg.addColorStop(0.45, '#0a0a1e');
  bg.addColorStop(1, '#05050f');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  // grid horizon
  ctx.strokeStyle = accent + 'a0';
  ctx.lineWidth = 2;
  const horY = H * 0.62;
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const y = horY + Math.pow(t, 1.8) * (H - horY);
    ctx.globalAlpha = (1 - t) * 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // wordmark
  textDrawChromatic(ctx, 'GETABOUTIT', W/2, 220, 88);
  // game name
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px "Press Start 2P", monospace';
  ctx.fillText(opts.title || 'GAME', W/2, 380);
  // score
  textDrawChromatic(ctx, String(opts.score != null ? opts.score : '—'), W/2, H/2 - 100, 240);
  // label
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 36px "Press Start 2P", monospace';
  ctx.fillText(opts.label || 'SCORE', W/2, H/2 + 80);
  if (opts.best != null) {
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 28px "Press Start 2P", monospace';
    ctx.fillText('BEST ' + opts.best, W/2, H/2 + 160);
  }
  // url + date
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 22px "Press Start 2P", monospace';
  ctx.fillText('getaboutit.com', W/2, H - 200);
  const date = new Date(); const d = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  ctx.font = 'bold 18px "Press Start 2P", monospace';
  ctx.fillText(d, W/2, H - 150);
  // text version
  const lines = [
    opts.title || 'GETABOUTIT',
    (opts.label || 'SCORE') + ': ' + (opts.score != null ? opts.score : '—'),
    opts.best != null ? ('BEST: ' + opts.best) : null,
    '🎮 getaboutit.com/' + (opts.key || '')
  ].filter(Boolean).join('\n');
  return {
    canvas,
    text: lines,
    download() {
      try {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'getaboutit-' + (opts.key || 'score') + '-' + d + '.png';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 500);
        }, 'image/png');
      } catch {}
    },
    async share() {
      try {
        if (navigator.share && navigator.canShare) {
          const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
          if (blob) {
            const file = new File([blob], 'getaboutit.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              return navigator.share({ files: [file], title: lines.split('\n')[0], text: lines });
            }
          }
          return navigator.share({ title: lines.split('\n')[0], text: lines });
        }
        await navigator.clipboard.writeText(lines);
        uiToast('✦ COPIED TO CLIPBOARD');
      } catch {}
    },
    copy() {
      try {
        navigator.clipboard.writeText(lines);
        uiToast('✦ COPIED');
      } catch {}
    }
  };
}

function uiPlayNext(currentKey, container) {
  const cat = GAME_CATEGORIES[currentKey];
  if (!cat) return;
  const pool = GAME_KEYS.filter(k => GAME_CATEGORIES[k] === cat && k !== currentKey);
  if (pool.length === 0) return;
  // pick 3 randomly
  const shuffled = pool.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  const root = document.createElement('div');
  root.className = 'gai-play-next';
  root.innerHTML = '<div class="pn-label">PLAY NEXT</div><div class="pn-tiles"></div>';
  const strip = root.querySelector('.pn-tiles');
  for (const k of shuffled) {
    const a = document.createElement('a');
    a.className = 'pn-tile';
    a.href = GAME_PATHS[k];
    a.innerHTML = '<span class="chrom"><span>' + GAME_NAMES[k] + '</span></span>';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      ensureAudio(); glitchTo(GAME_PATHS[k]);
    });
    strip.appendChild(a);
  }
  (container || document.body).appendChild(root);
  return root;
}

// ============== PINS ==============
const pinsMax = 5;
function pinsGet() {
  const v = storage.getJSON('gai_pinned', []);
  return Array.isArray(v) ? v : [];
}
function pinsToggle(key) {
  const cur = pinsGet();
  const i = cur.indexOf(key);
  if (i >= 0) { cur.splice(i, 1); }
  else {
    if (cur.length >= pinsMax) cur.shift();
    cur.push(key);
  }
  storage.setJSON('gai_pinned', cur);
  return cur;
}
function pinsHas(key) { return pinsGet().indexOf(key) !== -1; }

// ============== BLITZ ==============
function blitzIsOn(key) { return storage.get('gai_blitz_' + key) === '1'; }
function blitzSet(key, on) { storage.set('gai_blitz_' + key, on ? '1' : '0'); }

// ============== STATS (session tracking) ==============
const SESSION_CAP_MS = 20 * 60 * 1000; // 20 min cap per session
function statsSessionStart(key) {
  const t = Date.now();
  storage.set('gai_session_start_' + key, String(t));
}
function statsSessionEnd(key) {
  const startStr = storage.get('gai_session_start_' + key);
  if (!startStr) return;
  const start = +startStr;
  const now = Date.now();
  const elapsed = Math.min(now - start, SESSION_CAP_MS);
  const cur = +(storage.get('gai_time_' + key) || 0);
  storage.set('gai_time_' + key, String(cur + elapsed));
  storage.del('gai_session_start_' + key);
  // daily log
  const day = todayUTC();
  const dayKey = 'gai_day_' + day;
  storage.set(dayKey, String((+storage.get(dayKey) || 0) + 1));
}
function statsTimeFor(key) { return +(storage.get('gai_time_' + key) || 0); }
function statsDailyCounts(daysBack) {
  daysBack = daysBack || 30;
  const out = [];
  const today = new Date();
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = 'gai_day_' + d.getUTCFullYear().toString().padStart(4,'0') + (d.getUTCMonth()+1).toString().padStart(2,'0') + d.getUTCDate().toString().padStart(2,'0');
    out.push({ date: d, count: +(storage.get(key) || 0) });
  }
  return out;
}

// ============== WELCOME BACK ==============
function welcomeBackCheck() {
  const last = +(storage.get('gai_last_visit') || 0);
  const now = Date.now();
  storage.set('gai_last_visit', String(now));
  if (last && now - last > 24 * 60 * 60 * 1000) {
    const days = Math.floor((now - last) / (24 * 60 * 60 * 1000));
    uiToast('✦ WELCOME BACK · ' + days + ' DAY' + (days === 1 ? '' : 'S') + ' AWAY', 3000);
    return true;
  }
  return false;
}

window.GAI = {
  PALETTE, PALETTE_NAMES, GAME_KEYS, GAME_PATHS, GAME_NAMES, GAME_CATEGORIES,
  storage, bestScore, bestKV, recordPlay, recordWin, streak, totalPlays, gamePlays,
  rng, todayUTC, dailySeed,
  audio: { ensure: ensureAudio, tone, arpeggio, noiseBurst, startPad, stopPad, setMuted, isMuted },
  canvas: { fit },
  input: { tap, swipe, keys, drag: inputDrag },
  chrom: chromHTML,
  haptic,
  haptics: HapticPreset,
  transition: { glitchTo },
  shell: { init: shellInit },
  reducedMotion,
  util: { clamp, lerp, lerpColor, shade, smoothstep },
  fx: {
    screenShake: fxScreenShake,
    particleBurst: fxParticleBurst,
    chromaticFlash: fxChromaticFlash,
    confetti: fxConfetti,
    outrunBg: fxOutrunBg,
    roundRect,
    fireworks: fxFireworks,
    scanlineSweep: fxScanlineSweep,
    ripple: fxRipple
  },
  ui: {
    splash: uiSplash,
    gameOver: uiGameOver,
    toast: uiToast,
    countdown: uiCountdown,
    pause: uiPause,
    shareCard: uiShareCard,
    playNext: uiPlayNext,
    inputMode: inputMode,
    playPrompt:  () => inputMode() === 'tap' ? '▶ TAP TO PLAY'  : '▶ PRESS SPACE TO PLAY',
    retryPrompt: () => inputMode() === 'tap' ? '▶ TAP TO RETRY' : '▶ PRESS SPACE TO RETRY',
    patchScreenPrompts: patchScreenPrompts
  },
  cards: {
    SUITS: CARD_SUITS, RANKS: CARD_RANKS,
    newDeck: cardsNewDeck, shuffle: cardsShuffle,
    rankValue: cardsRankValue, isRed: cardsIsRed,
    handValue: cardsHandValue, evalPoker: cardsEvalPoker,
    draw: cardsDraw, cardBack: cardsDrawBack
  },
  dice: { roll: diceRoll, drawDie: diceDrawDie, rollWithAnim: diceRollWithAnim },
  text: { measure: textMeasure, wrap: textWrap, drawChromatic: textDrawChromatic },
  path: { bezier: pathBezier, ease: pathEase, lerp: pathLerp, distance: pathDistance },
  ai: { minimax: aiMinimax, mcts: aiMcts },
  achievements: {
    list: ACHIEVEMENT_LIST.slice(),
    has: achievementsHas,
    unlock: achievementsUnlock,
    unlocked: achievementsUnlocked,
    check: achievementsCheck,
    total: ACHIEVEMENT_LIST.length
  },
  theme: { get: themeGet, set: themeSet, cycle: themeCycle, list: THEMES.slice() },
  exportData: { dump: exportDump, load: exportLoad },
  cleanup: { on: cleanup_on, raf: cleanup_raf, dispose: cleanup_dispose },
  pins: { get: pinsGet, toggle: pinsToggle, has: pinsHas, max: pinsMax },
  blitz: { isOn: blitzIsOn, set: blitzSet },
  stats: {
    sessionStart: statsSessionStart, sessionEnd: statsSessionEnd,
    timeFor: statsTimeFor, dailyCounts: statsDailyCounts
  },
  welcomeBack: welcomeBackCheck
};

// Check achievements on each page load (covers streak, completionist, taps)
try { achievementsCheck(); } catch {}

})();
