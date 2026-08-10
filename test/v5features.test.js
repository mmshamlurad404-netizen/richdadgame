const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

window.startGame();

/* ================= smarter loans: credit score + loan kinds ================= */
check(evalIn(window, `game.players.every(p => p.credit === 700)`), 'new players start at credit 700');

/* credit tiers change the standard rate */
check(evalIn(window, `(() => { const p = game.players[0]; p.credit = 850; return rateFor(p); })()`) === 0.075, 'good credit (>=750) = 7.5% rate');
check(evalIn(window, `(() => { const p = game.players[0]; p.credit = 700; return rateFor(p); })()`) === 0.08, 'medium credit = 8% rate');
check(evalIn(window, `(() => { const p = game.players[0]; p.credit = 500; return rateFor(p); })()`) === 0.09, 'bad credit (<650) = 9% rate');

/* standard loan monthly tracks credit */
evalIn(window, `(() => {
  const p = game.players[0];
  p.credit = 700; p.cash = 100; p.loans = [];
  const opt = takeLoan(p, 1000);
  window.__l1 = { cash: p.cash, monthly: opt.monthly, principal: p.loans[0].principal, kind: p.loans[0].kind };
})()`);
const l1 = evalIn(window, 'window.__l1');
check(l1.cash === 1100 && l1.principal === 1000 && l1.monthly === 80 && l1.kind === 'standard', 'standard $1000 loan at credit 700 = -$80/mo');

evalIn(window, `(() => {
  const p = game.players[1];
  p.credit = 850; p.cash = 100; p.loans = [];
  const opt = takeLoan(p, 1000);
  window.__l2 = { monthly: opt.monthly, kind: p.loans[0].kind };
})()`);
check(evalIn(window, 'window.__l2.monthly') === 75, 'good credit gets the cheaper $75/mo standard rate');

/* interest-only loan: lower monthly, higher settle cost */
evalIn(window, `(() => {
  const p = game.players[1];
  p.credit = 700; p.cash = 100; p.loans = [];
  const opt = takeLoan(p, 1500);
  window.__l3 = { monthly: opt.monthly, principal: p.loans[0].principal, kind: p.loans[0].kind };
})()`);
const l3 = evalIn(window, 'window.__l3');
check(l3.kind === 'interestOnly' && l3.monthly === 75 && l3.principal === 1500, 'interest-only $1500 loan = -$75/mo');

evalIn(window, `(() => {
  const p = game.players[1];
  window.__settle = loanSettleCost(p.loans[0]);
})()`);
check(evalIn(window, 'window.__settle') === 1800, 'interest-only loan settles for 1.2x principal ($1800)');
check(evalIn(window, `loanSettleCost({ principal: 500, kind: 'standard' })`) === 500, 'standard loan settles for full principal');

/* repaying raises credit, capped at 850 */
evalIn(window, `(() => {
  const p = game.players[1];
  p.credit = 700; p.cash = 5000;
  const ok = repayLoan(p, p.loans[0]);
  window.__rp = { ok, credit: p.credit, loans: p.loans.length };
})()`);
const rp = evalIn(window, 'window.__rp');
check(rp.ok && rp.credit === 710 && rp.loans === 0, 'repaying a loan raises credit to 710');

evalIn(window, `(() => {
  const p = game.players[1];
  p.credit = 845; p.cash = 5000;
  takeLoan(p, 1000);
  repayLoan(p, p.loans[0]);
  window.__cap = p.credit;
})()`);
check(evalIn(window, 'window.__cap') === 850, 'credit is capped at 850');

/* can't repay without enough cash */
evalIn(window, `(() => {
  const p = game.players[1];
  p.credit = 700; p.cash = 100;
  takeLoan(p, 500);
  p.cash = 100;
  const ok = repayLoan(p, p.loans[0]);
  window.__poor = { ok, loans: p.loans.length };
})()`);
const poor = evalIn(window, 'window.__poor');
check(!poor.ok && poor.loans === 1, 'repaying without cash fails');

/* restructure drops credit */
evalIn(window, `(() => {
  const p = game.players[1];
  p.isHuman = false; p.credit = 700; p.cash = -50; p.assets = []; p.loans = [];
  restructure(p);
  window.__rst = p.credit;
})()`);
check(evalIn(window, 'window.__rst') === 550, 'restructure drops credit to 550');

/* ================= persistence ================= */
evalIn(window, `(() => {
  const p = game.players[0];
  p.credit = 812;
  saveGame();
})()`);
const key = 'mq_save_' + document.documentElement.lang;
const saved = JSON.parse(window.localStorage.getItem(key));
check(saved.players[0].credit === 812, 'credit persisted in save');

const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.players[0].credit') === 812, 'resume restores credit');

/* old saves without credit backfill to 700 */
const oldSave = JSON.parse(JSON.stringify(saved));
delete oldSave.players[0].credit;
const b2 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSave) });
b2.document.getElementById('resume-btn').click();
check(evalIn(b2.window, 'game.players[0].credit') === 700, 'old saves backfill credit to 700');

/* ================= progressive tax brackets ================= */
check(evalIn(window, `TAX_BRACKETS.length === 4`), 'four progressive tax brackets defined');
check(evalIn(window, 'taxOn(0)') === 40, 'low salary pays the $40 minimum');
check(evalIn(window, 'taxOn(500)') === 50, 'salary 500 taxed 10% = $50');
check(evalIn(window, 'taxOn(1000)') === 110, 'salary 1000 = 10% on 800 + 15% on 200 = $110');
check(evalIn(window, 'taxOn(3000)') === 480, 'salary 3000 = 10%×800 + 15%×1200 + 22%×1000 = $480');
check(evalIn(window, 'taxOn(6000)') === 1240, 'salary 6000 crosses all brackets = $1240');

/* promotion pushes salary into higher brackets (career already imported) */
evalIn(window, `(() => {
  const p = game.players[0];
  p.careerTier = 0; p.salary = p.job.salary;
  const before = taxOn(p.salary);
  promotePlayer(p);
  window.__tx = { before, after: taxOn(p.salary) };
})()`);
const tx = evalIn(window, 'window.__tx');
check(tx.after >= tx.before, 'promotion never lowers the tax bill');

console.log(ok ? 'V5 REALISM FEATURES OK' : 'V5 REALISM FEATURES FAIL');
process.exit(ok ? 0 : 1);
