(() => {
'use strict';
const GAI = window.GAI;
const screen = document.getElementById('screen');
const big = document.getElementById('big').querySelector('span > span');
const sub = document.getElementById('sub');
const roundEl = document.getElementById('round');
const bestEl = document.getElementById('best');

let state = 'idle'; // idle | waiting | go | early | done
let round = 0;
const TIMES = [];
let waitTimer = null;
let waitStart = 0;

const best = +(GAI.storage.get('gai_best_reaction') || 0);
if (best > 0) bestEl.textContent = best;

function setZone(cls) {
  screen.className = 'screen-zone ' + cls;
}

function setTexts(b, s) { big.textContent = b; sub.textContent = s || ''; }

function reset() {
  state = 'idle'; round = 0; TIMES.length = 0;
  roundEl.textContent = '0';
  setZone('idle');
  setTexts('REACTION', 'TAP TO START');
}
reset();

function nextRound() {
  if (round >= 5) { showResult(); return; }
  state = 'waiting';
  setZone('wait');
  setTexts('WAIT', '...');
  const delay = 900 + Math.random() * 3100;
  waitTimer = setTimeout(() => {
    if (state !== 'waiting') return;
    state = 'go';
    setZone('go');
    setTexts('TAP!', '');
    waitStart = performance.now();
    GAI.audio.tone(880, 0.06, 'square', 0.18, 0.003, 0.06);
  }, delay);
}

function showResult() {
  state = 'done';
  setZone('done');
  if (TIMES.length === 0) { setTexts('TOO EARLY', 'TAP TO RETRY'); return; }
  const avg = Math.round(TIMES.reduce((a,b) => a+b, 0) / TIMES.length);
  let rank = 'NEEDS COFFEE';
  if (avg < 200) rank = 'SUPERHUMAN';
  else if (avg < 250) rank = 'FAST';
  else if (avg < 300) rank = 'HUMAN';
  setTexts(avg + ' MS', 'TAP TO PLAY AGAIN');
  // best
  if (best === 0 || avg < best) {
    GAI.bestScore('reaction', avg);
    bestEl.textContent = avg;
  }
  // CRT rank
  const rk = document.createElement('div');
  rk.className = 'crt-rank';
  rk.innerHTML = '<span class="inner chrom"><span>' + rank + '</span></span>';
  document.body.appendChild(rk);
  rk.classList.add('show');
  GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 80, 'triangle', 0.16);
  GAI.haptic(20);
  setTimeout(() => rk.remove(), 2200);
}

function onTap() {
  GAI.audio.ensure();
  if (state === 'idle' || state === 'done' || state === 'early') {
    round = 0; TIMES.length = 0; roundEl.textContent = '0';
    nextRound();
    return;
  }
  if (state === 'waiting') {
    state = 'early';
    if (waitTimer) { clearTimeout(waitTimer); waitTimer = null; }
    setZone('early');
    setTexts('TOO EARLY', 'TAP TO RETRY');
    GAI.audio.tone(220, 0.18, 'sawtooth', 0.16, 0.003, 0.08);
    GAI.haptic([10, 40, 10]);
    return;
  }
  if (state === 'go') {
    const ms = Math.round(performance.now() - waitStart);
    TIMES.push(ms);
    round++;
    roundEl.textContent = String(round);
    setTexts(ms + ' MS', round < 5 ? 'GET READY...' : 'COMPUTING...');
    state = 'between';
    GAI.audio.tone(440 + Math.max(0, 800 - ms), 0.06, 'sine', 0.14, 0.003, 0.05);
    setTimeout(nextRound, 850);
    return;
  }
}

document.body.addEventListener('click', onTap);
document.body.addEventListener('touchstart', (e) => {
  if (e.target.closest('button, a')) return;
  e.preventDefault();
  onTap();
}, { passive: false });
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onTap(); }
});

})();
