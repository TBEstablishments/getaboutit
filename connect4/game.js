(() => {
'use strict';
const GAI = window.GAI;
const COLS = 7, ROWS = 6;
const PLAYER = 1, AI_P = 2;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

let cell = 60, padding = 8;
let board = makeBoard();
let turn = PLAYER;
let busy = false;
let gameOver = false;
let lastWinCells = null;
let dropAnim = null;

let pWins = +(GAI.storage.get('gai_connect4_pw') || 0);
let aWins = +(GAI.storage.get('gai_connect4_aw') || 0);
let draws = +(GAI.storage.get('gai_connect4_dr') || 0);
updateScoreUI();

function makeBoard() {
  const b = [];
  for (let r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(0));
  return b;
}

function fit() {
  const maxW = Math.min(window.innerWidth - 32, 560);
  const maxH = Math.min(window.innerHeight - 200, 520);
  cell = Math.floor(Math.min(maxW / COLS, maxH / (ROWS + 1)));
  padding = Math.max(6, Math.floor(cell * 0.12));
  const w = cell * COLS + padding * 2;
  const h = cell * (ROWS + 1) + padding * 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cellCenter(r, c) {
  return { x: padding + c * cell + cell / 2, y: padding + cell + r * cell + cell / 2 };
}

function draw() {
  const w = cell * COLS + padding * 2;
  const h = cell * (ROWS + 1) + padding * 2;
  ctx.clearRect(0, 0, w, h);
  // top row (drop hint)
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(padding, padding, cell * COLS, cell);
  // board
  ctx.fillStyle = '#3a0ca3';
  GAI.fx.roundRect(ctx, padding, padding + cell, cell * COLS, cell * ROWS, 8);
  ctx.fill();
  // discs
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = cellCenter(r, c);
      const v = board[r][c];
      ctx.beginPath();
      ctx.arc(p.x, p.y, cell * 0.4, 0, Math.PI * 2);
      if (v === 0) {
        ctx.fillStyle = '#0a0a1e';
        ctx.fill();
      } else {
        ctx.fillStyle = v === PLAYER ? '#ef233c' : '#ffd60a';
        ctx.fill();
        if (lastWinCells && lastWinCells.some(([rr,cc]) => rr === r && cc === c)) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fff';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }
  }
  // dropping disc anim
  if (dropAnim) {
    const cx = padding + dropAnim.col * cell + cell / 2;
    ctx.beginPath();
    ctx.arc(cx, dropAnim.y, cell * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = dropAnim.who === PLAYER ? '#ef233c' : '#ffd60a';
    ctx.fill();
  }
}

function lowestEmpty(b, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][c] === 0) return r;
  return -1;
}

function dropDisc(c, who) {
  if (busy || gameOver) return false;
  const r = lowestEmpty(board, c);
  if (r < 0) return false;
  busy = true;
  // animate
  const targetY = cellCenter(r, c).y;
  const startY = padding + cell / 2;
  let y = startY;
  let v = 0;
  const tone = 260 + c * 40;
  GAI.audio.tone(tone, 0.05, 'square', 0.10);
  function step() {
    v += 28;
    y += v * 0.04;
    if (y >= targetY) {
      y = targetY;
      dropAnim = null;
      board[r][c] = who;
      GAI.audio.tone(tone * 0.8, 0.08, 'sine', 0.14);
      busy = false;
      const win = findWin(board, who);
      if (win) {
        lastWinCells = win;
        gameOver = true;
        if (who === PLAYER) {
          pWins++; GAI.storage.set('gai_connect4_pw', pWins);
          status.textContent = '✦ YOU WIN — TAP TO PLAY AGAIN';
          status.className = 'status win';
          GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
          GAI.recordWin('connect4');
          GAI.fx.confetti();
        } else {
          aWins++; GAI.storage.set('gai_connect4_aw', aWins);
          status.textContent = '✦ AI WINS — TAP TO PLAY AGAIN';
          status.className = 'status lose';
          GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.16);
        }
        updateScoreUI();
        draw();
        return;
      }
      if (isDraw(board)) {
        gameOver = true; draws++; GAI.storage.set('gai_connect4_dr', draws);
        status.textContent = 'DRAW — TAP TO PLAY AGAIN';
        status.className = 'status draw';
        updateScoreUI();
        draw();
        return;
      }
      turn = who === PLAYER ? AI_P : PLAYER;
      draw();
      if (turn === AI_P) setTimeout(aiTurn, 280);
      else { status.textContent = 'YOUR TURN'; status.className = 'status'; }
      return;
    }
    dropAnim = { col: c, y, who };
    draw();
    requestAnimationFrame(step);
  }
  step();
  return true;
}

function aiTurn() {
  if (gameOver) return;
  status.textContent = 'AI THINKING…';
  status.className = 'status';
  const best = pickBestMove(board, AI_P, 5);
  if (best == null) return;
  dropDisc(best, AI_P);
}

function pickBestMove(b, who, depth) {
  // immediate win
  for (let c = 0; c < COLS; c++) {
    const r = lowestEmpty(b, c); if (r < 0) continue;
    b[r][c] = who;
    if (findWin(b, who)) { b[r][c] = 0; return c; }
    b[r][c] = 0;
  }
  // block opponent
  const opp = who === PLAYER ? AI_P : PLAYER;
  for (let c = 0; c < COLS; c++) {
    const r = lowestEmpty(b, c); if (r < 0) continue;
    b[r][c] = opp;
    if (findWin(b, opp)) { b[r][c] = 0; return c; }
    b[r][c] = 0;
  }
  // minimax with alpha-beta
  let bestScore = -Infinity;
  let bestCol = -1;
  const order = [3, 2, 4, 1, 5, 0, 6];
  for (const c of order) {
    const r = lowestEmpty(b, c); if (r < 0) continue;
    b[r][c] = who;
    const s = minimax(b, depth - 1, -Infinity, Infinity, false, who);
    b[r][c] = 0;
    if (s > bestScore) { bestScore = s; bestCol = c; }
  }
  return bestCol >= 0 ? bestCol : order.find(c => lowestEmpty(b, c) >= 0);
}

function minimax(b, depth, alpha, beta, maxing, aiSide) {
  const me = aiSide, opp = aiSide === PLAYER ? AI_P : PLAYER;
  if (findWin(b, me)) return 100000 + depth;
  if (findWin(b, opp)) return -100000 - depth;
  if (depth === 0 || isDraw(b)) return evalBoard(b, me);
  const order = [3, 2, 4, 1, 5, 0, 6];
  if (maxing) {
    let v = -Infinity;
    for (const c of order) {
      const r = lowestEmpty(b, c); if (r < 0) continue;
      b[r][c] = me;
      v = Math.max(v, minimax(b, depth - 1, alpha, beta, false, aiSide));
      b[r][c] = 0;
      alpha = Math.max(alpha, v);
      if (alpha >= beta) break;
    }
    return v;
  } else {
    let v = Infinity;
    for (const c of order) {
      const r = lowestEmpty(b, c); if (r < 0) continue;
      b[r][c] = opp;
      v = Math.min(v, minimax(b, depth - 1, alpha, beta, true, aiSide));
      b[r][c] = 0;
      beta = Math.min(beta, v);
      if (alpha >= beta) break;
    }
    return v;
  }
}

function evalBoard(b, me) {
  const opp = me === PLAYER ? AI_P : PLAYER;
  let s = 0;
  // center column bonus
  for (let r = 0; r < ROWS; r++) if (b[r][3] === me) s += 4; else if (b[r][3] === opp) s -= 4;
  // count windows
  const lines = allLines();
  for (const line of lines) {
    let m = 0, o = 0;
    for (const [r, c] of line) {
      if (b[r][c] === me) m++; else if (b[r][c] === opp) o++;
    }
    if (m === 3 && o === 0) s += 50;
    else if (m === 2 && o === 0) s += 5;
    if (o === 3 && m === 0) s -= 80;
  }
  return s;
}

let _linesCache = null;
function allLines() {
  if (_linesCache) return _linesCache;
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++) out.push([[r,c],[r,c+1],[r,c+2],[r,c+3]]);
  for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS; c++) out.push([[r,c],[r+1,c],[r+2,c],[r+3,c]]);
  for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS - 3; c++) out.push([[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]]);
  for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++) out.push([[r,c],[r-1,c+1],[r-2,c+2],[r-3,c+3]]);
  _linesCache = out;
  return out;
}
function findWin(b, who) {
  for (const line of allLines()) {
    if (line.every(([r,c]) => b[r][c] === who)) return line;
  }
  return null;
}
function isDraw(b) { return b[0].every(v => v !== 0); }

function updateScoreUI() {
  document.getElementById('pwins').textContent = pWins;
  document.getElementById('awins').textContent = aWins;
  document.getElementById('draws').textContent = draws;
  GAI.bestScore('connect4', pWins);
}

function reset() {
  board = makeBoard();
  turn = PLAYER;
  busy = false;
  gameOver = false;
  lastWinCells = null;
  dropAnim = null;
  status.textContent = 'YOUR TURN';
  status.className = 'status';
  draw();
}

function handlePointer(clientX) {
  if (gameOver) { reset(); return; }
  if (busy || turn !== PLAYER) return;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const col = Math.floor((x - padding) / cell);
  if (col < 0 || col >= COLS) return;
  GAI.audio.ensure();
  dropDisc(col, PLAYER);
}

canvas.addEventListener('click', (e) => handlePointer(e.clientX));
canvas.addEventListener('touchstart', (e) => {
  if (e.touches[0]) { e.preventDefault(); handlePointer(e.touches[0].clientX); }
}, { passive: false });

let rTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(rTimer);
  rTimer = setTimeout(() => { fit(); draw(); }, 150);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) draw();
});

fit();
draw();
})();
