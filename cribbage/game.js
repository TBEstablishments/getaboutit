(() => {
'use strict';
const GAI = window.GAI;
const pegC = document.getElementById('peg');
const pegCtx = pegC.getContext('2d');
const gameC = document.getElementById('game');
const gameCtx = gameC.getContext('2d');
const status = document.getElementById('status');
const ctrls = document.getElementById('ctrls');
const psEl = document.getElementById('ps');
const asEl = document.getElementById('as');
const dealerTag = document.getElementById('dealerTag');
const perfectTag = document.getElementById('perfectTag');

let pScore = 0, aScore = 0;
let dealer = 1;  // 1 = player, 0 = AI
let deck = [];
let pHand = [], aHand = [], pSelected = [], crib = [];
let cut = null;
let phase = 'deal'; // deal, discard, cut, play, show, over
let playStack = [];
let playTurn = 1;
let playPassed = { p: false, a: false };
let pPlay = [];   // cards played from hand during pegging
let aPlay = [];

if (GAI.storage.get('gai_cribbage_perfect') === '1') perfectTag.classList.remove('hidden');

function cardVal(c) { return c.ri === 0 ? 1 : Math.min(10, c.ri + 1); }
function cardRank(c) { return c.ri === 0 ? 1 : c.ri + 1; }

function deal() {
  const fresh = GAI.cards.newDeck();
  // Each gets 6
  pHand = []; aHand = [];
  for (let i = 0; i < 12; i++) (i % 2 === 0 ? pHand : aHand).push(fresh.pop());
  deck = fresh;
  crib = [];
  pSelected = [];
  cut = null;
  playStack = []; playTurn = 1 - dealer; playPassed = { p: false, a: false };
  pPlay = []; aPlay = [];
  phase = 'discard';
  status.textContent = 'TAP 2 CARDS TO DISCARD TO CRIB';
  status.className = 'status';
  pHand.sort((a, b) => a.ri - b.ri);
  aHand.sort((a, b) => a.ri - b.ri);
  renderCtrls();
  draw();
}

function discardToCrib() {
  if (pSelected.length !== 2) { GAI.audio.tone(180, 0.05, 'sawtooth', 0.08); return; }
  // remove from pHand, add to crib
  pSelected.sort((a, b) => b - a);
  for (const i of pSelected) {
    crib.push(pHand[i]); pHand.splice(i, 1);
  }
  // AI discards: keep best 4-card combo, discard worst 2
  const aiDiscard = pickAIDiscard(aHand, dealer === 0);
  for (const i of aiDiscard.sort((a, b) => b - a)) {
    crib.push(aHand[i]); aHand.splice(i, 1);
  }
  pSelected = [];
  // cut card
  cut = deck.pop();
  phase = 'play';
  // jack on cut (nibs) — dealer scores 2
  if (cut.r === 'J') addScore(dealer === 1 ? 'p' : 'a', 2, "NIBS — JACK CUT");
  status.textContent = 'CUT: ' + cut.r + cut.s + ' — PLAY (TAP A CARD)';
  status.className = 'status';
  playTurn = 1 - dealer; // non-dealer plays first
  renderCtrls();
  draw();
  if (playTurn === 0) setTimeout(aiPlay, 600);
}

function pickAIDiscard(hand, ownCrib) {
  // Try all C(6,4) combos; keep the 4-card combo with highest expected score
  let bestScore = -Infinity;
  let bestKeep = [];
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    const keep = hand.filter((_, k) => k !== i && k !== j);
    const sc = scoreHand(keep, null, false);
    // Crib bonus: if AI is dealer, AI gets crib — keep cards that go well in crib too
    const tossed = [hand[i], hand[j]];
    const cribAdj = ownCrib ? scoreToss(tossed) : -scoreToss(tossed) * 0.5;
    const total = sc + cribAdj;
    if (total > bestScore) { bestScore = total; bestKeep = [i, j]; }
  }
  return bestKeep; // indices to discard
}
function scoreToss(twoCards) {
  // rough: pairs add 2, adjacent gives potential run
  let s = 0;
  if (twoCards[0].r === twoCards[1].r) s += 4;
  if (Math.abs(twoCards[0].ri - twoCards[1].ri) === 1) s += 2;
  const sum = cardVal(twoCards[0]) + cardVal(twoCards[1]);
  if (sum === 15) s += 2;
  if (sum === 5) s += 3; // 5s are gold for crib
  return s;
}

function scoreHand(hand, cutCard, isCrib) {
  // Compute fifteens, pairs, runs, flushes, nobs
  const cards = cutCard ? hand.concat([cutCard]) : hand;
  let total = 0;
  // 15s
  total += count15s(cards) * 2;
  // pairs
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    if (cards[i].r === cards[j].r) total += 2;
  }
  // runs: find longest run of length >= 3 considering multiplicities
  total += scoreRuns(cards);
  // flush: 4+ same suit in HAND
  if (hand.every(c => c.s === hand[0].s)) {
    total += 4;
    if (cutCard && cutCard.s === hand[0].s) total += 1;
  } else if (isCrib) {
    // crib flush requires all 5 same suit
  }
  // nobs: jack in hand same suit as cut
  if (cutCard) {
    for (const c of hand) if (c.r === 'J' && c.s === cutCard.s) total += 1;
  }
  return total;
}
function count15s(cards) {
  let n = 0;
  const vals = cards.map(cardVal);
  for (let mask = 1; mask < (1 << cards.length); mask++) {
    let sum = 0;
    for (let i = 0; i < cards.length; i++) if (mask & (1 << i)) sum += vals[i];
    if (sum === 15) n++;
  }
  return n;
}
function scoreRuns(cards) {
  // Sort by rank, find max run length (consecutive distinct ranks), and multiplicity
  const ranks = cards.map(cardRank).slice().sort((a, b) => a - b);
  const unique = [];
  const mult = {};
  for (const r of ranks) {
    if (mult[r]) mult[r]++;
    else { mult[r] = 1; unique.push(r); }
  }
  // find longest consecutive run in unique
  let bestLen = 1, bestStart = 0, curLen = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] === unique[i-1] + 1) { curLen++; if (curLen > bestLen) { bestLen = curLen; bestStart = i - curLen + 1; } }
    else curLen = 1;
  }
  if (bestLen < 3) return 0;
  // Multiply by product of multiplicities for the runs
  let prod = 1;
  for (let i = 0; i < bestLen; i++) prod *= mult[unique[bestStart + i]];
  return bestLen * prod;
}

