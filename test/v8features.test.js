const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

window.startGame();
const key = 'mq_save_' + document.documentElement.lang;

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

/* ================= B: deal payback rating ================= */
check(evalIn(window, `paybackRating({cost: 5000, monthly: 100}).cls`) === 'pr-slow', 'slow deal is rated pr-slow');
check(evalIn(window, `paybackRating({cost: 1200, monthly: 100}).cls`) === 'pr-great', '12-month payback is a great deal');
check(evalIn(window, `paybackRating({cost: 2400, monthly: 100}).cls`) === 'pr-good', '24-month payback is a good deal');
check(evalIn(window, `paybackRating({cost: 3600, monthly: 100}).cls`) === 'pr-fair', '36-month payback is a fair deal');
check(evalIn(window, `paybackRating({cost: 100, monthly: 0}).cls`) === 'pr-slow', 'zero income deal is rated slow');
check(evalIn(window, `paybackRating({value: 1200, monthly: 100}).cls`) === 'pr-great', 'assets without cost fall back to value');
check(evalIn(window, `paybackBadge({cost: 600, monthly: 50}).includes('pr-great')`), 'paybackBadge renders the rating class');
check(evalIn(window, `paybackMonths({value: 1000, monthly: 100})`) === 10, 'paybackMonths uses value when cost is absent');

/* ================= C: asset value transparency + per-category insurance ================= */
check(evalIn(window, `game.players.every(p => Array.isArray(p.insurance) && p.insurance.length === 0)`), 'new players start uninsured');

/* premium is 1% of insured asset value */
evalIn(window, `(() => {
  const p = game.players[0];
  p.assets.push({ name: 'House', cat: 'realestate', cost: 10000, value: 10000, monthly: 500 });
  const pre = p.expenses;
  buyInsurance(p, 'realestate');
  window.__ins = { pre, post: p.expenses, insured: p.insurance.slice(), prem: insurancePremium(p) };
})()`);
const ins = evalIn(window, 'window.__ins');
check(ins.insured.includes('realestate') && ins.prem === 100, 'buying insurance adds a 1% monthly premium');
check(ins.post === ins.pre + 100, 'insurance premium flows into monthly expenses');

/* cancel removes the premium */
evalIn(window, `(() => {
  const p = game.players[0];
  sellInsurance(p, 'realestate');
  window.__cancel = { prem: insurancePremium(p), insured: p.insurance.slice() };
})()`);
const cancel = evalIn(window, 'window.__cancel');
check(cancel.prem === 0 && !cancel.insured.includes('realestate'), 'cancelling insurance removes the premium');

/* uninsured market-down loses full value; insured keeps 60% of purchase cost */
evalIn(window, `(() => {
  const p = game.players[0];
  const q = game.players[1];
  p.bankrupt = false; q.bankrupt = false; q.assets = [];
  p.assets = [{ name: 'Ins', cat: 'stock', cost: 1000, value: 1000, monthly: 10 }];
  q.assets = [{ name: 'Unins', cat: 'stock', cost: 1000, value: 1000, monthly: 10 }];
  buyInsurance(p, 'stock');
  const crash = { title: 'Crash', cat: 'stock', mult: 0.5, desc: '', lesson: '' };
  applyEvent(crash, p);
  window.__crash = {
    ins: p.assets[0].value,
    unins: q.assets[0].value,
  };
})()`);
const crash = evalIn(window, 'window.__crash');
check(crash.ins === 600, 'insured stock stops at 60% of purchase cost on a crash');
check(crash.unins === 500, 'uninsured asset loses the full 50%');

/* selling an asset lowers the premium */
evalIn(window, `(() => {
  const p = game.players[0];
  p.assets = [{ name: 'Only', cat: 'stock', cost: 1000, value: 1000, monthly: 10 }];
  sellInsurance(p, 'stock');
  buyInsurance(p, 'stock');
  window.__pre = insurancePremium(p);
  sellAsset(p, p.assets[0]);
  window.__post = insurancePremium(p);
})()`);
check(evalIn(window, 'window.__pre') === 10 && evalIn(window, 'window.__post') === 0, 'selling an insured asset drops the premium');

