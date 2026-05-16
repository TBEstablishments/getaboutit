(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const celebration = document.getElementById('celebration');

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

const N = 4;
let board = [];
let score = 0;
let best = +(GAI.storage.get('gai_best_p2048') || 0);
let reached = +(GAI.storage.get('gai_2048_reached') || 0);
let anims = [];

bestEl.textContent = best;

function newGame() {
  board = [];
  for (let i = 0; i < N * N; i++) board.push(0);
  score = 0; scoreEl.textContent = '0';
  anims = [];
  spawn(); spawn();
  render();
}

function spawn() {
  const empty = [];
  for (let i = 0; i < N * N; i++) if (board[i] === 0) empty.push(i);
  if (!empty.length) return false;
  const i = empty[Math.floor(Math.random() * empty.length)];
  board[i] = Math.random() < 0.9 ? 2 : 4;
  anims.push({ kind: 'spawn', idx: i, t: 0 });
  return true;
}

function copyBoard(b) { return b.slice(); }

function move(dir) {
  // dir 0=left,1=right,2=up,3=down
  const before = copyBoard(board);
  let moved = false, gained = 0;
  const lines = [];
  for (let r = 0; r < N; r++) lines.push([]);
  // build lines and merge each
  if (dir === 0 || dir === 1) {
    for (let r = 0; r < N; r++) {
      const line = [];
      for (let c = 0; c < N; c++) line.push(board[r * N + c]);
      const out = mergeLine(line, dir === 1);
      if (out.merged) {
        for (let c = 0; c < N; c++) board[r * N + c] = out.line[c];
        moved = moved || out.changed;
        gained += out.gained;
      }
      if (out.changed) moved = true;
    }
  } else {
    for (let c = 0; c < N; c++) {
      const line = [];
      for (let r = 0; r < N; r++) line.push(board[r * N + c]);
      const out = mergeLine(line, dir === 3);
      if (out.merged) {
        for (let r = 0; r < N; r++) board[r * N + c] = out.line[r];
        gained += out.gained;
      }
      if (out.changed) moved = true;
    }
  }
  if (!moved) return;
  score += gained;
  scoreEl.textContent = score;
  GAI.audio.tone(440 + (gained > 0 ? Math.min(200, gained) : 0), 0.05, 'square', 0.12, 0.005, 0.05);
  if (gained > 0) {
    if (board.includes(2048) && !reached) {
      reached = 1;
      GAI.storage.set('gai_2048_reached', '1');
      celebrate();
    }
  }
  spawn();
  render();
  if (isGameOver()) {
    if (score > best) { best = score; GAI.bestScore('p2048', best); bestEl.textContent = best; }
  }
}

function mergeLine(line, reverse) {
  if (reverse) line.reverse();
  const out = line.filter(v => v !== 0);
  let gained = 0, merged = false;
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i] === out[i+1]) {
      out[i] *= 2;
      gained += out[i];
      out.splice(i+1, 1);
      merged = true;
    }
  }
  while (out.length < line.length) out.push(0);
  if (reverse) out.reverse();
  // changed?
  let changed = merged;
  if (!changed) {
    const orig = line.slice(); if (reverse) orig.reverse();
    for (let i = 0; i < orig.length; i++) if (orig[i] !== out[i]) { changed = true; break; }
  }
  return { line: out, gained, merged: true, changed };
}

function isGameOver() {
  if (board.includes(0)) return false;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const v = board[r * N + c];
      if (c < N - 1 && board[r * N + c + 1] === v) return false;
      if (r < N - 1 && board[(r + 1) * N + c] === v) return false;
    }
  return true;
}

function celebrate() {
  celebration.classList.remove('hidden');
  GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51, 1568], 90, 'triangle', 0.18);
  GAI.haptic([40, 50, 40, 50, 40]);
  setTimeout(() => celebration.classList.add('hidden'), 1500);
}

const COLOR_FOR = (v) => {
  if (v === 0) return '#1f1235';
  const order = [2,4,8,16,32,64,128,256,512,1024,2048,4096];
  const i = order.indexOf(v);
  return i >= 0 ? PAL[i % PAL.length] : '#fff';
};

function render() {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, W);
  const cell = W / N;
  const pad = cell * 0.06;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = board[r * N + c];
      const x = c * cell + pad, y = r * cell + pad;
      const sz = cell - pad * 2;
      ctx.fillStyle = COLOR_FOR(v);
      if (v >= 1024) {
        ctx.shadowColor = COLOR_FOR(v); ctx.shadowBlur = 12;
      }
      ctx.fillRect(x, y, sz, sz);
      ctx.shadowBlur = 0;
      if (v > 0) {
        ctx.fillStyle = v <= 4 ? '#0a0a1e' : '#fff';
        const fs = Math.max(8, Math.floor(sz * 0.32 / Math.max(1, String(v).length / 2)));
        ctx.font = 'bold ' + fs + 'px "Press Start 2P", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(v), x + sz / 2, y + sz / 2);
      }
    }
  }
}

document.addEventListener('keydown', (e) => {
  GAI.audio.ensure();
  if (e.key === 'ArrowLeft') { e.preventDefault(); move(0); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(2); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); move(3); }
});

let sx = 0, sy = 0;
canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - sx, dy = t.clientY - sy;
  GAI.audio.ensure();
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : 0);
  else move(dy > 0 ? 3 : 2);
}, { passive: true });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

document.getElementById('reset').addEventListener('click', () => { GAI.audio.ensure(); newGame(); });

newGame();
})();
