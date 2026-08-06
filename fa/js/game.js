/* ============================================================
   مسابقه پول — موتور بازی
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => '$' + Math.round(n).toLocaleString('fa-IR');
const rand = (n) => Math.floor(Math.random() * n);
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
let resolver = null; // حل‌کنندهٔ پرامیسی مودال

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
};

let currentPlayer = () => game.players[game.current];
let busy = false;

/* ---------------- صدا (بوق‌های کوچک WebAudio) ---------------- */
let audioCtx = null;
let soundOn = true;
try { soundOn = localStorage.getItem('mq_sound') !== '0'; } catch (e) { /* بدون حافظه */ }
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
  } catch (e) { /* بدون صدا */ }
}
const sfx = {
  roll: () => { beep(300, 0.05, 0.08); beep(400, 0.05, 0.08, 0.08); beep(520, 0.08, 0.08, 0.16); },
  coin: () => { beep(880, 0.09, 0.1); beep(1320, 0.12, 0.08, 0.07); },
  bad: () => { beep(220, 0.18, 0.1); beep(160, 0.25, 0.1, 0.12); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.16, 0.1, i * 0.13)); },
  buy: () => { beep(523, 0.1, 0.1); beep(784, 0.12, 0.09, 0.08); },
};

/* ---------------- ساخت صفحه ---------------- */
function buildBoard() {
  const board = $('board');
  const frag = document.createDocumentFragment();
  const cellPct = 100 / BOARD_GRID;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const type = BOARD_TYPES[i];
    const info = SPACE_INFO[type];
    const pos = BOARD_POS[i];
    const cell = document.createElement('div');
    cell.className = 'cell type-' + type + (i === 0 ? ' cell-start' : '');
    cell.dataset.index = i;
    cell.title = info.tip;
    cell.style.left = (pos.c * cellPct) + '%';
    cell.style.top = (pos.r * cellPct) + '%';
    cell.style.width = cellPct + '%';
    cell.style.height = cellPct + '%';
    cell.innerHTML =
      '<svg viewBox="0 0 24 24" class="cell-icon">' + SVG_ICONS[info.icon] + '</svg>' +
      '<span class="cell-label">' + info.label + '</span>' +
      (i % 8 === 0 ? '<span class="cell-flag">$$</span>' : '');
    frag.appendChild(cell);
  }
  board.appendChild(frag);

  // لایه مهره‌ها
  const tokens = document.createElement('div');
  tokens.id = 'tokens';
  board.appendChild(tokens);

  // داشبورد مرکزی دقیقاً داخل حلقه قرار می‌گیرد
  const c = $('center');
  c.style.left = cellPct + '%';
  c.style.top = cellPct + '%';
  c.style.width = (100 - 2 * cellPct) + '%';
  c.style.height = (100 - 2 * cellPct) + '%';
}

function placeToken(p) {
  const pos = BOARD_POS[p.position];
  const t = document.getElementById('token-' + p.color.replace('#', ''));
  if (!t) return;
  const cellPct = 100 / BOARD_GRID;
  t.style.left = ((pos.c + 0.5) * cellPct) + '%';
  t.style.top = ((pos.r + 0.5) * cellPct) + '%';
  t.classList.toggle('is-current', p === currentPlayer());
}

/* ---------------- راه‌اندازی ---------------- */
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
      <span class="prow-idx">${(i + 1).toLocaleString('fa-IR')}</span>
      <input class="prow-name" data-p="name" placeholder="نام" value="${i === 0 ? 'شما' : ''}">
      <select class="prow-job" data-p="job">
        ${JOBS.map(j => `<option value="${j.id}">${j.name}</option>`).join('')}
      </select>
      <label class="prow-ai"><input type="checkbox" data-p="ai" ${i > 0 ? 'checked' : ''}> هوش مصنوعی</label>
      <span class="color-row">${PLAYER_COLORS.map(c =>
        `<button class="swatch ${c === PLAYER_COLORS[i] ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</span>
    `;
    wrap.appendChild(row);
  }
  // انتخاب رنگ
  wrap.querySelectorAll('.prow').forEach((row, i) => {
    row.querySelectorAll('.swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        row.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
      });
    });
  });
  // راهنمای سختی شغل
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
    hint.textContent = `حقوق ${fmt(job.salary)}/ماه · هزینه ${fmt(job.expenses)}/ماه · شروع ${fmt(job.cash)}`;
  });
}

function startGame() {
  const players = [];
  const seen = new Set();
  document.querySelectorAll('.prow').forEach((row, i) => {
    let name = row.querySelector('.prow-name').value.trim() || ('بازیکن ' + (i + 1).toLocaleString('fa-IR'));
    name = name.slice(0, 16);
    if (seen.has(name)) name = name + ' ' + (i + 1).toLocaleString('fa-IR');
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
  beginGame(players);
}

/* ---------------- چرخه بازی ---------------- */
function beginGame(players) {
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
      passiveIncome: 0,
      expenses: job.expenses,
      baseExpenses: job.expenses,
      expenseItems: [{ name: 'هزینه‌های زندگی', monthly: job.expenses }],
      assets: [],
      loans: [],
      position: 0,
      downsized: 0,
      doubleRoll: false,
      escaped: false,
      totalPassiveEarned: 0,
      totalTaxPaid: 0,
      totalCharity: 0,
      investmentsBought: 0,
      bankruptcies: 0,
    };
  });

  game = {
    players: p,
    current: 0,
    turn: 1,
    month: 1,
    winner: null,
    decks: {
      oppByCat: {
        realestate: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'realestate')),
        business: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'business')),
        stock: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'stock')),
        savings: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'savings')),
      },
      market: shuffle(MARKET_CARDS),
      expense: shuffle(EXPENSE_CARDS),
      bonus: shuffle(BONUS_CARDS),
      baby: shuffle(BABY_CARDS),
    },
    log: [],
  };

  // ساخت مهره‌ها
  buildTokens(p);

  hide('setup-modal');
  clearSave();
  $('roll-btn').disabled = false;
  renderAll();
  log(`بازی جدید! ${p.map(x => x.name).join('، ')} در دایره فقر هستند.`);
  log(`نوبت ${game.turn}: حرکت ${currentPlayer().name} (${currentPlayer().job.name}).`);
  currentPlayer().isHuman ? promptStart() : takeTurn();
}

