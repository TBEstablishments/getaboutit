/* shared/previews.js — home-page tile preview renderers.
 *
 * Home-only concern: registers GAI.previews[gameKey] = (ctx, w, h, state, dt).
 * arcade.js owns the shared rAF scheduler (coupled to the bg canvas +
 * IntersectionObserver + DOM) and looks these up by key. Renderers draw in a
 * logical 240x160 space; arcade.js handles DPR + the ~30fps cap. Kept out of
 * the 16 game.js files on purpose (loading those would pull full engines onto
 * the home page). Palette colors only; cards render procedurally (no assets).
 */
(() => {
'use strict';
const GAI = window.GAI;
if (!GAI) return;
const PAL = GAI.PALETTE;

function clr(ctx, w, h) { ctx.fillStyle = '#0a0a1e'; ctx.fillRect(0, 0, w, h); }
function shadeColor(hex, m) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${(r*m)|0},${(g*m)|0},${(b*m)|0})`;
}

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
function pvSnake(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 5, cell = 10;
  for (let i = 0; i < N; i++) {
    const tau = s.t * 1.2 - i * 0.15;
    const x = w/2 + Math.sin(tau * 2) * 60;
    const y = h/2 + Math.sin(tau) * 28;
    ctx.fillStyle = i === 0 ? PAL[6] : PAL[2];
    ctx.fillRect(x - cell/2, y - cell/2, cell, cell);
  }
  ctx.fillStyle = PAL[7]; ctx.fillRect(w*0.78, h*0.5 - 5, 7, 7);
}
function pvBlocks(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 12, cols = 7, rows = 8;
  const x0 = (w - cols*cell)/2, y0 = h - rows*cell - 6;
  for (let c = 0; c < cols; c++) if ((c + (s.t|0)) % 7 < 5) { ctx.fillStyle = PAL[5]; ctx.fillRect(x0 + c*cell, y0 + (rows-1)*cell, cell-1, cell-1); }
  const phase = (s.t % 2.5) / 2.5;
  const tY = (phase < 0.7) ? phase / 0.7 * (rows - 3) : (rows - 3);
  ctx.fillStyle = phase >= 0.85 ? '#fff' : PAL[2];
  for (let i = 0; i < 3; i++) ctx.fillRect(x0 + (2+i)*cell, y0 + (tY|0)*cell, cell-1, cell-1);
  ctx.fillRect(x0 + 3*cell, y0 + ((tY|0)+1)*cell, cell-1, cell-1);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.strokeRect(x0, y0, cols*cell, rows*cell);
}
function pv2048(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 38; const x0 = (w - cell*2 - 8)/2, y0 = (h - cell)/2;
  const phase = (s.t % 2.5) / 2.5;
  if (phase < 0.45) {
    const t = phase / 0.45;
    drawTile(ctx, x0 + (1-t)*8, y0, cell, '2', PAL[7]);
    drawTile(ctx, x0 + cell + 8 + t*8, y0, cell, '2', PAL[7]);
  } else if (phase < 0.55) {
    const t = (phase - 0.45) / 0.10;
    const sc = 1 + 0.15 * Math.sin(t * Math.PI);
    ctx.save(); ctx.translate(x0 + cell/2 + 4, y0 + cell/2); ctx.scale(sc, sc);
    drawTile(ctx, -cell/2, -cell/2, cell, '4', PAL[8]); ctx.restore();
  } else {
    drawTile(ctx, x0 + 4, y0, cell, '4', PAL[8]);
  }
}
function drawTile(ctx, x, y, sz, txt, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, sz, sz);
  ctx.fillStyle = '#0a0a1e'; ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x + sz/2, y + sz/2);
}
function pvBreakout(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (!s.ball) s.ball = { x: w/2, y: h*0.45, vx: 60, vy: -50 };
  if (!s.bricks) s.bricks = [1,1,1,1,1,1,1,1];
  const bw = w / 8;
  for (let i = 0; i < 8; i++) if (s.bricks[i]) { ctx.fillStyle = PAL[i % PAL.length]; ctx.fillRect(i * bw + 1, 8, bw - 2, 10); }
  ctx.fillStyle = PAL[5]; ctx.fillRect(w/2 - 20, h - 14, 40, 4);
  for (let i = 5; i > 0; i--) { ctx.fillStyle = `rgba(0,245,255,${(0.15*i/5).toFixed(3)})`; ctx.fillRect(s.ball.x - i*2, s.ball.y - i*1.5, 4, 4); }
  ctx.fillStyle = '#fff'; ctx.fillRect(s.ball.x - 2, s.ball.y - 2, 4, 4);
  s.ball.x += s.ball.vx * dt; s.ball.y += s.ball.vy * dt;
  if (s.ball.x < 4 || s.ball.x > w - 4) s.ball.vx *= -1;
  if (s.ball.y > h - 18) s.ball.vy = -Math.abs(s.ball.vy);
  if (s.ball.y < 22) { s.ball.vy = Math.abs(s.ball.vy); const idx = Math.floor(s.ball.x/bw); if (s.bricks[idx]) s.bricks[idx] = 0; }
  if (s.bricks.every(b => !b)) s.bricks = [1,1,1,1,1,1,1,1];
}
function pvPong(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  if (!s.ball) s.ball = { x: w/2, y: h/2, vx: 60, vy: 35 };
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = PAL[5];
  ctx.fillRect(6, Math.max(8, Math.min(h-28, s.ball.y - 10)), 4, 20);
  ctx.fillRect(w - 10, Math.max(8, Math.min(h-28, s.ball.y - 10 + Math.sin(s.t*2)*8)), 4, 20);
  ctx.fillStyle = '#fff'; ctx.fillRect(s.ball.x - 2, s.ball.y - 2, 4, 4);
  s.ball.x += s.ball.vx * dt; s.ball.y += s.ball.vy * dt;
  if (s.ball.x < 14) s.ball.vx = Math.abs(s.ball.vx);
  if (s.ball.x > w - 14) s.ball.vx = -Math.abs(s.ball.vx);
  if (s.ball.y < 4 || s.ball.y > h - 4) s.ball.vy *= -1;
}
function pvFlap(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const px = w * 0.65, gapY = h * 0.5 + Math.sin(s.t * 0.7) * 15;
  ctx.fillStyle = PAL[6]; ctx.fillRect(px, 0, 18, gapY - 20); ctx.fillRect(px, gapY + 20, 18, h);
  const bx = w * 0.32, by = h * 0.5 + Math.sin(s.t * 3) * 12;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(s.t * 3 + 1.5) * 0.3);
  ctx.font = 'bold 14px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL[0]; ctx.fillText('G', 1.5, 0);
  ctx.fillStyle = PAL[5]; ctx.fillText('G', -1.5, 0);
  ctx.fillStyle = '#fff'; ctx.fillText('G', 0, 0); ctx.restore();
}
function pvInvaders(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect((i*31)%w, (i*17+(s.t*20))%h, 1, 1); }
  const off = Math.sin(s.t * 1.6) * 8;
  for (let i = 0; i < 4; i++) drawAlien(ctx, (w/2 - 60) + i * 28 + off, h * 0.5, PAL[6]);
  ctx.fillStyle = PAL[5]; ctx.fillRect(w/2 - 5, h - 14, 10, 4); ctx.fillRect(w/2 - 2, h - 18, 4, 4);
}
function drawAlien(ctx, x, y, color) {
  ctx.fillStyle = color;
  const px = [[0,1,0,0,0,1,0],[1,1,1,1,1,1,1],[1,0,1,1,1,0,1],[1,1,0,1,0,1,1]];
  const u = 2;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) if (px[r][c]) ctx.fillRect(x + c*u, y + r*u, u, u);
}
function pvRunner(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const horY = h * 0.7;
  ctx.fillStyle = '#1a0635'; ctx.fillRect(0, 0, w, horY);
  ctx.fillStyle = '#05050f'; ctx.fillRect(0, horY, w, h - horY);
  ctx.strokeStyle = 'rgba(255,0,110,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, horY); ctx.lineTo(w, horY); ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(w/2 + i * 30, h); ctx.lineTo(w/2, horY); ctx.stroke();
  }
  const phase = (s.t * 60) % w;
  ctx.fillStyle = PAL[9];
  ctx.fillRect(w - phase, horY - 18, 14, 18);
  const py = horY - 12 + Math.sin(s.t * 4) * 6;
  ctx.font = 'bold 18px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL[0]; ctx.fillText('G', w*0.25+1.5, py);
  ctx.fillStyle = PAL[5]; ctx.fillText('G', w*0.25-1.5, py);
  ctx.fillStyle = '#fff'; ctx.fillText('G', w*0.25, py);
}
function pvTTT(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 30, x0 = (w - cell*3)/2, y0 = (h - cell*3)/2;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x0 + i*cell, y0); ctx.lineTo(x0 + i*cell, y0 + 3*cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0 + i*cell); ctx.lineTo(x0 + 3*cell, y0 + i*cell); ctx.stroke();
  }
  const phase = (s.t % 3) / 3;
  drawX(ctx, x0, y0, cell, Math.min(1, phase / 0.25));
  drawO(ctx, x0 + cell, y0 + cell, cell, Math.max(0, Math.min(1, (phase - 0.25) / 0.25)));
  drawX(ctx, x0 + 2*cell, y0 + 2*cell, cell, Math.max(0, Math.min(1, (phase - 0.5) / 0.25)));
  if (phase > 0.75) {
    const t = (phase - 0.75) / 0.25;
    ctx.strokeStyle = PAL[7]; ctx.lineWidth = 3;
    ctx.shadowColor = PAL[7]; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 4);
    ctx.lineTo(x0 + 4 + t * (3*cell - 8), y0 + 4 + t * (3*cell - 8));
    ctx.stroke(); ctx.shadowBlur = 0;
  }
}
function drawX(ctx, x, y, sz, t) {
  if (t <= 0) return;
  ctx.strokeStyle = PAL[0]; ctx.lineWidth = 2; const m = 6;
  ctx.beginPath(); ctx.moveTo(x + m, y + m); ctx.lineTo(x + m + (sz - 2*m) * Math.min(1, t * 2), y + m + (sz - 2*m) * Math.min(1, t * 2)); ctx.stroke();
  if (t > 0.5) { ctx.beginPath(); ctx.moveTo(x + sz - m, y + m); ctx.lineTo(x + sz - m - (sz - 2*m) * ((t - 0.5) * 2), y + m + (sz - 2*m) * ((t - 0.5) * 2)); ctx.stroke(); }
}
function drawO(ctx, x, y, sz, t) {
  if (t <= 0) return;
  ctx.strokeStyle = PAL[5]; ctx.lineWidth = 2; const r = (sz - 12) / 2;
  ctx.beginPath(); ctx.arc(x + sz/2, y + sz/2, r, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * t); ctx.stroke();
}
function pvChess(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cell = 18, x0 = (w - cell*4)/2, y0 = (h - cell*4)/2;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    ctx.fillStyle = (r + c) % 2 === 0 ? '#1a1147' : '#0e0828';
    ctx.fillRect(x0 + c*cell, y0 + r*cell, cell, cell);
  }
  ctx.font = 'bold 14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const phase = (s.t % 3) / 3;
  ctx.fillStyle = '#fff'; ctx.fillText('♚', x0 + cell*0.5, y0 + cell*0.5);
  ctx.fillStyle = '#fff'; ctx.fillText('♕', x0 + cell*3.5, y0 + cell*3.5);
  if (phase > 0.5) {
    ctx.fillStyle = '#fff'; ctx.fillText('♕', x0 + cell*0.5, y0 + cell*2.5);
    ctx.strokeStyle = PAL[9]; ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, cell, cell);
  } else {
    ctx.fillStyle = '#fff'; ctx.fillText('♕', x0 + cell*0.5, y0 + cell*3.5);
  }
}
function pvCheckers(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 6, cell = 14, x0 = (w - N*cell)/2, y0 = (h - N*cell)/2;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = (r + c) % 2 === 1 ? '#3a0ca3' : '#1a0635';
    ctx.fillRect(x0 + c*cell, y0 + r*cell, cell, cell);
  }
  const positions = [[0,1],[1,2],[2,3],[3,4]];
  const phase = (s.t % 3) / 3;
  const idx = Math.min(positions.length - 1, Math.floor(phase * 4));
  ctx.fillStyle = PAL[9];
  ctx.beginPath(); ctx.arc(x0 + positions[idx][1] * cell + cell/2, y0 + positions[idx][0] * cell + cell/2, cell * 0.35, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = PAL[7];
  ctx.beginPath(); ctx.arc(x0 + 4 * cell + cell/2, y0 + 4 * cell + cell/2, cell * 0.35, 0, Math.PI*2); ctx.fill();
}
function pvC4(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cols = 7, rows = 5, cell = 14;
  const x0 = (w - cols*cell)/2, y0 = (h - rows*cell)/2;
  ctx.fillStyle = '#3a0ca3'; ctx.fillRect(x0, y0, cols*cell, rows*cell);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.beginPath(); ctx.arc(x0 + c*cell + cell/2, y0 + r*cell + cell/2, cell * 0.35, 0, Math.PI*2);
    ctx.fillStyle = '#0a0a1e'; ctx.fill();
  }
  const board = [[0,0,0,2,0,0,0],[0,0,0,1,0,0,0],[0,0,2,1,0,0,0],[2,1,1,2,0,0,0]];
  const phase = (s.t % 3) / 3;
  const visRows = Math.floor(phase * board.length) + 1;
  for (let r = 0; r < Math.min(visRows, board.length); r++) for (let c = 0; c < cols; c++) {
    if (board[r][c] === 0) continue;
    const y = y0 + (r + 1) * cell + cell/2;
    ctx.beginPath(); ctx.arc(x0 + c*cell + cell/2, y, cell * 0.35, 0, Math.PI*2);
    ctx.fillStyle = board[r][c] === 1 ? PAL[9] : PAL[7]; ctx.fill();
  }
}
function pvBlackjack(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const cw = 38, ch = 54;
  drawMiniCard(ctx, w/2 - cw - 4, h/2 - ch/2, cw, ch, 'A', '♠', false);
  drawMiniCard(ctx, w/2 + 4, h/2 - ch/2, cw, ch, 'K', '♥', true);
  ctx.fillStyle = PAL[6];
  ctx.font = 'bold 11px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('21', w / 2, h - 12);
}
function drawMiniCard(ctx, x, y, w, h, rank, suit, red) {
  ctx.fillStyle = '#fff'; GAI.fx.roundRect(ctx, x, y, w, h, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(10,10,30,0.5)'; ctx.lineWidth = 1; GAI.fx.roundRect(ctx, x, y, w, h, 4); ctx.stroke();
  ctx.fillStyle = red ? '#ef233c' : '#1a1a30';
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(rank, x + 3, y + 3);
  ctx.font = 'bold 14px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(suit, x + w/2, y + h/2);
}
function pvSolitaire(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  for (let i = 0; i < 4; i++) {
    const x = 14 + i * 28, y = 16;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; GAI.fx.roundRect(ctx, x, y, 22, 30, 3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(['♠','♥','♦','♣'][i], x + 11, y + 15);
  }
  for (let i = 0; i < 5; i++) {
    const x = 24 + (i % 5) * 16;
    const y = 60 + Math.abs(Math.sin(s.t + i)) * 10 + i * 6;
    drawMiniCard(ctx, x, y, 18, 24, ['A','2','3','4','5'][i], '♠', false);
  }
}
function pvSlither(ctx, w, h, s, dt) {
  clr(ctx, w, h); s.t = (s.t || 0) + dt;
  const N = 14;
  for (let i = 0; i < N; i++) {
    const t = s.t * 1.5 - i * 0.18;
    const x = w/2 + Math.cos(t) * 56;
    const y = h/2 + Math.sin(t * 1.4) * 32;
    if (i === 0) {
      ctx.fillStyle = '#ff006e';
      ctx.beginPath(); ctx.arc(x + 1.5, y, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#00f5ff';
      ctx.beginPath(); ctx.arc(x - 1.5, y, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = PAL[6];
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.fillStyle = PAL[7]; ctx.beginPath(); ctx.arc(w*0.18, h*0.4, 3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = PAL[0]; ctx.beginPath(); ctx.arc(w*0.82, h*0.7, 3, 0, Math.PI*2); ctx.fill();
}

GAI.previews = {
  stack: pvStack, snake: pvSnake, blocks: pvBlocks, p2048: pv2048,
  breakout: pvBreakout, pong: pvPong, flap: pvFlap, invaders: pvInvaders,
  runner: pvRunner, slither: pvSlither,
  tictactoe: pvTTT, chess: pvChess, checkers: pvCheckers, connect4: pvC4,
  blackjack: pvBlackjack, solitaire: pvSolitaire
};

})();
