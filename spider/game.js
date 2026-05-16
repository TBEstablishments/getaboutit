(() => {
'use strict';
const GAI = window.GAI;
const SUITS = ['♠','♥','♦','♣'];
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const compEl = document.getElementById('comp');
const diffEl = document.getElementById('diff');

let W = 0, H = 0;
let cw = 50, ch = 70;
let suitsCount = +(GAI.storage.get('gai_spider_suits') || 1); // 1, 2, or 4
let columns = []; // 10 columns of cards (objects with faceUp)
let stock = [];   // remaining deck (5 sets of 10)
let completed = 0;
let moves = 0;
let selected = null; // { col, idx, cards: [] }
let undoStack = [];

function newGame() {
  const decks = suitsCount === 1 ? 8 : (suitsCount === 2 ? 4 : 2);
  const allCards = [];
  const suitsToUse = SUITS.slice(0, suitsCount === 4 ? 4 : suitsCount);
  // Build 104 cards (2 standard decks but using selected suits cycled)
  for (let d = 0; d < decks; d++) {
    for (let r = 0; r < 13; r++) {
      for (const s of suitsToUse) {
        allCards.push({ r: ['A','2','3','4','5','6','7','8','9','10','J','Q','K'][r], s, ri: r, faceUp: false });
      }
    }
  }
  // shuffle
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = allCards[i]; allCards[i] = allCards[j]; allCards[j] = t;
  }
  columns = [];
  for (let i = 0; i < 10; i++) columns.push([]);
  // deal 54 cards: 6 in first 4 cols, 5 in last 6 cols
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) columns[i].push(allCards.pop());
  for (let i = 4; i < 10; i++) for (let j = 0; j < 5; j++) columns[i].push(allCards.pop());
  // last card of each column face up
  for (const col of columns) if (col.length) col[col.length - 1].faceUp = true;
  stock = allCards;
  completed = 0;
  moves = 0;
  selected = null;
  undoStack = [];
  updateHUD();
  fit();
  draw();
}

function updateHUD() {
  movesEl.textContent = moves;
  compEl.textContent = completed;
  diffEl.textContent = (suitsCount === 1 ? '1 SUIT' : suitsCount === 2 ? '2 SUITS' : '4 SUITS');
}

function fit() {
  W = window.innerWidth; H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cw = Math.min(70, Math.floor((W - 20) / 10) - 4);
  ch = Math.floor(cw * 1.4);
}

function colX(c) { return 10 + c * (cw + 4); }
function topY() { return 90; }
function cardY(c, idx) {
  const col = columns[c];
  let y = topY();
  for (let i = 0; i < idx; i++) {
    const step = col[i].faceUp ? Math.max(14, Math.floor(ch * 0.22)) : 5;
    y += step;
  }
  return y;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // column slots
  for (let c = 0; c < 10; c++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    GAI.fx.roundRect(ctx, colX(c), topY(), cw, ch, 6); ctx.stroke();
  }
  // stock at bottom right
  for (let i = 0; i < Math.min(5, Math.ceil(stock.length / 10)); i++) {
    const x = W - 60 - i * 6, y = H - ch - 80;
    GAI.cards.cardBack(ctx, x, y, cw, ch);
  }
  if (stock.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('×' + (stock.length / 10), W - 70, H - ch - 90);
  }
  // cards in columns
  for (let c = 0; c < 10; c++) {
    const col = columns[c];
    for (let i = 0; i < col.length; i++) {
      const x = colX(c), y = cardY(c, i);
      if (!col[i].faceUp) GAI.cards.cardBack(ctx, x, y, cw, ch);
      else GAI.cards.draw(ctx, x, y, cw, ch, col[i], { glow: isSelected(c, i) });
    }
  }
  // completed counter trophy
  ctx.fillStyle = 'rgba(255,214,10,0.8)';
  ctx.font = 'bold 10px "Press Start 2P", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('🏆 ' + completed + '/8', 10, H - 24);
}

function isSelected(col, idx) {
  if (!selected) return false;
  if (selected.col !== col) return false;
  return idx >= selected.idx;
}

function pickCard(x, y) {
  for (let c = 0; c < 10; c++) {
    const col = columns[c];
    if (col.length === 0) {
      // empty slot
      if (x >= colX(c) && x <= colX(c) + cw && y >= topY() && y <= topY() + ch) return { col: c, idx: -1 };
      continue;
    }
    for (let i = col.length - 1; i >= 0; i--) {
      const cx = colX(c), cy = cardY(c, i);
      const isTop = i === col.length - 1;
      const within = x >= cx && x <= cx + cw && y >= cy && y <= (isTop ? cy + ch : cy + Math.max(14, Math.floor(ch * 0.22)));
      if (within) return { col: c, idx: i };
    }
  }
  // stock
  if (x > W - 80 && y > H - ch - 100 && y < H - 80) return { col: 'stock' };
  return null;
}

function canSequence(col, idx) {
  // From idx down: all face up + strictly descending + same suit (for full move)
  const c = columns[col];
  if (!c[idx].faceUp) return false;
  for (let i = idx; i < c.length - 1; i++) {
    if (!c[i + 1].faceUp) return false;
    if (c[i].ri - 1 !== c[i + 1].ri) return false;
    if (c[i].s !== c[i + 1].s) return false;
  }
  return true;
}

