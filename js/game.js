/* ============================================================
   Money Quest — game engine
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');

/* Seeded randomness powers the Daily Challenge: the same date produces the
   same deck order and dice rolls for every player that day. */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todaySeed() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

let _rng = Math.random;
const useSeededRng = (seed) => { _rng = mulberry32(hashString(String(seed))); };
const useRandomRng = () => { _rng = Math.random; };

const rand = (n) => Math.floor(_rng() * n);
const pick = (arr) => arr[rand(arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

let game = null;
let resolver = null; // modal promise resolver

const SVG_ICONS = {
  payday: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 5v14M7 12h10"/>',
  deal: '<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M3 8l9 4 9-4"/>',
  market: '<path d="M4 18L9 12l4 3 7-8"/><path d="M4 5h16"/>',
  spend: '<path d="M6 6h12l2 12H4z"/><path d="M9 8v3M15 8v3"/>',
  tax: '<path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 15l-4.9 2.5.9-5.6L4 8l5.6-1.1z"/>',
  bonus: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 5V3M15 5V3M9 19v2M15 19v2"/>',
  baby: '<circle cx="12" cy="9" r="5"/><path d="M12 14v5M8 19h8"/>',
  job: '<path d="M3 21V5h18v16z"/><path d="M8 5V3h8v2"/>',
  give: '<path d="M12 21s-7-4.5-9.2-9C1.3 9 4 5.5 7 6c2 0 3 1 5 3 2-2 3-3 5-3 3 .5 5.7 3 4.2 6-2.2 4.5-9.2 9-9.2 9z"/>',
  career: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
};

const LIVING_EXPENSE_NAME = 'Living expenses';

let currentPlayer = () => game.players[game.current];
let busy = false;

/* ---------------- audio (tiny WebAudio blips) ---------------- */
let audioCtx = null;
let soundOn = true;
try { soundOn = localStorage.getItem('mq_sound') !== '0'; } catch (e) { /* no storage */ }
function beep(freq, dur, vol, when) {
  if (!soundOn || !window.AudioContext) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + (when || 0);
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.2));
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + (dur || 0.2) + 0.02);
  } catch (e) { /* no audio */ }
}
const sfx = {
  roll: () => { beep(300, 0.05, 0.08); beep(400, 0.05, 0.08, 0.08); beep(520, 0.08, 0.08, 0.16); },
  coin: () => { beep(880, 0.09, 0.1); beep(1320, 0.12, 0.08, 0.07); },
  bad: () => { beep(220, 0.18, 0.1); beep(160, 0.25, 0.1, 0.12); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.16, 0.1, i * 0.13)); },
  buy: () => { beep(523, 0.1, 0.1); beep(784, 0.12, 0.09, 0.08); },
};

/* ---------------- board rendering ---------------- */
function buildBoard() {
  const board = $('board');
  const frag = document.createDocumentFragment();
  for (let i = 0; i < BOARD_SIZE; i++) {
    const type = BOARD_TYPES[i];
    const info = SPACE_INFO[type];
    const pos = BOARD_POS[i];
    const cell = document.createElement('div');
    cell.className = 'cell type-' + type + (i === 0 ? ' cell-start' : '');
    cell.dataset.index = i;
    cell.title = info.tip;
    cell.style.left = (pos.c * 100 / 9) + '%';
    cell.style.top = (pos.r * 100 / 9) + '%';
    cell.style.width = (100 / 9) + '%';
    cell.style.height = (100 / 9) + '%';
    cell.innerHTML =
      '<svg viewBox="0 0 24 24" class="cell-icon">' + SVG_ICONS[info.icon] + '</svg>' +
      '<span class="cell-label">' + info.label + '</span>' +
      (i % 8 === 0 ? '<span class="cell-flag">$$</span>' : '');
    frag.appendChild(cell);
  }
  board.appendChild(frag);

  // token layer
  const tokens = document.createElement('div');
  tokens.id = 'tokens';
  board.appendChild(tokens);
}

function placeToken(p) {
  const pos = BOARD_POS[p.position];
  const t = document.getElementById('token-' + p.color.replace('#', ''));
  if (!t) return;
  t.style.left = ((pos.c + 0.5) * 100 / 9) + '%';
  t.style.top = ((pos.r + 0.5) * 100 / 9) + '%';
  t.classList.toggle('is-current', p === currentPlayer());
}

/* ---------------- setup ---------------- */
function openSetup() {
  buildSetupRows(3);
  show('setup-modal');
}

function buildSetupRows(n) {
  const wrap = $('players-list');
  wrap.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'prow';
    row.innerHTML = `
      <span class="prow-idx">${i + 1}</span>
      <input class="prow-name" data-p="name" placeholder="Name" value="${i === 0 ? 'You' : ''}">
      <select class="prow-job" data-p="job">
        ${JOBS.map(j => `<option value="${j.id}">${j.name}</option>`).join('')}
      </select>
      <label class="prow-ai"><input type="checkbox" data-p="ai" ${i > 0 ? 'checked' : ''}> AI</label>
      <span class="color-row">${PLAYER_COLORS.map(c =>
        `<button class="swatch ${c === PLAYER_COLORS[i] ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</span>
    `;
    wrap.appendChild(row);
  }
  // wire color pickers
  wrap.querySelectorAll('.prow').forEach((row, i) => {
    row.querySelectorAll('.swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        row.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
      });
    });
  });
  // wire job difficulty hint
  wrap.querySelectorAll('.prow-job').forEach((sel) => sel.addEventListener('change', () => updateJobHint()));
  updateJobHint();
}

function updateJobHint() {
  document.querySelectorAll('.prow').forEach((row) => {
    const job = JOBS.find(j => j.id === row.querySelector('.prow-job').value);
    const hint = row.querySelector('.job-hint') || (() => {
      const h = document.createElement('span');
      h.className = 'job-hint';
      row.appendChild(h);
      return h;
    })();
    hint.textContent = `Salary ${fmt(job.salary)}/mo · Expenses ${fmt(job.expenses)}/mo · Start ${fmt(job.cash)}`;
  });
}

function startGame() {
  const players = [];
  const seen = new Set();
  document.querySelectorAll('.prow').forEach((row, i) => {
    let name = row.querySelector('.prow-name').value.trim() || ('Player ' + (i + 1));
    name = name.slice(0, 16);
    if (seen.has(name)) name = name + ' ' + (i + 1);
    seen.add(name);
    const job = JOBS.find(j => j.id === row.querySelector('.prow-job').value);
    const color = row.querySelector('.swatch.active').dataset.color;
    const isAI = row.querySelector('.prow-ai input').checked;
    players.push({
      name, color, jobId: job.id, ai: isAI,
      isHuman: !isAI,
    });
  });
  if (players.length < 1) players.length = 1;
  const dailyEl = $('daily-challenge');
  const modeEl = $('game-mode');
  beginGame(players, $('ai-difficulty').value, !!(dailyEl && dailyEl.checked), modeEl ? modeEl.value : 'race');
}

/* ---------------- game lifecycle ---------------- */
function beginGame(players, difficulty, daily, mode) {
  const p = players.map((cfg, i) => {
    const job = JOBS.find(j => j.id === cfg.jobId);
    return {
      name: cfg.name,
      color: cfg.color,
      ai: cfg.ai,
      isHuman: !cfg.ai,
      job: job,
      cash: job.cash,
      salary: job.salary,
      baseSalary: job.salary,
      careerTier: 0,
      passiveIncome: 0,
      expenses: job.expenses,
      baseExpenses: job.expenses,
      expenseItems: [{ name: LIVING_EXPENSE_NAME, monthly: job.expenses }],
      assets: [],
      loans: [],
      history: [],
      position: 0,
      downsized: 0,
      doubleRoll: false,
      escaped: false,
      bankrupt: false,
      totalPassiveEarned: 0,
      totalTaxPaid: 0,
      totalCharity: 0,
      investmentsBought: 0,
      bankruptcies: 0,
      credit: 700,
      emergencyFund: 0,
    };
  });

  const seed = daily ? todaySeed() : null;
  if (seed) useSeededRng(seed);

  game = {
    players: p,
    current: 0,
    turn: 1,
    difficulty: difficulty || 'medium',
    daily: !!daily,
    seed: seed,
    winner: null,
    mode: mode || 'race',
    maxTurns: 40,
    decks: {
      oppByCat: {
        realestate: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'realestate')),
        business: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'business')),
        stock: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'stock')),
        savings: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'savings')),
      },
      market: shuffle(MARKET_CARDS),
      event: shuffle(EVENT_CARDS),
      expense: shuffle(EXPENSE_CARDS),
      bonus: shuffle(BONUS_CARDS),
      baby: shuffle(BABY_CARDS),
    },
    event: null,
    log: [],
  };

  // build tokens
  buildTokens(p);

  hide('setup-modal');
  clearSave();
  $('roll-btn').disabled = false;
  renderAll();
  log(`New game! ${p.map(x => x.name).join(', ')} take on the Rat Race.`);
  log(`Turn ${game.turn}: ${currentPlayer().name}'s move (${currentPlayer().job.name}).`);
  currentPlayer().isHuman ? promptStart() : takeTurn();
}

function cbTokens() {
  try { return localStorage.getItem('mq_cb') === '1'; } catch (e) { return false; }
}

function buildTokens(players) {
  const tlayer = $('tokens');
  tlayer.innerHTML = '';
  const shapes = cbTokens();
  players.forEach((pl, i) => {
    const t = document.createElement('div');
    t.className = 'token' + (shapes ? ' shape-' + (i % 6) : '');
    t.id = 'token-' + pl.color.replace('#', '');
    t.style.background = pl.color;
    t.innerHTML = '<span>' + pl.name.charAt(0).toUpperCase() + '</span>';
    tlayer.appendChild(t);
    placeToken(pl);
  });
}

