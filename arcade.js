(() => {
'use strict';
const GAI = window.GAI;
const $ = (s) => document.querySelector(s);

// entrance
const firstVisit = !sessionStorage.getItem('gai_seen');
if (firstVisit) {
  sessionStorage.setItem('gai_seen', '1');
  document.body.classList.add('entrance');
}

// Hand the wordmark off to chromBreathe once wmEnter finishes. Without
// this, body.entrance sticks forever and the breathing animation never
// takes over (the entrance selector's `animation: wmEnter ...` wins on
// specificity over `.chrom-jitter`'s chromBreathe).
const _wordmark = document.querySelector('.wordmark');
if (_wordmark) {
  _wordmark.addEventListener('animationend', (e) => {
    if (e.animationName === 'wmEnter') {
      document.body.classList.remove('entrance');
    }
  }, { once: true });
  // Safety net: remove class after 1.5s regardless, in case animationend
  // never fires (e.g. prefers-reduced-motion suppresses wmEnter entirely).
  setTimeout(() => document.body.classList.remove('entrance'), 1500);
}

// rainbow
if (GAI.storage.get('gai_rainbow_unlocked') === '1') {
  document.body.classList.add('rainbow');
  const badge = $('#rainbow-badge');
  if (badge) badge.classList.remove('hidden');
}

// background canvas
const bgCanvas = $('#bg');
const bgCtx = bgCanvas.getContext('2d');
let bgW = 0, bgH = 0, bgDpr = 1;
function sizeBg() {
  bgDpr = Math.min(window.devicePixelRatio || 1, 2);
  bgW = window.innerWidth; bgH = window.innerHeight;
  bgCanvas.width = bgW * bgDpr; bgCanvas.height = bgH * bgDpr;
  bgCanvas.style.width = bgW + 'px'; bgCanvas.style.height = bgH + 'px';
  bgCtx.setTransform(bgDpr, 0, 0, bgDpr, 0, 0);
}
sizeBg();
let szTimer = null;
window.addEventListener('resize', () => {
  if (szTimer) clearTimeout(szTimer);
  szTimer = setTimeout(() => { sizeBg(); buildStars(); }, 150);
});

const stars = [[],[],[]];
function buildStars() {
  for (let layer = 0; layer < 3; layer++) {
    stars[layer].length = 0;
    const count = [60, 35, 20][layer];
    for (let i = 0; i < count; i++) {
      stars[layer].push({
        x: Math.random() * bgW, y: Math.random() * bgH * 0.7,
        s: 0.4 + Math.random() * (layer + 1) * 0.7,
        tw: Math.random() * Math.PI * 2, tws: 0.3 + Math.random() * 0.8
      });
    }
  }
}
buildStars();
let bgGridOffset = 0;
function drawBg() {
  const g = bgCtx.createRadialGradient(bgW / 2, bgH * 0.65, 50, bgW / 2, bgH * 0.65, Math.max(bgW, bgH));
  g.addColorStop(0, '#1a0635'); g.addColorStop(0.55, '#0a0a1e'); g.addColorStop(1, '#05050f');
  bgCtx.fillStyle = g; bgCtx.fillRect(0, 0, bgW, bgH);
  const sunY = bgH * 0.65, sunR = Math.min(bgW, bgH) * 0.45;
  const sg = bgCtx.createRadialGradient(bgW/2, sunY, 8, bgW/2, sunY, sunR);
  sg.addColorStop(0, 'rgba(255,214,10,0.55)'); sg.addColorStop(0.4, 'rgba(255,149,0,0.30)');
  sg.addColorStop(0.8, 'rgba(255,0,110,0.10)'); sg.addColorStop(1, 'rgba(255,0,110,0)');
  bgCtx.fillStyle = sg;
  bgCtx.beginPath(); bgCtx.arc(bgW/2, sunY, sunR, 0, Math.PI*2); bgCtx.fill();
  for (let layer = 0; layer < 3; layer++) {
    for (const s of stars[layer]) {
      s.tw += 0.01 * s.tws;
      const a = 0.4 + 0.5 * Math.abs(Math.sin(s.tw));
      bgCtx.fillStyle = `rgba(255,255,255,${(a * (0.7 - layer * 0.2)).toFixed(3)})`;
      bgCtx.fillRect(s.x, s.y, s.s, s.s);
    }
  }
  const horY = bgH * 0.65;
  bgCtx.strokeStyle = 'rgba(255,0,110,0.5)'; bgCtx.lineWidth = 1;
  bgGridOffset = (bgGridOffset + 0.5) % 32;
  bgCtx.save();
  for (let i = 0; i < 14; i++) {
    const t = (i * 32 + bgGridOffset) / (32 * 14);
    const y = horY + Math.pow(t, 1.8) * (bgH - horY);
    bgCtx.globalAlpha = (1 - t) * 0.7;
    bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(bgW, y); bgCtx.stroke();
  }
  bgCtx.restore();
  bgCtx.strokeStyle = 'rgba(255,0,110,0.5)';
  for (let i = -8; i <= 8; i++) {
    const xB = bgW / 2 + i * (bgW / 7);
    bgCtx.beginPath(); bgCtx.moveTo(xB, bgH); bgCtx.lineTo(bgW / 2, horY); bgCtx.stroke();
  }
  const lineG = bgCtx.createLinearGradient(0, horY - 1, 0, horY + 1);
  lineG.addColorStop(0, '#ffd60a'); lineG.addColorStop(1, '#ff006e');
  bgCtx.fillStyle = lineG; bgCtx.fillRect(0, horY - 1, bgW, 2);
}

// ====== games registry ======
// Preview renderers live in shared/previews.js (GAI.previews[key]) — keyed by
// game key, looked up at tile-build time. color = palette-name border class
// (superseded by GAME_ACCENTS for the redesign; kept until the tile restyle).
const GAMES = [
  { key: 'stack',       tag: 'one-tap tower',       color: 'pink',    cat: 'arcade' },
  { key: 'snake',       tag: 'eat the dots',        color: 'teal',    cat: 'arcade' },
  { key: 'blocks',      tag: 'lines disappear',     color: 'cyan',    cat: 'arcade' },
  { key: 'p2048',       tag: 'merge to win',        color: 'yellow',  cat: 'arcade', displayName: '2048' },
  { key: 'breakout',    tag: 'smash the bricks',    color: 'orange',  cat: 'arcade' },
  { key: 'pong',        tag: 'first to eleven',     color: 'purple',  cat: 'arcade' },
  { key: 'flap',        tag: 'mind the gap',        color: 'yellow',  cat: 'arcade' },
  { key: 'invaders',    tag: 'protect the line',    color: 'teal',    cat: 'arcade' },
  { key: 'runner',      tag: 'one tap to jump',     color: 'cyan',    cat: 'arcade' },
  { key: 'slither',     tag: 'grow and dodge',      color: 'teal',    cat: 'arcade' },
  { key: 'tictactoe',   tag: 'three in a row',      color: 'blue',    cat: 'board',  displayName: 'TIC TAC TOE' },
  { key: 'chess',       tag: 'the eternal game',    color: 'purple',  cat: 'board'  },
  { key: 'checkers',    tag: 'king me',             color: 'orange',  cat: 'board'  },
  { key: 'connect4',    tag: 'four in a row',       color: 'yellow',  cat: 'board',  displayName: 'CONNECT 4' },
  { key: 'blackjack',   tag: '21 or bust',          color: 'teal',    cat: 'cards'  },
  { key: 'solitaire',   tag: 'classic time killer', color: 'cyan',    cat: 'cards'  }
];
const noop = () => {};

// today's 3 — one arcade, one board, one card
const todayInt = parseInt(GAI.todayUTC(), 10);
const arcadePool = GAMES.filter(g => g.cat === 'arcade');
const boardPool = GAMES.filter(g => g.cat === 'board');
const cardPool = GAMES.filter(g => g.cat === 'cards');
const dailyTrio = [
  arcadePool[todayInt % arcadePool.length],
  boardPool[(todayInt * 31) % boardPool.length],
  cardPool[(todayInt * 17) % cardPool.length]
];

// MOTDs
const MOTDS = [
  'sunday energy', 'monday momentum', 'tuesday turn', 'wednesday wave',
  'thursday throws', 'friday fever', 'saturday spirit',
  'perfect day for a high score', 'short break, long climb',
  'one more game', 'tap with intent', 'press start', 'the arcade is open',
  'perfect chess weather', 'card night', 'streak day'
];
const motd = MOTDS[(todayInt * 1103515245 + 12345) % MOTDS.length];
$('#motd').textContent = '> ' + motd;

// stats
function refreshStats() {
  const total = GAI.totalPlays();
  const st = GAI.streak.get();
  $('#taps-count').textContent = total.toLocaleString();
  $('#streak-count').textContent = st.current || 0;
  const e = $('#streak-emoji');
  if ((st.current || 0) >= 7) e.classList.add('hot'); else e.classList.remove('hot');
}
refreshStats();

// welcome back toast on returning visit
try { GAI.welcomeBack && GAI.welcomeBack(); } catch {}

// achievements badge
function refreshAch() {
  const unlocked = GAI.achievements.unlocked();
  $('#achCount').textContent = unlocked.length;
  $('#achTotal').textContent = GAI.achievements.total;
}
refreshAch();

// theme indicator
function refreshTheme() {
  const t = GAI.theme.get();
  $('#themeIndicator').textContent = t === 'default' ? '' : '· ' + t.replace('deepnight','deep night').replace('highcontrast','high contrast');
}
refreshTheme();

// today's trio render
const dailyStrip = $('#dailyStrip');
for (const g of dailyTrio) {
  const a = document.createElement('a');
  a.className = 'daily-tile t-' + g.color;
  a.href = GAI.GAME_PATHS[g.key];
  const name = g.displayName || GAI.GAME_NAMES[g.key];
  a.innerHTML = '<span class="d-mark">✦ ' + g.cat.toUpperCase() + ' ·</span><span class="d-name chrom"><span>' + name + '</span></span><span class="d-tag">' + g.tag + '</span>';
  a.addEventListener('click', (e) => {
    e.preventDefault();
    GAI.audio.ensure();
    GAI.transition.glitchTo(GAI.GAME_PATHS[g.key]);
  });
  dailyStrip.appendChild(a);
}

// pinned strip
function renderPinned() {
  const pinned = GAI.pins.get().filter(k => GAMES.find(g => g.key === k));
  const sec = $('#pinned');
  const strip = $('#pinnedStrip');
  if (!pinned.length) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  strip.innerHTML = '';
  for (const k of pinned) {
    const meta = GAMES.find(g => g.key === k);
    const a = document.createElement('a');
    a.className = 'pinned-tile t-' + meta.color;
    a.href = GAI.GAME_PATHS[k];
    a.textContent = meta.displayName || GAI.GAME_NAMES[k];
    a.addEventListener('click', (e) => {
      e.preventDefault();
      GAI.audio.ensure();
      GAI.transition.glitchTo(GAI.GAME_PATHS[k]);
    });
    strip.appendChild(a);
  }
}
renderPinned();

// recent
function renderRecent() {
  const raw = GAI.storage.getJSON('gai_recent', []);
  const recent = Array.isArray(raw) ? raw.filter(r => r && GAMES.find(g => g.key === r.key)) : [];
  const sec = $('#recent');
  const strip = $('#recent-strip');
  if (recent.length === 0) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  strip.innerHTML = '';
  for (const r of recent) {
    const meta = GAMES.find(g => g.key === r.key);
    const a = document.createElement('a');
    a.className = 'recent-tile t-' + meta.color;
    a.href = GAI.GAME_PATHS[r.key];
    a.textContent = meta.displayName || GAI.GAME_NAMES[r.key];
    a.addEventListener('click', (e) => {
      e.preventDefault();
      GAI.audio.ensure();
      GAI.transition.glitchTo(GAI.GAME_PATHS[r.key]);
    });
    strip.appendChild(a);
  }
}
renderRecent();

// sort games by play count for default ALL view
const GAMES_SORTED = GAMES.slice().sort((a, b) => GAI.gamePlays(b.key) - GAI.gamePlays(a.key));

// tiles
const PVW = 240, PVH = 160; // logical preview canvas dimensions
const tiles = [];
const grid = $('#grid');
let entranceStagger = 0;
for (const g of GAMES_SORTED) {
  const t = document.createElement('a');
  t.className = 'tile t-' + g.color;
  t.dataset.cat = g.cat;
  t.dataset.key = g.key;
  t.href = GAI.GAME_PATHS[g.key];
  const isToday = dailyTrio.some(d => d.key === g.key);
  if (isToday) t.classList.add('daily');
  if (firstVisit) {
    t.style.animationDelay = (0.45 + entranceStagger * 0.03) + 's';
    entranceStagger++;
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'preview';
  // Renderers draw in a logical PVW x PVH space; back the canvas at xDPR for
  // crispness on hi-DPI, then scale the context so the art is unchanged.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = PVW * dpr; canvas.height = PVH * dpr;
  canvas.setAttribute('aria-hidden','true');
  t.appendChild(canvas);
  const pctx = canvas.getContext('2d');
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const nameEl = document.createElement('div');
  nameEl.className = 'name';
  nameEl.innerHTML = '<span class="chrom"><span>' + (g.displayName || GAI.GAME_NAMES[g.key]) + '</span></span>';
  t.appendChild(nameEl);
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.textContent = g.tag;
  t.appendChild(tag);
  const best = +(GAI.storage.get('gai_best_' + g.key) || 0);
  const bestEl = document.createElement('div');
  bestEl.className = 'best';
  bestEl.textContent = best > 0 ? ('BEST ' + best) : '— NEW —';
  t.appendChild(bestEl);
  const cat = document.createElement('div');
  cat.className = 'cat';
  cat.textContent = g.cat.toUpperCase();
  t.appendChild(cat);
  if (isToday) {
    const star = document.createElement('div');
    star.className = 'star';
    star.textContent = '🌟';
    star.setAttribute('aria-label', "Today's challenge");
    t.appendChild(star);
  }
  t.addEventListener('click', (e) => {
    e.preventDefault();
    GAI.audio.ensure();
    GAI.transition.glitchTo(GAI.GAME_PATHS[g.key]);
  });
  t.addEventListener('mouseenter', () => fireHoverBlip(g.key));
  // long press / right-click → toggle pin
  let pinTimer = null;
  function startPress() { pinTimer = setTimeout(() => { pinTimer = null; togglePin(g.key); }, 600); }
  function cancelPress() { if (pinTimer) { clearTimeout(pinTimer); pinTimer = null; } }
  t.addEventListener('mousedown', (e) => { if (e.button === 0) startPress(); });
  t.addEventListener('mouseup', cancelPress);
  t.addEventListener('mouseleave', cancelPress);
  t.addEventListener('touchstart', startPress, { passive: true });
  t.addEventListener('touchend', cancelPress);
  t.addEventListener('touchmove', cancelPress);
  t.addEventListener('contextmenu', (e) => { e.preventDefault(); togglePin(g.key); });
  // pinned indicator
  if (GAI.pins.has(g.key)) {
    const pm = document.createElement('div');
    pm.style.cssText = 'position:absolute;top:14px;left:14px;font-size:12px;z-index:3;';
    pm.textContent = '📌';
    pm.setAttribute('aria-label','Pinned');
    t.appendChild(pm);
  }
  grid.appendChild(t);
  tiles.push({ meta: g, el: t, canvas, ctx: pctx, w: PVW, h: PVH, tick: (GAI.previews && GAI.previews[g.key]) || noop, state: {}, visible: true });
}

function togglePin(key) {
  const list = GAI.pins.toggle(key);
  GAI.audio.ensure();
  GAI.audio.tone(880, 0.06, 'square', 0.14);
  GAI.ui.toast(list.includes(key) ? '📌 PINNED' : '× UNPINNED', 1500);
  renderPinned();
  // Add/remove indicator on the tile
  const tile = tiles.find(t => t.meta.key === key);
  if (tile) {
    const existing = tile.el.querySelector('[aria-label="Pinned"]');
    if (list.includes(key) && !existing) {
      const pm = document.createElement('div');
      pm.style.cssText = 'position:absolute;top:14px;left:14px;font-size:12px;z-index:3;';
      pm.textContent = '📌';
      pm.setAttribute('aria-label','Pinned');
      tile.el.appendChild(pm);
    } else if (!list.includes(key) && existing) {
      existing.remove();
    }
  }
}

// category tabs + search
const tabs = document.querySelectorAll('.tab');
let curCat = sessionStorage.getItem('gai_cat') || 'all';
// A removed category (puzzle/casino/mind/skill) left in this session's gai_cat
// would filter the grid to zero tiles with no active tab — fall back to ALL.
if (!['all', 'arcade', 'board', 'cards'].includes(curCat)) curCat = 'all';
let curSearch = '';
function applyFilter() {
  const q = curSearch.trim().toLowerCase();
  for (const t of tiles) {
    const catMatch = curCat === 'all' || t.meta.cat === curCat;
    const name = (t.meta.displayName || GAI.GAME_NAMES[t.meta.key]).toLowerCase();
    const tag = (t.meta.tag || '').toLowerCase();
    const qMatch = !q || name.includes(q) || tag.includes(q) || t.meta.key.includes(q);
    t.el.style.display = (catMatch && qMatch) ? '' : 'none';
  }
  for (const tab of tabs) tab.classList.toggle('active', tab.dataset.cat === curCat);
  sessionStorage.setItem('gai_cat', curCat);
}
applyFilter();
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    GAI.audio.ensure();
    GAI.audio.tone(560, 0.04, 'triangle', 0.10);
    curCat = tab.dataset.cat;
    applyFilter();
  });
}
const searchInput = $('#searchInput');
const searchClear = $('#searchClear');
searchInput.addEventListener('input', () => { curSearch = searchInput.value; applyFilter(); });
searchClear.addEventListener('click', () => { searchInput.value = ''; curSearch = ''; applyFilter(); searchInput.focus(); });

