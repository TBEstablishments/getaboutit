(() => {
'use strict';
const GAI = window.GAI;
const PAL = GAI.PALETTE;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const diffBtn = document.getElementById('diff');

let dpr = 1, W = 320;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  W = Math.max(40, rect.width);
  canvas.width = W * dpr; canvas.height = W * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fit);
fit();

let mode = GAI.storage.get('gai_mem_mode') || 'easy';
diffBtn.textContent = mode.toUpperCase();
let N = mode === 'easy' ? 4 : 6;
let cards = []; // { sym, flipped, matched, flipT }
let firstIdx = -1, secondIdx = -1, lockUntil = 0;
let moves = 0, startT = 0, won = false;
let confetti = [];

const SYMBOLS = ['circle','square','triangle','diamond','star','plus','x','heart','wave','ring','bar','arrow','grid','dot','asterisk','split','frame','target','split2'];

function setup() {
  N = mode === 'easy' ? 4 : 6;
  const pairs = (N * N) / 2;
  const ids = [];
  for (let i = 0; i < pairs; i++) { ids.push(i); ids.push(i); }
  // shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  cards = ids.map(id => ({
    sym: id,
    flipped: false,
    matched: false,
    flipT: 0
  }));
  firstIdx = -1; secondIdx = -1; moves = 0;
  startT = performance.now(); won = false;
  movesEl.textContent = '0';
  confetti = [];
}
setup();
const prev = GAI.storage.getJSON('gai_best_memory_' + mode, null);
if (prev) bestEl.textContent = prev.moves + ' / ' + fmtTime(prev.time);

function fmtTime(s) {
  const m = (s / 60) | 0; const ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

canvas.addEventListener('click', (e) => {
  if (performance.now() < lockUntil || won) return;
  GAI.audio.ensure();
  const rect = canvas.getBoundingClientRect();
  const cellSz = rect.width / N;
  const c = Math.floor((e.clientX - rect.left) / cellSz);
  const r = Math.floor((e.clientY - rect.top) / cellSz);
  if (c < 0 || c >= N || r < 0 || r >= N) return;
  const idx = r * N + c;
  const card = cards[idx];
  if (card.flipped || card.matched) return;
  card.flipped = true;
  card.flipT = 0;
  GAI.audio.tone(330 + (card.sym % 8) * 25, 0.06, 'square', 0.12, 0.005, 0.05);
  if (firstIdx === -1) {
    firstIdx = idx;
  } else {
    secondIdx = idx;
    moves++;
    movesEl.textContent = moves;
    if (cards[firstIdx].sym === card.sym) {
      cards[firstIdx].matched = true;
      cards[secondIdx].matched = true;
      firstIdx = -1; secondIdx = -1;
      GAI.audio.arpeggio([523.25, 783.99], 60, 'triangle', 0.16);
      if (cards.every(c => c.matched)) onWin();
    } else {
      lockUntil = performance.now() + 800;
      setTimeout(() => {
        if (firstIdx >= 0) cards[firstIdx].flipped = false;
        if (secondIdx >= 0) cards[secondIdx].flipped = false;
        firstIdx = -1; secondIdx = -1;
      }, 800);
    }
  }
});

function onWin() {
  won = true;
  GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 80, 'triangle', 0.18);
  GAI.haptic([20, 30, 40]);
  // wave-flip cards
  for (let i = 0; i < cards.length; i++) {
    setTimeout(() => { cards[i].flipT = -0.4; }, i * 30);
  }
  // confetti
  for (let i = 0; i < 80; i++) {
    confetti.push({
      x: W * Math.random(),
      y: W * 0.5,
      vx: (Math.random() - 0.5) * 200,
      vy: -200 - Math.random() * 200,
      c: PAL[Math.floor(Math.random() * PAL.length)],
      t: 0
    });
  }
  const tt = ((performance.now() - startT) / 1000) | 0;
  const cur = { moves, time: tt };
  const prevB = GAI.storage.getJSON('gai_best_memory_' + mode, null);
  if (!prevB || cur.moves < prevB.moves || (cur.moves === prevB.moves && cur.time < prevB.time)) {
    GAI.storage.setJSON('gai_best_memory_' + mode, cur);
    GAI.bestScore('memory', -moves);
    bestEl.textContent = cur.moves + ' / ' + fmtTime(cur.time);
  }
  setTimeout(() => { setup(); }, 2400);
}

diffBtn.addEventListener('click', () => {
  mode = mode === 'easy' ? 'hard' : 'easy';
  GAI.storage.set('gai_mem_mode', mode);
  diffBtn.textContent = mode.toUpperCase();
  setup();
  const p = GAI.storage.getJSON('gai_best_memory_' + mode, null);
  bestEl.textContent = p ? (p.moves + ' / ' + fmtTime(p.time)) : '—';
});
document.getElementById('reset').addEventListener('click', () => setup());

