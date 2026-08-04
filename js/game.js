/* ============================================================
   Money Quest — game engine
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
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
};

let currentPlayer = () => game.players[game.current];
let busy = false;

/* ---------------- audio (tiny WebAudio blips) ---------------- */
let audioCtx = null;
let soundOn = true;
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
  beginGame(players);
}

/* ---------------- game lifecycle ---------------- */
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

  // build tokens
  const tlayer = $('tokens');
  tlayer.innerHTML = '';
  p.forEach((pl) => {
    const t = document.createElement('div');
    t.className = 'token';
    t.id = 'token-' + pl.color.replace('#', '');
    t.style.background = pl.color;
    t.innerHTML = '<span>' + pl.name.charAt(0).toUpperCase() + '</span>';
    tlayer.appendChild(t);
    placeToken(pl);
  });

  hide('setup-modal');
  $('roll-btn').disabled = false;
  renderAll();
  log(`New game! ${p.map(x => x.name).join(', ')} take on the Rat Race.`);
  log(`Turn ${game.turn}: ${currentPlayer().name}'s move (${currentPlayer().job.name}).`);
  currentPlayer().isHuman ? promptStart() : takeTurn();
}

function promptStart() {
  showInfo(`Your turn, ${currentPlayer().name}!`,
    `You are a <b>${currentPlayer().job.name}</b> earning ${fmt(currentPlayer().salary)}/month with ${fmt(currentPlayer().expenses)} in expenses.<br><br>` +
    `Your mission: build <b>passive income greater than expenses</b> to escape the Rat Race.<br><br>Roll the dice!`,
    ['Roll Dice'], true);
}

/* ---------------- turn loop ---------------- */
async function takeTurn() {
  busy = true;
  const p = currentPlayer();
  $('roll-btn').disabled = true;
  renderAll();
  if (p.ai) await sleep(700);

  await roll(p);

  if (game.winner) { renderAll(); return; }

  // next player
  game.current = (game.current + 1) % game.players.length;
  game.turn++;
  renderAll();

  const next = currentPlayer();
  log(`Turn ${game.turn}: ${next.name}'s move (${next.job.name}).`);

  if (next.doubleRoll) {
    next.doubleRoll = false;
    if (next.isHuman) await showInfo('Charity Bonus!', 'Your generosity pays back — you roll twice this turn!', ['OK']);
    else log(`${next.name} uses their charity bonus roll.`);
  }

  busy = false;
  if (game.winner) return;
  if (next.ai) { takeTurn(); } else { $('roll-btn').disabled = false; renderAll(); }
}

async function roll(p) {
  const d1 = rand(6) + 1;
  const d2 = rand(6) + 1;
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
      ? 'You found a new job! Full salary returns next payday.'
      : 'You are on half pay while job-hunting.';
    if (p.isHuman) await showInfo('PAYDAY — Half Pay', msg, ['OK']);
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
    `<div class="st">Salary +${fmt(salary)}</div>` +
    (p.passiveIncome > 0 ? `<div class="st green">Passive income +${fmt(p.passiveIncome)}</div>` : '') +
    `<div class="st red">Expenses -${fmt(p.expenses)}</div>` +
    `<div class="st"><b>Cash now: ${fmt(p.cash)}</b></div>` +
    `<div class="tip">${escaped ? 'Passive income beats expenses — you did it!' : 'Collect your salary, pay your bills, and pocket your passive income. Every payday is a lesson in cash flow.'}</div>`;

  if (p.isHuman) {
    const title = escaped ? 'PAYDAY — ESCAPED THE RAT RACE!' : 'PAYDAY';
    await showInfo(title, html, ['OK']);
  } else {
    log(`${p.name} gets paid: cash ${fmt(p.cash)}.`);
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
      if (p.isHuman) log(`${p.name} was forced to sell ${a.name} for ${fmt(a.value)} to cover bills.`);
      else log(`${p.name} sells ${a.name} to cover bills.`);
    } else {
      p.expenses = Math.max(Math.round(p.baseExpenses * 0.5), Math.round(p.expenses * 0.9));
      p.cash += 200;
      p.bankruptcies++;
      if (p.isHuman) log(`${p.name} had to cut lifestyle spending 10% and get family help.`);
      else log(`${p.name} cuts lifestyle spending.`);
    }
  }
}

function addMonthlyExpense(p, amt) {
  const cap = Math.round(p.baseExpenses * 0.25);
  const extra = p.expenses - p.baseExpenses;
  if (extra >= cap) return 0;
  const add = Math.round(Math.min(amt, cap - extra));
  p.expenses += add;
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
  p.expenses += 80;
}