// SearchAction handler — Google may send users to /?q=<term> after picking the
// SearchAction sitelink. Honour ?q= and ?cat= on load.
try {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  const cat = params.get('cat');
  if (q) { searchInput.value = q; curSearch = q; applyFilter(); }
  if (cat && ['arcade','board','cards','all'].indexOf(cat) >= 0) {
    curCat = cat;
    applyFilter();
  }
} catch {}
document.addEventListener('keydown', (e) => {
  if (e.key === '/') {
    const a = document.activeElement;
    // Skip when user is already typing in an input/textarea/contenteditable
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    if (!searchInput) return;
    e.preventDefault();
    searchInput.focus();
    return;
  }
  if (e.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = ''; curSearch = ''; applyFilter(); searchInput.blur();
  }
});

// Stamp every tile with one frame so the bottom rows aren't empty
// boxes before the user scrolls them into view.
for (const t of tiles) {
  try { t.tick(t.ctx, t.w, t.h, t.state, 0, performance.now()); } catch {}
}

// IntersectionObserver for previews. Pin the first 9 tiles to always
// tick (they're above-the-fold on every viewport) — observer governs
// the rest.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const tile = tiles.find(t => t.el === e.target);
    if (tile) tile.visible = e.isIntersecting;
  }
}, { rootMargin: '50px' });
for (let i = 0; i < tiles.length; i++) {
  if (i < 9) { tiles[i].visible = true; continue; }
  io.observe(tiles[i].el);
}

