const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

window.startGame();
const key = 'mq_save_' + document.documentElement.lang;

/* ================= A: asset market trends ================= */
check(evalIn(window, `DEAL_CATS.every(dc => game.trends[dc.cat] === 'flat')`), 'new games start with every category flat');
const upLabel = lang === 'fa' ? 'صعودی' : 'Up';
const downLabel = lang === 'fa' ? 'نزولی' : 'Down';
const flatLabel = lang === 'fa' ? 'پایدار' : 'Stable';
check(evalIn(window, `trendName('up') === '${upLabel}' && trendName('down') === '${downLabel}' && trendName('flat') === '${flatLabel}'`), 'trendName maps directions to labels');
check(evalIn(window, `trendBadge('up').indexOf('trend-up') >= 0 && trendBadge('down').indexOf('trend-down') >= 0`), 'trendBadge renders direction classes');

/* a market card with a trend updates game.trends */
evalIn(window, `(() => {
  const realRng = _rng;
  _rng = () => 1; // rand(3) !== 0 -> market card, not an event
  game.decks.market = [MARKET_CARDS[0]]; // Stock Boom -> stock up
  const p = game.players[0];
  p.isHuman = false;
  onMarket(p);
  _rng = realRng;
  window.__tr = game.trends.stock;
})()`);
check(evalIn(window, 'window.__tr') === 'up', 'Stock Boom sets the stock trend to up');

/* buyAsset snapshots the current trend onto the asset */
evalIn(window, `(() => {
  const p = game.players[0];
  game.trends.stock = 'up';
  buyAsset(p, OPPORTUNITY_CARDS[2]); // Pixel Games Stock
  window.__snap = p.assets[p.assets.length - 1].trend;
})()`);
check(evalIn(window, 'window.__snap') === 'up', 'bought assets record the category trend at purchase time');

/* up/down trends drift asset values on payday */
evalIn(window, `(() => {
  const p = game.players[0];
  p.isHuman = false; p.downsized = 0; p.salary = 0; p.expenses = 0; p.passiveIncome = 0;
  p.cash = 10000; p.emergencyFund = 0; p.livingTicks = 0;
  p.assets = [{ name: 'UpA', cat: 'stock', cost: 1000, value: 1000, monthly: 0, trend: 'up' }];
  onPayday(p);
  window.__up = p.assets[0].value;
  p.assets = [{ name: 'DnA', cat: 'stock', cost: 1000, value: 1000, monthly: 0, trend: 'down' }];
  onPayday(p);
  window.__dn = p.assets[0].value;
})()`);
check(evalIn(window, 'window.__up') === 1010, 'up-trending asset drifts +1% on payday');
check(evalIn(window, 'window.__dn') === 990, 'down-trending asset drifts -1% on payday');

/* AI respects trends: medium skips down-trends, hard favours up-trends */
evalIn(window, `(() => {
  const p = game.players[0];
  game.trends.stock = 'down'; game.trends.business = 'down';
  const dcS = { label: 'S' }, dcB = { label: 'B' };
  const stockCard = { title: 'St', cat: 'stock', cost: 300, monthly: 100, value: 300 };
  const bizCard = { title: 'Bz', cat: 'business', cost: 300, monthly: 100, value: 300 };
  game.difficulty = 'medium';
  p.cash = 5000; p.assets = []; p.loans = []; p.passiveIncome = 0;
  window.__med = aiPickDeals(p, [{ dc: dcS, card: stockCard }, { dc: dcB, card: bizCard }]).length;
  game.trends.stock = 'up'; game.trends.business = 'down';
  game.difficulty = 'hard';
  p.cash = 400; p.assets = []; p.loans = []; p.passiveIncome = 0;
  const picked = aiPickDeals(p, [{ dc: dcS, card: stockCard }, { dc: dcB, card: bizCard }]);
  window.__hard = { len: picked.length, first: picked[0] ? picked[0].title : null };
})()`);
check(evalIn(window, 'window.__med') === 0, 'medium AI passes on down-trending categories');
check(evalIn(window, 'window.__hard.first') === 'St', 'hard AI buys the up-trending deal first');