function buildTokens(players) {
  const tlayer = $('tokens');
  tlayer.innerHTML = '';
  players.forEach((pl) => {
    const t = document.createElement('div');
    t.className = 'token';
    t.id = 'token-' + pl.color.replace('#', '');
    t.style.background = pl.color;
    t.innerHTML = '<span>' + pl.name.charAt(0).toUpperCase() + '</span>';
    tlayer.appendChild(t);
    placeToken(pl);
  });
}

/* ---------------- ذخیره / ادامه ---------------- */
const SAVE_KEY = 'mq_save_' + ((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || 'en');

function saveGame() {
  try {
    const decks = game.decks;
    const s = {
      v: 2,
      players: game.players.map(p => ({
        name: p.name, color: p.color, ai: p.ai, isHuman: p.isHuman, jobId: p.job.id,
        cash: p.cash, salary: p.salary, passiveIncome: p.passiveIncome,
        expenses: p.expenses, baseExpenses: p.baseExpenses,
        expenseItems: p.expenseItems, assets: p.assets, loans: p.loans,
        position: p.position, downsized: p.downsized, doubleRoll: p.doubleRoll,
        escaped: p.escaped, totalPassiveEarned: p.totalPassiveEarned,
        totalTaxPaid: p.totalTaxPaid, totalCharity: p.totalCharity,
        investmentsBought: p.investmentsBought, bankruptcies: p.bankruptcies,
      })),
      current: game.current,
      turn: game.turn,
      month: game.month,
      decks: {
        oppByCat: Object.fromEntries(Object.entries(decks.oppByCat).map(([k, v]) => [k, v.map(c => OPPORTUNITY_CARDS.indexOf(c))])),
        market: decks.market.map(c => MARKET_CARDS.indexOf(c)),
        expense: decks.expense.map(c => EXPENSE_CARDS.indexOf(c)),
        bonus: decks.bonus.map(c => BONUS_CARDS.indexOf(c)),
        baby: decks.baby.map(c => BABY_CARDS.indexOf(c)),
      },
      log: game.log.slice(-60),
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) { /* حافظه در دسترس نیست */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* بدون حافظه */ }
}

function resumeGame() {
  const s = loadSave();
  if (!s) return;
  const players = s.players.map(cfg => {
    const job = JOBS.find(j => j.id === cfg.jobId) || JOBS[0];
    return {
      name: cfg.name, color: cfg.color, ai: cfg.ai, isHuman: cfg.isHuman, job,
      cash: cfg.cash, salary: cfg.salary, passiveIncome: cfg.passiveIncome,
      expenses: cfg.expenses, baseExpenses: cfg.baseExpenses,
      expenseItems: cfg.expenseItems, assets: cfg.assets, loans: cfg.loans,
      position: cfg.position, downsized: cfg.downsized, doubleRoll: cfg.doubleRoll,
      escaped: cfg.escaped, totalPassiveEarned: cfg.totalPassiveEarned,
      totalTaxPaid: cfg.totalTaxPaid, totalCharity: cfg.totalCharity,
      investmentsBought: cfg.investmentsBought, bankruptcies: cfg.bankruptcies,
    };
  });
  const cardAt = (cards, idx) => (idx >= 0 ? cards[idx] : null);
  game = {
    players,
    current: s.current,
    turn: s.turn,
    month: s.month || 1,
    winner: null,
    decks: {
      oppByCat: {
        realestate: s.decks.oppByCat.realestate.map(i => cardAt(OPPORTUNITY_CARDS, i)).filter(Boolean),
        business: s.decks.oppByCat.business.map(i => cardAt(OPPORTUNITY_CARDS, i)).filter(Boolean),
        stock: s.decks.oppByCat.stock.map(i => cardAt(OPPORTUNITY_CARDS, i)).filter(Boolean),
        savings: s.decks.oppByCat.savings.map(i => cardAt(OPPORTUNITY_CARDS, i)).filter(Boolean),
      },
      market: s.decks.market.map(i => cardAt(MARKET_CARDS, i)).filter(Boolean),
      expense: s.decks.expense.map(i => cardAt(EXPENSE_CARDS, i)).filter(Boolean),
      bonus: s.decks.bonus.map(i => cardAt(BONUS_CARDS, i)).filter(Boolean),
      baby: s.decks.baby.map(i => cardAt(BABY_CARDS, i)).filter(Boolean),
    },
    log: [],
  };

  buildTokens(players);
  (s.log || []).forEach(m => log(m));
  hide('setup-modal');
  $('roll-btn').disabled = false;
  busy = false;
  renderAll();
  log('بازی از ذخیره ادامه یافت.');
  log(`نوبت ${game.turn}: حرکت ${currentPlayer().name} (${currentPlayer().job.name}).`);
  if (game.winner) return;
  currentPlayer().isHuman ? promptStart() : takeTurn();
}

function setupResume() {
  const wrap = $('resume-wrap');
  if (!wrap || !loadSave()) return;
  wrap.innerHTML = '<button id="resume-btn" class="btn ok">ادامه بازی ذخیره‌شده</button>';
  $('resume-btn').addEventListener('click', resumeGame);
}

function promptStart() {
  showInfo(`نوبت توست، ${currentPlayer().name}!`,
    `شما یک <b>${currentPlayer().job.name}</b> هستید و ${fmt(currentPlayer().salary)}/ماه درآمد دارید و ${fmt(currentPlayer().expenses)} هزینه.<br><br>` +
    `مأموریت شما: <b>درآمد غیرفعالی بیشتر از هزینه‌ها</b> بسازید تا از دایره فقر فرار کنید.<br><br>تاس بریزید!`,
    ['تاس بینداز'], true);
}

/* ---------------- حلقه نوبت ---------------- */
async function takeTurn() {
  busy = true;
  const p = currentPlayer();
  $('roll-btn').disabled = true;
  renderAll();
  if (game.turn > 1 && (game.turn - 1) % game.players.length === 0) advanceMonth();
  if (p.ai) await sleep(700);

  await roll(p);

  if (game.winner) { renderAll(); return; }

  // بازیکن بعدی
  game.current = (game.current + 1) % game.players.length;
  game.turn++;
  renderAll();

  const next = currentPlayer();
  log(`نوبت ${game.turn}: حرکت ${next.name} (${next.job.name}).`);

  if (next.doubleRoll) {
    next.doubleRoll = false;
    if (next.isHuman) await showInfo('پاداش کمک!', 'سخاوتت جواب داد — این نوبت دو بار تاس می‌ریزی!', ['باشه']);
    else log(`${next.name} از تاس جایزه‌ی کمک استفاده می‌کند.`);
  }

  busy = false;
  saveGame();
  if (game.winner) return;
  if (next.ai) { takeTurn(); } else { $('roll-btn').disabled = false; renderAll(); }
}

/* ماه جدید: معاملات و هزینه‌های امروز به یک مجموعه تصادفی تازه می‌چرخند. */
function advanceMonth() {
  game.month++;
  game.decks.oppByCat = {
    realestate: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'realestate')),
    business: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'business')),
    stock: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'stock')),
    savings: shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === 'savings')),
  };
  game.decks.expense = shuffle(EXPENSE_CARDS);
  game.decks.bonus = shuffle(BONUS_CARDS);
  game.decks.market = shuffle(MARKET_CARDS);
  log(`ماه ${game.month.toLocaleString('fa-IR')}: معاملات و هزینه‌های امروز تغییر کرد!`);
  renderAll();
}

