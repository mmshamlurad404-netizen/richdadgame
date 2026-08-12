const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

window.startGame();

/* ================= A: emergency fund ================= */
check(evalIn(window, `game.players.every(p => p.emergencyFund === 0)`), 'new players start with an empty emergency fund');

/* deposit moves cash into the fund */
evalIn(window, `(() => {
  const p = game.players[0];
  p.cash = 1000;
  const moved = depositEmergency(p, 100);
  window.__dep = { moved, fund: p.emergencyFund, cash: p.cash };
})()`);
const dep = evalIn(window, 'window.__dep');
check(dep.moved === 100 && dep.fund === 100 && dep.cash === 900, 'deposit moves $100 from cash to the fund');

/* withdraw returns cash */
evalIn(window, `(() => {
  const p = game.players[0];
  const got = withdrawEmergency(p, 60);
  window.__wd = { got, fund: p.emergencyFund, cash: p.cash };
})()`);
const wd = evalIn(window, 'window.__wd');
check(wd.got === 60 && wd.fund === 40 && wd.cash === 960, 'withdraw returns cash from the fund');

/* fund target is 3x expenses */
evalIn(window, `(() => {
  const p = game.players[0];
  p.expenses = 500;
  window.__ft = fundTarget(p);
})()`);
check(evalIn(window, 'window.__ft') === 1500, 'fund target is 3x monthly expenses');

/* surprise costs draw from the fund first */
evalIn(window, `(() => {
  const p = game.players[0];
  p.cash = 1000; p.emergencyFund = 80; p.downsized = 0; p.isHuman = false;
  const nextCard = game.decks.expense[0] || EXPENSE_CARDS[0];
  const beforeFund = p.emergencyFund;
  const beforeCash = p.cash;
  onExpense(p);
  window.__scaled = scaleIncome(p, nextCard.cash);
  window.__ex = { fund: p.emergencyFund, cash: p.cash, beforeFund, beforeCash };
})()`);
const ex = evalIn(window, 'window.__ex');
const scaled = evalIn(window, 'window.__scaled');
const fromFund = Math.min(ex.beforeFund, scaled);
check(ex.fund === ex.beforeFund - fromFund && ex.cash === ex.beforeCash - (scaled - fromFund), 'expense draws from the fund before cash');
check(ex.cash + ex.fund === ex.beforeCash + ex.beforeFund - scaled, 'expense total outflow equals the scaled cost');

/* medical-bills event also draws from the fund */
evalIn(window, `(() => {
  const p = game.players[0];
  p.cash = 1000; p.emergencyFund = 50;
  const med = EVENT_CARDS.find(c => c.cost);
  const cost = scaleIncome(p, med.cost);
  applyEvent(med, p);
  window.__med = { fund: p.emergencyFund, cash: p.cash, cost };
})()`);
const med = evalIn(window, 'window.__med');
check(med.fund === 0 && med.cash === 1000 - (med.cost - 50), 'medical bill event draws from the fund first');

/* emergency fund earns 1% interest on payday */
evalIn(window, `(() => {
  const p = game.players[0];
  p.emergencyFund = 1000; p.cash = 10000; p.downsized = 0; p.salary = 0; p.expenses = 0; p.passiveIncome = 0; p.isHuman = false;
  onPayday(p);
  window.__int = p.emergencyFund;
})()`);
check(evalIn(window, 'window.__int') === 1010, 'fund earns 1% interest on payday');

/* net worth includes the fund */
evalIn(window, `(() => {
  const p = game.players[0];
  p.cash = 100; p.emergencyFund = 200; p.assets = []; p.loans = [];
  window.__nw = netWorth(p);
})()`);
check(evalIn(window, 'window.__nw') === 300, 'net worth counts the emergency fund');

/* retire clears the fund */
evalIn(window, `(() => {
  const p = game.players[0];
  p.emergencyFund = 500;
  retire(p);
  window.__rt = p.emergencyFund;
})()`);
check(evalIn(window, 'window.__rt') === 0, 'retirement empties the emergency fund');

/* ================= persistence ================= */
evalIn(window, `(() => {
  const p = game.players[0];
  p.bankrupt = false;
  p.emergencyFund = 320;
  saveGame();
})()`);
const key = 'mq_save_' + document.documentElement.lang;
const saved = JSON.parse(window.localStorage.getItem(key));
check(saved.players[0].emergencyFund === 320, 'emergency fund persisted in save');

const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.players[0].emergencyFund') === 320, 'resume restores emergency fund');

/* old saves without the field backfill to 0 */
const oldSave = JSON.parse(JSON.stringify(saved));
delete oldSave.players[0].emergencyFund;
const b2 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSave) });
b2.document.getElementById('resume-btn').click();
check(evalIn(b2.window, 'game.players[0].emergencyFund') === 0, 'old saves backfill emergency fund to 0');

console.log(ok ? 'V8A EMERGENCY FUND OK' : 'V8A EMERGENCY FUND FAIL');
process.exit(ok ? 0 : 1);