function addScore(who, pts, label) {
  if (pts <= 0) return;
  if (who === 'p') pScore = Math.min(121, pScore + pts);
  else aScore = Math.min(121, aScore + pts);
  psEl.textContent = pScore; asEl.textContent = aScore;
  if (pts >= 8) GAI.audio.arpeggio([523.25, 659.25, 783.99], 60, 'triangle', 0.16);
  else if (pts > 0) GAI.audio.tone(440 + pts * 30, 0.06, 'square', 0.12);
  if (label && pts) status.textContent = (who === 'p' ? 'YOU' : 'AI') + ' +' + pts + ' · ' + label;
  drawPeg();
  if (pScore >= 121 || aScore >= 121) endGame();
}

function endGame() {
  phase = 'over';
  if (pScore >= 121) {
    status.textContent = '✦ YOU WIN ' + pScore + '-' + aScore;
    status.className = 'status win';
    GAI.recordWin('cribbage');
    GAI.fx.confetti();
    GAI.bestScore('cribbage', pScore - aScore);
  } else {
    status.textContent = 'AI WINS ' + aScore + '-' + pScore;
    status.className = 'status lose';
  }
  renderCtrls();
}

// pegging phase
function playableCards(hand, stack) {
  const total = stack.reduce((s, c) => s + cardVal(c), 0);
  return hand.map((c, i) => i).filter(i => total + cardVal(hand[i]) <= 31);
}