/* ---------------- save / resume ---------------- */
const SAVE_KEY = 'mq_save_' + ((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || 'en');

function saveGame() {
  try {
    const decks = game.decks;
    const s = {
      v: 1,
      players: game.players.map(p => ({
        name: p.name, color: p.color, ai: p.ai, isHuman: p.isHuman, jobId: p.job.id,
        cash: p.cash, salary: p.salary, baseSalary: p.baseSalary, careerTier: p.careerTier,
        passiveIncome: p.passiveIncome,
        expenses: p.expenses, baseExpenses: p.baseExpenses,
        expenseItems: p.expenseItems, assets: p.assets, loans: p.loans,
        history: p.history,
        position: p.position, downsized: p.downsized, doubleRoll: p.doubleRoll,
        escaped: p.escaped, bankrupt: p.bankrupt, totalPassiveEarned: p.totalPassiveEarned,
        totalTaxPaid: p.totalTaxPaid, totalCharity: p.totalCharity,
        investmentsBought: p.investmentsBought, bankruptcies: p.bankruptcies,
        credit: p.credit,
        emergencyFund: p.emergencyFund || 0,
      })),
      current: game.current,
      turn: game.turn,
      difficulty: game.difficulty,
      daily: game.daily,
      seed: game.seed,
      mode: game.mode,
      maxTurns: game.maxTurns,
      decks: {
        oppByCat: Object.fromEntries(Object.entries(decks.oppByCat).map(([k, v]) => [k, v.map(c => OPPORTUNITY_CARDS.indexOf(c))])),
        market: decks.market.map(c => MARKET_CARDS.indexOf(c)),
        event: decks.event.map(c => EVENT_CARDS.indexOf(c)),
        expense: decks.expense.map(c => EXPENSE_CARDS.indexOf(c)),
        bonus: decks.bonus.map(c => BONUS_CARDS.indexOf(c)),
        baby: decks.baby.map(c => BABY_CARDS.indexOf(c)),
      },
      event: game.event || null,
      log: game.log.slice(-60),
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) { /* storage unavailable */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* no storage */ }
}

function resumeGame() {
  const s = loadSave();
  if (!s) return;
  const players = s.players.map(cfg => {
    const job = JOBS.find(j => j.id === cfg.jobId) || JOBS[0];
    return {
      name: cfg.name, color: cfg.color, ai: cfg.ai, isHuman: cfg.isHuman, job,
      cash: cfg.cash, salary: cfg.salary, baseSalary: cfg.baseSalary || job.salary,
      careerTier: cfg.careerTier || 0,
      passiveIncome: cfg.passiveIncome,
      expenses: cfg.expenses, baseExpenses: cfg.baseExpenses,
      expenseItems: cfg.expenseItems, assets: cfg.assets, loans: cfg.loans,
      history: cfg.history || [],
      position: cfg.position, downsized: cfg.downsized, doubleRoll: cfg.doubleRoll,
      escaped: cfg.escaped, bankrupt: !!cfg.bankrupt, totalPassiveEarned: cfg.totalPassiveEarned,
      totalTaxPaid: cfg.totalTaxPaid, totalCharity: cfg.totalCharity,
      investmentsBought: cfg.investmentsBought, bankruptcies: cfg.bankruptcies,
      credit: cfg.credit ?? 700,
      emergencyFund: cfg.emergencyFund || 0,
    };
  });
  const cardAt = (cards, idx) => (idx >= 0 ? cards[idx] : null);
  game = {
    players,
    current: s.current,
    turn: s.turn,
    difficulty: s.difficulty || 'medium',
    daily: !!s.daily,
    seed: s.seed || null,
    winner: null,
    mode: s.mode || 'race',
    maxTurns: s.maxTurns || 40,
    decks: {
      oppByCat: {
        realestate: s.decks.oppByCat.realestate.map(i => cardAt(OPPORTUNITY_CARDS, i)).filter(Boolean),
        business: s.decks.oppByCat.business.map(i => cardAt(OPPORTUNITY_CARDS, i)).filter(Boolean),
        stock: s.decks.oppByCat.stock.map(i => cardAt(OPPORTUNITY_CARDS, i)).filter(Boolean),
        savings: s.decks.oppByCat.savings.map(i => cardAt(OPPORTUNITY_CARDS, i)).filter(Boolean),
      },
      market: s.decks.market.map(i => cardAt(MARKET_CARDS, i)).filter(Boolean),
      event: (s.decks.event || []).length ? s.decks.event.map(i => cardAt(EVENT_CARDS, i)).filter(Boolean) : shuffle(EVENT_CARDS),
      expense: s.decks.expense.map(i => cardAt(EXPENSE_CARDS, i)).filter(Boolean),
      bonus: s.decks.bonus.map(i => cardAt(BONUS_CARDS, i)).filter(Boolean),
      baby: s.decks.baby.map(i => cardAt(BABY_CARDS, i)).filter(Boolean),
    },
    event: s.event || null,
    log: [],
  };

  if (game.daily && game.seed) useSeededRng(game.seed);

  // never resume onto a bankrupt player
  if (game.players[game.current].bankrupt && game.players.some(x => !x.bankrupt)) {
    let guard = 0;
    do { game.current = (game.current + 1) % game.players.length; } while (game.players[game.current].bankrupt && guard++ < game.players.length);
  }

  buildTokens(players);
  (s.log || []).forEach(m => log(m));
  hide('setup-modal');
  $('roll-btn').disabled = false;
  busy = false;
  renderAll();
  log('Game resumed from a saved game.');
  log(`Turn ${game.turn}: ${currentPlayer().name}'s move (${currentPlayer().job.name}).`);
  if (game.winner) return;
  currentPlayer().isHuman ? promptStart() : takeTurn();
}

function setupResume() {
  const wrap = $('resume-wrap');
  if (!wrap || !loadSave()) return;
  wrap.innerHTML = '<button id="resume-btn" class="btn ok">Continue Saved Game</button>';
  $('resume-btn').addEventListener('click', resumeGame);
}

function promptStart() {
  const goal = game.mode === 'turns'
    ? `Biggest net worth wins after ${game.maxTurns} turns.`
    : game.mode === 'networth'
      ? `First player to reach ${fmt(NET_WORTH_GOAL)} net worth wins.`
      : `Build <b>passive income greater than expenses</b> to escape the Rat Race.`;
  showInfo(`Your turn, ${currentPlayer().name}!`,
    `You are a <b>${currentPlayer().job.name}</b> earning ${fmt(currentPlayer().salary)}/month with ${fmt(currentPlayer().expenses)} in expenses.<br><br>` +
    `Your mission: ${goal}<br><br>Roll the dice!`,
    ['Roll Dice'], true);
}

/* ---------------- turn loop ---------------- */
async function takeTurn() {
  busy = true;
  const p = currentPlayer();
  $('roll-btn').disabled = true;
  renderAll();
  if (p.ai) {
    await sleep(aiDelay());
    if (aiDifficultyLevel() === 'hard') aiManagePortfolio(p);
  }

  await roll(p);

  if (game.winner) { renderAll(); return; }

  // next player — skip any player who went bankrupt
  let guard = 0;
  do {
    game.current = (game.current + 1) % game.players.length;
  } while (game.players[game.current].bankrupt && game.players.some(x => !x.bankrupt) && guard++ < game.players.length);
  game.turn++;
  renderAll();

  if (checkModeWin()) {
    await endGame(game.winner, game.winnerReason);
    return;
  }

  const next = currentPlayer();
  log(`Turn ${game.turn}: ${next.name}'s move (${next.job.name}).`);

  if (next.doubleRoll) {
    next.doubleRoll = false;
    if (next.isHuman) await showInfo('Charity Bonus!', 'Your generosity pays back — you roll twice this turn!', ['OK']);
    else log(`${next.name} uses their charity bonus roll.`);
  }

  busy = false;
  saveGame();
  if (game.winner) return;
  if (next.ai) { takeTurn(); } else { $('roll-btn').disabled = false; renderAll(); }
}

async function roll(p) {
  let d1, d2;
  if (game.daily && game.seed) {
    // daily challenge dice are seeded per (turn, player) so a rerun plays the same
    const r = mulberry32(hashString(game.seed + ':' + game.turn + ':' + p.color));
    d1 = Math.floor(r() * 6) + 1;
    d2 = Math.floor(r() * 6) + 1;
  } else {
    d1 = rand(6) + 1;
    d2 = rand(6) + 1;
  }
  const sum = d1 + d2;
  renderDice(d1, d2);
  sfx.roll();
  log(`${p.name} rolls ${d1} + ${d2} = ${sum}.`);
  $('dice').classList.add('rolling');
  await sleep(700);
  $('dice').classList.remove('rolling');

  // movement
  for (let i = 0; i < sum; i++) {
    p.position = (p.position + 1) % BOARD_SIZE;
    placeToken(p);
    await sleep(240);
  }
  await land(p);
}

/* ---------------- space landing ---------------- */
async function land(p) {
  const type = BOARD_TYPES[p.position];
  const info = SPACE_INFO[type];
  log(`>> ${p.name} lands on ${info.label}.`, true);
  switch (type) {
    case 'payday': await onPayday(p); break;
    case 'opportunity': await onOpportunity(p); break;
    case 'market': await onMarket(p); break;
    case 'expense': await onExpense(p); break;
    case 'tax': await onTax(p); break;
    case 'bonus': await onBonus(p); break;
    case 'baby': await onBaby(p); break;
    case 'downsized': await onDownsized(p); break;
    case 'charity': await onCharity(p); break;
    case 'career': await onCareer(p); break;
  }
  renderAll();
}

function checkEscape(p) {
  if (p.passiveIncome > p.expenses) {
    p.escaped = true;
    if (game.mode === 'race' || !game.mode) game.winner = p;
    return true;
  }
  return false;
}

const NET_WORTH_GOAL = 100000;

/* Win modes other than the classic race: turns and net-worth goals. */
function checkModeWin() {
  if (game.mode === 'turns' && game.turn > game.maxTurns) {
    const alive = game.players.filter(x => !x.bankrupt);
    if (alive.length) {
      alive.sort((a, b) => netWorth(b) - netWorth(a));
      game.winner = alive[0];
      game.winnerReason = 'turns';
    }
    return game.winner;
  }
  if (game.mode === 'networth') {
    const champ = game.players.find(x => !x.bankrupt && netWorth(x) >= NET_WORTH_GOAL);
    if (champ) {
      game.winner = champ;
      game.winnerReason = 'networth';
    }
    return game.winner;
  }
  return null;
}

async function onPayday(p) {
  if (p.downsized > 0) {
    p.downsized--;
    const restored = p.downsized === 0;
    if (restored) p.salary = p.baseSalary;
    const msg = restored
      ? 'You found a new job! Full salary returns next payday.'
      : 'You are on half pay while job-hunting.';
    if (p.isHuman) await showInfo('PAYDAY — Half Pay', msg, ['OK']);
    else log(msg);
  }
  let salary = p.salary;
  let passive = p.passiveIncome;
  if (game.event && game.event.passiveMult) {
    passive = Math.round(p.passiveIncome * game.event.passiveMult);
  }

  const net = salary - p.expenses + passive;
  p.cash += net;
  p.totalPassiveEarned += passive;
  sfx.coin();

  // the emergency fund earns 1% interest per payday
  const fundInterest = Math.round((p.emergencyFund || 0) * 0.01);
  if (fundInterest > 0) p.emergencyFund += fundInterest;

  if (p.cash < 0) await handleDebt(p);

  // ongoing global events decay on each payday
  if (game.event && game.event.turnsLeft != null) {
    game.event.turnsLeft--;
    if (game.event.turnsLeft <= 0) {
      log(`The effects of "${game.event.title}" end.`);
      game.event = null;
    }
  }

  const escaped = checkEscape(p);

  // record the passive-vs-expenses gap for the portfolio chart
  p.history = p.history || [];
  p.history.push({ passive, expenses: p.expenses });
  if (p.history.length > 24) p.history.shift();

  const html =
    `<div class="st">Salary +${fmt(salary)}</div>` +
    (passive > 0 ? `<div class="st green">Passive income +${fmt(passive)}</div>` : '') +
    (game.event && game.event.passiveMult ? `<div class="st red">Active event: ${game.event.title}</div>` : '') +
    `<div class="st red">Expenses -${fmt(p.expenses)}</div>` +
    (fundInterest > 0 ? `<div class="st green">Emergency fund interest +${fmt(fundInterest)}</div>` : '') +
    `<div class="st"><b>Cash now: ${fmt(p.cash)}</b></div>` +
    `<div class="tip">${escaped ? 'Passive income beats expenses — you did it!' : 'Collect your salary, pay your bills, and pocket your passive income. Every payday is a lesson in cash flow.'}</div>`;

  if (p.isHuman) {
    const title = escaped ? 'PAYDAY — ESCAPED THE RAT RACE!' : 'PAYDAY';
    await showInfo(title, html, ['OK']);
  } else {
    log(`${p.name} gets paid: cash ${fmt(p.cash)}.`);
  }

  if (escaped && (game.mode === 'race' || !game.mode)) await endGame(p);
}

async function handleDebt(p) {
  const worst = () => {
    let w = null, r = -1;
    p.assets.forEach(a => {
      const ratio = a.monthly > 0 ? a.value / a.monthly : Infinity;
      if (ratio > r) { r = ratio; w = a; }
    });
    return w;
  };

  // Human players choose their fate; AIs quietly liquidate then restructure.
  if (p.isHuman) {
    // Painless fix first: sell one asset at full value when that covers the deficit.
    const cover = worst();
    if (cover && p.cash + cover.value >= 0) {
      p.cash += cover.value;
      p.passiveIncome -= cover.monthly;
      p.assets = p.assets.filter(x => x !== cover);
      p.bankruptcies++;
      log(`${p.name} sold ${cover.name} for ${fmt(cover.value)} to cover bills.`);
      return;
    }
    const html = `
      <div class="card-title">Bankruptcy!</div>
      <div class="card-desc">Your cash is below zero and you cannot cover your bills. Choose how to respond:</div>
      <div class="tip">Fire-sale: liquidate everything now at half price.<br>Restructure: keep your assets, clear your loans and reset your lifestyle.<br>Retire: leave the game and become a spectator.</div>`;
    const choice = await showInfo('Bankruptcy', html, [
      { v: 'firesale', label: 'Fire-sale assets (50%)', cls: 'ok' },
      { v: 'restructure', label: 'Restructure debt', cls: 'ok' },
      { v: 'retire', label: 'Retire (spectate)', cls: 'cancel' }]);
    if (choice === 'retire') {
      retire(p);
      await checkElimination();
      return;
    }
    if (choice === 'firesale') {
      fireSaleAll(p);
      if (p.cash >= 0) {
        p.bankruptcies++;
        log(`${p.name} fire-sold their assets at half price to survive.`);
        return;
      }
    }
    restructure(p);
    return;
  }

  // AI path — sell assets at full value until covered, otherwise restructure.
  let guard = 0;
  while (p.cash < 0 && p.assets.length && guard++ < 40) {
    const a = worst();
    if (!a) break;
    p.cash += a.value;
    p.passiveIncome -= a.monthly;
    p.assets = p.assets.filter(x => x !== a);
    p.bankruptcies++;
    log(`${p.name} sells ${a.name} to cover bills.`);
  }
  if (p.cash < 0) restructure(p);
}

/* Sell every asset immediately at half its value. */
function fireSaleAll(p) {
  const sold = p.assets.slice();
  sold.forEach(a => {
    const val = Math.round(a.value * 0.5);
    p.cash += val;
    p.passiveIncome -= a.monthly;
    p.assets = p.assets.filter(x => x !== a);
    p.bankruptcies++;
    log(`${p.name} fire-sells ${a.name} for ${fmt(val)}.`);
  });
}

/* Keep assets, clear loans and reset the lifestyle to the base level. */
function restructure(p) {
  p.loans = [];
  p.expenseItems = [{ name: LIVING_EXPENSE_NAME, monthly: p.baseExpenses }];
  recalcExpenses(p);
  p.salary = p.baseSalary;
  p.cash = 200;
  p.bankruptcies++;
  p.credit = Math.max(400, Math.round((p.credit || 700) - 150));
  if (p.isHuman) log(`${p.name} restructures: loans cleared and lifestyle reset to ${fmt(p.expenses)}/mo. Credit drops to ${p.credit}.`);
  else log(`${p.name} restructures their debt.`);
  saveGame();
}

/* Eliminate a player: they become a spectator and leave the turn rotation. */
function retire(p) {
  p.bankrupt = true;
  p.cash = 0;
  p.assets = [];
  p.loans = [];
  p.passiveIncome = 0;
  p.emergencyFund = 0;
  p.expenseItems = [];
  p.expenses = 0;
  if (p.isHuman) log(`${p.name} declares bankruptcy and becomes a spectator.`);
  else log(`${p.name} goes bankrupt and leaves the game.`);
  saveGame();
}

/* After an elimination, someone may win by being the last player standing. */
async function checkElimination() {
  const active = game.players.filter(x => !x.bankrupt);
  if (active.length === 0) {
    clearSave();
    await showInfo('Game Over', 'Every player went bankrupt. Nobody escaped the Rat Race this time — the game is over.', ['OK']);
    return true;
  }
  if (active.length === 1) {
    await endGame(active[0], 'last');
    return true;
  }
  return false;
}

function recalcExpenses(p) {
  const loanInterest = p.loans.reduce((s, l) => s + l.monthly, 0);
  p.expenses = p.expenseItems.reduce((s, it) => s + it.monthly, 0) + loanInterest;
}

function addMonthlyExpense(p, amt, name) {
  const cap = Math.round(p.baseExpenses * 0.25);
  const extra = p.expenses - p.baseExpenses;
  if (extra >= cap) return 0;
  const add = Math.round(Math.min(amt, cap - extra));
  if (add > 0) {
    p.expenseItems.push({ name, monthly: add });
    recalcExpenses(p);
  }
  return add;
}

/* Pay a surprise cost: the emergency fund absorbs it first, cash covers the rest. */
function payCost(p, amount) {
  const fromFund = Math.min(p.emergencyFund || 0, amount);
  p.emergencyFund = (p.emergencyFund || 0) - fromFund;
  p.cash -= (amount - fromFund);
  return { fromFund, fromCash: amount - fromFund };
}

/* Top up the emergency fund, up to a sensible target (3x monthly expenses). */
function fundTarget(p) {
  return Math.round((p.expenses || p.baseExpenses) * 3);
}

function depositEmergency(p, amount) {
  const amt = Math.min(Math.round(amount), Math.max(0, p.cash));
  if (amt <= 0) return 0;
  p.cash -= amt;
  p.emergencyFund = (p.emergencyFund || 0) + amt;
  return amt;
}

function withdrawEmergency(p, amount) {
  const amt = Math.min(Math.round(amount), p.emergencyFund || 0);
  if (amt <= 0) return 0;
  p.emergencyFund -= amt;
  p.cash += amt;
  return amt;
}

function scaleIncome(p, n) {
  const salary = p.salary > 0 ? p.salary : p.job.salary;
  const factor = Math.max(0.25, Math.min(1.5, salary / 2000));
  return Math.max(20, Math.round(n * factor));
}

/* Credit score drives interest: good credit borrows cheaper, bad credit pays more. */
function rateFor(p) {
  const c = p.credit ?? 700;
  if (c >= 750) return 0.075;
  if (c < 650) return 0.09;
  return 0.08;
}

const LOAN_OPTIONS = [
  { amount: 500,  kind: 'standard', label: '$500' },
  { amount: 1000, kind: 'standard', label: '$1000' },
  { amount: 2000, kind: 'standard', label: '$2000' },
  { amount: 1500, kind: 'interestOnly', label: '$1500 · interest-only' },
];

function loanMonthly(p, opt) {
  return opt.kind === 'interestOnly'
    ? Math.round(opt.amount * 0.05)
    : Math.round(opt.amount * rateFor(p));
}

function loanSettleCost(loan) {
  // Interest-only loans were never paid down — settling costs a 20% premium.
  return loan.kind === 'interestOnly' ? Math.round(loan.principal * 1.2) : loan.principal;
}

function takeLoan(p, amount) {
  const opt = LOAN_OPTIONS.find(o => o.amount === amount) || LOAN_OPTIONS[1];
  const monthly = loanMonthly(p, opt);
  p.cash += opt.amount;
  p.loans.push({ principal: opt.amount, monthly: monthly, kind: opt.kind });
  recalcExpenses(p);
  saveGame();
  return { ...opt, monthly };
}

function repayLoan(p, loan) {
  const cost = loanSettleCost(loan);
  if (p.cash >= cost) {
    p.cash -= cost;
    p.loans = p.loans.filter(l => l !== loan);
    p.credit = Math.min(850, (p.credit || 700) + 10);
    recalcExpenses(p);
    saveGame();
    return true;
  }
  return false;
}

function drawCat(cat) {
  const deck = game.decks.oppByCat[cat];
  if (!deck.length) game.decks.oppByCat[cat] = shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === cat));
  return game.decks.oppByCat[cat].shift();
}

