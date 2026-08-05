const fs = require('fs');
const path = require('path');
const vm = require('vm');

let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  JSDOM = require('/tmp/opencode/node_modules/jsdom').JSDOM;
}

const htmlDir = process.argv[2];
const jsDir = process.argv[3] || htmlDir;
const DURATION = parseInt(process.argv[4] || '45000', 10);

const dom = new JSDOM(fs.readFileSync(path.join(htmlDir, 'index.html'), 'utf8'), {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
const { window } = dom;
const { document } = window;

global.window = window;
global.document = document;
global.navigator = window.navigator;
global.location = window.location;
global.AudioContext = null;

vm.runInContext(fs.readFileSync(path.join(jsDir, 'data.js'), 'utf8'), window);
vm.runInContext(fs.readFileSync(path.join(jsDir, 'game.js'), 'utf8'), window);

window.init();
window.startGame();

const g = () => vm.runInContext('game', window);
const busy = () => vm.runInContext('busy', window);
const modalOpen = () => document.getElementById('card-modal').classList.contains('open');
const rollBtn = () => document.getElementById('roll-btn');

let aiTurnModals = 0;
let lastAITurn = -1;
let aiTurnsSeen = 0;
let promptStartLabel = '';

setTimeout(() => {
  const p0 = g().players[0];
  console.log('players:', g().players.map(p => `${p.name}(ai=${p.ai})`).join(' | '));
  const first = document.querySelector('#card-actions button');
  promptStartLabel = first ? first.textContent : '';
  console.log('promptStart modal button:', JSON.stringify(promptStartLabel));

  const iv = setInterval(() => {
    const game = g();
    if (!game || game.winner) return;
    const cur = game.players[game.current];
    if (cur.ai && game.turn !== lastAITurn) { aiTurnsSeen++; lastAITurn = game.turn; }
    if (cur.ai && modalOpen()) aiTurnModals++;
    if (!cur.ai && modalOpen()) {
      const btn = document.querySelector('#card-actions button');
      if (btn && !btn.disabled) btn.click();
    } else if (!cur.ai && !modalOpen() && !rollBtn().disabled && !busy()) {
      rollBtn().click();
    }
  }, 50);

  setTimeout(() => {
    clearInterval(iv);
    const game = g();
    const ai = game.players.slice(1);
    console.log('turn:', game.turn, '| aiTurnsSeen:', aiTurnsSeen, '| aiTurnModals:', aiTurnModals);
    console.log('AI state:', ai.map(p => `${p.name}(pos=${p.position},assets=${p.assets.length},buys=${p.investmentsBought})`).join(' | '));
    const labelOk = promptStartLabel && promptStartLabel !== 'undefined';
    const ok = labelOk && aiTurnsSeen >= 3 && aiTurnModals === 0 && game.turn > 5;
    console.log(ok ? 'E2E STARTGAME OK' : 'E2E STARTGAME FAIL');
    process.exit(ok ? 0 : 1);
  }, DURATION);
}, 80);