/* save/resume persists insurance */
evalIn(window, `(() => {
  const p = game.players[0];
  p.bankrupt = false;
  buyInsurance(p, 'business');
  saveGame();
})()`);
const saved2 = JSON.parse(window.localStorage.getItem(key));
check(saved2.players[0].insurance.includes('business'), 'insurance persisted in save');
const b3 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved2) });
b3.document.getElementById('resume-btn').click();
check(evalIn(b3.window, 'game.players[0].insurance').includes('business'), 'resume restores insurance');

/* old saves backfill insurance to empty */
const oldSave2 = JSON.parse(JSON.stringify(saved2));
delete oldSave2.players[0].insurance;
const b4 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSave2) });
b4.document.getElementById('resume-btn').click();
check(evalIn(b4.window, 'game.players[0].insurance').length === 0, 'old saves backfill insurance to empty');

/* ================= G: end-of-game report ================= */
evalIn(window, `(() => {
  const p = game.players[0];
  p.bankrupt = false;
  p.cash = 500; p.emergencyFund = 200;
  p.assets = [{ name: 'H', cat: 'realestate', cost: 1000, value: 1500, monthly: 10 }];
  p.loans = [{ principal: 300, monthly: 20, kind: 'standard' }];
  p.baseExpenses = 400; p.expenses = 420; p.passiveIncome = 10; p.salary = 1000;
  p.totalPassiveEarned = 5000; p.totalTaxPaid = 800; p.totalCharity = 50; p.investmentsBought = 3;
  const st = incomeStatement(p);
  const bs = balanceSheet(p);
  const blk = reportBlock(p);
  window.__rep = {
    stHasRows: st.indexOf('rp-row') >= 0,
    stHasTotal: st.indexOf('rp-row total') >= 0 && st.indexOf('rp-lifetime') >= 0,
    stFlowOk: st.indexOf(fmt(590)) >= 0,
    stHasPlus: st.indexOf('+$') >= 0,
    stHasMinus: st.indexOf('-$') >= 0,
    bsHasRows: bs.indexOf('rp-row') >= 0,
    bsHasTotal: bs.indexOf('rp-row total') >= 0,
    bsNwOk: bs.indexOf(fmt(netWorth(p))) >= 0,
    blk: blk.indexOf('report-block') >= 0 && blk.indexOf('report-cols') >= 0,
  };
})()`);
const rep = evalIn(window, 'window.__rep');
check(rep.stHasRows && rep.stHasTotal, 'income statement has rows, total and lifetime lines');
check(rep.stFlowOk, 'income statement cash flow = salary + passive - expenses');
check(rep.stHasPlus && rep.stHasMinus, 'income statement shows income and expense signs');
check(rep.bsHasRows && rep.bsHasTotal, 'balance sheet has rows and a total line');
check(rep.bsNwOk, 'balance sheet net worth = cash + fund + assets - loans');
check(rep.blk, 'reportBlock renders a player block');

/* ================= D: deterministic career goals ================= */
check(evalIn(window, `careerGoal(game.players[0]).needed`) === 1, 'first promotion needs 1 asset');
evalIn(window, `(() => {
  const p = game.players[0];
  p.isHuman = false; p.careerTier = 0; p.assets = []; p.salary = p.job.salary;
  const before = p.careerTier;
  onCareer(p);
  window.__cg = { before, after: p.careerTier, goal: careerGoal(p), bonus: p.cash };
})()`);
const cg = evalIn(window, 'window.__cg');
check(cg.after === 0, 'no assets means no promotion');
check(cg.goal.met === false, 'career goal reports unmet with no assets');
evalIn(window, `(() => {
  const p = game.players[0];
  p.isHuman = false; p.careerTier = 0; p.assets = [];
  p.assets.push({ name: 'A', cat: 'stock', cost: 100, value: 100, monthly: 10 });
  p.assets.push({ name: 'B', cat: 'stock', cost: 100, value: 100, monthly: 10 });
  onCareer(p);
  window.__cg2 = { tier: p.careerTier, goal: careerGoal(p) };
})()`);
const cg2 = evalIn(window, 'window.__cg2');
check(cg2.tier === 1, 'owning assets unlocks promotion');
check(cg2.goal.needed === 2 && cg2.goal.met === true, 'next goal requires 2 assets and is met');