function paybackMonths(card) {
  const cost = card.cost != null ? card.cost : (card.value || 0);
  return card.monthly > 0 ? Math.ceil(cost / card.monthly) : 0;
}

function paybackRating(card) {
  const mo = paybackMonths(card);
  if (mo <= 0) return { label: 'No return', cls: 'pr-slow' };
  if (mo <= 12) return { label: 'Great deal', cls: 'pr-great' };
  if (mo <= 24) return { label: 'Good deal', cls: 'pr-good' };
  if (mo <= 48) return { label: 'Fair deal', cls: 'pr-fair' };
  return { label: mo + 'mo payback', cls: 'pr-slow' };
}

function paybackBadge(card) {
  const r = paybackRating(card);
  return `<span class="payback-badge ${r.cls}" title="Pays for itself in ${paybackMonths(card)} months">${r.label}</span>`;
}

function sellAsset(p, a) {
  p.cash += a.value;
  p.passiveIncome -= a.monthly;
  p.assets = p.assets.filter(x => x !== a);
  sfx.coin();
  log(`${p.name} sells ${a.name} for ${fmt(a.value)}.`);
  renderAll();
  saveGame();
}

async function onOpportunity(p) {
  // draw today's market: one offer per category
  const offers = DEAL_CATS.map(dc => ({ dc, card: drawCat(dc.cat) }));

  if (p.isHuman) {
    const renderMarket = () => {
      const buyRows = offers.map((o, i) => {
        const card = o.card;
        const affordable = p.cash >= card.cost;
        return `
      <div class="deal-row">
        <div class="deal-info">
          <b>${card.title}</b>
          ${paybackBadge(card)}
          <span class="deal-sub">${o.dc.label} · Cost ${fmt(card.cost)} · +${fmt(card.monthly)}/mo · Payback ${paybackMonths(card)} mo</span>
        </div>
        <button class="btn small ok" data-buy="${i}" ${affordable ? '' : 'disabled'}>Buy</button>
      </div>`;
      }).join('');
      const owned = [];
      DEAL_CATS.forEach(dc => p.assets.filter(a => a.cat === dc.cat).forEach(a => owned.push({ a, dc })));
      const sellRows = owned.map(({ a, dc }) => `
      <div class="deal-row">
        <div class="deal-info">
          <b>${a.name}</b>
          <span class="deal-sub">Sell ${dc.label} · ${fmt(a.value)}</span>
        </div>
        <button class="btn small sell" data-sell="${a.name}">Sell</button>
      </div>`).join('');
      $('card-body').innerHTML = `
        <h2>Deal of the Day</h2>
        <div class="deal-cash">Your cash: <b>${fmt(p.cash)}</b></div>
        <p class="card-desc">Buy any offer you can afford — you may make several deals. Pass when you're done.</p>
        ${buyRows}
        ${sellRows ? `<h3>Sell your assets</h3>${sellRows}` : ''}
        <div class="tip"><b>Lesson:</b> ${LESSONS.payback} Compare the payback of every offer before you buy.</div>`;
      $('card-body').querySelectorAll('[data-buy]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = +btn.dataset.buy;
          const o = offers[i];
          if (p.cash < o.card.cost) return;
          buyAsset(p, o.card);
          offers.splice(i, 1);
          renderMarket();
        });
      });
      $('card-body').querySelectorAll('[data-sell]').forEach(btn => {
        btn.addEventListener('click', () => {
          const a = p.assets.find(x => x.name === btn.dataset.sell);
          if (!a) return;
          sellAsset(p, a);
          renderMarket();
        });
      });
    };
    renderMarket();
    $('card-actions').innerHTML = `<button class="btn cancel" data-v="pass">Pass</button>`;
    show('card-modal');
    $('card-actions').querySelector('[data-v="pass"]').addEventListener('click', () => {
      hide('card-modal'); if (resolver) resolver('pass');
    });
    await new Promise((res) => { resolver = res; });
  } else {
    const bought = aiPickDeals(p, offers);
    if (!bought.length) log(`${p.name} passes on today's deals.`);
  }
}