// hover blip
let lastBlip = 0;
let hasGesture = false;
function fireHoverBlip(key) {
  if (GAI.audio.isMuted()) return;
  if (!GAI.audio.ensure()) return;
  if (!hasGesture) return;
  const now = performance.now();
  if (now - lastBlip < 80) return;
  lastBlip = now;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i)) % 100;
  const pent = [261.63, 329.63, 392, 440, 523.25];
  const f = pent[h % 5] * (1 + Math.floor(h / 5) * 0.05);
  GAI.audio.tone(f, 0.05, 'triangle', 0.06, 0.003, 0.05);
}
const onFirstGesture = () => {
  hasGesture = true;
  GAI.audio.ensure();
  document.removeEventListener('pointerdown', onFirstGesture);
  document.removeEventListener('keydown', onFirstGesture);
  document.removeEventListener('touchstart', onFirstGesture);
};
document.addEventListener('pointerdown', onFirstGesture);
document.addEventListener('keydown', onFirstGesture);
document.addEventListener('touchstart', onFirstGesture, { passive: true });

// rAF — one shared loop drives the bg + all visible tile previews. Tiles are
// throttled to ~TILE_FPS (cheaper than 60fps, plenty for previews); the bg
// keeps the full frame cadence for smooth scrolling stars. IntersectionObserver
// + display:none gate which tiles tick; document.hidden pauses everything.
let lastT = 0, tileAcc = 0;
const reduced = GAI.reducedMotion;
const TILE_FPS = 30, TILE_STEP = 1000 / TILE_FPS;
let bgDrawn = false;
let staticDrawn = false;
function tickTiles(dtSec, now) {
  for (const t of tiles) {
    if (!t.visible) continue;
    if (t.el.style.display === 'none') continue;
    try { t.tick(t.ctx, t.w, t.h, t.state, dtSec, now); } catch {}
  }
}
function frame(now) {
  const dt = Math.min(now - lastT, 50); lastT = now;
  if (!document.hidden) {
    if (reduced) {
      if (!bgDrawn) { drawBg(now); bgDrawn = true; }
      if (!staticDrawn) {
        for (const t of tiles) { try { t.tick(t.ctx, t.w, t.h, t.state, 0, now); } catch {} }
        staticDrawn = true;
      }
    } else {
      drawBg(now);
      tileAcc += dt;
      if (tileAcc >= TILE_STEP) {
        tickTiles(Math.min(tileAcc, 50) / 1000, now); // capped variable step
        tileAcc = 0;
      }
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastT = performance.now(); tileAcc = 0; } });