/* ================= B: career paths ================= */
evalIn(window, `(() => {
  const p = game.players[0];
  p.careerTier = 0;
  const before = { salary: p.salary, expenses: p.expenses };
  window.__bp = before;
  p.salary = p.job.salary; p.baseSalary = p.job.salary;
  p.expenseItems = [{ name: LIVING_EXPENSE_NAME, monthly: p.job.expenses }];
  p.baseExpenses = p.job.expenses;
  p.pathId = 'frugal';
  promotePlayer(p);
  window.__fp = { salary: p.salary, expected: Math.round(p.job.salary * 0.85 * CAREER_TIERS[1].salaryMult) };
})()`);
const fp = evalIn(window, 'window.__fp');
check(fp.salary === fp.expected, 'promotion scales salary by the frugal path multiplier');
evalIn(window, `(() => {
  const p = game.players[0];
  p.pathId = 'balanced'; p.careerTier = 0; p.salary = p.job.salary; p.baseSalary = p.job.salary;
  const r = promotePlayer(p);
  window.__bal = r.newSalary;
})()`);
check(evalIn(window, 'window.__bal') === evalIn(window, `Math.round(game.players[0].job.salary * CAREER_TIERS[1].salaryMult)`), 'balanced path matches the classic promotion');

/* setup select drives the starting salary/expenses */
const c = loadGame(htmlDir, jsDir);
const frugalSel = c.document.querySelector('.prow-path');
frugalSel.value = 'frugal';
c.window.startGame();
check(evalIn(c.window, `game.players[0].salary === Math.round(game.players[0].job.salary * 0.85)`), 'choosing Frugal in setup lowers the starting salary');
check(evalIn(c.window, `game.players[0].expenses === Math.round(game.players[0].job.expenses * 0.7)`), 'choosing Frugal in setup lowers the starting expenses');
check(evalIn(c.window, `game.players[0].pathId === 'frugal'`), 'pathId recorded on the player');

/* ================= C: lifestyle dilemmas ================= */
check(evalIn(window, `LIFESTYLE_CARDS.length >= 6`), 'at least six lifestyle dilemmas defined');
check(evalIn(window, `Array.isArray(game.decks.lifestyle) && game.decks.lifestyle.length > 0`), 'lifestyle deck is shuffled at game start');

/* applyLifestyle moves cash, passive income, expenses, salary and the fund */
evalIn(window, `(() => {
  const p = game.players[0];
  p.cash = 1000; p.passiveIncome = 10; p.salary = 500; p.baseSalary = 500; p.emergencyFund = 0;
  const card = {
    title: 'T',
    a: { label: 'A', effect: { cash: -50, monthly: 25 } },
    b: { label: 'B', effect: { salary: 100, emergency: 200 } },
  };
  applyLifestyle(p, card, 'a');
  window.__l1 = { cash: p.cash, passive: p.passiveIncome };
  applyLifestyle(p, card, 'b');
  window.__l2 = { salary: p.salary, fund: p.emergencyFund };
})()`);
const l1 = evalIn(window, 'window.__l1');
const l2 = evalIn(window, 'window.__l2');
check(l1.cash === 950 && l1.passive === 35, 'choice A moves cash and adds passive income');
check(l2.salary === 600 && l2.fund === 200, 'choice B raises salary and fills the emergency fund');

/* AI picks the higher-value side on hard, flips a coin on easy */
check(evalIn(window, `(() => {
  game.difficulty = 'hard';
  const card = { a: { effect: { cash: -200, monthly: 40 } }, b: { effect: { cash: 0 } } };
  return aiLifestyleChoice(card) === 'a';
})()`), 'hard AI picks the side with the better monthly value');
check(evalIn(window, `(() => {
  game.difficulty = 'easy';
  const card = { a: { effect: { cash: -999 } }, b: { effect: { cash: 0 } } };
  const seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(aiLifestyleChoice(card));
  return seen.size === 2;
})()`), 'easy AI is impulsive: both lifestyle sides are possible');