/* ---------------- AI difficulty ---------------- */
function aiDifficultyLevel() {
  return (game && game.difficulty) || 'medium';
}

/* AI turn speed: Easy players think slowly, Hard players snap into action. */
function aiDelay() {
  switch (aiDifficultyLevel()) {
    case 'easy': return 1200;
    case 'hard': return 400;
    default: return 700;
  }
}

function aiSellThreshold() {
  switch (aiDifficultyLevel()) {
    case 'easy': return 1.1;   // sells almost any business
    case 'hard': return 2.2;   // only sells for a big premium
    default: return 1.5;
  }
}

/* Decide which deals an AI buys, based on difficulty. Returns bought cards. */
function aiPickDeals(p, offers) {
  const diff = aiDifficultyLevel();
  const picked = [];

  if (diff === 'easy') {
    // Impulsive: no reserve, no value sense — buys any affordable offer.
    const affordable = offers.filter(o => o.card.monthly > 0 && p.cash >= o.card.cost);
    if (affordable.length) picked.push(pick(affordable).card);
    if (picked.length) buyAsset(p, picked[0]);
    return picked;
  }

  const reserve = Math.max(200, Math.min(2500, Math.round(p.expenses * 0.3)));

  if (diff === 'hard') {
    // Strategic: hunts short paybacks, buys up to two deals, uses good debt.
    const ranked = offers
      .filter(o => o.card.monthly > 0 && paybackMonths(o.card) <= 60)
      .sort((x, y) => paybackMonths(x.card) - paybackMonths(y.card) || y.card.monthly - x.card.monthly);
    for (let i = 0; i < ranked.length && picked.length < 2; i++) {
      const o = ranked[i];
      if (p.cash >= o.card.cost + reserve) {
        buyAsset(p, o.card);
        picked.push(o.card);
      }
    }
    if (!picked.length) {
      // No deal affordable with a reserve — borrow for an outstanding deal.
      const great = offers
        .filter(o => o.card.monthly > 0 && paybackMonths(o.card) <= 36 && o.card.cost <= p.cash + 1000)
        .sort((x, y) => paybackMonths(x.card) - paybackMonths(y.card))[0];
      if (great && p.loans.length < 3) {
        takeLoan(p);
        log(`${p.name} takes a $1,000 loan to fund a great deal.`);
        buyAsset(p, great.card);
        picked.push(great.card);
      }
    }
    return picked;
  }

  // medium — sensible: keeps a reserve and only buys a fast payback.
  const buyable = offers
    .filter(o => o.card.monthly > 0 && p.cash >= o.card.cost + reserve && paybackMonths(o.card) <= 90)
    .sort((x, y) => paybackMonths(x.card) - paybackMonths(y.card) || y.card.monthly - x.card.monthly);
  if (buyable.length) {
    buyAsset(p, buyable[0].card);
    picked.push(buyable[0].card);
  }
  return picked;
}

/* Hard AI tidies its balance sheet: repays loans when it has spare cash. */
function aiManagePortfolio(p) {
  const loans = p.loans.slice();
  for (const l of loans) {
    if (p.cash >= l.principal + Math.round(p.expenses)) {
      repayLoan(p, l);
      log(`${p.name} repays a bank loan to boost cash flow.`);
    }
  }
}

function buyAsset(p, card) {
  p.cash -= card.cost;
  p.passiveIncome += card.monthly;
  p.investmentsBought++;
  p.assets.push({
    name: card.title,
    cat: card.cat,
    cost: card.cost,
    value: card.value,
    monthly: card.monthly,
  });
  sfx.buy();
  log(`${p.name} buys ${card.title}. Passive income now ${fmt(p.passiveIncome)}/mo.`);
  renderAll();
  saveGame();
}

