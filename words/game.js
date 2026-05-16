(() => {
'use strict';
const GAI = window.GAI;
const { ANSWERS, VALID } = window.WORDS_DATA;
const board = document.getElementById('board');
const kb = document.getElementById('keyboard');
const msg = document.getElementById('message');
const dailyEl = document.getElementById('daily');
const hardBtn = document.getElementById('hard');
const statsBtn = document.getElementById('stats');
const modal = document.getElementById('modal');

const today = GAI.todayUTC();
dailyEl.textContent = 'DAILY · ' + today.slice(0,4) + '.' + today.slice(4,6) + '.' + today.slice(6,8);

// Daily target — anti-cheat: derive index from seed, never put word in DOM
const seed = GAI.dailySeed('words');
const targetIdx = seed % ANSWERS.length;
const TARGET = ANSWERS[targetIdx];

let rows = []; // 6 rows of 5 chars
let curRow = 0;
let curCol = 0;
let finished = false;
let hardMode = GAI.storage.get('gai_words_hard') === '1';
hardBtn.setAttribute('aria-pressed', hardMode ? 'true' : 'false');
hardBtn.style.background = hardMode ? 'var(--c-yellow)' : 'var(--c-cyan)';
hardBtn.style.color = 'var(--c-bg)';

const SAVED_KEY = 'gai_words_state_' + today;

function buildBoard() {
  board.innerHTML = '';
  rows = [];
  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    const cells = [];
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      row.appendChild(cell);
      cells.push(cell);
    }
    board.appendChild(row);
    rows.push({ el: row, cells, value: '', result: null });
  }
}
buildBoard();

const KB = [
  'qwertyuiop'.split(''),
  'asdfghjkl'.split(''),
  ['enter','z','x','c','v','b','n','m','back']
];
const keyEls = {};
function buildKB() {
  kb.innerHTML = '';
  for (const row of KB) {
    const r = document.createElement('div');
    r.className = 'kb-row';
    for (const k of row) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'key' + ((k === 'enter' || k === 'back') ? ' wide' : '');
      b.textContent = k === 'enter' ? 'ENTER' : (k === 'back' ? '←' : k.toUpperCase());
      b.dataset.k = k;
      b.addEventListener('click', () => handleKey(k));
      r.appendChild(b);
      keyEls[k] = b;
    }
    kb.appendChild(r);
  }
}
buildKB();

function setMsg(t, ms) {
  msg.textContent = t;
  if (ms) setTimeout(() => { if (msg.textContent === t) msg.textContent = ''; }, ms);
}

function shake(row) {
  row.el.classList.remove('shake');
  void row.el.offsetWidth;
  row.el.classList.add('shake');
}

function evaluate(guess, target) {
  const res = ['gray','gray','gray','gray','gray'];
  const tArr = target.split('');
  for (let i = 0; i < 5; i++) if (guess[i] === target[i]) { res[i] = 'green'; tArr[i] = '_'; }
  for (let i = 0; i < 5; i++) {
    if (res[i] === 'green') continue;
    const j = tArr.indexOf(guess[i]);
    if (j !== -1) { res[i] = 'yellow'; tArr[j] = '_'; }
  }
  return res;
}

function checkHardMode(guess) {
  if (!hardMode) return true;
  for (let r = 0; r < curRow; r++) {
    const row = rows[r];
    if (!row.result) continue;
    for (let i = 0; i < 5; i++) {
      if (row.result[i] === 'green' && guess[i] !== row.value[i]) {
        setMsg(`${(i+1)}TH MUST BE ${row.value[i].toUpperCase()}`, 1800);
        return false;
      }
    }
    for (let i = 0; i < 5; i++) {
      if (row.result[i] === 'yellow' && !guess.includes(row.value[i])) {
        setMsg(`MUST USE ${row.value[i].toUpperCase()}`, 1800);
        return false;
      }
    }
  }
  return true;
}

