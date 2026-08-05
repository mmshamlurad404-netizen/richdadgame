const fs = require('fs');
const path = require('path');
const vm = require('vm');

let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  JSDOM = require('/tmp/opencode/node_modules/jsdom').JSDOM;
}

function loadGame(htmlDir, jsDir, seedStorage) {
  const dom = new JSDOM(fs.readFileSync(path.join(htmlDir, 'index.html'), 'utf8'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'http://localhost/',
  });
  const { window } = dom;
  if (seedStorage) {
    Object.keys(seedStorage).forEach(k => window.localStorage.setItem(k, seedStorage[k]));
  }
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  global.location = window.location;
  global.AudioContext = null;
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'data.js'), 'utf8'), window);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'game.js'), 'utf8'), window);
  window.init();
  return { window, document: window.document, dom, vm };
}

const evalIn = (window, code) => vm.runInContext(code, window);

module.exports = { loadGame, evalIn };
