const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

/* ================= extra win modes ================= */
check(evalIn(window, `NET_WORTH_GOAL === 100000`), 'net-worth goal constant defined at $100,000');

/* default mode is the classic race */
window.startGame();
check(evalIn(window, `game.mode === 'race' && game.maxTurns === 40`), 'default mode is race with 40-turn cap');

/* startGame reads the #game-mode select */
const modeSel = document.getElementById('game-mode');
if (modeSel) {
  modeSel.value = 'turns';
  window.startGame();
  check(evalIn(window, `game.mode === 'turns'`), 'game-mode select drives game.mode (turns)');
}

/* turns mode: after maxTurns the net-worth leader wins */
evalIn(window, `(() => {
  game.mode = 'turns'; game.maxTurns = 40; game.turn = 41; game.winner = null;
  const p0 = game.players[0], p1 = game.players[1];
  p0.bankrupt = false; p1.bankrupt = false;
  p0.cash = 1000; p0.assets = []; p0.loans = [];
  p1.cash = 99999; p1.assets = []; p1.loans = [];
  window.__turnWin = checkModeWin();
  window.__tReason = game.winnerReason;
})()`);
check(evalIn(window, 'window.__turnWin === game.players[1]') === true, 'turns mode crowns the highest net worth at turn 40');
check(evalIn(window, 'window.__tReason') === 'turns', 'turns-mode winner reason recorded');

/* networth mode: first player past the goal wins */
evalIn(window, `(() => {
  game.mode = 'networth'; game.winner = null;
  game.players.forEach(p => { p.bankrupt = false; p.cash = 5000; p.assets = []; p.loans = []; });
  const p0 = game.players[0];
  p0.cash = NET_WORTH_GOAL + 1;
  window.__nwWin = checkModeWin();
  window.__nwReason = game.winnerReason;
})()`);
check(evalIn(window, 'window.__nwWin === game.players[0]') === true, 'networth mode crowns the first player past the goal');
check(evalIn(window, 'window.__nwReason') === 'networth', 'networth-mode winner reason recorded');

/* below the goal, no winner yet */
evalIn(window, `(() => {
  game.mode = 'networth'; game.winner = null;
  game.players.forEach(p => { p.bankrupt = false; p.cash = 100; p.assets = []; p.loans = []; });
  window.__below = checkModeWin();
})()`);
check(evalIn(window, 'window.__below') === null, 'networth mode: no winner below the goal');

/* escaping in non-race modes does not end the game */
evalIn(window, `(() => {
  game.mode = 'turns'; game.winner = null;
  const p = game.players[0];
  p.passiveIncome = 1000; p.expenses = 100;
  window.__esc = checkEscape(p);
  window.__winnerAfterEscape = game.winner;
})()`);
check(evalIn(window, 'window.__esc') === true && evalIn(window, 'window.__winnerAfterEscape') === null, 'escaping in turns mode marks escaped but does not crown a winner');

/* race mode still crowns on escape */
evalIn(window, `(() => {
  game.mode = 'race'; game.winner = null;
  const p = game.players[0];
  p.passiveIncome = 1000; p.expenses = 100;
  window.__escRace = checkEscape(p);
  window.__raceWinner = game.winner;
})()`);
check(evalIn(window, 'window.__escRace') === true && evalIn(window, 'window.__raceWinner') !== null, 'escaping in race mode crowns the winner');

/* ================= persistence ================= */
evalIn(window, `(() => {
  game.mode = 'networth';
  saveGame();
})()`);
const key = 'mq_save_' + document.documentElement.lang;
const saved = JSON.parse(window.localStorage.getItem(key));
check(saved.mode === 'networth' && saved.maxTurns === 40, 'mode persisted in save');

const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.mode') === 'networth' && evalIn(b.window, 'game.maxTurns') === 40, 'resume restores mode and maxTurns');

/* old saves without mode backfill to race */
const oldSave = JSON.parse(JSON.stringify(saved));
delete oldSave.mode;
delete oldSave.maxTurns;
const b2 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSave) });
b2.document.getElementById('resume-btn').click();
check(evalIn(b2.window, 'game.mode') === 'race' && evalIn(b2.window, 'game.maxTurns') === 40, 'old saves backfill mode to race and maxTurns to 40');

console.log(ok ? 'V7 WIN MODES OK' : 'V7 WIN MODES FAIL');
process.exit(ok ? 0 : 1);
