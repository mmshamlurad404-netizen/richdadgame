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
  'career',       // 22
  'opportunity',  // 23
  'payday',       // 24
  'tax',          // 25
  'opportunity',  // 26
  'charity',      // 27
  'career',       // 28
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
  charity:    { label: 'GIVING',     color: '#1abc9c', icon: 'give',    tip: 'Giving 10% trains generosity. You earn a bonus roll — play again right away!' },
  career:     { label: 'PROMOTION',  color: '#795548', icon: 'career',  tip: 'Work to learn! A promotion raises your salary — and a little of your expenses too.' },
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
  career: '#795548',
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
  { cat: 'venture',    label: 'Startup Venture' },
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
  /* Startup ventures: high-reward assets with a multi-payday build phase that
     can fail. `monthly` is the planned income once launched; `buildTurns` is
     how many paydays until launch; `failChance` is the chance it flops. */
  { title: 'Food Stall Venture',     cat: 'venture', cost: 1500,  monthly: 400,  value: 1500,  buildTurns: 2, failChance: 0.25, desc: 'Back a friend\'s food stall. Builds over 2 paydays, then pays — or flops.', lesson: 'Ventures build before they pay. Diversify so one flop cannot break you.' },
  { title: 'App Startup',            cat: 'venture', cost: 3000,  monthly: 700,  value: 3000,  buildTurns: 3, failChance: 0.35, desc: 'Fund an app idea. It needs 3 paydays to launch — and startups can fail.', lesson: 'High risk, high reward. Only risk money you can afford to lose.' },
  { title: 'CleanTech Startup',      cat: 'venture', cost: 6000,  monthly: 1200, value: 6000,  buildTurns: 4, failChance: 0.4,  desc: 'A risky green-tech pitch: a 4-payday build with a real chance of failure — but a big payout if it works.', lesson: 'Every successful startup had flops behind it. Spread your bets.' },
];

// Each market card can also set a category trend: buying into an up-trend is
// rewarded (assets drift up a little each payday) and down-trends bleed value.
const MARKET_CARDS = [
  { title: 'Stock Boom!', desc: 'All your stocks double in value.', trend: { cat: 'stock', dir: 'up' }, apply: (p) => p.assets.forEach(a => { if (a.cat === 'stock') a.value *= 2; }) },
  { title: 'Market Crash', desc: 'All your stocks lose half their value.', trend: { cat: 'stock', dir: 'down' }, apply: (p) => p.assets.forEach(a => { if (a.cat === 'stock') a.value = Math.round(a.value / 2); }) },
  { title: 'Rent Boom!', desc: 'All your real estate doubles in value.', trend: { cat: 'realestate', dir: 'up' }, apply: (p) => p.assets.forEach(a => { if (a.cat === 'realestate') a.value *= 2; }) },
  { title: 'Recession', desc: 'Your real estate loses 30% of its value.', trend: { cat: 'realestate', dir: 'down' }, apply: (p) => p.assets.forEach(a => { if (a.cat === 'realestate') a.value = Math.round(a.value * 0.7); }) },
  { title: 'Interest Rates Fall', desc: 'Your savings (bonds/CDs) gain 20% in value.', trend: { cat: 'savings', dir: 'up' }, apply: (p) => p.assets.forEach(a => { if (a.cat === 'savings') a.value = Math.round(a.value * 1.2); }) },
  { title: 'Business Buyout', desc: 'A big company wants your business for 2x value. You may sell it.', trend: { cat: 'business', dir: 'up' }, apply: (p) => p._buyoutOffer = true },
  { title: 'Inflation', desc: 'Prices rise! Your monthly expenses increase by $25.', apply: (p) => { addMonthlyExpense(p, 25, 'Inflation'); } },
];

// Career tracks chosen in setup: each applies salary and expense multipliers.
// Hustlers earn more but their lifestyle costs more; frugal players keep a
// wider gap between income and expenses.
const CAREER_PATHS = [
  { id: 'balanced', name: 'Balanced', salaryMult: 1.0, expenseMult: 1.0, desc: 'The standard climb: salary and lifestyle grow together.' },
  { id: 'hustler', name: 'Hustler', salaryMult: 1.2, expenseMult: 1.15, desc: 'Take on extra shifts and hustle — you earn more, but your living costs rise too.' },
  { id: 'frugal', name: 'Frugal', salaryMult: 0.85, expenseMult: 0.7, desc: 'A quieter job with a lower salary, but you keep far more of it to invest.' },
];

