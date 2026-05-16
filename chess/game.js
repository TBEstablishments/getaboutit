(() => {
'use strict';
const GAI = window.GAI;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const undoBtn = document.getElementById('undoBtn');
const diffBtn = document.getElementById('diffBtn');
const resignBtn = document.getElementById('resignBtn');
const diffTag = document.getElementById('diffTag');

const GLYPHS = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
const PIECE_VALS = { P:100, N:320, B:330, R:500, Q:900, K:20000 };
const PST_MID = makePST();
let cell = 56;
let state = newState();
let history = [];
let selected = null;
let legalForSelected = [];
let busy = false;
let gameOver = false;
let depth = +(GAI.storage.get('gai_chess_depth') || 3);
let easy = depth === 2;
diffTag.textContent = easy ? 'EASY' : 'HARD';
let lastMove = null;
let kingPulse = 0;
let pulseRaf = 0;

let wins = +(GAI.storage.get('gai_chess_w') || 0);
let losses = +(GAI.storage.get('gai_chess_l') || 0);
let draws = +(GAI.storage.get('gai_chess_d') || 0);
document.getElementById('wWins').textContent = wins;
document.getElementById('losses').textContent = losses;
document.getElementById('draws').textContent = draws;

function newState() {
  const board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  return {
    board,
    turn: 'w',
    castle: { wK: true, wQ: true, bK: true, bQ: true },
    ep: null,
    halfmove: 0,
    fullmove: 1,
    history: []
  };
}

function makePST() {
  const PAWN = [
     [0,0,0,0,0,0,0,0],
     [50,50,50,50,50,50,50,50],
     [10,10,20,30,30,20,10,10],
     [5,5,10,25,25,10,5,5],
     [0,0,0,20,20,0,0,0],
     [5,-5,-10,0,0,-10,-5,5],
     [5,10,10,-20,-20,10,10,5],
     [0,0,0,0,0,0,0,0]
  ];
  const KNIGHT = [
     [-50,-40,-30,-30,-30,-30,-40,-50],
     [-40,-20,0,0,0,0,-20,-40],
     [-30,0,10,15,15,10,0,-30],
     [-30,5,15,20,20,15,5,-30],
     [-30,0,15,20,20,15,0,-30],
     [-30,5,10,15,15,10,5,-30],
     [-40,-20,0,5,5,0,-20,-40],
     [-50,-40,-30,-30,-30,-30,-40,-50]
  ];
  const BISHOP = [
     [-20,-10,-10,-10,-10,-10,-10,-20],
     [-10,0,0,0,0,0,0,-10],
     [-10,0,5,10,10,5,0,-10],
     [-10,5,5,10,10,5,5,-10],
     [-10,0,10,10,10,10,0,-10],
     [-10,10,10,10,10,10,10,-10],
     [-10,5,0,0,0,0,5,-10],
     [-20,-10,-10,-10,-10,-10,-10,-20]
  ];
  const ROOK = [
     [0,0,0,0,0,0,0,0],
     [5,10,10,10,10,10,10,5],
     [-5,0,0,0,0,0,0,-5],
     [-5,0,0,0,0,0,0,-5],
     [-5,0,0,0,0,0,0,-5],
     [-5,0,0,0,0,0,0,-5],
     [-5,0,0,0,0,0,0,-5],
     [0,0,0,5,5,0,0,0]
  ];
  const QUEEN = [
     [-20,-10,-10,-5,-5,-10,-10,-20],
     [-10,0,0,0,0,0,0,-10],
     [-10,0,5,5,5,5,0,-10],
     [-5,0,5,5,5,5,0,-5],
     [0,0,5,5,5,5,0,-5],
     [-10,5,5,5,5,5,0,-10],
     [-10,0,5,0,0,0,0,-10],
     [-20,-10,-10,-5,-5,-10,-10,-20]
  ];
  const KING = [
     [-30,-40,-40,-50,-50,-40,-40,-30],
     [-30,-40,-40,-50,-50,-40,-40,-30],
     [-30,-40,-40,-50,-50,-40,-40,-30],
     [-30,-40,-40,-50,-50,-40,-40,-30],
     [-20,-30,-30,-40,-40,-30,-30,-20],
     [-10,-20,-20,-20,-20,-20,-20,-10],
     [20,20,0,0,0,0,20,20],
     [20,30,10,0,0,10,30,20]
  ];
  return { P: PAWN, N: KNIGHT, B: BISHOP, R: ROOK, Q: QUEEN, K: KING };
}

function fit() {
  const maxW = Math.min(window.innerWidth - 32, 520);
  const maxH = Math.min(window.innerHeight - 240, 520);
  const sz = Math.min(maxW, maxH);
  cell = Math.floor(sz / 8);
  const w = cell * 8;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = w * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = w + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function isWhite(p) { return p && p === p.toUpperCase(); }
function isBlack(p) { return p && p === p.toLowerCase(); }
function colorOf(p) { return isWhite(p) ? 'w' : 'b'; }
function inB(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function generateMoves(s, includeIllegal) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c]; if (!p) continue;
      if (colorOf(p) !== s.turn) continue;
      genPieceMoves(s, r, c, p, moves);
    }
  }
  if (includeIllegal) return moves;
  return moves.filter(m => !leavesKingInCheck(s, m));
}