function playCard(who, idx) {
  const hand = who === 'p' ? pHand : aHand;
  const played = who === 'p' ? pPlay : aPlay;
  const c = hand.splice(idx, 1)[0];
  playStack.push(c);
  played.push(c);
  GAI.audio.tone(440 + (who === 'p' ? 100 : 0), 0.05, 'square', 0.10);
  // pegging points
  const total = playStack.reduce((s, x) => s + cardVal(x), 0);
  let pts = 0;
  let labels = [];
  if (total === 15) { pts += 2; labels.push('15'); }
  if (total === 31) { pts += 2; labels.push('31'); }
  // pairs
  let pairCount = 0;
  for (let i = playStack.length - 1; i >= 0; i--) {
    if (playStack[i].r === c.r) pairCount++;
    else break;
  }
  if (pairCount === 2) { pts += 2; labels.push('PAIR'); }
  if (pairCount === 3) { pts += 6 - 2; labels.push('TRIPLE'); }
  if (pairCount === 4) { pts += 12 - 6; labels.push('QUAD'); }
  // run: last 3+ cards form a run
  for (let len = playStack.length; len >= 3; len--) {
    const last = playStack.slice(-len);
    const ranks = last.map(cardRank).slice().sort((a,b) => a - b);
    let ok = true;
    for (let i = 1; i < len; i++) if (ranks[i] !== ranks[i-1] + 1) { ok = false; break; }
    if (ok) { pts += len; labels.push('RUN ' + len); break; }
  }
  if (pts > 0) addScore(who, pts, labels.join(' '));
  draw();
  if (total === 31) {
    // start new sub-stack
    setTimeout(() => { playStack = []; playPassed = { p: false, a: false }; nextPlayTurn(); }, 600);
    return;
  }
  nextPlayTurn();
}

function nextPlayTurn() {
  if (pHand.length === 0 && aHand.length === 0) { theShow(); return; }
  // if current player can't play, they pass
  playTurn = 1 - playTurn;
  const handNow = playTurn === 1 ? pHand : aHand;
  const playable = playableCards(handNow, playStack);
  if (playable.length === 0) {
    if ((playTurn === 1 ? playPassed.p : playPassed.a)) {
      // both passed — go (1 to last to play)
      if (playStack.length) {
        const lastWho = pPlay.length > 0 && aPlay.length > 0
          ? (pPlay[pPlay.length - 1] === playStack[playStack.length - 1] ? 'p' : 'a')
          : (pPlay.length > 0 ? 'p' : 'a');
        addScore(lastWho, 1, 'GO');
      }
      playStack = []; playPassed = { p: false, a: false };
      nextPlayTurn();
      return;
    }
    if (playTurn === 1) playPassed.p = true; else playPassed.a = true;
    nextPlayTurn();
    return;
  }
  status.textContent = playTurn === 1 ? 'YOUR TURN — TAP A CARD' : 'AI THINKING…';
  status.className = 'status';
  renderCtrls();
  if (playTurn === 0) setTimeout(aiPlay, 500);
  draw();
}

function aiPlay() {
  if (phase === 'over') return;
  const playable = playableCards(aHand, playStack);
  if (playable.length === 0) {
    nextPlayTurn();
    return;
  }
  // AI plays card that maximizes immediate points
  let best = -1, bestPts = -1;
  for (const i of playable) {
    const stackAfter = playStack.concat([aHand[i]]);
    const total = stackAfter.reduce((s, c) => s + cardVal(c), 0);
    let pts = 0;
    if (total === 15) pts += 2;
    if (total === 31) pts += 2;
    let pairCount = 0;
    for (let k = stackAfter.length - 1; k >= 0; k--) if (stackAfter[k].r === aHand[i].r) pairCount++; else break;
    if (pairCount === 2) pts += 2;
    if (pairCount === 3) pts += 6;
    if (pairCount === 4) pts += 12;
    if (pts > bestPts) { bestPts = pts; best = i; }
  }
  if (best < 0) best = playable[0];
  playCard('a', best);
}

