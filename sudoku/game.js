(() => {
'use strict';
const GAI = window.GAI;
const N = 9;
const DIFFS = [
  { key: 'easy', label: 'EASY', remove: 41 },
  { key: 'medium', label: 'MEDIUM', remove: 49 },
  { key: 'hard', label: 'HARD', remove: 57 }
];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const diffTag = document.getElementById('diffTag');
const timeEl = document.getElementById('time');
const checksEl = document.getElementById('checks');
const hintsEl = document.getElementById('hints');
const pencilBtn = document.getElementById('pencilBtn');
const winBtn = document.getElementById('winBtn');

let cell = 40;
let board = [];
let solution = [];
let fixed = [];        // booleans for given cells
let pencil = [];       // [r][c] = Set of candidates
let selected = { r: 0, c: 0 };
let mistakes = [];     // [{r,c}] for flashing on check
let pencilMode = false;
let solved = false;
let diffIdx = +(GAI.storage.get('gai_sudoku_diff') || 1);
let checks = 3, hints = 3;
let startTs = Date.now();
let timerId = null;

function startTimer() {
  if (timerId) clearInterval(timerId);
  startTs = Date.now();
  timerId = setInterval(() => {
    const sec = Math.floor((Date.now() - startTs) / 1000);
    const m = Math.floor(sec / 60), s = sec % 60;
    timeEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
  }, 1000);
}

function fit() {
  const maxW = Math.min(window.innerWidth - 32, 540);
  cell = Math.floor(Math.min(maxW, window.innerHeight - 360) / N);
  if (cell < 28) cell = 28;
  const w = cell * N;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = w * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = w + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function newGame(difficulty) {
  const diff = DIFFS[difficulty];
  diffTag.textContent = 'DAILY · ' + diff.label;
  // generate solution
  const sol = generateSolution(GAI.dailySeed('sudoku-' + diff.key));
  solution = sol.map(r => r.slice());
  // remove cells deterministically with symmetric pattern
  board = solution.map(r => r.slice());
  fixed = [];
  for (let r = 0; r < N; r++) fixed.push(new Array(N).fill(true));
  const rng = GAI.rng(GAI.dailySeed('sudoku-r-' + diff.key));
  const idxs = [];
  for (let i = 0; i < N * N; i++) idxs.push(i);
  for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = idxs[i]; idxs[i] = idxs[j]; idxs[j] = t; }
  let removed = 0, idx = 0;
  while (removed < diff.remove && idx < idxs.length) {
    const id = idxs[idx++];
    const r = (id / N) | 0, c = id % N;
    if (!fixed[r][c]) continue;
    board[r][c] = 0; fixed[r][c] = false; removed++;
    // symmetric (point-symmetric)
    const sr = N - 1 - r, sc = N - 1 - c;
    if (fixed[sr][sc] && removed < diff.remove) {
      board[sr][sc] = 0; fixed[sr][sc] = false; removed++;
    }
  }
  pencil = [];
  for (let r = 0; r < N; r++) {
    const row = [];
    for (let c = 0; c < N; c++) row.push(new Set());
    pencil.push(row);
  }
  selected = { r: 0, c: 0 };
  mistakes = [];
  solved = false;
  pencilMode = false;
  pencilBtn.classList.remove('on');
  checks = 3; hints = 3;
  checksEl.textContent = checks; hintsEl.textContent = hints;
  winBtn.classList.add('hidden');
  startTimer();
  draw();
}

function generateSolution(seed) {
  const rng = GAI.rng(seed);
  const g = [];
  for (let r = 0; r < N; r++) g.push(new Array(N).fill(0));
  fillSolution(g, rng);
  return g;
}
function fillSolution(g, rng) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (g[r][c] !== 0) continue;
      const nums = shuffle([1,2,3,4,5,6,7,8,9], rng);
      for (const n of nums) {
        if (isValid(g, r, c, n)) {
          g[r][c] = n;
          if (fillSolution(g, rng)) return true;
          g[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}
function shuffle(a, rng) {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}
function isValid(g, r, c, n) {
  for (let i = 0; i < N; i++) {
    if (g[r][i] === n || g[i][c] === n) return false;
  }
  const br = (r / 3 | 0) * 3, bc = (c / 3 | 0) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (g[br + i][bc + j] === n) return false;
  }
  return true;
}

function draw() {
  const w = cell * N;
  ctx.clearRect(0, 0, w, w);
  // cell background — same-number highlight
  const selVal = board[selected.r][selected.c];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    let bg = '#0a0a1e';
    if (selected.r === r && selected.c === c) bg = '#1f1d4a';
    else if (selected.r === r || selected.c === c || ((selected.r / 3 | 0) === (r / 3 | 0) && (selected.c / 3 | 0) === (c / 3 | 0))) bg = '#13123a';
    if (selVal !== 0 && board[r][c] === selVal) bg = '#283058';
    ctx.fillStyle = bg;
    ctx.fillRect(c * cell, r * cell, cell, cell);
  }
  // mistakes flash
  for (const m of mistakes) {
    ctx.fillStyle = 'rgba(239,35,60,0.4)';
    ctx.fillRect(m.c * cell, m.r * cell, cell, cell);
  }
  // grid lines
  for (let i = 0; i <= N; i++) {
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = i % 3 === 0 ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
  }
  // numbers
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = board[r][c];
    if (v !== 0) {
      ctx.fillStyle = fixed[r][c] ? '#ffffff' : '#00f5ff';
      ctx.font = 'bold ' + Math.round(cell * 0.5) + 'px "Press Start 2P", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(v), c * cell + cell / 2, r * cell + cell / 2);
    } else if (pencil[r][c].size) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = Math.round(cell * 0.22) + 'px "Press Start 2P", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const n of pencil[r][c]) {
        const sub = n - 1;
        const sr = (sub / 3) | 0, sc = sub % 3;
        ctx.fillText(String(n), c * cell + (sc + 0.5) * cell / 3, r * cell + (sr + 0.5) * cell / 3);
      }
    }
  }
}

function pickCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor((clientX - rect.left) / cell);
  const r = Math.floor((clientY - rect.top) / cell);
  if (r < 0 || r >= N || c < 0 || c >= N) return null;
  return { r, c };
}
function selectCell(r, c) {
  selected = { r, c };
  draw();
}

function setNumber(n) {
  if (solved) return;
  const { r, c } = selected;
  if (fixed[r][c]) { GAI.audio.tone(180, 0.05, 'sawtooth', 0.08); return; }
  GAI.audio.ensure();
  if (pencilMode) {
    if (pencil[r][c].has(n)) pencil[r][c].delete(n); else pencil[r][c].add(n);
    GAI.audio.tone(440, 0.04, 'triangle', 0.08);
  } else {
    if (board[r][c] === n) board[r][c] = 0;
    else board[r][c] = n;
    pencil[r][c].clear();
    GAI.audio.tone(660, 0.05, 'square', 0.12);
    if (checkWin()) onWin();
  }
  draw();
}
function erase() {
  if (solved) return;
  const { r, c } = selected;
  if (fixed[r][c]) return;
  board[r][c] = 0;
  pencil[r][c].clear();
  GAI.audio.tone(220, 0.04, 'sine', 0.08);
  draw();
}
function checkWin() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (board[r][c] !== solution[r][c]) return false;
  }
  return true;
}
function onWin() {
  solved = true;
  if (timerId) clearInterval(timerId);
  // box-by-box wave
  GAI.audio.arpeggio([523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66], 80, 'triangle', 0.18);
  GAI.fx.confetti();
  GAI.recordWin('sudoku');
  // best time per difficulty
  const sec = Math.floor((Date.now() - startTs) / 1000);
  const key = 'gai_best_sudoku_' + DIFFS[diffIdx].key;
  const cur = +GAI.storage.get(key) || Infinity;
  if (sec < cur) GAI.storage.set(key, String(sec));
  winBtn.classList.remove('hidden');
}

function doCheck() {
  if (solved || checks <= 0) { GAI.audio.tone(180, 0.05, 'sawtooth', 0.08); return; }
  checks--;
  checksEl.textContent = checks;
  mistakes = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (board[r][c] !== 0 && board[r][c] !== solution[r][c]) mistakes.push({ r, c });
  }
  GAI.audio.tone(330, 0.1, 'square', 0.12);
  if (mistakes.length) {
    GAI.fx.screenShake(canvas, 4, 220);
    setTimeout(() => { mistakes = []; draw(); }, 1200);
  }
  draw();
}
function doHint() {
  if (solved || hints <= 0) { GAI.audio.tone(180, 0.05, 'sawtooth', 0.08); return; }
  // find a random empty correct cell
  const empties = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (board[r][c] !== solution[r][c]) empties.push({ r, c });
  }
  if (!empties.length) return;
  const pick = empties[Math.floor(Math.random() * empties.length)];
  board[pick.r][pick.c] = solution[pick.r][pick.c];
  hints--;
  hintsEl.textContent = hints;
  selected = pick;
  GAI.audio.arpeggio([523.25, 659.25, 880], 60, 'triangle', 0.14);
  draw();
  if (checkWin()) onWin();
}

// pointer input
canvas.addEventListener('click', (e) => { const p = pickCell(e.clientX, e.clientY); if (p) { GAI.audio.ensure(); selectCell(p.r, p.c); } });
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  const p = pickCell(e.touches[0].clientX, e.touches[0].clientY);
  if (p) { GAI.audio.ensure(); selectCell(p.r, p.c); }
}, { passive: false });

// keypad
document.querySelectorAll('.num').forEach(btn => {
  btn.addEventListener('click', () => setNumber(+btn.dataset.n));
});
document.getElementById('pencilBtn').addEventListener('click', () => {
  pencilMode = !pencilMode;
  pencilBtn.classList.toggle('on', pencilMode);
});
document.getElementById('eraseBtn').addEventListener('click', erase);
document.getElementById('hintBtn').addEventListener('click', doHint);
document.getElementById('checkBtn').addEventListener('click', doCheck);

document.getElementById('diffBtn').addEventListener('click', () => {
  diffIdx = (diffIdx + 1) % DIFFS.length;
  GAI.storage.set('gai_sudoku_diff', diffIdx);
  newGame(diffIdx);
});
winBtn.addEventListener('click', () => newGame(diffIdx));

// keyboard
document.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '9') { setNumber(+e.key); return; }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { erase(); return; }
  if (e.key === 'p' || e.key === 'P') { pencilMode = !pencilMode; pencilBtn.classList.toggle('on', pencilMode); return; }
  if (e.key === 'ArrowUp') { selected.r = (selected.r + N - 1) % N; draw(); }
  if (e.key === 'ArrowDown') { selected.r = (selected.r + 1) % N; draw(); }
  if (e.key === 'ArrowLeft') { selected.c = (selected.c + N - 1) % N; draw(); }
  if (e.key === 'ArrowRight') { selected.c = (selected.c + 1) % N; draw(); }
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit();
newGame(diffIdx);
})();
