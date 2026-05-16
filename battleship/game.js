(() => {
'use strict';
const GAI = window.GAI;
const SZ = 10;
const SHIPS = [5, 4, 3, 3, 2];
const SHIP_NAMES = ['CARRIER','BATTLESHIP','CRUISER','SUBMARINE','DESTROYER'];

let cell = 32;
const enemyC = document.getElementById('enemy');
const ownC = document.getElementById('own');
const ectx = enemyC.getContext('2d');
const octx = ownC.getContext('2d');
const status = document.getElementById('status');
const rotateBtn = document.getElementById('rotate');
const autoBtn = document.getElementById('auto');
const readyBtn = document.getElementById('ready');
const shotsEl = document.getElementById('shots');
const hitsEl = document.getElementById('hits');
const bestEl = document.getElementById('best');

let phase = 'place'; // place | play | over
let playerShips = [];
let aiShips = [];
let playerShots = makeGrid(); // miss = 1, hit = 2
let aiShots = makeGrid();
let currentShipIdx = 0;
let horiz = true;
let hover = null;

let shots = 0, hits = 0;
const best = GAI.storage.get('gai_best_battleship');
if (best) bestEl.textContent = best;
let aiHunt = null;

function makeGrid() {
  const g = [];
  for (let r = 0; r < SZ; r++) g.push(new Array(SZ).fill(0));
  return g;
}

function fit() {
  const maxW = window.innerWidth < 720 ? Math.min(window.innerWidth - 32, 380) : 320;
  cell = Math.floor(maxW / SZ);
  const w = cell * SZ;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  for (const cv of [enemyC, ownC]) {
    cv.width = w * dpr; cv.height = w * dpr;
    cv.style.width = w + 'px'; cv.style.height = w + 'px';
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function drawGrid(ctx, hideShips) {
  const w = cell * SZ;
  ctx.clearRect(0, 0, w, w);
  // cells
  for (let r = 0; r < SZ; r++) for (let c = 0; c < SZ; c++) {
    ctx.fillStyle = (r + c) % 2 === 0 ? '#0a1a30' : '#091428';
    ctx.fillRect(c * cell, r * cell, cell, cell);
  }
  // grid lines
  ctx.strokeStyle = 'rgba(0,245,255,0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= SZ; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
  }
  if (ctx === octx) {
    // player ships visible
    for (const s of playerShips) drawShip(ctx, s, !hideShips);
    // ai shots
    for (let r = 0; r < SZ; r++) for (let c = 0; c < SZ; c++) {
      const v = aiShots[r][c];
      if (v === 1) drawMiss(ctx, r, c);
      else if (v === 2) drawHit(ctx, r, c);
    }
    // placement hover
    if (phase === 'place' && hover) drawHoverShip(ctx);
  } else {
    // enemy: show player shots
    for (let r = 0; r < SZ; r++) for (let c = 0; c < SZ; c++) {
      const v = playerShots[r][c];
      if (v === 1) drawMiss(ctx, r, c);
      else if (v === 2) drawHit(ctx, r, c);
    }
    // reveal sunk ships
    for (const s of aiShips) if (isSunk(s, playerShots)) drawShip(ctx, s, true);
  }
}

function drawShip(ctx, s, visible) {
  ctx.fillStyle = visible ? 'rgba(131,56,236,0.85)' : 'rgba(131,56,236,0.3)';
  for (const [r, c] of shipCells(s)) {
    ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
  }
  if (visible) {
    ctx.strokeStyle = '#ff006e';
    ctx.lineWidth = 1.5;
    const cells = shipCells(s);
    const r0 = cells[0][0], c0 = cells[0][1];
    if (s.horiz) ctx.strokeRect(c0 * cell + 2, r0 * cell + 2, s.len * cell - 4, cell - 4);
    else ctx.strokeRect(c0 * cell + 2, r0 * cell + 2, cell - 4, s.len * cell - 4);
  }
}
function drawHoverShip(ctx) {
  const len = SHIPS[currentShipIdx];
  const valid = canPlace(playerShips, hover.r, hover.c, len, horiz);
  ctx.fillStyle = valid ? 'rgba(6,255,165,0.5)' : 'rgba(239,35,60,0.5)';
  for (let i = 0; i < len; i++) {
    const rr = horiz ? hover.r : hover.r + i;
    const cc = horiz ? hover.c + i : hover.c;
    if (rr >= SZ || cc >= SZ) continue;
    ctx.fillRect(cc * cell + 2, rr * cell + 2, cell - 4, cell - 4);
  }
}
function drawMiss(ctx, r, c) {
  ctx.beginPath();
  ctx.arc(c * cell + cell / 2, r * cell + cell / 2, cell * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
}
function drawHit(ctx, r, c) {
  ctx.fillStyle = '#ef233c';
  ctx.fillRect(c * cell + 4, r * cell + 4, cell - 8, cell - 8);
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c * cell + 6, r * cell + 6); ctx.lineTo((c + 1) * cell - 6, (r + 1) * cell - 6);
  ctx.moveTo((c + 1) * cell - 6, r * cell + 6); ctx.lineTo(c * cell + 6, (r + 1) * cell - 6);
  ctx.stroke();
}

function shipCells(s) {
  const out = [];
  for (let i = 0; i < s.len; i++) {
    const r = s.horiz ? s.r : s.r + i;
    const c = s.horiz ? s.c + i : s.c;
    out.push([r, c]);
  }
  return out;
}
function canPlace(ships, r, c, len, h) {
  if (h && c + len > SZ) return false;
  if (!h && r + len > SZ) return false;
  for (let i = 0; i < len; i++) {
    const rr = h ? r : r + i;
    const cc = h ? c + i : c;
    if (rr < 0 || rr >= SZ || cc < 0 || cc >= SZ) return false;
    for (const s of ships) {
      for (const [sr, sc] of shipCells(s)) {
        if (Math.abs(sr - rr) <= 0 && Math.abs(sc - cc) <= 0) return false;
      }
    }
  }
  return true;
}
function autoPlace(ships) {
  ships.length = 0;
  for (const len of SHIPS) {
    let placed = false, attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const h = Math.random() < 0.5;
      const r = Math.floor(Math.random() * SZ);
      const c = Math.floor(Math.random() * SZ);
      if (canPlace(ships, r, c, len, h)) {
        ships.push({ r, c, len, horiz: h });
        placed = true;
      }
    }
  }
}
function isSunk(s, shots) {
  return shipCells(s).every(([r, c]) => shots[r][c] === 2);
}
function allSunk(ships, shots) { return ships.every(s => isSunk(s, shots)); }
function shipAt(ships, r, c) {
  for (const s of ships) for (const [sr, sc] of shipCells(s)) if (sr === r && sc === c) return s;
  return null;
}

function ownHandle(r, c) {
  if (phase !== 'place') return;
  hover = { r, c };
  drawGrid(octx);
}
function ownPlace(r, c) {
  if (phase !== 'place') return;
  const len = SHIPS[currentShipIdx];
  if (!canPlace(playerShips, r, c, len, horiz)) { GAI.audio.tone(180, 0.05, 'sawtooth', 0.08); return; }
  GAI.audio.tone(440 + currentShipIdx * 60, 0.06, 'square', 0.12);
  playerShips.push({ r, c, len, horiz });
  currentShipIdx++;
  if (currentShipIdx >= SHIPS.length) {
    status.textContent = 'FLEET PLACED — TAP READY';
    readyBtn.classList.remove('hidden');
    rotateBtn.classList.add('hidden');
    autoBtn.classList.add('hidden');
  } else {
    status.textContent = 'PLACE ' + SHIP_NAMES[currentShipIdx] + ' (' + SHIPS[currentShipIdx] + ')';
  }
  drawGrid(octx);
}

function enemyClick(r, c) {
  if (phase !== 'play') return;
  if (playerShots[r][c] !== 0) { GAI.audio.tone(180, 0.05, 'sawtooth', 0.08); return; }
  shots++;
  shotsEl.textContent = shots;
  GAI.audio.ensure();
  const hit = shipAt(aiShips, r, c);
  if (hit) {
    playerShots[r][c] = 2;
    hits++;
    hitsEl.textContent = hits;
    GAI.audio.tone(440, 0.12, 'square', 0.18);
    GAI.fx.particleBurst(ectx, c * cell + cell / 2, r * cell + cell / 2, ['#ef233c','#ffd60a','#fff'], 14);
    if (isSunk(hit, playerShots)) {
      if (hit.len === 5) {
        GAI.audio.tone(80, 0.5, 'sawtooth', 0.18, 0.005, 0.4);
        GAI.fx.screenShake(document.body, 8, 360);
      } else {
        GAI.audio.arpeggio([440, 311.13, 220], 80, 'sawtooth', 0.16);
      }
    }
    if (allSunk(aiShips, playerShots)) {
      endGame(true);
      drawGrid(ectx);
      return;
    }
    drawGrid(ectx);
    return;
  }
  playerShots[r][c] = 1;
  GAI.audio.tone(220, 0.08, 'sine', 0.10);
  drawGrid(ectx);
  setTimeout(aiTurn, 380);
}

function aiTurn() {
  if (phase !== 'play') return;
  let target = null;
  if (aiHunt && aiHunt.queue.length) {
    target = aiHunt.queue.shift();
    while (target && aiShots[target.r][target.c] !== 0) target = aiHunt.queue.shift();
  }
  if (!target) {
    // random in checkerboard pattern preferred
    const empties = [];
    for (let r = 0; r < SZ; r++) for (let c = 0; c < SZ; c++) {
      if (aiShots[r][c] === 0 && (r + c) % 2 === 0) empties.push({ r, c });
    }
    const pool = empties.length ? empties : (() => {
      const all = [];
      for (let r = 0; r < SZ; r++) for (let c = 0; c < SZ; c++) if (aiShots[r][c] === 0) all.push({ r, c });
      return all;
    })();
    target = pool[Math.floor(Math.random() * pool.length)];
  }
  if (!target) return;
  const ship = shipAt(playerShips, target.r, target.c);
  if (ship) {
    aiShots[target.r][target.c] = 2;
    GAI.audio.tone(330, 0.12, 'square', 0.16);
    if (!aiHunt) aiHunt = { queue: [] };
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = target.r + dr, nc = target.c + dc;
      if (nr >= 0 && nr < SZ && nc >= 0 && nc < SZ && aiShots[nr][nc] === 0) {
        aiHunt.queue.push({ r: nr, c: nc });
      }
    }
    if (isSunk(ship, aiShots)) aiHunt = null;
    if (allSunk(playerShips, aiShots)) { drawGrid(octx); endGame(false); return; }
  } else {
    aiShots[target.r][target.c] = 1;
    GAI.audio.tone(180, 0.06, 'sine', 0.08);
  }
  drawGrid(octx);
}

function endGame(playerWon) {
  phase = 'over';
  if (playerWon) {
    status.textContent = '✦ FLEET DESTROYED IN ' + shots + ' SHOTS — TAP TO PLAY AGAIN';
    status.className = 'status win';
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 70, 'triangle', 0.18);
    GAI.fx.confetti();
    GAI.recordWin('battleship');
    // best = fewest shots to win
    const cur = +GAI.storage.get('gai_best_battleship') || Infinity;
    if (shots < cur) {
      GAI.storage.set('gai_best_battleship', String(shots));
      bestEl.textContent = shots;
    }
  } else {
    status.textContent = '✦ YOUR FLEET SUNK — TAP TO PLAY AGAIN';
    status.className = 'status lose';
    GAI.audio.arpeggio([440, 369.99, 311.13], 110, 'sawtooth', 0.16);
  }
}

