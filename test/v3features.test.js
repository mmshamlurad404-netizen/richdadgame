const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

/* ================= feature 1: career / promotion ================= */
check(evalIn(window, 'CAREER_TIERS.length') >= 4, 'career ladder defined');
check(evalIn(window, 'BOARD_TYPES.filter(t => t === "career").length') === 2, '2 PROMOTION spaces on the board');
check(document.querySelectorAll('.cell.type-career').length === 2, '2 career cells rendered');
check(evalIn(window, '!!SPACE_INFO.career && SPACE_INFO.career.tip.length > 0'), 'career space has a tooltip');

window.startGame();
check(evalIn(window, 'game.players[0].careerTier') === 0, 'new game starts at career tier 0');
check(evalIn(window, 'game.players[0].baseSalary') === evalIn(window, 'game.players[0].job.salary'), 'baseSalary = job salary at start');

evalIn(window, `(() => {
  const p = game.players[0];
  const before = p.cash;
  const r = promotePlayer(p);
  window.__pr = {
    tier: r.tier.name, cash: before, tier1: p.careerTier,
    base: p.baseSalary, sal: p.salary, exp: p.expenses > p.job.expenses,
    bonus: r.bonus > 0,
  };
})()`);
const pr = evalIn(window, 'window.__pr');
check(pr.tier === evalIn(window, 'CAREER_TIERS[1].name'), 'promotion advances to Skilled tier');
check(pr.tier1 === 1 && pr.base === evalIn(window, `Math.round(game.players[0].job.salary * CAREER_TIERS[1].salaryMult)`), 'baseSalary rises with the tier');
check(pr.sal === pr.base && pr.exp && pr.bonus, 'salary up, expenses up, bonus granted');

evalIn(window, `(() => {
  const p = game.players[1];
  while (promotePlayer(p)) {}
  const last = promotePlayer(p);
  window.__top = last === null && p.careerTier === CAREER_TIERS.length - 1;
})()`);
check(evalIn(window, 'window.__top'), 'no promotion beyond the top of the ladder');

/* downsized uses the promoted baseSalary, not the job salary */
evalIn(window, `(() => {
  const p = game.players[1];
  p.isHuman = false;
  promotePlayer(p);
  onDownsized(p);
  window.__down = p.downsized === 2 && p.salary === Math.round(p.baseSalary * 0.5);
})()`);
check(evalIn(window, 'window.__down'), 'job loss halves the promoted baseSalary');

/* ================= feature 2: bankruptcy ================= */
/* AI with assets sells them at full value to cover */
evalIn(window, `(() => {
  const p = game.players[1];
  p.isHuman = false;
  p.cash = -400; p.assets = [{ name: 'X', cat: 'business', value: 1000, monthly: 100 }];
  p.passiveIncome = 100; p.bankruptcies = 0; p.loans = [];
  handleDebt(p);
  window.__sell = p.cash === 600 && p.assets.length === 0 && p.bankruptcies === 1 && !p.bankrupt;
})()`);
check(evalIn(window, 'window.__sell'), 'AI sells an asset at full value to cover bills');

/* AI with no way to pay restructures instead of dying */
evalIn(window, `(() => {
  const p = game.players[1];
  p.isHuman = false;
  p.cash = -500; p.assets = []; p.loans = [{ principal: 1000, monthly: 80 }];
  p.expenseItems = [{ name: LIVING_EXPENSE_NAME, monthly: p.baseExpenses }];
  p.expenses = p.baseExpenses; p.bankruptcies = 0; p.salary = p.baseSalary;
  handleDebt(p);
  window.__re = p.cash === 200 && p.bankruptcies === 1 && !p.bankrupt && p.loans.length === 0 && p.expenses === p.baseExpenses;
})()`);
check(evalIn(window, 'window.__re'), 'AI restructures: cash reset, loans cleared, expenses reset');

/* a player can retire and become a spectator */
evalIn(window, `(() => {
  const p = game.players[0];
  retire(p);
  checkElimination();
  window.__rt = p.bankrupt === true && p.cash === 0 && p.assets.length === 0 && p.loans.length === 0 && p.passiveIncome === 0;
})()`);
check(evalIn(window, 'window.__rt'), 'retire removes a player from the game');
check(evalIn(window, 'game.players.filter(x => !x.bankrupt).length') === 2, 'eliminated player is skipped by active count');