function genPieceMoves(s, r, c, p, out) {
  const pp = p.toUpperCase();
  const isW = isWhite(p);
  if (pp === 'P') return genPawnMoves(s, r, c, isW, out);
  if (pp === 'N') return genKnightMoves(s, r, c, isW, out);
  if (pp === 'K') return genKingMoves(s, r, c, isW, out);
  const dirs = [];
  if (pp === 'R' || pp === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
  if (pp === 'B' || pp === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (inB(nr, nc)) {
      const t = s.board[nr][nc];
      if (!t) out.push(move(r, c, nr, nc));
      else {
        if (isW !== isWhite(t)) out.push(move(r, c, nr, nc));
        break;
      }
      nr += dr; nc += dc;
    }
  }
}

function genPawnMoves(s, r, c, isW, out) {
  const dir = isW ? -1 : 1;
  const startRow = isW ? 6 : 1;
  const promoRow = isW ? 0 : 7;
  // forward
  const f1r = r + dir;
  if (inB(f1r, c) && !s.board[f1r][c]) {
    if (f1r === promoRow) {
      for (const pr of (isW ? ['Q','R','B','N'] : ['q','r','b','n'])) out.push(move(r, c, f1r, c, { promote: pr }));
    } else out.push(move(r, c, f1r, c));
    if (r === startRow && !s.board[f1r][c] && !s.board[f1r + dir][c]) out.push(move(r, c, f1r + dir, c, { double: true }));
  }
  // captures
  for (const dc of [-1, 1]) {
    const nr = r + dir, nc = c + dc;
    if (!inB(nr, nc)) continue;
    const t = s.board[nr][nc];
    if (t && isW !== isWhite(t)) {
      if (nr === promoRow) for (const pr of (isW ? ['Q','R','B','N'] : ['q','r','b','n'])) out.push(move(r, c, nr, nc, { promote: pr }));
      else out.push(move(r, c, nr, nc));
    }
  }
  // en passant
  if (s.ep && s.ep.r === r + dir) {
    for (const dc of [-1, 1]) {
      if (s.ep.c === c + dc) out.push(move(r, c, s.ep.r, s.ep.c, { ep: true }));
    }
  }
}

function genKnightMoves(s, r, c, isW, out) {
  const N = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of N) {
    const nr = r + dr, nc = c + dc;
    if (!inB(nr, nc)) continue;
    const t = s.board[nr][nc];
    if (!t || isW !== isWhite(t)) out.push(move(r, c, nr, nc));
  }
}

