/* ============================================================
   Money Quest — game data (jobs, board, cards, lessons)
   ============================================================ */

const BOARD_SIZE = 32;

// board cell positions around a 9x9 ring
const BOARD_POS = (function () {
  const pos = [];
  for (let c = 0; c < 9; c++) pos.push({ r: 0, c });
  for (let r = 1; r < 9; r++) pos.push({ r, c: 8 });
  for (let c = 7; c >= 0; c--) pos.push({ r: 8, c });
  for (let r = 7; r >= 1; r--) pos.push({ r, c: 0 });
  return pos;
})();

// space type per board index
const BOARD_TYPES = [
  'payday',       // 0  start
  'opportunity',  // 1
  'expense',      // 2
  'tax',          // 3
  'opportunity',  // 4
  'market',       // 5
  'opportunity',  // 6
  'opportunity',  // 7
  'payday',       // 8
  'expense',      // 9
  'opportunity',  // 10
  'baby',         // 11
  'market',       // 12
  'opportunity',  // 13
  'payday',       // 14
  'bonus',        // 15
  'payday',       // 16
  'opportunity',  // 17
  'market',       // 18
  'expense',      // 19
  'opportunity',  // 20
  'downsized',    // 21
  'opportunity',  // 22
  'opportunity',  // 23
  'payday',       // 24
  'tax',          // 25
  'opportunity',  // 26
  'charity',      // 27
  'opportunity',  // 28
  'opportunity',  // 29
  'market',       // 30
  'expense',      // 31
];

const SPACE_INFO = {
  payday:     { label: 'PAYDAY',     color: '#2ecc71', icon: 'payday',  tip: 'Collect your salary, pay bills and pocket your passive income.' },
  opportunity: { label: 'DEAL',      color: '#9b59b6', icon: 'deal',     tip: 'Today\'s market is open! Buy or sell a home, factory, shares or savings — pick your best deal.' },
  market:     { label: 'MARKET',     color: '#f39c12', icon: 'market',  tip: 'Markets move up and down. How does this affect what you own?' },
  expense:    { label: 'SPEND',      color: '#e74c3c', icon: 'spend',   tip: 'A surprise cost. Needs vs wants — think before you spend.' },
  tax:        { label: 'TAX',        color: '#f1c40f', icon: 'tax',     tip: 'Governments take a share of what you earn. Plan for taxes.' },
  bonus:      { label: 'WINDFALL',   color: '#3498db', icon: 'bonus',   tip: 'A lucky surprise! Windfalls are rare — do not count on luck.' },
  baby:       { label: 'BABY',       color: '#e84393', icon: 'baby',    tip: 'New family members are a joy — and a budget line item.' },
  downsized:  { label: 'JOB LOSS',   color: '#6c7a89', icon: 'job',     tip: 'Anyone can lose a job. This is why your emergency fund matters.' },
  charity:    { label: 'GIVING',     color: '#1abc9c', icon: 'give',    tip: 'Giving 10% trains generosity. You earn a bonus roll next turn.' },
};

const TYPE_COLORS = {
  payday: '#2ecc71',
  opportunity: '#9b59b6',
  market: '#f39c12',
  expense: '#e74c3c',
  tax: '#f1c40f',
  bonus: '#3498db',
  baby: '#e84393',
  downsized: '#6c7a89',
  charity: '#1abc9c',
};

