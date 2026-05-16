(() => {
'use strict';
const GAI = window.GAI;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const dealBtn = document.getElementById('dealBtn');
const betBtn = document.getElementById('betBtn');
const betEl = document.getElementById('bet');
const creditsEl = document.getElementById('credits');
const bestEl = document.getElementById('best');
const royalTag = document.getElementById('royalTag');

const PAYOUTS = [
  { name: 'JACKS OR BETTER', mul: 1 },
  { name: 'TWO PAIR', mul: 2 },
  { name: 'THREE OF A KIND', mul: 3 },
  { name: 'STRAIGHT', mul: 4 },
  { name: 'FLUSH', mul: 6 },
  { name: 'FULL HOUSE', mul: 9 },
  { name: 'FOUR OF A KIND', mul: 25 },
  { name: 'STRAIGHT FLUSH', mul: 50 },
  { name: 'ROYAL FLUSH', mul: 250 }
];

let credits = +(GAI.storage.get('gai_poker_credits') || 1000);
let bestCredits = +(GAI.storage.get('gai_best_poker') || credits);
let bet = +(GAI.storage.get('gai_poker_bet') || 1);
let phase = 'deal';      // deal | draw | result
let deck = [];
let hand = [];
let held = [false, false, false, false, false];
let lastResult = null;

creditsEl.textContent = credits;
bestEl.textContent = bestCredits;
betEl.textContent = bet;
if (GAI.storage.get('gai_poker_royal') === '1') royalTag.classList.remove('hidden');

renderPaytable();

function renderPaytable() {
  const p = document.getElementById('paytable');
  p.innerHTML = '';
  for (let i = PAYOUTS.length - 1; i >= 0; i--) {
    const row = document.createElement('div');
    row.className = 'row' + (i === PAYOUTS.length - 1 ? ' hot' : '');
    row.textContent = PAYOUTS[i].name;
    const pay = document.createElement('div');
    let mul = PAYOUTS[i].mul;
    // royal bonus at max bet
    if (i === PAYOUTS.length - 1 && bet === 5) mul = 800;
    pay.textContent = (mul * bet) + 'x';
    p.appendChild(row); p.appendChild(pay);
  }
}

let W = 0, H = 0;
function fit() {
  const cw = Math.min(70, Math.floor((window.innerWidth - 60) / 5) - 8);
  const ch = Math.floor(cw * 1.4);
  W = cw * 5 + 4 * 8 + 24;
  H = ch + 60;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const cw = Math.floor((W - 24 - 32) / 5);
  const ch = Math.floor(cw * 1.4);
  for (let i = 0; i < 5; i++) {
    const x = 12 + i * (cw + 8);
    const y = 12;
    if (!hand[i]) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      GAI.fx.roundRect(ctx, x, y, cw, ch, 6); ctx.stroke();
    } else {
      GAI.cards.draw(ctx, x, held[i] ? y - 6 : y, cw, ch, hand[i], { glow: held[i] });
    }
    if (held[i]) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = 'bold 9px "Press Start 2P", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('HELD', x + cw / 2, y + ch + 16);
    }
  }
}

function deal() {
  GAI.audio.ensure();
  if (credits < bet) { status.textContent = '— OUT OF CREDITS —'; restart(); return; }
  credits -= bet;
  creditsEl.textContent = credits;
  GAI.storage.set('gai_poker_credits', credits);
  deck = GAI.cards.newDeck();
  hand = [];
  held = [false, false, false, false, false];
  for (let i = 0; i < 5; i++) {
    setTimeout(() => { hand.push(deck.pop()); GAI.audio.tone(440 + i * 60, 0.04, 'square', 0.10); draw(); }, i * 80);
  }
  phase = 'draw';
  dealBtn.textContent = 'DRAW';
  status.textContent = 'TAP CARDS TO HOLD · DRAW WHEN READY';
  status.className = 'status';
  draw();
}

function drawCards() {
  GAI.audio.ensure();
  for (let i = 0; i < 5; i++) {
    if (!held[i]) {
      hand[i] = deck.pop();
      GAI.audio.tone(440 + i * 60, 0.04, 'square', 0.10);
    }
  }
  draw();
  phase = 'result';
  // evaluate
  const ev = GAI.cards.evalPoker(hand);
  lastResult = ev;
  let payout = 0;
  if (ev.rank > 0) {
    let mul = PAYOUTS[ev.rank - 1].mul;
    if (ev.rank === 9 && bet === 5) mul = 800;
    payout = mul * bet;
  }
  credits += payout;
  creditsEl.textContent = credits;
  GAI.storage.set('gai_poker_credits', credits);
  if (credits > bestCredits) { bestCredits = credits; GAI.storage.set('gai_best_poker', credits); bestEl.textContent = credits; }
  if (ev.rank === 9) {
    GAI.storage.set('gai_poker_royal', '1');
    royalTag.classList.remove('hidden');
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98], 80, 'square', 0.18);
    GAI.fx.chromaticFlash(700);
    GAI.fx.confetti({ count: 120 });
    GAI.recordWin('poker');
    GAI.achievements.unlock('royal_flush');
  } else if (ev.rank >= 5) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
    GAI.fx.confetti();
    GAI.recordWin('poker');
  } else if (ev.rank >= 1) {
    GAI.audio.arpeggio([523.25, 659.25], 60, 'triangle', 0.16);
    GAI.recordWin('poker');
  } else {
    GAI.audio.tone(220, 0.1, 'sawtooth', 0.12);
  }
  status.textContent = (ev.rank > 0 ? '✦ ' + ev.name + ' · +' + payout : ev.name);
  status.className = 'status' + (ev.rank > 0 ? ' win' : '');
  dealBtn.textContent = 'DEAL';
  phase = 'deal';
  if (credits <= 0) restart();
}

function restart() {
  setTimeout(() => {
    credits = 1000;
    GAI.storage.set('gai_poker_credits', credits);
    creditsEl.textContent = credits;
  }, 1800);
}

function toggleHold(i) {
  if (phase !== 'draw') return;
  held[i] = !held[i];
  GAI.audio.ensure();
  GAI.audio.tone(660, 0.04, 'square', 0.10);
  draw();
}

dealBtn.addEventListener('click', () => {
  if (phase === 'deal') deal();
  else if (phase === 'draw') drawCards();
});
betBtn.addEventListener('click', () => {
  if (phase === 'draw') return;
  bet = bet === 5 ? 1 : bet + 1;
  GAI.storage.set('gai_poker_bet', bet);
  betEl.textContent = bet;
  renderPaytable();
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const cw = Math.floor((W - 24 - 32) / 5);
  const i = Math.floor((x - 12) / (cw + 8));
  if (i >= 0 && i < 5) toggleHold(i);
});
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const cw = Math.floor((W - 24 - 32) / 5);
  const i = Math.floor((x - 12) / (cw + 8));
  if (i >= 0 && i < 5) toggleHold(i);
}, { passive: false });

document.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '5') { toggleHold(+e.key - 1); return; }
  if (e.key === 'Enter' || e.key === ' ') {
    if (phase === 'deal') deal();
    else if (phase === 'draw') drawCards();
  }
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit(); draw();
})();
