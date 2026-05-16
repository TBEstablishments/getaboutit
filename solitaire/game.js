(() => {
'use strict';
const GAI = window.GAI;
const SUITS = ['♠','♥','♦','♣'];
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const winsEl = document.getElementById('wins');
const bestEl = document.getElementById('best');
const undoBtn = document.getElementById('undoBtn');
const autoBtn = document.getElementById('autoBtn');
const newBtn = document.getElementById('newBtn');

let W = 0, H = 0;
let cw = 60, ch = 84, pad = 8;
let stock = [], waste = [], foundations = [[],[],[],[]], tableau = [[],[],[],[],[],[],[]];
let selected = null;  // {pile, index, cards[]}
let moves = 0;
let undoSnap = null;
let bounceParticles = [];
let won = false;
let wins = +(GAI.storage.get('gai_solitaire_wins') || 0);
let best = +(GAI.storage.get('gai_solitaire_best') || 0);
winsEl.textContent = wins;
bestEl.textContent = best || '—';

function snap() {
  return JSON.stringify({
    stock: stock, waste: waste, found: foundations, tab: tableau, moves
  });
}
function restore(s) {
  const o = JSON.parse(s);
  stock = o.stock; waste = o.waste; foundations = o.found; tableau = o.tab; moves = o.moves;
  movesEl.textContent = moves;
}

function newGame() {
  const deck = GAI.cards.newDeck();
  stock = []; waste = [];
  foundations = [[],[],[],[]];
  tableau = [];
  for (let i = 0; i < 7; i++) tableau.push([]);
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      const card = deck.pop();
      card.faceUp = j === i;
      tableau[j].push(card);
    }
  }
  while (deck.length) { const c = deck.pop(); c.faceUp = false; stock.push(c); }
  selected = null;
  moves = 0; movesEl.textContent = '0';
  undoSnap = null;
  won = false;
  autoBtn.classList.add('hidden');
  draw();
}

function fit() {
  W = window.innerWidth; H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cw = Math.min(70, Math.floor((W - 80) / 7));
  ch = Math.floor(cw * 1.4);
  pad = Math.max(4, Math.floor(cw * 0.12));
}