async function roll(p) {
  const d1 = rand(6) + 1;
  const d2 = rand(6) + 1;
  const sum = d1 + d2;
  renderDice(d1, d2);
  sfx.roll();
  log(`${p.name} تاس ریخت: ${d1.toLocaleString('fa-IR')} + ${d2.toLocaleString('fa-IR')} = ${sum.toLocaleString('fa-IR')}.`);
  $('dice').classList.add('rolling');
  await sleep(700);
  $('dice').classList.remove('rolling');

  // حرکت
  for (let i = 0; i < sum; i++) {
    p.position = (p.position + 1) % BOARD_SIZE;
    placeToken(p);
    await sleep(240);
  }
  await land(p);
}

/* ---------------- رسیدن به خانه ---------------- */
async function land(p) {
  const type = BOARD_TYPES[p.position];
  const info = SPACE_INFO[type];
  log(`>> ${p.name} روی خانه ${info.label} ایستاد.`, true);
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
  }
  renderAll();
}

function checkEscape(p) {
  if (p.passiveIncome > p.expenses) {
    p.escaped = true;
    game.winner = p;
    return true;
  }
  return false;
}

async function onPayday(p) {
  if (p.downsized > 0) {
    p.downsized--;
    const restored = p.downsized === 0;
    if (restored) p.salary = p.job.salary;
    const msg = restored
      ? 'شغل جدید پیدا کردی! از حقوق بعدی، حقوق کامل برمی‌گردد.'
      : 'تا پیدا کردن شغل، نصف حقوق می‌گیری.';
    if (p.isHuman) await showInfo('حقوق — نصف حقوق', msg, ['باشه']);
    else log(msg);
  }
  let salary = p.salary;

  const net = salary - p.expenses + p.passiveIncome;
  p.cash += net;
  p.totalPassiveEarned += p.passiveIncome;
  sfx.coin();

  if (p.cash < 0) await handleDebt(p);

  const escaped = checkEscape(p);

  const html =
    `<div class="st">حقوق +${fmt(salary)}</div>` +
    (p.passiveIncome > 0 ? `<div class="st green">درآمد غیرفعال +${fmt(p.passiveIncome)}</div>` : '') +
    `<div class="st red">هزینه‌ها -${fmt(p.expenses)}</div>` +
    `<div class="st"><b>نقدینگی فعلی: ${fmt(p.cash)}</b></div>` +
    `<div class="tip">${escaped ? 'درآمد غیرفعال از هزینه‌ها بیشتر شد — انجامش دادی!' : 'حقوقت را بگیر، قبض‌هایت را بپرداز و درآمد غیرفعالت را جیب بزن. هر حقوق یک درس جریان نقدی است.'}</div>`;

  if (p.isHuman) {
    const title = escaped ? 'حقوق — از دایره فقر فرار کردی!' : 'حقوق';
    await showInfo(title, html, ['باشه']);
  } else {
    log(`${p.name} حقوق گرفت: نقدینگی ${fmt(p.cash)}.`);
  }

  if (escaped) await endGame(p);
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
  let guard = 0;
  while (p.cash < 0 && guard++ < 40) {
    const a = worst();
    if (a) {
      p.cash += a.value;
      p.passiveIncome -= a.monthly;
      p.assets = p.assets.filter(x => x !== a);
      p.bankruptcies++;
      if (p.isHuman) log(`${p.name} مجبور شد ${a.name} را به ${fmt(a.value)} بفروشد تا قبض‌ها را بپردازد.`);
      else log(`${p.name} برای پرداخت قبض‌ها ${a.name} را می‌فروشد.`);
    } else {
      const loanInterest = p.loans.reduce((s, l) => s + l.monthly, 0);
      const target = Math.max(Math.round(p.baseExpenses * 0.5), Math.round(p.expenses * 0.9));
      const nonLoan = p.expenses - loanInterest;
      if (nonLoan > 0) {
        const factor = Math.max(0, target - loanInterest) / nonLoan;
        p.expenseItems = p.expenseItems.map(it => ({ name: it.name, monthly: Math.max(0, Math.round(it.monthly * factor)) }));
      }
      recalcExpenses(p);
      p.cash += 200;
      p.bankruptcies++;
      if (p.isHuman) log(`${p.name} مجبور شد ۱۰٪ از خرج زندگی را کم کند و از خانواده کمک بگیرد.`);
      else log(`${p.name} خرج زندگی را کم می‌کند.`);
    }
  }
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

function scaleIncome(p, n) {
  const salary = p.salary > 0 ? p.salary : p.job.salary;
  const factor = Math.max(0.25, Math.min(1.5, salary / 2000));
  return Math.max(20, Math.round(n * factor));
}

function takeLoan(p) {
  p.cash += 1000;
  p.loans.push({ principal: 1000, monthly: 80 });
  recalcExpenses(p);
  saveGame();
}

function repayLoan(p, loan) {
  if (p.cash >= loan.principal) {
    p.cash -= loan.principal;
    p.loans = p.loans.filter(l => l !== loan);
    recalcExpenses(p);
    saveGame();
  }
}

function drawCat(cat) {
  const deck = game.decks.oppByCat[cat];
  if (!deck.length) game.decks.oppByCat[cat] = shuffle(OPPORTUNITY_CARDS.filter(c => c.cat === cat));
  return game.decks.oppByCat[cat].shift();
}

function paybackMonths(card) {
  return card.monthly > 0 ? Math.ceil(card.cost / card.monthly) : 0;
}

function sellAsset(p, a) {
  p.cash += a.value;
  p.passiveIncome -= a.monthly;
  p.assets = p.assets.filter(x => x !== a);
  sfx.coin();
  log(`${p.name} ${a.name} را به ${fmt(a.value)} می‌فروشد.`);
  renderAll();
  saveGame();
}

async function onOpportunity(p) {
  // بازار امروز: از هر دسته یک پیشنهاد
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
          <span class="deal-sub">${o.dc.label} · هزینه ${fmt(card.cost)} · +${fmt(card.monthly)}/ماه · بازگشت ${paybackMonths(card).toLocaleString('fa-IR')} ماه</span>
        </div>
        <button class="btn small ok" data-buy="${i}" ${affordable ? '' : 'disabled'}>خرید</button>
      </div>`;
      }).join('');
      const owned = [];
      DEAL_CATS.forEach(dc => p.assets.filter(a => a.cat === dc.cat).forEach(a => owned.push({ a, dc })));
      const sellRows = owned.map(({ a, dc }) => `
      <div class="deal-row">
        <div class="deal-info">
          <b>${a.name}</b>
          <span class="deal-sub">فروش ${dc.label} · ${fmt(a.value)}</span>
        </div>
        <button class="btn small sell" data-sell="${a.name}">فروش</button>
      </div>`).join('');
      $('card-body').innerHTML = `
        <h2>معامله روز</h2>
        <div class="deal-cash">پول نقد تو: <b>${fmt(p.cash)}</b></div>
        <p class="card-desc">هر پیشنهادی را که توان خریدش را داری بخر — می‌توانی چند معامله انجام دهی. وقتی تمام شد «رد کردن» را بزن.</p>
        ${buyRows}
        ${sellRows ? `<h3>فروش دارایی‌هایت</h3>${sellRows}` : ''}
        <div class="tip"><b>درس:</b> ${LESSONS.payback} قبل از خرید، بازگشت سرمایهٔ همه پیشنهادها را مقایسه کن.</div>`;
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
    $('card-actions').innerHTML = `<button class="btn cancel" data-v="pass">رد کردن</button>`;
    show('card-modal');
    $('card-actions').querySelector('[data-v="pass"]').addEventListener('click', () => {
      hide('card-modal'); if (resolver) resolver('pass');
    });
    await new Promise((res) => { resolver = res; });
  } else {
    const reserve = Math.max(200, Math.min(2500, Math.round(p.expenses * 0.3)));
    const buyable = offers
      .filter(o => o.card.monthly > 0 && p.cash >= o.card.cost + reserve && paybackMonths(o.card) <= 90)
      .sort((x, y) => paybackMonths(x.card) - paybackMonths(y.card) || y.card.monthly - x.card.monthly);
    const best = buyable[0];
    if (best) { buyAsset(p, best.card); log(`${p.name} ${best.card.title} را به ${fmt(best.card.cost)} می‌خرد (+${fmt(best.card.monthly)}/ماه).`); }
    else { log(`${p.name} از معامله‌های امروز می‌گذرد.`); }
  }
}

function buyAsset(p, card) {
  p.cash -= card.cost;
  p.passiveIncome += card.monthly;
  p.investmentsBought++;
  p.assets.push({
    name: card.title,
    cat: card.cat,
    value: card.value,
    monthly: card.monthly,
  });
  sfx.buy();
  log(`${p.name} ${card.title} را خرید. درآمد غیرفعال حالا ${fmt(p.passiveIncome)}/ماه است.`);
  renderAll();
  saveGame();
}

async function onMarket(p) {
  const deck = game.decks.market;
  const card = deck.length ? deck.shift() : (deck.push(...shuffle(MARKET_CARDS)), deck.shift());
  card.apply(p);
  const owns = p.assets.length > 0;
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc}</div>
    <div class="tip"><b>درس:</b> ${owns
      ? 'ارزش بازار بالا و پایین می‌رود. سرمایه‌گذاران بلندمدت آرام می‌مانند و به ساختن دارایی ادامه می‌دهند.'
      : 'هنوز دارایی‌ای نداری، پس این بازار چندان به تو ربطی ندارد. دارایی یعنی در معرض بازار بودن.'}</div>`;
  if (p.isHuman) await showInfo('اخبار بازار', html, ['باشه']);
  else log(`${p.name} اخبار بازار را می‌خواند: ${card.title}.`);
  if (p._buyoutOffer) {
    delete p._buyoutOffer;
    const biz = p.assets.filter(a => a.cat === 'business');
    if (biz.length && p.isHuman) {
      const target = biz[biz.length - 1];
      const offer = target.value * 2;
      const action = await ask('خرید کسب‌وکار', `یک شرکت بزرگ ${fmt(offer)} برای <b>${target.name}</b> پیشنهاد می‌دهد (فعلاً ${fmt(target.monthly)}/ماه درآمد دارد). می‌فروشی؟`, [
        { v: 'yes', label: `فروش به ${fmt(offer)}`, cls: 'ok' },
        { v: 'no', label: 'نگهش دار', cls: 'cancel' }]);
      if (action === 'yes') {
        p.cash += offer;
        p.passiveIncome -= target.monthly;
        p.assets = p.assets.filter(a => a !== target);
        sfx.coin();
        log(`${p.name} ${target.name} را به ${fmt(offer)} می‌فروشد.`);
      }
    } else if (biz.length) {
      const target = biz[biz.length - 1];
      const offer = target.value * 2;
      if (offer > target.value * 1.5) {
        p.cash += offer;
        p.passiveIncome -= target.monthly;
        p.assets = p.assets.filter(a => a !== target);
        log(`${p.name} پیشنهاد خرید ${target.name} را به ${fmt(offer)} می‌پذیرد.`);
      }
    }
    renderAll();
  }
}

async function onExpense(p) {
  const deck = game.decks.expense;
  const card = deck.length ? deck.shift() : (deck.push(...shuffle(EXPENSE_CARDS)), deck.shift());
  const cost = scaleIncome(p, card.cash);
  p.cash -= cost;
  if (p.cash < 0) await handleDebt(p);
  sfx.bad();
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc}</div>
    <div class="card-stats"><div><span>هزینه</span><b>-${fmt(cost)}</b></div></div>
    <div class="tip"><b>درس:</b> ${card.lesson}</div>`;
  if (p.isHuman) await showInfo('هزینه غافلگیرکننده', html, ['باشه']);
  else log(`${p.name} ${fmt(cost)} برای ${card.title} می‌پردازد.`);
}

async function onTax(p) {
  const rate = 0.12;
  const tax = Math.max(40, Math.round(p.salary * rate));
  p.cash -= tax;
  if (p.cash < 0) await handleDebt(p);
  p.totalTaxPaid += tax;
  sfx.bad();
  const html = `
    <div class="card-title">وقت مالیات</div>
    <div class="card-desc">مالیات هزینه‌ی جاده‌ها، مدرسه‌ها و بیمارستان‌هاست. تو باید <b>${fmt(tax)}</b> بپردازی (۱۲٪ از حقوق ${fmt(p.salary)} دلاری‌ات).</div>
    <div class="tip"><b>درس:</b> ${LESSONS.active} مالیات با درآمد رشد می‌کند — برایش برنامه‌ریزی کن.</div>`;
  if (p.isHuman) await showInfo('مالیات', html, ['باشه']);
  else log(`${p.name} ${fmt(tax)} مالیات می‌پردازد.`);
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
    <div class="tip"><b>درس:</b> ${card.lesson}</div>`;
  if (p.isHuman) await showInfo('شانس خوش', html, ['باشه']);
  else log(`${p.name} ${fmt(gain)} به دست می‌آورد (${card.title}).`);
}

