(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const grid = document.getElementById('grid');
const movesEl = document.getElementById('moves');
const bestEl = document.getElementById('best');
const dailyEl = document.getElementById('daily');
const banner = document.getElementById('banner');

const today = GAI.todayUTC();
dailyEl.textContent = 'DAILY · ' + today.slice(0,4) + '.' + today.slice(4,6) + '.' + today.slice(6,8);

const SEED = GAI.dailySeed('lightsout');
const rng = GAI.rng(SEED);

let board = Array(25).fill(0);
let moves = 0;
const cells = [];

// Generate solvable board by toggling 8-14 random cells from a solved (all off) state
function generate() {
  board = Array(25).fill(0);
  const toggles = 8 + Math.floor(rng() * 7);
  for (let i = 0; i < toggles; i++) {
    const idx = Math.floor(rng() * 25);
    toggleAt(idx, false);
  }
}

function toggleAt(idx, sound) {
  const r = Math.floor(idx / 5), c = idx % 5;
  const arr = [idx];
  if (r > 0) arr.push(idx - 5);
  if (r < 4) arr.push(idx + 5);
  if (c > 0) arr.push(idx - 1);
  if (c < 4) arr.push(idx + 1);
  for (const i of arr) board[i] = board[i] ? 0 : 1;
  if (sound) {
    GAI.audio.tone(440 + (idx % 7) * 40, 0.07, 'square', 0.13, 0.005, 0.06);
  }
}

function build() {
  grid.innerHTML = '';
  cells.length = 0;
  for (let i = 0; i < 25; i++) {
    const b = document.createElement('button');
    b.className = 'cell';
    b.type = 'button';
    b.setAttribute('role', 'gridcell');
    b.setAttribute('aria-label', 'Light ' + (i + 1));
    b.addEventListener('click', () => onTap(i));
    grid.appendChild(b);
    cells.push(b);
  }
}

function render() {
  for (let i = 0; i < 25; i++) {
    if (board[i]) cells[i].classList.add('on');
    else cells[i].classList.remove('on');
  }
  movesEl.textContent = moves;
}

function isWin() { return board.every(v => v === 0); }

function onTap(idx) {
  GAI.audio.ensure();
  if (isWin()) return;
  toggleAt(idx, true);
  moves++;
  render();
  if (isWin()) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 90, 'triangle', 0.18);
    GAI.haptic([20, 30, 20]);
    const key = 'gai_lo_daily_' + today;
    const prev = +(GAI.storage.get(key) || 0);
    if (prev === 0 || moves < prev) GAI.storage.set(key, String(moves));
    GAI.bestScore('lightsout', -moves);
    bestEl.textContent = +(GAI.storage.get(key) || moves);
    banner.classList.remove('hidden');
    banner.style.color = PAL[(parseInt(today, 10)) % PAL.length];
    banner.style.textShadow = '0 0 14px ' + PAL[(parseInt(today, 10)) % PAL.length];
    setTimeout(() => banner.classList.add('hidden'), 1700);
  }
}

document.getElementById('reset').addEventListener('click', () => {
  const r = GAI.rng(SEED);
  // re-run with same seed for daily reset
  board = Array(25).fill(0); moves = 0;
  const toggles = 8 + Math.floor(r() * 7);
  for (let i = 0; i < toggles; i++) toggleAt(Math.floor(r() * 25), false);
  render();
});

build();
generate();
const prevBest = +(GAI.storage.get('gai_lo_daily_' + today) || 0);
if (prevBest > 0) bestEl.textContent = prevBest;
render();

})();
