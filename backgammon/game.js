(() => {
'use strict';
const GAI = window.GAI;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

// points[0..23]: 0 = no checker, positive = player count, negative = ai count
// player home is 0..5 (bear off direction = decreasing index)
// ai home is 18..23 (bear off direction = increasing index)
let points;
let bar = { p: 0, a: 0 };
let off = { p: 0, a: 0 };
let dice = [];
let diceLeft = []; // remaining moves
let turn = 1; // 1 = player, -1 = ai
let selected = null;
let pWins = +(GAI.storage.get('gai_backgammon_pw') || 0);
let aWins = +(GAI.storage.get('gai_backgammon_aw') || 0);
let bestEverWins = +(GAI.storage.get('gai_best_backgammon') || 0);
let history = [];
let phase = 'roll'; // roll | move | over

document.getElementById('pw').textContent = pWins;
document.getElementById('aw').textContent = aWins;
document.getElementById('best').textContent = bestEverWins;

function startingPoints() {
  // Standard initial setup
  const p = new Array(24).fill(0);
  // Player (+): 24-point (idx 23) +2 (moving toward 0), 13-point +5, 8-point +3, 6-point +5
  p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5;
  // AI (-): mirror
  p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5;
  return p;
}

function newGame() {
  points = startingPoints();
  bar = { p: 0, a: 0 }; off = { p: 0, a: 0 };
  dice = []; diceLeft = [];
  selected = null;
  turn = 1;
  phase = 'roll';
  history = [];
  status.textContent = 'TAP ROLL TO START';
  status.className = 'status';
  draw();
}

let cell = 28, boardW = 520, boardH = 360;
function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  boardW = Math.min(window.innerWidth - 32, 600);
  boardH = Math.min(window.innerHeight - 240, 400);
  if (boardH < boardW * 0.55) boardW = boardH / 0.55;
  canvas.width = boardW * dpr; canvas.height = boardH * dpr;
  canvas.style.width = boardW + 'px'; canvas.style.height = boardH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cell = (boardW - 60) / 12;
  draw();
}

function pointXY(idx) {
  // 24 triangles; bottom row idx 0..11 from right to left; top row idx 12..23 from right to left
  // But standard layout: bottom row 1..12 from right; for player p1 home = 1..6 (in bottom-right)
  // We'll lay out:
  // bottom right (idx 0..5) then bottom left (idx 6..11) — bottom row right-to-left
  // top left (idx 12..17) then top right (idx 18..23) — top row left-to-right
  let x, top;
  if (idx < 12) {
    // bottom row
    const col = idx < 6 ? (5 - idx + 6) : (11 - idx);
    // col 0..5 left half, 6..11 right half
    const half = col < 6 ? col : col + 1; // skip bar at col 6
    x = 30 + half * cell;
    top = false;
  } else {
    const col = idx < 18 ? (idx - 12) : (idx - 12 + 1) - 1;
    // simpler: idx 12..17 = top left (col 0..5), idx 18..23 = top right (col 6..11)
    const c = idx - 12;
    const half = c < 6 ? c : c + 1; // skip bar
    x = 30 + half * cell;
    top = true;
  }
  return { x, top };
}

function drawTriangle(x, top, color1, color2, dim) {
  const w = cell, h = boardH * 0.45;
  ctx.fillStyle = dim ? '#0a0a1e' : (((x - 30) / cell) % 2 < 1 ? color1 : color2);
  ctx.beginPath();
  if (top) {
    ctx.moveTo(x, 10);
    ctx.lineTo(x + w, 10);
    ctx.lineTo(x + w / 2, 10 + h);
  } else {
    ctx.moveTo(x, boardH - 10);
    ctx.lineTo(x + w, boardH - 10);
    ctx.lineTo(x + w / 2, boardH - 10 - h);
  }
  ctx.closePath(); ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, boardW, boardH);
  // wood-like border + center bar
  ctx.fillStyle = '#1a0a05';
  ctx.fillRect(0, 0, boardW, boardH);
  ctx.fillStyle = '#0a0a1e';
  // play area
  ctx.fillRect(20, 5, boardW - 40, boardH - 10);
  // bar
  const barX = 30 + 6 * cell;
  ctx.fillStyle = '#1a0a05';
  ctx.fillRect(barX, 5, cell, boardH - 10);
  // triangles
  for (let i = 0; i < 24; i++) {
    const p = pointXY(i);
    drawTriangle(p.x, p.top, '#ff006e', '#8338ec');
  }
  // checkers
  for (let i = 0; i < 24; i++) {
    const count = Math.abs(points[i]);
    if (count === 0) continue;
    const p = pointXY(i);
    const color = points[i] > 0 ? '#06ffa5' : '#ffd60a';
    const isOwn = (points[i] > 0 && turn === 1) || (points[i] < 0 && turn === -1);
    const isSel = selected === i;
    for (let j = 0; j < Math.min(count, 5); j++) {
      const cx = p.x + cell / 2;
      const cy = p.top
        ? 10 + 12 + j * 22
        : boardH - 10 - 12 - j * 22;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = isSel && j === count - 1 ? '#00f5ff' : color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (count > 5) {
      const cx = p.x + cell / 2;
      const cy = p.top ? 10 + 12 + 4 * 22 : boardH - 10 - 12 - 4 * 22;
      ctx.fillStyle = '#1a0a05';
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+' + (count - 5), cx, cy);
    }
  }
  // bar checkers
  if (bar.p > 0) {
    ctx.fillStyle = '#06ffa5';
    for (let i = 0; i < bar.p; i++) {
      ctx.beginPath(); ctx.arc(barX + cell / 2, boardH / 2 + 20 + i * 22, 10, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (bar.a > 0) {
    ctx.fillStyle = '#ffd60a';
    for (let i = 0; i < bar.a; i++) {
      ctx.beginPath(); ctx.arc(barX + cell / 2, boardH / 2 - 20 - i * 22, 10, 0, Math.PI * 2); ctx.fill();
    }
  }
  // off tray (right)
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(boardW - 18, 5, 12, boardH - 10);
  ctx.fillStyle = '#06ffa5';
  for (let i = 0; i < off.p; i++) ctx.fillRect(boardW - 16, boardH - 18 - i * 3, 8, 2);
  ctx.fillStyle = '#ffd60a';
  for (let i = 0; i < off.a; i++) ctx.fillRect(boardW - 16, 8 + i * 3, 8, 2);
  // dice
  if (dice.length > 0) {
    const dy = boardH / 2 - 14;
    for (let i = 0; i < dice.length; i++) {
      GAI.dice.drawDie(ctx, boardW / 2 - 32 + i * 28, dy, 24, dice[i], { glow: '#ffd60a' });
    }
  }
  // legal-move dots
  if (selected !== null && phase === 'move') {
    const moves = legalMovesFrom(selected, points, bar, off, diceLeft, turn);
    for (const m of moves) {
      if (m.toBar) continue;
      if (m.toOff) {
        ctx.fillStyle = 'rgba(6,255,165,0.7)';
        ctx.fillRect(boardW - 18, boardH - 18 - (off.p) * 3 - 6, 12, 4);
        continue;
      }
      const p = pointXY(m.to);
      ctx.fillStyle = 'rgba(6,255,165,0.7)';
      ctx.beginPath();
      ctx.arc(p.x + cell / 2, p.top ? 10 + 12 : boardH - 10 - 12, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function rollDice() {
  if (phase !== 'roll') return;
  GAI.audio.ensure();
  const finals = GAI.dice.roll(2, 6);
  dice = finals;
  if (finals[0] === finals[1]) diceLeft = [finals[0], finals[0], finals[0], finals[0]];
  else diceLeft = [finals[0], finals[1]];
  GAI.audio.tone(440, 0.1, 'sawtooth', 0.12);
  setTimeout(() => GAI.audio.tone(330, 0.08, 'sine', 0.12), 100);
  phase = 'move';
  status.textContent = (turn === 1 ? 'YOUR' : 'AI') + ' MOVE — DICE ' + finals.join(' · ');
  if (finals[0] === finals[1]) status.textContent += ' (DOUBLES ×4)';
  if (!hasAnyLegalMove(turn)) {
    status.textContent += ' · NO MOVES';
    setTimeout(() => endTurn(), 800);
  } else if (turn === -1) {
    setTimeout(aiMove, 600);
  }
  draw();
}

function legalMovesFrom(from, pts, b, o, left, side) {
  const out = [];
  // bar entry first
  if (side === 1 && b.p > 0 && from !== 'bar') return [];
  if (side === -1 && b.a > 0 && from !== 'bar') return [];
  for (const d of new Set(left)) {
    if (from === 'bar') {
      if (side === 1) {
        const to = 24 - d;
        if (to >= 0 && to < 24 && (pts[to] >= 0 || pts[to] === -1)) out.push({ from: 'bar', to, die: d });
      } else {
        const to = d - 1;
        if (to >= 0 && to < 24 && (pts[to] <= 0 || pts[to] === 1)) out.push({ from: 'bar', to, die: d });
      }
    } else {
      const to = side === 1 ? from - d : from + d;
      // bearing off
      if (side === 1 && to < 0) {
        if (allInHome(pts, side) && from === highestPoint(pts, side)) out.push({ from, toOff: true, die: d });
        else if (allInHome(pts, side) && from < d - 1) {
          // can bear off with extra pip only from highest
        } else if (allInHome(pts, side) && to === -1) out.push({ from, toOff: true, die: d });
      } else if (side === -1 && to > 23) {
        if (allInHome(pts, side) && from === highestPoint(pts, side)) out.push({ from, toOff: true, die: d });
        else if (allInHome(pts, side) && to === 24) out.push({ from, toOff: true, die: d });
      } else if (to >= 0 && to < 24) {
        if (side === 1) {
          if (pts[to] >= 0 || pts[to] === -1) out.push({ from, to, die: d });
        } else {
          if (pts[to] <= 0 || pts[to] === 1) out.push({ from, to, die: d });
        }
      }
    }
  }
  return out;
}

function allInHome(pts, side) {
  if (side === 1) {
    for (let i = 6; i < 24; i++) if (pts[i] > 0) return false;
    if (bar.p > 0) return false;
  } else {
    for (let i = 0; i < 18; i++) if (pts[i] < 0) return false;
    if (bar.a > 0) return false;
  }
  return true;
}
function highestPoint(pts, side) {
  if (side === 1) { for (let i = 5; i >= 0; i--) if (pts[i] > 0) return i; }
  else { for (let i = 18; i <= 23; i++) if (pts[i] < 0) return i; }
  return -1;
}

function hasAnyLegalMove(side) {
  if (side === 1 && bar.p > 0) return legalMovesFrom('bar', points, bar, off, diceLeft, side).length > 0;
  if (side === -1 && bar.a > 0) return legalMovesFrom('bar', points, bar, off, diceLeft, side).length > 0;
  for (let i = 0; i < 24; i++) {
    if ((side === 1 && points[i] > 0) || (side === -1 && points[i] < 0)) {
      if (legalMovesFrom(i, points, bar, off, diceLeft, side).length > 0) return true;
    }
  }
  return false;
}

function applyMove(m, side) {
  history.push({ points: points.slice(), bar: { ...bar }, off: { ...off }, diceLeft: diceLeft.slice() });
  if (m.from === 'bar') { if (side === 1) bar.p--; else bar.a--; }
  else { points[m.from] -= side; }
  if (m.toOff) {
    if (side === 1) off.p++; else off.a++;
  } else {
    // hit
    if (side === 1 && points[m.to] === -1) { points[m.to] = 0; bar.a++; }
    if (side === -1 && points[m.to] === 1) { points[m.to] = 0; bar.p++; }
    points[m.to] += side;
  }
  const di = diceLeft.indexOf(m.die);
  if (di >= 0) diceLeft.splice(di, 1);
  if (m.toOff) GAI.audio.tone(880, 0.08, 'triangle', 0.16);
  else GAI.audio.tone(440 + (side === 1 ? 60 : 0), 0.04, 'square', 0.10);
}

function endTurn() {
  if (off.p === 15) { winGame(true); return; }
  if (off.a === 15) { winGame(false); return; }
  turn = -turn;
  dice = []; diceLeft = [];
  selected = null;
  history = [];
  phase = 'roll';
  status.textContent = (turn === 1 ? 'YOUR' : 'AI') + ' TURN — ROLL';
  if (turn === -1) setTimeout(() => rollDice(), 500);
  draw();
}

function winGame(playerWon) {
  phase = 'over';
  if (playerWon) {
    pWins++; GAI.storage.set('gai_backgammon_pw', pWins);
    document.getElementById('pw').textContent = pWins;
    status.textContent = '✦ YOU WIN — TAP NEW';
    status.className = 'status win';
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
    GAI.recordWin('backgammon');
    GAI.fx.confetti();
    if (pWins > bestEverWins) {
      bestEverWins = pWins; GAI.storage.set('gai_best_backgammon', bestEverWins);
      document.getElementById('best').textContent = bestEverWins;
    }
  } else {
    aWins++; GAI.storage.set('gai_backgammon_aw', aWins);
    document.getElementById('aw').textContent = aWins;
    status.textContent = 'AI WINS — TAP NEW';
    status.className = 'status lose';
    GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.16);
  }
  GAI.bestScore('backgammon', pWins);
}

function aiMove() {
  if (phase !== 'move' || turn !== -1) return;
  // play all available dice — simple heuristic
  while (diceLeft.length > 0) {
    const moves = [];
    if (bar.a > 0) {
      moves.push(...legalMovesFrom('bar', points, bar, off, diceLeft, -1));
    } else {
      for (let i = 0; i < 24; i++) {
        if (points[i] < 0) moves.push(...legalMovesFrom(i, points, bar, off, diceLeft, -1));
      }
    }
    if (moves.length === 0) break;
    // Heuristic: prefer hits, then bear-off, then advance
    moves.sort((a, b) => {
      const aHit = a.to != null && points[a.to] === 1 ? 100 : 0;
      const bHit = b.to != null && points[b.to] === 1 ? 100 : 0;
      const aOff = a.toOff ? 50 : 0;
      const bOff = b.toOff ? 50 : 0;
      return (bHit + bOff) - (aHit + aOff);
    });
    applyMove(moves[0], -1);
    draw();
  }
  setTimeout(endTurn, 600);
}

function pickPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left, y = clientY - rect.top;
  // bar?
  const barX = 30 + 6 * cell;
  if (x >= barX && x <= barX + cell) return 'bar';
  // off tray
  if (x >= boardW - 18) return 'off';
  // points
  for (let i = 0; i < 24; i++) {
    const p = pointXY(i);
    if (x >= p.x && x <= p.x + cell) {
      const top = y < boardH / 2;
      if (top === p.top) return i;
    }
  }
  return null;
}

function onTap(clientX, clientY) {
  if (turn !== 1 || phase !== 'move') return;
  const sel = pickPoint(clientX, clientY);
  if (sel == null) return;
  GAI.audio.ensure();
  if (selected !== null) {
    const moves = legalMovesFrom(selected, points, bar, off, diceLeft, 1);
    let target;
    if (sel === 'off') target = moves.find(m => m.toOff);
    else target = moves.find(m => m.to === sel);
    if (target) {
      applyMove(target, 1);
      selected = null;
      if (diceLeft.length === 0 || !hasAnyLegalMove(1)) {
        draw();
        setTimeout(endTurn, 300);
        return;
      }
      draw();
      return;
    }
    selected = null;
  }
  if (sel === 'bar' && bar.p > 0) {
    selected = 'bar';
    draw();
    return;
  }
  if (typeof sel === 'number' && points[sel] > 0) {
    if (bar.p > 0) { GAI.audio.tone(180, 0.05, 'sawtooth', 0.08); return; }
    selected = sel;
    GAI.audio.tone(660, 0.03, 'square', 0.08);
    draw();
  }
}

canvas.addEventListener('click', (e) => onTap(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  onTap(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

document.getElementById('rollBtn').addEventListener('click', rollDice);
document.getElementById('undoBtn').addEventListener('click', () => {
  if (history.length === 0) return;
  const s = history.pop();
  points = s.points; bar = s.bar; off = s.off; diceLeft = s.diceLeft;
  selected = null; draw();
});
document.getElementById('newBtn').addEventListener('click', newGame);

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 150); });
GAI.stats.sessionStart('backgammon');
window.addEventListener('pagehide', () => GAI.stats.sessionEnd('backgammon'));

fit(); newGame();
})();
