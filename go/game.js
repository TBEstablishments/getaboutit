(() => {
'use strict';
const GAI = window.GAI;
const N = 9;
const KOMI = 6.5;
const BLACK = 1, WHITE = -1;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const diffTag = document.getElementById('diffTag');

let board = empty();
let turn = BLACK;
let passes = 0;
let captures = { b: 0, w: 0 };
let koPoint = null; // {r,c}
let lastMove = null;
let busy = false;
let phase = 'play';
let depth = +(GAI.storage.get('gai_go_rollouts') || 300);
let easy = depth < 200;
diffTag.textContent = easy ? 'EASY' : (depth >= 800 ? 'HARD' : 'NORM');
let cell = 36;

document.getElementById('pCap').textContent = '0';
document.getElementById('aCap').textContent = '0';

function empty() {
  const b = [];
  for (let r = 0; r < N; r++) b.push(new Array(N).fill(0));
  return b;
}
function cloneBoard(b) { return b.map(row => row.slice()); }
function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

function fit() {
  const maxW = Math.min(window.innerWidth - 32, 520);
  const maxH = Math.min(window.innerHeight - 240, 520);
  const sz = Math.min(maxW, maxH);
  cell = Math.floor(sz / (N + 1));
  const w = cell * (N + 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = w * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = w + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawBoard() {
  const w = cell * (N + 1);
  ctx.clearRect(0, 0, w, w);
  // lines
  ctx.strokeStyle = 'rgba(255,214,10,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < N; i++) {
    ctx.beginPath(); ctx.moveTo(cell, cell + i * cell); ctx.lineTo(cell * N, cell + i * cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cell + i * cell, cell); ctx.lineTo(cell + i * cell, cell * N); ctx.stroke();
  }
  // star points (corners + center for 9x9)
  const starPoints = [[2,2],[2,6],[6,2],[6,6],[4,4]];
  for (const [r, c] of starPoints) {
    ctx.fillStyle = 'rgba(255,214,10,0.7)';
    ctx.beginPath(); ctx.arc(cell + c * cell, cell + r * cell, 3, 0, Math.PI * 2); ctx.fill();
  }
  // stones
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (board[r][c] === 0) continue;
    drawStone(c, r, board[r][c]);
  }
  // last move
  if (lastMove) {
    ctx.strokeStyle = '#ff006e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cell + lastMove.c * cell, cell + lastMove.r * cell, cell * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }
}
function drawStone(c, r, color) {
  const x = cell + c * cell, y = cell + r * cell, rd = cell * 0.42;
  ctx.beginPath();
  ctx.arc(x, y, rd, 0, Math.PI * 2);
  ctx.fillStyle = color === BLACK ? '#0a0a1e' : '#fff';
  ctx.fill();
  // chromatic edge
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color === BLACK ? '#3a0ca3' : '#ff006e';
  ctx.stroke();
  // highlight
  ctx.beginPath();
  ctx.arc(x - rd * 0.3, y - rd * 0.3, rd * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = color === BLACK ? 'rgba(131,56,236,0.55)' : 'rgba(255,255,255,0.85)';
  ctx.fill();
}

function neighbors(r, c) {
  const out = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < N - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < N - 1) out.push([r, c + 1]);
  return out;
}

function group(b, r, c) {
  const color = b[r][c]; if (color === 0) return { stones: [], liberties: 0 };
  const seen = new Set(); const stones = []; const libs = new Set();
  const stack = [[r, c]];
  while (stack.length) {
    const [rr, cc] = stack.pop();
    const k = rr + ',' + cc;
    if (seen.has(k)) continue;
    seen.add(k);
    if (b[rr][cc] !== color) {
      if (b[rr][cc] === 0) libs.add(k);
      continue;
    }
    stones.push([rr, cc]);
    for (const [nr, nc] of neighbors(rr, cc)) stack.push([nr, nc]);
  }
  return { stones, liberties: libs.size };
}

function tryMove(b, r, c, color, prevKo) {
  if (!inB(r, c) || b[r][c] !== 0) return null;
  if (prevKo && prevKo.r === r && prevKo.c === c) return null;
  const nb = cloneBoard(b);
  nb[r][c] = color;
  // capture opponent groups
  let captured = 0;
  for (const [nr, nc] of neighbors(r, c)) {
    if (nb[nr][nc] === -color) {
      const g = group(nb, nr, nc);
      if (g.liberties === 0) {
        for (const [sr, sc] of g.stones) { nb[sr][sc] = 0; captured++; }
      }
    }
  }
  // suicide?
  const own = group(nb, r, c);
  if (own.liberties === 0) return null;
  let newKo = null;
  if (captured === 1 && own.stones.length === 1) {
    // ko: opponent could re-capture next move at the same spot just emptied
    // The square that was just captured is the ko point
    for (const [nr, nc] of neighbors(r, c)) {
      if (nb[nr][nc] === 0 && b[nr][nc] === -color) {
        newKo = { r: nr, c: nc };
        break;
      }
    }
  }
  return { board: nb, captured, ko: newKo };
}

function play(r, c) {
  if (busy || phase !== 'play') return;
  const result = tryMove(board, r, c, turn, koPoint);
  if (!result) {
    GAI.audio.tone(180, 0.05, 'sawtooth', 0.08);
    status.textContent = 'ILLEGAL MOVE';
    return;
  }
  board = result.board;
  koPoint = result.ko;
  lastMove = { r, c };
  if (turn === BLACK) captures.b += result.captured;
  else captures.w += result.captured;
  document.getElementById('pCap').textContent = captures.b;
  document.getElementById('aCap').textContent = captures.w;
  if (result.captured >= 5) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.16);
    GAI.fx.chromaticFlash(250);
  } else if (result.captured > 0) {
    const pitch = 880 - result.captured * 80;
    GAI.audio.tone(pitch, 0.08, 'sine', 0.14);
  } else {
    GAI.audio.tone(330, 0.04, 'sine', 0.10);
  }
  passes = 0;
  turn = -turn;
  status.textContent = turn === BLACK ? 'YOUR MOVE' : 'AI THINKING…';
  drawBoard();
  if (turn === WHITE) setTimeout(aiMove, 350);
}

function pass() {
  if (busy || phase !== 'play') return;
  passes++;
  lastMove = null;
  GAI.audio.tone(220, 0.1, 'sine', 0.08);
  if (passes >= 2) { endGame(); return; }
  turn = -turn;
  status.textContent = turn === BLACK ? 'AI PASSED — YOUR MOVE' : 'YOU PASSED';
  drawBoard();
  if (turn === WHITE) setTimeout(aiMove, 350);
}

function aiMove() {
  if (phase !== 'play') return;
  busy = true;
  // gather legal moves
  const legal = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (board[r][c] !== 0) continue;
    const res = tryMove(board, r, c, WHITE, koPoint);
    if (res) legal.push({ r, c, res });
  }
  if (legal.length === 0) { busy = false; pass(); return; }
  // Use flat-MCTS to pick a move
  const rollouts = easy ? 60 : (depth >= 800 ? 200 : 100);
  // pick the move with highest evaluated rollout
  let bestM = null, bestScore = -Infinity;
  for (const m of legal) {
    // small bias against playing in own eyes
    if (isOwnEye(board, m.r, m.c, WHITE)) continue;
    let total = 0;
    for (let i = 0; i < rollouts / legal.length + 1; i++) {
      total += rollout(m.res.board, BLACK, koPoint);
    }
    const score = total + cornerBonus(m.r, m.c) - (easy && Math.random() < 0.25 ? Math.random() * 5 : 0);
    if (score > bestScore) { bestScore = score; bestM = m; }
  }
  if (!bestM) bestM = legal[Math.floor(Math.random() * legal.length)];
  setTimeout(() => {
    busy = false;
    play(bestM.r, bestM.c);
  }, 60);
}

