/* ==========================================================
   FINANCE CALCULATORS — Tailwind + vanilla JS
   ========================================================== */

// ---------- Theme (Tailwind dark class) ----------
const themeToggle = document.getElementById('theme-toggle');

function updateThemeButton() {
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('theme-toggle-icon').textContent = isDark ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

updateThemeButton();

themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('mf-calc-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  updateThemeButton();
  updateChartsTheme();
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Tab active styles ----------
const TAB_ORDER = ['sip', 'lumpsum', 'swp', 'interest'];
const TAB_BASE =
  'tab-btn flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:px-3 sm:text-sm dark:focus-visible:ring-offset-night-page';
const TAB_STYLES = {
  sip: 'bg-blue-50 text-blue-600 shadow-inner ring-1 ring-blue-200 focus-visible:ring-blue-400 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/35',
  lumpsum: 'bg-emerald-50 text-brand shadow-inner ring-1 ring-emerald-200 focus-visible:ring-brand dark:bg-emerald-500/15 dark:text-brand-light dark:ring-emerald-500/35',
  swp: 'bg-violet-50 text-violet-600 shadow-inner ring-1 ring-violet-200 focus-visible:ring-violet-400 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/35',
  interest: 'bg-amber-50 text-amber-600 shadow-inner ring-1 ring-amber-200 focus-visible:ring-amber-400 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/35',
};
const TAB_INACTIVE = 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-slate-400 dark:text-night-muted dark:hover:bg-night-elevated dark:hover:text-stone-100';

const tabRecalc = {
  sip: () => recalcSIP(false),
  lumpsum: () => recalcLumpSum(false),
  swp: () => recalcSWP(false),
  interest: () => recalcInterest(false),
};
const tabReady = { sip: false, lumpsum: false, swp: false, interest: false };

function resolveTabFromHash() {
  const hash = location.hash.replace(/^#/, '');
  return TAB_ORDER.includes(hash) ? hash : null;
}

function setActiveTab(tabName, { persist = true } = {}) {
  if (!TAB_ORDER.includes(tabName)) tabName = 'sip';

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.tabIndex = isActive ? 0 : -1;
    btn.className = `${TAB_BASE} ${isActive ? TAB_STYLES[tabName] : TAB_INACTIVE}`;
  });

  document.querySelectorAll('.calc-panel').forEach((panel) => {
    const show = panel.id === `panel-${tabName}`;
    panel.classList.toggle('hidden', !show);
    panel.hidden = !show;
  });

  if (!tabReady[tabName]) {
    tabReady[tabName] = true;
    tabRecalc[tabName]();
  } else {
    requestAnimationFrame(() => resizeChartsForTab(tabName));
  }

  if (persist) {
    localStorage.setItem('mf-calc-tab', tabName);
    if (location.hash !== `#${tabName}`) {
      history.replaceState(null, '', `#${tabName}`);
    }
  }
}

function resizeChartsForTab(tabName) {
  const view = chartViewModes[tabName] || 'pie';
  const chart = view === 'line' ? lineCharts[tabName] : pieCharts[tabName];
  if (chart) chart.resize();
}

document.querySelectorAll('.tab-btn').forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

document.getElementById('tab-nav').addEventListener('keydown', (e) => {
  const tabs = [...document.querySelectorAll('.tab-btn')];
  const idx = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  if (idx < 0) return;

  let next = idx;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;
  else return;

  e.preventDefault();
  tabs[next].focus();
  setActiveTab(tabs[next].dataset.tab);
});

window.addEventListener('hashchange', () => {
  const fromHash = resolveTabFromHash();
  if (fromHash) setActiveTab(fromHash, { persist: false });
});

let suppressRecalc = false;

// ---------- Validation ----------
function sanitizeNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ---------- formatCurrency — Indian numbering ----------
function formatCurrency(amount) {
  const n = Math.round(Number(amount) || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(n).toLocaleString('en-IN')}`;
}

function formatIndianShortNumber(value) {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return '';
  }

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // Below 1 crore — keep original Indian formatting
  if (abs < 1e7) {
    return num.toLocaleString('en-IN');
  }

  const crore = abs / 1e7;

  // 1 crore crore
  if (crore >= 1e7) {
    return `${sign}${formatShort(crore / 1e7)} cr cr`;
  }

  // 1 lakh crore
  if (crore >= 1e5) {
    return `${sign}${formatShort(crore / 1e5)} lakh cr`;
  }

  // Crore
  return `${sign}${formatShort(crore)} cr`;
}

function formatShort(value) {
  return Number(value.toFixed(2)).toLocaleString('en-IN');
}

// ≥ ₹1 Cr → short form only (e.g. ₹7.17 cr); otherwise full Indian currency
function setCurrencyDisplay(el, amount) {
  if (!el) return;
  const n = Number(amount) || 0;
  const abs = Math.abs(Math.round(n));
  if (abs >= 1e7) {
    const short = formatIndianShortNumber(abs);
    el.textContent = n < 0 ? `-₹${short}` : `₹${short}`;
    return;
  }
  el.textContent = formatCurrency(n);
}

// Compact labels for chart axes — Cr / L / K (Indian units)
function formatCurrencyCompact(amount) {
  const n = Math.round(Number(amount) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  function fmtUnit(value) {
    if (value >= 100) return String(Math.round(value));
    if (value >= 10) return String(Math.round(value * 10) / 10);
    return String(Math.round(value * 100) / 100);
  }

  if (abs >= 1e7) return `${sign}₹${fmtUnit(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${fmtUnit(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${fmtUnit(abs / 1e3)}K`;
  return `${sign}₹${abs}`;
}

const DEFAULT_INFLATION_RATE_PERCENT = 7;

function getInflationRatePercent() {
  const sel = document.querySelector('.inflation-rate-select');
  return sel ? sanitizeNumber(sel.value, 1, 10, DEFAULT_INFLATION_RATE_PERCENT) : DEFAULT_INFLATION_RATE_PERCENT;
}

function inflationAdjustedValue(futureAmount, years) {
  const amount = Number(futureAmount) || 0;
  const y = sanitizeNumber(years, 0, 100, 0);
  if (y <= 0) return Math.round(amount);
  return Math.round(amount / Math.pow(1 + getInflationRatePercent() / 100, y));
}

const inflationAdjustedInputs = {
  sip: { amount: 0, years: 0 },
  lumpsum: { amount: 0, years: 0 },
  swp: { amount: 0, years: 0 },
  interest: { amount: 0, years: 0 },
};

function setInflationAdjustedInput(calc, amount, years) {
  inflationAdjustedInputs[calc] = { amount: Number(amount) || 0, years: sanitizeNumber(years, 0, 100, 0) };
}

const INFLATION_DISPLAYS = [
  ['sip-total-inflation', 'sip'],
  ['lump-total-inflation', 'lumpsum'],
  ['swp-remaining-inflation', 'swp'],
  ['int-total-inflation', 'interest'],
];

function updateInflationAdjustedDisplays() {
  INFLATION_DISPLAYS.forEach(([elId, calc]) => {
    const { amount, years } = inflationAdjustedInputs[calc];
    setCurrencyDisplay(document.getElementById(elId), inflationAdjustedValue(amount, years));
  });
}

function initInflationRateSelects() {
  const options = Array.from({ length: 10 }, (_, i) => {
    const value = i + 1;
    const selected = value === DEFAULT_INFLATION_RATE_PERCENT ? ' selected' : '';
    return `<option value="${value}"${selected}>${value}</option>`;
  }).join('');

  document.querySelectorAll('.inflation-rate-select').forEach((sel) => {
    sel.innerHTML = options;
  });

  document.addEventListener('change', (e) => {
    if (!e.target.matches('.inflation-rate-select')) return;
    const rate = sanitizeNumber(e.target.value, 1, 10, DEFAULT_INFLATION_RATE_PERCENT);
    document.querySelectorAll('.inflation-rate-select').forEach((other) => {
      other.value = String(rate);
    });
    updateInflationAdjustedDisplays();
  });
}

const COMPOUNDING = {
  monthly: { periodsPerYear: 12, label: 'Monthly' },
  quarterly: { periodsPerYear: 4, label: 'Quarterly' },
  annually: { periodsPerYear: 1, label: 'Annually' },
};

function getCompoundingConfig(freq) {
  return COMPOUNDING[freq] || COMPOUNDING.monthly;
}

// Effective periodic rate — same CAGR regardless of compounding count
function getEffectivePeriodicRate(annualRatePercent, periodsPerYear) {
  const annual = sanitizeNumber(annualRatePercent, 0, 100, 0) / 100;
  return Math.pow(1 + annual, 1 / periodsPerYear) - 1;
}

// Nominal periodic rate (annual ÷ periods) — more frequent compounding → higher returns
function getNominalPeriodicRate(annualRatePercent, periodsPerYear) {
  return sanitizeNumber(annualRatePercent, 0, 100, 0) / 100 / periodsPerYear;
}

// Monthly growth rate from nominal compounding frequency (SIP contributions are monthly)
function getMonthlyRateFromCompounding(annualRatePercent, compounding) {
  const { periodsPerYear } = getCompoundingConfig(compounding);
  const monthsPerCompound = 12 / periodsPerYear;
  const periodRate = getNominalPeriodicRate(annualRatePercent, periodsPerYear);
  if (periodRate === 0) return 0;
  return Math.pow(1 + periodRate, 1 / monthsPerCompound) - 1;
}

// ---------- calculateSIP: monthly contributions, grow each month at compounding-equivalent rate ----------
function runSIPSimulation(monthlyInvestment, annualRatePercent, annualStepUpPercent, years, compounding, existingCorpus = 0) {
  const annualStepUp = sanitizeNumber(annualStepUpPercent, 0, 50, 0) / 100;
  const yearsSafe = sanitizeNumber(years, 0, 100, 0);
  const totalMonths = Math.round(yearsSafe * 12);
  const monthlyRate = getMonthlyRateFromCompounding(annualRatePercent, compounding);

  let monthly = sanitizeNumber(monthlyInvestment, 0, 1e9, 0);
  const corpus = sanitizeNumber(existingCorpus, 0, 1e12, 0);
  let balance = corpus;
  let totalInvested = corpus;

  for (let m = 1; m <= totalMonths; m++) {
    if (m > 1 && (m - 1) % 12 === 0) monthly *= 1 + annualStepUp;
    balance += monthly;
    if (monthlyRate > 0) balance *= 1 + monthlyRate;
    totalInvested += monthly;
  }

  return {
    investedAmount: totalInvested,
    estimatedReturns: Math.max(0, balance - totalInvested),
    totalValue: Math.max(0, balance),
  };
}

function calculateSIP(monthlyInvestment, annualRatePercent, years, compounding, annualStepUpPercent = 0, existingCorpus = 0) {
  return runSIPSimulation(monthlyInvestment, annualRatePercent, annualStepUpPercent, years, compounding, existingCorpus);
}

// ---------- calculateLumpSum: FV = P × (1 + r)^n, r = nominal annual ÷ periods ----------
function calculateLumpSum(investmentAmount, annualRatePercent, years, compounding) {
  const { periodsPerYear } = getCompoundingConfig(compounding);
  const P = sanitizeNumber(investmentAmount, 0, 1e12, 0);
  const yearsSafe = sanitizeNumber(years, 0, 100, 0);
  const n = yearsSafe * periodsPerYear;
  const r = getNominalPeriodicRate(annualRatePercent, periodsPerYear);
  const totalValue = n <= 0 || r === 0 ? P : P * Math.pow(1 + r, n);

  return {
    investedAmount: P,
    estimatedReturns: Math.max(0, totalValue - P),
    totalValue: Math.max(0, totalValue),
  };
}

// ---------- SWP: monthly withdrawals; growth credited at selected compounding frequency ----------
// Balance may go negative when planned withdrawals exceed corpus — that shortfall is shown as remaining.
function applySWPMonth(state, annualIncr, growthRate, monthsPerCompound, compounding) {
  if (state.month > 1 && (state.month - 1) % 12 === 0) state.withdraw *= 1 + annualIncr;

  state.monthsSinceCompound += 1;
  const due = compounding === 'monthly' || state.monthsSinceCompound >= monthsPerCompound;
  if (due) {
    if (state.balance > 0) state.balance *= 1 + growthRate;
    state.monthsSinceCompound = 0;
  }

  state.balance -= state.withdraw;
  state.totalWithdrawn += state.withdraw;
}

function runSWPSimulation(corpus, monthlyWithdrawal, annualReturnPercent, annualIncreasePercent, years, compounding) {
  const { periodsPerYear } = getCompoundingConfig(compounding);
  const annualIncr = annualIncreasePercent / 100;
  const yearsSafe = sanitizeNumber(years, 0, 100, 0);
  const totalMonths = Math.round(yearsSafe * 12);
  const monthsPerCompound = 12 / periodsPerYear;
  const growthRate = getEffectivePeriodicRate(annualReturnPercent, periodsPerYear);

  const state = {
    month: 0,
    balance: sanitizeNumber(corpus, 0, 1e12, 0),
    withdraw: sanitizeNumber(monthlyWithdrawal, 0, 1e9, 0),
    totalWithdrawn: 0,
    monthsSinceCompound: 0,
  };

  for (state.month = 1; state.month <= totalMonths; state.month++) {
    applySWPMonth(state, annualIncr, growthRate, monthsPerCompound, compounding);
  }

  return {
    remainingCorpus: state.balance,
    totalWithdrawn: state.totalWithdrawn,
    endingMonthlyWithdrawal: state.withdraw,
  };
}

function calculateSWP(corpus, monthlyWithdrawal, annualReturnPercent, annualIncreasePercent, years, compounding) {
  return runSWPSimulation(corpus, monthlyWithdrawal, annualReturnPercent, annualIncreasePercent, years, compounding);
}

// ---------- Timeline projections (yearly) ----------
function buildYearLabels(years) {
  const labels = ['Year'];
  for (let y = 1; y <= years; y++) labels.push(String(y));
  return labels;
}

function projectSIPTimeline(monthlyInvestment, annualRatePercent, years, compounding, annualStepUpPercent = 0, existingCorpus = 0) {
  const yearsSafe = sanitizeNumber(years, 0, 100, 0);
  const corpus = sanitizeNumber(existingCorpus, 0, 1e12, 0);
  const invested = [corpus];
  const total = [corpus];
  const returns = [0];
  for (let y = 1; y <= yearsSafe; y++) {
    const r = calculateSIP(monthlyInvestment, annualRatePercent, y, compounding, annualStepUpPercent, corpus);
    invested.push(r.investedAmount);
    total.push(r.totalValue);
    returns.push(r.estimatedReturns);
  }
  return { labels: buildYearLabels(yearsSafe), invested, total, returns };
}

function projectLumpSumTimeline(investmentAmount, annualRatePercent, years, compounding) {
  const yearsSafe = sanitizeNumber(years, 0, 100, 0);
  const P = sanitizeNumber(investmentAmount, 0, 1e12, 0);
  const invested = [P];
  const total = [P];
  const returns = [0];
  for (let y = 1; y <= yearsSafe; y++) {
    const r = calculateLumpSum(P, annualRatePercent, y, compounding);
    invested.push(P);
    total.push(r.totalValue);
    returns.push(r.estimatedReturns);
  }
  return { labels: buildYearLabels(yearsSafe), invested, total, returns };
}

function projectSWPTimeline(corpus, monthlyWithdrawal, annualReturnPercent, annualIncreasePercent, years, compounding) {
  const yearsSafe = sanitizeNumber(years, 0, 100, 0);
  const corpusSeries = [sanitizeNumber(corpus, 0, 1e12, 0)];
  const withdrawnSeries = [0];
  for (let y = 1; y <= yearsSafe; y++) {
    const r = calculateSWP(corpus, monthlyWithdrawal, annualReturnPercent, annualIncreasePercent, y, compounding);
    corpusSeries.push(r.remainingCorpus);
    withdrawnSeries.push(r.totalWithdrawn);
  }
  return { labels: buildYearLabels(yearsSafe), corpus: corpusSeries, withdrawn: withdrawnSeries };
}

function projectInterestTimeline(principal, annualRatePercent, years, interestType, compounding) {
  const yearsSafe = sanitizeNumber(years, 0, 100, 0);
  const P = sanitizeNumber(principal, 0, 1e12, 0);
  const invested = [P];
  const total = [P];
  const returns = [0];
  for (let y = 1; y <= yearsSafe; y++) {
    const r = calculateInterest(P, annualRatePercent, y, interestType, compounding);
    invested.push(r.principal);
    total.push(r.totalAmount);
    returns.push(r.interest);
  }
  return { labels: buildYearLabels(yearsSafe), invested, total, returns };
}

// ---------- Chart.js ----------
const pieCharts = { sip: null, lumpsum: null, swp: null, interest: null };
const lineCharts = { sip: null, lumpsum: null, swp: null, interest: null };
const chartViewModes = { sip: 'pie', lumpsum: 'pie', swp: 'pie', interest: 'pie' };
const lastTimeline = { sip: null, lumpsum: null, swp: null, interest: null };
const PIE_CANVAS = { sip: 'sip-pie-chart', lumpsum: 'lump-pie-chart', swp: 'swp-pie-chart', interest: 'int-pie-chart' };
const LINE_CANVAS = { sip: 'sip-line-chart', lumpsum: 'lump-line-chart', swp: 'swp-line-chart', interest: 'int-line-chart' };
const CHART_VARIANT = { sip: 'sip', lumpsum: 'lump', swp: 'swp', interest: 'interest' };

const NIGHT_CHART = {
  invested: '#2a3548',
  investedHover: '#364560',
  border: '#0b1220',
  legend: '#cbd5e1',
  legendMuted: '#8b9bb4',
};

const CHART_LABELS = {
  investment: {
    invested: 'Invested amount',
    total: 'Total value',
    gains: 'Wealth gained',
    donut: ['Invested amount', 'Wealth gained'],
  },
  swp: {
    remaining: 'Remaining corpus',
    withdrawn: 'Total withdrawn',
    donut: ['Total withdrawn', 'Remaining corpus'],
  },
  interest: {
    principal: 'Principal',
    total: 'Total amount',
    gains: 'Interest earned',
    donut: ['Principal', 'Interest earned'],
  },
};

function getChartLabelSet(variant) {
  if (variant === 'swp') return CHART_LABELS.swp;
  if (variant === 'interest') return CHART_LABELS.interest;
  return CHART_LABELS.investment;
}

function getChartPalette(variant) {
  const isDark = document.documentElement.classList.contains('dark');
  const accents = {
    sip: { b: '#2563eb', bDark: '#5b9cf5', bh: '#3b82f6', bhDark: '#7eb3f7', a: '#e2e8f0', ah: '#cbd5e1' },
    swp: { b: '#7c3aed', bDark: '#a78bfa', bh: '#8b5cf6', bhDark: '#c4b5fd', a: '#e2e8f0', ah: '#cbd5e1' },
    interest: { b: '#f59e0b', bDark: '#fbbf24', bh: '#d97706', bhDark: '#fcd34d', a: '#e2e8f0', ah: '#cbd5e1' },
    lump: { b: '#00b386', bDark: '#00d09c', bh: '#00d09c', bhDark: '#34d399', a: '#e7e5e4', ah: '#d6d3d1' },
  };
  const accent = accents[variant] || accents.lump;
  return {
    segmentA: isDark ? NIGHT_CHART.invested : accent.a,
    segmentAHover: isDark ? NIGHT_CHART.investedHover : accent.ah,
    segmentB: isDark ? accent.bDark : accent.b,
    segmentBHover: isDark ? accent.bhDark : accent.bh,
    border: isDark ? NIGHT_CHART.border : '#ffffff',
    text: isDark ? NIGHT_CHART.legend : '#475569',
    tick: isDark ? NIGHT_CHART.legendMuted : '#64748b',
  };
}

function createDonutChart(canvasId, variant, segmentA, segmentB, existingChart, labels, quickUpdate = false) {
  if (!labels) labels = getChartLabelSet(variant).donut;
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return null;

  const panel = canvas.closest('.calc-panel');
  if (panel?.hidden) return existingChart;

  const palette = getChartPalette(variant);
  const values = [Math.max(0, segmentA), Math.max(0, segmentB)];
  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [palette.segmentA, palette.segmentB],
        hoverBackgroundColor: [palette.segmentAHover, palette.segmentBHover],
        borderColor: palette.border,
        borderWidth: 3,
        hoverBorderWidth: 3,
        hoverOffset: prefersReducedMotion ? 0 : 6,
      },
    ],
  };
  const animDuration = prefersReducedMotion ? 0 : quickUpdate ? 0 : 600;
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '58%',
    animation: { animateRotate: !prefersReducedMotion, duration: animDuration },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: palette.text,
          padding: 18,
          font: { size: 12, weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 12,
        callbacks: {
          label: (ctx) => {
            const total = values[0] + values[1];
            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
            return `${ctx.label}: ${formatCurrency(ctx.raw)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (existingChart) {
    existingChart.data = data;
    existingChart.options = options;
    existingChart.update(quickUpdate || prefersReducedMotion ? 'none' : 'default');
    return existingChart;
  }
  return new Chart(canvas, { type: 'doughnut', data, options });
}

function getLineChartLabels(variant) {
  const L = getChartLabelSet(variant);
  if (variant === 'swp') return { a: L.remaining, b: L.withdrawn };
  if (variant === 'interest') return { a: L.principal, b: L.total, c: L.gains };
  return { a: L.invested, b: L.total, c: L.gains };
}

function legendLineSwatch(color, borderWidth, borderDash = []) {
  const w = 36;
  const h = 12;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const y = h / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = borderWidth;
  ctx.lineCap = 'round';
  ctx.setLineDash(borderDash);
  ctx.beginPath();
  ctx.moveTo(2, y);
  ctx.lineTo(w - 2, y);
  ctx.stroke();
  return canvas;
}

function lineLegendLabels(chart) {
  const fontColor = chart.legend.options.labels.color;
  return chart._getSortedDatasetMetas().map((meta) => {
    const ds = chart.data.datasets[meta.index];
    const color = ds.borderColor;
    const width = ds.borderWidth || 2;
    const dash = ds.borderDash || [];
    return {
      text: ds.label,
      hidden: !meta.visible,
      datasetIndex: meta.index,
      fontColor,
      pointStyle: legendLineSwatch(color, width, dash),
      strokeStyle: color,
      fillStyle: 'transparent',
    };
  });
}

function createLineChart(canvasId, variant, timeline, existingChart, quickUpdate = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined' || !timeline) return existingChart;

  const palette = getChartPalette(variant);
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#2a3548' : '#e2e8f0';
  const tickColor = palette.tick;
  const lineGrey = isDark ? '#b8c4d0' : '#94a3b8';
  const labels = getLineChartLabels(variant);
  const animDuration = prefersReducedMotion ? 0 : quickUpdate ? 0 : 500;
  const areaFill = {
    sip: isDark ? 'rgba(91, 156, 245, 0.12)' : 'rgba(37, 99, 235, 0.08)',
    lump: isDark ? 'rgba(0, 208, 156, 0.12)' : 'rgba(0, 179, 134, 0.08)',
    swp: isDark ? 'rgba(167, 139, 250, 0.12)' : 'rgba(124, 58, 237, 0.08)',
    interest: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(245, 158, 11, 0.08)',
  };
  const datasets =
    variant === 'swp'
      ? [
        {
          label: labels.a,
          data: timeline.corpus,
          borderColor: palette.segmentB,
          backgroundColor: areaFill.swp,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          label: labels.b,
          data: timeline.withdrawn,
          borderColor: lineGrey,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ]
      : [
        {
          label: labels.a,
          data: timeline.invested,
          borderColor: lineGrey,
          backgroundColor: 'transparent',
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          label: labels.b,
          data: timeline.total,
          borderColor: palette.segmentB,
          backgroundColor: areaFill[variant] || areaFill.lump,
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          label: labels.c,
          data: timeline.returns,
          borderColor: palette.segmentB,
          borderDash: [6, 4],
          backgroundColor: 'transparent',
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ];

  const data = { labels: timeline.labels, datasets };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: animDuration },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: tickColor, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (v) => formatCurrencyCompact(v),
          maxTicksLimit: 6,
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: palette.text,
          padding: 14,
          font: { size: 11, weight: '500' },
          usePointStyle: true,
          pointStyleWidth: 36,
          boxWidth: 0,
          boxHeight: 0,
          generateLabels: lineLegendLabels,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 12,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
  };

  if (existingChart) {
    existingChart.data = data;
    existingChart.options = options;
    existingChart.update(quickUpdate || prefersReducedMotion ? 'none' : 'default');
    return existingChart;
  }
  return new Chart(canvas, { type: 'line', data, options });
}

function refreshLineChart(calc, quick = false) {
  const timeline = lastTimeline[calc];
  if (!timeline) return;
  lineCharts[calc] = createLineChart(LINE_CANVAS[calc], CHART_VARIANT[calc], timeline, lineCharts[calc], quick);
}

function setChartView(calc, view) {
  chartViewModes[calc] = view;
  document.querySelectorAll(`.chart-view-btn[data-calc="${calc}"]`).forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.view === view ? 'true' : 'false');
  });
  document.querySelectorAll(`.chart-panel[data-calc="${calc}"]`).forEach((panel) => {
    const show = panel.dataset.view === view;
    panel.classList.toggle('hidden', !show);
  });
  requestAnimationFrame(() => {
    if (view === 'line') refreshLineChart(calc);
    else resizeChartsForTab(calc);
  });
}

function bindChartViewToggles() {
  document.querySelectorAll('.chart-view-btn').forEach((btn) => {
    btn.addEventListener('click', () => setChartView(btn.dataset.calc, btn.dataset.view));
  });
}

function updateCalcCharts(calc, pieArgs, timeline, quick = false) {
  lastTimeline[calc] = timeline;
  pieCharts[calc] = createDonutChart(
    PIE_CANVAS[calc],
    CHART_VARIANT[calc],
    pieArgs[0],
    pieArgs[1],
    pieCharts[calc],
    pieArgs[2],
    quick
  );
  if (chartViewModes[calc] === 'line') refreshLineChart(calc, quick);
}

function updateChartsTheme() {
  Object.keys(PIE_CANVAS).forEach((calc) => {
    const chart = pieCharts[calc];
    if (!chart) return;
    const [a, b] = chart.data.datasets[0].data;
    pieCharts[calc] = createDonutChart(PIE_CANVAS[calc], CHART_VARIANT[calc], a, b, chart, chart.data.labels);
    if (chartViewModes[calc] === 'line' && lastTimeline[calc]) refreshLineChart(calc);
  });
}

function getCompoundingValue(groupName) {
  return document.querySelector(`input[name="${groupName}"]:checked`)?.value || 'monthly';
}

function getInterestType() {
  return document.querySelector('input[name="interest-type"]:checked')?.value || 'simple';
}

function updateInterestCompoundingVisibility() {
  const wrap = document.getElementById('interest-compounding-wrap');
  wrap.classList.toggle('hidden', getInterestType() !== 'compound');
}

// ---------- calculateInterest ----------
function calculateInterest(principal, annualRatePercent, years, interestType, compounding) {
  const P = sanitizeNumber(principal, 0, 1e12, 0);
  const yearsSafe = sanitizeNumber(years, 0, 100, 0);
  const rate = sanitizeNumber(annualRatePercent, 0, 100, 0);

  if (interestType === 'simple') {
    const interest = (P * rate * yearsSafe) / 100;
    return {
      principal: P,
      interest: Math.max(0, interest),
      totalAmount: Math.max(0, P + interest),
    };
  }

  const lump = calculateLumpSum(P, rate, yearsSafe, compounding);
  return {
    principal: lump.investedAmount,
    interest: lump.estimatedReturns,
    totalAmount: lump.totalValue,
  };
}

function bindCompoundingRadios(groupName, onUpdate) {
  document.querySelectorAll(`input[name="${groupName}"]`).forEach((radio) => {
    radio.addEventListener('change', onUpdate);
  });
}

// ---------- Debounce (slider drag) ----------
function debounce(fn, ms) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.flush = (...args) => {
    clearTimeout(timer);
    fn(...args);
  };
  return debounced;
}

// ---------- Dual input binding ----------
function bindDualInput(numId, rangeId, fieldKey, onUpdate, min, max) {
  const numEl = document.getElementById(numId);
  const rangeEl = document.getElementById(rangeId);
  const fieldEl = document.querySelector(`[data-field="${fieldKey}"]`);

  function rangeAriaValue(val) {
    if (numId.includes('years')) return `${val} years`;
    if (numId.includes('return') || numId.includes('rate') || numId.includes('increase')) return `${val}%`;
    return formatCurrency(val);
  }

  const runUpdate = (quick) => onUpdate(quick);
  const debouncedUpdate = debounce(() => runUpdate(true), 64);

  function syncFromValue(raw, { quick = false, defer = false, silent = false, commit = false } = {}) {
    const val = sanitizeNumber(raw, min, max, min);
    // Only rewrite the text box when committing (blur/change) or syncing from the range.
    // While typing, keep the raw string so deleting digits (e.g. 10000 → 0000) is not forced to 0.
    if (commit) numEl.value = val;
    rangeEl.value = val;
    rangeEl.setAttribute('aria-valuenow', String(val));
    rangeEl.setAttribute('aria-valuetext', rangeAriaValue(val));
    if (fieldEl) fieldEl.classList.toggle('invalid', val < min || val > max);
    if (silent) return;
    if (defer) debouncedUpdate();
    else runUpdate(quick);
  }

  numEl.addEventListener('input', () => syncFromValue(numEl.value, { quick: true, defer: true }));
  numEl.addEventListener('change', () => {
    debouncedUpdate.flush();
    syncFromValue(numEl.value, { quick: false, commit: true });
  });
  numEl.addEventListener('blur', () => {
    syncFromValue(numEl.value, { quick: false, commit: true });
  });
  rangeEl.addEventListener('input', () => {
    syncFromValue(rangeEl.value, { quick: true, defer: true, commit: true });
  });
  rangeEl.addEventListener('change', () => {
    debouncedUpdate.flush();
    syncFromValue(rangeEl.value, { quick: false, commit: true });
  });
  syncFromValue(numEl.value, { quick: false, silent: suppressRecalc, commit: true });
}

// ---------- Recalculate ----------
function inputNumber(id) {
  return +document.getElementById(id).value || 0;
}

function getSipExistingCorpus() {
  const wrap = document.getElementById('sip-corpus-wrap');
  if (!wrap || wrap.hidden) return 0;
  return inputNumber('sip-corpus-num') || 0;
}

function setSipCorpusVisible(visible) {
  const wrap = document.getElementById('sip-corpus-wrap');
  const toggle = document.getElementById('sip-corpus-toggle');
  const numEl = document.getElementById('sip-corpus-num');
  const rangeEl = document.getElementById('sip-corpus-range');
  wrap.hidden = !visible;
  wrap.classList.toggle('hidden', !visible);
  toggle.textContent = visible ? 'Remove existing investment' : 'Add existing investment';
  if (!visible) {
    numEl.value = 0;
    rangeEl.value = 0;
  }
}

function recalcSIP(quick = false) {
  const corpus = getSipExistingCorpus();
  const monthly = inputNumber('sip-monthly-num');
  const rate = inputNumber('sip-return-num');
  const stepUp = inputNumber('sip-stepup-num');
  const years = inputNumber('sip-years-num');
  const compounding = getCompoundingValue('sip-compounding');
  const result = calculateSIP(monthly, rate, years, compounding, stepUp, corpus);
  setCurrencyDisplay(document.getElementById('sip-total'), result.totalValue);
  setInflationAdjustedInput('sip', result.totalValue, years);
  updateInflationAdjustedDisplays();
  setCurrencyDisplay(document.getElementById('sip-invested'), result.investedAmount);
  setCurrencyDisplay(document.getElementById('sip-returns'), result.estimatedReturns);
  updateCalcCharts('sip', [result.investedAmount, result.estimatedReturns], projectSIPTimeline(monthly, rate, years, compounding, stepUp, corpus), quick);
}

function recalcLumpSum(quick = false) {
  const amount = inputNumber('lump-amount-num');
  const rate = inputNumber('lump-return-num');
  const years = inputNumber('lump-years-num');
  const compounding = getCompoundingValue('lump-compounding');
  const result = calculateLumpSum(amount, rate, years, compounding);
  setCurrencyDisplay(document.getElementById('lump-total'), result.totalValue);
  setInflationAdjustedInput('lumpsum', result.totalValue, years);
  updateInflationAdjustedDisplays();
  setCurrencyDisplay(document.getElementById('lump-invested'), result.investedAmount);
  setCurrencyDisplay(document.getElementById('lump-returns'), result.estimatedReturns);
  updateCalcCharts('lumpsum', [result.investedAmount, result.estimatedReturns], projectLumpSumTimeline(amount, rate, years, compounding), quick);
}

function recalcSWP(quick = false) {
  const corpus = inputNumber('swp-corpus-num');
  const withdraw = inputNumber('swp-withdraw-num');
  const rate = inputNumber('swp-return-num');
  const increase = inputNumber('swp-increase-num');
  const years = inputNumber('swp-years-num');
  const compounding = getCompoundingValue('swp-compounding');
  const result = calculateSWP(corpus, withdraw, rate, increase, years, compounding);

  setCurrencyDisplay(document.getElementById('swp-remaining-hero'), result.remainingCorpus);
  setInflationAdjustedInput('swp', result.remainingCorpus, years);
  updateInflationAdjustedDisplays();
  setCurrencyDisplay(document.getElementById('swp-initial'), corpus);
  setCurrencyDisplay(document.getElementById('swp-total-withdrawn'), result.totalWithdrawn);
  setCurrencyDisplay(document.getElementById('swp-total-value'), result.remainingCorpus + result.totalWithdrawn);
  setCurrencyDisplay(document.getElementById('swp-ending-withdrawal'), result.endingMonthlyWithdrawal);
  updateCalcCharts('swp', [result.totalWithdrawn, result.remainingCorpus, CHART_LABELS.swp.donut], projectSWPTimeline(corpus, withdraw, rate, increase, years, compounding), quick);
}

function recalcInterest(quick = false) {
  const principal = inputNumber('int-principal-num');
  const rate = inputNumber('int-rate-num');
  const years = inputNumber('int-years-num');
  const interestType = getInterestType();
  const compounding = getCompoundingValue('interest-compounding');
  const result = calculateInterest(principal, rate, years, interestType, compounding);
  setCurrencyDisplay(document.getElementById('int-total'), result.totalAmount);
  setInflationAdjustedInput('interest', result.totalAmount, years);
  updateInflationAdjustedDisplays();
  setCurrencyDisplay(document.getElementById('int-principal'), result.principal);
  setCurrencyDisplay(document.getElementById('int-interest'), result.interest);
  updateCalcCharts('interest', [result.principal, result.interest, CHART_LABELS.interest.donut], projectInterestTimeline(principal, rate, years, interestType, compounding), quick);
}

// ---------- Init inputs ----------
suppressRecalc = true;
bindDualInput('sip-corpus-num', 'sip-corpus-range', 'sip-corpus', recalcSIP, 0, 100000000);
bindDualInput('sip-monthly-num', 'sip-monthly-range', 'sip-monthly', recalcSIP, 0, 1000000);

document.getElementById('sip-corpus-toggle').addEventListener('click', () => {
  const wrap = document.getElementById('sip-corpus-wrap');
  const showing = wrap.hidden;
  setSipCorpusVisible(showing);
  if (showing) document.getElementById('sip-corpus-num').focus();
  recalcSIP();
});
bindDualInput('sip-return-num', 'sip-return-range', 'sip-return', recalcSIP, 0, 24);
bindDualInput('sip-stepup-num', 'sip-stepup-range', 'sip-stepup', recalcSIP, 0, 50);
bindDualInput('sip-years-num', 'sip-years-range', 'sip-years', recalcSIP, 1, 100);

bindDualInput('lump-amount-num', 'lump-amount-range', 'lump-amount', recalcLumpSum, 0, 100000000);
bindDualInput('lump-return-num', 'lump-return-range', 'lump-return', recalcLumpSum, 0, 24);
bindDualInput('lump-years-num', 'lump-years-range', 'lump-years', recalcLumpSum, 1, 100);

bindDualInput('swp-corpus-num', 'swp-corpus-range', 'swp-corpus', recalcSWP, 0, 100000000);
bindDualInput('swp-withdraw-num', 'swp-withdraw-range', 'swp-withdraw', recalcSWP, 0, 1000000);
bindDualInput('swp-return-num', 'swp-return-range', 'swp-return', recalcSWP, 0, 24);
bindDualInput('swp-increase-num', 'swp-increase-range', 'swp-increase', recalcSWP, 0, 50);
bindDualInput('swp-years-num', 'swp-years-range', 'swp-years', recalcSWP, 1, 100);

bindCompoundingRadios('sip-compounding', recalcSIP);
bindCompoundingRadios('lump-compounding', recalcLumpSum);
bindCompoundingRadios('swp-compounding', recalcSWP);
bindCompoundingRadios('interest-compounding', recalcInterest);

document.querySelectorAll('input[name="interest-type"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    updateInterestCompoundingVisibility();
    recalcInterest();
  });
});

bindDualInput('int-principal-num', 'int-principal-range', 'int-principal', recalcInterest, 0, 10000000);
bindDualInput('int-rate-num', 'int-rate-range', 'int-rate', recalcInterest, 0, 60);
bindDualInput('int-years-num', 'int-years-range', 'int-years', recalcInterest, 1, 100);

updateInterestCompoundingVisibility();
bindChartViewToggles();
initInflationRateSelects();

const initialTab = resolveTabFromHash() || localStorage.getItem('mf-calc-tab') || 'sip';
const activeTab = TAB_ORDER.includes(initialTab) ? initialTab : 'sip';
suppressRecalc = false;
setActiveTab(activeTab, { persist: false });
if (!location.hash) {
  history.replaceState(null, '', `#${activeTab}`);
}