async function onBaby(p) {
  const deck = game.decks.baby;
  const card = deck.length ? deck.shift() : (deck.push(...shuffle(BABY_CARDS)), deck.shift());
  const hospital = scaleIncome(p, card.cash);
  p.cash -= hospital;
  if (p.cash < 0) await handleDebt(p);
  const added = addMonthlyExpense(p, card.monthly, card.title);
  sfx.bad();
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc}<br>قبض بیمارستان <b>-${fmt(hospital)}</b>، هزینه خانواده <b>+${fmt(added)}/ماه</b>.</div>
    <div class="tip"><b>درس:</b> ${card.lesson}</div>`;
  if (p.isHuman) await showInfo('خانواده در حال رشد', html, ['باشه']);
  else log(`خانواده ${p.name} بزرگ‌تر شد: +${fmt(added)}/ماه هزینه.`);
}

async function onDownsized(p) {
  p.downsized = 2;
  p.salary = Math.round(p.job.salary * 0.5);
  sfx.bad();
  const html = `
    <div class="card-title">از دست دادن شغل!</div>
    <div class="card-desc">محل کارت تعطیل می‌شود. برای ۲ حقوق بعدی به <b>نصف حقوق</b> می‌افتی.</div>
    <div class="tip"><b>درس:</b> ${LESSONS.emergency} باید با پس‌انداز و درآمد غیرفعال زنده بمانی.</div>`;
  if (p.isHuman) await showInfo('بیکاری', html, ['باشه']);
  else log(`${p.name} شغلش را از دست داد — ۲ حقوق نصف!`);
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
    <div class="card-title">کمک به دیگران</div>
    <div class="card-desc">تو <b>${fmt(give)}</b> (۱۰٪ از نقدینگی‌ات) برای کمک به دیگران می‌بخشی. نوبت بعد <b>تاس جایزه</b> می‌گیری.</div>
    <div class="tip"><b>درس:</b> سخاوت قدردانی را تقویت می‌کند و پول را در جریان نگه می‌دارد. خوبی که می‌کنی اغلب برمی‌گردد.</div>`;
  if (p.isHuman) await showInfo('کمک', html, ['باشه']);
  else log(`${p.name} ${fmt(give)} به خیریه کمک می‌کند.`);
  renderAll();
}

