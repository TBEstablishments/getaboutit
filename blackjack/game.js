(() => {
'use strict';
const GAI = window.GAI;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const chipsEl = document.getElementById('chips');
const betEl = document.getElementById('bet');
const bestEl = document.getElementById('best');
const betCtrls = document.getElementById('betCtrls');
const playCtrls = document.getElementById('playCtrls');
const hitBtn = document.getElementById('hitBtn');
const standBtn = document.getElementById('standBtn');
const doubleBtn = document.getElementById('doubleBtn');
const splitBtn = document.getElementById('splitBtn');

let chips = +(GAI.storage.get('gai_blackjack_chips') || 1000);
let best = +(GAI.storage.get('gai_best_blackjack') || chips);
let bet = +(GAI.storage.get('gai_blackjack_bet') || 50);
let deck = [];
let dealer = [];
let playerHands = [];
let activeHand = 0;
let phase = 'bet';   // bet | play | dealer | done
let showDealerHole = false;
let chipParticles = [];

chipsEl.textContent = chips;
betEl.textContent = bet;
bestEl.textContent = best;

let W = 0, H = 0;
function fit() {
  const maxW = Math.min(window.innerWidth - 32, 520);
  const maxH = Math.min(window.innerHeight - 300, 380);
  W = maxW; H = maxH;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function reshuffle() { deck = GAI.cards.newDeck(); }

function deal() {
  GAI.audio.ensure();
  if (chips < bet) { bet = Math.min(bet, chips); if (bet <= 0) { chips = 1000; GAI.storage.set('gai_blackjack_chips', chips); chipsEl.textContent = chips; bet = 50; betEl.textContent = bet; return; } }
  if (!deck.length || deck.length < 15) reshuffle();
  dealer = []; playerHands = [{ cards: [], bet: bet, doubled: false }];
  activeHand = 0;
  showDealerHole = false;
  chips -= bet;
  GAI.storage.set('gai_blackjack_chips', chips);
  chipsEl.textContent = chips;
  // sequence
  let i = 0;
  const order = [['p',0],['d'],['p',0],['d']];
  function next() {
    if (i >= order.length) { afterDeal(); return; }
    const o = order[i++];
    if (o[0] === 'p') playerHands[o[1]].cards.push(deck.pop());
    else dealer.push(deck.pop());
    GAI.audio.tone(440 + i * 80, 0.05, 'square', 0.10);
    draw();
    setTimeout(next, 180);
  }
  next();
}
function afterDeal() {
  phase = 'play';
  betCtrls.classList.add('hidden');
  playCtrls.classList.remove('hidden');
  updateButtons();
  const pv = GAI.cards.handValue(playerHands[0].cards);
  const dv = GAI.cards.handValue(dealer);
  if (pv === 21) {
    status.textContent = 'BLACKJACK!';
    setTimeout(() => stand(), 700);
    return;
  }
  status.textContent = 'PLAYER ' + pv;
  status.className = 'status';
}
function updateButtons() {
  const h = playerHands[activeHand];
  splitBtn.classList.toggle('hidden', !(h.cards.length === 2 && h.cards[0].r === h.cards[1].r && playerHands.length === 1 && chips >= bet));
  doubleBtn.style.opacity = h.cards.length === 2 && chips >= h.bet ? '1' : '0.4';
}

function hit() {
  GAI.audio.ensure();
  const h = playerHands[activeHand];
  h.cards.push(deck.pop());
  GAI.audio.tone(660, 0.05, 'square', 0.12);
  draw();
  const v = GAI.cards.handValue(h.cards);
  if (v > 21) {
    status.textContent = 'BUST';
    status.className = 'status lose';
    GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.16);
    GAI.fx.screenShake(canvas, 6, 280);
    nextHand();
  } else if (v === 21) {
    setTimeout(() => stand(), 500);
  } else {
    status.textContent = 'PLAYER ' + v;
    status.className = 'status';
    updateButtons();
  }
}
function stand() {
  nextHand();
}
function doubleDown() {
  const h = playerHands[activeHand];
  if (h.cards.length !== 2 || chips < h.bet) return;
  chips -= h.bet;
  chipsEl.textContent = chips;
  GAI.storage.set('gai_blackjack_chips', chips);
  h.bet *= 2;
  h.doubled = true;
  GAI.audio.ensure();
  hit();
  setTimeout(() => { if (phase === 'play' && playerHands[activeHand] === h) nextHand(); }, 500);
}
function split() {
  const h = playerHands[activeHand];
  if (!(h.cards.length === 2 && h.cards[0].r === h.cards[1].r)) return;
  if (chips < bet) return;
  chips -= bet;
  chipsEl.textContent = chips;
  GAI.storage.set('gai_blackjack_chips', chips);
  const card2 = h.cards.pop();
  const newHand = { cards: [card2], bet: bet, doubled: false };
  playerHands.push(newHand);
  // deal one new card to each
  h.cards.push(deck.pop());
  newHand.cards.push(deck.pop());
  GAI.audio.ensure();
  GAI.audio.arpeggio([523.25, 659.25], 80, 'square', 0.14);
  draw();
  updateButtons();
}
function nextHand() {
  activeHand++;
  if (activeHand >= playerHands.length) {
    dealerPlay();
  } else {
    status.textContent = 'HAND ' + (activeHand + 1) + ' — ' + GAI.cards.handValue(playerHands[activeHand].cards);
    updateButtons();
    draw();
  }
}
function dealerPlay() {
  phase = 'dealer';
  playCtrls.classList.add('hidden');
  showDealerHole = true;
  draw();
  // dealer hits until 17 (stands on soft 17)
  const step = () => {
    const v = GAI.cards.handValue(dealer);
    if (v < 17) {
      dealer.push(deck.pop());
      GAI.audio.tone(330, 0.06, 'square', 0.10);
      draw();
      setTimeout(step, 500);
    } else {
      settle();
    }
  };
  setTimeout(step, 600);
}
function settle() {
  const dv = GAI.cards.handValue(dealer);
  let totalWin = 0;
  const messages = [];
  for (let i = 0; i < playerHands.length; i++) {
    const h = playerHands[i];
    const pv = GAI.cards.handValue(h.cards);
    if (pv > 21) { messages.push('BUST'); continue; }
    if (pv === 21 && h.cards.length === 2 && playerHands.length === 1) {
      // natural blackjack — 3:2
      totalWin += h.bet + Math.floor(h.bet * 1.5);
      messages.push('BLACKJACK +' + Math.floor(h.bet * 1.5));
      continue;
    }
    if (dv > 21) { totalWin += h.bet * 2; messages.push('DEALER BUST'); continue; }
    if (pv > dv) { totalWin += h.bet * 2; messages.push('WIN +' + h.bet); }
    else if (pv === dv) { totalWin += h.bet; messages.push('PUSH'); }
    else { messages.push('LOSE'); }
  }
  chips += totalWin;
  GAI.storage.set('gai_blackjack_chips', chips);
  chipsEl.textContent = chips;
  if (chips > best) { best = chips; GAI.storage.set('gai_best_blackjack', best); bestEl.textContent = best; }
  status.textContent = messages.join(' · ');
  status.className = 'status ' + (totalWin > 0 ? 'win' : totalWin === 0 ? '' : 'lose');
  if (messages.some(m => m.startsWith('WIN') || m.startsWith('BLACKJACK') || m.startsWith('DEALER BUST'))) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
    GAI.recordWin('blackjack');
    if (messages.some(m => m.startsWith('BLACKJACK'))) GAI.fx.confetti({ count: 40 });
  } else if (messages.every(m => m === 'PUSH')) {
    GAI.audio.tone(440, 0.1, 'sine', 0.12);
  } else {
    GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.14);
  }
  phase = 'bet';
  setTimeout(() => {
    betCtrls.classList.remove('hidden');
    if (chips <= 0) {
      chips = 1000;
      GAI.storage.set('gai_blackjack_chips', chips);
      chipsEl.textContent = chips;
      status.textContent = 'CHIPS RESET — TRY AGAIN';
    }
    draw();
  }, 1400);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // dealer label
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 9px "Press Start 2P", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('DEALER ' + (showDealerHole ? GAI.cards.handValue(dealer) : '?'), 14, 8);
  // dealer cards
  const cw = Math.min(64, Math.floor((W - 60) / 6));
  const ch = Math.floor(cw * 1.4);
  for (let i = 0; i < dealer.length; i++) {
    const x = 14 + i * (cw * 0.55);
    const y = 24;
    const face = i === 1 && !showDealerHole ? null : dealer[i];
    if (face) GAI.cards.draw(ctx, x, y, cw, ch, face);
    else GAI.cards.cardBack(ctx, x, y, cw, ch);
  }
  // player hands
  const baseY = H - ch - 24;
  for (let h = 0; h < playerHands.length; h++) {
    const hand = playerHands[h];
    const handX = 14 + h * (cw * 3 + 24);
    for (let i = 0; i < hand.cards.length; i++) {
      const x = handX + i * (cw * 0.55);
      GAI.cards.draw(ctx, x, baseY, cw, ch, hand.cards[i], { glow: h === activeHand && phase === 'play' });
    }
    ctx.fillStyle = h === activeHand && phase === 'play' ? '#06ffa5' : 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('P ' + GAI.cards.handValue(hand.cards) + (hand.doubled ? ' ×2' : ''), handX, baseY + ch + 6);
  }
}

document.getElementById('dealBtn').addEventListener('click', () => { if (phase === 'bet') deal(); });
document.getElementById('betDown').addEventListener('click', () => { bet = Math.max(25, bet - 25); GAI.storage.set('gai_blackjack_bet', bet); betEl.textContent = bet; });
document.getElementById('betUp').addEventListener('click', () => { bet = Math.min(chips, bet + 25); GAI.storage.set('gai_blackjack_bet', bet); betEl.textContent = bet; });
hitBtn.addEventListener('click', () => phase === 'play' && hit());
standBtn.addEventListener('click', () => phase === 'play' && stand());
doubleBtn.addEventListener('click', () => phase === 'play' && doubleDown());
splitBtn.addEventListener('click', () => phase === 'play' && split());

document.addEventListener('keydown', (e) => {
  if (phase === 'play') {
    if (e.key === 'h' || e.key === 'H') hit();
    if (e.key === 's' || e.key === 'S') stand();
    if (e.key === 'd' || e.key === 'D') doubleDown();
  } else if (phase === 'bet') {
    if (e.key === 'Enter' || e.key === ' ') deal();
  }
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit(); reshuffle(); draw();
})();
