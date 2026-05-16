(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const dailyEl = document.getElementById('daily');

const today = GAI.todayUTC();
dailyEl.textContent = 'DAILY · ' + today.slice(0,4) + '.' + today.slice(4,6) + '.' + today.slice(6,8);

let dpr = 1, W = 320;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  W = Math.max(40, rect.width);
  canvas.width = W * dpr;
  canvas.height = W * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fit);
fit();

const N = 4;
let board = [];
let moves = 0;
let startT = 0;
let solved = false;

function reset() {
  board = [];
  for (let i = 0; i < N * N; i++) board.push(i + 1);
  board[N * N - 1] = 0;
  // shuffle 80 valid moves from solved
  const rng = GAI.rng(GAI.dailySeed('slide'));
  let empty = N * N - 1;
  let lastDir = -1;
  for (let i = 0; i < 80; i++) {
    const opts = neighbors(empty).filter(([_, dir]) => dir !== oppDir(lastDir));
    const pick = opts[Math.floor(rng() * opts.length)];
    [board[empty], board[pick[0]]] = [board[pick[0]], board[empty]];
    empty = pick[0];
    lastDir = pick[1];
  }
  moves = 0;
  startT = performance.now();
  solved = false;
  movesEl.textContent = '0';
  render();
}
function oppDir(d) { return d < 0 ? -1 : (d ^ 1); } // 0<->1, 2<->3
function neighbors(idx) {
  const r = Math.floor(idx / N), c = idx % N;
  const res = [];
  if (c > 0) res.push([idx - 1, 0]);
  if (c < N - 1) res.push([idx + 1, 1]);
  if (r > 0) res.push([idx - N, 2]);
  if (r < N - 1) res.push([idx + N, 3]);
  return res;
}

function emptyIdx() { return board.indexOf(0); }

function trySlide(idx) {
  if (solved) return;
  const e = emptyIdx();
  const r = Math.floor(idx / N), c = idx % N;
  const er = Math.floor(e / N), ec = e % N;
  if ((r === er && Math.abs(c - ec) === 1) || (c === ec && Math.abs(r - er) === 1)) {
    [board[e], board[idx]] = [board[idx], board[e]];
    moves++;
    movesEl.textContent = moves;
    GAI.audio.tone(330 + (idx % 7) * 25, 0.05, 'square', 0.12, 0.005, 0.05);
    render();
    if (isSolved()) onWin();
  }
}

function isSolved() {
  for (let i = 0; i < N * N - 1; i++) if (board[i] !== i + 1) return false;
  return true;
}

function onWin() {
  solved = true;
  GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 90, 'triangle', 0.18);
  GAI.haptic([20, 30, 40]);
  const ov = document.createElement('div');
  ov.className = 'win-overlay';
  const rip = document.createElement('div');
  rip.className = 'ripple';
  ov.appendChild(rip);
  document.body.appendChild(ov);
  setTimeout(() => ov.remove(), 1500);
  // best
  const totalT = ((performance.now() - startT) / 1000) | 0;
  const key = 'gai_slide_daily_' + today;
  const prev = GAI.storage.getJSON(key, null);
  const cur = { moves, time: totalT };
  if (!prev || cur.moves < prev.moves || (cur.moves === prev.moves && cur.time < prev.time)) {
    GAI.storage.setJSON(key, cur);
    GAI.bestScore('slide', -moves);
  }
  bestEl.textContent = (prev && prev.moves <= cur.moves ? prev.moves : cur.moves) + ' / ' + fmtTime((prev && prev.moves <= cur.moves ? prev.time : cur.time));
}

function fmtTime(s) {
  const m = (s / 60) | 0; const ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

function render() {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, W);
  const cell = W / N;
  for (let i = 0; i < N * N; i++) {
    const v = board[i];
    if (!v) continue;
    const r = Math.floor(i / N), c = i % N;
    const x = c * cell, y = r * cell;
    ctx.fillStyle = PAL[(v - 1) % PAL.length];
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(x + 2, y + 2, cell - 4, 4);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.floor(cell * 0.4) + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(v), x + cell / 2, y + cell / 2);
  }
}

canvas.addEventListener('click', (e) => {
  GAI.audio.ensure();
  const rect = canvas.getBoundingClientRect();
  const cell = rect.width / N;
  const c = Math.floor((e.clientX - rect.left) / cell);
  const r = Math.floor((e.clientY - rect.top) / cell);
  if (c < 0 || c >= N || r < 0 || r >= N) return;
  trySlide(r * N + c);
});

document.addEventListener('keydown', (e) => {
  const e2 = emptyIdx();
  const er = Math.floor(e2 / N), ec = e2 % N;
  if (e.key === 'ArrowLeft' && ec < N - 1) trySlide(er * N + ec + 1);
  else if (e.key === 'ArrowRight' && ec > 0) trySlide(er * N + ec - 1);
  else if (e.key === 'ArrowUp' && er < N - 1) trySlide((er + 1) * N + ec);
  else if (e.key === 'ArrowDown' && er > 0) trySlide((er - 1) * N + ec);
});

document.getElementById('reset').addEventListener('click', reset);

setInterval(() => {
  if (solved || startT === 0) return;
  const s = ((performance.now() - startT) / 1000) | 0;
  timeEl.textContent = fmtTime(s);
}, 250);

const prevBest = GAI.storage.getJSON('gai_slide_daily_' + today, null);
if (prevBest) bestEl.textContent = prevBest.moves + ' / ' + fmtTime(prevBest.time);
reset();

})();