// surprise me with long press = category-only
let surpriseTimer = null;
let surpriseCategoryMode = sessionStorage.getItem('gai_surprise_cat') || 'all';
const surpriseBtn = $('#surprise');
function updateSurpriseLabel() {
  surpriseBtn.textContent = surpriseCategoryMode === 'all'
    ? '🎲 SURPRISE ME'
    : '🎲 ' + surpriseCategoryMode.toUpperCase();
}
updateSurpriseLabel();
function surprisePick() {
  GAI.audio.ensure();
  const recent = GAI.storage.getJSON('gai_recent', []);
  const lastKey = recent[0] && recent[0].key;
  let pool = GAMES;
  if (surpriseCategoryMode !== 'all') pool = pool.filter(g => g.cat === surpriseCategoryMode);
  pool = pool.filter(g => g.key !== lastKey);
  if (pool.length === 0) pool = GAMES.slice();
  const pick = pool[Math.floor(Math.random() * pool.length)];
  GAI.audio.arpeggio([523.25, 659.25, 783.99], 60, 'triangle', 0.12);
  GAI.transition.glitchTo(GAI.GAME_PATHS[pick.key]);
}
surpriseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if (e._fromLongPress) return;
  surprisePick();
});
surpriseBtn.addEventListener('pointerdown', () => {
  surpriseTimer = setTimeout(() => {
    surpriseTimer = null;
    const cats = ['all','arcade','board','cards'];
    const i = cats.indexOf(surpriseCategoryMode);
    surpriseCategoryMode = cats[(i + 1) % cats.length];
    sessionStorage.setItem('gai_surprise_cat', surpriseCategoryMode);
    updateSurpriseLabel();
    GAI.audio.ensure();
    GAI.audio.tone(880, 0.06, 'square', 0.14);
  }, 500);
});
surpriseBtn.addEventListener('pointerup', () => { if (surpriseTimer) clearTimeout(surpriseTimer); });
surpriseBtn.addEventListener('pointerleave', () => { if (surpriseTimer) clearTimeout(surpriseTimer); });

