(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const $ = (s) => document.querySelector(s);

// entrance
const firstVisit = !sessionStorage.getItem('gai_seen');
if (firstVisit) {
  sessionStorage.setItem('gai_seen', '1');
  document.body.classList.add('entrance');
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
const GAMES = [
  { key: 'stack',       tag: 'one-tap tower',       color: 'pink',    cat: 'arcade', preview: pvStack },
  { key: 'snake',       tag: 'eat the dots',        color: 'teal',    cat: 'arcade', preview: pvSnake },
  { key: 'blocks',      tag: 'lines disappear',     color: 'cyan',    cat: 'arcade', preview: pvBlocks },
  { key: 'p2048',       tag: 'merge to win',        color: 'yellow',  cat: 'arcade', preview: pv2048, displayName: '2048' },
  { key: 'breakout',    tag: 'smash the bricks',    color: 'orange',  cat: 'arcade', preview: pvBreakout },
  { key: 'pong',        tag: 'first to eleven',     color: 'purple',  cat: 'arcade', preview: pvPong },
  { key: 'flap',        tag: 'mind the gap',        color: 'yellow',  cat: 'arcade', preview: pvFlap },
  { key: 'invaders',    tag: 'protect the line',    color: 'teal',    cat: 'arcade', preview: pvInvaders },
  { key: 'asteroids',   tag: 'thrust and shoot',    color: 'cyan',    cat: 'arcade', preview: pvAsteroids },
  { key: 'bubbles',     tag: 'pop chain combos',    color: 'magenta', cat: 'arcade', preview: pvBubbles },
  { key: 'runner',      tag: 'one tap to jump',     color: 'cyan',    cat: 'arcade', preview: pvRunner },
  { key: 'memory',      tag: 'match the cards',     color: 'magenta', cat: 'puzzle', preview: pvMemory },
  { key: 'minesweeper', tag: "don't touch",         color: 'red',     cat: 'puzzle', preview: pvMines, displayName: 'MINES' },
  { key: 'slide',       tag: 'order the tiles',     color: 'purple',  cat: 'puzzle', preview: pvSlide },
  { key: 'lightsout',   tag: 'turn them off',       color: 'magenta', cat: 'puzzle', preview: pvLightsOut, displayName: 'LIGHTS OUT' },
  { key: 'words',       tag: 'guess in six',        color: 'teal',    cat: 'puzzle', preview: pvWords },
  { key: 'sudoku',      tag: 'fill the grid',       color: 'blue',    cat: 'puzzle', preview: pvSudoku },
  { key: 'dots',        tag: 'claim the squares',   color: 'pink',    cat: 'puzzle', preview: pvDots, displayName: 'DOTS' },
  { key: 'tictactoe',   tag: 'three in a row',      color: 'blue',    cat: 'board',  preview: pvTTT, displayName: 'TIC TAC TOE' },
  { key: 'chess',       tag: 'the eternal game',    color: 'purple',  cat: 'board',  preview: pvChess },
  { key: 'checkers',    tag: 'king me',             color: 'orange',  cat: 'board',  preview: pvCheckers },
  { key: 'connect4',    tag: 'four in a row',       color: 'yellow',  cat: 'board',  preview: pvC4, displayName: 'CONNECT 4' },
  { key: 'battleship',  tag: 'fire when ready',     color: 'deeppurple', cat: 'board', preview: pvBattleship },
  { key: 'blackjack',   tag: '21 or bust',          color: 'teal',    cat: 'cards',  preview: pvBlackjack },
  { key: 'poker',       tag: 'jacks or better',     color: 'yellow',  cat: 'cards',  preview: pvPoker },
  { key: 'solitaire',   tag: 'classic time killer', color: 'cyan',    cat: 'cards',  preview: pvSolitaire },
  { key: 'hearts',      tag: 'shoot the moon',      color: 'red',     cat: 'cards',  preview: pvHearts },
  { key: 'simon',       tag: 'remember the sequence', color: 'pink',  cat: 'mind',   preview: pvSimon },
  { key: 'reaction',    tag: 'wait... TAP',         color: 'red',     cat: 'mind',   preview: pvReaction }
];

// today's 3 (one arcade, one puzzle/board, one card/mind)
const todayInt = parseInt(GAI.todayUTC(), 10);
const arcadePool = GAMES.filter(g => g.cat === 'arcade');
const puzzleBoardPool = GAMES.filter(g => g.cat === 'puzzle' || g.cat === 'board');
const cardMindPool = GAMES.filter(g => g.cat === 'cards' || g.cat === 'mind');
const dailyTrio = [
  arcadePool[todayInt % arcadePool.length],
  puzzleBoardPool[(todayInt * 31) % puzzleBoardPool.length],
  cardMindPool[(todayInt * 17) % cardMindPool.length]
];

// MOTDs
const MOTDS = [
  'sunday energy', 'monday momentum', 'tuesday turn', 'wednesday wave',
  'thursday throws', 'friday fever', 'saturday spirit',
  'perfect day for a high score', 'short break, long climb',
  'one more game', 'tap with intent', 'press start', 'the arcade is open',
  'perfect chess weather', 'card night', 'streak day', '29 ways to win'
];
const motd = MOTDS[(todayInt * 1103515245 + 12345) % MOTDS.length];
$('#motd').textContent = '> ' + motd;

// stats
function refreshStats() {
  const total = GAI.totalPlays();
  const st = GAI.streak.get();
  if (total === 0) {
    $('#stat-strip').innerHTML = '🕹 29 GAMES · ⚡ READY · 🔥 NEW HERE';
  } else {
    $('#taps-count').textContent = total.toLocaleString();
    $('#streak-count').textContent = st.current || 0;
    const e = $('#streak-emoji');
    if ((st.current || 0) >= 7) e.classList.add('hot'); else e.classList.remove('hot');
  }
}
refreshStats();

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

// recent
function renderRecent() {
  const recent = GAI.storage.getJSON('gai_recent', []);
  const sec = $('#recent');
  const strip = $('#recent-strip');
  if (!Array.isArray(recent) || recent.length === 0) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  strip.innerHTML = '';
  for (const r of recent) {
    const meta = GAMES.find(g => g.key === r.key);
    if (!meta) continue;
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

// tiles
const tiles = [];
const grid = $('#grid');
let entranceStagger = 0;
for (const g of GAMES) {
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
  canvas.width = 240; canvas.height = 160;
  canvas.setAttribute('aria-hidden','true');
  t.appendChild(canvas);
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
  if (g.key === 'poker' && GAI.storage.get('gai_poker_royal') === '1') {
    const crown = document.createElement('div');
    crown.style.cssText = 'position:absolute;top:14px;right:14px;font-size:14px;';
    crown.textContent = '👑';
    t.appendChild(crown);
  }
  t.addEventListener('click', (e) => {
    e.preventDefault();
    GAI.audio.ensure();
    GAI.transition.glitchTo(GAI.GAME_PATHS[g.key]);
  });
  t.addEventListener('mouseenter', () => fireHoverBlip(g.key));
  grid.appendChild(t);
  tiles.push({ meta: g, el: t, canvas, ctx: canvas.getContext('2d'), tick: g.preview, state: {}, visible: true });
}

// category tabs
const tabs = document.querySelectorAll('.tab');
function applyFilter(cat) {
  for (const t of tiles) {
    const show = cat === 'all' || t.meta.cat === cat;
    t.el.style.display = show ? '' : 'none';
  }
  for (const tab of tabs) tab.classList.toggle('active', tab.dataset.cat === cat);
  sessionStorage.setItem('gai_cat', cat);
}
const savedCat = sessionStorage.getItem('gai_cat') || 'all';
applyFilter(savedCat);
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    GAI.audio.ensure();
    GAI.audio.tone(560, 0.04, 'triangle', 0.10);
    applyFilter(tab.dataset.cat);
  });
}

// IntersectionObserver for previews
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const tile = tiles.find(t => t.el === e.target);
    if (tile) tile.visible = e.isIntersecting;
  }
}, { rootMargin: '50px' });
for (const t of tiles) io.observe(t.el);

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