/* ================= E: cost-of-living drift ================= */
evalIn(window, `(() => {
  const p = game.players[0];
  p.isHuman = false; p.cash = 10000; p.salary = 0; p.passiveIncome = 0; p.downsized = 0;
  p.livingTicks = 3; p.baseExpenses = 400;
  p.expenseItems = [{ name: LIVING_EXPENSE_NAME, monthly: 400 }];
  p.job.expenses = 400;
  onPayday(p);
  window.__cl = { ticks: p.livingTicks, base: p.baseExpenses, living: p.expenseItems[0].monthly, raise: p.baseExpenses - 400 };
})()`);
const cl = evalIn(window, 'window.__cl');
check(cl.ticks === 0, 'living ticks reset after a raise');
check(cl.base === 420 && cl.living === 420, 'living expenses rise 5% on the interval');
check(cl.raise === 20, 'raise adds 5% of the old base');

/* ticks persist and resume */
evalIn(window, `(() => {
  const p = game.players[0];
  p.bankrupt = false; p.livingTicks = 2; saveGame();
})()`);
const saved3 = JSON.parse(window.localStorage.getItem(key));
check(saved3.players[0].livingTicks === 2, 'living ticks persisted in save');
const b5 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved3) });
b5.document.getElementById('resume-btn').click();
check(evalIn(b5.window, 'game.players[0].livingTicks') === 2, 'resume restores living ticks');

/* old saves backfill living ticks to 0 */
const oldSave3 = JSON.parse(JSON.stringify(saved3));
delete oldSave3.players[0].livingTicks;
const b6 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSave3) });
b6.document.getElementById('resume-btn').click();
check(evalIn(b6.window, 'game.players[0].livingTicks') === 0, 'old saves backfill living ticks to 0');

/* ================= F: player-to-player loans ================= */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  window.__peer = { lenderName: lender.name, borrowerName: borrower.name };
})()`);
const peerNames = evalIn(window, 'window.__peer');

/* a lender with liquidity accepts and the cash moves */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  lender.cash = 5000; borrower.cash = 100;
  const res = givePeerLoan(lender, borrower, 1000);
  window.__gl = { res, lenderCash: lender.cash, borrowerCash: borrower.cash,
    lRecv: lender.peerReceivables.length, bLoans: borrower.peerLoans.length,
    monthly: borrower.peerLoans[0].monthly };
})()`);
const gl = evalIn(window, 'window.__gl');
check(gl.res && gl.res.principal === 1000, 'givePeerLoan returns the principal');
check(gl.lenderCash === 4000 && gl.borrowerCash === 1100, 'cash moves from lender to borrower');
check(gl.lRecv === 1 && gl.bLoans === 1, 'records exist on both sides');
check(gl.monthly === Math.round(1000 * 0.06), 'monthly interest is 6% of the principal');

/* aiLends: rejects when the lender lacks liquidity or exposure */
evalIn(window, `(() => {
  const lender = game.players[0];
  const prev = lender.cash;
  lender.cash = 100;
  window.__al1 = aiLends(lender, 1000);
  lender.cash = prev;
  lender.peerReceivables.push({ borrower: 'x', principal: 1, monthly: 1 });
  lender.peerReceivables.push({ borrower: 'y', principal: 1, monthly: 1 });
  window.__al2 = aiLends(lender, 100);
  lender.peerReceivables = [];
})()`);
check(evalIn(window, 'window.__al1') === false, 'aiLends refuses with low liquidity');
check(evalIn(window, 'window.__al2') === false, 'aiLends refuses at max exposure');