async function onMarket(p) {
  // A global event can hit the whole table instead of a normal market card.
  if (rand(3) === 0 && game.decks.event.length) {
    await applyEvent(game.decks.event.shift(), p);
    renderAll();
    saveGame();
    return;
  }
  const deck = game.decks.market;
  const card = deck.length ? deck.shift() : (deck.push(...shuffle(MARKET_CARDS)), deck.shift());
  card.apply(p);
  const owns = p.assets.length > 0;
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc}</div>
    <div class="tip"><b>Lesson:</b> ${owns
      ? 'Market values move up and down. Long-term investors stay calm and keep building assets.'
      : 'You own no assets yet, so this market barely touches you. Assets = exposure to markets.'}</div>`;
  if (p.isHuman) await showInfo('Market News', html, ['OK']);
  else log(`${p.name} reads market news: ${card.title}.`);
  if (p._buyoutOffer) {
    delete p._buyoutOffer;
    const biz = p.assets.filter(a => a.cat === 'business');
    if (biz.length && p.isHuman) {
      const target = biz[biz.length - 1];
      const offer = target.value * 2;
      const action = await ask('Business Buyout', `A big company offers ${fmt(offer)} for <b>${target.name}</b> (currently generating ${fmt(target.monthly)}/mo). Sell?`, [
        { v: 'yes', label: `Sell for ${fmt(offer)}`, cls: 'ok' },
        { v: 'no', label: 'Keep it', cls: 'cancel' }]);
      if (action === 'yes') {
        p.cash += offer;
        p.passiveIncome -= target.monthly;
        p.assets = p.assets.filter(a => a !== target);
        sfx.coin();
        log(`${p.name} sells ${target.name} for ${fmt(offer)}.`);
      }
    } else if (biz.length) {
      const target = biz[biz.length - 1];
      const offer = target.value * 2;
      if (offer >= target.value * aiSellThreshold()) {
        p.cash += offer;
        p.passiveIncome -= target.monthly;
        p.assets = p.assets.filter(a => a !== target);
        log(`${p.name} accepts a buyout of ${target.name} for ${fmt(offer)}.`);
      }
    }
    renderAll();
  }
}

/* Apply a global event to every active player (and the landing player). */
async function applyEvent(card, trigger) {
  const targets = game.players.filter(x => !x.bankrupt);
  if (card.ongoing) {
    game.event = {
      title: card.title,
      desc: card.desc,
      turnsLeft: card.turnsLeft || 2,
      passiveMult: card.passiveMult,
    };
  } else if (card.cat && card.mult) {
    targets.forEach(x => x.assets.forEach(a => { if (a.cat === card.cat) a.value = Math.round(a.value * card.mult); }));
  } else if (card.monthlyMult) {
    targets.forEach(x => x.loans.forEach(l => { if (l.kind !== 'interestOnly') l.monthly = Math.round(l.monthly * card.monthlyMult); }));
    targets.forEach(x => recalcExpenses(x));
  } else if (card.cost) {
    for (const x of targets) {
      const amt = scaleIncome(x, card.cost);
      payCost(x, amt);
      if (x.cash < 0) await handleDebt(x);
      sfx.bad();
    }
  } else if (card.cash) {
    targets.forEach(x => { x.cash += scaleIncome(x, card.cash); sfx.coin(); });
  }
  sfx.win();
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc}</div>
    <div class="tip"><b>Lesson:</b> ${card.lesson}</div>`;
  if (trigger.isHuman) await showInfo('Global Event', html, ['OK']);
  else log(`Global event: ${card.title} hits the whole table.`);
}

async function onExpense(p) {
  const deck = game.decks.expense;
  const card = deck.length ? deck.shift() : (deck.push(...shuffle(EXPENSE_CARDS)), deck.shift());
  const cost = scaleIncome(p, card.cash);
  const { fromFund } = payCost(p, cost);
  if (p.cash < 0) await handleDebt(p);
  sfx.bad();
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc}</div>
    <div class="card-stats"><div><span>Cost</span><b>-${fmt(cost)}</b></div></div>
    ${fromFund > 0 ? `<div class="card-stats"><div><span>Covered by emergency fund</span><b class="green">${fmt(fromFund)}</b></div></div>` : ''}
    <div class="tip"><b>Lesson:</b> ${card.lesson}</div>`;
  if (p.isHuman) await showInfo('Surprise Expense', html, ['OK']);
  else log(`${p.name} pays ${fmt(cost)} for ${card.title}${fromFund > 0 ? ` (${fmt(fromFund)} from emergency fund)` : ''}.`);
}

async function onTax(p) {
  const tax = taxOn(p.salary);
  p.cash -= tax;
  if (p.cash < 0) await handleDebt(p);
  p.totalTaxPaid += tax;
  sfx.bad();
  const html = `
    <div class="card-title">Tax Time</div>
    <div class="card-desc">Taxes fund roads, schools and hospitals. You owe <b>${fmt(tax)}</b> — a progressive 10% to 32% on the portions of your ${fmt(p.salary)} salary above each bracket.</div>
    <div class="tip"><b>Lesson:</b> ${LESSONS.tax} Income in higher brackets is taxed more, so plan around promotions.</div>`;
  if (p.isHuman) await showInfo('Taxes', html, ['OK']);
  else log(`${p.name} pays ${fmt(tax)} in taxes.`);
}

/* Progressive tax on monthly salary: each bracket is taxed only on the amount above its floor. */
const TAX_BRACKETS = [
  { floor: 0,    rate: 0.10 },
  { floor: 800,  rate: 0.15 },
  { floor: 2000, rate: 0.22 },
  { floor: 5000, rate: 0.32 },
];

function taxOn(salary) {
  let tax = 0;
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const b = TAX_BRACKETS[i];
    const next = TAX_BRACKETS[i + 1] ? TAX_BRACKETS[i + 1].floor : Infinity;
    const cap = Math.min(salary, next);
    if (cap > b.floor) tax += (cap - b.floor) * b.rate;
  }
  return Math.max(40, Math.round(tax));
}

async function onBonus(p) {
  const deck = game.decks.bonus;
  const card = deck.length ? deck.shift() : (deck.push(...shuffle(BONUS_CARDS)), deck.shift());
  const gain = scaleIncome(p, card.cash);
  p.cash += gain;
  sfx.coin();
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc} <b>+${fmt(gain)}</b></div>
    <div class="tip"><b>Lesson:</b> ${card.lesson}</div>`;
  if (p.isHuman) await showInfo('Windfall', html, ['OK']);
  else log(`${p.name} gains ${fmt(gain)} (${card.title}).`);
}

async function onBaby(p) {
  const deck = game.decks.baby;
  const card = deck.length ? deck.shift() : (deck.push(...shuffle(BABY_CARDS)), deck.shift());
  const hospital = scaleIncome(p, card.cash);
  const { fromFund } = payCost(p, hospital);
  if (p.cash < 0) await handleDebt(p);
  const added = addMonthlyExpense(p, card.monthly, card.title);
  sfx.bad();
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc}<br>Hospital bill <b>-${fmt(hospital)}</b>, family expenses <b>+${fmt(added)}/mo</b>.</div>
    ${fromFund > 0 ? `<div class="card-stats"><div><span>Covered by emergency fund</span><b class="green">${fmt(fromFund)}</b></div></div>` : ''}
    <div class="tip"><b>Lesson:</b> ${card.lesson}</div>`;
  if (p.isHuman) await showInfo('Growing Family', html, ['OK']);
  else log(`${p.name}'s family grows: +${fmt(added)}/mo expenses.`);
}

async function onDownsized(p) {
  p.downsized = 2;
  p.salary = Math.round(p.baseSalary * 0.5);
  sfx.bad();
  const html = `
    <div class="card-title">Job Loss!</div>
    <div class="card-desc">Your employer shuts down. You drop to <b>half pay</b> for the next 2 paydays.</div>
    <div class="tip"><b>Lesson:</b> ${LESSONS.emergency} You must survive on savings and passive income.</div>`;
  if (p.isHuman) await showInfo('Downsized', html, ['OK']);
  else log(`${p.name} loses their job — half pay for 2 paydays!`);
  renderAll();
}

async function onCharity(p) {
  const give = Math.min(2000, Math.max(50, Math.round(p.cash * 0.1)));
  p.cash -= give;
  if (p.cash < 0) await handleDebt(p);
  p.totalCharity += give;
  sfx.coin();
  p.doubleRoll = true;
  const html = `
    <div class="card-title">Giving</div>
    <div class="card-desc">You donate <b>${fmt(give)}</b> (10% of your cash) to help others. You earn a <b>bonus roll</b> next turn.</div>
    <div class="tip"><b>Lesson:</b> Generosity trains gratitude and keeps money flowing. The good you do often returns.</div>`;
  if (p.isHuman) await showInfo('Charity', html, ['OK']);
  else log(`${p.name} donates ${fmt(give)} to charity.`);
  renderAll();
}

/* ---------------- career / promotion ---------------- */
function careerInfo(p) {
  const tier = Math.min(p.careerTier || 0, CAREER_TIERS.length - 1);
  return CAREER_TIERS[tier];
}

/* Advance a player one career tier: higher salary, slightly higher expenses, a bonus. Returns the result or null at the top of the ladder. */
function promotePlayer(p) {
  if ((p.careerTier || 0) >= CAREER_TIERS.length - 1) return null;
  p.careerTier++;
  const tier = careerInfo(p);
  const prevSalary = p.salary;
  const prevExp = p.expenses;
  const newBase = Math.round(p.job.salary * tier.salaryMult);
  p.baseSalary = newBase;
  if (p.downsized === 0) p.salary = newBase;
  const oldBaseExp = p.baseExpenses || p.job.expenses;
  const newBaseExp = Math.round(p.job.expenses * tier.expenseMult);
  const living = p.expenseItems.find(it => it.name === LIVING_EXPENSE_NAME);
  if (living && oldBaseExp > 0) {
    living.monthly = Math.max(0, Math.round(living.monthly * (newBaseExp / oldBaseExp)));
  }
  p.baseExpenses = newBaseExp;
  recalcExpenses(p);
  const bonus = scaleIncome(p, 400);
  p.cash += bonus;
  return { tier, prevSalary, newSalary: p.salary, prevExp, newExp: p.expenses, bonus };
}