/* ---------------- پایان بازی ---------------- */
async function endGame(w) {
  sfx.win();
  clearSave();
  showConfetti();
  const winnerHtml = `
    <div class="win-avatar" style="background:${w.color}">${w.name.charAt(0).toUpperCase()}</div>
    <h2>${w.name} از دایره فقر فرار کرد!</h2>
    <p>${w.name} <b>${fmt(w.passiveIncome)}/ماه</b> درآمد غیرفعال ساخت — کافی است <b>${fmt(w.expenses)}/ماه</b> هزینه را پوشش دهد.</p>
    <div class="st">ارزش خالص: <b>${fmt(netWorth(w))}</b> · دارایی‌ها: <b>${w.assets.length.toLocaleString('fa-IR')}</b> · نقدینگی: <b>${fmt(w.cash)}</b></div>
    <div class="tip">«${pick(WIN_TIPS)}»</div>
    <h3>جدول امتیازات</h3>
    <div class="scoreboard">
      ${game.players.map(p =>
        `<div class="sb-row ${p === w ? 'sb-win' : ''}"><span class="sb-dot" style="background:${p.color}"></span><b>${p.name}</b>` +
        (p === w ? '<em>برنده</em>' : (p.escaped ? '<em>فرار کرد</em>' : '<em>دایره فقر</em>')) +
        `<span>ارزش ${fmt(netWorth(p))}</span></div>`).join('')}
    </div>
    <div class="tip">درآمد غیرفعال به‌دست‌آمده: ${game.players.map(p => `${p.name} ${fmt(p.totalPassiveEarned)}`).join(' · ') || '—'}</div>`;
  const action = await showInfo('آزادی مالی!', winnerHtml, [
    { v: 'again', label: 'دوباره بازی کن', cls: 'ok' },
    { v: 'close', label: 'ادامه تماشا', cls: 'cancel' }], true);
  if (action === 'again') location.reload();
}