function theShow() {
  // Non-dealer scores first, then dealer, then crib (dealer)
  const nonDealer = dealer === 1 ? 'a' : 'p';
  const dealerW = dealer === 1 ? 'p' : 'a';
  const ndHand = dealer === 1 ? aHand.concat(aPlay) : pHand.concat(pPlay);
  const dHand = dealer === 1 ? pHand.concat(pPlay) : aHand.concat(aPlay);
  // Note: by this point hands are empty (all played); reconstruct
  const ndPts = scoreHand(ndHand, cut, false);
  const dPts = scoreHand(dHand, cut, false);
  const cribPts = scoreHand(crib, cut, true);
  addScore(nonDealer, ndPts, (nonDealer === 'p' ? 'YOUR' : 'AI') + ' HAND ' + ndPts);
  if (phase === 'over') return;
  setTimeout(() => {
    addScore(dealerW, dPts, (dealerW === 'p' ? 'YOUR' : 'AI') + ' HAND ' + dPts);
    if (phase === 'over') return;
    setTimeout(() => {
      addScore(dealerW, cribPts, (dealerW === 'p' ? 'YOUR' : 'AI') + ' CRIB ' + cribPts);
      // perfect 29
      const total = scoreHand(dHand, cut, false);
      const cribTotal = scoreHand(crib, cut, true);
      if (total === 29 || cribTotal === 29) {
        GAI.storage.set('gai_cribbage_perfect', '1');
        perfectTag.classList.remove('hidden');
        GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0], 90, 'square', 0.20);
        GAI.fx.chromaticFlash(800);
        GAI.fx.confetti({ count: 150 });
      }
      if (phase !== 'over') {
        setTimeout(() => {
          dealer = 1 - dealer;
          dealerTag.textContent = dealer === 1 ? 'YOU DEAL' : 'AI DEALS';
          deal();
        }, 1800);
      }
    }, 1400);
  }, 1400);
}

let cardSlots = [];
function draw() {
  const w = gameC.clientWidth, h = gameC.clientHeight;
  gameCtx.clearRect(0, 0, w, h);
  cardSlots = [];
  const cw = Math.min(50, Math.floor(w / 7));
  const ch = Math.floor(cw * 1.4);
  // cut card
  if (cut) {
    GAI.cards.draw(gameCtx, w - cw - 14, 10, cw, ch, cut);
    gameCtx.fillStyle = '#fff';
    gameCtx.font = 'bold 7px "Press Start 2P", monospace';
    gameCtx.textAlign = 'center'; gameCtx.textBaseline = 'top';
    gameCtx.fillText('CUT', w - cw / 2 - 14, 10 + ch + 4);
  }
  // crib (face down)
  if (crib.length === 4) {
    for (let i = 0; i < 4; i++) GAI.cards.cardBack(gameCtx, 14 + i * 8, 10, cw, ch);
    gameCtx.fillStyle = '#fff';
    gameCtx.font = 'bold 7px "Press Start 2P", monospace';
    gameCtx.textAlign = 'left';
    gameCtx.fillText('CRIB', 14, 10 + ch + 4);
  }
  // AI hand
  for (let i = 0; i < aHand.length; i++) GAI.cards.cardBack(gameCtx, 14 + i * (cw + 4), 90, cw, ch);
  // play stack (centered between AI and player)
  const stackY = (h / 2) - ch / 2;
  for (let i = 0; i < playStack.length; i++) {
    GAI.cards.draw(gameCtx, 14 + i * 18, stackY, cw, ch, playStack[i]);
  }
  if (playStack.length) {
    const total = playStack.reduce((s, c) => s + cardVal(c), 0);
    gameCtx.fillStyle = total >= 31 ? '#ef233c' : (total === 15 ? '#06ffa5' : '#fff');
    gameCtx.font = 'bold 14px "Press Start 2P", monospace';
    gameCtx.textAlign = 'left'; gameCtx.textBaseline = 'middle';
    gameCtx.fillText(String(total), 14 + playStack.length * 18 + cw + 14, stackY + ch / 2);
  }
  // player hand
  for (let i = 0; i < pHand.length; i++) {
    const x = 14 + i * (cw + 4);
    const y = h - ch - 14 + (pSelected.indexOf(i) >= 0 ? -10 : 0);
    GAI.cards.draw(gameCtx, x, y, cw, ch, pHand[i], { glow: pSelected.indexOf(i) >= 0 });
    cardSlots.push({ i, x, y, w: cw, h: ch });
  }
}