// Lifestyle dilemmas appear on some DEAL spaces: a real A/B choice about money.
// Effects move cash, add passive income, add monthly expenses or adjust salary.
const LIFESTYLE_CARDS = [
  {
    title: 'The Promotion Dinner',
    desc: 'You get a raise at work. Your friends want to celebrate at an expensive restaurant.',
    a: { label: 'Treat everyone ($120)', effect: { cash: -120 }, lesson: 'Celebrating is fine — one night out should not derail your plan.' },
    b: { label: 'Keep it simple at home', effect: { cash: 0 }, lesson: 'A low-cost celebration, zero regret. Bank the raise.' },
  },
  {
    title: 'A Side Hustle Offer',
    desc: 'A neighbour offers you a small weekly gig that costs money to start: equipment up front, steady pay after.',
    a: { label: 'Start it ($200, +$40/mo)', effect: { cash: -200, monthly: 40 }, lesson: 'Good debt or good spending? A small asset that pays monthly is a real asset.' },
    b: { label: 'Decline politely', effect: { cash: 0 }, lesson: 'Saying no to a good deal is fine when the timing is wrong.' },
  },
  {
    title: 'The Birthday Splurge',
    desc: 'Your birthday is coming. A big party looks fun — but it is expensive.',
    a: { label: 'Big party ($300)', effect: { cash: -300 }, lesson: 'Memory or money? Every dollar has an opportunity cost.' },
    b: { label: 'Small family dinner ($80)', effect: { cash: -80 }, lesson: 'Celebrate within a budget — the joy is the people, not the price.' },
  },
  {
    title: 'The Nice Apartment',
    desc: 'A fancier apartment is available for rent. It is beautiful — and costs more every month.',
    a: { label: 'Upgrade (+$120/mo)', effect: { expense: 120 }, lesson: 'Lifestyle creep is quiet: a bigger apartment eats your cash flow forever.' },
    b: { label: 'Stay where you are', effect: { cash: 0 }, lesson: 'Every expense you skip is income you keep. Invest the difference.' },
  },
  {
    title: 'The Confidence Talk',
    desc: 'Your manager offers you more responsibility at work, with a raise attached.',
    a: { label: 'Take it (+$150/mo salary)', effect: { salary: 150 }, lesson: 'A raise is earned income — keep your expenses flat and the gap grows.' },
    b: { label: 'Keep the calm job', effect: { cash: 0 }, lesson: 'Choosing stability is valid — just keep building your asset column.' },
  },
  {
    title: 'The Windfall Choice',
    desc: 'An aunt gifts you $200. How do you use it?',
    a: { label: 'Emergency fund (+$200)', effect: { emergency: 200 }, lesson: 'Pay yourself first: a cash cushion makes surprises boring.' },
    b: { label: 'Invest later', effect: { cash: 200 }, lesson: 'Windfalls are rare — do not let them disappear into spending.' },
  },
];

/* Global events hit every player at once. Some have an ongoing effect that
   decays over the next few paydays. Drawn on MARKET landings. */