/* ---------------- ارزش خالص ---------------- */
function netWorth(p) {
  const assets = p.assets.reduce((s, a) => s + a.value, 0);
  const loans = p.loans.reduce((s, l) => s + l.principal, 0);
  return p.cash + assets - loans;
}

/* ---------------- نمایش ---------------- */
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
      <div class="cname"><b>${p.name}</b><span>${p.job.name}${p.ai ? ' · هوش مصنوعی' : ''}</span></div>
      <div class="ccash">نقدینگی <b>${fmt(p.cash)}</b><span class="cmonth">ماه ${game.month.toLocaleString('fa-IR')}</span></div>
    </div>
    <div class="cincome">
      <div class="st"><span>درآمد فعال (حقوق)</span><b class="green">+${fmt(p.salary)}</b></div>
      <div class="st"><span>درآمد غیرفعال</span><b class="green">+${fmt(p.passiveIncome)}</b></div>
      <div class="st"><span>هزینه‌ها</span><b class="red">-${fmt(p.expenses)}</b></div>
      <div class="st total ${cashflow >= 0 ? 'green' : 'red'}"><span>جریان نقدی ماهانه</span><b>${cashflow >= 0 ? '+' : ''}${fmt(cashflow)}</b></div>
    </div>
    <div class="cnet">ارزش خالص <b>${fmt(netWorth(p))}</b></div>
    ${p.downsized > 0 ? `<div class="cflag red">بیکار (${p.downsized.toLocaleString('fa-IR')} حقوق دیگر)</div>` : ''}
    <div class="cgoal">هدف: درآمد غیرفعال &gt; ${fmt(p.expenses)} هزینه
      <div class="bar"><div class="barfill" style="width:${Math.min(100, Math.round(p.expenses ? (p.passiveIncome / p.expenses) * 100 : 0))}%"></div></div>
      <span class="bar-cap">${fmt(p.passiveIncome)} / ${fmt(p.expenses)}</span>
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

/* ---------------- مودال‌ها ---------------- */
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