async function onCareer(p) {
  const maxed = (p.careerTier || 0) >= CAREER_TIERS.length - 1;
  if (maxed) {
    const bonus = scaleIncome(p, 300);
    p.cash += bonus;
    sfx.coin();
    const html = `
      <div class="card-title">Top of your career</div>
      <div class="card-desc">You are already an <b>${careerInfo(p).name}</b> — the board cannot promote you any further. Your experience pays off: <b>+${fmt(bonus)}</b>.</div>
      <div class="tip"><b>Lesson:</b> ${LESSONS.promote}</div>`;
    if (p.isHuman) await showInfo('Career', html, ['OK']);
    else log(`${p.name} tops out their career and banks ${fmt(bonus)}.`);
    renderAll();
    return;
  }
  const r = promotePlayer(p);
  sfx.win();
  const html = `
    <div class="card-title">You've been promoted!</div>
    <div class="card-desc">Hard work pays off — you are now a <b>${r.tier.name}</b>.</div>
    <div class="card-stats">
      <div><span>Salary</span><b class="green">${fmt(r.prevSalary)} → ${fmt(r.newSalary)}/mo</b></div>
      <div><span>Expenses</span><b class="red">${fmt(r.prevExp)} → ${fmt(r.newExp)}/mo</b></div>
      <div><span>Bonus</span><b class="green">+${fmt(r.bonus)}</b></div>
    </div>
    <div class="tip"><b>Lesson:</b> ${LESSONS.promote}</div>`;
  if (p.isHuman) await showInfo('Career', html, ['OK']);
  else log(`${p.name} is promoted to ${r.tier.name} (salary ${fmt(r.newSalary)}/mo).`);
  renderAll();
}

/* ---------------- end of game ---------------- */
async function endGame(w, reason) {
  sfx.win();
  clearSave();
  showConfetti();
  const winnerHtml = `
    <div class="win-avatar" style="background:${w.color}">${w.name.charAt(0).toUpperCase()}</div>
    <h2>${reason === 'last' ? `${w.name} is the last one standing!`
      : reason === 'turns' ? `${w.name} wins by net worth!`
      : reason === 'networth' ? `${w.name} reached the net-worth goal!`
      : `${w.name} escaped the Rat Race!`}</h2>
    <p>${reason === 'last'
      ? `All rivals went bankrupt. ${w.name} survives the Rat Race.`
      : reason === 'turns'
        ? `After ${game.maxTurns} turns, ${w.name} has the biggest net worth on the board.`
        : reason === 'networth'
          ? `${w.name} crossed <b>${fmt(NET_WORTH_GOAL)}</b> in net worth before anyone else.`
          : `${w.name} built <b>${fmt(w.passiveIncome)}/month</b> in passive income — enough to cover <b>${fmt(w.expenses)}/month</b> in expenses.`}</p>
    <div class="st">Net worth: <b>${fmt(netWorth(w))}</b> · Assets: <b>${w.assets.length}</b> · Cash: <b>${fmt(w.cash)}</b></div>
    <div class="tip">"${pick(WIN_TIPS)}"</div>
    <h3>Scoreboard</h3>
    <div class="scoreboard">
      ${game.players.map(p =>
        `<div class="sb-row ${p === w ? 'sb-win' : ''}"><span class="sb-dot" style="background:${p.color}"></span><b>${p.name}</b>` +
        (p === w ? '<em>Winner</em>' : (p.bankrupt ? '<em>Bankrupt</em>' : (p.escaped ? '<em>Escaped</em>' : '<em>Rat Race</em>'))) +
        `<span>NW ${fmt(netWorth(p))}</span></div>`).join('')}
    </div>
    <div class="tip">Passive earned: ${game.players.map(p => `${p.name} ${fmt(p.totalPassiveEarned)}`).join(' · ') || '—'}</div>`;
  const action = await showInfo('Financial Freedom!', winnerHtml, [
    { v: 'again', label: 'Play Again', cls: 'ok' },
    { v: 'close', label: 'Keep Watching', cls: 'cancel' }], true);
  if (action === 'again') location.reload();
}

/* ---------------- net worth ---------------- */
function netWorth(p) {
  const assets = p.assets.reduce((s, a) => s + a.value, 0);
  const loans = p.loans.reduce((s, l) => s + l.principal, 0);
  return p.cash + (p.emergencyFund || 0) + assets - loans;
}

/* ---------------- rendering ---------------- */
function renderAll() {
  renderCenter();
  renderPanel();
  renderTokens();
}

function renderTokens() {
  game && game.players.forEach(placeToken);
}

function renderCenter() {
  if (!game) return;
  const p = currentPlayer();
  const c = $('center');
  const cashflow = p.salary - p.expenses + p.passiveIncome;
  c.innerHTML = `
    <div class="ctop">
      <div class="cavatar" style="background:${p.color}">${p.name.charAt(0).toUpperCase()}</div>
      <div class="cname"><b>${p.name}</b><span>${p.job.name}${p.ai ? ' · AI' : ''}${(p.careerTier || 0) > 0 ? ' · ' + careerInfo(p).name : ''}</span></div>
      <div class="ccash">Cash <b>${fmt(p.cash)}</b></div>
    </div>
    <div class="cincome">
      <div class="st"><span>Active income (salary)</span><b class="green">+${fmt(p.salary)}</b></div>
      <div class="st"><span>Passive income</span><b class="green">+${fmt(p.passiveIncome)}</b></div>
      <div class="st"><span>Expenses</span><b class="red">-${fmt(p.expenses)}</b></div>
      <div class="st total ${cashflow >= 0 ? 'green' : 'red'}"><span>Monthly cash flow</span><b>${cashflow >= 0 ? '+' : ''}${fmt(cashflow)}</b></div>
    </div>
    <div class="cnet">Net worth <b>${fmt(netWorth(p))}</b></div>
    ${p.downsized > 0 ? `<div class="cflag red">Unemployed (${p.downsized} more paydays)</div>` : ''}
    ${game.event ? `<div class="cflag event-flag">${game.event.title}${game.event.turnsLeft != null ? ` (${game.event.turnsLeft} payday${game.event.turnsLeft === 1 ? '' : 's'} left)` : ''}</div>` : ''}
    <div class="cgoal">${game.mode === 'turns'
      ? `Goal: biggest net worth after ${game.maxTurns} turns (turn ${game.turn}/${game.maxTurns})`
      : game.mode === 'networth'
        ? `Goal: first to net worth ${fmt(NET_WORTH_GOAL)}`
        : `Goal: passive income &gt; ${fmt(p.expenses)} expenses`}
      <div class="bar"><div class="barfill" style="width:${Math.min(100, Math.round(
        game.mode === 'turns' ? (game.turn / game.maxTurns) * 100
        : game.mode === 'networth' ? (netWorth(p) / NET_WORTH_GOAL) * 100
        : p.expenses ? (p.passiveIncome / p.expenses) * 100 : 0))}%"></div></div>
      <span class="bar-cap">${game.mode === 'turns'
        ? `${game.turn}/${game.maxTurns} turns`
        : game.mode === 'networth'
          ? `${fmt(netWorth(p))} / ${fmt(NET_WORTH_GOAL)}`
          : `${fmt(p.passiveIncome)} / ${fmt(p.expenses)}`}</span>
    </div>`;
}

function renderPanel() {
  if (!game) return;
  const p = currentPlayer();
  const turnSpan = $('turn-info');
  turnSpan.innerHTML = game.players.map((pl, i) =>
    `<span class="mini-tok" style="background:${pl.color}${i === game.current ? ';box-shadow:0 0 0 2px #fff' : ''}">${pl.name.charAt(0).toUpperCase()}</span>${pl.name.slice(0, 8)}`).join(' ');

  const pb = $('portfolio-btn');
  pb.disabled = false;
}

const PIP_LAYOUT = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function renderDice(d1, d2) {
  [d1, d2].forEach((v, i) => {
    const die = $(i === 0 ? 'die1' : 'die2');
    die.innerHTML = '';
    for (let c = 0; c < 9; c++) {
      const pip = document.createElement('i');
      if (PIP_LAYOUT[v].includes(c)) pip.style.display = 'block';
      die.appendChild(pip);
    }
  });
}

function log(msg, highlight) {
  if (!game) return;
  game.log.push(msg);
  const el = $('log');
  const div = document.createElement('div');
  div.className = highlight ? 'log-line log-hl' : 'log-line';
  div.innerHTML = msg;
  el.appendChild(div);
  while (el.children.length > 60) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

/* ---------------- modals ---------------- */
function show(id) { $(id).classList.add('open'); }
function hide(id) { $(id).classList.remove('open'); }

function showInfo(title, html, buttons, noClose) {
  const box = $('card-body');
  box.innerHTML = `<h2>${title}</h2>${html}`;
  $('card-actions').innerHTML = buttons.map((b, i) => {
    const isStr = typeof b === 'string';
    return `<button class="btn ${isStr ? '' : (b.cls || '')}" data-v="${isStr ? i : (b.v || i)}">${isStr ? b : b.label}</button>`;
  }).join('');
  show('card-modal');
  $('card-modal').querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => { hide('card-modal'); if (resolver) resolver(b.dataset.v); }));
  return new Promise((res) => { resolver = res; });
}

function ask(title, html, buttons) {
  return showInfo(title, html, buttons, false);
}

