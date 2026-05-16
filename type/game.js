(() => {
'use strict';
const GAI = window.GAI;
const passageEl = document.getElementById('passage');
const inputEl = document.getElementById('input');
const wpmEl = document.getElementById('wpm');
const accEl = document.getElementById('acc');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const resultEl = document.getElementById('result');
const barYou = document.getElementById('barYou');
const barA = document.getElementById('barA');
const barB = document.getElementById('barB');
const barC = document.getElementById('barC');

const PASSAGES = [
  'press start to begin. the arcade never closes.',
  'vaporwave never died. it just changed channels.',
  'every game in the arcade is procedural. nothing is downloaded.',
  'tap with intent and the high score will follow.',
  'monday momentum starts with a single press.',
  'the chromatic aberration is not a bug. it is the brand.',
  'real arcades had floors stickier than this code base.',
  'the cabinet hums even when the room is empty.',
  'pixels are honest. anti-aliasing is for accountants.',
  'press start two p is the only font worth using.',
  'palette is sacred. ten colors are enough.',
  'no backend. no signup. just the game and the player.',
  'the canyon never ends. the runner never tires.',
  'check yourself before you wreck yourself.',
  'in the deep night theme the scanlines whisper.',
  'rolling the bones is the oldest game still played.',
  'memory is muscle. fingers learn the keyboard.',
  'one tap to jump. hold for the higher arc.',
  'tetrominoes obey nine simple rules. that is enough.',
  'the snake never sleeps. it only grows.',
  'press space to begin. press escape to return.',
  'every score is its own story.',
  'thirty seven games in the lobby and counting.',
  'the daily challenge resets at midnight utc sharp.',
  'the konami code unlocks rainbow mode site wide.',
  'the streak counter loves you on a tuesday.',
  'high contrast theme is for sunshine. deep night is for after midnight.',
  'all card games are rendered procedurally with no art assets.',
  'a royal flush adds a permanent crown to the poker tile.',
  'shoot the moon and the score sheet flips dramatically.',
  'fifteen two fifteen four and a pair makes six.',
  'pass line bets are the oldest craps tradition.',
  'go is older than computers but the rules fit on a postcard.',
  'spider solitaire is harder than it looks. one suit is plenty.'
];

const DURATION = 60;
let passage = '';
let typed = '';
let started = false;
let startTs = 0;
let timeLeft = DURATION;
let timerId = null;
let aiSpeed = { a: 40, b: 60, c: 80 }; // wpm
let aiPos = { a: 0, b: 0, c: 0 };
let lastTick = 0;
let raf = 0;
let totalCorrect = 0;
let totalAttempted = 0;
let wordsTyped = 0;
let best = +(GAI.storage.get('gai_best_type') || 0);
bestEl.textContent = best;

function pickPassage() {
  return PASSAGES[Math.floor(Math.random() * PASSAGES.length)] + ' ' + PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
}

function reset() {
  passage = pickPassage();
  typed = '';
  started = false;
  startTs = 0;
  timeLeft = DURATION;
  timeEl.textContent = DURATION;
  aiPos = { a: 0, b: 0, c: 0 };
  lastTick = 0;
  totalCorrect = 0;
  totalAttempted = 0;
  wordsTyped = 0;
  wpmEl.textContent = '0';
  accEl.textContent = '100';
  inputEl.value = '';
  inputEl.disabled = false;
  resultEl.classList.add('hidden');
  render();
  inputEl.focus();
}

function render() {
  let html = '';
  for (let i = 0; i < passage.length; i++) {
    const c = passage[i];
    const safe = c === ' ' ? '&nbsp;' : (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c);
    if (i < typed.length) {
      if (typed[i] === passage[i]) html += '<span class="ok">' + safe + '</span>';
      else html += '<span class="bad">' + safe + '</span>';
    } else if (i === typed.length) {
      html += '<span class="cur">' + safe + '</span>';
    } else {
      html += '<span>' + safe + '</span>';
    }
  }
  passageEl.innerHTML = html;
  // bars
  const pct = (typed.length / passage.length) * 100;
  barYou.style.width = pct.toFixed(1) + '%';
  // AI: progress = (elapsed seconds * (wpm/60) * 5 chars/word) / passage.length * 100
  const elapsed = started ? (Date.now() - startTs) / 1000 : 0;
  function ai(wpm) { return Math.min(100, (elapsed * (wpm / 60) * 5) / passage.length * 100); }
  barA.style.width = ai(aiSpeed.a).toFixed(1) + '%';
  barB.style.width = ai(aiSpeed.b).toFixed(1) + '%';
  barC.style.width = ai(aiSpeed.c).toFixed(1) + '%';
}

function tick() {
  if (!started) { raf = requestAnimationFrame(tick); return; }
  const now = Date.now();
  const elapsed = (now - startTs) / 1000;
  const remaining = Math.max(0, DURATION - elapsed);
  if (Math.floor(remaining) !== timeLeft) {
    timeLeft = Math.floor(remaining);
    timeEl.textContent = timeLeft;
  }
  // live WPM
  const wpm = wordsTyped > 0 ? Math.round(wordsTyped * 60 / Math.max(1, elapsed)) : 0;
  wpmEl.textContent = wpm;
  if (wpm >= 100 && !document.body.classList.contains('warp')) {
    document.body.classList.add('warp');
    GAI.audio.tone(80, 4, 'sawtooth', 0.04);
    GAI.fx.scanlineSweep(null, '#00f5ff');
  }
  if (totalAttempted > 0) {
    accEl.textContent = Math.round(totalCorrect * 100 / totalAttempted);
  }
  render();
  if (remaining <= 0 || typed === passage) { end(); return; }
  raf = requestAnimationFrame(tick);
}

function start() {
  if (started) return;
  started = true;
  startTs = Date.now();
  raf = requestAnimationFrame(tick);
  GAI.audio.ensure();
  GAI.audio.tone(660, 0.06, 'square', 0.10);
}

function end() {
  if (raf) cancelAnimationFrame(raf); raf = 0;
  inputEl.disabled = true;
  const wpm = +wpmEl.textContent;
  const acc = +accEl.textContent;
  if (wpm > best) { best = wpm; GAI.storage.set('gai_best_type', best); bestEl.textContent = best; }
  GAI.bestScore('type', wpm);
  // beat any AI?
  const aiBeats = [40, 60, 80].filter(w => wpm > w).length;
  if (aiBeats === 3) {
    GAI.recordWin('type');
    GAI.fx.confetti({ count: 60 });
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 60, 'triangle', 0.18);
    resultEl.textContent = '✦ FIRST PLACE · ' + wpm + ' WPM · ' + acc + '% ACCURACY';
  } else if (aiBeats === 2) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99], 70, 'triangle', 0.16);
    resultEl.textContent = '2ND · ' + wpm + ' WPM';
  } else if (aiBeats >= 1) {
    GAI.audio.arpeggio([440, 523.25], 80, 'triangle', 0.14);
    resultEl.textContent = '3RD · ' + wpm + ' WPM';
  } else {
    GAI.audio.arpeggio([311.13, 261.63], 110, 'sawtooth', 0.14);
    resultEl.textContent = '4TH · ' + wpm + ' WPM · TRY AGAIN';
  }
  resultEl.classList.remove('hidden');
  // play-next strip
  if (!resultEl.querySelector('.gai-play-next')) {
    GAI.ui.playNext('type', resultEl);
  }
  GAI.stats.sessionEnd('type');
  // tap to restart
  setTimeout(() => {
    const onTap = () => { document.removeEventListener('keydown', onTap); document.removeEventListener('click', onTap); reset(); GAI.stats.sessionStart('type'); };
    document.addEventListener('keydown', onTap);
    document.addEventListener('click', onTap);
  }, 500);
}

inputEl.addEventListener('input', () => {
  if (!started) start();
  const v = inputEl.value;
  // diff against typed: if new char matches passage[len], increment correct
  if (v.length > typed.length) {
    const c = v[v.length - 1];
    const expected = passage[v.length - 1];
    if (c === expected) totalCorrect++;
    totalAttempted++;
    if (c === ' ') wordsTyped++;
    if (c === expected) GAI.audio.tone(660 + (v.length % 6) * 30, 0.02, 'triangle', 0.05);
    else GAI.audio.tone(180, 0.04, 'sawtooth', 0.08);
  }
  typed = v;
  // truncate beyond passage
  if (typed.length > passage.length) {
    typed = typed.slice(0, passage.length);
    inputEl.value = typed;
  }
  render();
  if (typed === passage) {
    // complete passage early
    wordsTyped += 1;
    end();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { reset(); }
});

GAI.stats.sessionStart('type');
window.addEventListener('pagehide', () => GAI.stats.sessionEnd('type'));

reset();
})();