function genKingMoves(s, r, c, isW, out) {
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (!inB(nr, nc)) continue;
    const t = s.board[nr][nc];
    if (!t || isW !== isWhite(t)) out.push(move(r, c, nr, nc));
  }
  // castling
  const row = isW ? 7 : 0;
  if (r !== row || c !== 4) return;
  if (s.turn !== (isW ? 'w' : 'b')) return;
  const key = isW ? ['wK','wQ'] : ['bK','bQ'];
  const castleK = s.castle[key[0]], castleQ = s.castle[key[1]];
  if (castleK && !s.board[row][5] && !s.board[row][6] && s.board[row][7] === (isW ? 'R' : 'r')) {
    if (!isSquareAttacked(s, row, 4, isW ? 'b' : 'w') && !isSquareAttacked(s, row, 5, isW ? 'b' : 'w') && !isSquareAttacked(s, row, 6, isW ? 'b' : 'w')) {
      out.push(move(r, c, row, 6, { castle: 'K' }));
    }
  }
  if (castleQ && !s.board[row][1] && !s.board[row][2] && !s.board[row][3] && s.board[row][0] === (isW ? 'R' : 'r')) {
    if (!isSquareAttacked(s, row, 4, isW ? 'b' : 'w') && !isSquareAttacked(s, row, 3, isW ? 'b' : 'w') && !isSquareAttacked(s, row, 2, isW ? 'b' : 'w')) {
      out.push(move(r, c, row, 2, { castle: 'Q' }));
    }
  }
}

function move(r1, c1, r2, c2, extra) {
  return { from: { r: r1, c: c1 }, to: { r: r2, c: c2 }, ...(extra || {}) };
}

function isSquareAttacked(s, r, c, byColor) {
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const p = s.board[i][j]; if (!p) continue;
    if (colorOf(p) !== byColor) continue;
    if (squareAttacksTarget(s, i, j, p, r, c)) return true;
  }
  return false;
}