/* ---------------- portfolio ---------------- */
function openPortfolio() {
  const p = currentPlayer();
  const assetsHtml = p.assets.length
    ? p.assets.map((a, i) => `
      <div class="prow2">
        <div class="p2name"><b>${a.name}</b><span>${a.cat} · +${fmt(a.monthly)}/mo</span></div>
        <div class="p2val">${fmt(a.value)}</div>
        <button class="btn small sell" data-sell="${i}">Sell</button>
      </div>`).join('')
    : '<div class="empty">No assets yet. Land on DEAL spaces and invest!</div>';
  const loansHtml = p.loans.length
    ? p.loans.map((l, i) => `
      <div class="prow2">
        <div class="p2name"><b>Bank Loan${l.kind === 'interestOnly' ? ' (interest-only)' : ''}</b><span>interest ${fmt(l.monthly)}/mo</span></div>
        <div class="p2val">${fmt(loanSettleCost(l))}</div>
        <button class="btn small repay" data-repay="${i}">${l.kind === 'interestOnly' ? 'Settle' : 'Repay'}</button>
      </div>`).join('')
    : '<div class="empty">No loans. Good — debt costs money every month.</div>';

  const cashflow = p.salary - p.expenses + p.passiveIncome;
  const loanInterest = p.loans.reduce((s, l) => s + l.monthly, 0);
  const expensesHtml = p.expenseItems.map((it, i) => `
      <div class="prow2">
        <div class="p2name"><b>${it.name}</b><span>monthly cost</span></div>
        <div class="p2val red">-${fmt(it.monthly)}</div>
      </div>`).join('') +
    (loanInterest > 0 ? `
      <div class="prow2">
        <div class="p2name"><b>Bank loan interest</b><span>${p.loans.length} loan${p.loans.length > 1 ? 's' : ''}</span></div>
        <div class="p2val red">-${fmt(loanInterest)}</div>
      </div>` : '');

  const hist = (p.history || []).slice(-12);
  const histMax = Math.max(1, ...(p.history || []).map(h => Math.max(h.passive, h.expenses)));
  const histHtml = hist.length
    ? `<div class="chart" data-chart>${hist.map(h => `
        <div class="chart-col" title="passive ${fmt(h.passive)}/mo · expenses ${fmt(h.expenses)}/mo">
          <div class="chart-bar passive" style="height:${Math.round((h.passive / histMax) * 100)}%"></div>
          <div class="chart-bar expense" style="height:${Math.round((h.expenses / histMax) * 100)}%"></div>
        </div>`).join('')}</div>
       <div class="chart-legend"><span class="lg passive">Passive</span><span class="lg expense">Expenses</span></div>`
    : '<div class="empty">No payday history yet — land on PAYDAY to build your cash-flow chart.</div>';

  $('card-body').innerHTML = `
    <h2>${p.name}'s Portfolio</h2>
    <div class="pstats">
      <div><span>Active (salary)</span><b class="green">+${fmt(p.salary)}</b></div>
      <div><span>Passive/mo</span><b class="green">+${fmt(p.passiveIncome)}</b></div>
      <div><span>Expenses</span><b class="red">-${fmt(p.expenses)}</b></div>
      <div class="cf-row"><span>Monthly cash flow</span><b class="${cashflow >= 0 ? 'green' : 'red'}">${cashflow >= 0 ? '+' : ''}${fmt(cashflow)}</b></div>
      <div><span>Career</span><b>${careerInfo(p).name}</b></div>
      <div><span>Cash</span><b>${fmt(p.cash)}</b></div>
      <div><span>Net worth</span><b>${fmt(netWorth(p))}</b></div>
      <div><span>Loans</span><b>${fmt(p.loans.reduce((s, l) => s + l.principal, 0))}</b></div>
      <div><span>Credit score</span><b>${p.credit ?? 700}</b></div>
      <div><span>Emergency fund</span><b>${fmt(p.emergencyFund || 0)}</b></div>
    </div>
    <div class="fund-row">
      <span>Emergency fund (target ${fmt(fundTarget(p))}) — surprise costs draw here first</span>
      <button class="btn small ok" data-act="deposit">Deposit $100</button>
      <button class="btn small" data-act="withdraw">Withdraw $100</button>
    </div>
    <h3>Expenses <span class="hint">what goes out each month</span></h3>
    ${expensesHtml}
    <h3>Assets <span class="hint">sell for their current market value</span></h3>
    ${assetsHtml}
    <h3>Loans</h3>
    ${loansHtml}
    <h3>Cash Flow History <span class="hint">passive vs expenses each payday</span></h3>
    ${histHtml}
    <div class="card-actions2">
      <button class="btn header-btn" data-act="trade">Trade with Players</button>
      <button class="btn ok" data-act="loan">Borrow Money</button>
      <button class="btn cancel" data-act="close">Close</button>
    </div>`;
  show('card-modal');

  const body = $('card-body');
  const onSell = async (i) => {
    const a = p.assets[i];
    const confirmMsg = `Sell <b>${a.name}</b> for ${fmt(a.value)}? You will lose its +${fmt(a.monthly)}/mo income.`;
    const yes = await showInfo('Sell Asset', confirmMsg, [
      { v: 1, label: 'Sell', cls: 'ok' }, { v: 0, label: 'Keep', cls: 'cancel' }]);
    if (yes) {
      p.cash += a.value;
      p.passiveIncome -= a.monthly;
      p.assets.splice(i, 1);
      sfx.coin();
      log(`${p.name} sells ${a.name} for ${fmt(a.value)}.`);
      openPortfolio();
    } else {
      openPortfolio();
    }
  };
  const onRepay = (i) => {
    const loan = p.loans[i];
    const cost = loanSettleCost(loan);
    const confirmMsg = loan.kind === 'interestOnly'
      ? `Settle your interest-only loan for <b>${fmt(cost)}</b>? You will clear its -${fmt(loan.monthly)}/mo interest.`
      : `Repay this loan for <b>${fmt(cost)}</b>? You will clear its -${fmt(loan.monthly)}/mo interest.`;
    const doRepay = async () => {
      if (repayLoan(p, loan)) {
        log(`${p.name} ${loan.kind === 'interestOnly' ? 'settles' : 'repays'} a bank loan for ${fmt(cost)}. Credit +10.`);
      }
      openPortfolio();
    };
    showInfo('Repay Loan', confirmMsg, [
      { v: 1, label: loan.kind === 'interestOnly' ? 'Settle' : 'Repay', cls: 'ok' }, { v: 0, label: 'Keep', cls: 'cancel' }]).then(doRepay);
  };
  body.querySelectorAll('.sell').forEach(b => b.addEventListener('click', () => onSell(+b.dataset.sell)));
  body.querySelectorAll('.repay').forEach(b => b.addEventListener('click', () => onRepay(+b.dataset.repay)));
  body.querySelector('[data-act="trade"]').addEventListener('click', openTradeView);
  body.querySelector('[data-act="loan"]').addEventListener('click', async () => {
    if (p.loans.length >= 3) { log('Bank maxed out: you already have 3 loans.'); return; }
    const choice = await ask('Borrow from the Bank',
      `<div class="card-desc">Pick a loan. Standard loans are repaid in full; interest-only loans have a lower monthly cost but cost a 20% premium to settle. Your credit is <b>${p.credit ?? 700}</b> (${Math.round(rateFor(p) * 100)}% standard rate).</div>` +
      LOAN_OPTIONS.map(o => `<div class="st"><span>${o.label}</span><b class="red">${fmt(loanMonthly(p, o))}/mo</b></div>`).join(''),
      [...LOAN_OPTIONS.map(o => ({ v: String(o.amount), label: o.label + (o.kind === 'interestOnly' ? ' (interest-only)' : ''), cls: 'ok' })),
       { v: 'cancel', label: 'Cancel', cls: 'cancel' }]);
    if (choice !== 'cancel') {
      const opt = takeLoan(p, +choice);
      sfx.buy();
      log(`${p.name} borrows ${fmt(opt.amount)} from the bank (-${fmt(opt.monthly)}/mo${opt.kind === 'interestOnly' ? ', interest-only' : ''}).`);
      openPortfolio();
    }
  });
  body.querySelector('[data-act="deposit"]').addEventListener('click', () => {
    const amt = depositEmergency(p, 100);
    if (amt > 0) { sfx.coin(); log(`${p.name} moves ${fmt(amt)} into their emergency fund.`); }
    openPortfolio();
  });
  body.querySelector('[data-act="withdraw"]').addEventListener('click', () => {
    const amt = withdrawEmergency(p, 100);
    if (amt > 0) { sfx.coin(); log(`${p.name} withdraws ${fmt(amt)} from their emergency fund.`); }
    openPortfolio();
  });
  body.querySelector('[data-act="close"]').addEventListener('click', () => hide('card-modal'));
}

/* ---------------- player-to-player trading ---------------- */
/* Would an AI buyer accept this price? Keeps a liquidity reserve and checks value. */
function aiBuysAt(buyer, asset, price) {
  if (asset.monthly <= 0) return false;
  const reserve = Math.max(200, Math.min(2500, Math.round(buyer.expenses * 0.3)));
  if (buyer.cash < price + reserve) return false;
  if (price / asset.monthly > 90) return false;
  if (price > asset.value * 1.5) return false;
  return true;
}

/* Would an AI seller accept this price? Only for a decent premium over market value. */
function aiSellsAt(seller, asset, price) {
  return price >= asset.value * aiSellThreshold();
}

function transferAsset(seller, buyer, asset, price) {
  seller.cash += price;
  seller.passiveIncome -= asset.monthly;
  seller.assets = seller.assets.filter(a => a !== asset);
  buyer.cash -= price;
  buyer.passiveIncome += asset.monthly;
  buyer.assets.push({ name: asset.name, cat: asset.cat, value: asset.value, monthly: asset.monthly });
  sfx.coin();
  log(`${buyer.name} buys ${asset.name} from ${seller.name} for ${fmt(price)}.`);
  saveGame();
  renderAll();
}