/* expenses include peer interest */
evalIn(window, `(() => {
  const borrower = game.players[1];
  borrower.loans = []; borrower.insurance = [];
  borrower.expenseItems = [{ name: LIVING_EXPENSE_NAME, monthly: borrower.baseExpenses }];
  recalcExpenses(borrower);
  window.__pi = { total: borrower.expenses, interest: peerInterest(borrower), base: borrower.baseExpenses };
})()`);
const pi = evalIn(window, 'window.__pi');
check(pi.interest === 60 && pi.total === pi.interest + pi.base, 'recalcExpenses includes peer interest');

/* net worth counts the receivable as an asset and the peer loan as a liability */
evalIn(window, `(() => {
  const lender = game.players[0];
  const lr = lender.peerReceivables[0];
  const assets = lender.assets.reduce((s, a) => s + a.value, 0);
  const loans = lender.loans.reduce((s, l) => s + l.principal, 0);
  const expected = lender.cash + (lender.emergencyFund || 0) + assets - loans + (lr ? lr.principal : 0);
  window.__nl = netWorth(lender) === expected;

  const borrower = game.players[1];
  const bl = borrower.peerLoans[0];
  const bAssets = borrower.assets.reduce((s, a) => s + a.value, 0);
  const bLoans = borrower.loans.reduce((s, l) => s + l.principal, 0);
  const bExpected = borrower.cash + (borrower.emergencyFund || 0) + bAssets - bLoans - (bl ? bl.principal : 0);
  window.__nb = netWorth(borrower) === bExpected;
})()`);
const nl = evalIn(window, 'window.__nl');
const nb = evalIn(window, 'window.__nb');
check(nl, 'lender net worth adds the receivable');
check(nb, 'borrower net worth subtracts the peer loan');

/* repay returns the principal to the lender and clears both records */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  borrower.cash = 5000;
  const loan = borrower.peerLoans[0];
  const ok2 = repayPeerLoan(borrower, loan);
  window.__rp = { ok2, lenderCash: lender.cash, borrowerCash: borrower.cash,
    lRecv: lender.peerReceivables.length, bLoans: borrower.peerLoans.length };
})()`);
const rp = evalIn(window, 'window.__rp');
check(rp.ok2 === true, 'repayPeerLoan succeeds with sufficient cash');
check(rp.lRecv === 0 && rp.bLoans === 0, 'repayment clears records on both sides');

/* a borrower who cannot afford the principal cannot repay */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  lender.cash = 5000; borrower.cash = 50;
  givePeerLoan(lender, borrower, 1000);
  borrower.cash = 50;
  const ok3 = repayPeerLoan(borrower, borrower.peerLoans[0]);
  window.__rpf = { ok3, bLoans: borrower.peerLoans.length };
})()`);
const rpf = evalIn(window, 'window.__rpf');
check(rpf.ok3 === false && rpf.bLoans === 1, 'repayPeerLoan fails without enough cash');

/* lender collects monthly interest on their payday */
evalIn(window, `(() => {
  const lender = game.players[0];
  lender.isHuman = false; lender.salary = 0; lender.passiveIncome = 0; lender.downsized = 0;
  lender.expenseItems = []; lender.baseExpenses = 0; lender.expenses = 0;
  lender.livingTicks = 0;
  lender.cash = 1000;
  lender.peerReceivables = [{ borrower: 'z', principal: 1000, monthly: 60 }];
  window.__pcBefore = lender.cash;
  return lender.cash;
})()`);
const pcBefore = evalIn(window, 'window.__pcBefore');
evalIn(window, `(() => {
  const lender = game.players[0];
  onPayday(lender);
  window.__pcAfter = lender.cash;
})()`);
const pcAfter = evalIn(window, 'window.__pcAfter');
check(pcAfter === pcBefore + 60, 'lender collects peer interest on payday');
evalIn(window, `(() => { const lender = game.players[0]; lender.peerReceivables = []; })()`);

