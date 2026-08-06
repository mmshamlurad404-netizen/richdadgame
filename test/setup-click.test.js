const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

const playersList = document.getElementById('players-list');
const initialRows = playersList.children.length;
document.getElementById('add-player').click();
const afterAdd = playersList.children.length;
document.getElementById('remove-player').click();
const afterRemove = playersList.children.length;

document.getElementById('setup-start').click();
const game = evalIn(window, 'game');
const started = !!game && game.turn === 1 && !document.getElementById('setup-modal').classList.contains('open');

console.log('rows:', initialRows, '->', afterAdd, '->', afterRemove, '| game started:', started);
const ok = afterAdd === initialRows + 1 && afterRemove === initialRows && started;
console.log(ok ? 'SETUP-CLICK OK' : 'SETUP-CLICK FAIL');
process.exit(ok ? 0 : 1);
