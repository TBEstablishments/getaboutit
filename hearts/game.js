(() => {
'use strict';
const GAI = window.GAI;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const passBtn = document.getElementById('passBtn');
const newBtn = document.getElementById('newBtn');
const sEls = [0,1,2,3].map(i => document.getElementById('s' + i));

let W = 0, H = 0, dpr = 1;
let hands = [[],[],[],[]];   // 4 player hands; 0 = human
let scores = [0,0,0,0];
let handScores = [0,0,0,0];
let trickCards = [];          // {player, card}
let leadPlayer = 0;
let leadSuit = null;
let heartsBroken = false;
let passDir = 1;              // 1=left,2=across,3=right,0=hold
let toPass = [];              // human's selected passes
let phase = 'pass';           // pass | play | over
let currentTurn = 0;
let aiPass = [];              // already-decided AI passes
let moonShooter = -1;
let lastTrickWinner = -1;

function fit() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function deal() {
  const deck = GAI.cards.newDeck();
  hands = [[],[],[],[]];
  for (let i = 0; i < 52; i++) hands[i % 4].push(deck[i]);
  for (const h of hands) h.sort(sortCard);
  handScores = [0,0,0,0];
  trickCards = [];
  heartsBroken = false;
  toPass = [];
  aiPass = [];
  moonShooter = -1;
  // pass direction cycle each hand: 1=left,2=across,3=right,0=hold
  const cycles = [1,2,3,0];
  passDir = cycles[(passDirIdx++) % 4];
  if (passDir === 0) {
    phase = 'play';
    leadPlayer = findCardOwner({ r: '2', s: '♣' });
    currentTurn = leadPlayer;
    leadSuit = null;
    status.textContent = (currentTurn === 0 ? 'YOUR TURN — LEAD 2♣' : 'TRICK BEGINS');
    passBtn.classList.add('hidden');
    if (currentTurn !== 0) setTimeout(aiPlay, 600);
  } else {
    phase = 'pass';
    status.textContent = 'PICK 3 TO PASS ' + (passDir === 1 ? 'LEFT' : passDir === 2 ? 'ACROSS' : 'RIGHT');
    passBtn.textContent = 'PASS ' + (passDir === 1 ? 'LEFT →' : passDir === 2 ? 'ACROSS ↑' : '← RIGHT');
    passBtn.classList.add('hidden');
  }
  newBtn.classList.add('hidden');
  draw();
}
let passDirIdx = 0;

function sortCard(a, b) {
  if (a.si !== b.si) return a.si - b.si;
  return a.ri - b.ri;
}

function findCardOwner(card) {
  for (let p = 0; p < 4; p++) {
    if (hands[p].some(c => c.r === card.r && c.s === card.s)) return p;
  }
  return 0;
}

// pass cards selected by human
function togglePass(card) {
  const i = toPass.findIndex(c => c.r === card.r && c.s === card.s);
  if (i >= 0) toPass.splice(i, 1);
  else if (toPass.length < 3) toPass.push(card);
  passBtn.classList.toggle('hidden', toPass.length !== 3);
  draw();
}

function doPass() {
  if (toPass.length !== 3) return;
  // build AI passes
  for (let p = 1; p < 4; p++) {
    const picks = pickAIPass(hands[p]);
    aiPass.push({ from: p, to: targetOfPass(p, passDir), cards: picks });
  }
  const human = { from: 0, to: targetOfPass(0, passDir), cards: toPass.slice() };
  const all = [human, ...aiPass];
  // remove + give
  for (const m of all) {
    for (const c of m.cards) {
      const idx = hands[m.from].findIndex(x => x.r === c.r && x.s === c.s);
      if (idx >= 0) hands[m.from].splice(idx, 1);
    }
  }
  for (const m of all) {
    hands[m.to].push(...m.cards);
  }
  for (const h of hands) h.sort(sortCard);
  toPass = [];
  passBtn.classList.add('hidden');
  phase = 'play';
  leadPlayer = findCardOwner({ r: '2', s: '♣' });
  currentTurn = leadPlayer;
  leadSuit = null;
  status.textContent = (currentTurn === 0 ? 'YOUR TURN — LEAD 2♣' : 'AI LEADS');
  if (currentTurn !== 0) setTimeout(aiPlay, 600);
  draw();
}
function targetOfPass(from, dir) { return (from + dir) % 4; }

function pickAIPass(hand) {
  const sorted = hand.slice().sort((a,b) => {
    // dump high spades, high hearts, then any high
    const scoreA = passScore(a), scoreB = passScore(b);
    return scoreB - scoreA;
  });
  return sorted.slice(0, 3);
}
function passScore(c) {
  if (c.s === '♠' && c.ri >= 10) return 100 + c.ri;
  if (c.s === '♥' && c.ri >= 10) return 90 + c.ri;
  if (c.ri === 12 && c.s === '♠') return 200;
  return c.ri;
}

function legalPlays(player) {
  const hand = hands[player];
  if (trickCards.length === 0) {
    // first trick: must lead 2 of clubs if you have it
    const firstTrickEver = handScores.every(s => s === 0) && hands.every(h => h.length === hands[0].length);
    if (firstTrickEver) {
      const twoClubs = hand.filter(c => c.r === '2' && c.s === '♣');
      if (twoClubs.length) return twoClubs;
    }
    if (!heartsBroken) {
      const nonHearts = hand.filter(c => c.s !== '♥');
      if (nonHearts.length) return nonHearts;
    }
    return hand;
  }
  // follow suit if possible
  const ofSuit = hand.filter(c => c.s === leadSuit);
  if (ofSuit.length) return ofSuit;
  // first trick: can't play hearts or queen of spades
  const firstTrickEver = handScores.every(s => s === 0) && trickCards.length > 0 && hands[0].length + trickCards.filter(t => t.player === 0).length === 13;
  if (firstTrickEver) {
    const safe = hand.filter(c => c.s !== '♥' && !(c.r === 'Q' && c.s === '♠'));
    if (safe.length) return safe;
  }
  return hand;
}

function playCard(player, card) {
  const idx = hands[player].findIndex(c => c.r === card.r && c.s === card.s);
  if (idx < 0) return;
  hands[player].splice(idx, 1);
  trickCards.push({ player, card });
  if (trickCards.length === 1) leadSuit = card.s;
  if (card.s === '♥') heartsBroken = true;
  GAI.audio.tone(440 + player * 80, 0.05, 'triangle', 0.10);
  draw();
  if (trickCards.length === 4) {
    setTimeout(finishTrick, 700);
  } else {
    currentTurn = (currentTurn + 1) % 4;
    if (currentTurn !== 0) setTimeout(aiPlay, 600);
    else status.textContent = 'YOUR TURN';
  }
}

function aiPlay() {
  if (phase !== 'play' || currentTurn === 0) return;
  const legal = legalPlays(currentTurn);
  // simple heuristic: if cannot follow suit, dump highest dangerous card
  let pick;
  if (trickCards.length === 0) {
    pick = legal.reduce((m, c) => (cardValue(c) < cardValue(m) ? c : m));
  } else if (legal[0].s !== leadSuit) {
    pick = legal.reduce((m, c) => (cardValue(c) > cardValue(m) ? c : m));
  } else {
    const taking = legal.filter(c => trickCards.every(t => cardValue(t.card) < cardValue(c)));
    const safe = legal.filter(c => trickCards.some(t => cardValue(t.card) > cardValue(c)));
    // if hearts/qspades on the table, try to dodge taking it
    const danger = trickCards.some(t => t.card.s === '♥' || (t.card.r === 'Q' && t.card.s === '♠'));
    if (danger && safe.length) pick = safe.reduce((m, c) => (cardValue(c) > cardValue(m) ? c : m));
    else if (taking.length === 0) pick = legal.reduce((m, c) => (cardValue(c) > cardValue(m) ? c : m));
    else pick = legal.reduce((m, c) => (cardValue(c) < cardValue(m) ? c : m));
  }
  playCard(currentTurn, pick);
}
function cardValue(c) {
  return c.ri === 0 ? 14 : c.ri + 1;
}

function finishTrick() {
  // determine winner
  let win = trickCards[0];
  for (const t of trickCards) {
    if (t.card.s === leadSuit && cardValue(t.card) > cardValue(win.card)) win = t;
  }
  // points
  let pts = 0;
  for (const t of trickCards) {
    if (t.card.s === '♥') pts++;
    if (t.card.r === 'Q' && t.card.s === '♠') pts += 13;
  }
  handScores[win.player] += pts;
  lastTrickWinner = win.player;
  GAI.audio.tone(220 + win.player * 60, 0.1, 'sine', 0.10);
  if (pts > 0) GAI.audio.tone(220, 0.15, 'sawtooth', 0.14);
  trickCards = [];
  leadSuit = null;
  if (hands[0].length === 0 && hands[1].length === 0 && hands[2].length === 0 && hands[3].length === 0) {
    setTimeout(finishHand, 400);
    return;
  }
  currentTurn = win.player;
  draw();
  status.textContent = (currentTurn === 0 ? 'YOUR LEAD' : 'P' + (currentTurn + 1) + ' LEADS');
  if (currentTurn !== 0) setTimeout(aiPlay, 700);
}

function finishHand() {
  // check shoot the moon
  const shoot = handScores.findIndex(s => s === 26);
  if (shoot >= 0) {
    moonShooter = shoot;
    GAI.fx.chromaticFlash(500);
    GAI.audio.arpeggio([261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5], 90, 'triangle', 0.18);
    status.textContent = (shoot === 0 ? 'YOU SHOT THE MOON 🌑' : 'P' + (shoot + 1) + ' SHOT THE MOON 🌑');
    for (let i = 0; i < 4; i++) handScores[i] = (i === shoot) ? 0 : 26;
  }
  for (let i = 0; i < 4; i++) scores[i] += handScores[i];
  updateScores();
  // game over?
  if (scores.some(s => s >= 100)) {
    phase = 'over';
    const min = Math.min(...scores);
    const won = scores.indexOf(min) === 0;
    status.textContent = won ? '✦ YOU WIN' : 'GAME OVER';
    if (won) {
      GAI.recordWin('hearts');
      GAI.fx.confetti();
      GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
    } else {
      GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.16);
    }
    newBtn.textContent = '▶ NEW GAME';
    newBtn.classList.remove('hidden');
    GAI.bestScore('hearts', won ? 1 : 0);
    return;
  }
  newBtn.textContent = 'NEXT HAND';
  newBtn.classList.remove('hidden');
}
function updateScores() {
  for (let i = 0; i < 4; i++) sEls[i].textContent = scores[i];
}

// ============ rendering ============
function draw() {
  ctx.clearRect(0, 0, W, H);
  // table circle
  ctx.fillStyle = 'rgba(58,12,163,0.18)';
  ctx.beginPath();
  ctx.ellipse(W/2, H/2, W*0.42, H*0.32, 0, 0, Math.PI*2);
  ctx.fill();
  // played cards (one per player)
  const cw = Math.min(60, W * 0.13);
  const ch = cw * 1.4;
  const cx = W / 2, cy = H / 2;
  const posPlayed = [
    { x: cx - cw/2, y: cy + 30 },
    { x: cx - cw - 40, y: cy - ch/2 },
    { x: cx - cw/2, y: cy - ch - 30 },
    { x: cx + 40, y: cy - ch/2 }
  ];
  for (const t of trickCards) GAI.cards.draw(ctx, posPlayed[t.player].x, posPlayed[t.player].y, cw, ch, t.card, { glow: t.player === lastTrickWinner });
  // turn indicator
  if (phase === 'play') {
    const p = posPlayed[currentTurn];
    ctx.strokeStyle = '#00f5ff'; ctx.lineWidth = 2;
    GAI.fx.roundRect(ctx, p.x - 4, p.y - 4, cw + 8, ch + 8, 8);
    ctx.stroke();
  }
  // opponent hands as backs
  const obw = Math.min(28, W * 0.06);
  const obh = obw * 1.4;
  // left (player 1)
  for (let i = 0; i < hands[1].length; i++) {
    const y = H * 0.25 + i * 12;
    GAI.cards.cardBack(ctx, 16, y, obw, obh);
  }
  // top (player 2)
  for (let i = 0; i < hands[2].length; i++) {
    const x = W * 0.5 - hands[2].length * 8 + i * 16;
    GAI.cards.cardBack(ctx, x, 12, obw, obh);
  }
  // right (player 3)
  for (let i = 0; i < hands[3].length; i++) {
    const y = H * 0.25 + i * 12;
    GAI.cards.cardBack(ctx, W - 16 - obw, y, obw, obh);
  }
  // player hand
  const hand = hands[0];
  const handW = Math.min(W - 32, hand.length * (cw * 0.55) + cw);
  const startX = W / 2 - handW / 2;
  for (let i = 0; i < hand.length; i++) {
    const x = startX + i * ((handW - cw) / Math.max(1, hand.length - 1));
    const y = H - ch - 50;
    const isPassed = toPass.some(c => c.r === hand[i].r && c.s === hand[i].s);
    GAI.cards.draw(ctx, x, isPassed ? y - 14 : y, cw, ch, hand[i], { glow: isPassed });
    hand[i]._x = x; hand[i]._y = isPassed ? y - 14 : y; hand[i]._w = cw; hand[i]._h = ch;
  }
  if (heartsBroken) {
    ctx.fillStyle = '#ef233c';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('HEARTS BROKEN ♥', W - 24, H - ch - 60);
  }
}

function findCardAt(x, y) {
  const hand = hands[0];
  for (let i = hand.length - 1; i >= 0; i--) {
    const c = hand[i];
    if (c._x == null) continue;
    if (x >= c._x && x <= c._x + c._w && y >= c._y && y <= c._y + c._h) return c;
  }
  return null;
}
function handleClick(clientX, clientY) {
  if (phase === 'pass') {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    const card = findCardAt(x, y);
    if (card) { GAI.audio.ensure(); togglePass(card); }
    return;
  }
  if (phase === 'play' && currentTurn === 0) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    const card = findCardAt(x, y);
    if (!card) return;
    const legal = legalPlays(0);
    if (!legal.find(c => c.r === card.r && c.s === card.s)) { GAI.audio.tone(180, 0.05, 'sawtooth', 0.08); return; }
    GAI.audio.ensure();
    playCard(0, card);
  }
}

canvas.addEventListener('click', (e) => handleClick(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  handleClick(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

passBtn.addEventListener('click', doPass);
newBtn.addEventListener('click', () => {
  if (phase === 'over') {
    scores = [0,0,0,0];
    updateScores();
    passDirIdx = 0;
  }
  deal();
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit(); deal();
})();
