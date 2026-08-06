const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EN = { html: ROOT, js: path.join(ROOT, 'js'), lang: 'en' };
const FA = { html: path.join(ROOT, 'fa'), js: path.join(ROOT, 'fa', 'js'), lang: 'fa' };

const TESTS = [
  { file: 'startgame.test.js' },
  { file: 'setup-click.test.js' },
  { file: 'toggle.test.js' },
  { file: 'lessons.test.js' },
  { file: 'save.test.js' },
  { file: 'v2.test.js' },
  { file: 'difficulty.test.js' },
];

let failed = 0;
let passed = 0;

TESTS.forEach(({ file }) => {
  [EN, FA].forEach(({ html, js, lang }) => {
    const res = spawnSync(process.execPath, [path.join(__dirname, file), html, js, lang], { encoding: 'utf8' });
    const status = res.status === 0 ? 'PASS' : 'FAIL';
    if (res.status === 0) passed++; else failed++;
    console.log(`[${status}] ${file} (${lang})`);
    console.log((res.stdout || '').trim().split('\n').map(l => '    ' + l).join('\n'));
    if (res.stderr && res.stderr.trim()) console.log('    stderr:', res.stderr.trim().split('\n').join(' '));
  });
});

console.log(`\n== e2e (EN, ~45s) ==`);
const e2e = spawnSync(process.execPath, [path.join(__dirname, 'e2e.test.js'), EN.html, EN.js, '45000'], { encoding: 'utf8' });
if (e2e.status === 0) passed++; else failed++;
console.log(`[${e2e.status === 0 ? 'PASS' : 'FAIL'}] e2e.test.js (en)`);
console.log((e2e.stdout || '').trim().split('\n').map(l => '    ' + l).join('\n'));

console.log(`\n== summary: ${passed} passed, ${failed} failed ==`);
process.exit(failed > 0 ? 1 : 0);
