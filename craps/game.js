(() => {
'use strict';
const GAI = window.GAI;
const tableC = document.getElementById('table');
const tableCtx = tableC.getContext('2d');
const diceC = document.getElementById('dice');
const diceCtx = diceC.getContext('2d');
const status = document.getElementById('status');
const phaseLabel = document.getElementById('phaseLabel');
const creditsEl = document.getElementById('credits');
const betEl = document.getElementById('bet');
const streakEl = document.getElementById('streak');

let credits = +(GAI.storage.get('gai_craps_credits') || 1000);
let bet = +(GAI.storage.get('gai_craps_bet') || 25);
let streak = 0;
let best = +(GAI.storage.get('gai_best_craps') || 1000);
let phase = 'comeout'; // comeout | point
let point = null;
let rolling = false;
creditsEl.textContent = credits;
betEl.textContent = bet;
streakEl.textContent = streak;

let dieSize = 56;
function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const tableW = Math.min(window.innerWidth - 32, 460);
  const tableH = 160;
  tableC.width = tableW * dpr; tableC.height = tableH * dpr;
  tableC.style.width = tableW + 'px'; tableC.style.height = tableH + 'px';
  tableCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dieSize = Math.min(64, Math.floor((tableW - 80) / 4));
  const diceW = dieSize * 2 + 40;
  const diceH = dieSize + 20;
  diceC.width = diceW * dpr; diceC.height = diceH * dpr;
  diceC.style.width = diceW + 'px'; diceC.style.height = diceH + 'px';
  diceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawTable();
  drawDice([1, 1]);
}

function drawTable() {
  const w = tableC.clientWidth, h = tableC.clientHeight;
  tableCtx.clearRect(0, 0, w, h);
  // numbers 4 5 6 8 9 10
  const nums = [4, 5, 6, 8, 9, 10];
  const cellW = w / nums.length;
  GAI.text.measure(tableCtx, '8', 18);
  for (let i = 0; i < nums.length; i++) {
    const x = i * cellW;
    const active = (point === nums[i]);
    tableCtx.fillStyle = active ? 'rgba(255,214,10,0.18)' : 'rgba(255,255,255,0.04)';
    tableCtx.fillRect(x + 2, 12, cellW - 4, h - 60);
    tableCtx.strokeStyle = active ? 'var(--c-yellow)' : 'rgba(255,255,255,0.18)';
    tableCtx.lineWidth = active ? 2 : 1;
    tableCtx.strokeStyle = active ? '#ffd60a' : 'rgba(255,255,255,0.18)';
    tableCtx.strokeRect(x + 2, 12, cellW - 4, h - 60);
    tableCtx.fillStyle = active ? '#ffd60a' : '#fff';
    tableCtx.font = 'bold 18px "Press Start 2P", monospace';
    tableCtx.textAlign = 'center'; tableCtx.textBaseline = 'middle';
    tableCtx.fillText(String(nums[i]), x + cellW/2, 12 + (h - 60) / 2 - 12);
    if (active) {
      // point marker
      tableCtx.fillStyle = '#ff006e';
      tableCtx.beginPath();
      tableCtx.arc(x + cellW/2, 12 + (h - 60) / 2 + 18, 7, 0, Math.PI*2);
      tableCtx.fill();
    }
  }
  // PASS LINE label
  tableCtx.fillStyle = 'rgba(255,255,255,0.6)';
  tableCtx.font = 'bold 11px "Press Start 2P", monospace';
  tableCtx.textAlign = 'center'; tableCtx.textBaseline = 'middle';
  tableCtx.fillText('PASS LINE · ' + bet, w/2, h - 18);
  // streak hot flame
  if (streak >= 7) {
    GAI.text.drawChromatic(tableCtx, '🔥 HOT', w - 60, 24, 13);
  }
}

function drawDice(values) {
  const w = diceC.clientWidth, h = diceC.clientHeight;
  diceCtx.clearRect(0, 0, w, h);
  GAI.dice.drawDie(diceCtx, 10, 10, dieSize, values[0], { glow: streak >= 7 ? '#ff9500' : null });
  GAI.dice.drawDie(diceCtx, 20 + dieSize, 10, dieSize, values[1], { glow: streak >= 7 ? '#ff9500' : null });
}

function settle(total) {
  rolling = false;
  if (phase === 'comeout') {
    if (total === 7 || total === 11) {
      win();
    } else if (total === 2 || total === 3 || total === 12) {
      lose();
    } else {
      point = total;
      phase = 'point';
      phaseLabel.textContent = 'POINT IS ' + point;
      status.textContent = 'ROLL THE POINT OR BUST';
      status.className = 'status';
      drawTable();
      GAI.audio.tone(440, 0.1, 'square', 0.14);
    }
  } else {
    if (total === point) win();
    else if (total === 7) lose();
    else {
      status.textContent = 'ROLLED ' + total + ' — KEEP TRYING';
      GAI.audio.tone(360, 0.06, 'sine', 0.10);
    }
  }
}

function win() {
  credits += bet * 2;
  streak++;
  streakEl.textContent = streak;
  status.textContent = '✦ WIN +' + bet + '  STREAK ' + streak;
  status.className = streak >= 7 ? 'status hot' : 'status win';
  if (streak >= 7) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 50, 'square', 0.18);
    GAI.fx.chromaticFlash(220);
  } else {
    GAI.audio.arpeggio([523.25, 659.25, 783.99], 60, 'triangle', 0.16);
  }
  GAI.fx.confetti({ count: 30 });
  GAI.recordWin('craps');
  resetRound();
}
function lose() {
  credits = Math.max(0, credits - bet);
  if (streak > 0) streak = 0;
  streakEl.textContent = streak;
  status.textContent = '× LOSE −' + bet;
  status.className = 'status lose';
  GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.16);
  GAI.fx.screenShake(diceC, 6, 260);
  resetRound();
}
function resetRound() {
  GAI.storage.set('gai_craps_credits', credits);
  creditsEl.textContent = credits;
  if (credits > best) { best = credits; GAI.storage.set('gai_best_craps', best); }
  GAI.bestScore('craps', best);
  phase = 'comeout';
  point = null;
  phaseLabel.textContent = 'COME OUT';
  drawTable();
  if (credits <= 0) {
    setTimeout(() => {
      credits = 1000;
      GAI.storage.set('gai_craps_credits', credits);
      creditsEl.textContent = credits;
      status.textContent = 'CREDITS RESET';
    }, 1400);
  }
}

function roll() {
  if (rolling) return;
  if (credits < bet && phase === 'comeout') {
    status.textContent = 'NOT ENOUGH CREDITS';
    status.className = 'status lose';
    return;
  }
  rolling = true;
  status.textContent = '...';
  status.className = 'status';
  GAI.audio.ensure();
  GAI.dice.rollWithAnim(diceCtx, 10, 10, dieSize, 2, (finals) => {
    drawDice(finals);
    const total = finals[0] + finals[1];
    GAI.audio.tone(330, 0.08, 'sine', 0.12);
    setTimeout(() => settle(total), 220);
  });
}

document.getElementById('rollBtn').addEventListener('click', roll);
document.getElementById('betDown').addEventListener('click', () => {
  bet = Math.max(25, bet - 25);
  GAI.storage.set('gai_craps_bet', bet);
  betEl.textContent = bet; drawTable();
});
document.getElementById('betUp').addEventListener('click', () => {
  bet = Math.min(credits, bet + 25);
  GAI.storage.set('gai_craps_bet', bet);
  betEl.textContent = bet; drawTable();
});
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); roll(); }
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 150); });
GAI.stats.sessionStart('craps');
window.addEventListener('pagehide', () => GAI.stats.sessionEnd('craps'));

fit();
})();