function drawPeg() {
  const w = pegC.clientWidth, h = pegC.clientHeight;
  pegCtx.clearRect(0, 0, w, h);
  // 121 holes shown as two horizontal bars
  const cols = 30, rows = 4;
  const cellW = (w - 12) / cols;
  const cellH = (h - 12) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = 6 + c * cellW + cellW / 2, y = 6 + r * cellH + cellH / 2;
    pegCtx.fillStyle = 'rgba(255,255,255,0.1)';
    pegCtx.beginPath(); pegCtx.arc(x, y, 1.6, 0, Math.PI * 2); pegCtx.fill();
  }
  // peg positions
  function placePeg(score, color) {
    const safe = Math.min(120, score);
    const row = Math.floor(safe / 30);
    const col = row % 2 === 0 ? safe % 30 : 29 - safe % 30;
    const x = 6 + col * cellW + cellW / 2, y = 6 + row * cellH + cellH / 2;
    pegCtx.fillStyle = color;
    pegCtx.shadowColor = color; pegCtx.shadowBlur = 6;
    pegCtx.beginPath(); pegCtx.arc(x, y, 3, 0, Math.PI * 2); pegCtx.fill();
    pegCtx.shadowBlur = 0;
  }
  placePeg(pScore, '#00f5ff');
  placePeg(aScore, '#ff9500');
}

function pickHandCard(x, y) {
  for (const s of cardSlots) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s.i;
  }
  return -1;
}

function onTap(clientX, clientY) {
  const rect = gameC.getBoundingClientRect();
  const x = clientX - rect.left, y = clientY - rect.top;
  const i = pickHandCard(x, y);
  if (i < 0) return;
  GAI.audio.ensure();
  if (phase === 'discard') {
    const k = pSelected.indexOf(i);
    if (k >= 0) pSelected.splice(k, 1);
    else if (pSelected.length < 2) pSelected.push(i);
    GAI.audio.tone(560, 0.04, 'triangle', 0.10);
    renderCtrls();
    draw();
  } else if (phase === 'play' && playTurn === 1) {
    const playable = playableCards(pHand, playStack);
    if (!playable.includes(i)) {
      GAI.audio.tone(180, 0.05, 'sawtooth', 0.08);
      return;
    }
    playCard('p', i);
  }
}

function renderCtrls() {
  ctrls.innerHTML = '';
  if (phase === 'discard') {
    const b = document.createElement('button');
    b.className = 'arcade green';
    b.textContent = pSelected.length === 2 ? 'DISCARD' : 'PICK 2 CARDS';
    b.disabled = pSelected.length !== 2;
    b.addEventListener('click', discardToCrib);
    ctrls.appendChild(b);
  } else if (phase === 'over') {
    const b = document.createElement('button');
    b.className = 'arcade cyan';
    b.textContent = 'NEW GAME';
    b.addEventListener('click', () => { pScore = 0; aScore = 0; psEl.textContent = 0; asEl.textContent = 0; dealer = 1; dealerTag.textContent = 'YOU DEAL'; deal(); drawPeg(); });
    ctrls.appendChild(b);
  }
}

gameC.addEventListener('click', (e) => onTap(e.clientX, e.clientY));
gameC.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  onTap(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.min(window.innerWidth - 32, 540);
  const h = Math.min(window.innerHeight - 280, 400);
  gameC.width = w * dpr; gameC.height = h * dpr;
  gameC.style.width = w + 'px'; gameC.style.height = h + 'px';
  gameCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pw = w, ph = 70;
  pegC.width = pw * dpr; pegC.height = ph * dpr;
  pegC.style.width = pw + 'px'; pegC.style.height = ph + 'px';
  pegCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawPeg();
  draw();
}
let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 150); });
GAI.stats.sessionStart('cribbage');
window.addEventListener('pagehide', () => GAI.stats.sessionEnd('cribbage'));

fit(); deal();
})();
