(() => {
'use strict';
const GAI = window.GAI;
const COLS = 9;
const ROWS_VISIBLE = 12;
const BUBBLE_COLORS = ['#ff006e','#ffd60a','#06ffa5','#00f5ff','#8338ec','#ff9500'];
const RADIUS_RATIO = 0.5;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overScreen = document.getElementById('over');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const finalEl = document.getElementById('final');
const best2El = document.getElementById('best2');

let W = 360, H = 640;
let R = 20;        // bubble radius
let bubbleSize = 40;
let grid = [];     // 2d [row][col] — color index or -1
let shotsUntilRow = 8;
let shotsFired = 0;
let score = 0;
let aim = -Math.PI / 2;
let shooter = null;        // { color }
let next = null;
let projectile = null;
let busy = false;
let over = false;
let best = +(GAI.storage.get('gai_best_bubbles') || 0);
bestEl.textContent = best;

function init() {
  grid = [];
  for (let r = 0; r < 5; r++) grid.push(generateRow());
  // fill rest with null
  for (let r = 5; r < ROWS_VISIBLE; r++) grid.push(new Array(COLS).fill(-1));
  shotsFired = 0;
  shotsUntilRow = 8;
  score = 0;
  scoreEl.textContent = '0';
  over = false; busy = false; projectile = null;
  overScreen.classList.add('hidden');
  shooter = { color: pickColor() };
  next = { color: pickColor() };
  draw();
}

function generateRow() {
  const row = [];
  for (let c = 0; c < COLS; c++) row.push((Math.random() * 5) | 0);
  return row;
}
function pickColor() {
  // pick a color that exists in grid; if grid has very few colors restrict
  const present = new Set();
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c] >= 0) present.add(grid[r][c]);
  }
  if (present.size === 0) return (Math.random() * 5) | 0;
  const opts = Array.from(present);
  return opts[(Math.random() * opts.length) | 0];
}

function fit() {
  W = Math.min(window.innerWidth - 32, 420);
  H = Math.min(window.innerHeight - 140, 720);
  bubbleSize = Math.floor(W / COLS);
  R = bubbleSize * RADIUS_RATIO;
  W = bubbleSize * COLS;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cellXY(r, c) {
  const offset = (r % 2 === 1) ? bubbleSize / 2 : 0;
  return { x: c * bubbleSize + offset + R, y: r * bubbleSize * 0.866 + R + 8 };
}
function nearestCell(x, y) {
  let best = null;
  for (let r = 0; r < grid.length + 1; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = cellXY(r, c);
      const d = Math.hypot(p.x - x, p.y - y);
      if (best == null || d < best.d) best = { r, c, d, x: p.x, y: p.y };
    }
  }
  return best;
}