function topOffsetY() { return 80; }
function pileXY(pile, index) {
  const top = topOffsetY();
  const cols = (W - 8 * pad) / 7;
  if (pile.startsWith('t')) {
    const i = +pile.slice(1);
    return { x: pad + i * (cw + pad), y: top + ch + pad * 3 + index * Math.max(14, Math.floor(ch * 0.22)) };
  }
  if (pile === 'stock') return { x: pad, y: top };
  if (pile === 'waste') return { x: pad + (cw + pad) + index * Math.max(14, Math.floor(cw * 0.25)), y: top };
  if (pile.startsWith('f')) {
    const i = +pile.slice(1);
    return { x: W - (4 - i) * (cw + pad), y: top };
  }
  return { x: 0, y: 0 };
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // foundation outlines
  for (let i = 0; i < 4; i++) {
    const p = pileXY('f' + i, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    GAI.fx.roundRect(ctx, p.x, p.y, cw, ch, 6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = 'bold ' + Math.round(cw * 0.4) + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(SUITS[i], p.x + cw / 2, p.y + ch / 2);
    if (foundations[i].length) {
      const top = foundations[i][foundations[i].length - 1];
      GAI.cards.draw(ctx, p.x, p.y, cw, ch, top, { glow: isSelected('f' + i, foundations[i].length - 1) });
    }
  }
  // stock
  const sp = pileXY('stock', 0);
  if (stock.length) {
    GAI.cards.cardBack(ctx, sp.x, sp.y, cw, ch);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    GAI.fx.roundRect(ctx, sp.x, sp.y, cw, ch, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('↻', sp.x + cw / 2, sp.y + ch / 2);
  }
  // waste (last 3)
  const visibleWaste = waste.slice(-3);
  for (let i = 0; i < visibleWaste.length; i++) {
    const wp = pileXY('waste', i);
    GAI.cards.draw(ctx, wp.x, wp.y, cw, ch, visibleWaste[i], { glow: isSelected('waste', waste.length - visibleWaste.length + i) });
  }
  // tableau
  for (let c = 0; c < 7; c++) {
    const col = tableau[c];
    if (col.length === 0) {
      const p = pileXY('t' + c, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      GAI.fx.roundRect(ctx, p.x, p.y, cw, ch, 6); ctx.stroke();
    }
    for (let i = 0; i < col.length; i++) {
      const p = pileXY('t' + c, i);
      const card = col[i];
      if (!card.faceUp) GAI.cards.cardBack(ctx, p.x, p.y, cw, ch);
      else GAI.cards.draw(ctx, p.x, p.y, cw, ch, card, { glow: isSelected('t' + c, i) });
    }
  }
  // bounce particles for win
  for (const p of bounceParticles) {
    GAI.cards.draw(ctx, p.x, p.y, cw, ch, p.card);
  }
}

function isSelected(pile, idx) {
  if (!selected) return false;
  if (selected.pile !== pile) return false;
  return idx >= selected.index && idx <= selected.index + (selected.cards.length - 1);
}

// determine pile at a point
function pickPile(x, y) {
  // stock
  const sp = pileXY('stock', 0);
  if (x >= sp.x && x <= sp.x + cw && y >= sp.y && y <= sp.y + ch) return { pile: 'stock', index: -1 };
  // waste
  const visibleWaste = waste.slice(-3);
  for (let i = visibleWaste.length - 1; i >= 0; i--) {
    const wp = pileXY('waste', i);
    if (x >= wp.x && x <= wp.x + cw && y >= wp.y && y <= wp.y + ch) {
      const realIdx = waste.length - visibleWaste.length + i;
      return { pile: 'waste', index: realIdx };
    }
  }
  // foundation
  for (let i = 0; i < 4; i++) {
    const p = pileXY('f' + i, 0);
    if (x >= p.x && x <= p.x + cw && y >= p.y && y <= p.y + ch) return { pile: 'f' + i, index: foundations[i].length - 1 };
  }
  // tableau
  for (let c = 0; c < 7; c++) {
    const col = tableau[c];
    for (let i = col.length - 1; i >= 0; i--) {
      const p = pileXY('t' + c, i);
      if (x >= p.x && x <= p.x + cw && y >= p.y && y <= p.y + ch) return { pile: 't' + c, index: i };
    }
    // empty pile
    if (col.length === 0) {
      const p = pileXY('t' + c, 0);
      if (x >= p.x && x <= p.x + cw && y >= p.y && y <= p.y + ch) return { pile: 't' + c, index: -1 };
    }
  }
  return null;
}

function handleTap(x, y) {
  const target = pickPile(x, y);
  if (!target) { selected = null; draw(); return; }
  if (target.pile === 'stock') {
    drawFromStock();
    return;
  }
  if (selected) {
    // attempt move from selected to target
    if (target.pile === selected.pile) {
      selected = null; draw(); return;
    }
    if (tryMove(selected, target)) {
      moves++; movesEl.textContent = moves;
      selected = null;
      flipExposed();
      draw();
      checkWin();
      return;
    }
    // Try picking up from target instead
    selected = null;
  }
  // pick up from target
  const card = getCardAt(target);
  if (!card) return;
  if (target.pile === 'waste') {
    if (target.index !== waste.length - 1) return;
    selected = { pile: 'waste', index: target.index, cards: [card] };
  } else if (target.pile.startsWith('f')) {
    selected = { pile: target.pile, index: target.index, cards: [card] };
  } else if (target.pile.startsWith('t')) {
    const c = +target.pile.slice(1);
    const col = tableau[c];
    if (!col[target.index].faceUp) {
      // can only flip if it's the bottom card
      if (target.index === col.length - 1) {
        col[target.index].faceUp = true;
        GAI.audio.tone(440, 0.04, 'triangle', 0.10);
        moves++; movesEl.textContent = moves;
        draw();
      }
      return;
    }
    selected = { pile: target.pile, index: target.index, cards: col.slice(target.index) };
  }
  GAI.audio.tone(660, 0.03, 'square', 0.08);
  draw();
}
function getCardAt(target) {
  if (target.pile === 'waste') return waste[target.index];
  if (target.pile.startsWith('f')) return foundations[+target.pile.slice(1)][target.index];
  if (target.pile.startsWith('t')) return tableau[+target.pile.slice(1)][target.index];
  return null;
}

function drawFromStock() {
  undoSnap = snap();
  GAI.audio.ensure();
  if (stock.length === 0) {
    while (waste.length) { const c = waste.pop(); c.faceUp = false; stock.push(c); }
    GAI.audio.tone(220, 0.06, 'sawtooth', 0.10);
  } else {
    for (let i = 0; i < 3 && stock.length; i++) {
      const c = stock.pop(); c.faceUp = true; waste.push(c);
      GAI.audio.tone(660 - i * 40, 0.04, 'square', 0.10);
    }
  }
  moves++; movesEl.textContent = moves;
  draw();
}

function tryMove(sel, target) {
  // source cards
  const cards = sel.cards;
  // destination check
  if (target.pile.startsWith('f')) {
    if (cards.length !== 1) return false;
    const i = +target.pile.slice(1);
    const card = cards[0];
    if (SUITS.indexOf(card.s) !== i) return false;
    const top = foundations[i][foundations[i].length - 1];
    if (!top && card.r === 'A') {
      removeFromSource(sel); foundations[i].push(card);
      undoSnap = snap();
      GAI.audio.arpeggio([523.25, 659.25, 783.99], 50, 'triangle', 0.16);
      return true;
    }
    if (top && cardOrder(card) === cardOrder(top) + 1) {
      removeFromSource(sel); foundations[i].push(card);
      undoSnap = snap();
      GAI.audio.tone(880, 0.06, 'triangle', 0.12);
      return true;
    }
    return false;
  }
  if (target.pile.startsWith('t')) {
    const c = +target.pile.slice(1);
    const col = tableau[c];
    const card = cards[0];
    if (col.length === 0) {
      if (card.r !== 'K') return false;
      removeFromSource(sel); for (const cc of cards) col.push(cc);
      undoSnap = snap();
      GAI.audio.tone(440, 0.06, 'square', 0.12);
      return true;
    }
    const top = col[col.length - 1];
    if (!top.faceUp) return false;
    if (cardOrder(card) !== cardOrder(top) - 1) return false;
    if (GAI.cards.isRed(card) === GAI.cards.isRed(top)) return false;
    removeFromSource(sel); for (const cc of cards) col.push(cc);
    undoSnap = snap();
    GAI.audio.tone(520, 0.06, 'square', 0.12);
    return true;
  }
  return false;
}
function cardOrder(c) {
  // A=1, 2..10, J=11, Q=12, K=13
  if (c.r === 'A') return 1;
  if (c.r === 'J') return 11;
  if (c.r === 'Q') return 12;
  if (c.r === 'K') return 13;
  return +c.r;
}
function removeFromSource(sel) {
  if (sel.pile === 'waste') { waste.splice(sel.index, 1); return; }
  if (sel.pile.startsWith('f')) { foundations[+sel.pile.slice(1)].pop(); return; }
  if (sel.pile.startsWith('t')) { tableau[+sel.pile.slice(1)].splice(sel.index); }
}
function flipExposed() {
  for (const col of tableau) {
    if (col.length && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true;
      GAI.audio.tone(440, 0.04, 'triangle', 0.08);
    }
  }
  // show auto-complete if all are face-up
  const allUp = tableau.every(col => col.every(c => c.faceUp));
  autoBtn.classList.toggle('hidden', !allUp);
}

function checkWin() {
  const total = foundations.reduce((s, p) => s + p.length, 0);
  if (total === 52 && !won) {
    won = true;
    wins++; GAI.storage.set('gai_solitaire_wins', wins); winsEl.textContent = wins;
    GAI.bestScore('solitaire', wins);
    const cur = +GAI.storage.get('gai_solitaire_best') || Infinity;
    if (moves < cur) { GAI.storage.set('gai_solitaire_best', String(moves)); best = moves; bestEl.textContent = best; }
    GAI.recordWin('solitaire');
    GAI.fx.confetti({ count: 100 });
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 80, 'square', 0.18);
    launchBounce();
  }
}

function launchBounce() {
  // cascade cards from foundations
  const cards = [];
  for (let i = 0; i < 4; i++) {
    while (foundations[i].length) {
      const c = foundations[i].pop();
      cards.push({ x: pileXY('f' + i, 0).x, y: pileXY('f' + i, 0).y, vx: -200 + Math.random() * 400, vy: -200 - Math.random() * 200, card: c });
    }
  }
  bounceParticles = cards;
  const start = performance.now();
  function step(now) {
    const dt = 1/60;
    for (const p of bounceParticles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 700 * dt;
      if (p.x < 0) { p.x = 0; p.vx = -p.vx * 0.7; }
      if (p.x > W - cw) { p.x = W - cw; p.vx = -p.vx * 0.7; }
      if (p.y > H - ch) { p.y = H - ch; p.vy = -p.vy * 0.7; if (Math.abs(p.vy) < 100) p.vy = -350 + Math.random() * 100; p.vx += (Math.random() - 0.5) * 100; }
    }
    draw();
    if (now - start < 4500) requestAnimationFrame(step);
    else { bounceParticles = []; draw(); }
  }
  requestAnimationFrame(step);
}

function autoComplete() {
  GAI.audio.ensure();
  let progress = true;
  const step = () => {
    progress = false;
    for (let i = 0; i < 7; i++) {
      const col = tableau[i];
      if (!col.length) continue;
      const top = col[col.length - 1];
      for (let f = 0; f < 4; f++) {
        if (SUITS.indexOf(top.s) !== f) continue;
        const topF = foundations[f][foundations[f].length - 1];
        const orderTop = topF ? cardOrder(topF) : 0;
        if (cardOrder(top) === orderTop + 1) {
          tryMove({ pile: 't' + i, index: col.length - 1, cards: [top] }, { pile: 'f' + f, index: foundations[f].length - 1 });
          progress = true;
          moves++; movesEl.textContent = moves;
          break;
        }
      }
    }
    // also check waste
    if (waste.length) {
      const top = waste[waste.length - 1];
      for (let f = 0; f < 4; f++) {
        if (SUITS.indexOf(top.s) !== f) continue;
        const topF = foundations[f][foundations[f].length - 1];
        const orderTop = topF ? cardOrder(topF) : 0;
        if (cardOrder(top) === orderTop + 1) {
          tryMove({ pile: 'waste', index: waste.length - 1, cards: [top] }, { pile: 'f' + f, index: foundations[f].length - 1 });
          progress = true;
          moves++; movesEl.textContent = moves;
          break;
        }
      }
    }
    draw();
    checkWin();
    if (progress && !won) setTimeout(step, 80);
  };
  step();
}

canvas.addEventListener('click', (e) => { handleTap(e.clientX, e.clientY); });
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  handleTap(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

undoBtn.addEventListener('click', () => {
  if (!undoSnap) return;
  GAI.audio.ensure();
  restore(undoSnap); undoSnap = null;
  draw();
});
autoBtn.addEventListener('click', autoComplete);
newBtn.addEventListener('click', () => { GAI.audio.ensure(); newGame(); });

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit(); newGame();
})();