// konami
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konIdx = 0;
document.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === KONAMI[konIdx].toLowerCase() || k === KONAMI[konIdx]) {
    konIdx++;
    if (konIdx === KONAMI.length) { konIdx = 0; triggerKonami(); }
  } else {
    konIdx = (k === KONAMI[0]) ? 1 : 0;
  }
});
function triggerKonami() {
  const unlocked = GAI.storage.get('gai_rainbow_unlocked') === '1';
  GAI.storage.set('gai_rainbow_unlocked', unlocked ? '0' : '1');
  if (unlocked) { document.body.classList.remove('rainbow'); $('#rainbow-badge').classList.add('hidden'); }
  else { document.body.classList.add('rainbow'); $('#rainbow-badge').classList.remove('hidden'); }
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:linear-gradient(90deg,rgba(255,0,110,0.4),rgba(0,245,255,0.4));mix-blend-mode:screen;animation:pageGlitch 1s steps(8,end) forwards;pointer-events:none;';
  document.body.appendChild(ov);
  setTimeout(() => ov.remove(), 1000);
  GAI.audio.ensure();
  GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 90, 'square', 0.16);
}

// easter eggs: gai, mood
let keyBuf = '';
document.addEventListener('keydown', (e) => {
  if (e.key.length !== 1) return;
  keyBuf = (keyBuf + e.key.toLowerCase()).slice(-4);
  if (keyBuf.endsWith('gai')) { keyBuf = ''; crtCollapse(); }
  if (keyBuf.endsWith('mood')) {
    keyBuf = '';
    const next = GAI.theme.cycle();
    refreshTheme();
    GAI.audio.ensure();
    GAI.audio.tone(220 + GAI.theme.list.indexOf(next) * 120, 0.1, 'sine', 0.14);
  }
});
function crtCollapse() {
  if (reduced) return;
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0a0a1e;pointer-events:none;transition:transform 0.4s ease;transform:scaleY(1);';
  document.body.appendChild(ov);
  requestAnimationFrame(() => {
    ov.style.transform = 'scaleY(0.001)';
    setTimeout(() => { ov.style.transform = 'scaleY(1)'; }, 400);
    setTimeout(() => { ov.remove(); }, 900);
  });
  GAI.audio.ensure();
  GAI.audio.tone(180, 0.4, 'sawtooth', 0.1, 0.005, 0.1);
}

// veteran tag
if (GAI.totalPlays() >= 100) {
  const v = document.createElement('span');
  v.style.cssText = 'display:block;font-size:9px;letter-spacing:0.2em;color:var(--c-yellow);margin-top:6px;opacity:0.7;';
  v.textContent = '⚡ VETERAN ⚡';
  $('.hero').appendChild(v);
}

})();