function reset() {
  phase = 'place';
  playerShips = [];
  aiShips = [];
  playerShots = makeGrid();
  aiShots = makeGrid();
  currentShipIdx = 0;
  horiz = true;
  hover = null;
  shots = 0; hits = 0;
  shotsEl.textContent = 0; hitsEl.textContent = 0;
  status.textContent = 'PLACE ' + SHIP_NAMES[0] + ' (' + SHIPS[0] + ')';
  status.className = 'status';
  rotateBtn.classList.remove('hidden');
  autoBtn.classList.remove('hidden');
  readyBtn.classList.add('hidden');
  aiHunt = null;
  autoPlace(aiShips);
  drawGrid(octx); drawGrid(ectx);
}

function startPlay() {
  phase = 'play';
  hover = null;
  readyBtn.classList.add('hidden');
  status.textContent = 'TAP ENEMY WATERS TO FIRE';
  status.className = 'status';
  drawGrid(octx); drawGrid(ectx);
}

function pickCell(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor((clientX - rect.left) / cell);
  const r = Math.floor((clientY - rect.top) / cell);
  if (r < 0 || r >= SZ || c < 0 || c >= SZ) return null;
  return { r, c };
}

ownC.addEventListener('mousemove', (e) => {
  if (phase !== 'place') return;
  const p = pickCell(ownC, e.clientX, e.clientY); if (!p) return;
  ownHandle(p.r, p.c);
});
ownC.addEventListener('click', (e) => {
  if (phase === 'over') { reset(); return; }
  const p = pickCell(ownC, e.clientX, e.clientY); if (!p) return;
  ownPlace(p.r, p.c);
});
ownC.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  if (phase === 'over') { reset(); return; }
  const p = pickCell(ownC, e.touches[0].clientX, e.touches[0].clientY); if (!p) return;
  ownPlace(p.r, p.c);
}, { passive: false });
enemyC.addEventListener('click', (e) => {
  if (phase === 'over') { reset(); return; }
  const p = pickCell(enemyC, e.clientX, e.clientY); if (!p) return;
  enemyClick(p.r, p.c);
});
enemyC.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return; e.preventDefault();
  if (phase === 'over') { reset(); return; }
  const p = pickCell(enemyC, e.touches[0].clientX, e.touches[0].clientY); if (!p) return;
  enemyClick(p.r, p.c);
}, { passive: false });

rotateBtn.addEventListener('click', () => { horiz = !horiz; drawGrid(octx); GAI.audio.ensure(); GAI.audio.tone(620, 0.04, 'triangle', 0.10); });
autoBtn.addEventListener('click', () => {
  playerShips = [];
  autoPlace(playerShips);
  currentShipIdx = SHIPS.length;
  status.textContent = 'FLEET AUTO-PLACED — TAP READY';
  readyBtn.classList.remove('hidden');
  rotateBtn.classList.add('hidden');
  autoBtn.classList.add('hidden');
  GAI.audio.ensure();
  GAI.audio.arpeggio([330, 392, 494, 660], 60, 'triangle', 0.14);
  drawGrid(octx);
});
readyBtn.addEventListener('click', () => { GAI.audio.ensure(); startPlay(); });

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); drawGrid(octx); drawGrid(ectx); }, 150); });

fit(); reset();
})();
