(() => {
'use strict';
const GAI = window.GAI;
const $ = (s) => document.querySelector(s);

// Overview
const totalPlays = GAI.totalPlays();
const st = GAI.streak.get();
let totalWins = 0;
const wins = GAI.storage.getJSON('gai_wins', {});
for (const k of Object.keys(wins || {})) totalWins += +wins[k] || 0;
let played = 0;
for (const k of GAI.GAME_KEYS) if (GAI.gamePlays(k) > 0) played++;
let totalTime = 0;
for (const k of GAI.GAME_KEYS) totalTime += GAI.stats.timeFor(k);
const minutes = Math.floor(totalTime / 60000);
const hours = Math.floor(minutes / 60);
const hoursStr = hours > 0 ? hours + 'h ' + (minutes % 60) + 'm' : minutes + 'm';

const cells = [
  ['TOTAL PLAYS', totalPlays.toLocaleString()],
  ['GAMES PLAYED', played + '/' + GAI.GAME_KEYS.length],
  ['TOTAL WINS', totalWins.toLocaleString()],
  ['CURRENT STREAK', (st.current || 0) + 'd'],
  ['MAX STREAK', (st.max || 0) + 'd'],
  ['TIME PLAYED', hoursStr]
];
$('#overview').innerHTML = cells.map(c => `<div class="stat-cell"><span class="label">${c[0]}</span><b>${c[1]}</b></div>`).join('');

// Daily plays chart
function fitCanvas(canvas, h) {
  const w = canvas.parentElement.clientWidth - 12;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

(function drawDaily() {
  const c = $('#dailyChart');
  const { ctx, w, h } = fitCanvas(c, 140);
  ctx.clearRect(0, 0, w, h);
  const data = GAI.stats.dailyCounts(30);
  const max = Math.max(1, ...data.map(d => d.count));
  const barW = (w - 24) / data.length;
  // axis
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(12, h - 24); ctx.lineTo(w - 12, h - 24); ctx.stroke();
  // bars
  for (let i = 0; i < data.length; i++) {
    const v = data[i].count;
    const x = 12 + i * barW + 1;
    const bh = (v / max) * (h - 40);
    ctx.fillStyle = v > 0 ? '#00f5ff' : 'rgba(255,255,255,0.1)';
    ctx.fillRect(x, h - 24 - bh, barW - 2, bh);
    if (i % 7 === 0 || i === data.length - 1) {
      const d = data[i].date;
      const label = (d.getUTCMonth() + 1) + '/' + d.getUTCDate();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = 'bold 7px "Press Start 2P", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(label, x + barW/2, h - 18);
    }
  }
  // max label
  ctx.fillStyle = 'var(--c-yellow)';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('MAX ' + max, 14, 8);
})();

// Most played chart
(function drawMost() {
  const items = GAI.GAME_KEYS
    .map(k => ({ k, plays: GAI.gamePlays(k), name: GAI.GAME_NAMES[k] }))
    .filter(x => x.plays > 0)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);
  const c = $('#mostChart');
  const { ctx, w, h } = fitCanvas(c, Math.max(40, items.length * 22 + 14));
  ctx.clearRect(0, 0, w, h);
  if (items.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('PLAY A GAME TO SEE STATS', w/2, h/2);
    return;
  }
  const max = items[0].plays;
  const labelW = 90;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const y = 10 + i * 22;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(it.name, 10, y + 8);
    const barX = labelW;
    const barW = (w - labelW - 50) * (it.plays / max);
    ctx.fillStyle = '#06ffa5';
    ctx.fillRect(barX, y, barW, 14);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(it.plays), barX + barW + 6, y + 8);
  }
})();

// Best scores list
(function bestScores() {
  const out = [];
  for (const k of GAI.GAME_KEYS) {
    const b = +(GAI.storage.get('gai_best_' + k) || 0);
    if (b > 0) out.push({ k, b });
  }
  out.sort((a, b) => b.b - a.b);
  $('#bestGrid').innerHTML = out.length
    ? out.map(({ k, b }) => `<div class="best-row"><span class="name">${GAI.GAME_NAMES[k]}</span><b>${b}</b></div>`).join('')
    : '<div class="best-row"><span class="name">NO SCORES YET</span></div>';
})();

// Time per game
(function timeGrid() {
  const out = [];
  for (const k of GAI.GAME_KEYS) {
    const t = GAI.stats.timeFor(k);
    if (t > 0) out.push({ k, t });
  }
  out.sort((a, b) => b.t - a.t);
  $('#timeGrid').innerHTML = out.length
    ? out.map(({ k, t }) => {
        const min = Math.round(t / 60000);
        return `<div class="time-row"><span class="name">${GAI.GAME_NAMES[k]}</span><b>${min}m</b></div>`;
      }).join('')
    : '<div class="time-row"><span class="name">NO PLAY TIME YET</span></div>';
})();

// Achievements
(function ach() {
  const unlocked = GAI.achievements.unlocked();
  const cells = GAI.achievements.list.map(a => {
    const has = unlocked.indexOf(a.id) !== -1;
    return `<div class="ach-cell ${has ? '' : 'locked'}"><span class="icon">${has ? '✦' : '·'}</span>${a.label}<div style="font-size:7px;color:rgba(255,255,255,0.5);margin-top:4px;">${a.desc}</div></div>`;
  });
  $('#achGrid').innerHTML = cells.join('');
})();

})();
