/* shared/previews.js — home-page tile preview renderers.
 *
 * Home-only concern: registers GAI.previews[gameKey] = (ctx, w, h, state, dt).
 * arcade.js owns the shared rAF scheduler (coupled to the bg canvas +
 * IntersectionObserver + DOM) and looks these up by key. Renderers draw in a
 * logical 240x160 space; arcade.js handles DPR + the ~30fps cap. Kept out of
 * the 16 game.js files on purpose (loading those would pull full engines onto
 * the home page). Each preview is a small, recognizable, accent-colored loop;
 * colors come from GAI.GAME_ACCENTS (DESIGN §3). Cards render procedurally.
 */
(() => {
'use strict';
const GAI = window.GAI;
if (!GAI) return;
const PAL = GAI.PALETTE;
const ACCENTS = GAI.GAME_ACCENTS || {};
function acc(key) { return ACCENTS[key] || { p: '#ffffff', s: '#00f5ff' }; }

function clr(ctx, w, h) { ctx.fillStyle = '#0a0a1e'; ctx.fillRect(0, 0, w, h); }
function shadeColor(hex, m) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,(r*m)|0)},${Math.min(255,(g*m)|0)},${Math.min(255,(b*m)|0)})`;
}
function roundFill(ctx, x, y, w, h, r) { GAI.fx.roundRect(ctx, x, y, w, h, r); ctx.fill(); }
function rnd(n) { return (Math.random() * n) | 0; }

// ---- STACK — iso blocks stacking, top drops + flashes (palette cycle) ----
function pvStack(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cyc = 3, phase = (s.t % cyc) / cyc;
  drawIso(ctx, w/2, h*0.7, 70, 18, PAL[0]);
  drawIso(ctx, w/2, h*0.55, 70, 18, PAL[1]);
  const drop = phase < 0.7 ? Math.max(-30, -30 + (phase/0.7)*25) : -5;
  const flash = phase >= 0.7 && phase < 0.85;
  drawIso(ctx, w/2, h*0.40 - drop, 70, 18, flash ? '#fff' : PAL[2]);
  if (flash) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(0,0,w,h); }
}
function drawIso(ctx, cx, cy, hw, hh, color) {
  const c30 = 0.866;
  const tR = { x: cx + hw*c30, y: cy + hw*0.25 };
  const tL = { x: cx - hw*c30, y: cy + hw*0.25 };
  const tT = { x: cx, y: cy };
  const tB = { x: cx, y: cy + hw*0.5 };
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(tT.x,tT.y); ctx.lineTo(tR.x,tR.y); ctx.lineTo(tB.x,tB.y); ctx.lineTo(tL.x,tL.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shadeColor(color, 0.7);
  ctx.beginPath(); ctx.moveTo(tR.x,tR.y); ctx.lineTo(tB.x,tB.y); ctx.lineTo(tB.x,tB.y+hh); ctx.lineTo(tR.x,tR.y+hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shadeColor(color, 0.55);
  ctx.beginPath(); ctx.moveTo(tL.x,tL.y); ctx.lineTo(tB.x,tB.y); ctx.lineTo(tB.x,tB.y+hh); ctx.lineTo(tL.x,tL.y+hh); ctx.closePath(); ctx.fill();
}

// ---- SNAKE — real grid crawl: greedy pathing, eat, grow, wrap (teal/red) ----
function pvSnake(ctx, w, h, s, dt) {
  const A = acc('snake');
  const COLS = 12, ROWS = 8;
  const cell = Math.min(w / COLS, h / ROWS);
  const ox = (w - cell * COLS) / 2, oy = (h - cell * ROWS) / 2;
  if (!s.snake) {
    s.snake = [{x:5,y:4},{x:4,y:4},{x:3,y:4}];
    s.dir = {x:1,y:0}; s.food = {x:9,y:2}; s.acc = 0; s.max = 9;
  }
  s.acc = (s.acc || 0) + dt;
  const STEP = 0.16;
  let guard = 0;
  while (s.acc >= STEP && guard++ < 4) {
    s.acc -= STEP;
    const opts = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    let best = s.dir, bd = Infinity;
    for (const o of opts) {
      if (o.x === -s.dir.x && o.y === -s.dir.y) continue;
      const nx = (s.snake[0].x + o.x + COLS) % COLS;
      const ny = (s.snake[0].y + o.y + ROWS) % ROWS;
      if (s.snake.some(c => c.x === nx && c.y === ny)) continue;
      const d = Math.abs(nx - s.food.x) + Math.abs(ny - s.food.y) + (o === s.dir ? -0.2 : 0);
      if (d < bd) { bd = d; best = o; }
    }
    s.dir = best;
    const head = { x: (s.snake[0].x + s.dir.x + COLS) % COLS, y: (s.snake[0].y + s.dir.y + ROWS) % ROWS };
    s.snake.unshift(head);
    if (head.x === s.food.x && head.y === s.food.y) {
      let f, tries = 0;
      do { f = { x: rnd(COLS), y: rnd(ROWS) }; } while (tries++ < 40 && s.snake.some(c => c.x === f.x && c.y === f.y));
      s.food = f;
      if (s.snake.length > s.max) s.snake.pop();
    } else { s.snake.pop(); }
  }
  clr(ctx, w, h);
  const fx = ox + s.food.x * cell, fy = oy + s.food.y * cell;
  ctx.fillStyle = A.s;
  roundFill(ctx, fx + cell*0.22, fy + cell*0.22, cell*0.56, cell*0.56, cell*0.22);
  ctx.fillStyle = '#06ffa5'; ctx.fillRect(fx + cell*0.5 - 1, fy + cell*0.14, 2, 4); // leaf
  for (let i = s.snake.length - 1; i >= 0; i--) {
    const c = s.snake[i], x = ox + c.x * cell, y = oy + c.y * cell;
    ctx.fillStyle = i === 0 ? A.p : shadeColor(A.p, 0.55 + 0.35 * (1 - i / s.snake.length));
    roundFill(ctx, x + 1.5, y + 1.5, cell - 3, cell - 3, 3);
    if (i === 0) { ctx.fillStyle = '#0a0a1e'; ctx.fillRect(x + cell*0.55, y + cell*0.3, 2, 2); }
  }
}

// ---- BLOCKS — falling tetromino locks onto a well, line-flash clears (cyan/white) ----
function pvBlocks(ctx, w, h, s, dt) {
  const COLS = 6, ROWS = 10;
  const cell = Math.min(w / COLS, h / ROWS) * 0.92;
  const gw = cell * COLS, gh = cell * ROWS, ox = (w - gw) / 2, oy = (h - gh) / 2;
  const SHAPES = [[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]]];
  function spawn() {
    const sh = SHAPES[rnd(SHAPES.length)];
    s.piece = { cells: sh, x: 2, y: -1, col: 1 + rnd(PAL.length) };
  }
  function reset() {
    s.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    for (let r = ROWS - 2; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (Math.random() < 0.5) s.grid[r][c] = 1 + ((c + r) % PAL.length);
    s.clearRows = null; spawn();
  }
  if (!s.grid) { reset(); s.acc = 0; s.flash = 0; }
  s.acc = (s.acc || 0) + dt;
  const STEP = 0.16;
  if (s.flash > 0) {
    s.flash -= dt;
    if (s.flash <= 0 && s.clearRows) {
      for (const r of s.clearRows.sort((a,b)=>a-b)) { s.grid.splice(r,1); s.grid.unshift(Array(COLS).fill(0)); }
      s.clearRows = null; spawn();
    }
  } else {
    let guard = 0;
    while (s.acc >= STEP && guard++ < 4) {
      s.acc -= STEP;
      const p = s.piece;
      const collide = (dy) => p.cells.some(([cx,cy]) => { const nx = p.x+cx, ny = p.y+cy+dy; return ny >= ROWS || (ny >= 0 && (nx < 0 || nx >= COLS || s.grid[ny][nx])); });
      if (collide(1)) {
        p.cells.forEach(([cx,cy]) => { const ny = p.y+cy; if (ny >= 0 && ny < ROWS) s.grid[ny][p.x+cx] = p.col; });
        const cleared = [];
        for (let r = 0; r < ROWS; r++) if (s.grid[r].every(v => v)) cleared.push(r);
        if (cleared.length) { s.flash = 0.28; s.clearRows = cleared; break; }
        else if (s.grid[1].some(v => v)) { reset(); }
        else spawn();
      } else p.y++;
    }
  }
  clr(ctx, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.strokeRect(ox, oy, gw, gh);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!s.grid[r][c]) continue;
    const flashing = s.clearRows && s.clearRows.includes(r) && s.flash > 0;
    ctx.fillStyle = flashing ? '#fff' : PAL[(s.grid[r][c]-1) % PAL.length];
    roundFill(ctx, ox + c*cell + 1, oy + r*cell + 1, cell - 2, cell - 2, 2);
  }
  if (s.piece && s.flash <= 0) {
    ctx.fillStyle = PAL[(s.piece.col-1) % PAL.length];
    s.piece.cells.forEach(([cx,cy]) => { const ny = s.piece.y+cy; if (ny >= 0) roundFill(ctx, ox + (s.piece.x+cx)*cell + 1, oy + ny*cell + 1, cell - 2, cell - 2, 2); });
  }
}

// ---- 2048 — two tiles slide together and merge, gold pop (orange→gold) ----
function pv2048(ctx, w, h, s, dt) {
  const A = acc('p2048');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 38, x0 = (w - cell*2 - 8)/2, y0 = (h - cell)/2;
  const phase = (s.t % 2.5) / 2.5;
  if (phase < 0.45) {
    const t = phase / 0.45;
    drawTile(ctx, x0 + (1-t)*8, y0, cell, '2', A.p);
    drawTile(ctx, x0 + cell + 8 + t*8, y0, cell, '2', A.p);
  } else if (phase < 0.55) {
    const t = (phase - 0.45) / 0.10;
    const sc = 1 + 0.18 * Math.sin(t * Math.PI);
    ctx.save(); ctx.translate(x0 + cell/2 + 4, y0 + cell/2); ctx.scale(sc, sc);
    drawTile(ctx, -cell/2, -cell/2, cell, '4', A.s); ctx.restore();
  } else {
    drawTile(ctx, x0 + 4, y0, cell, '4', A.s);
  }
}
function drawTile(ctx, x, y, sz, txt, color) {
  ctx.fillStyle = color; GAI.fx.roundRect(ctx, x, y, sz, sz, 4); ctx.fill();
  ctx.fillStyle = '#0a0a1e'; ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x + sz/2, y + sz/2);
}

// ---- BREAKOUT — ball chips a brick wall, paddle tracks (warm rows / white) ----
function pvBreakout(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (!s.ball) s.ball = { x: w/2, y: h*0.55, vx: 64, vy: -52 };
  if (!s.bricks) s.bricks = [1,1,1,1,1,1,1,1];
  const bw = w / 8;
  const warm = [PAL[9], PAL[8], PAL[7], PAL[6], PAL[5], PAL[2], PAL[1], PAL[0]];
  for (let i = 0; i < 8; i++) if (s.bricks[i]) { ctx.fillStyle = warm[i]; roundFill(ctx, i*bw + 1.5, 8, bw - 3, 9, 2); }
  const px = Math.max(20, Math.min(w - 20, s.ball.x));
  ctx.fillStyle = '#fff'; roundFill(ctx, px - 20, h - 14, 40, 4, 2);
  for (let i = 5; i > 0; i--) { ctx.fillStyle = `rgba(255,255,255,${(0.10*i/5).toFixed(3)})`; ctx.fillRect(s.ball.x - i*1.5 - 2, s.ball.y - i*1.2 - 2, 4, 4); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, 3, 0, Math.PI*2); ctx.fill();
  s.ball.x += s.ball.vx * dt; s.ball.y += s.ball.vy * dt;
  if (s.ball.x < 4 || s.ball.x > w - 4) s.ball.vx *= -1;
  if (s.ball.y > h - 18) s.ball.vy = -Math.abs(s.ball.vy);
  if (s.ball.y < 22) { s.ball.vy = Math.abs(s.ball.vy); const idx = Math.floor(s.ball.x/bw); if (s.bricks[idx]) s.bricks[idx] = 0; }
  if (s.bricks.every(b => !b)) s.bricks = [1,1,1,1,1,1,1,1];
}

// ---- PONG — rally with paddle AI, cyan court (white / cyan) ----
function pvPong(ctx, w, h, s, dt) {
  const A = acc('pong');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (!s.ball) s.ball = { x: w/2, y: h/2, vx: 70, vy: 40 };
  if (s.p1 == null) { s.p1 = h/2; s.p2 = h/2; }
  ctx.strokeStyle = 'rgba(0,245,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([5,6]);
  ctx.beginPath(); ctx.moveTo(w/2, 6); ctx.lineTo(w/2, h-6); ctx.stroke(); ctx.setLineDash([]);
  // paddle AI eases toward the ball
  s.p1 += Math.max(-180, Math.min(180, (s.ball.y - s.p1))) * Math.min(1, dt*4);
  s.p2 += Math.max(-180, Math.min(180, (s.ball.y - s.p2))) * Math.min(1, dt*4);
  s.p1 = Math.max(14, Math.min(h-14, s.p1)); s.p2 = Math.max(14, Math.min(h-14, s.p2));
  ctx.fillStyle = A.p;
  roundFill(ctx, 6, s.p1 - 12, 4, 24, 2);
  roundFill(ctx, w - 10, s.p2 - 12, 4, 24, 2);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, 3, 0, Math.PI*2); ctx.fill();
  s.ball.x += s.ball.vx * dt; s.ball.y += s.ball.vy * dt;
  if (s.ball.y < 4 || s.ball.y > h - 4) s.ball.vy *= -1;
  if (s.ball.x < 12 && s.ball.vx < 0) { s.ball.vx = Math.abs(s.ball.vx); s.ball.vy += (s.ball.y - s.p1) * 0.6; }
  if (s.ball.x > w - 12 && s.ball.vx > 0) { s.ball.vx = -Math.abs(s.ball.vx); s.ball.vy += (s.ball.y - s.p2) * 0.6; }
  s.ball.vy = Math.max(-90, Math.min(90, s.ball.vy));
  if (s.ball.x < -4 || s.ball.x > w + 4) { s.ball.x = w/2; s.ball.y = h/2; s.ball.vx = (Math.random()>.5?1:-1)*70; s.ball.vy = (Math.random()*2-1)*40; }
}

// ---- FLAP — yellow bird flaps through teal pipes ----
function pvFlap(ctx, w, h, s, dt) {
  const A = acc('flap');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const px = w * 0.66, gapY = h * 0.5 + Math.sin(s.t * 0.7) * 22, gap = 44;
  ctx.fillStyle = A.s;
  roundFill(ctx, px, 0, 20, gapY - gap/2, 3);
  roundFill(ctx, px, gapY + gap/2, 20, h, 3);
  ctx.fillStyle = shadeColor(A.s, 0.7);
  ctx.fillRect(px - 2, gapY - gap/2 - 6, 24, 6); ctx.fillRect(px - 2, gapY + gap/2, 24, 6);
  const bx = w * 0.32, by = h * 0.5 + Math.sin(s.t * 3) * 16, flap = Math.sin(s.t * 12) > 0 ? 1 : -1;
  ctx.fillStyle = A.p;
  roundFill(ctx, bx - 8, by - 6, 16, 12, 4);
  ctx.fillStyle = shadeColor(A.p, 0.7); roundFill(ctx, bx - 6, by - 1 + flap, 8, 5, 2); // wing
  ctx.fillStyle = '#ff9500'; ctx.fillRect(bx + 7, by - 1, 5, 3); // beak
  ctx.fillStyle = '#0a0a1e'; ctx.fillRect(bx + 2, by - 4, 2, 2); // eye
}

// ---- INVADERS — marching aliens, cannon fires (teal / red) ----
function pvInvaders(ctx, w, h, s, dt) {
  const A = acc('invaders');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (s.by == null) { s.by = h - 18; s.hit = -1; s.hitT = 0; }
  for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect((i*31)%w, (i*17 + s.t*16)%h, 1, 1); }
  const off = Math.sin(s.t * 1.4) * 10, frame = (s.t * 3 | 0) % 2;
  const cols = 4, x0 = w/2 - 56;
  for (let i = 0; i < cols; i++) {
    const ax = x0 + i*32 + off, ay = h*0.42;
    if (i === s.hit && s.hitT > 0) { ctx.fillStyle = A.s; ctx.fillRect(ax, ay, 14, 8); }
    else drawAlien(ctx, ax, ay, A.p, frame);
  }
  // bullet
  s.by -= 120 * dt;
  ctx.fillStyle = '#fff'; ctx.fillRect(w/2 - 1, s.by, 2, 6);
  if (s.by < h*0.5) { s.hit = rnd(cols); s.hitT = 0.18; s.by = h - 18; }
  if (s.hitT > 0) s.hitT -= dt;
  // cannon
  ctx.fillStyle = A.p; roundFill(ctx, w/2 - 7, h - 12, 14, 5, 2); ctx.fillRect(w/2 - 2, h - 16, 4, 4);
}
function drawAlien(ctx, x, y, color, frame) {
  ctx.fillStyle = color;
  const a = [[0,1,0,0,0,1,0],[0,0,1,1,1,0,0],[0,1,1,1,1,1,0],[1,1,0,1,0,1,1]];
  const b = [[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,1,1,1,1,1,1],[0,1,0,1,0,1,0]];
  const px = frame ? b : a, u = 2;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) if (px[r][c]) ctx.fillRect(x + c*u, y + r*u, u, u);
}

// ---- RUNNER — runs an outrun strip, auto-jumps obstacles (orange / pink) ----
function pvRunner(ctx, w, h, s, dt) {
  const A = acc('runner');
  if (!s.obs) { s.obs = []; s.y = 0; s.vy = 0; s.onG = true; s.spawn = 0.7; }
  const groundY = h * 0.74, speed = 78, runnerX = w * 0.26;
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#23073f'); sky.addColorStop(1, shadeColor(A.s, 0.55));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, groundY);
  ctx.fillStyle = 'rgba(255,149,0,0.55)'; ctx.beginPath(); ctx.arc(w*0.5, groundY, 28, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#0a0a18'; ctx.fillRect(0, groundY, w, h - groundY);
  ctx.strokeStyle = 'rgba(255,0,110,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(w/2 + i*42, h); ctx.lineTo(w/2 + i*6, groundY); ctx.stroke(); }
  // physics
  s.vy += 560 * dt; s.y += s.vy * dt;
  if (s.y > 0) { s.y = 0; s.vy = 0; s.onG = true; }
  s.spawn -= dt; if (s.spawn <= 0) { s.obs.push({ x: w + 12 }); s.spawn = 1.2 + Math.random() * 1.0; }
  for (const o of s.obs) o.x -= speed * dt;
  s.obs = s.obs.filter(o => o.x > -16);
  const near = s.obs.find(o => o.x > runnerX - 4 && o.x < runnerX + 34);
  if (near && s.onG) { s.vy = -195; s.onG = false; }
  ctx.fillStyle = A.s;
  for (const o of s.obs) { roundFill(ctx, o.x, groundY - 13, 7, 13, 2); }
  // runner — chromatic G that hops
  const ry = groundY - 4 + s.y;
  ctx.font = 'bold 17px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = A.s; ctx.fillText('G', runnerX + 1.5, ry);
  ctx.fillStyle = '#00f5ff'; ctx.fillText('G', runnerX - 1.5, ry);
  ctx.fillStyle = A.p; ctx.fillText('G', runnerX, ry);
}

// ---- SLITHER — winding body + orbs (purple body, teal orbs) ----
function pvSlither(ctx, w, h, s, dt) {
  const A = acc('slither');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 16;
  for (let i = N - 1; i >= 0; i--) {
    const t = s.t * 1.5 - i * 0.16;
    const x = w/2 + Math.cos(t) * 58;
    const y = h/2 + Math.sin(t * 1.4) * 34;
    if (i === 0) {
      ctx.fillStyle = '#ff006e'; ctx.beginPath(); ctx.arc(x + 1.5, y, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#00f5ff'; ctx.beginPath(); ctx.arc(x - 1.5, y, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = A.p; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y - 2, 2, 2);
    } else {
      ctx.fillStyle = shadeColor(A.p, 0.6 + 0.35 * (1 - i / N));
      ctx.beginPath(); ctx.arc(x, y, 5.5 - i * 0.12, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.fillStyle = A.s; ctx.beginPath(); ctx.arc(w*0.16, h*0.34, 4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.84, h*0.7, 4, 0, Math.PI*2); ctx.fill();
}

// ---- TIC TAC TOE — X/O draw in, win line (cyan X, pink O) ----
function pvTTT(ctx, w, h, s, dt) {
  const A = acc('tictactoe');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 30, x0 = (w - cell*3)/2, y0 = (h - cell*3)/2;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x0 + i*cell, y0); ctx.lineTo(x0 + i*cell, y0 + 3*cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0 + i*cell); ctx.lineTo(x0 + 3*cell, y0 + i*cell); ctx.stroke();
  }
  const phase = (s.t % 3) / 3;
  drawX(ctx, x0, y0, cell, Math.min(1, phase / 0.25), A.p);
  drawO(ctx, x0 + cell, y0 + cell, cell, Math.max(0, Math.min(1, (phase - 0.25) / 0.25)), A.s);
  drawX(ctx, x0 + 2*cell, y0 + 2*cell, cell, Math.max(0, Math.min(1, (phase - 0.5) / 0.25)), A.p);
  if (phase > 0.75) {
    const t = (phase - 0.75) / 0.25;
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 3; ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 4);
    ctx.lineTo(x0 + 4 + t * (3*cell - 8), y0 + 4 + t * (3*cell - 8)); ctx.stroke(); ctx.shadowBlur = 0;
  }
}
function drawX(ctx, x, y, sz, t, col) {
  if (t <= 0) return;
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; const m = 6;
  ctx.beginPath(); ctx.moveTo(x + m, y + m); ctx.lineTo(x + m + (sz - 2*m) * Math.min(1, t * 2), y + m + (sz - 2*m) * Math.min(1, t * 2)); ctx.stroke();
  if (t > 0.5) { ctx.beginPath(); ctx.moveTo(x + sz - m, y + m); ctx.lineTo(x + sz - m - (sz - 2*m) * ((t - 0.5) * 2), y + m + (sz - 2*m) * ((t - 0.5) * 2)); ctx.stroke(); }
}
function drawO(ctx, x, y, sz, t, col) {
  if (t <= 0) return;
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; const r = (sz - 12) / 2;
  ctx.beginPath(); ctx.arc(x + sz/2, y + sz/2, r, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * t); ctx.stroke();
}

// ---- CHESS — blue board, a queen advances, gold highlight ----
function pvChess(ctx, w, h, s, dt) {
  const A = acc('chess');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 19, x0 = (w - cell*4)/2, y0 = (h - cell*4)/2;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    ctx.fillStyle = (r + c) % 2 === 0 ? shadeColor(A.p, 0.95) : shadeColor(A.p, 0.4);
    ctx.fillRect(x0 + c*cell, y0 + r*cell, cell, cell);
  }
  const phase = (s.t % 3) / 3;
  ctx.font = 'bold 15px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const qx = phase > 0.5 ? 0.5 : 3.5, qy = phase > 0.5 ? 2.5 : 3.5;
  if (phase > 0.5) { ctx.strokeStyle = A.s; ctx.lineWidth = 2; ctx.strokeRect(x0 + qx*cell - cell/2 + 1, y0 + qy*cell - cell/2 + 1, cell - 2, cell - 2); }
  ctx.fillStyle = '#0a0a1e'; ctx.fillText('♚', x0 + cell*0.5 + 0.6, y0 + cell*0.5 + 0.6);
  ctx.fillStyle = '#fff'; ctx.fillText('♚', x0 + cell*0.5, y0 + cell*0.5);
  ctx.fillStyle = '#ffd60a'; ctx.fillText('♕', x0 + qx*cell, y0 + qy*cell);
}

// ---- CHECKERS — red vs blue, a piece advances and kings (red / blue) ----
function pvCheckers(ctx, w, h, s, dt) {
  const A = acc('checkers');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 6, cell = 15, x0 = (w - N*cell)/2, y0 = (h - N*cell)/2;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = (r + c) % 2 === 1 ? '#241a52' : '#100a2c';
    ctx.fillRect(x0 + c*cell, y0 + r*cell, cell, cell);
  }
  const steps = [[0,1],[1,2],[2,3],[3,4]];
  const phase = (s.t % 3) / 3, idx = Math.min(3, (phase * 4) | 0);
  // blue defender
  ctx.fillStyle = A.s; ctx.beginPath(); ctx.arc(x0 + 4*cell + cell/2, y0 + 4*cell + cell/2, cell*0.36, 0, Math.PI*2); ctx.fill();
  // red runner
  const rx = x0 + steps[idx][1]*cell + cell/2, ry = y0 + steps[idx][0]*cell + cell/2;
  ctx.fillStyle = A.p; ctx.beginPath(); ctx.arc(rx, ry, cell*0.36, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = shadeColor(A.p, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
  if (idx === 3) { ctx.fillStyle = '#ffd60a'; ctx.font = 'bold 8px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♔', rx, ry); }
}

// ---- CONNECT 4 — discs drop to fill (yellow / red) ----
function pvC4(ctx, w, h, s, dt) {
  const A = acc('connect4');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cols = 7, rows = 5, cell = 15;
  const x0 = (w - cols*cell)/2, y0 = (h - rows*cell)/2;
  ctx.fillStyle = '#3a0ca3'; roundFill(ctx, x0, y0, cols*cell, rows*cell, 4);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.beginPath(); ctx.arc(x0 + c*cell + cell/2, y0 + r*cell + cell/2, cell * 0.36, 0, Math.PI*2);
    ctx.fillStyle = '#0a0a1e'; ctx.fill();
  }
  const board = [[0,0,0,2,0,0,0],[0,0,0,1,0,0,0],[0,0,2,1,0,0,0],[2,1,1,2,0,1,0]];
  const phase = (s.t % 3) / 3, visRows = ((phase * board.length) | 0) + 1;
  for (let r = 0; r < Math.min(visRows, board.length); r++) for (let c = 0; c < cols; c++) {
    if (board[r][c] === 0) continue;
    const y = y0 + (r + 1) * cell + cell/2;
    ctx.beginPath(); ctx.arc(x0 + c*cell + cell/2, y, cell * 0.36, 0, Math.PI*2);
    ctx.fillStyle = board[r][c] === 1 ? A.s : A.p; ctx.fill();
  }
}

// ---- BLACKJACK — procedural cards make 21 on teal felt (teal / gold) ----
function pvBlackjack(ctx, w, h, s, dt) {
  const A = acc('blackjack');
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  ctx.fillStyle = shadeColor(A.p, 0.18); ctx.beginPath(); ctx.ellipse(w/2, h*0.46, w*0.46, h*0.34, 0, 0, Math.PI*2); ctx.fill();
  const cw = 38, ch = 54;
  drawMiniCard(ctx, w/2 - cw - 4, h/2 - ch/2, cw, ch, 'A', '♠', false);
  drawMiniCard(ctx, w/2 + 4, h/2 - ch/2, cw, ch, 'K', '♥', true);
  ctx.fillStyle = '#ffd60a'; ctx.font = 'bold 12px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('21', w / 2, h - 11);
}
function drawMiniCard(ctx, x, y, cw, ch, rank, suit, red) {
  ctx.fillStyle = '#fff'; GAI.fx.roundRect(ctx, x, y, cw, ch, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(10,10,30,0.5)'; ctx.lineWidth = 1; GAI.fx.roundRect(ctx, x, y, cw, ch, 4); ctx.stroke();
  ctx.fillStyle = red ? '#ef233c' : '#1a1a30';
  ctx.font = 'bold 8px "Press Start 2P", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(rank, x + 3, y + 3);
  ctx.font = 'bold 14px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(suit, x + cw/2, y + ch/2);
}

// ---- SOLITAIRE — foundations + a cascading column (blue / red suits) ----
function pvSolitaire(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  for (let i = 0; i < 4; i++) {
    const x = 14 + i * 28, y = 14;
    ctx.strokeStyle = 'rgba(67,97,238,0.5)'; ctx.lineWidth = 1; GAI.fx.roundRect(ctx, x, y, 22, 30, 3); ctx.stroke();
    ctx.fillStyle = (i % 2) ? 'rgba(239,35,60,0.5)' : 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 11px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(['♠','♥','♦','♣'][i], x + 11, y + 15);
  }
  for (let i = 0; i < 5; i++) {
    const x = 26 + i * 18;
    const y = 62 + Math.abs(Math.sin(s.t * 1.1 + i)) * 8 + i * 5;
    drawMiniCard(ctx, x, y, 18, 24, ['A','2','3','4','5'][i], (i % 2) ? '♥' : '♠', i % 2 === 1);
  }
}

GAI.previews = {
  stack: pvStack, snake: pvSnake, blocks: pvBlocks, p2048: pv2048,
  breakout: pvBreakout, pong: pvPong, flap: pvFlap, invaders: pvInvaders,
  runner: pvRunner, slither: pvSlither,
  tictactoe: pvTTT, chess: pvChess, checkers: pvCheckers, connect4: pvC4,
  blackjack: pvBlackjack, solitaire: pvSolitaire
};

})();