const JOBS = [
  { id: 'lemon',  name: 'Lemonade Kid',  salary: 500,  expenses: 200,  cash: 1000, difficulty: 'easy',   desc: 'Run a lemonade stand. Save 30% of everything you earn.' },
  { id: 'paper',  name: 'Paper Courier', salary: 800,  expenses: 380,  cash: 1000, difficulty: 'easy',   desc: 'Deliver papers before school each morning.' },
  { id: 'dog',    name: 'Dog Walker',    salary: 1100, expenses: 540,  cash: 1400, difficulty: 'medium', desc: 'Walk dogs after school for neighbours.' },
  { id: 'bakery', name: 'Bakery Helper', salary: 1500, expenses: 780,  cash: 1800, difficulty: 'medium', desc: 'Bake treats and sell them at the market.' },
  { id: 'coder',  name: 'Game Coder',    salary: 2200, expenses: 1250, cash: 2800, difficulty: 'medium', desc: 'Build video games from home.' },
  { id: 'nurse',  name: 'Nurse',         salary: 3200, expenses: 1900, cash: 4500, difficulty: 'hard',   desc: 'Busy but steady. Every hour counts.' },
  { id: 'eng',    name: 'Engineer',      salary: 4500, expenses: 2800, cash: 6500, difficulty: 'hard',   desc: 'Solve problems and earn well for it.' },
  { id: 'doc',    name: 'Doctor',        salary: 7000, expenses: 4600, cash: 11000, difficulty: 'hard',  desc: 'High pay, high expenses. Watch your spending!' },
];

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#e84393'];

// deal categories offered on DEAL spaces
const DEAL_CATS = [
  { cat: 'realestate', label: 'Home / Real Estate' },
  { cat: 'business',   label: 'Business / Factory' },
  { cat: 'stock',      label: 'Company Shares' },
  { cat: 'savings',    label: 'Savings / Bonds' },
];

const OPPORTUNITY_CARDS = [
  { title: 'Lemonade Stand Upgrade', cat: 'business', cost: 300,   monthly: 45,   value: 300,   desc: 'Buy a bigger jug, better syrup and a prime corner.', lesson: 'Small assets pay you every month. Start small!' },
  { title: 'Garage for Rent',        cat: 'realestate', cost: 2000,   monthly: 250,  value: 2000,  desc: 'Rent out your family garage as storage space.', lesson: 'Real estate pays rent — even a garage counts.' },
  { title: 'Pixel Games Stock',      cat: 'stock',    cost: 1800,  monthly: 60,   value: 1800,  desc: 'Buy 120 shares of a game company at $15 each.', lesson: 'Stocks pay dividends and grow — or shrink.' },
  { title: 'Vending Machine',        cat: 'business', cost: 1200,  monthly: 170,  value: 1200,  desc: 'Place a snack machine at a busy shop.', lesson: 'A vending machine works while you sleep.' },
  { title: 'MoneyCo Stock',          cat: 'stock',    cost: 2400,  monthly: 80,   value: 2400,  desc: 'Buy 80 shares of a bank at $30 each.', lesson: 'Dividend stocks pay you for owning them.' },
  { title: 'Room for Rent',          cat: 'realestate', cost: 6000,   monthly: 750,  value: 6000,  desc: 'Rent out a spare room in your house.', lesson: 'Assets put money in your pocket each month.' },
  { title: 'Online Book Store',      cat: 'business', cost: 2500,  monthly: 350,  value: 2500,  desc: 'Sell second-hand books online.', lesson: 'A business is an asset that earns for you.' },
  { title: 'High-Interest CD',       cat: 'savings',  cost: 3000,  monthly: 200,  value: 3000,  desc: 'Lock money in a certificate of deposit.', lesson: 'Savings can earn interest — your money grows.' },
  { title: 'HealthPlus Stock',       cat: 'stock',    cost: 2500,  monthly: 90,   value: 2500,  desc: 'Buy 50 shares of a healthcare firm at $50 each.', lesson: 'Some assets are safer, some riskier. Diversify!' },
  { title: 'Sunny Solar Stock',      cat: 'stock',    cost: 2000,  monthly: 65,   value: 2000,  desc: 'Buy 100 shares of a solar company at $20 each.', lesson: 'Green energy stocks can boom — or crash.' },
  { title: 'Pet Grooming Kits',      cat: 'business', cost: 4000,  monthly: 650,  value: 4000,  desc: 'Start a mobile pet-grooming service.', lesson: 'Find a need, fill it, get paid monthly.' },
  { title: 'Treasury Bond',          cat: 'savings',  cost: 5000,  monthly: 350,  value: 5000,  desc: 'Lend money to the government, earn interest.', lesson: 'Bonds are a safe, steady way to earn.' },
  { title: 'Mobile App (Ads)',       cat: 'business', cost: 5000,  monthly: 800,  value: 5000,  desc: 'Build a small app that earns ad money.', lesson: 'Make once, earn forever — the digital dream.' },
  { title: 'Laundromat',             cat: 'business', cost: 8000,  monthly: 1100, value: 8000,  desc: 'Buy a small self-service laundry.', lesson: 'A big asset means big passive income.' },
  { title: 'Small Rental House',     cat: 'realestate', cost: 18000,  monthly: 1900, value: 18000, desc: 'Buy a small house and rent it out.', lesson: 'Your tenants pay your asset for you.' },
  { title: 'Food Truck',             cat: 'business', cost: 12000, monthly: 1700, value: 12000, desc: 'Start a taco food truck business.', lesson: 'Payback time: cost divided by monthly income.' },
  { title: 'Storage Units',          cat: 'business', cost: 20000, monthly: 2700, value: 20000, desc: 'Buy a row of self-storage units.', lesson: 'Bigger assets = bigger monthly cash flow.' },
  { title: 'Duplex',                 cat: 'realestate', cost: 30000,  monthly: 3200, value: 30000, desc: 'Buy a two-family home; rent both sides.', lesson: 'Passive income above expenses = freedom!' },
];

