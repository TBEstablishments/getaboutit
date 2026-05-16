(() => {
'use strict';
const GAI = window.GAI;
const N = 5; // 5x5 boxes = 6x6 dots
let cell = 60;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

// edges represented as two grids
let hEdges = [];  // [row][col] horizontal edges, row 0..N, col 0..N-1
let vEdges = [];  // [row][col] vertical edges, row 0..N-1, col 0..N
let boxes = [];   // owner 0 none, 1 player, -1 ai
let pScore = 0, aScore = 0, longest = 0;
let turn = 1; // 1 player, -1 ai
let gameOver = false;
let bestChain = +(GAI.storage.get('gai_dots_chain') || 0);
document.getElementById('ch').textContent = bestChain;

function reset() {
  hEdges = [];
  vEdges = [];
  boxes = [];
  for (let r = 0; r <= N; r++) {
    const row = new Array(N).fill(0);
    hEdges.push(row);
  }
  for (let r = 0; r < N; r++) {
    vEdges.push(new Array(N + 1).fill(0));
    boxes.push(new Array(N).fill(0));
  }
  pScore = 0; aScore = 0; turn = 1; gameOver = false;
  updateScore();
  status.textContent = 'YOUR TURN';
  status.className = 'status';
  draw();
}

function fit() {
  const maxW = Math.min(window.innerWidth - 32, 520);
  const maxH = Math.min(window.innerHeight - 200, 520);
  const sz = Math.min(maxW, maxH);
  cell = Math.floor(sz / (N + 0.4));
  const w = cell * N + cell * 0.4;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = w * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = w + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function pad() { return cell * 0.2; }
function dotXY(r, c) { return { x: pad() + c * cell, y: pad() + r * cell }; }

function draw() {
  const w = cell * N + pad() * 2;
  ctx.clearRect(0, 0, w, w);
  // claimed boxes
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (boxes[r][c] !== 0) {
      const p = dotXY(r, c);
      ctx.fillStyle = boxes[r][c] === 1 ? 'rgba(255,0,110,0.6)' : 'rgba(255,214,10,0.6)';
      ctx.fillRect(p.x, p.y, cell, cell);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(cell * 0.45) + 'px "Press Start 2P", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(boxes[r][c] === 1 ? 'P' : 'A', p.x + cell / 2, p.y + cell / 2);
    }
  }
  // horizontal edges
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c < N; c++) {
      const p = dotXY(r, c);
      ctx.strokeStyle = hEdges[r][c] ? '#00f5ff' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = hEdges[r][c] ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + cell, p.y);
      ctx.stroke();
    }
  }
  // vertical edges
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= N; c++) {
      const p = dotXY(r, c);
      ctx.strokeStyle = vEdges[r][c] ? '#00f5ff' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = vEdges[r][c] ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + cell);
      ctx.stroke();
    }
  }
  // dots
  for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) {
    const p = dotXY(r, c);
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }
}

function pickEdge(x, y) {
  // x,y in canvas coords. Find nearest edge.
  const ox = x - pad(), oy = y - pad();
  // candidate horizontal edges: nearest dot column
  let best = null;
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c < N; c++) {
      const mx = c * cell + cell / 2;
      const my = r * cell;
      const d = Math.hypot(ox - mx, oy - my);
      if (best == null || d < best.d) best = { d, kind: 'h', r, c };
    }
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= N; c++) {
      const mx = c * cell;
      const my = r * cell + cell / 2;
      const d = Math.hypot(ox - mx, oy - my);
      if (d < best.d) best = { d, kind: 'v', r, c };
    }
  }
  if (best && best.d < cell * 0.45) return best;
  return null;
}

function setEdge(e, who) {
  if (e.kind === 'h') {
    if (hEdges[e.r][e.c]) return 0;
    hEdges[e.r][e.c] = 1;
  } else {
    if (vEdges[e.r][e.c]) return 0;
    vEdges[e.r][e.c] = 1;
  }
  // check which boxes got completed
  let claimed = 0;
  const checks = [];
  if (e.kind === 'h') {
    if (e.r > 0) checks.push([e.r - 1, e.c]);
    if (e.r < N) checks.push([e.r, e.c]);
  } else {
    if (e.c > 0) checks.push([e.r, e.c - 1]);
    if (e.c < N) checks.push([e.r, e.c]);
  }
  for (const [br, bc] of checks) {
    if (boxes[br][bc] !== 0) continue;
    if (boxComplete(br, bc)) {
      boxes[br][bc] = who;
      claimed++;
    }
  }
  return claimed;
}

function boxComplete(r, c) {
  return hEdges[r][c] && hEdges[r + 1][c] && vEdges[r][c] && vEdges[r][c + 1];
}

function freeEdges() {
  const out = [];
  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) if (!hEdges[r][c]) out.push({ kind: 'h', r, c });
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) if (!vEdges[r][c]) out.push({ kind: 'v', r, c });
  return out;
}
function isFinished() { return freeEdges().length === 0; }

let chainCount = 0;

