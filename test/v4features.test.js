const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

/* ================= feature 4a: seeded RNG / daily challenge ================= */
check(evalIn(window, `hashString('abc') === hashString('abc') && hashString('abc') !== hashString('abd')`), 'hashString is deterministic');
check(evalIn(window, `(() => {
  useSeededRng('seed1');
  const a = [rand(100), rand(100), rand(100)];
  useSeededRng('seed1');
  const b = [rand(100), rand(100), rand(100)];
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
})()`), 'same seed reproduces the same RNG sequence');
check(evalIn(window, `/^\\d{4}-\\d{2}-\\d{2}$/.test(todaySeed())`), 'todaySeed is a YYYY-MM-DD date');

const checkbox = document.getElementById('daily-challenge');
checkbox.checked = true;
window.startGame();
check(evalIn(window, 'game.daily === true && typeof game.seed === "string"'), 'daily game sets game.daily and a seed');

/* deck order is identical for two daily games on the same date */
const deckSig = () => evalIn(window, `game.decks.market.map(c => c.id).join(',') + '|' + game.decks.oppByCat.business.map(c => c.id).join(',')`);
const firstDeck = deckSig();
window.startGame();
check(deckSig() === firstDeck, 'same-day daily games shuffle decks identically');

/* non-daily game carries no seed */
checkbox.checked = false;
window.startGame();
check(evalIn(window, 'game.daily === false && game.seed === null'), 'non-daily game has no seed');

/* seeded dice roll: same (seed, turn, player) yields the same dice */
check(evalIn(window, `(() => {
  const r1 = mulberry32(hashString('2026-08-09:1:#ff5252'));
  const r2 = mulberry32(hashString('2026-08-09:1:#ff5252'));
  return Math.floor(r1() * 6) + 1 === Math.floor(r2() * 6) + 1;
})()`), 'daily dice seed reproduces the same roll');

/* ================= feature 4b: AI turn speed ================= */
check(evalIn(window, `(() => { game.difficulty = 'easy'; return aiDelay() === 1200; })()`), 'easy AI delay = 1200ms');
check(evalIn(window, `(() => { game.difficulty = 'medium'; return aiDelay() === 700; })()`), 'medium AI delay = 700ms');
check(evalIn(window, `(() => { game.difficulty = 'hard'; return aiDelay() === 400; })()`), 'hard AI delay = 400ms');

/* ================= feature 4c: loan amount options ================= */
check(evalIn(window, `LOAN_OPTIONS.length === 3`), 'three loan sizes defined');
evalIn(window, `(() => {
  const p = game.players[0];
  p.cash = 100; p.loans = [];
  const opt = takeLoan(p, 500);
  window.__loan = { cash: p.cash, opt,
    principal: p.loans[0].principal, monthly: p.loans[0].monthly };
})()`);
const loan = evalIn(window, 'window.__loan');
check(loan.cash === 600 && loan.principal === 500 && loan.monthly === 40, 'takeLoan(p, 500) grants $500 at -$40/mo');
evalIn(window, `(() => {
  const p = game.players[1];
  p.cash = 100; p.loans = [];
  const opt = takeLoan(p);
  window.__loan2 = { cash: p.cash, principal: p.loans[0].principal, monthly: p.loans[0].monthly };
})()`);
const loan2 = evalIn(window, 'window.__loan2');
check(loan2.cash === 1100 && loan2.principal === 1000 && loan2.monthly === 80, 'default takeLoan(p) = $1000 at -$80/mo');

/* ================= feature 4d: portfolio cash-flow chart ================= */
evalIn(window, `(() => {
  const p = currentPlayer();
  p.history = [];
  p.isHuman = false; p.downsized = 0;
  p.cash = 1000; p.passiveIncome = 0; p.expenses = p.baseExpenses;
  return true;
})()`);
evalIn(window, `currentPlayer().history.push({ passive: 0, expenses: 500 })`);
window.openPortfolio();
const chart = document.querySelector('[data-chart]');
check(!!chart, 'portfolio renders a cash-flow chart');
check(chart.querySelectorAll('.chart-bar.passive').length === 1, 'chart has a passive-income bar');
check(chart.querySelectorAll('.chart-bar.expense').length === 1, 'chart has an expenses bar');
document.getElementById('card-modal').style.display = 'none';

/* history is capped so the chart never overflows (via the onPayday cap) */
evalIn(window, `(() => {
  const p = currentPlayer();
  p.isHuman = false; p.downsized = 0;
  p.cash = 1000; p.passiveIncome = 0; p.expenses = p.baseExpenses;
  p.history = Array.from({ length: 24 }, () => ({ passive: 10, expenses: 20 }));
  onPayday(p);
  return p.history.length;
})()`);
check(evalIn(window, 'currentPlayer().history.length') === 24, 'history is capped at 24 paydays');

/* ================= feature 4e: color-blind token shapes ================= */
check(evalIn(window, `cbTokens() === false`), 'color-blind shapes off by default');
window.localStorage.setItem('mq_cb', '1');
evalIn(window, 'buildTokens(game.players)');
check(evalIn(window, `cbTokens() === true`), 'cbTokens() reflects the stored flag');
const tokens = document.querySelectorAll('#tokens .token');
check(tokens.length === evalIn(window, 'game.players.length'), 'tokens rebuilt for every player');
check([...tokens].every(t => /shape-\d/.test(t.className)), 'tokens get shape classes when enabled');
window.localStorage.setItem('mq_cb', '0');
evalIn(window, 'buildTokens(game.players)');
check([...document.querySelectorAll('#tokens .token')].every(t => !/shape-\d/.test(t.className)), 'shapes removed when disabled');

/* ================= persistence of daily + seed + history ================= */
window.localStorage.setItem('mq_cb', '0');
const dailyCheckbox = document.getElementById('daily-challenge');
dailyCheckbox.checked = true;
window.startGame();
evalIn(window, `(() => {
  const p = game.players[0];
  p.history.push({ passive: 5, expenses: 3 });
  saveGame();
})()`);
const key = 'mq_save_' + document.documentElement.lang;
const saved = JSON.parse(window.localStorage.getItem(key));
check(saved.daily === true && typeof saved.seed === 'string', 'save persists daily flag and seed');
check(Array.isArray(saved.players[0].history) && saved.players[0].history.length === 1, 'save persists player history');

const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.daily === true'), 'resume restores daily flag');
check(evalIn(b.window, `game.seed === '${saved.seed}'`), 'resume restores seed');
check(evalIn(b.window, 'game.players[0].history.length') === 1, 'resume restores history');

console.log(ok ? 'V4 FEATURES OK' : 'V4 FEATURES FAIL');
process.exit(ok ? 0 : 1);
