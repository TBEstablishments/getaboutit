(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const diffBtn = document.getElementById('diff');
const resetBtn = document.getElementById('reset');
const wEl = document.getElementById('w'), lEl = document.getElementById('l'), dEl = document.getElementById('d');

const SZ = 360;
let dpr = 1;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const css = Math.max(80, Math.min(rect.width, rect.height));
  canvas.width = css * dpr; canvas.height = css * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fit);
fit();

let board, turn, gameDone, anims;
let diff = GAI.storage.get('gai_ttt_diff') || 'hard';
let series = GAI.storage.getJSON('gai_ttt_series', { w: 0, l: 0, d: 0 });
wEl.textContent = series.w; lEl.textContent = series.l; dEl.textContent = series.d;
diffBtn.textContent = diff.toUpperCase();

function reset() {
  board = Array(9).fill(0);
  turn = 1; gameDone = false; anims = [];
  statusEl.textContent = 'YOUR MOVE';
  statusEl.className = 'status';
  draw();
}
reset();

function winnerOf(b) {
  const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b2,c] of L) if (b[a] && b[a] === b[b2] && b[a] === b[c]) return { p: b[a], line: [a,b2,c] };
  if (b.every(v => v !== 0)) return { p: 0, line: null };
  return null;
}

function minimax(b, player, alpha, beta) {
  const r = winnerOf(b);
  if (r) {
    if (r.p === -1) return { score: 10 };
    if (r.p === 1) return { score: -10 };
    return { score: 0 };
  }
  let best = player === -1 ? { score: -Infinity } : { score: Infinity };
  for (let i = 0; i < 9; i++) {
    if (b[i] !== 0) continue;
    b[i] = player;
    const r2 = minimax(b, -player, alpha, beta);
    b[i] = 0;
    if (player === -1) {
      if (r2.score > best.score) best = { score: r2.score, idx: i };
      alpha = Math.max(alpha, r2.score);
    } else {
      if (r2.score < best.score) best = { score: r2.score, idx: i };
      beta = Math.min(beta, r2.score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function aiMove() {
  if (gameDone) return;
  let idx;
  if (diff === 'easy') {
    const free = board.map((v,i) => v===0 ? i : -1).filter(i => i >= 0);
    idx = free[Math.floor(Math.random() * free.length)];
  } else {
    const r = minimax(board.slice(), -1, -Infinity, Infinity);
    idx = r.idx;
  }
  setTimeout(() => place(idx, -1), 350 + Math.random() * 200);
}

function place(idx, who) {
  if (gameDone || board[idx] !== 0) return;
  board[idx] = who;
  anims.push({ idx, who, t: 0 });
  GAI.audio.tone(who === 1 ? 660 : 440, 0.07, who === 1 ? 'square' : 'triangle', 0.14, 0.005, 0.07);
  const r = winnerOf(board);
  if (r) finalize(r);
  else {
    turn = -who;
    if (turn === -1) { statusEl.textContent = "AI THINKING..."; aiMove(); }
    else statusEl.textContent = 'YOUR MOVE';
  }
}

function finalize(r) {
  gameDone = true;
  if (r.line) anims.push({ winLine: r.line, t: 0 });
  if (r.p === 1) { statusEl.textContent = 'YOU WIN'; statusEl.className = 'status win'; series.w++; GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 80, 'triangle', 0.18); }
  else if (r.p === -1) { statusEl.textContent = 'AI WINS'; statusEl.className = 'status lose'; series.l++; GAI.audio.arpeggio([440, 369.99, 311.13], 120, 'sawtooth', 0.16); }
  else { statusEl.textContent = 'DRAW'; statusEl.className = 'status draw'; series.d++; GAI.audio.tone(523.25, 0.18, 'triangle', 0.14, 0.005, 0.1); }
  GAI.storage.setJSON('gai_ttt_series', series);
  wEl.textContent = series.w; lEl.textContent = series.l; dEl.textContent = series.d;
  setTimeout(reset, 1600);
}

canvas.addEventListener('click', (e) => {
  if (gameDone || turn !== 1) return;
  GAI.audio.ensure();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cw = rect.width / 3, ch = rect.height / 3;
  const c = Math.floor(x / cw), r = Math.floor(y / ch);
  const idx = r * 3 + c;
  if (board[idx] !== 0) return;
  place(idx, 1);
});

diffBtn.addEventListener('click', () => {
  diff = (diff === 'hard') ? 'easy' : 'hard';
  GAI.storage.set('gai_ttt_diff', diff);
  diffBtn.textContent = diff.toUpperCase();
  reset();
});
resetBtn.addEventListener('click', () => {
  series = { w: 0, l: 0, d: 0 };
  GAI.storage.setJSON('gai_ttt_series', series);
  wEl.textContent = '0'; lEl.textContent = '0'; dEl.textContent = '0';
  reset();
});

let lastT = 0;
function loop(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  for (const a of anims) a.t += dt;
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function draw() {
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  ctx.clearRect(0, 0, W, H);
  // background
  ctx.fillStyle = 'rgba(10,10,30,0.85)';
  ctx.fillRect(0, 0, W, H);
  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(W * i / 3, 8); ctx.lineTo(W * i / 3, H - 8);
    ctx.moveTo(8, H * i / 3); ctx.lineTo(W - 8, H * i / 3);
    ctx.stroke();
  }
  // X/O
  for (const a of anims) {
    if (a.winLine) continue;
    const cw = W / 3, ch = H / 3;
    const c = a.idx % 3, r = (a.idx - c) / 3;
    const x = c * cw, y = r * ch;
    const t = Math.min(1, a.t / 0.35);
    if (a.who === 1) {
      ctx.strokeStyle = PAL[0]; ctx.lineWidth = 4;
      ctx.shadowColor = PAL[0]; ctx.shadowBlur = 8;
      const m = cw * 0.22;
      ctx.beginPath();
      ctx.moveTo(x + m, y + m);
      ctx.lineTo(x + m + (cw - 2*m) * Math.min(1, t * 2), y + m + (ch - 2*m) * Math.min(1, t * 2));
      ctx.stroke();
      if (t > 0.5) {
        ctx.beginPath();
        ctx.moveTo(x + cw - m, y + m);
        ctx.lineTo(x + cw - m - (cw - 2*m) * ((t - 0.5) * 2), y + m + (ch - 2*m) * ((t - 0.5) * 2));
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = PAL[5]; ctx.lineWidth = 4;
      ctx.shadowColor = PAL[5]; ctx.shadowBlur = 8;
      const r2 = cw * 0.32;
      ctx.beginPath();
      ctx.arc(x + cw/2, y + ch/2, r2, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * t);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  // win line
  for (const a of anims) {
    if (!a.winLine) continue;
    const [s, , e] = a.winLine;
    const cw = W / 3, ch = H / 3;
    const sx = (s % 3) * cw + cw/2, sy = Math.floor(s / 3) * ch + ch/2;
    const ex = (e % 3) * cw + cw/2, ey = Math.floor(e / 3) * ch + ch/2;
    const t = Math.min(1, a.t / 0.5);
    ctx.strokeStyle = PAL[7]; ctx.lineWidth = 6;
    ctx.shadowColor = PAL[7]; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (ex - sx) * t, sy + (ey - sy) * t);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

})();