function drawSymbol(x, y, s, color, sym) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const m = s * 0.25;
  const cx = x + s/2, cy = y + s/2;
  const idx = sym % SYMBOLS.length;
  ctx.beginPath();
  switch (idx) {
    case 0: ctx.arc(cx, cy, s/2 - m, 0, Math.PI * 2); ctx.fill(); break;
    case 1: ctx.fillRect(x + m, y + m, s - 2*m, s - 2*m); break;
    case 2: ctx.moveTo(cx, y + m); ctx.lineTo(x + s - m, y + s - m); ctx.lineTo(x + m, y + s - m); ctx.closePath(); ctx.fill(); break;
    case 3: ctx.moveTo(cx, y + m); ctx.lineTo(x + s - m, cy); ctx.lineTo(cx, y + s - m); ctx.lineTo(x + m, cy); ctx.closePath(); ctx.fill(); break;
    case 4: {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI/2 + i * Math.PI * 2 / 5;
        const px = cx + Math.cos(a) * (s/2 - m);
        const py = cy + Math.sin(a) * (s/2 - m);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      break;
    }
    case 5: ctx.fillRect(x + m, cy - 3, s - 2*m, 6); ctx.fillRect(cx - 3, y + m, 6, s - 2*m); break;
    case 6: ctx.moveTo(x + m, y + m); ctx.lineTo(x + s - m, y + s - m); ctx.moveTo(x + s - m, y + m); ctx.lineTo(x + m, y + s - m); ctx.stroke(); break;
    case 7: {
      const r = (s/2 - m);
      ctx.moveTo(cx, cy + r * 0.7);
      ctx.bezierCurveTo(cx + r, cy, cx + r * 0.7, cy - r, cx, cy - r * 0.3);
      ctx.bezierCurveTo(cx - r * 0.7, cy - r, cx - r, cy, cx, cy + r * 0.7);
      ctx.fill();
      break;
    }
    case 8: ctx.moveTo(x + m, cy); for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x + m + (s - 2*m) * (i + 0.5) / 4, cy + (i % 2 === 0 ? -10 : 10), x + m + (s - 2*m) * (i + 1) / 4, cy); ctx.stroke(); break;
    case 9: ctx.arc(cx, cy, s/2 - m, 0, Math.PI * 2); ctx.stroke(); break;
    case 10: ctx.fillRect(x + m, y + m, s - 2*m, 8); ctx.fillRect(x + m, y + s/2 - 4, s - 2*m, 8); ctx.fillRect(x + m, y + s - m - 8, s - 2*m, 8); break;
    case 11: ctx.moveTo(x + m, cy); ctx.lineTo(x + s - m, cy); ctx.lineTo(x + s - m - 8, cy - 8); ctx.moveTo(x + s - m, cy); ctx.lineTo(x + s - m - 8, cy + 8); ctx.stroke(); break;
    case 12: for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctx.fillRect(x + m + i * (s - 2*m) / 3, y + m + j * (s - 2*m) / 3, (s - 2*m) / 3 - 2, (s - 2*m) / 3 - 2); break;
    case 13: ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill(); break;
    case 14: {
      ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 4;
        ctx.moveTo(cx - Math.cos(a) * (s/2 - m), cy - Math.sin(a) * (s/2 - m));
        ctx.lineTo(cx + Math.cos(a) * (s/2 - m), cy + Math.sin(a) * (s/2 - m));
      }
      ctx.stroke();
      break;
    }
    case 15: ctx.fillRect(x + m, y + m, (s - 2*m) / 2 - 2, s - 2*m); ctx.fillRect(cx + 2, y + m, (s - 2*m) / 2 - 2, s - 2*m); break;
    case 16: ctx.strokeRect(x + m, y + m, s - 2*m, s - 2*m); break;
    case 17: {
      ctx.arc(cx, cy, s/2 - m, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, (s/2 - m) * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 18: ctx.moveTo(x + m, y + m); ctx.lineTo(x + s - m, y + s - m); ctx.moveTo(cx, y + m); ctx.lineTo(cx, y + s - m); ctx.stroke(); break;
  }
}

function drawCardBack(x, y, s) {
  ctx.fillStyle = '#3a0ca3';
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.max(6, (s * 0.15) | 0) + 'px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // tiny GETABOUTIT wordmark
  ctx.fillStyle = '#ff006e'; ctx.fillText('GAI', x + s/2 + 1, y + s/2);
  ctx.fillStyle = '#00f5ff'; ctx.fillText('GAI', x + s/2 - 1, y + s/2);
  ctx.fillStyle = '#fff'; ctx.fillText('GAI', x + s/2, y + s/2);
}

let lastT = 0;
function loop(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  // flip anim
  for (const c of cards) {
    if (c.flipped || c.matched) c.flipT = Math.min(1, c.flipT + dt * 4);
    else c.flipT = Math.max(0, c.flipT - dt * 4);
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i];
    p.t += dt;
    p.vy += 400 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.t > 2.5) confetti.splice(i, 1);
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function render() {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, W);
  const cell = W / N;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const r = Math.floor(i / N), col = i % N;
    const x = col * cell, y = r * cell;
    const t = Math.max(0, c.flipT);
    const sc = Math.abs(Math.cos(t * Math.PI));
    ctx.save();
    ctx.translate(x + cell/2, y + cell/2);
    ctx.scale(sc, 1);
    ctx.translate(-cell/2, -cell/2);
    if (t < 0.5) drawCardBack(0, 0, cell);
    else {
      ctx.fillStyle = '#1f1235';
      ctx.fillRect(1, 1, cell - 2, cell - 2);
      drawSymbol(0, 0, cell, PAL[c.sym % PAL.length], c.sym);
    }
    ctx.restore();
  }
  // confetti
  for (const p of confetti) {
    ctx.fillStyle = p.c;
    ctx.globalAlpha = Math.max(0, 1 - p.t / 2.5);
    ctx.fillRect(p.x, p.y, 4, 4);
  }
  ctx.globalAlpha = 1;
}

setInterval(() => {
  if (won || startT === 0) return;
  timeEl.textContent = fmtTime(((performance.now() - startT) / 1000) | 0);
}, 250);

})();
