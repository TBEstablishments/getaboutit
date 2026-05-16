(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const flagsEl = document.getElementById('flags');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');
const modeBtn = document.getElementById('mode');

const N = 10;
const MINES = 12;
let W = 360, dpr = 1;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  W = Math.max(40, rect.width);
  canvas.width = W * dpr; canvas.height = W * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fit);
fit();

let cells = []; // { mine, count, revealed, flagged, animT, revealedT }
let firstClick = true;
let dead = false, won = false;
let flagMode = false;
let flagsCount = 0;
let startT = 0;

function reset() {
  cells = [];
  for (let i = 0; i < N * N; i++) cells.push({ mine: false, count: 0, revealed: false, flagged: false, revealedT: -1 });
  firstClick = true; dead = false; won = false;
  flagsCount = 0;
  flagsEl.textContent = '0';
  statusEl.textContent = 'first tap is safe';
  statusEl.className = 'status';
  startT = 0;
  render();
}

function placeMines(avoidIdx) {
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * N * N);
    if (i === avoidIdx || cells[i].mine) continue;
    // also avoid neighbors of first tap for kinder start
    const ar = Math.floor(avoidIdx / N), ac = avoidIdx % N;
    const r = Math.floor(i / N), c = i % N;
    if (Math.abs(r - ar) <= 1 && Math.abs(c - ac) <= 1) continue;
    cells[i].mine = true;
    placed++;
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (cells[r * N + c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
        if (cells[nr * N + nc].mine) n++;
      }
      cells[r * N + c].count = n;
    }
  }
}

function reveal(idx, depth) {
  depth = depth || 0;
  const c = cells[idx];
  if (c.revealed || c.flagged) return;
  c.revealed = true;
  c.revealedT = depth * 40; // ms delay for cascade
  if (c.mine) { dead = true; return; }
  if (c.count === 0) {
    const r = Math.floor(idx / N), col = idx % N;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = col + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      setTimeout(() => reveal(nr * N + nc, depth + 1), 40);
    }
    // sliding sound wave
    GAI.audio.tone(220 + depth * 30, 0.06, 'sine', 0.08, 0.005, 0.05);
  } else {
    GAI.audio.tone(440 + c.count * 80, 0.04, 'square', 0.1, 0.003, 0.04);
  }
}

function checkWin() {
  let unrevealedSafe = 0;
  for (const c of cells) if (!c.mine && !c.revealed) unrevealedSafe++;
  if (unrevealedSafe === 0) {
    won = true;
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 90, 'triangle', 0.18);
    GAI.haptic([20, 30, 20]);
    statusEl.textContent = 'CLEARED';
    statusEl.className = 'status won';
    const tt = ((performance.now() - startT) / 1000) | 0;
    GAI.bestScore('minesweeper', -tt);
    const prev = +(GAI.storage.get('gai_best_mines_t') || 0);
    if (prev === 0 || tt < prev) { GAI.storage.set('gai_best_mines_t', String(tt)); bestEl.textContent = fmtTime(tt); }
  }
}
function fmtTime(s) { const m = (s / 60) | 0; const ss = s % 60; return m + ':' + (ss < 10 ? '0' : '') + ss; }

function onCellTap(idx, flag) {
  if (dead || won) return;
  GAI.audio.ensure();
  if (firstClick) {
    placeMines(idx);
    firstClick = false;
    startT = performance.now();
  }
  if (flag) {
    const c = cells[idx];
    if (c.revealed) return;
    c.flagged = !c.flagged;
    flagsCount += c.flagged ? 1 : -1;
    flagsEl.textContent = flagsCount;
    GAI.audio.tone(c.flagged ? 660 : 440, 0.04, 'triangle', 0.1, 0.003, 0.04);
    return;
  }
  reveal(idx, 0);
  if (dead) {
    // reveal all mines
    for (const c of cells) if (c.mine) c.revealed = true;
    statusEl.textContent = 'BOOM';
    statusEl.className = 'status lost';
    GAI.audio.tone(150, 0.4, 'sawtooth', 0.2, 0.005, 0.15);
    GAI.haptic([30, 60, 30, 60]);
  } else {
    setTimeout(checkWin, 200);
  }
}

modeBtn.addEventListener('click', () => {
  flagMode = !flagMode;
  modeBtn.classList.toggle('flagging', flagMode);
  modeBtn.textContent = flagMode ? '⛏ DIG' : '🚩 FLAG';
});
document.getElementById('reset').addEventListener('click', reset);

// long-press for flag
let pressTimer = null;
let pressIdx = -1;
let pressFlagged = false;
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const cell = rect.width / N;
  const c = Math.floor((e.clientX - rect.left) / cell);
  const r = Math.floor((e.clientY - rect.top) / cell);
  pressIdx = r * N + c;
  pressFlagged = false;
  if (e.button === 2) { onCellTap(pressIdx, true); pressIdx = -1; return; }
  pressTimer = setTimeout(() => {
    if (pressIdx >= 0) { onCellTap(pressIdx, true); pressFlagged = true; }
  }, 380);
});
canvas.addEventListener('pointerup', (e) => {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  if (pressIdx >= 0 && !pressFlagged) onCellTap(pressIdx, flagMode);
  pressIdx = -1; pressFlagged = false;
});
canvas.addEventListener('pointercancel', () => {
  if (pressTimer) clearTimeout(pressTimer); pressTimer = null; pressIdx = -1;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') {
    flagMode = !flagMode;
    modeBtn.classList.toggle('flagging', flagMode);
    modeBtn.textContent = flagMode ? '⛏ DIG' : '🚩 FLAG';
  }
});

let lastT = 0;
function loop(now) {
  const dt = Math.min(now - lastT, 50);
  lastT = now;
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function render() {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, W);
  const cell = W / N;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const r = Math.floor(i / N), col = i % N;
    const x = col * cell, y = r * cell;
    if (c.revealed) {
      if (c.mine) {
        ctx.fillStyle = PAL[9];
      } else if (c.count === 0) {
        ctx.fillStyle = '#1a0a30';
      } else {
        ctx.fillStyle = '#22143a';
      }
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      if (!c.mine && c.count > 0) {
        ctx.fillStyle = PAL[(c.count - 1) % PAL.length];
        ctx.font = 'bold ' + Math.floor(cell * 0.5) + 'px "Press Start 2P", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(c.count), x + cell/2, y + cell/2);
      } else if (c.mine) {
        ctx.fillStyle = '#0a0a1e';
        ctx.beginPath(); ctx.arc(x + cell/2, y + cell/2, cell * 0.25, 0, Math.PI*2); ctx.fill();
      }
    } else {
      ctx.fillStyle = (r + col) % 2 === 0 ? '#2a1a4a' : '#1f1235';
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      if (c.flagged) {
        ctx.fillStyle = PAL[7];
        ctx.font = 'bold ' + Math.floor(cell * 0.5) + 'px "Press Start 2P", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', x + cell/2, y + cell/2);
      }
    }
  }
}

const prev = +(GAI.storage.get('gai_best_mines_t') || 0);
if (prev > 0) bestEl.textContent = fmtTime(prev);
reset();

})();
