(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const splash = document.getElementById('splash');
const over = document.getElementById('over');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const finalEl = document.getElementById('final');

const COLS = 10, ROWS = 20;
let cell = 30, dpr = 1;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  cell = Math.floor(rect.width / COLS);
  canvas.width = COLS * cell * dpr;
  canvas.height = ROWS * cell * dpr;
  canvas.style.width = COLS * cell + 'px';
  canvas.style.height = ROWS * cell + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  nextCanvas.width = 80 * dpr; nextCanvas.height = 80 * dpr;
  nextCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fit();
window.addEventListener('resize', fit);

// 7 pieces (no logos): I, O, T, S, Z, J, L
const PIECES = {
  I: { c: 5, shapes: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ] },
  O: { c: 7, shapes: [
    [[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]]
  ] },
  T: { c: 2, shapes: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ] },
  S: { c: 6, shapes: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
  ] },
  Z: { c: 0, shapes: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
  ] },
  J: { c: 4, shapes: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
  ] },
  L: { c: 8, shapes: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
  ] }
};
const KEYS = Object.keys(PIECES);

let grid = [];
let piece = null;
let nextK = null;
let state = 'splash';
let score = 0, linesCleared = 0, level = 1;
let lastT = 0, dropAccum = 0, dropInterval = 1000;
let best = +(GAI.storage.get('gai_best_blocks') || 0);
bestEl.textContent = best;

function reset() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(0);
    grid.push(row);
  }
  score = 0; linesCleared = 0; level = 1; dropInterval = 1000;
  scoreEl.textContent = '0'; linesEl.textContent = '0'; levelEl.textContent = '1';
  nextK = KEYS[Math.floor(Math.random() * 7)];
  spawnPiece();
}

function spawnPiece() {
  const k = nextK || KEYS[Math.floor(Math.random() * 7)];
  nextK = KEYS[Math.floor(Math.random() * 7)];
  const def = PIECES[k];
  const shape = def.shapes[0];
  piece = {
    key: k, color: PAL[def.c], rot: 0,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: -getTopOffset(shape),
    shape
  };
  if (collides(piece, piece.x, piece.y)) {
    endGame();
  }
  drawNext();
}
function getTopOffset(shape) {
  for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[0].length; c++) if (shape[r][c]) return r;
  return 0;
}

function collides(p, nx, ny) {
  for (let r = 0; r < p.shape.length; r++) {
    for (let c = 0; c < p.shape[r].length; c++) {
      if (!p.shape[r][c]) continue;
      const gx = nx + c, gy = ny + r;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx]) return true;
    }
  }
  return false;
}

function freeze() {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const gx = piece.x + c, gy = piece.y + r;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) grid[gy][gx] = piece.color;
    }
  }
  GAI.audio.tone(220 + (piece.color.charCodeAt(1) % 7) * 30, 0.06, 'square', 0.12, 0.005, 0.05);
  clearLines();
  spawnPiece();
}

function clearLines() {
  let cleared = 0;
  const lineYs = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r].every(v => v)) {
      lineYs.push(r);
      cleared++;
    }
  }
  if (cleared === 0) return;
  // remove
  for (const y of lineYs) grid.splice(y, 1);
  for (let i = 0; i < cleared; i++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(0);
    grid.unshift(row);
  }
  const PT = [0, 100, 300, 500, 800][cleared];
  score += PT * level;
  linesCleared += cleared;
  if (linesCleared >= level * 10) {
    level++; dropInterval = Math.max(50, 1000 * Math.pow(0.85, level - 1));
  }
  scoreEl.textContent = score; linesEl.textContent = linesCleared; levelEl.textContent = level;
  if (cleared === 4) {
    // tetris wow: shake + flash + arpeggio
    canvas.classList.remove('shake');
    void canvas.offsetWidth;
    canvas.classList.add('shake');
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51, 1568, 1975], 70, 'sawtooth', 0.18);
    GAI.haptic([20, 40, 20, 40]);
    flashScreen();
  } else {
    GAI.audio.arpeggio([523.25, 783.99], 60, 'triangle', 0.16);
  }
}

let flashTime = 0;
function flashScreen() { flashTime = 350; }

function drop() {
  if (!piece) return;
  if (collides(piece, piece.x, piece.y + 1)) freeze();
  else piece.y++;
}

function move(dx) { if (!collides(piece, piece.x + dx, piece.y)) piece.x += dx; }