function snapshot() {
  return {
    cols: columns.map(c => c.map(x => ({ ...x }))),
    stock: stock.map(x => ({ ...x })),
    completed, moves
  };
}
function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 5) undoStack.shift();
}

function tap(pick) {
  if (!pick) { selected = null; draw(); return; }
  if (pick.col === 'stock') {
    dealStock();
    return;
  }
  if (selected) {
    if (selected.col === pick.col) { selected = null; draw(); return; }
    // attempt move
    const cards = columns[selected.col].slice(selected.idx);
    if (canMove(selected.col, pick.col, cards)) {
      pushUndo();
      columns[selected.col].splice(selected.idx);
      columns[pick.col].push(...cards);
      // flip newly exposed
      const src = columns[selected.col];
      if (src.length && !src[src.length - 1].faceUp) {
        src[src.length - 1].faceUp = true;
        GAI.audio.tone(440, 0.04, 'triangle', 0.10);
      }
      moves++;
      checkComplete();
      selected = null;
      updateHUD();
      draw();
      GAI.audio.tone(560, 0.05, 'square', 0.10);
      return;
    }
    selected = null;
  }
  // pick up
  const col = columns[pick.col];
  if (pick.idx < 0) return;
  if (!col[pick.idx].faceUp) {
    if (pick.idx === col.length - 1) {
      col[pick.idx].faceUp = true;
      GAI.audio.tone(440, 0.04, 'triangle', 0.10);
      moves++; updateHUD(); draw();
    }
    return;
  }
  if (!canSequence(pick.col, pick.idx)) {
    // try single-card move (last card only)
    if (pick.idx === col.length - 1) {
      selected = { col: pick.col, idx: pick.idx };
      GAI.audio.tone(660, 0.03, 'square', 0.08);
      draw();
    }
    return;
  }
  selected = { col: pick.col, idx: pick.idx };
  GAI.audio.tone(660, 0.03, 'square', 0.08);
  draw();
}

function canMove(srcCol, destCol, cards) {
  const col = columns[destCol];
  if (col.length === 0) return true;
  const top = col[col.length - 1];
  if (!top.faceUp) return false;
  return top.ri - 1 === cards[0].ri;
}

function dealStock() {
  if (!stock.length) return;
  // require all columns non-empty
  if (columns.some(c => c.length === 0)) {
    GAI.audio.tone(180, 0.06, 'sawtooth', 0.10);
    return;
  }
  pushUndo();
  for (let i = 0; i < 10 && stock.length; i++) {
    const c = stock.pop(); c.faceUp = true;
    columns[i].push(c);
  }
  moves++; updateHUD();
  GAI.audio.arpeggio([440, 523.25, 660], 60, 'triangle', 0.12);
  checkComplete();
  draw();
}

function checkComplete() {
  for (let c = 0; c < 10; c++) {
    const col = columns[c];
    if (col.length < 13) continue;
    // last 13 cards: K to A same suit
    let ok = true;
    const s = col[col.length - 13].s;
    for (let i = 0; i < 13; i++) {
      const card = col[col.length - 13 + i];
      if (!card.faceUp) { ok = false; break; }
      if (card.ri !== 12 - i) { ok = false; break; }
      if (card.s !== s) { ok = false; break; }
    }
    if (ok) {
      col.splice(col.length - 13);
      completed++;
      GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 70, 'triangle', 0.18);
      GAI.fx.chromaticFlash(300);
      // flip newly exposed
      if (col.length && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
      if (completed >= 8) {
        GAI.fx.confetti({ count: 100 });
        GAI.recordWin('spider');
        const cur = +GAI.storage.get('gai_best_spider_' + suitsCount) || Infinity;
        if (moves < cur) GAI.storage.set('gai_best_spider_' + suitsCount, String(moves));
        GAI.bestScore('spider', completed);
      }
    }
  }
  updateHUD();
}

canvas.addEventListener('click', (e) => {
  GAI.audio.ensure();
  const rect = canvas.getBoundingClientRect();
  tap(pickCard(e.clientX - rect.left, e.clientY - rect.top));
});
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  GAI.audio.ensure();
  const rect = canvas.getBoundingClientRect();
  tap(pickCard(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top));
}, { passive: false });

document.getElementById('undoBtn').addEventListener('click', () => {
  if (undoStack.length === 0) return;
  const s = undoStack.pop();
  columns = s.cols; stock = s.stock; completed = s.completed; moves = s.moves;
  selected = null; updateHUD(); draw();
});
document.getElementById('diffBtn').addEventListener('click', () => {
  suitsCount = suitsCount === 1 ? 2 : (suitsCount === 2 ? 4 : 1);
  GAI.storage.set('gai_spider_suits', suitsCount);
  newGame();
});
document.getElementById('dealBtn').addEventListener('click', () => { GAI.audio.ensure(); dealStock(); });
document.getElementById('newBtn').addEventListener('click', () => { GAI.audio.ensure(); newGame(); });

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });
GAI.stats.sessionStart('spider');
window.addEventListener('pagehide', () => GAI.stats.sessionEnd('spider'));

fit(); newGame();
})();
