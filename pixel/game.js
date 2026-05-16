(() => {
'use strict';
const GAI = window.GAI;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const szEl = document.getElementById('sz');
const mistEl = document.getElementById('mist');
const bestEl = document.getElementById('best');
const sizeBtn = document.getElementById('sizeBtn');
const modeBtn = document.getElementById('modeBtn');
const newBtn = document.getElementById('newBtn');

const SIZES = [5, 10, 15];
let sizeIdx = +(GAI.storage.get('gai_pixel_size_idx') || 0);
let N = SIZES[sizeIdx];
let solution = [];
let cells = [];     // -1=marked empty, 0=blank, 1=filled
let mistakes = 0;
let mode = 'fill';  // fill | mark
let solved = false;
let designName = '';
let startTs = 0;
let cell = 28;

// Curated designs per size — palette-color encoded numerics
const DESIGNS_5 = [
  { name: 'HEART', g: [[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]] },
  { name: 'ARROW', g: [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0]] },
  { name: 'STAR',  g: [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,0,1,0],[1,0,0,0,1]] },
  { name: 'BOOK',  g: [[1,1,1,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,1,1,1]] },
  { name: 'CUP',   g: [[1,1,1,1,0],[1,0,0,1,1],[1,0,0,1,1],[1,1,1,1,0],[0,1,1,0,0]] },
  { name: 'KEY',   g: [[0,0,1,1,1],[0,0,1,0,1],[1,1,1,0,0],[1,0,0,0,0],[1,0,1,1,0]] },
  { name: 'EYE',   g: [[0,1,1,1,0],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[0,1,1,1,0]] },
  { name: 'FACE',  g: [[0,1,1,1,0],[1,0,1,0,1],[1,1,1,1,1],[1,0,0,0,1],[0,1,1,1,0]] }
];
const DESIGNS_10 = [
  { name: 'ROCKET', g: [
    [0,0,0,0,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,0,1,0,0,1,0,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,0,1,1,1,1,0,1,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,0,1,0,0,1,0,0,0]
  ] },
  { name: 'CASSETTE', g: [
    [0,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,0,0,1,0,0,1,0,0,1],
    [1,0,0,1,0,0,1,0,0,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1],
    [0,1,0,0,0,0,0,0,1,0]
  ] },
  { name: 'CAT', g: [
    [1,0,0,0,0,0,0,0,0,1],
    [1,1,0,0,0,0,0,0,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,1,0,1,1,0,1,0,1],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,0,1,1,0,1,1,1],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,0,1,0,0,1,0,0,0]
  ] },
  { name: 'SUN', g: [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,0,1,1,1,1,0,0,0]
  ] }
];
const DESIGNS_15 = [
  { name: 'CHROMATIC-G', g: ((() => {
    // 15x15 G letter
    const G = [];
    for (let i = 0; i < 15; i++) G.push(new Array(15).fill(0));
    // outer ring 'G'
    for (let c = 3; c <= 11; c++) { G[2][c] = 1; G[12][c] = 1; }
    for (let r = 3; r <= 11; r++) { G[r][2] = 1; G[r][12] = (r >= 7) ? 1 : 0; }
    for (let r = 7; r <= 9; r++) { G[r][8] = 1; G[r][9] = 1; G[r][10] = 1; }
    G[8][7] = 1;
    return G;
  })()) },
  { name: 'VINYL', g: ((() => {
    const out = [];
    for (let r = 0; r < 15; r++) out.push(new Array(15).fill(0));
    for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
      const d = Math.hypot(r - 7, c - 7);
      if (d < 7 && d > 5) out[r][c] = 1;
      if (d < 5 && d > 3) out[r][c] = 1;
      if (d < 1.5) out[r][c] = 1;
    }
    return out;
  })()) }
];

function pickDesign() {
  const seed = GAI.dailySeed('pixel-' + N);
  const rng = GAI.rng(seed);
  const pool = N === 5 ? DESIGNS_5 : N === 10 ? DESIGNS_10 : DESIGNS_15;
  return pool[Math.floor(rng() * pool.length)];
}

function newGame() {
  N = SIZES[sizeIdx];
  szEl.textContent = N;
  const d = pickDesign();
  solution = d.g; designName = d.name;
  cells = [];
  for (let r = 0; r < N; r++) cells.push(new Array(N).fill(0));
  mistakes = 0; mistEl.textContent = mistakes;
  solved = false;
  mode = 'fill'; modeBtn.textContent = 'MODE: FILL';
  status.textContent = 'FILL TO MATCH THE NUMBERS';
  status.className = 'status';
  startTs = Date.now();
  fit();
  draw();
}

