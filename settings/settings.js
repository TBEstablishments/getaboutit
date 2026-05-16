(() => {
'use strict';
const GAI = window.GAI;
const $ = (s) => document.querySelector(s);

// theme buttons
const themeBtns = document.querySelectorAll('.theme-btn');
function refreshTheme() {
  const cur = GAI.theme.get();
  themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === cur));
}
themeBtns.forEach(b => b.addEventListener('click', () => {
  GAI.audio.ensure();
  GAI.audio.tone(560, 0.06, 'triangle', 0.12);
  GAI.theme.set(b.dataset.theme);
  refreshTheme();
}));
refreshTheme();

// achievements
const list = GAI.achievements.list;
const unlocked = GAI.achievements.unlocked();
$('#achCounter').textContent = unlocked.length + '/' + GAI.achievements.total;
const achHTML = list.map(a => {
  const isUnlocked = unlocked.indexOf(a.id) !== -1;
  return '<div class="ach-row ' + (isUnlocked ? '' : 'locked') + '">' +
    '<span class="mark">' + (isUnlocked ? '✦' : '·') + '</span>' +
    '<div class="body"><div class="label">' + a.label + '</div><div class="desc">' + a.desc + '</div></div>' +
    '<span class="state">' + (isUnlocked ? 'UNLOCKED' : 'LOCKED') + '</span>' +
  '</div>';
}).join('');
$('#achList').innerHTML = achHTML;

// stats
const st = GAI.streak.get();
const total = GAI.totalPlays();
let played = 0;
for (const k of GAI.GAME_KEYS) if (GAI.gamePlays(k) > 0) played++;
const wins = GAI.storage.getJSON('gai_wins', {});
const totalWins = Object.values(wins).reduce((s, n) => s + (+n || 0), 0);
const cells = [
  ['TOTAL PLAYS', total.toLocaleString()],
  ['GAMES PLAYED', played + '/' + GAI.GAME_KEYS.length],
  ['TOTAL WINS', totalWins.toLocaleString()],
  ['CURRENT STREAK', (st.current || 0) + ' DAYS'],
  ['MAX STREAK', (st.max || 0) + ' DAYS'],
  ['ACHIEVEMENTS', unlocked.length + '/' + GAI.achievements.total]
];
$('#statsGrid').innerHTML = cells.map(c => '<div class="stat-cell">' + c[0] + ' <b>' + c[1] + '</b></div>').join('');

// export
$('#exportBtn').addEventListener('click', () => {
  GAI.audio.ensure();
  GAI.audio.tone(660, 0.05, 'square', 0.12);
  const data = GAI.exportData.dump();
  // try download
  try {
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'getaboutit-scores-' + GAI.todayUTC() + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    GAI.ui.toast('✦ EXPORTED');
  } catch {
    const out = $('#exportOut');
    out.textContent = data;
    out.classList.remove('hidden');
  }
});

// import
$('#importFile').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const ok = GAI.exportData.load(reader.result);
    GAI.ui.toast(ok ? '✦ IMPORTED' : '× INVALID FILE');
    if (ok) setTimeout(() => location.reload(), 700);
  };
  reader.readAsText(file);
});

$('#resetBtn').addEventListener('click', () => {
  if (!confirm('RESET ALL SCORES, ACHIEVEMENTS, AND PROGRESS?')) return;
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('gai_') === 0) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {}
  GAI.ui.toast('✦ RESET DONE');
  setTimeout(() => location.reload(), 700);
});

})();