/* onOpportunity draws a lifestyle card when rng forces it */
evalIn(window, `(() => {
  const realRng = _rng;
  _rng = () => 0; // rand(4) === 0 -> lifestyle dilemma
  game.difficulty = 'medium';
  const p = game.players[0];
  p.isHuman = false; p.ai = true; p.cash = 1000;
  const before = game.decks.lifestyle.length;
  onOpportunity(p);
  _rng = realRng;
  window.__opp = { before, after: game.decks.lifestyle.length };
})()`);
const opp = evalIn(window, 'window.__opp');
check(opp.after === opp.before - 1, 'a lifestyle card is drawn (not the deal market) when rng forces it');

/* ================= D: startup ventures ================= */
check(evalIn(window, `DEAL_CATS.some(dc => dc.cat === 'venture')`), 'venture is a deal category');
check(evalIn(window, `OPPORTUNITY_CARDS.filter(c => c.cat === 'venture').every(c => c.buildTurns >= 2 && c.failChance > 0)`), 'venture cards have a build phase and failure chance');

/* buying a venture creates a building asset that pays nothing yet */
evalIn(window, `(() => {
  const p = game.players[0];
  const card = OPPORTUNITY_CARDS.find(c => c.cat === 'venture' && c.buildTurns === 3); // App Startup
  p.cash = 10000; p.passiveIncome = 0; p.assets = [];
  buyAsset(p, card);
  const a = p.assets[p.assets.length - 1];
  window.__vb = { building: a.building, buildLeft: a.buildLeft, monthly: a.monthly, planned: a.plannedMonthly, passive: p.passiveIncome, cash: p.cash, buildTurns: card.buildTurns, cost: card.cost };
})()`);
const vb = evalIn(window, 'window.__vb');
check(vb.building === true && vb.monthly === 0 && vb.passive === 0, 'a funded venture is building and pays no income yet');
check(vb.buildLeft === 3 && vb.planned === 700 && vb.cash === 10000 - 3000, 'the App Startup builds for 3 paydays toward +$700/mo');

/* a successful launch adds the planned passive income */
evalIn(window, `(() => {
  const realRng = _rng;
  _rng = () => 0.9; // no failure
  const p = game.players[0];
  const a = p.assets.find(x => x.building);
  const planned = a.plannedMonthly;
  a.buildLeft = 1; p.passiveIncome = 0;
  const notes = resolveBuilds(p);
  window.__ln = { building: a.building, monthly: a.monthly, passive: p.passiveIncome, planned, note: notes[0] };
  _rng = realRng;
})()`);
const ln = evalIn(window, 'window.__ln');
check(ln.building === false && ln.monthly === ln.planned && ln.passive === ln.planned, 'a successful venture launches into full passive income');
check((ln.note || '').indexOf(lang === 'fa' ? 'راه افتاد' : 'launched') >= 0, 'launch is reported in the payday note');

/* a failed venture is removed and salvages a fraction of its value */
evalIn(window, `(() => {
  const realRng = _rng;
  _rng = () => 0; // guaranteed failure
  const p = game.players[0];
  p.cash = 1000;
  p.assets.push({ name: 'Flop', cat: 'venture', cost: 3000, value: 3000, monthly: 0, building: true, buildLeft: 1, plannedMonthly: 700, failChance: 0.35 });
  const notes = resolveBuilds(p);
  window.__fl = { left: p.assets.some(a => a.name === 'Flop'), cash: p.cash, note: notes[0] };
  _rng = realRng;
})()`);
const fl = evalIn(window, 'window.__fl');
check(fl.left === false && fl.cash === 1000 + Math.round(3000 * 0.3), 'a failed venture is removed and salvages 30%');
check((fl.note || '').indexOf(lang === 'fa' ? 'شکست خورد' : 'FAILED') >= 0, 'failure is reported in the payday note');

