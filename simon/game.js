(() => {
'use strict';
const GAI = window.GAI;
const stage = document.querySelector('.stage');
const pads = Array.from(document.querySelectorAll('.pad'));
const roundEl = document.getElementById('round');
const statusEl = document.getElementById('status');
const bestEl = document.getElementById('best');

const TONES = [329.63, 440, 523.25, 659.25];
const WAVES = ['sine','triangle','sine','triangle'];
let seq = [], idx = 0, state = 'idle';
let best = +(GAI.storage.get('gai_best_simon') || 0);
bestEl.textContent = best;

function setPads(disabled) {
  pads.forEach(p => p.classList.toggle('disabled', disabled));
}

async function flashPad(i, dur) {
  pads[i].classList.add('active');
  stage.classList.add('glow-p' + i);
  GAI.audio.tone(TONES[i], dur / 1000 * 0.8, WAVES[i], 0.18, 0.005, 0.05);
  await wait(dur);
  pads[i].classList.remove('active');
  stage.classList.remove('glow-p' + i);
  await wait(120);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function playSeq() {
  setPads(true);
  statusEl.textContent = 'WATCH...';
  const speed = Math.max(280, 540 - Math.floor((seq.length - 1) / 5) * 70);
  await wait(400);
  for (const i of seq) await flashPad(i, speed);
  statusEl.textContent = 'YOUR TURN';
  setPads(false);
}

async function nextRound() {
  state = 'showing';
  seq.push(Math.floor(Math.random() * 4));
  idx = 0;
  roundEl.textContent = seq.length;
  await playSeq();
  state = 'input';
}

async function gameover() {
  state = 'over';
  setPads(true);
  // dissonant chord + glitch
  GAI.audio.tone(220, 0.4, 'sawtooth', 0.18, 0.005, 0.1);
  GAI.audio.tone(233.08, 0.4, 'sawtooth', 0.18, 0.005, 0.1);
  GAI.haptic([30, 50, 30]);
  for (let i = 0; i < 4; i++) pads[i].classList.add('active');
  stage.style.filter = 'hue-rotate(180deg)';
  await wait(450);
  for (let i = 0; i < 4; i++) pads[i].classList.remove('active');
  stage.style.filter = '';
  if (seq.length - 1 > best) { best = seq.length - 1; GAI.bestScore('simon', best); bestEl.textContent = best; }
  statusEl.textContent = 'TAP TO RESTART';
  seq = []; idx = 0;
  roundEl.textContent = '0';
  state = 'idle';
}

async function onPad(i) {
  GAI.audio.ensure();
  if (state === 'idle') {
    seq = []; idx = 0;
    await nextRound();
    return;
  }
  if (state !== 'input') return;
  await flashPad(i, 220);
  if (seq[idx] !== i) { await gameover(); return; }
  idx++;
  if (idx >= seq.length) {
    statusEl.textContent = 'GOOD';
    await wait(450);
    await nextRound();
  }
}

pads.forEach(p => {
  const i = +p.dataset.i;
  p.addEventListener('click', () => onPad(i));
});

document.addEventListener('keydown', (e) => {
  const map = { '1': 0, '2': 1, '3': 2, '4': 3, q: 0, w: 1, a: 2, s: 3 };
  const i = map[e.key.toLowerCase()];
  if (i != null) onPad(i);
});

})();