function rowHints(r) {
  const out = [];
  let run = 0;
  for (let c = 0; c < N; c++) {
    if (solution[r][c]) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out.length ? out : [0];
}
function colHints(c) {
  const out = [];
  let run = 0;
  for (let r = 0; r < N; r++) {
    if (solution[r][c]) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out.length ? out : [0];
}

function fit() {
  const labelSpace = Math.max(60, N * 9 + 20);
  const maxW = Math.min(window.innerWidth - 32, 540);
  const maxH = Math.min(window.innerHeight - 280, 540);
  const sz = Math.min(maxW, maxH) - labelSpace;
  cell = Math.max(18, Math.floor(sz / N));
  const w = labelSpace + cell * N;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = w * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = w + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw() {
  const labelSpace = Math.max(60, N * 9 + 20);
  const w = canvas.clientWidth;
  ctx.clearRect(0, 0, w, w);
  // row hints
  ctx.fillStyle = '#fff';
  const labelFont = Math.max(8, Math.floor(cell * 0.34));
  ctx.font = labelFont + 'px "Press Start 2P", monospace';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let r = 0; r < N; r++) {
    const h = rowHints(r);
    let x = labelSpace - 6;
    for (let i = h.length - 1; i >= 0; i--) {
      ctx.fillStyle = h[i] === 0 ? 'rgba(255,255,255,0.3)' : '#00f5ff';
      ctx.fillText(String(h[i]), x, labelSpace + r * cell + cell / 2);
      x -= labelFont + 4;
    }
  }
  // col hints
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  for (let c = 0; c < N; c++) {
    const h = colHints(c);
    let y = labelSpace - 4;
    for (let i = h.length - 1; i >= 0; i--) {
      ctx.fillStyle = h[i] === 0 ? 'rgba(255,255,255,0.3)' : '#00f5ff';
      ctx.fillText(String(h[i]), labelSpace + c * cell + cell / 2, y);
      y -= labelFont + 4;
    }
  }
  // cells
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x = labelSpace + c * cell, y = labelSpace + r * cell;
    ctx.fillStyle = (r + c) % 2 === 0 ? '#0d0c1f' : '#0a0a1e';
    ctx.fillRect(x, y, cell, cell);
    if (cells[r][c] === 1) {
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    } else if (cells[r][c] === -1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + cell - 6, y + cell - 6);
      ctx.moveTo(x + cell - 6, y + 6); ctx.lineTo(x + 6, y + cell - 6);
      ctx.stroke();
    }
  }
  // grid lines
  for (let i = 0; i <= N; i++) {
    ctx.strokeStyle = i % 5 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.5;
    ctx.beginPath(); ctx.moveTo(labelSpace + i * cell, labelSpace); ctx.lineTo(labelSpace + i * cell, labelSpace + N * cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(labelSpace, labelSpace + i * cell); ctx.lineTo(labelSpace + N * cell, labelSpace + i * cell); ctx.stroke();
  }
  if (solved) {
    ctx.fillStyle = 'rgba(255,214,10,0.85)';
    ctx.font = 'bold ' + Math.round(cell * 0.6) + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(designName, w / 2, labelSpace / 2);
  }
}

function pickCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const labelSpace = Math.max(60, N * 9 + 20);
  const x = clientX - rect.left, y = clientY - rect.top;
  if (x < labelSpace || y < labelSpace) return null;
  const c = Math.floor((x - labelSpace) / cell);
  const r = Math.floor((y - labelSpace) / cell);
  if (r < 0 || r >= N || c < 0 || c >= N) return null;
  return { r, c };
}

function tap(r, c) {
  if (solved || mistakes >= 3) return;
  GAI.audio.ensure();
  if (mode === 'fill') {
    if (cells[r][c] !== 0) return;
    if (solution[r][c]) {
      cells[r][c] = 1;
      GAI.audio.tone(660, 0.05, 'square', 0.10);
      checkWin();
    } else {
      mistakes++;
      mistEl.textContent = mistakes;
      cells[r][c] = -1; // mark wrong fills as empty to keep progress visible
      GAI.audio.tone(180, 0.08, 'sawtooth', 0.12);
      GAI.fx.screenShake(canvas, 4, 200);
      if (mistakes >= 3) {
        status.textContent = '× TOO MANY MISTAKES — TAP NEW';
        status.className = 'status lose';
      }
    }
  } else {
    cells[r][c] = cells[r][c] === -1 ? 0 : -1;
    GAI.audio.tone(330, 0.04, 'triangle', 0.08);
  }
  draw();
}

function checkWin() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (solution[r][c] && cells[r][c] !== 1) return;
  }
  solved = true;
  status.textContent = '✦ ' + designName + ' REVEALED!';
  status.className = 'status win';
  GAI.recordWin('pixel');
  GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 70, 'triangle', 0.18);
  GAI.fx.chromaticFlash(400);
  GAI.fx.confetti();
  const sec = Math.floor((Date.now() - startTs) / 1000);
  const key = 'gai_best_pixel_' + N;
  const cur = +GAI.storage.get(key) || Infinity;
  if (sec < cur) { GAI.storage.set(key, String(sec)); bestEl.textContent = sec + 's'; }
  GAI.bestScore('pixel', N);
}

canvas.addEventListener('click', (e) => { const p = pickCell(e.clientX, e.clientY); if (p) tap(p.r, p.c); });
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  const p = pickCell(e.touches[0].clientX, e.touches[0].clientY); if (p) tap(p.r, p.c);
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const p = pickCell(e.clientX, e.clientY); if (!p) return;
  const prev = mode; mode = 'mark'; tap(p.r, p.c); mode = prev;
});
sizeBtn.addEventListener('click', () => { sizeIdx = (sizeIdx + 1) % SIZES.length; GAI.storage.set('gai_pixel_size_idx', sizeIdx); newGame(); });
modeBtn.addEventListener('click', () => {
  mode = mode === 'fill' ? 'mark' : 'fill';
  modeBtn.textContent = 'MODE: ' + mode.toUpperCase();
});
newBtn.addEventListener('click', newGame);
document.addEventListener('keydown', (e) => {
  if (e.key === 'x' || e.key === 'X' || e.key === 'm' || e.key === 'M') { modeBtn.click(); }
});
let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });
const best = +(GAI.storage.get('gai_best_pixel_' + N) || 0);
bestEl.textContent = best > 0 ? best + 's' : '—';
GAI.stats.sessionStart('pixel');
window.addEventListener('pagehide', () => GAI.stats.sessionEnd('pixel'));

newGame();
})();