/* retiring a borrower drops the lender receivable and forgiving a lender's loan clears the borrower record */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  lender.cash = 5000; borrower.cash = 2000;
  lender.bankrupt = false; borrower.bankrupt = false;
  givePeerLoan(lender, borrower, 1000);
  retire(borrower);
  window.__rb = { lRecv: lender.peerReceivables.length };
  borrower.bankrupt = false;
  givePeerLoan(lender, borrower, 500);
  lender.bankrupt = false;
  retire(lender);
  window.__rl = { bLoans: borrower.peerLoans.length, lRecv2: lender.peerReceivables.length };
})()`);
const rb = evalIn(window, 'window.__rb');
const rl = evalIn(window, 'window.__rl');
check(rb.lRecv === 0, 'retiring the borrower drops the lender receivable');
check(rl.bLoans === 0 && rl.lRecv2 === 0, 'retiring the lender forgives the borrower loan');

/* requestPeerLoan creates a pending entry, not a live loan */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  lender.cash = 5000; borrower.cash = 100;
  lender.bankrupt = false; borrower.bankrupt = false;
  const res = requestPeerLoan(lender, borrower, 1000);
  window.__req = { res, pending: (game.pendingLoans || []).length,
    lenderCash: lender.cash, borrowerCash: borrower.cash,
    bLoans: borrower.peerLoans.length, state: res ? res.state : null };
})()`);
const req = evalIn(window, 'window.__req');
check(req.res && req.state === 'pending', 'requestPeerLoan returns a pending entry');
check(req.pending === 1 && req.bLoans === 0, 'no live loan yet while pending');
check(req.lenderCash === 5000 && req.borrowerCash === 100, 'no cash moves while pending');

/* duplicate requests are refused */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  const again = requestPeerLoan(lender, borrower, 1000);
  window.__dup = again === null;
})()`);
check(evalIn(window, 'window.__dup') === true, 'duplicate pending request is refused');

/* a lender who accepts schedules activation for next round */
evalIn(window, `(() => {
  const lender = game.players[0];
  game.round = 2;
  resolvePendingLoans(lender);
  const l = (game.pendingLoans || [])[0];
  window.__acc = { state: l ? l.state : null, activeRound: l ? l.activeRound : null,
    lenderCash: lender.cash, borrowerCash: game.players[1].cash };
})()`);
const acc = evalIn(window, 'window.__acc');
check(acc.state === 'accepted' && acc.activeRound === 3, 'acceptance schedules activation for the next round');
check(acc.lenderCash === 5000, 'still no cash movement before the round activates');

/* activation transfers cash and creates live records */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  game.round = 3;
  activateDuePeerLoans();
  window.__act = { pending: (game.pendingLoans || []).length,
    lenderCash: lender.cash, borrowerCash: borrower.cash,
    lRecv: lender.peerReceivables.length, bLoans: borrower.peerLoans.length,
    bMonthly: borrower.peerLoans[0] ? borrower.peerLoans[0].monthly : null };
})()`);
const act = evalIn(window, 'window.__act');
check(act.pending === 0, 'activated loan is removed from pending');
check(act.lenderCash === 4000 && act.borrowerCash === 1100, 'cash moves on activation');
check(act.lRecv === 1 && act.bLoans === 1, 'live records created on activation');
check(act.bMonthly === Math.round(1000 * 0.06), 'activated loan carries the 6% monthly interest');