function rollout(b, side, ko) {
  // play random moves until 30 moves or two-pass
  let pts = 0;
  let cur = side;
  let curKo = ko;
  let lastPass = false;
  for (let step = 0; step < 30; step++) {
    const candidates = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] !== 0) continue;
      if (isOwnEye(b, r, c, cur)) continue;
      const res = tryMove(b, r, c, cur, curKo);
      if (res) candidates.push({ r, c, res });
    }
    if (candidates.length === 0) {
      if (lastPass) break;
      lastPass = true;
      cur = -cur; continue;
    }
    lastPass = false;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    b = pick.res.board;
    curKo = pick.res.ko;
    if (cur === WHITE) pts += pick.res.captured;
    else pts -= pick.res.captured;
    cur = -cur;
  }
  // count area at end
  pts += areaScore(b, WHITE) - areaScore(b, BLACK);
  return pts;
}

function isOwnEye(b, r, c, color) {
  // True if all neighbors are own color (rough definition)
  let own = 0, total = 0;
  for (const [nr, nc] of neighbors(r, c)) {
    total++;
    if (b[nr][nc] === color) own++;
  }
  return own === total && total >= 3;
}

function cornerBonus(r, c) {
  const corners = [[2,2],[2,6],[6,2],[6,6]];
  let best = 0;
  for (const [cr, cc] of corners) {
    const d = Math.abs(cr - r) + Math.abs(cc - c);
    if (d <= 1) best = 2;
    else if (d <= 2) best = 1;
  }
  return best;
}