function drawBubble(x, y, colorIdx, dimmed) {
  const c = BUBBLE_COLORS[colorIdx];
  const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, lighten(c, 0.5));
  g.addColorStop(1, c);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (dimmed) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.fill();
  }
}
function lighten(hex, t) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * t);
  const ng = Math.round(g + (255 - g) * t);
  const nb = Math.round(b + (255 - b) * t);
  return `rgb(${nr},${ng},${nb})`;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // ceiling line
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, 8); ctx.lineTo(W, 8); ctx.stroke();
  ctx.setLineDash([]);
  // grid
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = grid[r][c]; if (v < 0) continue;
      const p = cellXY(r, c);
      drawBubble(p.x, p.y, v);
    }
  }
  // danger line
  const dangerY = H - bubbleSize * 1.5;
  ctx.strokeStyle = 'rgba(239,35,60,0.4)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, dangerY); ctx.lineTo(W, dangerY); ctx.stroke();
  ctx.setLineDash([]);
  // shooter
  const sx = W / 2, sy = H - 32;
  // aim guide
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);
  let gx = sx, gy = sy, gvx = Math.cos(aim), gvy = Math.sin(aim);
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  for (let i = 0; i < 280; i++) {
    gx += gvx * 4; gy += gvy * 4;
    if (gx < R || gx > W - R) gvx *= -1;
    if (gy < R + 8) break;
    ctx.lineTo(gx, gy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // shooter bubble
  if (shooter) drawBubble(sx, sy, shooter.color);
  if (next) drawBubble(sx + bubbleSize + 6, sy + 4, next.color, true);
  // projectile
  if (projectile) drawBubble(projectile.x, projectile.y, projectile.color);
}

function pop(r, c, color) {
  const matched = floodMatch(r, c, color);
  if (matched.length < 3) return 0;
  for (const [rr, cc] of matched) grid[rr][cc] = -1;
  // drop disconnected (any bubble not connected to top)
  const conn = connectedToTop();
  let dropped = 0;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c] >= 0 && !conn[r][c]) {
      grid[r][c] = -1;
      dropped++;
    }
  }
  const total = matched.length + dropped;
  score += matched.length * 10 + dropped * 20;
  scoreEl.textContent = score;
  // sound based on size
  if (total >= 10) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 70, 'square', 0.16);
    GAI.fx.chromaticFlash(280);
  } else if (total >= 6) {
    GAI.audio.arpeggio([523.25, 659.25, 783.99], 70, 'triangle', 0.16);
  } else {
    GAI.audio.tone(440 + matched.length * 40, 0.1, 'square', 0.14);
  }
  // particle burst
  for (const [rr, cc] of matched) {
    const p = cellXY(rr, cc);
    GAI.fx.particleBurst(ctx, p.x, p.y, BUBBLE_COLORS[color], 8, { life: 500 });
  }
  return total;
}

function neighbors(r, c) {
  const odd = r % 2 === 1;
  const offsets = odd
    ? [[-1, 0],[-1, 1],[0, -1],[0, 1],[1, 0],[1, 1]]
    : [[-1, -1],[-1, 0],[0, -1],[0, 1],[1, -1],[1, 0]];
  const out = [];
  for (const [dr, dc] of offsets) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < COLS) out.push([nr, nc]);
  }
  return out;
}
function floodMatch(r, c, color) {
  const stack = [[r, c]];
  const seen = new Set();
  const matched = [];
  while (stack.length) {
    const [rr, cc] = stack.pop();
    const key = rr + ',' + cc;
    if (seen.has(key)) continue;
    seen.add(key);
    if (grid[rr] == null || grid[rr][cc] !== color) continue;
    matched.push([rr, cc]);
    for (const n of neighbors(rr, cc)) stack.push(n);
  }
  return matched;
}
function connectedToTop() {
  const conn = grid.map(row => row.map(() => false));
  const stack = [];
  for (let c = 0; c < COLS; c++) if (grid[0][c] >= 0) stack.push([0, c]);
  while (stack.length) {
    const [r, c] = stack.pop();
    if (conn[r][c]) continue;
    if (grid[r][c] < 0) continue;
    conn[r][c] = true;
    for (const n of neighbors(r, c)) {
      if (grid[n[0]][n[1]] >= 0 && !conn[n[0]][n[1]]) stack.push(n);
    }
  }
  return conn;
}