/* a lender with too little cash voids the pending loan on activation */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  lender.cash = 0; borrower.cash = 500;
  lender.peerReceivables = []; borrower.peerLoans = [];
  requestPeerLoan(lender, borrower, 1000);
  game.round = 10;
  resolvePendingLoans(lender);
  activateDuePeerLoans();
  window.__void = { pending: (game.pendingLoans || []).length, bLoans: borrower.peerLoans.length, borrowerCash: borrower.cash };
})()`);
const voided = evalIn(window, 'window.__void');
check(voided.pending === 0 && voided.bLoans === 0 && voided.borrowerCash === 500, 'unfundable accepted loan is voided without transferring cash');

/* a declining lender passes and the requester gets no loan */
evalIn(window, `(() => {
  const lender = game.players[0];
  const borrower = game.players[1];
  lender.cash = 100;
  const res2 = requestPeerLoan(lender, borrower, 1000);
  window.__pre = (game.pendingLoans || []).length;
  resolvePendingLoans(lender);
  window.__dec = { pending: (game.pendingLoans || []).length, bLoans: borrower.peerLoans.length, res: !!res2 };
})()`);
const dec = evalIn(window, 'window.__dec');
check(dec.pending === 0 && dec.bLoans === 0, 'a declining lender passes and the requester gets no loan');

/* peer interest appears as a distinct income source in the portfolio */
evalIn(window, `(() => {
  const p = game.players[0];
  p.isHuman = true;
  p.peerReceivables = [{ borrower: 'x', principal: 1000, monthly: 60 }];
  openPortfolio();
  window.__port = document.getElementById('card-body').innerHTML;
  p.peerReceivables = [];
})()`);
const port = evalIn(window, 'window.__port');
const peerIncomeLabel = lang === 'fa' ? 'سود وام بین بازیکن' : 'Peer loan interest';
check(port.includes(peerIncomeLabel), 'portfolio shows peer loan interest as a distinct income source');
check(port.includes('+$60') || port.includes('+$۶۰') || port.includes('+۶۰'), 'portfolio shows the peer interest amount');

/* round wraps and pending loans persist/resume */
evalIn(window, `(() => {
  const p = game.players[0];
  p.bankrupt = false; game.round = 7;
  saveGame();
})()`);
const savedR = JSON.parse(window.localStorage.getItem(key));
check(savedR.round === 7, 'round persisted in save');
const bR = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(savedR) });
bR.document.getElementById('resume-btn').click();
check(evalIn(bR.window, 'game.round') === 7, 'resume restores round');
const oldSaveR = JSON.parse(JSON.stringify(savedR));
delete oldSaveR.round;
const bR2 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSaveR) });
bR2.document.getElementById('resume-btn').click();
check(evalIn(bR2.window, 'game.round') === 1, 'old saves backfill round to 1');

/* ================= persistence ================= */
evalIn(window, `(() => {
  const p = game.players[0];
  p.bankrupt = false;
  p.emergencyFund = 320;
  saveGame();
})()`);
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

/* peer loans persist and resume */
evalIn(window, `(() => {
  const p = game.players[0];
  p.bankrupt = false;
  p.peerLoans = [{ lender: 'x', principal: 500, monthly: 30, kind: 'peer' }];
  p.peerReceivables = [{ borrower: 'y', principal: 800, monthly: 48 }];
  saveGame();
})()`);
const savedP = JSON.parse(window.localStorage.getItem(key));
check(savedP.players[0].peerLoans.length === 1, 'peer loans persisted in save');
const bp = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(savedP) });
bp.document.getElementById('resume-btn').click();
check(evalIn(bp.window, 'game.players[0].peerLoans[0].principal') === 500, 'resume restores peer loans');
check(evalIn(bp.window, 'game.players[0].peerReceivables[0].principal') === 800, 'resume restores peer receivables');

/* old saves without the field backfill to [] */
const oldSaveP = JSON.parse(JSON.stringify(savedP));
delete oldSaveP.players[0].peerLoans;
const bp2 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSaveP) });
bp2.document.getElementById('resume-btn').click();
const backfilled = evalIn(bp2.window, 'Array.isArray(game.players[0].peerLoans) && game.players[0].peerLoans.length === 0');
check(backfilled, 'old saves backfill peer loans to []');

console.log(ok ? 'V8A EMERGENCY FUND OK' : 'V8A EMERGENCY FUND FAIL');
process.exit(ok ? 0 : 1);