function play(e, who) {
  const before = chainCount;
  const claimed = setEdge(e, who);
  if (claimed > 0) {
    chainCount += claimed;
    if (who === 1) {
      pScore += claimed;
      const base = 500;
      for (let i = 0; i < claimed; i++) setTimeout(() => GAI.audio.tone(base * Math.pow(1.122, i), 0.08, 'square', 0.14), i * 90);
      if (claimed >= 4) GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.16);
    } else {
      aScore += claimed;
      GAI.audio.tone(220, 0.08, 'sawtooth', 0.10);
    }
    if (chainCount > longest) longest = chainCount;
    if (longest > bestChain) {
      bestChain = longest;
      GAI.storage.set('gai_dots_chain', bestChain);
      document.getElementById('ch').textContent = bestChain;
    }
    updateScore();
    draw();
    if (isFinished()) { endGame(); return; }
    // bonus turn
    if (who === 1) status.textContent = 'BONUS TURN';
    else setTimeout(aiTurn, 280);
    return;
  }
  chainCount = 0;
  if (who === 1) {
    GAI.audio.tone(330, 0.05, 'sine', 0.08);
  } else {
    GAI.audio.tone(280, 0.05, 'sine', 0.08);
  }
  draw();
  if (isFinished()) { endGame(); return; }
  turn = -turn;
  if (turn === -1) { setTimeout(aiTurn, 350); status.textContent = 'AI THINKING…'; status.className = 'status'; }
  else { status.textContent = 'YOUR TURN'; status.className = 'status'; }
}

function aiTurn() {
  if (gameOver) return;
  const moves = freeEdges();
  if (!moves.length) { endGame(); return; }
  // 1) take any move that completes a box
  for (const m of moves) {
    if (wouldComplete(m)) { play(m, -1); return; }
  }
  // 2) avoid making 3-sided
  const safe = moves.filter(m => !wouldCreateThirdSide(m));
  const pool = safe.length ? safe : moves;
  // 3) prefer outer edges
  const pick = pool[Math.floor(Math.random() * pool.length)];
  play(pick, -1);
}

function wouldComplete(e) {
  const before = countSides(e);
  if (e.kind === 'h') hEdges[e.r][e.c] = 1; else vEdges[e.r][e.c] = 1;
  let any = false;
  if (e.kind === 'h') {
    if (e.r > 0 && boxComplete(e.r - 1, e.c)) any = true;
    if (e.r < N && boxComplete(e.r, e.c)) any = true;
  } else {
    if (e.c > 0 && boxComplete(e.r, e.c - 1)) any = true;
    if (e.c < N && boxComplete(e.r, e.c)) any = true;
  }
  if (e.kind === 'h') hEdges[e.r][e.c] = 0; else vEdges[e.r][e.c] = 0;
  return any;
}
function wouldCreateThirdSide(e) {
  if (e.kind === 'h') hEdges[e.r][e.c] = 1; else vEdges[e.r][e.c] = 1;
  let any = false;
  if (e.kind === 'h') {
    if (e.r > 0 && boxSides(e.r - 1, e.c) === 3 && !boxComplete(e.r - 1, e.c)) any = true;
    if (e.r < N && boxSides(e.r, e.c) === 3 && !boxComplete(e.r, e.c)) any = true;
  } else {
    if (e.c > 0 && boxSides(e.r, e.c - 1) === 3 && !boxComplete(e.r, e.c - 1)) any = true;
    if (e.c < N && boxSides(e.r, e.c) === 3 && !boxComplete(e.r, e.c)) any = true;
  }
  if (e.kind === 'h') hEdges[e.r][e.c] = 0; else vEdges[e.r][e.c] = 0;
  return any;
}
function boxSides(r, c) {
  return (hEdges[r][c] ? 1 : 0) + (hEdges[r + 1][c] ? 1 : 0) + (vEdges[r][c] ? 1 : 0) + (vEdges[r][c + 1] ? 1 : 0);
}
function countSides(e) {
  let n = 0;
  if (e.kind === 'h') {
    if (e.r > 0) n = Math.max(n, boxSides(e.r - 1, e.c));
    if (e.r < N) n = Math.max(n, boxSides(e.r, e.c));
  } else {
    if (e.c > 0) n = Math.max(n, boxSides(e.r, e.c - 1));
    if (e.c < N) n = Math.max(n, boxSides(e.r, e.c));
  }
  return n;
}

function updateScore() {
  document.getElementById('ps').textContent = pScore;
  document.getElementById('as').textContent = aScore;
  document.getElementById('ch').textContent = Math.max(bestChain, chainCount);
}

function endGame() {
  gameOver = true;
  if (pScore > aScore) {
    status.textContent = '✦ YOU WIN ' + pScore + '-' + aScore + ' — TAP TO PLAY AGAIN';
    status.className = 'status win';
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
    GAI.recordWin('dots');
    GAI.fx.confetti();
  } else if (aScore > pScore) {
    status.textContent = '✦ AI WINS ' + aScore + '-' + pScore + ' — TAP TO PLAY AGAIN';
    status.className = 'status lose';
    GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.16);
  } else {
    status.textContent = 'DRAW — TAP TO PLAY AGAIN';
    status.className = 'status draw';
  }
  GAI.bestScore('dots', pScore);
}

canvas.addEventListener('click', (e) => {
  if (gameOver) { reset(); return; }
  if (turn !== 1) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const ed = pickEdge(x, y);
  if (!ed) return;
  GAI.audio.ensure();
  play(ed, 1);
});
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  if (gameOver) { reset(); return; }
  if (turn !== 1) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left, y = e.touches[0].clientY - rect.top;
  const ed = pickEdge(x, y); if (!ed) return;
  GAI.audio.ensure();
  play(ed, 1);
}, { passive: false });

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit(); reset();
})();
