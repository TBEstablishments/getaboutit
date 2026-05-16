(() => {
'use strict';
const GAI = window.GAI;
const N = 8;
// pieces: 0 empty, 1 player (red), 2 player-king, -1 ai (yellow), -2 ai-king
let board = makeBoard();
let cell = 50;
let selected = null;
let legal = []; // [{to, captures, path}]
let turn = 1; // 1 = player, -1 = AI
let busy = false;
let gameOver = false;
let chainStep = 0;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

let pWins = +(GAI.storage.get('gai_checkers_pw') || 0);
let aWins = +(GAI.storage.get('gai_checkers_aw') || 0);
document.getElementById('pwins').textContent = pWins;
document.getElementById('awins').textContent = aWins;

function makeBoard() {
  const b = [];
  for (let r = 0; r < N; r++) {
    const row = new Array(N).fill(0);
    for (let c = 0; c < N; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) row[c] = -1; // AI top
        else if (r > 4) row[c] = 1; // player bottom
      }
    }
    b.push(row);
  }
  return b;
}

function fit() {
  const maxW = Math.min(window.innerWidth - 32, 560);
  const maxH = Math.min(window.innerHeight - 200, 560);
  const sz = Math.min(maxW, maxH);
  cell = Math.floor(sz / N);
  const w = cell * N;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = w * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = w + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw() {
  const w = cell * N;
  ctx.clearRect(0, 0, w, w);
  // squares
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const dark = (r + c) % 2 === 1;
      ctx.fillStyle = dark ? '#3a0ca3' : '#1a0635';
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }
  // highlights for legal moves
  if (selected) {
    ctx.fillStyle = 'rgba(0,245,255,0.30)';
    ctx.fillRect(selected.c * cell, selected.r * cell, cell, cell);
    for (const m of legal) {
      ctx.beginPath();
      ctx.arc(m.to.c * cell + cell / 2, m.to.r * cell + cell / 2, cell * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = m.captures.length ? 'rgba(239,35,60,0.65)' : 'rgba(6,255,165,0.55)';
      ctx.fill();
    }
  }
  // pieces
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      const cx = c * cell + cell / 2, cy = r * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = v > 0 ? '#ef233c' : '#ffd60a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();
      if (Math.abs(v) === 2) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(cell * 0.32) + 'px "Press Start 2P", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('K', cx, cy);
      }
    }
  }
}

function inBounds(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
function isKing(v) { return Math.abs(v) === 2; }
function sideOf(v) { return Math.sign(v); }

function pieceMoves(b, r, c) {
  const v = b[r][c]; if (v === 0) return [];
  const out = [];
  const dirs = [];
  if (v === 1) dirs.push([-1,-1],[-1,1]); // player moves up
  else if (v === -1) dirs.push([1,-1],[1,1]); // ai moves down
  else { dirs.push([-1,-1],[-1,1],[1,-1],[1,1]); }
  // captures take priority - search chained
  const caps = findCaptures(b, r, c, [], []);
  if (caps.length) return caps;
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && b[nr][nc] === 0) {
      out.push({ from: { r, c }, to: { r: nr, c: nc }, captures: [], path: [{ r: nr, c: nc }] });
    }
  }
  return out;
}

function findCaptures(b, r, c, captured, path) {
  const results = [];
  const v = b[r][c];
  if (v === 0) return results;
  const dirs = [];
  if (v === 1) dirs.push([-1,-1],[-1,1]);
  else if (v === -1) dirs.push([1,-1],[1,1]);
  else dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
  let any = false;
  for (const [dr, dc] of dirs) {
    const er = r + dr, ec = c + dc;
    const lr = r + 2 * dr, lc = c + 2 * dc;
    if (!inBounds(lr, lc)) continue;
    if (b[lr][lc] !== 0) continue;
    const ev = b[er][ec];
    if (ev === 0) continue;
    if (sideOf(ev) === sideOf(v)) continue;
    if (captured.some(p => p.r === er && p.c === ec)) continue;
    any = true;
    const nb = b.map(row => row.slice());
    nb[r][c] = 0; nb[er][ec] = 0; nb[lr][lc] = v;
    const newCaptured = captured.concat([{ r: er, c: ec }]);
    const newPath = path.concat([{ r: lr, c: lc }]);
    const further = findCaptures(nb, lr, lc, newCaptured, newPath);
    if (further.length) {
      for (const f of further) results.push(f);
    } else {
      results.push({ from: { r, c }, to: { r: lr, c: lc }, captures: newCaptured, path: newPath });
    }
  }
  return results;
}

function legalMovesFor(b, side) {
  let all = [];
  let anyCap = false;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (sideOf(b[r][c]) === side) {
      const ms = pieceMoves(b, r, c);
      for (const m of ms) {
        if (m.captures.length) anyCap = true;
        all.push({ start: { r, c }, ...m });
      }
    }
  }
  if (anyCap) all = all.filter(m => m.captures.length);
  return all;
}

function applyMove(b, m) {
  const v = b[m.from.r][m.from.c];
  b[m.from.r][m.from.c] = 0;
  for (const cap of m.captures) b[cap.r][cap.c] = 0;
  let nv = v;
  if (v === 1 && m.to.r === 0) nv = 2;
  if (v === -1 && m.to.r === N - 1) nv = -2;
  b[m.to.r][m.to.c] = nv;
}

