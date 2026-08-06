const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

/* ---- difficulty is read from the setup select ---- */
const sel = document.getElementById('ai-difficulty');
check(!!sel, 'ai-difficulty select present');
check(sel.querySelectorAll('option').length === 3, '3 difficulty options');
sel.value = 'hard';
window.startGame();
check(evalIn(window, 'game.difficulty') === 'hard', 'startGame reads difficulty = hard');

/* ---- AI behavior differs by difficulty ---- */
evalIn(window, `(() => {
  const p = game.players[0];
  const bad = { title: 'Bad Deal', cat: 'business', cost: 3000, monthly: 15, value: 3000 };
  const great = { title: 'Great Deal', cat: 'business', cost: 5500, monthly: 300, value: 5500 };
  const offers = [{ dc: { label: 'B' }, card: bad }, { dc: { label: 'B' }, card: great }];
  const reset = (cash) => { p.cash = cash; p.assets = []; p.loans = []; p.passiveIncome = 0; };

  game.difficulty = 'easy';
  reset(5000);
  const easy = aiPickDeals(p, offers);
  window.__easy = easy.length === 1 && easy[0].title === 'Bad Deal' && p.cash === 2000;

  game.difficulty = 'medium';
  reset(5000);
  window.__med = aiPickDeals(p, offers).length === 0 && p.loans.length === 0;

  game.difficulty = 'hard';
  reset(5000);
  const hard = aiPickDeals(p, offers);
  window.__hard = hard.length === 1 && hard[0].title === 'Great Deal' && p.loans.length === 1 && p.cash === 500;
})()`);
check(evalIn(window, 'window.__easy'), 'easy AI buys impulsively (bad deal, no reserve)');
check(evalIn(window, 'window.__med'), 'medium AI passes on bad payback and unaffordable deals');
check(evalIn(window, 'window.__hard'), 'hard AI uses a loan to fund a great deal');

/* ---- hard AI repays loans when it has spare cash ---- */
evalIn(window, `(() => {
  const p = game.players[0];
  p.cash = 5000; p.expenses = 1000;
  p.loans = [{ principal: 1000, monthly: 80 }];
  aiManagePortfolio(p);
  window.__repay = p.loans.length === 0 && p.cash === 4000;
})()`);
check(evalIn(window, 'window.__repay'), 'hard AI repays a loan when cash allows');

/* ---- difficulty saved and resumed ---- */
evalIn(window, 'saveGame()');
const key = 'mq_save_' + document.documentElement.lang;
const saved = JSON.parse(window.localStorage.getItem(key));
check(saved.difficulty === 'hard', 'difficulty persisted in save');

const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.difficulty') === 'hard', 'resume restores difficulty');

/* ---- select default remembered from localStorage ---- */
const c = loadGame(htmlDir, jsDir, { mq_ai_diff: 'easy' });
check(c.document.getElementById('ai-difficulty').value === 'easy', 'select persists across pages');

console.log(ok ? 'DIFFICULTY OK' : 'DIFFICULTY FAIL');
process.exit(ok ? 0 : 1);