function shoot() {
  if (busy || over) return;
  busy = true;
  const sx = W / 2, sy = H - 32;
  const speed = 700;
  projectile = { x: sx, y: sy, vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed, color: shooter.color };
  GAI.audio.tone(660, 0.04, 'square', 0.10);
  shooter = next;
  next = { color: pickColor() };
  const start = performance.now();
  let last = start;
  function step(now) {
    if (!projectile) return;
    const dt = Math.min((now - last) / 1000, 0.03); last = now;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    if (projectile.x < R) { projectile.x = R; projectile.vx *= -1; GAI.audio.tone(330, 0.03, 'sine', 0.08); }
    if (projectile.x > W - R) { projectile.x = W - R; projectile.vx *= -1; GAI.audio.tone(330, 0.03, 'sine', 0.08); }
    // collide with grid
    let hit = projectile.y < R + 8;
    if (!hit) {
      for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) {
        if (grid[r][c] < 0) continue;
        const p = cellXY(r, c);
        if (Math.hypot(p.x - projectile.x, p.y - projectile.y) < R * 1.8) { hit = true; break; }
      }
    }
    if (hit) {
      const cell = nearestCell(projectile.x, projectile.y);
      if (cell.r >= grid.length) { for (let i = grid.length; i <= cell.r; i++) grid.push(new Array(COLS).fill(-1)); }
      grid[cell.r][cell.c] = projectile.color;
      const popped = pop(cell.r, cell.c, projectile.color);
      projectile = null;
      shotsFired++;
      if (shotsFired >= shotsUntilRow) { shotsFired = 0; addRow(); }
      // check end
      if (checkLose()) { endGame(); return; }
      if (checkClear()) {
        // add fresh rows on clear
        for (let r = 0; r < 5; r++) grid[r] = generateRow();
        GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5], 60, 'triangle', 0.18);
      }
      draw();
      busy = false;
      return;
    }
    draw();
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function addRow() {
  // shift down
  grid.unshift(generateRow());
  if (grid.length > ROWS_VISIBLE) grid.pop();
  GAI.audio.tone(180, 0.08, 'sawtooth', 0.10);
}
function checkLose() {
  const dangerRow = Math.floor((H - bubbleSize * 1.5 - R - 8) / (bubbleSize * 0.866));
  for (let r = Math.max(0, dangerRow); r < grid.length; r++) {
    for (let c = 0; c < COLS; c++) if (grid[r][c] >= 0) return true;
  }
  return false;
}
function checkClear() {
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] >= 0) return false;
  return true;
}
function endGame() {
  over = true; busy = false;
  if (score > best) { best = score; GAI.storage.set('gai_best_bubbles', best); bestEl.textContent = best; }
  finalEl.textContent = score;
  best2El.textContent = best;
  overScreen.classList.remove('hidden');
  GAI.audio.arpeggio([440, 369.99, 311.13, 261.63], 110, 'sawtooth', 0.16);
  addOverExtras();
}

function addOverExtras() {
  for (const el of overScreen.querySelectorAll('.share-row, .gai-play-next')) el.remove();
  const row = document.createElement('div');
  row.className = 'share-row';
  const finalScore = score, finalBest = best;
  const sBtn = document.createElement('button');
  sBtn.className = 'arcade cyan'; sBtn.type = 'button'; sBtn.textContent = '🔗 SHARE';
  sBtn.addEventListener('click', (e) => { e.stopPropagation(); GAI.ui.shareCard({ title: 'BUBBLES', score: finalScore, best: finalBest, color: '#d100d1', key: 'bubbles', label: 'SCORE' }).share(); });
  const cBtn = document.createElement('button');
  cBtn.className = 'arcade'; cBtn.type = 'button'; cBtn.textContent = '⎘ COPY';
  cBtn.addEventListener('click', (e) => { e.stopPropagation(); GAI.ui.shareCard({ title: 'BUBBLES', score: finalScore, best: finalBest, color: '#d100d1', key: 'bubbles', label: 'SCORE' }).copy(); });
  row.appendChild(sBtn); row.appendChild(cBtn);
  overScreen.appendChild(row);
  GAI.ui.playNext('bubbles', overScreen);
}

// input
function setAim(clientX, clientY) {
  if (over || busy) return;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const sx = W / 2, sy = H - 32;
  let a = Math.atan2(y - sy, x - sx);
  // clamp aim above shooter
  if (a > -0.1) a = -0.1;
  if (a < -Math.PI + 0.1) a = -Math.PI + 0.1;
  aim = a;
  draw();
}

canvas.addEventListener('mousemove', (e) => setAim(e.clientX, e.clientY));
canvas.addEventListener('click', (e) => {
  if (over) { overScreen.classList.add('hidden'); init(); return; }
  GAI.audio.ensure();
  setAim(e.clientX, e.clientY);
  shoot();
});
let touchAim = false;
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return;
  e.preventDefault();
  if (over) { overScreen.classList.add('hidden'); init(); return; }
  GAI.audio.ensure();
  touchAim = true;
  setAim(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  if (!e.touches[0] || !touchAim) return;
  e.preventDefault();
  setAim(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
canvas.addEventListener('touchend', () => {
  if (!touchAim) return;
  touchAim = false;
  if (!over) shoot();
}, { passive: false });

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 150); });

fit(); init();
})();