async function offerBuy(p, asset, seller, price) {
  if (p.cash < price) { log(`${p.name} cannot afford that trade.`); return; }
  if (seller.ai) {
    if (aiSellsAt(seller, asset, price)) {
      transferAsset(seller, p, asset, price);
    } else {
      log(`${seller.name} declines the offer for ${asset.name}.`);
    }
  } else {
    const yes = await ask('Trade Offer', `${p.name} bids to buy <b>${asset.name}</b> from ${seller.name} for ${fmt(price)}. Accept?`, [
      { v: 1, label: 'Accept', cls: 'ok' },
      { v: 0, label: 'Decline', cls: 'cancel' }]);
    if (yes) transferAsset(seller, p, asset, price);
    else log(`${seller.name} declines the offer.`);
  }
}

async function offerSell(p, asset, buyer, price) {
  if (buyer.ai) {
    if (aiBuysAt(buyer, asset, price) && buyer.cash >= price) {
      transferAsset(p, buyer, asset, price);
    } else {
      log(`${buyer.name} is not interested in ${asset.name}.`);
    }
  } else {
    const yes = await ask('Trade Offer', `${p.name} offers <b>${asset.name}</b> to ${buyer.name} for ${fmt(price)}. Accept?`, [
      { v: 1, label: 'Accept', cls: 'ok' },
      { v: 0, label: 'Decline', cls: 'cancel' }]);
    if (yes) transferAsset(p, buyer, asset, price);
    else log(`${buyer.name} declines the offer.`);
  }
}

async function openOfferForm(p, asset, others) {
  const html = `
    <h2>Offer ${asset.name}</h2>
    <div class="card-desc">Sell this asset to another player — you set the price.</div>
    <div class="set-group">
      <label class="set-label" for="trade-buyer">Buyer</label>
      <select id="trade-buyer" class="set-select">${others.map(o => `<option value="${o.name}">${o.name}</option>`).join('')}</select>
    </div>
    <div class="set-group">
      <label class="set-label" for="trade-price">Price</label>
      <input id="trade-price" type="number" class="set-select" min="0" value="${asset.value}">
    </div>`;
  const action = await ask('Trade', html, [
    { v: 'send', label: 'Send Offer', cls: 'ok' },
    { v: 'back', label: 'Back', cls: 'cancel' }]);
  if (action === 'send') {
    const buyer = game.players.find(x => x.name === $('trade-buyer').value);
    const price = Math.max(0, Math.round(parseFloat($('trade-price').value) || 0));
    if (buyer) await offerSell(p, asset, buyer, price);
  }
  openTradeView();
}

function openTradeView() {
  const p = currentPlayer();
  const others = game.players.filter(x => x !== p && !x.bankrupt);
  if (!others.length) {
    $('card-body').innerHTML = `<h2>Trade with Players</h2><div class="empty">No other active players to trade with.</div>`;
    show('card-modal');
    return;
  }
  const mine = p.assets.length
    ? p.assets.map(a => `
      <div class="prow2">
        <div class="p2name"><b>${a.name}</b><span>+${fmt(a.monthly)}/mo</span></div>
        <div class="p2val">${fmt(a.value)}</div>
        <button class="btn small ok" data-offer="${a.name}">Offer</button>
      </div>`).join('')
    : '<div class="empty">You own no assets to trade.</div>';
  const theirs = others.map(o => `
    <h3>${o.name} <span class="hint">cash ${fmt(o.cash)}</span></h3>
    ${o.assets.length
      ? o.assets.map(a => `
        <div class="prow2">
        <div class="p2name"><b>${a.name}</b>${paybackBadge(a)}<span>${a.cat} · +${fmt(a.monthly)}/mo</span></div>
          <div class="p2val">${fmt(a.value)}</div>
          <button class="btn small ok" data-buy="${o.name}|${a.name}">Buy</button>
        </div>`).join('')
      : '<div class="empty">No assets.</div>'}`).join('');
  $('card-body').innerHTML = `
    <h2>Trade with Players</h2>
    <h3>Your assets — offer to sell</h3>
    ${mine}
    <h3>Buy from others</h3>
    ${theirs}
    <div class="card-actions2">
      <button class="btn cancel" data-act="close">Close</button>
    </div>`;
  show('card-modal');
  const body = $('card-body');
  body.querySelectorAll('[data-offer]').forEach(b => b.addEventListener('click', () => {
    const asset = p.assets.find(a => a.name === b.dataset.offer);
    if (asset) openOfferForm(p, asset, others);
  }));
  body.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', async () => {
    const [sname, aname] = b.dataset.buy.split('|');
    const seller = game.players.find(x => x.name === sname);
    const asset = seller.assets.find(a => a.name === aname);
    if (seller && asset) await offerBuy(p, asset, seller, asset.value);
    openTradeView();
  }));
  body.querySelector('[data-act="close"]').addEventListener('click', () => hide('card-modal'));
}

/* ---------------- confetti ---------------- */
function showConfetti() {
  const c = $('confetti');
  c.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'cf';
    p.style.left = rand(100) + 'vw';
    p.style.background = PLAYER_COLORS[i % PLAYER_COLORS.length];
    p.style.animationDelay = (Math.random() * 0.8) + 's';
    p.style.animationDuration = (2.4 + Math.random() * 1.6) + 's';
    c.appendChild(p);
  }
  c.classList.remove('on');
  void c.offsetWidth;
  c.classList.add('on');
  setTimeout(() => c.classList.remove('on'), 5000);
}

/* ---------------- help / glossary ---------------- */
function openHelp() {
  $('card-body').innerHTML =
    `<h2>How to Play</h2>` +
    HOW_TO_PLAY.map(s => `<div class="help-item"><b>${s.h}:</b> ${s.t}</div>`).join('') +
    `<div class="card-actions2"><button class="btn ok" data-hclose="1">Got it</button></div>`;
  show('card-modal');
  $('card-body').querySelector('[data-hclose]').addEventListener('click', () => hide('card-modal'));
}

function openGlossary() {
  $('card-body').innerHTML =
    `<h2>Money Concepts</h2>` +
    Object.entries(LESSONS).map(([k, v]) => `<div class="help-item"><b>${k}:</b> ${v}</div>`).join('') +
    `<div class="card-actions2"><button class="btn ok" data-hclose="1">Got it</button></div>`;
  show('card-modal');
  $('card-body').querySelector('[data-hclose]').addEventListener('click', () => hide('card-modal'));
}

function openLessons() {
  $('card-body').innerHTML =
    `<h2>Money Lessons</h2>` +
    `<p class="card-desc">Timeless lessons inspired by <i>Rich Dad Poor Dad</i>. Read them one at a time — each has a real example and how it shows up in this game.</p>` +
    MONEY_LESSONS.map((l, i) => `
      <div class="lesson-card">
        <div class="lesson-head"><span class="lesson-num">${i + 1}</span><b>${l.title}</b></div>
        <div class="lesson-quote">${l.quote}</div>
        <div class="lesson-block"><span class="lesson-label">What it means</span><p>${l.meaning}</p></div>
        <div class="lesson-block"><span class="lesson-label">Real-world example</span><p>${l.example}</p></div>
        <div class="lesson-block lesson-game"><span class="lesson-label">In Money Quest</span><p>${l.game}</p></div>
      </div>`).join('') +
    `<div class="card-actions2"><button class="btn ok" data-hclose="1">Got it</button></div>`;
  show('card-modal');
  $('card-body').querySelector('[data-hclose]').addEventListener('click', () => hide('card-modal'));
}

/* ---------------- bootstrap ---------------- */
function init() {
  buildBoard();
  $('roll-btn').addEventListener('click', () => {
    if (busy || !game || game.winner) return;
    if (currentPlayer().ai) return;
    takeTurn();
  });
  $('portfolio-btn').addEventListener('click', openPortfolio);
  $('new-btn').addEventListener('click', () => { clearSave(); location.reload(); });
  $('help-btn').addEventListener('click', openHelp);
  $('lessons-btn').addEventListener('click', openLessons);
  $('glossary-btn').addEventListener('click', openGlossary);
  $('sound-btn').addEventListener('click', () => {
    soundOn = !soundOn;
    $('sound-btn').textContent = soundOn ? 'Sound: On' : 'Sound: Off';
    try { localStorage.setItem('mq_sound', soundOn ? '1' : '0'); } catch (e) { /* no storage */ }
  });
  $('sound-btn').textContent = soundOn ? 'Sound: On' : 'Sound: Off';
  $('setup-start').addEventListener('click', startGame);
  const aiSel = $('ai-difficulty');
  try { aiSel.value = localStorage.getItem('mq_ai_diff') || 'medium'; } catch (e) { /* no storage */ }
  aiSel.addEventListener('change', () => {
    try { localStorage.setItem('mq_ai_diff', aiSel.value); } catch (e) { /* no storage */ }
  });
  $('add-player').addEventListener('click', () => {
    const n = $('players-list').children.length;
    if (n < 4) buildSetupRows(n + 1);
  });
  $('remove-player').addEventListener('click', () => {
    const n = $('players-list').children.length;
    if (n > 1) buildSetupRows(n - 1);
  });
  const cbSel = $('cb-tokens');
  if (cbSel) {
    try { cbSel.checked = localStorage.getItem('mq_cb') === '1'; } catch (e) { /* no storage */ }
    cbSel.addEventListener('change', () => {
      try { localStorage.setItem('mq_cb', cbSel.checked ? '1' : '0'); } catch (e) { /* no storage */ }
      if (game) buildTokens(game.players);
    });
  }
  setupResume();
  openSetup();
}

window.addEventListener('DOMContentLoaded', init);