const EVENT_CARDS = [
  { title: 'Recession Hits!', ongoing: true, turnsLeft: 2, passiveMult: 0.7,
    desc: 'An economic downturn! Everyone\'s passive income drops to 70% for the next 2 paydays.',
    lesson: 'Income can shrink without warning. A reserve and low expenses keep you safe in a downturn.' },
  { title: 'Medical Bills', cost: 200,
    desc: 'A family health scare sends every player a medical bill.',
    lesson: 'Healthcare costs are a top reason people go broke. This is what an emergency fund is for.' },
  { title: 'Market Rally!', mult: 1.25, cat: 'stock',
    desc: 'Markets soar — every player\'s stocks gain 25% in value.',
    lesson: 'Diversified holdings ride rallies up too. Time in the market beats timing it.' },
  { title: 'Rent Surge!', mult: 1.2, cat: 'realestate',
    desc: 'Rents climb everywhere — every player\'s real estate gains 20% in value.',
    lesson: 'Real estate value rises with demand. Hold through the cycle.' },
  { title: 'Bonus Windfall', cash: 150,
    desc: 'A national surplus is shared out — every player receives a cash bonus.',
    lesson: 'Windfalls are rare. Bank them instead of spending them.' },
  { title: 'Interest Rate Cut', monthlyMult: 0.8,
    desc: 'The central bank cuts rates — every player\'s standard loan interest drops 20%.',
    lesson: 'Cheaper money makes debt less painful. Watch rates before you borrow.' },
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

const CAREER_TIERS = [
  { name: 'Apprentice',  salaryMult: 1.0, expenseMult: 1.0 },
  { name: 'Skilled',     salaryMult: 1.25, expenseMult: 1.05 },
  { name: 'Specialist',  salaryMult: 1.55, expenseMult: 1.15 },
  { name: 'Manager',     salaryMult: 2.0,  expenseMult: 1.3 },
  { name: 'Director',    salaryMult: 2.6,  expenseMult: 1.5 },
  { name: 'Executive',   salaryMult: 3.2,  expenseMult: 1.7 },
];

const LESSONS = {
  assets: 'An asset puts money IN your pocket every month: rent, dividends, business income.',
  liabilities: 'A liability takes money OUT of your pocket every month: bills, loans, subscriptions.',
  passive: 'Passive income is money you earn without trading your time. It works while you sleep.',
  active: 'Active income is money from trading your time — your salary.',
  tax: 'Taxes are progressive: each bracket of income is taxed at its own rate. Higher salary pushes more of it into higher brackets — promotions raise your tax bill too.',
  payback: 'Payback time = Cost divided by monthly income. A lower number means your money comes back faster.',
  emergency: 'Save an emergency fund — 3 to 6 months of expenses — for surprises.',
  ratrace: 'The Rat Race is working to pay bills without building wealth. Escaping means your assets out-earn your expenses.',
  freedom: 'Financial freedom = passive income greater than your expenses.',
  debt: 'A loan gives cash now, but interest takes money every month. Borrow wisely.',
  credit: 'Your credit score sets your interest rate. Repay loans to raise it; bankruptcy and restructure drop it. Good credit borrows cheaper.',
  needs: 'Needs are things you must have. Wants are nice to have. Spend on needs first.',
  promote: 'Career growth raises your salary — but lifestyle creep raises expenses too. What matters is the gap you keep and invest.',
  peerloan: 'A player-to-player loan is cash from another player at a friendlier rate. Interest still flows out every month — and the lender expects the principal back.',
  costofliving: 'The cost of living drifts up over time. Every few paydays your living expenses rise a little — raise your income faster than your bills.',
  insurance: 'Insurance costs a small monthly premium but caps your losses when a market drops. Paying a little protects a lot.',
  career: 'Promotions need more than time on the job — you must own assets that grow while you work. Your career and your portfolio rise together.',
  bankrupt: 'When bills exceed every resource, you are bankrupt. Fire-sale, restructure or retire — bankruptcy is expensive, so plan to avoid it.',
  trends: 'Markets move in trends. After a boom a category trends up; after a crash it trends down. Up-trending assets drift higher each payday, down-trending ones bleed — so buy into up-trends and be careful in down-trends.',
  venture: 'A startup venture is a high-reward asset with a build phase: it pays nothing while it builds, then launches — or fails. Only risk money you can afford to lose, and do not bet everything on one startup.',
  careerpath: 'Your career path sets your starting income and lifestyle. Hustlers earn more but spend more; frugal players earn less but keep a wider gap to invest. The gap is what builds wealth.',
  lifestyle: 'Real life is a series of choices: celebrate big or keep it simple, take the side hustle or pass, upgrade the apartment or stay. Every dollar you skip spending is a dollar that can earn.',
};

const MONEY_LESSONS = [
  {
    title: 'Assets vs. Liabilities',
    quote: '"An asset puts money in your pocket. A liability takes money out of your pocket." — Robert Kiyosaki',
    meaning: 'Rich people buy assets. Poor and middle-class people buy liabilities and call them assets. A house you rent out pays you rent, so it is an asset. A house you live in costs you mortgage, insurance and repairs every month — that is a liability. The middle class focuses on income; the rich focus on assets.',
    example: 'A $100,000 rental property that earns $800/month in rent and costs $300/month in tax and upkeep puts $500/month INTO your pocket. A $40,000 car loan takes $500/month OUT of your pocket. Both feel like "things you own", but one makes you richer and the other makes you poorer.',
    game: 'In Money Quest every asset you buy shows a green +X/mo. Every expense and loan shows a red -X/mo. Your job is simple: buy more green than red.',
  },
  {
    title: 'The Rat Race',
    quote: '"The rat race is: more money, more problems, bigger debts, bigger payments, working harder."',
    meaning: 'Most people spend their whole lives working for money: earn a salary, pay bills, buy things, and repeat. A raise only lets them buy more things and take on bigger bills, so they never get ahead. You escape only when your money earns more than you spend — when your assets out-earn your expenses.',
    example: 'Someone earning $5,000/month with $4,900/month in bills has just $100 left. They are one surprise away from debt. Someone earning $3,000/month with only $1,000 in bills and $2,200 in passive income has $4,200 left. The second person is free; the first is still in the race.',
    game: 'Each PAYDAY subtracts your expenses from your salary and adds your passive income. Escape the Rat Race the same way as the book: make your passive income greater than your expenses.',
  },
  {
    title: 'The Cash Flow Quadrant',
    quote: 'E — Employee. S — Self-employed. B — Business owner. I — Investor.',
    meaning: 'There are four ways to earn income. Employees (E) trade time for money. Self-employed people (S) own a job — they stop working, the income stops. Business owners (B) own a system that works without them. Investors (I) make money from money. Rich dad says move from the left side (E, S) to the right side (B, I) where your income is not tied to your hours.',
    example: 'A doctor (E) is paid only when they see patients. A shop owner (S) must be at the shop. A franchise owner (B) has managers running it while they travel. An investor (I) owns stocks and rentals that pay without them lifting a finger.',
    game: 'Your job card puts you on the left side of the quadrant — it pays salary only on PAYDAY. DEAL spaces let you cross to the right: buy businesses (B) and investments (I) that pay every month, even on spaces that are not payday.',
  },
  {
    title: 'Make Money Work for You',
    quote: '"The rich make money work for them. The poor and middle class work for money."',
    meaning: 'Working for money means trading hours for dollars — there are only 24 hours in a day. Money working for you means your savings and investments earn on their own: interest, rent, dividends and business profits. The goal is to build a money machine that produces income while you sleep.',
    example: '$60,000 saved at 5% interest earns $250/month — the equivalent of a part-time job that never calls in sick. Reinvest that interest and the machine grows by itself. That is the power of compounding.',
    game: 'Your passive income is your money machine. It adds to your cash every PAYDAY without you rolling the dice. Watch the +X/mo number grow faster than your -X/mo number.',
  },
  {
    title: 'Pay Yourself First',
    quote: '"Pay yourself first. The rich build their asset column first, then buy their toys."',
    meaning: 'Most people pay everyone else first — rent, bills, shops — and save whatever is left (which is usually nothing). The rich do the opposite: they take a slice of every paycheck for their asset column FIRST, then live on the rest. The rule: make savings and investing a fixed habit, not an afterthought.',
    example: 'Earn $2,000? Put $400 into your asset column (a fixed 20%) before paying anything else. Over 10 years with reinvested returns, that habit can grow into six figures while spending barely changes.',
    game: 'When you land a big deal, keep a cash reserve instead of spending everything. The game\'s best players pay themselves first by reinvesting early income instead of buying expensive liabilities.',
  },
  {
    title: 'Good Debt vs. Bad Debt',
    quote: '"Good debt makes you rich. Bad debt makes you poor."',
    meaning: 'Debt is a tool, not a sin. Good debt is money you borrow to buy an asset that pays more than the loan costs — the asset covers the payment and puts extra in your pocket. Bad debt is money you borrow for things that lose value and keep costing you, like a new phone or an expensive car.',
    example: 'Borrow $1,000 at $80/month to invest in a business that returns $150/month. Net: +$70/month and the loan eventually pays itself. Borrow $1,000 at $80/month to buy a big TV. Net: -$80/month forever and a TV worth a fraction of its price.',
    game: 'A bank loan gives you $1,000 now but adds -$80/month. Take it only to buy a deal that earns more than $80/month. Count the payback months before you borrow.',
  },
  {
    title: 'Mind Your Own Business',
    quote: '"Keep your daytime job, but start buying real assets — mind your own business."',
    meaning: 'You do not have to quit your job to become rich. While you keep earning your salary, use the extra cash to steadily build a second income from assets. Your "real business" is your asset column — the collection of things that earn money without you. It grows quietly in the background while your job pays the bills.',
    example: 'A teacher earns $3,000/month and buys one small rental a year with the surplus. After five years they own five rentals paying $1,500/month combined — a part-time business built while working full time.',
    game: 'Landing on a DEAL does not stop your job. Buy assets with your cash and keep your salary coming on PAYDAY. That is exactly how you build a second income in the game.',
  },
  {
    title: 'Work to Learn, Don\'t Work for Money',
    quote: '"The most important skills you can ever learn are sales and marketing." — rich dad',
    meaning: 'Your first jobs should teach you skills, not just pay bills. Sales teaches you persuasion, marketing teaches you communication, accounting teaches you to read the financial game. These skills make you valuable in any career and are the same skills you need to build businesses and judge investments.',
    example: 'Two friends take the same-paying job. One picks a role that trains them in sales and finance; the other picks the easiest desk. Five years later the first runs their own business; the second is still trading hours for a paycheck.',
    game: 'Every job card is a different starting point. A harder job gives you more practice and more starting cash, but the skills you learn — comparing payback, watching cash flow — are what let you escape the Rat Race faster.',
  },
  {
    title: 'Financial Education & Mistakes',
    quote: '"Winners are not afraid of losing. Losers are. Failure inspires winners; it defeats losers."',
    meaning: 'The greatest asset is financial education — understanding how money works. And education happens through mistakes. Everyone makes bad deals; the question is whether you learn from them. Analyze each loss, understand the numbers, and make the next decision better.',
    example: 'Buying a business that went bust taught one investor to check cash flow, not just promises. That one painful lesson saved them from three bigger losses later. In school you learn to avoid mistakes; in money you learn TO make small mistakes early.',
    game: 'Every expense, tax or job-loss space looks like a punishment, but each one teaches a financial lesson. Read the tip on every card. Players who learn the pattern — keep a reserve, avoid bad debt — survive surprises and win.',
  },
  {
    title: 'Generosity & Giving',
    quote: '"The more you give, the more you receive." — rich dad',
    meaning: 'Rich dad taught that money follows abundance, not scarcity. Giving first trains you to see and create value for others, builds trust and relationships, and keeps money flowing through your life. Generosity is also a discipline: it proves money is a tool you control, not a master that controls you.',
    example: 'A business owner who donates 10% of profits and mentors young people finds that customers and partners trust them more. That trust turns into referrals, deals and growth — the giving pays back in unexpected ways.',
    game: 'The GIVING space asks for 10% of your cash, and generosity literally pays back: you earn a bonus roll and play again right away. Both good karma and good strategy.',
  },
  {
    title: 'How Cash Flow Works',
    quote: 'Cash flow is the money that moves in and out of your pocket each month — the heart of every personal budget.',
    meaning: 'Cash flow is simply what comes in (income) minus what goes out (expenses) over a period. Positive cash flow means more money flows in than out, so your wealth grows. Negative cash flow means you spend more than you earn, so you must borrow or sell assets just to survive. Assets create inflows; liabilities create outflows. There are three classic flows: operating (salary), investing (rent, dividends, business profit) and financing (loans).',
    example: '$4,000 in salary plus $500 in rental income = $5,000 coming in. $3,300 in bills and food = $1,700 going out. Positive cash flow: +$1,700 left to save or invest. Reverse those numbers and you would need $1,700 of credit card debt every month just to stand still.',
    game: 'The center of the board shows your Monthly Cash Flow = Salary - Expenses + Passive income. Your mission is to push that number from negative to positive and keep it climbing.',
  },
  {
    title: 'Compound Interest',
    quote: '"Compound interest is the eighth wonder of the world. He who understands it, earns it; he who doesn\'t, pays it." — attributed to Albert Einstein',
    meaning: 'Compound interest is interest on your interest. When you earn, that earning is reinvested and earns too, so growth accelerates over time. The two dials are time and rate — starting early beats starting bigger. The same math that grows your savings works against you on debt, where unpaid interest snowballs.',
    example: '$1,000 at 8% a year grows to $2,159 in 10 years, $4,661 in 20 years, and $10,063 in 30 years — over 10x your original money with no extra deposits. Start at 25 and stop at 35, and you can outpace someone who starts at 35 and saves until 65.',
    game: 'Your passive income compounds every PAYDAY: the +X/mo you earn buys more assets, and each new asset adds more +X/mo. Watch the growth curve steepen as your money machine reinvests.',
  },
  {
    title: 'The Emergency Fund',
    quote: 'Set aside 3-6 months of expenses in cash for surprises, so an emergency never becomes a crisis. — Dave Ramsey',
    meaning: 'Before you invest aggressively, keep a cash reserve of 3 to 6 months of expenses somewhere safe and reachable. Its only job is to absorb surprises: job loss, medical bills, repairs. Without it, one bad month forces you to sell investments at the worst time or take on expensive debt, wrecking your whole plan.',
    example: 'Your expenses are $1,500/month, so you keep $6,000 in the bank. Your car dies and the repair costs $1,800 — annoying, but not a crisis. Without the fund, that $1,800 goes on a credit card and turns into months of interest payments.',
    game: 'Expenses, taxes, babies and job losses can strike on any turn. Players who keep a cash reserve survive surprises; players who spend every last dollar get forced to sell assets at the worst moment.',
  },
  {
    title: 'The 50/30/20 Budget',
    quote: 'The 50/30/20 budget: 50% of income for needs, 30% for wants, 20% for savings and debt. — Elizabeth Warren',
    meaning: 'A simple, memorable budget framework. Needs are essentials — housing, food, transport, bills — up to 50% of take-home pay. Wants are lifestyle — dining, travel, hobbies — up to 30%. The last 20% goes to savings, investments and paying down debt. It is not a law; it is a starting point that shows you where your money actually goes.',
    example: 'Earn $2,500/month. Cap needs at $1,250, wants at $750, and automatically move $500 into savings and debt. If needs are eating 70% of your pay, you instantly know you are house- or car-poor and need to downsize.',
    game: 'The board shows your Expenses as a monthly drain and your assets as monthly income. Use the same habit: cover your living costs, skip expensive liabilities, and funnel cash into assets.',
  },
  {
    title: 'Debt Snowball vs. Avalanche',
    quote: 'The snowball wins the behavior; the avalanche saves the money. — Dave Ramsey and the FIRE community',
    meaning: 'Two popular payoff strategies. The debt snowball lists debts from smallest to largest, pays minimums on all but the smallest, and throws every extra dollar at it — quick wins build momentum. The avalanche orders debts by interest rate, highest first, saving the most interest overall. Both beat drifting minimum payments; the best method is the one you will actually stick to.',
    example: 'Debts of $500, $2,000 and $8,000. Snowball: crush the $500 first for an early win, then the $2,000, then the big one. Avalanche: if the $8,000 card charges 22% and the small one charges 0%, attack the $8,000 first and save hundreds in interest.',
    game: 'Each bank loan costs -$80/month. Repay the loans that hurt your cash flow most, and watch your monthly cash flow jump the moment a loan is gone.',
  },
  {
    title: 'Low-Cost Investing & Index Funds',
    quote: 'The stock market is a device for transferring money from the impatient to the patient. — Warren Buffett',
    meaning: 'For most people, the best way to grow money is to buy broad, low-cost index funds that track the whole market and hold for decades. Time in the market beats timing the market — nobody can reliably predict next month, but over 20 years economies have grown. Keep fees tiny, because every 1% of fees quietly eats into your compounding.',
    example: '$10,000 in a broad market index fund at an average 7% return grows to about $76,000 in 30 years. Picking single hot stocks often loses to the index — even most professional managers fail to beat it after fees.',
    game: 'The STOCK deals on the board are a simple version of this idea. MARKET spaces swing values up and down; patient investors who hold through the noise still collect monthly income.',
  },
  {
    title: 'The Psychology of Money',
    quote: '"Doing well with money has a little to do with how smart you are and a lot to do with how you behave." — Morgan Housel, The Psychology of Money',
    meaning: 'Money success is more about behavior than brilliance. Greed makes you chase quick wins; fear makes you sell at the bottom; envy makes you buy what you cannot afford. The quiet habits — saving automatically, staying invested through crashes, avoiding flashy bets — matter far more than IQ. Wealth is what you do not spend.',
    example: 'Two smart engineers earn the same salary. One keeps up with the neighbors — new cars, a bigger house — and has nothing saved. The other saves 25% and invests calmly, ignoring fashion. Two decades later the "boring" one is independent while the "successful-looking" one is still renting their lifestyle.',
    game: 'MARKET spaces will test your behavior: values drop and your portfolio looks smaller. Panic sellers and impulse buyers lose; steady players who keep building assets win the long game.',
  },
  {
    title: 'Multiple Streams of Income',
    quote: 'Never depend on a single income. Make investments to create a second source. — The Richest Man in Babylon',
    meaning: 'Relying on one salary is fragile: one layoff, injury or downturn and your income stops. Building several streams — a job, rental income, a side business, dividends, savings interest — smooths the bumps and speeds up your wealth. Each stream can be small; together they compound.',
    example: 'A nurse earns $4,000 in salary, $300 from a rented room, $150 in dividends and $100 in savings interest — five flows totaling $4,550. When the hospital cuts her hours, the other four keep paying while she recovers.',
    game: 'The DEAL market offers four asset categories: real estate, business, stocks and savings. Buy across categories so one bad market cannot wipe you out, and your passive income no longer depends on a single payday.',
  },
  {
    title: 'The Rule of 72',
    quote: 'The Rule of 72: divide 72 by your interest rate to estimate how many years it takes to double your money.',
    meaning: 'A quick mental shortcut: years to double is about 72 divided by your annual rate of return. At 6% money doubles in 12 years; at 8% in 9; at 12% in 6. It works in reverse too — 72 divided by years tells you the rate you need. Great for comparing investments without a calculator.',
    example: 'Choose between a 5% savings account and a 9% business return: 72 / 5 = 14.4 years to double; 72 / 9 = 8 years. Over 24 years the 5% doubles 1.7 times while the 9% doubles 3 times — a huge difference from a small rate gap.',
    game: 'Before you buy a DEAL, estimate how fast it doubles your money: low cost with high monthly income wins. The payback months shown on each offer are your game\'s Rule of 72.',
  },
  {
    title: 'Opportunity Cost',
    quote: 'There is no such thing as a free lunch — every dollar you spend is a choice about your future.',
    meaning: 'Every dollar has an alternative use. Money spent on one thing cannot earn for you somewhere else. Opportunity cost is the value of the next best thing you gave up. It turns every purchase into a question: is this worth more than what this money could grow into?',
    example: '$2,000 spent on a new gaming setup is $2,000 not invested. At 7% over 20 years that $2,000 could have grown to about $7,700. The setup is fun — the question is whether it is worth $7,700 of future money.',
    game: 'Every Buy button is a decision with a trade-off. Spending cash on a shiny expense now means missing the passive income that cash could have generated forever. Compare each deal\'s payback before you commit.',
  },
  {
    title: 'Risk Management & Insurance',
    quote: 'Hope is not a strategy. Protect your downside so a setback never becomes a disaster.',
    meaning: 'Wealth is not only about how much you can earn — it is about how much you can keep when things go wrong. A market crash, an accident or a surprise bill can wipe out years of progress in one turn. Insurance and cash reserves exist to absorb those shocks: you pay a small, predictable cost now so a big, unpredictable cost later cannot ruin you.',
    example: 'Two landlords each own a building. One pays a small premium to insure it; the other saves the premium and hopes nothing happens. When a fire damages both, the insured landlord rebuilds and keeps collecting rent, while the uninsured one loses the building and years of income.',
    game: 'Your emergency fund absorbs surprise expenses, and per-category insurance caps what you lose when a MARKET space drops an asset\'s value. Insure the categories you rely on — the premium is small, the protection is large.',
  },
  {
    title: 'Lifestyle Inflation',
    quote: 'When your income rises, keep your spending flat — or you will be rich and poor at the same time.',
    meaning: 'As people earn more, they usually spend more: a bigger car, a nicer apartment, fancier habits. Each raise gets absorbed by a new lifestyle, so the savings rate never improves. Financial freedom comes from the gap between what you earn and what you spend — keep that gap growing, not the lifestyle.',
    example: 'A promotion adds $1,000/month. One worker keeps the old apartment and invests the raise, adding $12,000 a year to their wealth. Another signs a lease on a nicer place and a car payment that cost exactly $1,000 — richer on paper, poorer in reality.',
    game: 'Promotions raise your salary but also nudge your expenses up, and the cost of living drifts upward every few paydays. Beat the creep: grow your passive income faster than your living costs, or the Rat Race just gets more expensive.',
  },
  {
    title: 'Trends, Risk & Startups',
    quote: 'Time in the market beats timing the market — but trends are real, and risk must be priced.',
    meaning: 'Prices do not move randomly forever: after a boom a market trends up for a while, after a crash it trends down. Buying into strength and avoiding weakness is not timing the market, it is riding momentum. And risk cuts both ways: the highest-reward bets — like funding a new business — can also fail entirely, so you only risk money you can afford to lose and you spread your bets.',
    example: 'An investor watches real estate rally and buys a rental while rents are climbing — the trend pushes its value up further each month. Meanwhile a friend puts their whole savings into one startup that never launches and loses most of it. The winner priced momentum; the loser priced nothing.',
    game: 'MARKET news sets category trends: up-trending assets drift +1% each payday, down-trending ones -1%. DEAL spaces can also offer a startup venture that builds for a few paydays and then launches — or fails. Buy into up-trends, hedge down-trends, and never bet the whole board on one venture.',
  },
];

const HOW_TO_PLAY = [
  { h: 'Goal', t: 'Escape the Rat Race! Build monthly PASSIVE INCOME that is bigger than your monthly EXPENSES.' },
  { h: 'Career Paths', t: 'In setup, each player picks a career path. Hustlers earn a higher salary but pay more living expenses; frugal players earn less but keep a wider gap to invest. Your path sets your starting salary and expenses — you can still climb the promotion ladder from there.' },
  { h: 'Roll & Move', t: 'On your turn, roll two dice and move around the board. Every space teaches a money skill.' },
  { h: 'Payday', t: 'Landing on PAYDAY (green) pays your salary, subtracts expenses, and adds your passive income. Your emergency fund earns 1% interest and any peer-loan interest you are owed is collected here too. Startup ventures also progress here: they build, then launch or fail.' },
  { h: 'Deals', t: 'DEAL spaces (purple) open today\'s market: buy or sell a home, factory, company shares, savings or a startup venture. Each offer is rated by payback time — Great (12 mo), Good (24 mo), Fair (48 mo) or Slow — and the shorter the payback, the faster your money comes back.' },
  { h: 'Markets', t: 'MARKET spaces (orange) change the value of what you own. Values rise and fall — that is normal. Your portfolio shows the gain or loss on every asset since you bought it. Market news also sets category trends: up-trends drift your assets higher each payday, down-trends bleed value.' },
  { h: 'Surprises', t: 'Expenses, taxes, babies and job losses happen to everyone. An emergency fund protects you, and insurance caps your losses when a market drops.' },
  { h: 'Emergency Fund', t: 'Use the portfolio to deposit or withdraw from your emergency fund. Surprise costs draw from the fund first, it earns 1% interest on every payday, and the target is 3 months of expenses.' },
  { h: 'Insurance', t: 'In your portfolio, insure any asset category you own for 1% of its insured value per month. Insurance caps market-down losses at 60% of what you paid, so a crash hurts less.' },
  { h: 'Startup Ventures', t: 'A STARTUP offer is a high-reward bet: you fund a project that builds for 2 to 4 paydays (paying nothing), then launches into passive income — or fails and salvages only a fraction. Buy them only with money you can afford to lose, and spread your bets.' },
  { h: 'Lifestyle Choices', t: 'Some DEAL spaces present a real lifestyle dilemma instead of the market: celebrate big or keep it simple, take the side hustle or pass, upgrade the apartment or stay. There is usually no single right answer — the best choice protects your cash flow.' },
  { h: 'Taxes', t: 'The TAX space charges progressive income tax: 10% up to $800/mo, 15% to $2000/mo, 22% to $5000/mo, then 32%. Only the part above each threshold is taxed at the higher rate.' },
  { h: 'Charity', t: 'Giving on the GIVING space earns you a bonus roll — you play again right away. Generosity pays back.' },
  { h: 'Promotions', t: 'PROMOTION spaces climb your career ladder: higher salary, a little more expense, and a cash bonus. You must own one asset per career tier to be promoted — skills are assets too, but so are real ones.' },
  { h: 'Cost of Living', t: 'Every few paydays the cost of living rises about 5%. Your living expenses creep up over time, so keep your income growing faster than your bills.' },
  { h: 'Bankruptcy', t: 'If you cannot cover your bills, you must fire-sale assets, restructure your debt, or retire from the game. Avoid it with an emergency fund.' },
  { h: 'Loans & Credit', t: 'Borrow from the portfolio to fund deals, but interest costs you every month. Interest-only loans are cheaper monthly yet cost a 20% premium to settle. Repaying loans raises your credit score and lowers future rates.' },
  { h: 'Peer Loans', t: 'In the Trade view you can borrow from another player at a friendlier 6% monthly rate. The lender must have the cash and accepts on their turn — the loan activates at the start of the next round. Repay the principal anytime from the Trade view.' },
  { h: 'Global Events', t: 'Sometimes a MARKET space triggers a global event instead of a news card: recessions cut passive income for a few paydays, rallies raise asset values, rate cuts shrink loan interest. Events hit every player — good luck is shared, and so is bad luck.' },
  { h: 'Winning', t: 'Pick a win condition in setup. Escape the Rat Race: first to passive income greater than expenses. Richest after 40 turns: the biggest net worth when turn 40 ends wins. First to $100,000: the first player whose net worth passes the goal wins. When the game ends, every player gets a final report with an income statement and balance sheet.' },
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