const MARKET_CARDS = [
  { title: 'Stock Boom!', desc: 'All your stocks double in value.', apply: (p) => p.assets.forEach(a => { if (a.cat === 'stock') a.value *= 2; }) },
  { title: 'Market Crash', desc: 'All your stocks lose half their value.', apply: (p) => p.assets.forEach(a => { if (a.cat === 'stock') a.value = Math.round(a.value / 2); }) },
  { title: 'Rent Boom!', desc: 'All your real estate doubles in value.', apply: (p) => p.assets.forEach(a => { if (a.cat === 'realestate') a.value *= 2; }) },
  { title: 'Recession', desc: 'Your real estate loses 30% of its value.', apply: (p) => p.assets.forEach(a => { if (a.cat === 'realestate') a.value = Math.round(a.value * 0.7); }) },
  { title: 'Interest Rates Fall', desc: 'Your savings (bonds/CDs) gain 20% in value.', apply: (p) => p.assets.forEach(a => { if (a.cat === 'savings') a.value = Math.round(a.value * 1.2); }) },
  { title: 'Business Buyout', desc: 'A big company wants your business for 2x value. You may sell it.', apply: (p) => p._buyoutOffer = true },
  { title: 'Inflation', desc: 'Prices rise! Your monthly expenses increase by $25.', apply: (p) => { addMonthlyExpense(p, 25); } },
];

const EXPENSE_CARDS = [
  { title: 'New Phone Case', cash: 30, desc: 'The shiny new case catches your eye.', lesson: 'Needs vs wants: ask "do I really need it?" before buying.' },
  { title: 'Streaming Month', cash: 15, desc: 'One month of your favourite shows.', lesson: 'Small treats are fine — just track them.' },
  { title: 'Car Repair', cash: 400, desc: 'The car needs new brakes.', lesson: 'This is exactly why an emergency fund matters.' },
  { title: 'Pet Vet Visit', cash: 220, desc: 'Your pet needs a check-up.', lesson: 'Surprises happen. Be ready.' },
  { title: 'Birthday Party', cash: 120, desc: 'A friend wants a big party.', lesson: 'Having fun is OK — within a budget.' },
  { title: 'Take-out Night', cash: 90, desc: 'You skip cooking all week.', lesson: 'Small treats are fine; habits cost more.' },
  { title: 'School Trip', cash: 180, desc: 'A science trip to the city.', lesson: 'Experiences are worth it — plan ahead.' },
  { title: 'Gaming Bundle', cash: 130, desc: 'A new game pass you have been eyeing.', lesson: 'A once-off treat is fine, but watch impulse buys.' },
];