/* ================= persistence & backfill ================= */
evalIn(window, `(() => {
  const p = game.players[0];
  p.bankrupt = false;
  p.pathId = 'hustler';
  game.trends.business = 'up';
  p.assets.push({ name: 'InBuild', cat: 'venture', cost: 1000, value: 1000, monthly: 0, building: true, buildLeft: 2, plannedMonthly: 300, failChance: 0.2 });
  saveGame();
})()`);
const saved = JSON.parse(window.localStorage.getItem(key));
check(saved.trends && saved.trends.business === 'up', 'trends persisted in save');
check(saved.decks.lifestyle.length >= 0 && saved.decks.oppByCat.venture.length >= 0, 'lifestyle and venture decks saved');
check(saved.players[0].pathId === 'hustler', 'pathId persisted in save');
check(saved.players[0].assets.some(a => a.building === true), 'building ventures persist in save');

const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.trends.business') === 'up', 'resume restores trends');
check(evalIn(b.window, 'game.players[0].pathId') === 'hustler', 'resume restores pathId');
check(evalIn(b.window, 'game.players[0].assets.some(a => a.building === true)'), 'resume restores a building venture');

/* old saves backfill all new fields */
const oldSave = JSON.parse(JSON.stringify(saved));
delete oldSave.trends;
delete oldSave.decks.lifestyle;
delete oldSave.decks.oppByCat.venture;
delete oldSave.players[0].pathId;
delete oldSave.players[0].assets[0].building;
const b2 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSave) });
b2.document.getElementById('resume-btn').click();
check(evalIn(b2.window, `Object.values(game.trends).every(t => t === 'flat')`), 'old saves backfill trends to flat');
check(evalIn(b2.window, `game.decks.lifestyle.length`) === evalIn(window, 'LIFESTYLE_CARDS.length'), 'old saves backfill a fresh lifestyle deck');
check(evalIn(b2.window, `game.decks.oppByCat.venture.length`) === evalIn(window, `OPPORTUNITY_CARDS.filter(c => c.cat === 'venture').length`), 'old saves backfill a fresh venture deck');
check(evalIn(b2.window, 'game.players[0].pathId') === 'balanced', 'old saves backfill pathId to balanced');

/* ================= E: charity bonus rolls twice in a row ================= */
(async () => {
  const d = loadGame(htmlDir, jsDir);
  d.document.getElementById('daily-challenge').checked = true;
  d.window.startGame();
  evalIn(d.window, `game.players.forEach(x => { x.isHuman = false; x.ai = true; });`);
  // daily dice are deterministic: compute the roll the player will make
  const firstSum = evalIn(d.window, `(() => {
    const p = game.players[0];
    const r = mulberry32(hashString(game.seed + ':' + game.turn + ':' + p.color));
    return Math.floor(r() * 6) + 1 + Math.floor(r() * 6) + 1;
  })()`);
  const charityIdx = 27;
  evalIn(d.window, `(() => {
    const p = game.players[0];
    p.cash = 10000;
    p.position = (${charityIdx} - ${firstSum} + BOARD_SIZE) % BOARD_SIZE;
  })()`);
  await evalIn(d.window, 'takeTurn()');
  // both rolls use the same daily seed, so the player lands charity + rollSum
  const boardSize = evalIn(window, 'BOARD_SIZE');
  const expected = (charityIdx + firstSum) % boardSize;
  check(evalIn(d.window, 'game.players[0].position') === expected, 'a charity bonus rolls twice in a row (player moved again after GIVING)');
  check(evalIn(d.window, 'game.players[0].doubleRoll') === false, 'the charity bonus roll is consumed');
  check(evalIn(d.window, 'game.turn') >= 2, 'the turn advanced after the double roll');
  console.log(ok ? 'V9 DEPTH FEATURES OK' : 'V9 DEPTH FEATURES FAIL');
  process.exit(ok ? 0 : 1);
})();
