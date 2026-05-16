/* GETABOUTIT shared core — window.GAI */
(() => {
'use strict';

const PALETTE = [
  '#ff006e', '#d100d1', '#8338ec', '#3a0ca3', '#4361ee',
  '#00f5ff', '#06ffa5', '#ffd60a', '#ff9500', '#ef233c'
];

const PALETTE_NAMES = ['pink','magenta','purple','deeppurple','blue','cyan','teal','yellow','orange','red'];

const GAME_KEYS = ['stack','snake','blocks','p2048','breakout','pong','memory','minesweeper','flap','invaders','asteroids','simon','tictactoe','lightsout','slide','reaction','words'];
const GAME_PATHS = {
  stack: '/stack', snake: '/snake', blocks: '/blocks', p2048: '/2048',
  breakout: '/breakout', pong: '/pong', memory: '/memory',
  minesweeper: '/minesweeper', flap: '/flap', invaders: '/invaders',
  asteroids: '/asteroids', simon: '/simon', tictactoe: '/tictactoe',
  lightsout: '/lightsout', slide: '/slide', reaction: '/reaction', words: '/words'
};
const GAME_NAMES = {
  stack: 'STACK', snake: 'SNAKE', blocks: 'BLOCKS', p2048: '2048',
  breakout: 'BREAKOUT', pong: 'PONG', memory: 'MEMORY',
  minesweeper: 'MINES', flap: 'FLAP', invaders: 'INVADERS',
  asteroids: 'ASTEROIDS', simon: 'SIMON', tictactoe: 'TIC TAC TOE',
  lightsout: 'LIGHTS OUT', slide: 'SLIDE', reaction: 'REACTION', words: 'WORDS'
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

window.GAI = {
  PALETTE, PALETTE_NAMES, GAME_KEYS, GAME_PATHS, GAME_NAMES,
  storage, bestScore, bestKV, recordPlay, streak, totalPlays, gamePlays,
  rng, todayUTC, dailySeed,
  audio: { ensure: ensureAudio, tone, arpeggio, noiseBurst, startPad, stopPad, setMuted, isMuted },
  canvas: { fit },
  input: { tap, swipe, keys },
  chrom: chromHTML,
  haptic,
  transition: { glitchTo },
  shell: { init: shellInit },
  reducedMotion,
  util: { clamp, lerp, lerpColor, shade, smoothstep }
};

})();