function repayLoan(p, loan) {
  if (p.cash >= loan.principal) {
    p.cash -= loan.principal;
    p.loans = p.loans.filter(l => l !== loan);
    p.expenses -= loan.monthly;
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
  log(`${p.name} sells ${a.name} for ${fmt(a.value)}.`);
  renderAll();
}

async function onOpportunity(p) {
  // draw today's market: one offer per category
  const offers = DEAL_CATS.map(dc => ({ dc, card: drawCat(dc.cat) }));

  const buyRows = offers.map((o, i) => {
    const card = o.card;
    const affordable = p.cash >= card.cost;
    return `
      <div class="deal-row">
        <div class="deal-info">
          <b>${card.title}</b>
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

  const html = `
    <p class="card-desc">Today's market has several offers. Pick the best deal to buy, or sell an asset you own.</p>
    ${buyRows}
    ${sellRows ? `<h3>Sell your assets</h3>${sellRows}` : ''}
    <div class="tip"><b>Lesson:</b> ${LESSONS.payback} Compare the payback of every offer before you buy.</div>`;

  if (p.isHuman) {
    $('card-body').innerHTML = `<h2>Deal of the Day</h2>${html}`;
    $('card-actions').innerHTML = `<button class="btn cancel" data-v="pass">Pass</button>`;
    show('card-modal');
    await new Promise((res) => {
      resolver = res;
      $('card-actions').querySelector('[data-v="pass"]').addEventListener('click', () => {
        hide('card-modal'); res('pass');
      });
      $('card-body').querySelectorAll('[data-buy]').forEach(btn => {
        btn.addEventListener('click', () => {
          const o = offers[+btn.dataset.buy];
          if (p.cash < o.card.cost) return;
          buyAsset(p, o.card);
          hide('card-modal'); res('buy');
        });
      });
      $('card-body').querySelectorAll('[data-sell]').forEach(btn => {
        btn.addEventListener('click', () => {
          const a = p.assets.find(x => x.name === btn.dataset.sell);
          if (!a) return;
          sellAsset(p, a);
          hide('card-modal'); res('sell');
        });
      });
    });
  } else {
    const reserve = Math.max(200, Math.min(2500, Math.round(p.expenses * 0.3)));
    const buyable = offers
      .filter(o => o.card.monthly > 0 && p.cash >= o.card.cost + reserve && paybackMonths(o.card) <= 90)
      .sort((x, y) => paybackMonths(x.card) - paybackMonths(y.card) || y.card.monthly - x.card.monthly);
    const best = buyable[0];
    if (best) { buyAsset(p, best.card); log(`${p.name} buys ${best.card.title} for ${fmt(best.card.cost)} (+${fmt(best.card.monthly)}/mo).`); }
    else { log(`${p.name} passes on today's deals.`); }
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
  log(`${p.name} buys ${card.title}. Passive income now ${fmt(p.passiveIncome)}/mo.`);
  renderAll();
}

async function onMarket(p) {
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
      if (offer > target.value * 1.5) {
        p.cash += offer;
        p.passiveIncome -= target.monthly;
        p.assets = p.assets.filter(a => a !== target);
        log(`${p.name} accepts a buyout of ${target.name} for ${fmt(offer)}.`);
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
    <div class="card-stats"><div><span>Cost</span><b>-${fmt(cost)}</b></div></div>
    <div class="tip"><b>Lesson:</b> ${card.lesson}</div>`;
  if (p.isHuman) await showInfo('Surprise Expense', html, ['OK']);
  else log(`${p.name} pays ${fmt(cost)} for ${card.title}.`);
}

async function onTax(p) {
  const rate = 0.12;
  const tax = Math.max(40, Math.round(p.salary * rate));
  p.cash -= tax;
  if (p.cash < 0) await handleDebt(p);
  p.totalTaxPaid += tax;
  sfx.bad();
  const html = `
    <div class="card-title">Tax Time</div>
    <div class="card-desc">Taxes fund roads, schools and hospitals. You owe <b>${fmt(tax)}</b> (12% of your ${fmt(p.salary)} salary).</div>
    <div class="tip"><b>Lesson:</b> ${LESSONS.active} Taxes grow with income — plan for them.</div>`;
  if (p.isHuman) await showInfo('Taxes', html, ['OK']);
  else log(`${p.name} pays ${fmt(tax)} in taxes.`);
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
  p.cash -= hospital;
  if (p.cash < 0) await handleDebt(p);
  const added = addMonthlyExpense(p, card.monthly);
  sfx.bad();
  const html = `
    <div class="card-title">${card.title}</div>
    <div class="card-desc">${card.desc}<br>Hospital bill <b>-${fmt(hospital)}</b>, family expenses <b>+${fmt(added)}/mo</b>.</div>
    <div class="tip"><b>Lesson:</b> ${card.lesson}</div>`;
  if (p.isHuman) await showInfo('Growing Family', html, ['OK']);
  else log(`${p.name}'s family grows: +${fmt(added)}/mo expenses.`);
}

async function onDownsized(p) {
  p.downsized = 2;
  p.salary = Math.round(p.job.salary * 0.5);
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

/* ---------------- end of game ---------------- */
async function endGame(w) {
  sfx.win();
  showConfetti();
  const winnerHtml = `
    <div class="win-avatar" style="background:${w.color}">${w.name.charAt(0).toUpperCase()}</div>
    <h2>${w.name} escaped the Rat Race!</h2>
    <p>${w.name} built <b>${fmt(w.passiveIncome)}/month</b> in passive income — enough to cover <b>${fmt(w.expenses)}/month</b> in expenses.</p>
    <div class="st">Net worth: <b>${fmt(netWorth(w))}</b> · Assets: <b>${w.assets.length}</b> · Cash: <b>${fmt(w.cash)}</b></div>
    <div class="tip">"${pick(WIN_TIPS)}"</div>
    <h3>Scoreboard</h3>
    <div class="scoreboard">
      ${game.players.map(p =>
        `<div class="sb-row ${p === w ? 'sb-win' : ''}"><span class="sb-dot" style="background:${p.color}"></span><b>${p.name}</b>` +
        (p === w ? '<em>Winner</em>' : (p.escaped ? '<em>Escaped</em>' : '<em>Rat Race</em>')) +
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
  return p.cash + assets - loans;
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
      <div class="cname"><b>${p.name}</b><span>${p.job.name}${p.ai ? ' · AI' : ''}</span></div>
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
    <div class="cgoal">Goal: passive income &gt; ${fmt(p.expenses)} expenses
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
        <div class="p2name"><b>Bank Loan</b><span>interest ${fmt(l.monthly)}/mo</span></div>
        <div class="p2val">${fmt(l.principal)}</div>
        <button class="btn small repay" data-repay="${i}">Repay</button>
      </div>`).join('')
    : '<div class="empty">No loans. Good — debt costs money every month.</div>';

  $('card-body').innerHTML = `
    <h2>${p.name}'s Portfolio</h2>
    <div class="pstats">
      <div><span>Cash</span><b>${fmt(p.cash)}</b></div>
      <div><span>Passive/mo</span><b class="green">+${fmt(p.passiveIncome)}</b></div>
      <div><span>Net worth</span><b>${fmt(netWorth(p))}</b></div>
      <div><span>Loans</span><b>${fmt(p.loans.reduce((s, l) => s + l.principal, 0))}</b></div>
    </div>
    <h3>Assets <span class="hint">sell for their current market value</span></h3>
    ${assetsHtml}
    <h3>Loans</h3>
    ${loansHtml}
    <div class="card-actions2">
      <button class="btn ok" data-act="loan">Borrow $1000</button>
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
    repayLoan(p, p.loans[i]);
    log(`${p.name} repays a bank loan.`);
    openPortfolio();
  };
  body.querySelectorAll('.sell').forEach(b => b.addEventListener('click', () => onSell(+b.dataset.sell)));
  body.querySelectorAll('.repay').forEach(b => b.addEventListener('click', () => onRepay(+b.dataset.repay)));
  body.querySelector('[data-act="loan"]').addEventListener('click', () => {
    if (p.loans.length >= 3) { log('Bank maxed out: you already have 3 loans.'); return; }
    takeLoan(p);
    sfx.buy();
    log(`${p.name} borrows $1,000 from the bank (+${fmt(80)}/mo interest).`);
    openPortfolio();
  });
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

/* ---------------- bootstrap ---------------- */
function init() {
  buildBoard();
  $('roll-btn').addEventListener('click', () => {
    if (busy || !game || game.winner) return;
    if (currentPlayer().ai) return;
    takeTurn();
  });
  $('portfolio-btn').addEventListener('click', openPortfolio);
  $('new-btn').addEventListener('click', () => location.reload());
  $('help-btn').addEventListener('click', openHelp);
  $('glossary-btn').addEventListener('click', openGlossary);
  $('sound-btn').addEventListener('click', () => {
    soundOn = !soundOn;
    $('sound-btn').textContent = soundOn ? 'Sound: On' : 'Sound: Off';
  });
  $('setup-start').addEventListener('click', startGame);
  $('add-player').addEventListener('click', () => {
    const n = $('players-list').children.length;
    if (n < 4) buildSetupRows(n + 1);
  });
  $('remove-player').addEventListener('click', () => {
    const n = $('players-list').children.length;
    if (n > 1) buildSetupRows(n - 1);
  });
  openSetup();
}

window.addEventListener('DOMContentLoaded', init);
