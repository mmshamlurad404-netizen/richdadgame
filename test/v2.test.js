const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

/* ---- feature 1: 60-cell board ---- */
check(evalIn(window, 'BOARD_SIZE') === 60, 'BOARD_SIZE = 60');
check(evalIn(window, 'BOARD_GRID') === 16, 'BOARD_GRID = 16');
check(evalIn(window, 'BOARD_POS.length') === 60, 'BOARD_POS has 60 cells');
check(evalIn(window, 'BOARD_TYPES.length') === 60, 'BOARD_TYPES has 60 cells');
check(evalIn(window, 'BOARD_TYPES.filter(t => t === "payday").length') === 8, '8 payday spaces');

const cells = document.querySelectorAll('.cell');
check(cells.length === 60, '60 cells rendered');
check(Array.from(cells).every(c => c.title.length > 0), 'all cells have tooltips');
const center = document.getElementById('center');
check(center.style.width === '87.5%' && center.style.left === '6.25%', 'center sits inside the ring');
check(center.style.height === '87.5%' && center.style.top === '6.25%', 'center top/height correct');

/* ---- feature 2: monthly-changing deals & expenses ---- */
window.startGame();
check(evalIn(window, 'game.month') === 1, 'new game starts at month 1');
const deckBefore = evalIn(window, 'game.decks.expense.map(c => c.title).join("|")');
evalIn(window, 'advanceMonth()');
check(evalIn(window, 'game.month') === 2, 'advanceMonth increments month');
const deckAfter = evalIn(window, 'game.decks.expense.map(c => c.title).join("|")');
check(deckBefore !== deckAfter, 'expense deck reshuffled on new month');
check(evalIn(window, 'game.decks.oppByCat.realestate.length') === 6, 'opp realestate deck refreshed to 6 cards');
const monthShown = document.getElementById('center').textContent;
check(/month|ماه/i.test(monthShown), 'month shown in center dashboard');

evalIn(window, 'saveGame()');
const saved = JSON.parse(window.localStorage.getItem('mq_save_' + document.documentElement.lang));
check(saved.month === 2, 'month persisted in save');

/* ---- feature 3: settings ---- */
document.getElementById('settings-btn').click();
const body = document.getElementById('card-body');
check(!!document.getElementById('set-font'), 'font select present');
check(!!document.getElementById('set-size'), 'font size slider present');
check(body.querySelectorAll('[data-theme]').length === 3, '3 theme buttons');

const fontSel = document.getElementById('set-font');
fontSel.value = 'verdana';
fontSel.dispatchEvent(new window.Event('change'));
check(window.localStorage.getItem('mq_font') === 'verdana', 'font persisted');
check(/Verdana/.test(document.body.style.fontFamily), 'font applied to body');

const sizeRange = document.getElementById('set-size');
sizeRange.value = '20';
sizeRange.dispatchEvent(new window.Event('input'));
check(window.localStorage.getItem('mq_size') === '20', 'font size persisted');
check(document.documentElement.style.fontSize === '20px', 'root font-size applied');

const lightBtn = Array.from(body.querySelectorAll('[data-theme]')).find(b => b.dataset.theme === 'light');
lightBtn.click();
check(window.localStorage.getItem('mq_theme') === 'light', 'theme persisted');
check(document.documentElement.getAttribute('data-theme') === 'light', 'data-theme attribute applied');

/* ---- resume keeps month ---- */
const key = 'mq_save_' + document.documentElement.lang;
const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.month') === 2, 'resume restores month');

console.log(ok ? 'V2 OK' : 'V2 FAIL');
process.exit(ok ? 0 : 1);