function squareAttacksTarget(s, sr, sc, p, tr, tc) {
  const pp = p.toUpperCase();
  if (pp === 'P') {
    const dir = isWhite(p) ? -1 : 1;
    return tr === sr + dir && (tc === sc - 1 || tc === sc + 1);
  }
  if (pp === 'N') {
    const dr = Math.abs(tr - sr), dc = Math.abs(tc - sc);
    return (dr === 1 && dc === 2) || (dr === 2 && dc === 1);
  }
  if (pp === 'K') {
    return Math.abs(tr - sr) <= 1 && Math.abs(tc - sc) <= 1 && (tr !== sr || tc !== sc);
  }
  // sliding
  const dirs = [];
  if (pp === 'R' || pp === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
  if (pp === 'B' || pp === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
  for (const [dr, dc] of dirs) {
    let nr = sr + dr, nc = sc + dc;
    while (inB(nr, nc)) {
      if (nr === tr && nc === tc) return true;
      if (s.board[nr][nc]) break;
      nr += dr; nc += dc;
    }
  }
  return false;
}

function findKing(s, color) {
  const target = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (s.board[r][c] === target) return { r, c };
  return null;
}

function leavesKingInCheck(s, m) {
  const ns = applyMove(s, m);
  const king = findKing(ns, s.turn);
  if (!king) return true;
  return isSquareAttacked(ns, king.r, king.c, s.turn === 'w' ? 'b' : 'w');
}

function inCheck(s) {
  const king = findKing(s, s.turn);
  if (!king) return false;
  return isSquareAttacked(s, king.r, king.c, s.turn === 'w' ? 'b' : 'w');
}

function applyMove(s, m) {
  const ns = cloneState(s);
  const p = ns.board[m.from.r][m.from.c];
  const cap = ns.board[m.to.r][m.to.c];
  ns.board[m.from.r][m.from.c] = '';
  ns.board[m.to.r][m.to.c] = m.promote || p;
  // en passant capture
  if (m.ep) {
    ns.board[m.from.r][m.to.c] = '';
  }
  // castling rook move
  if (m.castle === 'K') {
    const row = m.to.r;
    ns.board[row][5] = ns.board[row][7]; ns.board[row][7] = '';
  }
  if (m.castle === 'Q') {
    const row = m.to.r;
    ns.board[row][3] = ns.board[row][0]; ns.board[row][0] = '';
  }
  // update castling rights
  if (p === 'K') { ns.castle.wK = false; ns.castle.wQ = false; }
  if (p === 'k') { ns.castle.bK = false; ns.castle.bQ = false; }
  if (p === 'R') {
    if (m.from.r === 7 && m.from.c === 0) ns.castle.wQ = false;
    if (m.from.r === 7 && m.from.c === 7) ns.castle.wK = false;
  }
  if (p === 'r') {
    if (m.from.r === 0 && m.from.c === 0) ns.castle.bQ = false;
    if (m.from.r === 0 && m.from.c === 7) ns.castle.bK = false;
  }
  if (m.to.r === 7 && m.to.c === 0) ns.castle.wQ = false;
  if (m.to.r === 7 && m.to.c === 7) ns.castle.wK = false;
  if (m.to.r === 0 && m.to.c === 0) ns.castle.bQ = false;
  if (m.to.r === 0 && m.to.c === 7) ns.castle.bK = false;
  // en passant target
  ns.ep = m.double ? { r: (m.from.r + m.to.r) / 2, c: m.to.c } : null;
  // halfmove
  if (p.toUpperCase() === 'P' || cap) ns.halfmove = 0;
  else ns.halfmove++;
  if (ns.turn === 'b') ns.fullmove++;
  ns.turn = ns.turn === 'w' ? 'b' : 'w';
  return ns;
}

function cloneState(s) {
  return {
    board: s.board.map(row => row.slice()),
    turn: s.turn,
    castle: { ...s.castle },
    ep: s.ep ? { ...s.ep } : null,
    halfmove: s.halfmove,
    fullmove: s.fullmove,
    history: s.history
  };
}

// ============== EVAL ==============
function evaluate(s) {
  let score = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = s.board[r][c]; if (!p) continue;
    const pp = p.toUpperCase();
    const v = PIECE_VALS[pp];
    const isW = isWhite(p);
    const pst = PST_MID[pp];
    const pstR = isW ? r : 7 - r;
    const pstV = pst[pstR][c];
    score += (isW ? 1 : -1) * (v + pstV);
  }
  return score;
}

function ai(s, dep, alpha, beta) {
  const isMax = s.turn === 'w' ? false : true; // AI = black = wants to minimize from white's pov; we treat AI as 'maximizing' opposite — actually let's just use s.turn perspective
  return search(s, dep, alpha, beta);
}

function search(s, dep, alpha, beta) {
  if (dep === 0) return { score: s.turn === 'w' ? evaluate(s) : -evaluate(s) };
  const moves = generateMoves(s);
  if (moves.length === 0) {
    if (inCheck(s)) return { score: -99999 - dep };
    return { score: 0 };
  }
  // move ordering: captures first
  moves.sort((a, b) => moveOrderScore(s, b) - moveOrderScore(s, a));
  let best = -Infinity;
  let bestMove = moves[0];
  for (const m of moves) {
    const ns = applyMove(s, m);
    const r = search(ns, dep - 1, -beta, -alpha);
    const score = -r.score;
    if (score > best) { best = score; bestMove = m; }
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return { score: best, move: bestMove };
}
function moveOrderScore(s, m) {
  const cap = s.board[m.to.r][m.to.c];
  if (cap) {
    const mover = s.board[m.from.r][m.from.c];
    return PIECE_VALS[cap.toUpperCase()] - PIECE_VALS[mover.toUpperCase()] / 10;
  }
  if (m.promote) return PIECE_VALS[m.promote.toUpperCase()];
  return 0;
}

// ============== UI ==============
function draw() {
  const w = cell * 8;
  ctx.clearRect(0, 0, w, w);
  // squares
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    ctx.fillStyle = (r + c) % 2 === 0 ? '#1a1147' : '#0e0828';
    ctx.fillRect(c * cell, r * cell, cell, cell);
  }
  // last move highlight
  if (lastMove) {
    ctx.fillStyle = 'rgba(255,214,10,0.18)';
    ctx.fillRect(lastMove.from.c * cell, lastMove.from.r * cell, cell, cell);
    ctx.fillRect(lastMove.to.c * cell, lastMove.to.r * cell, cell, cell);
  }
  // selected
  if (selected) {
    ctx.fillStyle = 'rgba(0,245,255,0.28)';
    ctx.fillRect(selected.c * cell, selected.r * cell, cell, cell);
    for (const m of legalForSelected) {
      const cap = state.board[m.to.r][m.to.c];
      ctx.fillStyle = cap ? 'rgba(239,35,60,0.35)' : 'rgba(6,255,165,0.35)';
      ctx.beginPath();
      ctx.arc(m.to.c * cell + cell / 2, m.to.r * cell + cell / 2, cell * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // check pulse
  const checked = inCheck(state);
  if (checked) {
    const king = findKing(state, state.turn);
    if (king) {
      const pulse = 0.35 + 0.25 * Math.sin(performance.now() / 220);
      ctx.fillStyle = `rgba(239,35,60,${pulse.toFixed(2)})`;
      ctx.fillRect(king.c * cell, king.r * cell, cell, cell);
    }
  }
  // pieces
  ctx.font = 'bold ' + Math.round(cell * 0.7) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = state.board[r][c]; if (!p) continue;
    const g = GLYPHS[p];
    const isW = isWhite(p);
    ctx.fillStyle = isW ? '#fff' : '#1a0635';
    ctx.fillText(g, c * cell + cell / 2, r * cell + cell / 2 + 2);
    if (!isW) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeText(g, c * cell + cell / 2, r * cell + cell / 2 + 2);
    }
  }
}

function loop() { draw(); pulseRaf = requestAnimationFrame(loop); }
pulseRaf = requestAnimationFrame(loop);

function pickSquare(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor((clientX - rect.left) / cell);
  const r = Math.floor((clientY - rect.top) / cell);
  if (!inB(r, c)) return null;
  return { r, c };
}

function handleClick(clientX, clientY) {
  if (gameOver || busy || state.turn !== 'w') return;
  const sq = pickSquare(clientX, clientY);
  if (!sq) return;
  if (selected) {
    const m = legalForSelected.find(mv => mv.to.r === sq.r && mv.to.c === sq.c);
    if (m) {
      applyAndAnimate(m);
      return;
    }
    // pick another own piece
    if (state.board[sq.r][sq.c] && isWhite(state.board[sq.r][sq.c])) {
      selected = sq;
      legalForSelected = generateMoves(state).filter(m => m.from.r === sq.r && m.from.c === sq.c);
      GAI.audio.tone(440, 0.04, 'square', 0.08);
      return;
    }
    selected = null; legalForSelected = [];
    return;
  }
  if (state.board[sq.r][sq.c] && isWhite(state.board[sq.r][sq.c])) {
    selected = sq;
    legalForSelected = generateMoves(state).filter(m => m.from.r === sq.r && m.from.c === sq.c);
    GAI.audio.ensure();
    GAI.audio.tone(660, 0.04, 'square', 0.08);
  }
}

function applyAndAnimate(m) {
  busy = true;
  history.push(cloneState(state));
  state = applyMove(state, m);
  selected = null; legalForSelected = [];
  lastMove = m;
  // sound: capture = lower thud, normal = click
  const cap = m.ep || (history[history.length - 1].board[m.to.r][m.to.c]);
  if (cap) GAI.audio.tone(220, 0.08, 'sawtooth', 0.14);
  else GAI.audio.tone(440, 0.05, 'sine', 0.12);
  if (inCheck(state)) {
    GAI.audio.tone(110, 0.25, 'sawtooth', 0.16, 0.005, 0.2);
  }
  draw();
  setTimeout(() => {
    busy = false;
    if (checkEnd()) return;
    setTimeout(aiMove, 240);
  }, 180);
}

function aiMove() {
  if (gameOver) return;
  status.textContent = 'AI THINKING…';
  setTimeout(() => {
    let useDepth = depth;
    let m;
    if (easy && Math.random() < 0.25) {
      const moves = generateMoves(state);
      m = moves[Math.floor(Math.random() * moves.length)];
    } else {
      const res = search(state, useDepth, -Infinity, Infinity);
      m = res.move;
    }
    if (!m) { checkEnd(); return; }
    history.push(cloneState(state));
    state = applyMove(state, m);
    lastMove = m;
    GAI.audio.tone(330, 0.06, 'sine', 0.12);
    if (inCheck(state)) {
      GAI.audio.tone(110, 0.25, 'sawtooth', 0.18, 0.005, 0.2);
      status.textContent = 'CHECK';
      status.className = 'status check';
    } else {
      status.textContent = 'YOUR MOVE';
      status.className = 'status';
    }
    draw();
    checkEnd();
  }, 60);
}

function checkEnd() {
  const moves = generateMoves(state);
  if (moves.length === 0) {
    if (inCheck(state)) {
      // checkmate
      gameOver = true;
      if (state.turn === 'b') {
        // AI is in checkmate -> player wins
        wins++; GAI.storage.set('gai_chess_w', wins);
        document.getElementById('wWins').textContent = wins;
        status.textContent = '✦ CHECKMATE — YOU WIN';
        status.className = 'status win';
        GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
        GAI.recordWin('chess');
        GAI.fx.confetti({ count: 80 });
        GAI.fx.chromaticFlash(500);
        if (!easy) GAI.achievements.unlock('grandmaster');
      } else {
        losses++; GAI.storage.set('gai_chess_l', losses);
        document.getElementById('losses').textContent = losses;
        status.textContent = 'CHECKMATE — YOU LOSE';
        status.className = 'status lose';
        GAI.audio.arpeggio([311.13, 261.63, 220, 174.61], 130, 'sawtooth', 0.18);
        GAI.fx.screenShake(canvas, 8, 480);
      }
    } else {
      gameOver = true;
      draws++; GAI.storage.set('gai_chess_d', draws);
      document.getElementById('draws').textContent = draws;
      status.textContent = 'STALEMATE — DRAW';
      status.className = 'status draw';
    }
    return true;
  }
  if (state.halfmove >= 100) {
    gameOver = true;
    draws++; GAI.storage.set('gai_chess_d', draws);
    document.getElementById('draws').textContent = draws;
    status.textContent = '50-MOVE RULE — DRAW';
    status.className = 'status draw';
    return true;
  }
  GAI.bestScore('chess', wins);
  return false;
}

canvas.addEventListener('click', (e) => handleClick(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  handleClick(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

undoBtn.addEventListener('click', () => {
  if (busy) return;
  GAI.audio.ensure();
  if (history.length >= 2) {
    state = history.pop(); // undo AI
    state = history.pop(); // undo player
  } else if (history.length === 1) {
    state = history.pop();
  }
  selected = null; legalForSelected = []; lastMove = null;
  gameOver = false;
  status.textContent = 'YOUR MOVE';
  status.className = 'status';
  GAI.audio.tone(440, 0.05, 'sine', 0.10);
  draw();
});
diffBtn.addEventListener('click', () => {
  depth = depth === 2 ? 3 : 2;
  easy = depth === 2;
  GAI.storage.set('gai_chess_depth', depth);
  diffTag.textContent = easy ? 'EASY' : 'HARD';
});
resignBtn.addEventListener('click', () => {
  if (gameOver || busy) {
    state = newState(); history = []; selected = null; legalForSelected = []; lastMove = null;
    gameOver = false; status.textContent = 'YOUR MOVE'; status.className = 'status'; draw();
    return;
  }
  losses++; GAI.storage.set('gai_chess_l', losses);
  document.getElementById('losses').textContent = losses;
  gameOver = true;
  status.textContent = 'RESIGNED — TAP TO PLAY AGAIN';
  status.className = 'status lose';
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit(); draw();
})();