/* ---------------- کیف دارایی‌ها ---------------- */
function openPortfolio() {
  const p = currentPlayer();
  const assetsHtml = p.assets.length
    ? p.assets.map((a, i) => `
      <div class="prow2">
        <div class="p2name"><b>${a.name}</b><span>${a.cat} · +${fmt(a.monthly)}/ماه</span></div>
        <div class="p2val">${fmt(a.value)}</div>
        <button class="btn small sell" data-sell="${i}">بفروش</button>
      </div>`).join('')
    : '<div class="empty">هنوز دارایی‌ای نداری. روی خانه‌های معامله برو و سرمایه‌گذاری کن!</div>';
  const loansHtml = p.loans.length
    ? p.loans.map((l, i) => `
      <div class="prow2">
        <div class="p2name"><b>وام بانکی</b><span>سود ${fmt(l.monthly)}/ماه</span></div>
        <div class="p2val">${fmt(l.principal)}</div>
        <button class="btn small repay" data-repay="${i}">پرداخت وام</button>
      </div>`).join('')
    : '<div class="empty">وام نداری. عالی — بدهی هر ماه پول می‌گیرد.</div>';

  const cashflow = p.salary - p.expenses + p.passiveIncome;
  const loanInterest = p.loans.reduce((s, l) => s + l.monthly, 0);
  const expensesHtml = p.expenseItems.map((it, i) => `
      <div class="prow2">
        <div class="p2name"><b>${it.name}</b><span>هزینهٔ ماهانه</span></div>
        <div class="p2val red">-${fmt(it.monthly)}</div>
      </div>`).join('') +
    (loanInterest > 0 ? `
      <div class="prow2">
        <div class="p2name"><b>سود وام بانکی</b><span>${p.loans.length.toLocaleString('fa-IR')} وام</span></div>
        <div class="p2val red">-${fmt(loanInterest)}</div>
      </div>` : '');

  $('card-body').innerHTML = `
    <h2>کیف دارایی‌های ${p.name}</h2>
    <div class="pstats">
      <div><span>درآمد فعال (حقوق)</span><b class="green">+${fmt(p.salary)}</b></div>
      <div><span>درآمد غیرفعال/ماه</span><b class="green">+${fmt(p.passiveIncome)}</b></div>
      <div><span>هزینه‌ها</span><b class="red">-${fmt(p.expenses)}</b></div>
      <div class="cf-row"><span>جریان نقدی ماهانه</span><b class="${cashflow >= 0 ? 'green' : 'red'}">${cashflow >= 0 ? '+' : ''}${fmt(cashflow)}</b></div>
      <div><span>نقدینگی</span><b>${fmt(p.cash)}</b></div>
      <div><span>ارزش خالص</span><b>${fmt(netWorth(p))}</b></div>
      <div><span>وام‌ها</span><b>${fmt(p.loans.reduce((s, l) => s + l.principal, 0))}</b></div>
    </div>
    <h3>هزینه‌ها <span class="hint">هر ماه چه مبلغی خارج می‌شود</span></h3>
    ${expensesHtml}
    <h3>دارایی‌ها <span class="hint">به قیمت روز بازار فروخته می‌شوند</span></h3>
    ${assetsHtml}
    <h3>وام‌ها</h3>
    ${loansHtml}
    <div class="card-actions2">
      <button class="btn ok" data-act="loan">وام ۱۰۰۰ دلاری بگیر</button>
      <button class="btn cancel" data-act="close">بستن</button>
    </div>`;
  show('card-modal');

  const body = $('card-body');
  const onSell = async (i) => {
    const a = p.assets[i];
    const confirmMsg = `فروش <b>${a.name}</b> به ${fmt(a.value)}؟ درآمد +${fmt(a.monthly)}/ماه آن را از دست می‌دهی.`;
    const yes = await showInfo('فروش دارایی', confirmMsg, [
      { v: 1, label: 'بفروش', cls: 'ok' }, { v: 0, label: 'نگه دار', cls: 'cancel' }]);
    if (yes) {
      p.cash += a.value;
      p.passiveIncome -= a.monthly;
      p.assets.splice(i, 1);
      sfx.coin();
      log(`${p.name} ${a.name} را به ${fmt(a.value)} می‌فروشد.`);
      openPortfolio();
    } else {
      openPortfolio();
    }
  };
  const onRepay = (i) => {
    repayLoan(p, p.loans[i]);
    log(`${p.name} یک وام بانکی را پرداخت می‌کند.`);
    openPortfolio();
  };
  body.querySelectorAll('.sell').forEach(b => b.addEventListener('click', () => onSell(+b.dataset.sell)));
  body.querySelectorAll('.repay').forEach(b => b.addEventListener('click', () => onRepay(+b.dataset.repay)));
  body.querySelector('[data-act="loan"]').addEventListener('click', () => {
    if (p.loans.length >= 3) { log('بانک سقف دارد: همین حالا ۳ وام داری.'); return; }
    takeLoan(p);
    sfx.buy();
    log(`${p.name} از بانک وام ۱٬۰۰۰ دلاری می‌گیرد (+${fmt(80)}/ماه سود).`);
    openPortfolio();
  });
  body.querySelector('[data-act="close"]').addEventListener('click', () => hide('card-modal'));
}

/* ---------------- کانفتی ---------------- */
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

/* ---------------- راهنما / مفاهیم ---------------- */
function openHelp() {
  $('card-body').innerHTML =
    `<h2>چطور بازی کنیم</h2>` +
    HOW_TO_PLAY.map(s => `<div class="help-item"><b>${s.h}:</b> ${s.t}</div>`).join('') +
    `<div class="card-actions2"><button class="btn ok" data-hclose="1">فهمیدم</button></div>`;
  show('card-modal');
  $('card-body').querySelector('[data-hclose]').addEventListener('click', () => hide('card-modal'));
}

function openGlossary() {
  $('card-body').innerHTML =
    `<h2>مفاهیم پول</h2>` +
    Object.entries(LESSONS).map(([k, v]) => `<div class="help-item"><b>${k}:</b> ${v}</div>`).join('') +
    `<div class="card-actions2"><button class="btn ok" data-hclose="1">فهمیدم</button></div>`;
  show('card-modal');
  $('card-body').querySelector('[data-hclose]').addEventListener('click', () => hide('card-modal'));
}

function openLessons() {
  $('card-body').innerHTML =
    `<h2>درس‌های پول</h2>` +
    `<p class="card-desc">درس‌های ماندگار الهام‌گرفته از کتاب «پدر پولدار، پدر بی‌پول». هرکدام را جدا بخوان — هر درس یک مثال واقعی دارد و نشان می‌دهد در این بازی کجا دیده می‌شود.</p>` +
    MONEY_LESSONS.map((l, i) => `
      <div class="lesson-card">
        <div class="lesson-head"><span class="lesson-num">${(i + 1).toLocaleString('fa-IR')}</span><b>${l.title}</b></div>
        <div class="lesson-quote">${l.quote}</div>
        <div class="lesson-block"><span class="lesson-label">یعنی چه</span><p>${l.meaning}</p></div>
        <div class="lesson-block"><span class="lesson-label">مثال واقعی</span><p>${l.example}</p></div>
        <div class="lesson-block lesson-game"><span class="lesson-label">در بازی</span><p>${l.game}</p></div>
      </div>`).join('') +
    `<div class="card-actions2"><button class="btn ok" data-hclose="1">فهمیدم</button></div>`;
  show('card-modal');
  $('card-body').querySelector('[data-hclose]').addEventListener('click', () => hide('card-modal'));
}

/* ---------------- تنظیمات (قلم / اندازه / رنگ) ---------------- */
const SETTINGS_KEYS = { font: 'mq_font', size: 'mq_size', theme: 'mq_theme' };