function submitGuess() {
  const row = rows[curRow];
  if (row.value.length !== 5) { shake(row); setMsg('NOT ENOUGH LETTERS', 1200); return; }
  if (!VALID.has(row.value)) { shake(row); setMsg('NOT IN WORD LIST', 1200); return; }
  if (!checkHardMode(row.value)) { shake(row); return; }

  const result = evaluate(row.value, TARGET);
  row.result = result;
  // flip each
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      row.cells[i].classList.add('flip');
      setTimeout(() => {
        row.cells[i].classList.remove('flip');
        row.cells[i].classList.add(result[i]);
        updateKBFor(row.value[i], result[i]);
        GAI.audio.tone(330 + i * 30, 0.04, 'square', 0.1, 0.005, 0.04);
      }, 220);
    }, i * 250);
  }

  saveState();

  setTimeout(() => {
    if (row.value === TARGET) {
      // win — winning cascade
      for (let i = 0; i < 5; i++) setTimeout(() => row.cells[i].classList.add('win'), i * 90);
      GAI.audio.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], 80, 'triangle', 0.18);
      GAI.haptic([20, 30, 40]);
      finished = true;
      updateStats(curRow + 1);
      setTimeout(showStats, 1400);
    } else {
      curRow++;
      curCol = 0;
      if (curRow >= 6) {
        finished = true;
        setMsg('WORD: ' + TARGET.toUpperCase(), 5000);
        updateStats(-1);
        setTimeout(showStats, 1400);
        GAI.audio.arpeggio([440, 369.99, 311.13], 130, 'sawtooth', 0.16);
      }
    }
    saveState();
  }, 5 * 250 + 250);
}

function updateKBFor(ch, res) {
  const k = keyEls[ch];
  if (!k) return;
  // priority: green > yellow > gray
  const order = { green: 3, yellow: 2, gray: 1 };
  const cur = k.classList.contains('green') ? 'green' : k.classList.contains('yellow') ? 'yellow' : k.classList.contains('gray') ? 'gray' : '';
  if (!cur || (order[res] || 0) > (order[cur] || 0)) {
    k.classList.remove('green', 'yellow', 'gray');
    k.classList.add(res);
  }
}

function handleKey(k) {
  if (finished) return;
  GAI.audio.ensure();
  if (k === 'enter') { submitGuess(); return; }
  if (k === 'back') {
    const row = rows[curRow];
    if (curCol > 0) {
      curCol--;
      row.value = row.value.slice(0, curCol);
      row.cells[curCol].textContent = '';
      row.cells[curCol].classList.remove('filled');
    }
    return;
  }
  if (/^[a-z]$/.test(k)) {
    const row = rows[curRow];
    if (curCol < 5) {
      row.cells[curCol].textContent = k.toUpperCase();
      row.cells[curCol].classList.add('filled');
      row.value += k;
      curCol++;
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (modal && !modal.classList.contains('hidden')) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  if (e.key === 'Enter') { e.preventDefault(); handleKey('enter'); }
  else if (e.key === 'Backspace') { e.preventDefault(); handleKey('back'); }
  else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toLowerCase());
});