/* ================= feature 3: player-to-player trading ================= */
evalIn(window, `(() => {
  const buyer = game.players[0];
  const a = { name: 'G', cat: 'business', value: 1000, monthly: 100 };
  buyer.cash = 5000; buyer.expenses = 1000;
  window.__ab1 = aiBuysAt(buyer, a, 1000) === true;
  window.__ab2 = aiBuysAt(buyer, a, 3000) === false;
  buyer.cash = 0;
  window.__ab3 = aiBuysAt(buyer, a, 1000) === false;
})()`);
check(evalIn(window, 'window.__ab1'), 'AI buyer accepts a good deal it can afford');
check(evalIn(window, 'window.__ab2'), 'AI buyer refuses a grossly overpriced deal');
check(evalIn(window, 'window.__ab3'), 'AI buyer refuses when it has no reserve');

evalIn(window, `(() => {
  const seller = game.players[1];
  const a = { name: 'S', cat: 'business', value: 2000, monthly: 200 };
  game.difficulty = 'medium';
  window.__as1 = aiSellsAt(seller, a, 2000) === false;
  window.__as2 = aiSellsAt(seller, a, 3000) === true;
})()`);
check(evalIn(window, 'window.__as1'), 'AI seller keeps at market value (medium)');
check(evalIn(window, 'window.__as2'), 'AI seller accepts a 1.5x premium (medium)');

evalIn(window, `(() => {
  const seller = game.players[1];
  const buyer = game.players[0];
  const a = { name: 'Shop', cat: 'business', value: 2000, monthly: 200 };
  seller.ai = true; buyer.ai = false;
  seller.cash = 0; seller.assets = [a]; seller.passiveIncome = 200;
  buyer.cash = 10000; buyer.expenses = 1000; buyer.passiveIncome = 0; buyer.assets = [];
  offerBuy(buyer, a, seller, 3000);
  window.__tb = buyer.assets.length === 1 && buyer.passiveIncome === 200 && buyer.cash === 7000 &&
               seller.assets.length === 0 && seller.passiveIncome === 0 && seller.cash === 3000;
})()`);
check(evalIn(window, 'window.__tb'), 'transfer moves asset, cash and income between players');

evalIn(window, `(() => {
  const seller = game.players[0];
  const buyer = game.players[1];
  const a = { name: 'Cart', cat: 'business', value: 1000, monthly: 120 };
  seller.ai = false; buyer.ai = true;
  seller.cash = 0; seller.assets = [a]; seller.passiveIncome = 120;
  buyer.cash = 5000; buyer.expenses = 1000; buyer.passiveIncome = 0; buyer.assets = [];
  offerSell(seller, a, buyer, 1000);
  window.__ts = buyer.assets.length === 1 && buyer.cash === 4000 && buyer.passiveIncome === 120 &&
               seller.assets.length === 0 && seller.cash === 1000 && seller.passiveIncome === 0;
})()`);
check(evalIn(window, 'window.__ts'), 'AI buyer accepts a reasonable sell offer');

/* trade UI opens from the portfolio */
evalIn(window, `(() => {
  game.players[0].assets.push({ name: 'Own Shop', cat: 'business', value: 1500, monthly: 150 });
  game.players[0].passiveIncome += 150;
})()`);
window.openPortfolio();
check(!!document.querySelector('[data-act="trade"]'), 'portfolio has a Trade button');
document.querySelector('[data-act="trade"]').click();
const tradeHtml = document.getElementById('card-body').innerHTML;
check(/data-buy/.test(tradeHtml) && /data-offer/.test(tradeHtml), 'trade view opens');

/* ================= persistence ================= */
evalIn(window, `(() => {
  const p = game.players[0];
  while (promotePlayer(p)) {}
  saveGame();
})()`);
const key = 'mq_save_' + document.documentElement.lang;
const saved = JSON.parse(window.localStorage.getItem(key));
check(saved.players[0].careerTier === evalIn(window, 'game.players[0].careerTier'), 'career tier persisted in save');
check(saved.players[0].baseSalary === evalIn(window, 'game.players[0].baseSalary'), 'baseSalary persisted in save');
check(saved.players[2] && saved.players[2].bankrupt === false, 'bankrupt flag persisted in save');

const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.players[0].careerTier') === evalIn(window, 'game.players[0].careerTier'), 'resume restores career tier');
check(evalIn(b.window, 'game.players[0].baseSalary') === evalIn(window, 'game.players[0].baseSalary'), 'resume restores baseSalary');
check(evalIn(b.window, 'game.players[2].bankrupt') === false, 'resume restores bankrupt flag');

console.log(ok ? 'V3 FEATURES OK' : 'V3 FEATURES FAIL');
process.exit(ok ? 0 : 1);
