const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir] = process.argv.slice(2);
const { window } = loadGame(htmlDir, jsDir);
window.startGame();

const g = evalIn(window, 'game');
const players = g.players;
console.log('players:', players.map(p => `${p.name}(ai=${p.ai},human=${p.isHuman})`).join(' | '));

const nonZeroHumans = players.slice(1).filter(p => !p.ai || p.isHuman);
const ok = !players[0].ai && players[0].isHuman && nonZeroHumans.length === 0;
console.log(ok ? 'startgame OK' : 'startgame FAIL');
process.exit(ok ? 0 : 1);