function areaScore(b, color) {
  // Chinese area: count own stones + territory exclusively bordered by own color
  let n = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] === color) n++;
  // flood fill empties
  const seen = new Set();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (b[r][c] !== 0) continue;
    const key = r + ',' + c;
    if (seen.has(key)) continue;
    // BFS region
    const region = []; const borderColors = new Set();
    const stack = [[r, c]];
    while (stack.length) {
      const [rr, cc] = stack.pop();
      const k = rr + ',' + cc;
      if (seen.has(k)) continue;
      seen.add(k); region.push([rr, cc]);
      for (const [nr, nc] of neighbors(rr, cc)) {
        if (b[nr][nc] === 0 && !seen.has(nr + ',' + nc)) stack.push([nr, nc]);
        else if (b[nr][nc] !== 0) borderColors.add(b[nr][nc]);
      }
    }
    if (borderColors.size === 1 && borderColors.has(color)) n += region.length;
  }
  return n;
}

function endGame() {
  phase = 'over';
  const blackScore = areaScore(board, BLACK) + captures.b;
  const whiteScore = areaScore(board, WHITE) + captures.w + KOMI;
  const playerWon = blackScore > whiteScore;
  status.textContent = (playerWon ? '✦ YOU WIN ' : 'WHITE WINS ') + blackScore + ' vs ' + whiteScore.toFixed(1);
  status.className = playerWon ? 'status win' : 'status lose';
  if (playerWon) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 80, 'sine', 0.14);
    GAI.recordWin('go');
    GAI.fx.confetti();
    GAI.bestScore('go', Math.floor(blackScore - whiteScore));
  } else {
    GAI.audio.arpeggio([311.13, 261.63, 220], 130, 'sawtooth', 0.14);
  }
}

function pickPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left - cell, y = clientY - rect.top - cell;
  const c = Math.round(x / cell), r = Math.round(y / cell);
  if (!inB(r, c)) return null;
  // also check distance
  const dx = x - c * cell, dy = y - r * cell;
  if (Math.hypot(dx, dy) > cell * 0.5) return null;
  return { r, c };
}

canvas.addEventListener('click', (e) => {
  if (turn !== BLACK || busy || phase !== 'play') return;
  const p = pickPoint(e.clientX, e.clientY); if (!p) return;
  GAI.audio.ensure();
  play(p.r, p.c);
});
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  if (turn !== BLACK || busy || phase !== 'play') return;
  const p = pickPoint(e.touches[0].clientX, e.touches[0].clientY); if (!p) return;
  GAI.audio.ensure();
  play(p.r, p.c);
}, { passive: false });

document.getElementById('passBtn').addEventListener('click', () => {
  if (turn !== BLACK) return;
  GAI.audio.ensure();
  pass();
});
document.getElementById('diffBtn').addEventListener('click', () => {
  depth = depth === 60 ? 300 : (depth === 300 ? 800 : 60);
  easy = depth < 200;
  GAI.storage.set('gai_go_rollouts', depth);
  diffTag.textContent = easy ? 'EASY' : (depth >= 800 ? 'HARD' : 'NORM');
});
document.getElementById('newBtn').addEventListener('click', () => {
  board = empty();
  turn = BLACK; passes = 0; captures = { b: 0, w: 0 }; koPoint = null; lastMove = null;
  phase = 'play';
  document.getElementById('pCap').textContent = '0';
  document.getElementById('aCap').textContent = '0';
  status.textContent = 'YOUR MOVE — BLACK';
  status.className = 'status';
  drawBoard();
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); drawBoard(); }, 150); });
GAI.stats.sessionStart('go');
window.addEventListener('pagehide', () => GAI.stats.sessionEnd('go'));

fit(); drawBoard();
})();
