const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

const rows = document.querySelectorAll('.prow');
rows[1].querySelector('.prow-ai input').checked = false;
rows[2].querySelector('.prow-ai input').checked = true;
window.startGame();

const players = evalIn(window, 'game.players');
console.log(players.map(p => `${p.name}(ai=${p.ai},human=${p.isHuman})`).join(' | '));
const ok = !players[0].ai && players[0].isHuman && !players[1].ai && players[1].isHuman && players[2].ai && !players[2].isHuman;
console.log(ok ? 'toggle OK' : 'toggle FAIL');
process.exit(ok ? 0 : 1);
