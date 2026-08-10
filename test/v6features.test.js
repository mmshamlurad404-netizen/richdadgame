const { loadGame, evalIn } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const { window, document } = loadGame(htmlDir, jsDir);

let ok = true;
const check = (cond, msg) => { console.log('  ' + (cond ? 'ok' : 'FAIL') + ' ' + msg); if (!cond) ok = false; };

window.startGame();

/* ================= global market events ================= */
check(evalIn(window, `game.decks.event.length === EVENT_CARDS.length`), 'event deck is seeded at game start');
check(evalIn(window, `game.event === null`), 'no active event at start');
check(evalIn(window, `EVENT_CARDS.filter(c => c.ongoing).length === 1 && EVENT_CARDS.find(c => c.ongoing).passiveMult === 0.7`), 'recession ongoing card defined with 70% passive mult');

/* force all players non-human + solvent so applyEvent/onPayday run synchronously */
evalIn(window, `game.players.forEach(x => { x.isHuman = false; x.ai = true; x.bankrupt = false; x.cash = 5000; });`);

/* cost events hit every active player */
evalIn(window, `(() => {
  const p = game.players[0];
  const before = p.cash;
  const med = EVENT_CARDS.find(c => c.cost);
  const expected = scaleIncome(p, med.cost);
  applyEvent(med, p);
  window.__med = { delta: before - p.cash, expected, allHit: game.players.every(x => x.cash === 5000 - expected) };
})()`);
const med = evalIn(window, 'window.__med');
check(med.delta === med.expected && med.allHit, 'cost event charges every active player (medical bills)');

/* market rally raises stock values for everyone */
evalIn(window, `(() => {
  game.players.forEach(x => x.assets.push({ name: 'Stock', cat: 'stock', value: 400, monthly: 0 }));
  const rally = EVENT_CARDS.find(c => c.cat === 'stock');
  applyEvent(rally, game.players[0]);
  window.__rally = { val: game.players[0].assets[0].value, allRaised: game.players.every(x => x.assets[0].value === 500) };
})()`);
const rally = evalIn(window, 'window.__rally');
check(rally.val === 500 && rally.allRaised, 'market rally multiplies stock value for everyone');

/* ongoing recession sets game.event, cuts passive income, and decays on payday */
evalIn(window, `(() => {
  const p = game.players[0];
  p.cash = 5000; p.salary = 0; p.expenses = 0; p.passiveIncome = 100; p.downsized = 0;
  const rec = EVENT_CARDS.find(c => c.ongoing);
  applyEvent(rec, p);
  const evSet = game.event && game.event.turnsLeft === 2 && game.event.passiveMult === 0.7;
  const cashBefore = p.cash;
  onPayday(p);
  const passiveCollected = p.cash - cashBefore; // salary 0, expenses 0 -> net = passive
  const turnsAfter = game.event ? game.event.turnsLeft : null;
  p.passiveIncome = 100;
  onPayday(p);
  const turnsAfter2 = game.event ? game.event.turnsLeft : null;
  window.__rec = { evSet, passiveCollected, turnsAfter, turnsAfter2 };
})()`);
const rec = evalIn(window, 'window.__rec');
check(rec.evSet, 'recession sets game.event with 2 paydays left');
check(rec.passiveCollected === 70, 'recession collects passive income at 70%');
check(rec.turnsAfter === 1, 'recession decays one payday after the first');
check(rec.turnsAfter2 === null, 'recession ends after its two paydays');

/* onMarket has a 1-in-3 chance to draw an event instead of a market card */
evalIn(window, `(() => {
  // stub the rng so rand(3) === 0 forces an event draw
  const realRng = _rng;
  _rng = () => 0;
  const marketLenBefore = game.decks.market.length;
  const eventLenBefore = game.decks.event.length;
  const p = game.players[0];
  p.isHuman = false;
  onMarket(p);
  _rng = realRng;
  window.__market = { eventDrawn: game.decks.event.length === eventLenBefore - 1, marketUntouched: game.decks.market.length === marketLenBefore };
})()`);
const market = evalIn(window, 'window.__market');
check(market.eventDrawn && market.marketUntouched, 'onMarket draws an event (not a market card) when rng forces it');

/* persistence: deck stored by index, event saved, backfilled on old saves */
evalIn(window, `(() => {
  game.decks.event = shuffle(EVENT_CARDS).slice(0, 3);
  game.event = { title: 'Test', turnsLeft: 1, passiveMult: 0.7 };
  saveGame();
})()`);
const key = 'mq_save_' + document.documentElement.lang;
const saved = JSON.parse(window.localStorage.getItem(key));
check(saved.decks && Array.isArray(saved.decks.event) && saved.decks.event.length === 3, 'event deck saved as card indices');
check(saved.event && saved.event.title === 'Test', 'active event saved');

const b = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(saved) });
b.document.getElementById('resume-btn').click();
check(evalIn(b.window, 'game.decks.event.length') === 3, 'resume restores event deck');
check(evalIn(b.window, 'game.event && game.event.title') === 'Test', 'resume restores active event');

/* old saves without event deck get a fresh shuffled deck */
const oldSave = JSON.parse(JSON.stringify(saved));
delete oldSave.decks.event;
const b2 = loadGame(htmlDir, jsDir, { [key]: JSON.stringify(oldSave) });
b2.document.getElementById('resume-btn').click();
check(evalIn(b2.window, 'game.decks.event.length') === evalIn(window, 'EVENT_CARDS.length'), 'old saves backfill a fresh event deck');

console.log(ok ? 'V6 GLOBAL EVENTS OK' : 'V6 GLOBAL EVENTS FAIL');
process.exit(ok ? 0 : 1);
