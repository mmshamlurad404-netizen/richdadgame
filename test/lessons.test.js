const { loadGame } = require('./lib');

const [htmlDir, jsDir, lang] = process.argv.slice(2);
const isFa = lang === 'fa';
const { window, document } = loadGame(htmlDir, jsDir);

const lessonsBtn = document.getElementById('lessons-btn');
if (!lessonsBtn) { console.log('FAIL: lessons button missing'); process.exit(1); }
console.log('lessons button label:', lessonsBtn.textContent.trim());

lessonsBtn.click();
const modal = document.getElementById('card-modal');
const body = document.getElementById('card-body');
const open = modal.classList.contains('open');
const cards = body.querySelectorAll('.lesson-card').length;
const hasQuote = !!body.querySelector('.lesson-quote');
const labels = Array.from(body.querySelectorAll('.lesson-label')).map(e => e.textContent.trim());
const gameLabel = isFa ? 'در بازی' : 'In Money Quest';
const hasGame = labels.includes(gameLabel);
const hasWhat = isFa ? labels.includes('یعنی چه') : labels.includes('What it means');
const hasExample = isFa ? labels.includes('مثال واقعی') : labels.includes('Real-world example');
const closeBtn = body.querySelector('[data-hclose]');

console.log('modal open:', open, '| lesson cards:', cards, '| has quote:', hasQuote);
const ok = open && cards === 22 && hasQuote && hasWhat && hasExample && hasGame && !!closeBtn;
if (!ok) { console.log('LESSONS RENDER FAIL'); process.exit(1); }

closeBtn.click();
console.log('after close -> modal open:', modal.classList.contains('open'));
console.log('LESSONS RENDER OK');
process.exit(0);