const BONUS_CARDS = [
  { title: 'Found Money', cash: 100,  desc: 'You find a $100 bill on the sidewalk.', lesson: 'Small wins add up. Invest your windfalls!' },
  { title: 'Birthday Gift Money', cash: 200, desc: 'Grandma sends birthday money.', lesson: 'Put part of every gift into savings.' },
  { title: 'Sold Old Toys', cash: 150, desc: 'You sell toys you no longer use.', lesson: 'Selling unused things frees up cash.' },
  { title: 'Art Contest Prize', cash: 300, desc: 'Your painting wins a prize!', lesson: 'Talents can earn money too.' },
  { title: 'Chore Reward', cash: 80, desc: 'Extra chores around the house.', lesson: 'Hard work has rewards.' },
  { title: 'Lottery Ticket Win', cash: 500, desc: 'A scratch-off wins!', lesson: 'A rare surprise. Never plan on luck.' },
];

const BABY_CARDS = [
  { title: 'A New Baby!', monthly: 60, cash: 100, desc: 'A new family member arrives. Diapers, formula, love.', lesson: 'Children are wonderful — and cost money. Plan ahead!' },
];

const LESSONS = {
  assets: 'An asset puts money IN your pocket every month: rent, dividends, business income.',
  liabilities: 'A liability takes money OUT of your pocket every month: bills, loans, subscriptions.',
  passive: 'Passive income is money you earn without trading your time. It works while you sleep.',
  active: 'Active income is money from trading your time — your salary.',
  payback: 'Payback time = Cost divided by monthly income. A lower number means your money comes back faster.',
  emergency: 'Save an emergency fund — 3 to 6 months of expenses — for surprises.',
  ratrace: 'The Rat Race is working to pay bills without building wealth. Escaping means your assets out-earn your expenses.',
  freedom: 'Financial freedom = passive income greater than your expenses.',
  debt: 'A loan gives cash now, but interest takes money every month. Borrow wisely.',
  needs: 'Needs are things you must have. Wants are nice to have. Spend on needs first.',
};

const HOW_TO_PLAY = [
  { h: 'Goal', t: 'Escape the Rat Race! Build monthly PASSIVE INCOME that is bigger than your monthly EXPENSES.' },
  { h: 'Roll & Move', t: 'On your turn, roll two dice and move around the board. Every space teaches a money skill.' },
  { h: 'Payday', t: 'Landing on PAYDAY (green) pays your salary, subtracts expenses, and adds your passive income.' },
  { h: 'Deals', t: 'DEAL spaces (purple) open today\'s market: buy or sell a home, factory, company shares or savings. Compare offers and pick the one with the shortest payback.' },
  { h: 'Markets', t: 'MARKET spaces (orange) change the value of what you own. Values rise and fall — that is normal.' },
  { h: 'Surprises', t: 'Expenses, taxes, babies and job losses happen to everyone. An emergency fund protects you.' },
  { h: 'Charity', t: 'Giving on the GIVING space earns you a bonus roll next turn. Generosity pays back.' },
  { h: 'Winning', t: 'Reach passive income greater than expenses on a payday and you escape the Rat Race. The first to escape wins!' },
];

const WIN_TIPS = [
  'Pay yourself first: save at least 20% of everything you earn.',
  'Buy assets first, then use their income for fun things.',
  'Track every dollar. Small leaks sink big ships.',
  'A good deal is one whose payback time is short.',
  'Keep an emergency fund so surprises never wreck you.',
  'Learn something about money every single day.',
  'Generosity and investing grow together.',
];