const FONT_OPTIONS = [
  { v: 'system',   label: 'پیش‌فرض سیستم',           family: '"Segoe UI", "Trebuchet MS", system-ui, -apple-system, sans-serif' },
  { v: 'vazir',    label: 'وزیرمتن (فارسی)',          family: '"Vazirmatn", Tahoma, "Segoe UI", sans-serif' },
  { v: 'tahoma',   label: 'تاهوما (فارسی)',            family: 'Tahoma, "Segoe UI", sans-serif' },
  { v: 'noto',     label: 'نوتو سانس عربی (فارسی)',    family: '"Noto Sans Arabic", Tahoma, "Segoe UI", sans-serif' },
  { v: 'segoe',    label: 'سگوئه یوآی',                family: '"Segoe UI", system-ui, sans-serif' },
  { v: 'georgia',  label: 'جورجیا (سریف)',             family: 'Georgia, "Times New Roman", serif' },
  { v: 'verdana',  label: 'وردانا',                    family: 'Verdana, Geneva, sans-serif' },
  { v: 'trebuchet', label: 'تربوشت',                   family: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { v: 'mono',     label: 'کوریر نیو (مونواسپیس)',     family: '"Courier New", Courier, monospace' },
];

const THEME_OPTIONS = [
  { v: 'dark',  label: 'تیره' },
  { v: 'light', label: 'روشن' },
  { v: 'high',  label: 'کنتراست بالا' },
];

function readSetting(key, def) {
  try { return localStorage.getItem(key) || def; } catch (e) { return def; }
}

function applyFont(v) {
  const opt = FONT_OPTIONS.find(o => o.v === v) || FONT_OPTIONS[0];
  document.body.style.fontFamily = opt.family;
  try { localStorage.setItem(SETTINGS_KEYS.font, v); } catch (e) { /* بدون حافظه */ }
}
function applyFontSize(px) {
  document.documentElement.style.fontSize = px + 'px';
  try { localStorage.setItem(SETTINGS_KEYS.size, String(px)); } catch (e) { /* بدون حافظه */ }
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(SETTINGS_KEYS.theme, t); } catch (e) { /* بدون حافظه */ }
}

function applySettings() {
  applyFont(readSetting(SETTINGS_KEYS.font, 'system'));
  applyFontSize(parseInt(readSetting(SETTINGS_KEYS.size, '16'), 10) || 16);
  applyTheme(readSetting(SETTINGS_KEYS.theme, 'dark'));
}

function openSettings() {
  const font = readSetting(SETTINGS_KEYS.font, 'system');
  const size = parseInt(readSetting(SETTINGS_KEYS.size, '16'), 10) || 16;
  const theme = readSetting(SETTINGS_KEYS.theme, 'dark');
  const fontsHtml = FONT_OPTIONS.map(o =>
    `<option value="${o.v}" ${o.v === font ? 'selected' : ''}>${o.label}</option>`).join('');
  const themesHtml = THEME_OPTIONS.map(o =>
    `<button class="btn small ${o.v === theme ? 'ok' : 'header-btn'}" data-theme="${o.v}">${o.label}</button>`).join('');
  $('card-body').innerHTML = `
    <h2>تنظیمات</h2>
    <div class="set-group">
      <label class="set-label" for="set-font">خانواده قلم</label>
      <select id="set-font" class="set-select">${fontsHtml}</select>
    </div>
    <div class="set-group">
      <label class="set-label" for="set-size">اندازه قلم: <b id="set-size-val">${size}px</b></label>
      <input id="set-size" type="range" min="13" max="22" step="1" value="${size}" class="set-range">
    </div>
    <div class="set-group">
      <label class="set-label">پوسته رنگی</label>
      <div class="set-themes">${themesHtml}</div>
    </div>
    <div class="card-actions2">
      <button class="btn header-btn" data-act="reset">بازنشانی پیش‌فرض</button>
      <button class="btn ok" data-act="close">بستن</button>
    </div>`;
  show('card-modal');
  $('set-font').addEventListener('change', (e) => applyFont(e.target.value));
  $('set-size').addEventListener('input', (e) => {
    applyFontSize(+e.target.value);
    $('set-size-val').textContent = e.target.value + 'px';
  });
  $('card-body').querySelectorAll('[data-theme]').forEach(b =>
    b.addEventListener('click', () => { applyTheme(b.dataset.theme); openSettings(); }));
  $('card-body').querySelector('[data-act="reset"]').addEventListener('click', () => {
    try {
      localStorage.removeItem(SETTINGS_KEYS.font);
      localStorage.removeItem(SETTINGS_KEYS.size);
      localStorage.removeItem(SETTINGS_KEYS.theme);
    } catch (e) { /* بدون حافظه */ }
    applySettings();
    openSettings();
  });
  $('card-body').querySelector('[data-act="close"]').addEventListener('click', () => hide('card-modal'));
}

/* ---------------- شروع ---------------- */
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
    $('sound-btn').textContent = soundOn ? 'صدا: روشن' : 'صدا: خاموش';
    try { localStorage.setItem('mq_sound', soundOn ? '1' : '0'); } catch (e) { /* بدون حافظه */ }
  });
  $('sound-btn').textContent = soundOn ? 'صدا: روشن' : 'صدا: خاموش';
  $('settings-btn').addEventListener('click', openSettings);
  applySettings();
  $('setup-start').addEventListener('click', startGame);
  $('add-player').addEventListener('click', () => {
    const n = $('players-list').children.length;
    if (n < 4) buildSetupRows(n + 1);
  });
  $('remove-player').addEventListener('click', () => {
    const n = $('players-list').children.length;
    if (n > 1) buildSetupRows(n - 1);
  });
  setupResume();
  openSetup();
}

window.addEventListener('DOMContentLoaded', init);