function handlePointer(clientX, clientY) {
  if (gameOver) { reset(); return; }
  if (busy || turn !== 1) return;
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor((clientX - rect.left) / cell);
  const r = Math.floor((clientY - rect.top) / cell);
  if (!inBounds(r, c)) return;
  GAI.audio.ensure();
  if (selected) {
    const m = legal.find(mv => mv.to.r === r && mv.to.c === c);
    if (m) {
      applyAndAnimate(m);
      return;
    }
    if (board[r][c] > 0) {
      selected = { r, c };
      legal = pieceMoves(board, r, c);
      draw();
      return;
    }
    selected = null; legal = []; draw();
  } else if (board[r][c] > 0) {
    // ensure forced-capture rule
    const all = legalMovesFor(board, 1);
    const anyCap = all.some(m => m.captures.length);
    let ms = pieceMoves(board, r, c);
    if (anyCap) ms = ms.filter(m => m.captures.length);
    if (ms.length === 0) { GAI.audio.tone(180, 0.06, 'sawtooth', 0.08); return; }
    selected = { r, c };
    legal = ms;
    draw();
  }
}

function applyAndAnimate(m) {
  busy = true;
  applyMove(board, m);
  selected = null; legal = [];
  if (m.captures.length > 1) {
    const base = 440;
    for (let i = 0; i < m.captures.length; i++) {
      setTimeout(() => GAI.audio.tone(base * Math.pow(1.122, i), 0.08, 'square', 0.14), i * 100);
    }
    setTimeout(() => GAI.audio.arpeggio([523.25, 659.25, 783.99], 60, 'triangle', 0.16), m.captures.length * 100);
  } else if (m.captures.length === 1) {
    GAI.audio.tone(440, 0.08, 'square', 0.14);
  } else {
    GAI.audio.tone(280, 0.05, 'sine', 0.08);
  }
  draw();
  setTimeout(() => {
    busy = false;
    if (checkEnd()) return;
    turn = -turn;
    if (turn === -1) setTimeout(aiMove, 350);
    else { status.textContent = 'YOUR TURN'; status.className = 'status'; }
  }, 220 + m.captures.length * 100);
}

function aiMove() {
  if (gameOver) return;
  status.textContent = 'AI THINKING…';
  const moves = legalMovesFor(board, -1);
  if (moves.length === 0) { handleNoMoves(-1); return; }
  let best = -Infinity, bestM = moves[0];
  for (const m of moves) {
    const nb = board.map(row => row.slice());
    applyMove(nb, m);
    const s = -negamax(nb, 3, -Infinity, Infinity, 1);
    if (s > best) { best = s; bestM = m; }
  }
  applyAndAnimate(bestM);
}

function negamax(b, depth, alpha, beta, side) {
  if (depth === 0) return evalBoard(b, side);
  const moves = legalMovesFor(b, side);
  if (moves.length === 0) return -10000;
  let v = -Infinity;
  for (const m of moves) {
    const nb = b.map(row => row.slice());
    applyMove(nb, m);
    v = Math.max(v, -negamax(nb, depth - 1, -beta, -alpha, -side));
    alpha = Math.max(alpha, v);
    if (alpha >= beta) break;
  }
  return v;
}

function evalBoard(b, side) {
  let s = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = b[r][c];
    if (v === 0) continue;
    const base = isKing(v) ? 4.5 : 3;
    const center = (c >= 2 && c <= 5 ? 0.3 : 0);
    s += sideOf(v) * (base + center);
  }
  return s * side;
}

function checkEnd() {
  const playerHas = countSide(1) > 0;
  const aiHas = countSide(-1) > 0;
  const playerMoves = legalMovesFor(board, 1).length > 0;
  const aiMoves = legalMovesFor(board, -1).length > 0;
  if (!playerHas || !playerMoves) { endGame(false); return true; }
  if (!aiHas || !aiMoves) { endGame(true); return true; }
  return false;
}
function handleNoMoves(side) {
  if (side === 1) endGame(false);
  else endGame(true);
}
function countSide(s) {
  let n = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (sideOf(board[r][c]) === s) n++;
  return n;
}

function endGame(playerWon) {
  gameOver = true;
  if (playerWon) {
    pWins++; GAI.storage.set('gai_checkers_pw', pWins);
    status.textContent = '✦ YOU WIN — TAP TO PLAY AGAIN';
    status.className = 'status win';
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
    GAI.recordWin('checkers');
    GAI.fx.confetti();
  } else {
    aWins++; GAI.storage.set('gai_checkers_aw', aWins);
    status.textContent = '✦ AI WINS — TAP TO PLAY AGAIN';
    status.className = 'status lose';
    GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.16);
  }
  document.getElementById('pwins').textContent = pWins;
  document.getElementById('awins').textContent = aWins;
  GAI.bestScore('checkers', pWins);
}

function reset() {
  board = makeBoard();
  selected = null; legal = [];
  turn = 1; busy = false; gameOver = false;
  status.textContent = 'YOUR TURN'; status.className = 'status';
  draw();
}

canvas.addEventListener('click', (e) => handlePointer(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
  if (e.touches[0]) { e.preventDefault(); handlePointer(e.touches[0].clientX, e.touches[0].clientY); }
}, { passive: false });
let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit(); draw();
})();
