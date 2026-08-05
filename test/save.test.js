const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const isFa = lang === 'fa';

/* ---------------- part 1: build a game state, then save ---------------- */
const a = loadGame(htmlDir, jsDir);
const { window, document } = a;
window.startGame();

evalIn(window, `(() => {
  const p = game.players[0];
  p.salary = 3000;
  p.passiveIncome = 750;
  p.position = 14;
  p.cash = 15000;
  p.expenseItems = [{ name: '${isFa ? 'هزینه‌های زندگی' : 'Living expenses'}', monthly: 500 }];
  buyAsset(p, OPPORTUNITY_CARDS[1]);
  takeLoan(p);
  saveGame();
})()`);

const key = 'mq_save_' + document.documentElement.lang;
const savedRaw = window.localStorage.getItem(key);
if (!savedRaw) { console.log('save FAIL: no save in localStorage'); process.exit(1); }
const saved = JSON.parse(savedRaw);
const p0 = saved.players[0];
const deckOk =
  saved.decks.oppByCat.realestate.length >= 0 &&
  saved.decks.market.length === 7 &&
  saved.decks.expense.length === 8 &&
  saved.decks.bonus.length === 6 &&
  saved.decks.baby.length === 1;
const stateOk = p0.cash === 14000 && p0.salary === 3000 && p0.passiveIncome === 1000 && p0.expenses === 580 && p0.position === 14 && p0.loans.length === 1 && p0.assets.length === 1;
console.log('saved fields ok:', stateOk, '| decks ok:', deckOk);

/* ---------------- inflation bug check + tooltips ---------------- */
evalIn(window, `(() => {
  const p = game.players[0];
  p.expenseItems = [{ name: '${isFa ? 'هزینه‌های زندگی' : 'Living expenses'}', monthly: 200 }];
  p.loans = [];
  recalcExpenses(p);
  MARKET_CARDS.find(c => /inflation|تورم/i.test(c.title)).apply(p);
})()`);
window.openPortfolio();
const portfolioHtml = document.getElementById('card-body').innerHTML;
const hasUndefined = /undefined/.test(portfolioHtml);
const hasInflation = portfolioHtml.includes(isFa ? 'تورم' : 'Inflation');
console.log('portfolio after inflation: hasInflation =', hasInflation, '| hasUndefined =', hasUndefined);

const cells = document.querySelectorAll('.cell');
const allHaveTitle = Array.from(cells).every(c => c.title && c.title.length > 0);
console.log('all board cells have tooltip:', allHaveTitle);

/* ---------------- sound persistence ---------------- */
const soundBtn = document.getElementById('sound-btn');
const before = window.localStorage.getItem('mq_sound');
soundBtn.click();
const after = window.localStorage.getItem('mq_sound');
console.log('sound toggle: before =', before, '-> after =', after);

/* ---------------- part 2: resume from a fresh page ---------------- */
const b = loadGame(htmlDir, jsDir, { [key]: savedRaw });
const { document: doc2 } = b;
const resumeBtn = doc2.getElementById('resume-btn');
console.log('resume button present on fresh page:', !!resumeBtn);
if (!resumeBtn) { console.log('resume FAIL: button missing'); process.exit(1); }

resumeBtn.click();
const game2 = evalIn(b.window, 'game');
const r0 = game2.players[0];
const resumeOk =
  !doc2.getElementById('setup-modal').classList.contains('open') &&
  r0.cash === 14000 && r0.salary === 3000 && r0.passiveIncome === 1000 &&
  r0.expenses === 580 && r0.position === 14 && r0.loans.length === 1 && r0.assets.length === 1 &&
  game2.turn === 1 && game2.current === 0;
console.log('resumed state ok:', resumeOk);

const allOk = stateOk && deckOk && !hasUndefined && hasInflation && allHaveTitle && after !== before && resumeOk;
console.log(allOk ? 'SAVE/RESUME OK' : 'SAVE/RESUME FAIL');
process.exit(allOk ? 0 : 1);