hardBtn.addEventListener('click', () => {
  if (curRow > 0) { setMsg('CHANGE BEFORE STARTING', 1500); return; }
  hardMode = !hardMode;
  GAI.storage.set('gai_words_hard', hardMode ? '1' : '0');
  hardBtn.setAttribute('aria-pressed', hardMode ? 'true' : 'false');
  hardBtn.style.background = hardMode ? 'var(--c-yellow)' : 'var(--c-cyan)';
});
statsBtn.addEventListener('click', showStats);
document.getElementById('close').addEventListener('click', closeModal);
document.getElementById('share').addEventListener('click', shareGrid);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function showStats() {
  const stats = GAI.storage.getJSON('gai_words_stats', { played: 0, wins: 0, streak: 0, max: 0, lastDate: null, dist: [0,0,0,0,0,0,0] });
  document.getElementById('m-played').textContent = stats.played;
  document.getElementById('m-winp').textContent = stats.played ? Math.round(stats.wins / stats.played * 100) : 0;
  document.getElementById('m-streak').textContent = stats.streak;
  document.getElementById('m-max').textContent = stats.max;
  const max = Math.max(1, ...stats.dist.slice(0, 6));
  const dist = document.getElementById('dist');
  dist.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const d = document.createElement('div');
    d.className = 'dist-row';
    const cur = finished && rows[i] && rows[i].value === TARGET;
    d.innerHTML = `<span>${i+1}</span><span class="bar${cur ? ' cur' : ''}" style="width:${Math.max(8, stats.dist[i] / max * 200)}px">${stats.dist[i]}</span>`;
    dist.appendChild(d);
  }
  modal.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); }

function updateStats(rowIdx) {
  const stats = GAI.storage.getJSON('gai_words_stats', { played: 0, wins: 0, streak: 0, max: 0, lastDate: null, dist: [0,0,0,0,0,0,0] });
  stats.played++;
  if (rowIdx > 0) {
    stats.wins++;
    if (stats.lastDate === yesterdayStr(today)) stats.streak++;
    else stats.streak = 1;
    if (stats.streak > stats.max) stats.max = stats.streak;
    stats.dist[rowIdx - 1] = (stats.dist[rowIdx - 1] || 0) + 1;
    GAI.bestScore('words', stats.max);
  } else {
    stats.streak = 0;
    stats.dist[6] = (stats.dist[6] || 0) + 1;
  }
  stats.lastDate = today;
  GAI.storage.setJSON('gai_words_stats', stats);
}
function yesterdayStr(t) {
  const y = +t.slice(0,4), m = +t.slice(4,6), d = +t.slice(6,8);
  const dt = new Date(Date.UTC(y, m-1, d) - 86400000);
  return dt.getUTCFullYear() + String(dt.getUTCMonth()+1).padStart(2,'0') + String(dt.getUTCDate()).padStart(2,'0');
}

function shareGrid() {
  let grid = '';
  for (const row of rows) {
    if (!row.result) continue;
    for (const r of row.result) grid += r === 'green' ? '🟩' : r === 'yellow' ? '🟨' : '⬛';
    grid += '\n';
  }
  const winLine = rows.findIndex(r => r.value === TARGET);
  const score = winLine >= 0 ? (winLine + 1) + '/6' : 'X/6';
  const text = `GETABOUTIT — WORDS ${today.slice(4,6)}.${today.slice(6,8)}  ${score}\n\n${grid}getaboutit.com/words`;
  if (navigator.share) navigator.share({ title: 'GETABOUTIT', text }).catch(() => navigator.clipboard.writeText(text));
  else navigator.clipboard.writeText(text).then(() => setMsg('COPIED', 1500)).catch(() => setMsg('CANNOT SHARE', 1500));
}

function saveState() {
  GAI.storage.setJSON(SAVED_KEY, {
    rows: rows.map(r => ({ value: r.value, result: r.result })),
    curRow, finished
  });
}
function loadState() {
  const s = GAI.storage.getJSON(SAVED_KEY, null);
  if (!s) return;
  for (let i = 0; i < s.rows.length; i++) {
    const r = s.rows[i];
    if (!r.value) continue;
    rows[i].value = r.value;
    for (let j = 0; j < r.value.length; j++) {
      rows[i].cells[j].textContent = r.value[j].toUpperCase();
      rows[i].cells[j].classList.add('filled');
      if (r.result) {
        rows[i].cells[j].classList.add(r.result[j]);
        updateKBFor(r.value[j], r.result[j]);
      }
    }
    rows[i].result = r.result;
  }
  curRow = s.curRow || 0;
  curCol = rows[curRow] ? rows[curRow].value.length : 0;
  finished = !!s.finished;
}
loadState();

})();