function rotate(dir) {
  const def = PIECES[piece.key];
  const nextRot = (piece.rot + dir + 4) % 4;
  const newShape = def.shapes[nextRot];
  const old = piece.shape;
  piece.shape = newShape;
  if (!collides(piece, piece.x, piece.y)) { piece.rot = nextRot; return; }
  // wall kicks (simple)
  for (const k of [-1, 1, -2, 2]) {
    if (!collides(piece, piece.x + k, piece.y)) { piece.x += k; piece.rot = nextRot; return; }
  }
  piece.shape = old;
}

function hardDrop() {
  while (!collides(piece, piece.x, piece.y + 1)) { piece.y++; score++; }
  freeze();
  scoreEl.textContent = score;
}

function endGame() {
  state = 'over';
  GAI.audio.arpeggio([440, 369.99, 311.13], 130, 'sawtooth', 0.16);
  finalEl.textContent = score;
  if (score > best) { best = score; GAI.bestScore('blocks', best); bestEl.textContent = best; }
  setTimeout(() => over.classList.remove('hidden'), 300);
}

function startGame() {
  GAI.audio.ensure();
  reset();
  splash.classList.add('hidden');
  over.classList.add('hidden');
  state = 'playing';
}

let paused = false;
function loop(now) {
  const dt = Math.min(now - lastT, 100);
  lastT = now;
  if (state === 'playing' && !paused) {
    dropAccum += dt;
    while (dropAccum >= dropInterval) { drop(); dropAccum -= dropInterval; if (state !== 'playing') break; }
  }
  if (flashTime > 0) flashTime -= dt;
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function render() {
  const W = COLS * cell, H = ROWS * cell;
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, H);
  // grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, H); ctx.stroke(); }
  for (let i = 0; i <= ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke(); }
  // grid
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c]) drawCell(c, r, grid[r][c]);
  }
  // ghost
  if (piece) {
    let gy = piece.y;
    while (!collides(piece, piece.x, gy + 1)) gy++;
    drawPiece(piece, piece.x, gy, 0.18);
    drawPiece(piece, piece.x, piece.y, 1);
  }
  // flash
  if (flashTime > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(flashTime / 350 * 0.5).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawCell(c, r, color) {
  const x = c * cell, y = r * cell;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 1, y + 1, cell - 2, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 1, y + cell - 4, cell - 2, 3);
}

function drawPiece(p, px, py, alpha) {
  ctx.globalAlpha = alpha;
  for (let r = 0; r < p.shape.length; r++) for (let c = 0; c < p.shape[r].length; c++) {
    if (p.shape[r][c]) drawCell(px + c, py + r, p.color);
  }
  ctx.globalAlpha = 1;
}

function drawNext() {
  const w = nextCanvas.width / (window.devicePixelRatio < 2 ? window.devicePixelRatio || 1 : 2);
  nextCtx.fillStyle = '#050510';
  nextCtx.fillRect(0, 0, 80, 80);
  if (!nextK) return;
  const def = PIECES[nextK];
  const shape = def.shapes[0];
  const sz = 16;
  const ox = (80 - shape[0].length * sz) / 2;
  const oy = (80 - shape.length * sz) / 2;
  for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) {
    if (!shape[r][c]) continue;
    nextCtx.fillStyle = PAL[def.c];
    nextCtx.fillRect(ox + c * sz + 1, oy + r * sz + 1, sz - 2, sz - 2);
    nextCtx.fillStyle = 'rgba(255,255,255,0.2)';
    nextCtx.fillRect(ox + c * sz + 1, oy + r * sz + 1, sz - 2, 3);
  }
}

document.addEventListener('keydown', (e) => {
  if (state !== 'playing') {
    if (e.key === ' ' || e.key === 'Enter') startGame();
    return;
  }
  if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); drop(); }
  else if (e.key === 'ArrowUp' || e.key === 'x') { e.preventDefault(); rotate(1); }
  else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); rotate(-1); }
  else if (e.key === ' ') { e.preventDefault(); hardDrop(); }
  else if (e.key === 'p' || e.key === 'P') paused = !paused;
});

let sx = 0, sy = 0, sT = 0;
canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; sT = performance.now(); e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (state !== 'playing') { startGame(); return; }
  const t = e.changedTouches[0];
  const dx = t.clientX - sx, dy = t.clientY - sy;
  const dt = performance.now() - sT;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18 && dt < 250) { rotate(1); return; }
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else { if (dy > 60) hardDrop(); else if (dy > 18) drop(); }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

splash.addEventListener('click', startGame);
over.addEventListener('click', (e) => { if (e.target.closest('button, a')) return; startGame(); });

reset();
})();