// rAF
let lastT = 0;
const reduced = GAI.reducedMotion;
let bgDrawn = false;
let staticDrawn = false;
function frame(now) {
  const dt = Math.min(now - lastT, 50); lastT = now;
  if (!document.hidden) {
    if (reduced) {
      if (!bgDrawn) { drawBg(now); bgDrawn = true; }
      if (!staticDrawn) {
        for (const t of tiles) { try { t.tick(t.ctx, t.canvas.width, t.canvas.height, t.state, 0, now); } catch {} }
        staticDrawn = true;
      }
    } else {
      drawBg(now);
      for (const t of tiles) {
        if (!t.visible) continue;
        if (t.el.style.display === 'none') continue;
        try { t.tick(t.ctx, t.canvas.width, t.canvas.height, t.state, dt / 1000, now); } catch {}
      }
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (!document.hidden) lastT = performance.now(); });

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
    const cats = ['all','arcade','puzzle','board','cards','mind'];
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

// ====== PREVIEWS ======
function clr(ctx, w, h) { ctx.fillStyle = '#0a0a1e'; ctx.fillRect(0, 0, w, h); }
function shadeColor(hex, m) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${(r*m)|0},${(g*m)|0},${(b*m)|0})`;
}

function pvStack(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cyc = 3, phase = (s.t % cyc) / cyc;
  drawIso(ctx, w/2, h*0.7, 70, 18, PAL[0]);
  drawIso(ctx, w/2, h*0.55, 70, 18, PAL[1]);
  const drop = phase < 0.7 ? Math.max(-30, -30 + (phase/0.7)*25) : -5;
  const flash = phase >= 0.7 && phase < 0.85;
  drawIso(ctx, w/2, h*0.40 - drop, 70, 18, flash ? '#fff' : PAL[2]);
  if (flash) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(0,0,w,h); }
}
function drawIso(ctx, cx, cy, hw, hh, color) {
  const c30 = 0.866;
  const tR = { x: cx + hw*c30, y: cy + hw*0.25 };
  const tL = { x: cx - hw*c30, y: cy + hw*0.25 };
  const tT = { x: cx, y: cy };
  const tB = { x: cx, y: cy + hw*0.5 };
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(tT.x,tT.y); ctx.lineTo(tR.x,tR.y); ctx.lineTo(tB.x,tB.y); ctx.lineTo(tL.x,tL.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shadeColor(color, 0.7);
  ctx.beginPath(); ctx.moveTo(tR.x,tR.y); ctx.lineTo(tB.x,tB.y); ctx.lineTo(tB.x,tB.y+hh); ctx.lineTo(tR.x,tR.y+hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shadeColor(color, 0.55);
  ctx.beginPath(); ctx.moveTo(tL.x,tL.y); ctx.lineTo(tB.x,tB.y); ctx.lineTo(tB.x,tB.y+hh); ctx.lineTo(tL.x,tL.y+hh); ctx.closePath(); ctx.fill();
}
function pvSnake(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 5, cell = 10;
  for (let i = 0; i < N; i++) {
    const tau = s.t * 1.2 - i * 0.15;
    const x = w/2 + Math.sin(tau * 2) * 60;
    const y = h/2 + Math.sin(tau) * 28;
    ctx.fillStyle = i === 0 ? PAL[6] : PAL[2];
    ctx.fillRect(x - cell/2, y - cell/2, cell, cell);
  }
  ctx.fillStyle = PAL[7]; ctx.fillRect(w*0.78, h*0.5 - 5, 7, 7);
}
function pvBlocks(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 12, cols = 7, rows = 8;
  const x0 = (w - cols*cell)/2, y0 = h - rows*cell - 6;
  for (let c = 0; c < cols; c++) if ((c + (s.t|0)) % 7 < 5) { ctx.fillStyle = PAL[5]; ctx.fillRect(x0 + c*cell, y0 + (rows-1)*cell, cell-1, cell-1); }
  const phase = (s.t % 2.5) / 2.5;
  const tY = (phase < 0.7) ? phase / 0.7 * (rows - 3) : (rows - 3);
  ctx.fillStyle = phase >= 0.85 ? '#fff' : PAL[2];
  for (let i = 0; i < 3; i++) ctx.fillRect(x0 + (2+i)*cell, y0 + (tY|0)*cell, cell-1, cell-1);
  ctx.fillRect(x0 + 3*cell, y0 + ((tY|0)+1)*cell, cell-1, cell-1);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.strokeRect(x0, y0, cols*cell, rows*cell);
}
function pv2048(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 38; const x0 = (w - cell*2 - 8)/2, y0 = (h - cell)/2;
  const phase = (s.t % 2.5) / 2.5;
  if (phase < 0.45) {
    const t = phase / 0.45;
    drawTile(ctx, x0 + (1-t)*8, y0, cell, '2', PAL[7]);
    drawTile(ctx, x0 + cell + 8 + t*8, y0, cell, '2', PAL[7]);
  } else if (phase < 0.55) {
    const t = (phase - 0.45) / 0.10;
    const sc = 1 + 0.15 * Math.sin(t * Math.PI);
    ctx.save(); ctx.translate(x0 + cell/2 + 4, y0 + cell/2); ctx.scale(sc, sc);
    drawTile(ctx, -cell/2, -cell/2, cell, '4', PAL[8]); ctx.restore();
  } else {
    drawTile(ctx, x0 + 4, y0, cell, '4', PAL[8]);
  }
}
function drawTile(ctx, x, y, sz, txt, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, sz, sz);
  ctx.fillStyle = '#0a0a1e'; ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x + sz/2, y + sz/2);
}
function pvBreakout(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (!s.ball) s.ball = { x: w/2, y: h*0.45, vx: 60, vy: -50 };
  if (!s.bricks) s.bricks = [1,1,1,1,1,1,1,1];
  const bw = w / 8;
  for (let i = 0; i < 8; i++) if (s.bricks[i]) { ctx.fillStyle = PAL[i % PAL.length]; ctx.fillRect(i * bw + 1, 8, bw - 2, 10); }
  ctx.fillStyle = PAL[5]; ctx.fillRect(w/2 - 20, h - 14, 40, 4);
  for (let i = 5; i > 0; i--) { ctx.fillStyle = `rgba(0,245,255,${(0.15*i/5).toFixed(3)})`; ctx.fillRect(s.ball.x - i*2, s.ball.y - i*1.5, 4, 4); }
  ctx.fillStyle = '#fff'; ctx.fillRect(s.ball.x - 2, s.ball.y - 2, 4, 4);
  s.ball.x += s.ball.vx * dt; s.ball.y += s.ball.vy * dt;
  if (s.ball.x < 4 || s.ball.x > w - 4) s.ball.vx *= -1;
  if (s.ball.y > h - 18) s.ball.vy = -Math.abs(s.ball.vy);
  if (s.ball.y < 22) { s.ball.vy = Math.abs(s.ball.vy); const idx = Math.floor(s.ball.x/bw); if (s.bricks[idx]) s.bricks[idx] = 0; }
  if (s.bricks.every(b => !b)) s.bricks = [1,1,1,1,1,1,1,1];
}
function pvPong(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (!s.ball) s.ball = { x: w/2, y: h/2, vx: 60, vy: 35 };
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = PAL[5];
  ctx.fillRect(6, Math.max(8, Math.min(h-28, s.ball.y - 10)), 4, 20);
  ctx.fillRect(w - 10, Math.max(8, Math.min(h-28, s.ball.y - 10 + Math.sin(s.t*2)*8)), 4, 20);
  ctx.fillStyle = '#fff'; ctx.fillRect(s.ball.x - 2, s.ball.y - 2, 4, 4);
  s.ball.x += s.ball.vx * dt; s.ball.y += s.ball.vy * dt;
  if (s.ball.x < 14) s.ball.vx = Math.abs(s.ball.vx);
  if (s.ball.x > w - 14) s.ball.vx = -Math.abs(s.ball.vx);
  if (s.ball.y < 4 || s.ball.y > h - 4) s.ball.vy *= -1;
}
function pvFlap(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const px = w * 0.65, gapY = h * 0.5 + Math.sin(s.t * 0.7) * 15;
  ctx.fillStyle = PAL[6]; ctx.fillRect(px, 0, 18, gapY - 20); ctx.fillRect(px, gapY + 20, 18, h);
  const bx = w * 0.32, by = h * 0.5 + Math.sin(s.t * 3) * 12;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(s.t * 3 + 1.5) * 0.3);
  ctx.font = 'bold 14px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL[0]; ctx.fillText('G', 1.5, 0);
  ctx.fillStyle = PAL[5]; ctx.fillText('G', -1.5, 0);
  ctx.fillStyle = '#fff'; ctx.fillText('G', 0, 0); ctx.restore();
}
function pvInvaders(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect((i*31)%w, (i*17+(s.t*20))%h, 1, 1); }
  const off = Math.sin(s.t * 1.6) * 8;
  for (let i = 0; i < 4; i++) drawAlien(ctx, (w/2 - 60) + i * 28 + off, h * 0.5, PAL[6]);
  ctx.fillStyle = PAL[5]; ctx.fillRect(w/2 - 5, h - 14, 10, 4); ctx.fillRect(w/2 - 2, h - 18, 4, 4);
}
function drawAlien(ctx, x, y, color) {
  ctx.fillStyle = color;
  const px = [[0,1,0,0,0,1,0],[1,1,1,1,1,1,1],[1,0,1,1,1,0,1],[1,1,0,1,0,1,1]];
  const u = 2;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) if (px[r][c]) ctx.fillRect(x + c*u, y + r*u, u, u);
}
function pvAsteroids(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (!s.ax) { s.ax = w/2; s.ay = h/2; s.av = 18; s.ad = 0.5; }
  ctx.save(); ctx.translate(w * 0.3, h * 0.5); ctx.rotate(s.t * 0.4);
  ctx.strokeStyle = PAL[5]; ctx.lineWidth = 1.5;
  ctx.shadowColor = PAL[5]; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.stroke();
  ctx.restore(); ctx.shadowBlur = 0;
  s.ax += Math.cos(s.ad) * s.av * dt; s.ay += Math.sin(s.ad) * s.av * dt;
  if (s.ax < -10) s.ax = w + 10; if (s.ax > w + 10) s.ax = -10;
  if (s.ay < -10) s.ay = h + 10; if (s.ay > h + 10) s.ay = -10;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i <= 7; i++) {
    const a = i / 7 * Math.PI * 2 + s.t * 0.3;
    const r = 10 + (i % 2 === 0 ? 0 : 3);
    const x = s.ax + Math.cos(a) * r, y = s.ay + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
function pvBubbles(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const r = 11, cols = 5;
  for (let row = 0; row < 4; row++) for (let c = 0; c < cols; c++) {
    const off = row % 2 === 1 ? r : 0;
    const x = 18 + c * (r * 2 + 2) + off;
    const y = 14 + row * (r * 1.7);
    if (x > w - 14) continue;
    const ci = (row * 7 + c + (s.t|0)) % 6;
    ctx.fillStyle = ['#ff006e','#ffd60a','#06ffa5','#00f5ff','#8338ec','#ff9500'][ci];
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }
  // shooter
  const sx = w/2, sy = h - 18;
  ctx.fillStyle = PAL[0];
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
  const aim = Math.sin(s.t * 1.4) * 0.6 - Math.PI/2;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([2, 4]);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(aim) * 40, sy + Math.sin(aim) * 40); ctx.stroke(); ctx.setLineDash([]);
}
function pvRunner(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const horY = h * 0.7;
  ctx.fillStyle = '#1a0635'; ctx.fillRect(0, 0, w, horY);
  ctx.fillStyle = '#05050f'; ctx.fillRect(0, horY, w, h - horY);
  ctx.strokeStyle = 'rgba(255,0,110,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, horY); ctx.lineTo(w, horY); ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(w/2 + i * 30, h); ctx.lineTo(w/2, horY); ctx.stroke();
  }
  // obstacles
  const phase = (s.t * 60) % w;
  ctx.fillStyle = PAL[9];
  ctx.fillRect(w - phase, horY - 18, 14, 18);
  // player
  const py = horY - 12 + Math.sin(s.t * 4) * 6;
  ctx.font = 'bold 18px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL[0]; ctx.fillText('G', w*0.25+1.5, py);
  ctx.fillStyle = PAL[5]; ctx.fillText('G', w*0.25-1.5, py);
  ctx.fillStyle = '#fff'; ctx.fillText('G', w*0.25, py);
}
function pvMemory(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cyc = 3, phase = (s.t % cyc) / cyc;
  const cw = 30, ch = 38, x0 = w/2 - cw - 4, x1 = w/2 + 4, y0 = (h - ch) / 2;
  drawMemCard(ctx, x0, y0, cw, ch, phase, true);
  drawMemCard(ctx, x1, y0, cw, ch, phase, false);
  if (phase > 0.7) {
    ctx.fillStyle = `rgba(6,255,165,${((phase-0.7)/0.3 * 0.5).toFixed(3)})`;
    ctx.fillRect(x0 - 2, y0 - 2, cw + 4, ch + 4);
    ctx.fillRect(x1 - 2, y0 - 2, cw + 4, ch + 4);
  }
}
function drawMemCard(ctx, x, y, w, h, phase, left) {
  const flipping = phase < 0.4;
  if (flipping) {
    const t = left ? phase / 0.4 : Math.max(0, (phase - 0.1) / 0.3);
    const sc = Math.abs(Math.cos(t * Math.PI));
    ctx.save(); ctx.translate(x + w/2, y + h/2); ctx.scale(sc, 1);
    ctx.fillStyle = PAL[2]; ctx.fillRect(-w/2, -h/2, w, h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 6px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GAI', 0, 0); ctx.restore();
  } else {
    ctx.fillStyle = PAL[6]; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PAL[0]; ctx.beginPath(); ctx.arc(x + w/2, y + h/2, 8, 0, Math.PI * 2); ctx.fill();
  }
}
function pvMines(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 16, cols = 6, rows = 5;
  const x0 = (w - cols*cell)/2, y0 = (h - rows*cell)/2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.fillStyle = (r + c) % 2 === 0 ? '#2a1a4a' : '#1f1235';
    ctx.fillRect(x0 + c*cell + 1, y0 + r*cell + 1, cell - 2, cell - 2);
  }
  if (((s.t % 2) / 2) > 0.5) {
    const cx = x0 + 2 * cell, cy = y0 + 2 * cell;
    ctx.fillStyle = '#0a0a1e'; ctx.fillRect(cx + 1, cy + 1, cell - 2, cell - 2);
    ctx.fillStyle = PAL[5]; ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('3', cx + cell/2, cy + cell/2);
  }
}
function pvSlide(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 24, x0 = (w - 3*cell)/2, y0 = (h - 3*cell)/2;
  const slide = Math.sin((s.t % 3) / 3 * Math.PI * 2) * 0.3;
  const nums = ['3','7','1'];
  for (let i = 0; i < 3; i++) {
    const off = (i === 1 ? slide * cell : 0);
    const x = x0 + i*cell + off, y = y0 + cell;
    ctx.fillStyle = PAL[(i + Math.floor(s.t)) % PAL.length];
    ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    ctx.fillStyle = '#0a0a1e'; ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nums[i], x + cell/2, y + cell/2);
  }
}
function pvLightsOut(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (!s.grid) s.grid = [[1,0,1,1,0],[0,1,1,0,1],[1,1,0,1,1],[0,1,1,1,0],[1,0,1,0,1]];
  const phase = (s.t % 3.5) / 3.5;
  const tog = Math.floor(phase * 6);
  if (tog >= 5) s.grid = [[1,0,1,1,0],[0,1,1,0,1],[1,1,0,1,1],[0,1,1,1,0],[1,0,1,0,1]];
  const cell = 18, x0 = (w - 5*cell)/2, y0 = (h - 5*cell)/2;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const lit = s.grid[r][c];
    ctx.fillStyle = lit ? PAL[1] : '#1f1235';
    ctx.fillRect(x0 + c*cell + 1, y0 + r*cell + 1, cell - 2, cell - 2);
    if (lit) { ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x0 + c*cell + 3, y0 + r*cell + 3, cell - 6, 2); }
  }
}
function pvWords(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 22, letters = ['G','A','M','E','S'];
  const colors = [PAL[6], PAL[7], '#3a2a4a', PAL[6], PAL[7]];
  const x0 = (w - 5*cell - 4*2)/2, y0 = (h - cell)/2;
  const revealed = Math.floor((s.t % 3) / 3 * 6);
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * (cell + 2);
    const shown = i < revealed;
    ctx.fillStyle = shown ? colors[i] : '#1f1235';
    ctx.fillRect(x, y0, cell, cell);
    if (shown) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(letters[i], x + cell/2, y0 + cell/2);
    }
  }
}
function pvSudoku(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 14, x0 = (w - 9*cell)/2, y0 = (h - 9*cell)/2;
  for (let i = 0; i <= 9; i++) {
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = i % 3 === 0 ? 1.5 : 0.5;
    ctx.beginPath(); ctx.moveTo(x0 + i*cell, y0); ctx.lineTo(x0 + i*cell, y0 + 9*cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0 + i*cell); ctx.lineTo(x0 + 9*cell, y0 + i*cell); ctx.stroke();
  }
  const idx = Math.floor(s.t * 1.2) % 9;
  ctx.fillStyle = PAL[5]; ctx.font = 'bold 9px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= idx; i++) {
    const r = (i * 3 + 1) % 9, c = (i * 7 + 2) % 9;
    ctx.fillText(String((i % 9) + 1), x0 + c*cell + cell/2, y0 + r*cell + cell/2);
  }
}
function pvDots(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 4, cell = 22, x0 = (w - N*cell)/2, y0 = (h - N*cell)/2;
  // dots
  for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) {
    ctx.beginPath(); ctx.arc(x0 + c*cell, y0 + r*cell, 2, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }
  // claimed
  const phase = (s.t % 3) / 3;
  if (phase > 0.3) { ctx.fillStyle = 'rgba(255,0,110,0.55)'; ctx.fillRect(x0 + cell + 2, y0 + cell + 2, cell - 4, cell - 4); ctx.fillStyle = '#fff'; ctx.font='bold 10px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('P', x0 + cell + cell/2, y0 + cell + cell/2); }
  if (phase > 0.6) { ctx.fillStyle = 'rgba(255,214,10,0.55)'; ctx.fillRect(x0 + 2*cell + 2, y0 + 2*cell + 2, cell - 4, cell - 4); ctx.fillStyle = '#fff'; ctx.font='bold 10px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('A', x0 + 2*cell + cell/2, y0 + 2*cell + cell/2); }
  // edges
  ctx.strokeStyle = PAL[5]; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y0 + cell); ctx.lineTo(x0 + cell, y0 + cell); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0 + cell, y0 + cell); ctx.lineTo(x0 + cell, y0 + 2*cell); ctx.stroke();
}
function pvTTT(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 30, x0 = (w - cell*3)/2, y0 = (h - cell*3)/2;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x0 + i*cell, y0); ctx.lineTo(x0 + i*cell, y0 + 3*cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0 + i*cell); ctx.lineTo(x0 + 3*cell, y0 + i*cell); ctx.stroke();
  }
  const phase = (s.t % 3) / 3;
  drawX(ctx, x0, y0, cell, Math.min(1, phase / 0.25));
  drawO(ctx, x0 + cell, y0 + cell, cell, Math.max(0, Math.min(1, (phase - 0.25) / 0.25)));
  drawX(ctx, x0 + 2*cell, y0 + 2*cell, cell, Math.max(0, Math.min(1, (phase - 0.5) / 0.25)));
  if (phase > 0.75) {
    const t = (phase - 0.75) / 0.25;
    ctx.strokeStyle = PAL[7]; ctx.lineWidth = 3;
    ctx.shadowColor = PAL[7]; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 4);
    ctx.lineTo(x0 + 4 + t * (3*cell - 8), y0 + 4 + t * (3*cell - 8));
    ctx.stroke(); ctx.shadowBlur = 0;
  }
}
function drawX(ctx, x, y, sz, t) {
  if (t <= 0) return;
  ctx.strokeStyle = PAL[0]; ctx.lineWidth = 2; const m = 6;
  ctx.beginPath(); ctx.moveTo(x + m, y + m); ctx.lineTo(x + m + (sz - 2*m) * Math.min(1, t * 2), y + m + (sz - 2*m) * Math.min(1, t * 2)); ctx.stroke();
  if (t > 0.5) { ctx.beginPath(); ctx.moveTo(x + sz - m, y + m); ctx.lineTo(x + sz - m - (sz - 2*m) * ((t - 0.5) * 2), y + m + (sz - 2*m) * ((t - 0.5) * 2)); ctx.stroke(); }
}
function drawO(ctx, x, y, sz, t) {
  if (t <= 0) return;
  ctx.strokeStyle = PAL[5]; ctx.lineWidth = 2; const r = (sz - 12) / 2;
  ctx.beginPath(); ctx.arc(x + sz/2, y + sz/2, r, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * t); ctx.stroke();
}
function pvChess(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 18, x0 = (w - cell*4)/2, y0 = (h - cell*4)/2;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    ctx.fillStyle = (r + c) % 2 === 0 ? '#1a1147' : '#0e0828';
    ctx.fillRect(x0 + c*cell, y0 + r*cell, cell, cell);
  }
  ctx.font = 'bold 14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const phase = (s.t % 3) / 3;
  ctx.fillStyle = '#fff'; ctx.fillText('♚', x0 + cell*0.5, y0 + cell*0.5);
  ctx.fillStyle = '#fff'; ctx.fillText('♕', x0 + cell*3.5, y0 + cell*3.5);
  if (phase > 0.5) {
    ctx.fillStyle = '#fff'; ctx.fillText('♕', x0 + cell*0.5, y0 + cell*2.5);
    ctx.strokeStyle = PAL[9]; ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, cell, cell);
  } else {
    ctx.fillStyle = '#fff'; ctx.fillText('♕', x0 + cell*0.5, y0 + cell*3.5);
  }
}
function pvCheckers(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 6, cell = 14, x0 = (w - N*cell)/2, y0 = (h - N*cell)/2;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = (r + c) % 2 === 1 ? '#3a0ca3' : '#1a0635';
    ctx.fillRect(x0 + c*cell, y0 + r*cell, cell, cell);
  }
  const positions = [[0,1],[1,2],[2,3],[3,4]];
  const phase = (s.t % 3) / 3;
  const idx = Math.min(positions.length - 1, Math.floor(phase * 4));
  ctx.fillStyle = PAL[9];
  ctx.beginPath(); ctx.arc(x0 + positions[idx][1] * cell + cell/2, y0 + positions[idx][0] * cell + cell/2, cell * 0.35, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = PAL[7];
  ctx.beginPath(); ctx.arc(x0 + 4 * cell + cell/2, y0 + 4 * cell + cell/2, cell * 0.35, 0, Math.PI*2); ctx.fill();
}
function pvC4(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cols = 7, rows = 5, cell = 14;
  const x0 = (w - cols*cell)/2, y0 = (h - rows*cell)/2;
  ctx.fillStyle = '#3a0ca3'; ctx.fillRect(x0, y0, cols*cell, rows*cell);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.beginPath(); ctx.arc(x0 + c*cell + cell/2, y0 + r*cell + cell/2, cell * 0.35, 0, Math.PI*2);
    ctx.fillStyle = '#0a0a1e'; ctx.fill();
  }
  const board = [[0,0,0,2,0,0,0],[0,0,0,1,0,0,0],[0,0,2,1,0,0,0],[2,1,1,2,0,0,0]];
  const phase = (s.t % 3) / 3;
  const visRows = Math.floor(phase * board.length) + 1;
  for (let r = 0; r < Math.min(visRows, board.length); r++) for (let c = 0; c < cols; c++) {
    if (board[r][c] === 0) continue;
    const y = y0 + (r + 1) * cell + cell/2;
    ctx.beginPath(); ctx.arc(x0 + c*cell + cell/2, y, cell * 0.35, 0, Math.PI*2);
    ctx.fillStyle = board[r][c] === 1 ? PAL[9] : PAL[7]; ctx.fill();
  }
}
function pvBattleship(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 6, cell = 16;
  const x0 = (w - N*cell)/2, y0 = (h - N*cell)/2;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = (r + c) % 2 === 0 ? '#0a1a30' : '#091428';
    ctx.fillRect(x0 + c*cell, y0 + r*cell, cell, cell);
  }
  // ship hit
  ctx.fillStyle = PAL[9];
  ctx.fillRect(x0 + 2*cell + 3, y0 + 2*cell + 3, cell - 6, cell - 6);
  // miss markers
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x0 + 4*cell + cell/2, y0 + 1*cell + cell/2, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x0 + 1*cell + cell/2, y0 + 4*cell + cell/2, 2, 0, Math.PI*2); ctx.fill();
  // shockwave
  const phase = (s.t % 2.4) / 2.4;
  if (phase < 0.4) {
    const radius = phase / 0.4 * cell * 0.8;
    ctx.strokeStyle = `rgba(239,35,60,${(1 - phase/0.4).toFixed(2)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x0 + 2*cell + cell/2, y0 + 2*cell + cell/2, radius, 0, Math.PI*2); ctx.stroke();
  }
}
function pvBlackjack(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cw = 38, ch = 54;
  drawMiniCard(ctx, w/2 - cw - 4, h/2 - ch/2, cw, ch, 'A', '♠', false);
  drawMiniCard(ctx, w/2 + 4, h/2 - ch/2, cw, ch, 'K', '♥', true);
  ctx.fillStyle = PAL[6];
  ctx.font = 'bold 11px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('21', w / 2, h - 12);
}
function pvPoker(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cw = 28, ch = 40;
  const cards = [['A','♠'],['K','♠'],['Q','♠'],['J','♠'],['10','♠']];
  const phase = (s.t % 4) / 4;
  const rainbow = phase > 0.6;
  for (let i = 0; i < 5; i++) {
    drawMiniCard(ctx, 12 + i * (cw + 4), (h - ch) / 2 + (rainbow ? Math.sin(s.t * 3 + i * 0.8) * 3 : 0), cw, ch, cards[i][0], cards[i][1], false);
  }
  if (rainbow) {
    ctx.fillStyle = PAL[7];
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ROYAL', w/2, h - 10);
  }
}
function drawMiniCard(ctx, x, y, w, h, rank, suit, red) {
  ctx.fillStyle = '#fff'; GAI.fx.roundRect(ctx, x, y, w, h, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(10,10,30,0.5)'; ctx.lineWidth = 1; GAI.fx.roundRect(ctx, x, y, w, h, 4); ctx.stroke();
  ctx.fillStyle = red ? '#ef233c' : '#1a1a30';
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(rank, x + 3, y + 3);
  ctx.font = 'bold 14px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(suit, x + w/2, y + h/2);
}
function pvSolitaire(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  // 4 foundation slots
  for (let i = 0; i < 4; i++) {
    const x = 14 + i * 28, y = 16;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; GAI.fx.roundRect(ctx, x, y, 22, 30, 3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(['♠','♥','♦','♣'][i], x + 11, y + 15);
  }
  // cascade
  const phase = (s.t % 3) / 3;
  for (let i = 0; i < 5; i++) {
    const x = 24 + (i % 5) * 16;
    const y = 60 + Math.abs(Math.sin(s.t + i)) * 10 + i * 6;
    drawMiniCard(ctx, x, y, 18, 24, ['A','2','3','4','5'][i], '♠', false);
  }
}
function pvHearts(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  // four cards from four positions converging to center
  const phase = (s.t % 3) / 3;
  const cards = [['Q','♠'],['A','♥'],['K','♦'],['J','♣']];
  const reds = [false, true, true, false];
  const positions = [
    { x: w/2 - 16, y: h - 36 },     // bottom (player)
    { x: 8, y: h/2 - 20 },           // left
    { x: w/2 - 16, y: 4 },           // top
    { x: w - 40, y: h/2 - 20 }       // right
  ];
  const cx = w/2 - 16, cy = h/2 - 20;
  for (let i = 0; i < 4; i++) {
    const t = Math.min(1, phase * 2);
    const x = positions[i].x + (cx - positions[i].x) * t;
    const y = positions[i].y + (cy - positions[i].y) * t;
    drawMiniCard(ctx, x, y, 32, 40, cards[i][0], cards[i][1], reds[i]);
  }
}
function pvSimon(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const phase = (s.t % 2.4) / 2.4;
  const idx = Math.floor(phase * 4);
  const colors = [PAL[0], PAL[5], PAL[6], PAL[7]];
  const cx = w/2, cy = h/2, sz = 30;
  for (let i = 0; i < 4; i++) {
    const qx = cx + (i % 2 === 0 ? -sz : 0);
    const qy = cy + (i < 2 ? -sz : 0);
    const active = i === idx;
    ctx.fillStyle = active ? colors[i] : shadeColor(colors[i], 0.3);
    if (active) { ctx.shadowColor = colors[i]; ctx.shadowBlur = 14; }
    ctx.fillRect(qx + 1, qy + 1, sz - 2, sz - 2);
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = '#0a0a1e'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2); ctx.fill();
}
function pvReaction(ctx, w, h, s, dt) {
  s.t = (s.t || 0) + dt;
  const phase = (s.t % 3) / 3;
  if (phase < 0.5) {
    ctx.fillStyle = PAL[9]; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('WAIT', w/2, h/2);
  } else {
    ctx.fillStyle = PAL[6]; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a1e'; ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TAP!', w/2, h/2);
  }
}

})();
