/* ============================================================
   Expense & Budget Visualizer — app.js
   All logic: LocalStorage, form validation, pie chart (Chart.js),
   sort, spending limit, dark/light mode toggle.
   ============================================================ */

'use strict';

/* ── Constants ── */
const STORAGE_KEY       = 'evb_transactions';
const LIMIT_STORAGE_KEY = 'evb_spending_limit';
const THEME_STORAGE_KEY = 'evb_theme';

const CATEGORY_COLORS = {
  Food:      '#f97316',
  Transport: '#3b82f6',
  Fun:       '#a855f7',
};

const CATEGORY_EMOJIS = {
  Food:      '🍔',
  Transport: '🚗',
  Fun:       '🎉',
};

/* ── State ── */
let transactions  = [];   // { id, name, amount, category, createdAt }
let spendingLimit = null; // number | null
let chart         = null; // Chart.js instance

/* ── DOM references ── */
const form            = document.getElementById('transactionForm');
const nameInput       = document.getElementById('itemName');
const amountInput     = document.getElementById('itemAmount');
const categorySelect  = document.getElementById('itemCategory');
const nameError       = document.getElementById('nameError');
const amountError     = document.getElementById('amountError');
const categoryError   = document.getElementById('categoryError');
const totalBalanceEl  = document.getElementById('totalBalance');
const transactionList = document.getElementById('transactionList');
const emptyState      = document.getElementById('emptyState');
const sortSelect      = document.getElementById('sortSelect');
const limitInput      = document.getElementById('limitInput');
const setLimitBtn     = document.getElementById('setLimitBtn');
const clearLimitBtn   = document.getElementById('clearLimitBtn');
const limitDisplay    = document.getElementById('limitDisplay');
const limitBanner     = document.getElementById('limitBanner');
const chartCanvas     = document.getElementById('expenseChart');
const chartEmpty      = document.getElementById('chartEmpty');
const categoryLegend  = document.getElementById('categoryLegend');
const themeToggle     = document.getElementById('themeToggle');
const themeIcon       = document.getElementById('themeIcon');

/* ══════════════════════════════════════════════
   LOCALSTROAGE HELPERS
   ══════════════════════════════════════════════ */

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadTransactions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    transactions = stored ? JSON.parse(stored) : [];
  } catch {
    transactions = [];
  }
}

function saveLimit() {
  if (spendingLimit === null) {
    localStorage.removeItem(LIMIT_STORAGE_KEY);
  } else {
    localStorage.setItem(LIMIT_STORAGE_KEY, String(spendingLimit));
  }
}

function loadLimit() {
  const stored = localStorage.getItem(LIMIT_STORAGE_KEY);
  spendingLimit = stored ? parseFloat(stored) : null;
}

function saveTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function loadTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
}

/* ══════════════════════════════════════════════
   THEME TOGGLE
   ══════════════════════════════════════════════ */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');

  // Rebuild chart with updated colors if it exists
  if (chart) {
    updateChart();
  }
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveTheme(next);
});

/* ══════════════════════════════════════════════
   FORM VALIDATION
   ══════════════════════════════════════════════ */

function clearErrors() {
  nameError.textContent     = '';
  amountError.textContent   = '';
  categoryError.textContent = '';
  nameInput.classList.remove('invalid');
  amountInput.classList.remove('invalid');
  categorySelect.classList.remove('invalid');
}

function validateForm() {
  clearErrors();
  let valid = true;

  const name     = nameInput.value.trim();
  const amount   = parseFloat(amountInput.value);
  const category = categorySelect.value;

  if (!name) {
    nameError.textContent = 'Item name is required.';
    nameInput.classList.add('invalid');
    valid = false;
  } else if (name.length < 2) {
    nameError.textContent = 'Name must be at least 2 characters.';
    nameInput.classList.add('invalid');
    valid = false;
  }

  if (!amountInput.value.trim()) {
    amountError.textContent = 'Amount is required.';
    amountInput.classList.add('invalid');
    valid = false;
  } else if (isNaN(amount) || amount <= 0) {
    amountError.textContent = 'Enter a valid amount greater than 0.';
    amountInput.classList.add('invalid');
    valid = false;
  }

  if (!category) {
    categoryError.textContent = 'Please select a category.';
    categorySelect.classList.add('invalid');
    valid = false;
  }

  return valid;
}

/* ══════════════════════════════════════════════
   TRANSACTIONS: ADD & DELETE
   ══════════════════════════════════════════════ */

function addTransaction(name, amount, category) {
  const tx = {
    id:        crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
    name,
    amount,
    category,
    createdAt: Date.now(),
  };
  transactions.push(tx);
  saveTransactions();
}

function deleteTransaction(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveTransactions();
}

/* ══════════════════════════════════════════════
   TOTAL BALANCE
   ══════════════════════════════════════════════ */

function getTotalSpent() {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

function updateBalanceDisplay() {
  totalBalanceEl.textContent = formatRupiah(getTotalSpent());
}

/* ══════════════════════════════════════════════
   SPENDING LIMIT
   ══════════════════════════════════════════════ */

function updateLimitUI() {
  if (spendingLimit !== null) {
    limitDisplay.textContent = `Current limit: ${formatRupiah(spendingLimit)}`;
    limitInput.value = spendingLimit;
  } else {
    limitDisplay.textContent = 'No limit set.';
    limitInput.value = '';
  }
}

function updateLimitBanner() {
  const total = getTotalSpent();

  if (spendingLimit === null || total === 0) {
    limitBanner.classList.remove('visible', 'over-limit');
    limitBanner.textContent = '';
    return;
  }

  const pct = (total / spendingLimit) * 100;

  if (pct >= 100) {
    limitBanner.classList.add('visible', 'over-limit');
    limitBanner.innerHTML = `⛔ You've exceeded your spending limit! Spent ${formatRupiah(total)} of ${formatRupiah(spendingLimit)}.`;
  } else if (pct >= 80) {
    limitBanner.classList.add('visible');
    limitBanner.classList.remove('over-limit');
    limitBanner.innerHTML = `⚠️ Heads up — you've used ${pct.toFixed(0)}% of your spending limit (${formatRupiah(total)} / ${formatRupiah(spendingLimit)}).`;
  } else {
    limitBanner.classList.remove('visible', 'over-limit');
    limitBanner.textContent = '';
  }
}

setLimitBtn.addEventListener('click', () => {
  const val = parseFloat(limitInput.value);
  if (isNaN(val) || val <= 0) {
    limitDisplay.textContent = '⚠️ Enter a valid positive number.';
    return;
  }
  spendingLimit = val;
  saveLimit();
  updateLimitUI();
  updateLimitBanner();
  renderList();
});

clearLimitBtn.addEventListener('click', () => {
  spendingLimit = null;
  saveLimit();
  updateLimitUI();
  updateLimitBanner();
  renderList();
});

/* ══════════════════════════════════════════════
   SORTING
   ══════════════════════════════════════════════ */

function getSortedTransactions() {
  const mode = sortSelect.value;
  const copy = [...transactions];

  switch (mode) {
    case 'amount-asc':
      return copy.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':
      return copy.sort((a, b) => b.amount - a.amount);
    case 'category':
      return copy.sort((a, b) => a.category.localeCompare(b.category));
    default: // 'default' = date added (newest first)
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/* ══════════════════════════════════════════════
   RENDER TRANSACTION LIST
   ══════════════════════════════════════════════ */

function renderList() {
  const sorted = getSortedTransactions();
  transactionList.innerHTML = '';

  if (sorted.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  sorted.forEach(tx => {
    const isOver = spendingLimit !== null && tx.amount > spendingLimit;

    const li = document.createElement('li');
    li.className = 'transaction-item' + (isOver ? ' over-limit' : '');
    li.dataset.id = tx.id;

    li.innerHTML = `
      <span class="category-dot dot-${tx.category.toLowerCase()}" aria-hidden="true"></span>
      <div class="item-info">
        <div class="item-name" title="${escapeHtml(tx.name)}">${escapeHtml(tx.name)}</div>
        <div class="item-meta">${CATEGORY_EMOJIS[tx.category]} ${tx.category}${isOver ? ' · ⚠️ over limit' : ''}</div>
      </div>
      <span class="item-amount">${formatRupiah(tx.amount)}</span>
      <button class="delete-btn" data-id="${tx.id}" aria-label="Delete ${escapeHtml(tx.name)}">✕</button>
    `;

    transactionList.appendChild(li);
  });
}

/* ══════════════════════════════════════════════
   PIE CHART (Chart.js)
   ══════════════════════════════════════════════ */

function getCategoryTotals() {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach(tx => {
    if (totals[tx.category] !== undefined) totals[tx.category] += tx.amount;
  });
  return totals;
}

function updateChart() {
  const totals     = getCategoryTotals();
  const categories = Object.keys(totals).filter(c => totals[c] > 0);
  const amounts    = categories.map(c => totals[c]);
  const colors     = categories.map(c => CATEGORY_COLORS[c]);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const legendColor = isDark ? '#9299ae' : '#5a6074';

  if (categories.length === 0) {
    chartEmpty.classList.add('visible');
    chartCanvas.style.display = 'none';
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  chartEmpty.classList.remove('visible');
  chartCanvas.style.display = 'block';

  const data = {
    labels:   categories,
    datasets: [{
      data:            amounts,
      backgroundColor: colors,
      borderColor:     isDark ? '#1a1d2e' : '#ffffff',
      borderWidth:     3,
      hoverOffset:     8,
    }],
  };

  const options = {
    responsive:          true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display:  true,
        position: 'bottom',
        labels: {
          color:    legendColor,
          font:     { size: 13, weight: '600' },
          padding:  16,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const val   = ctx.parsed;
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct   = ((val / total) * 100).toFixed(1);
            return ` ${formatRupiah(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (chart) {
    chart.data    = data;
    chart.options = options;
    chart.update();
  } else {
    chart = new Chart(chartCanvas, { type: 'pie', data, options });
  }
}

/* ══════════════════════════════════════════════
   CATEGORY LEGEND / TOTALS
   ══════════════════════════════════════════════ */

function updateLegend() {
  const totals   = getCategoryTotals();
  const total    = Object.values(totals).reduce((a, b) => a + b, 0);
  const cats     = Object.keys(totals).filter(c => totals[c] > 0);

  categoryLegend.innerHTML = '';

  if (cats.length === 0) {
    categoryLegend.innerHTML = '<li class="legend-empty">No data yet.</li>';
    return;
  }

  cats.forEach(cat => {
    const pct = total > 0 ? (totals[cat] / total) * 100 : 0;
    const li  = document.createElement('li');
    li.className = 'legend-item';
    li.innerHTML = `
      <span class="legend-dot" style="background:${CATEGORY_COLORS[cat]}"></span>
      <div class="legend-info">
        <div class="legend-name">${CATEGORY_EMOJIS[cat]} ${cat}</div>
        <div class="legend-bar-wrap">
          <div class="legend-bar" style="width:${pct.toFixed(1)}%;background:${CATEGORY_COLORS[cat]}"></div>
        </div>
      </div>
      <span class="legend-amount">${formatRupiah(totals[cat])}</span>
    `;
    categoryLegend.appendChild(li);
  });
}

/* ══════════════════════════════════════════════
   FULL UI REFRESH (called after every state change)
   ══════════════════════════════════════════════ */

function refreshUI() {
  updateBalanceDisplay();
  updateLimitBanner();
  renderList();
  updateChart();
  updateLegend();
}

/* ══════════════════════════════════════════════
   EVENT LISTENERS
   ══════════════════════════════════════════════ */

// Form submit — add transaction
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;

  const name     = nameInput.value.trim();
  const amount   = parseFloat(amountInput.value);
  const category = categorySelect.value;

  addTransaction(name, amount, category);

  // Reset form
  form.reset();
  clearErrors();
  nameInput.focus();

  refreshUI();
});

// Delete transaction (event delegation on the list)
transactionList.addEventListener('click', e => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  deleteTransaction(id);
  refreshUI();
});

// Sort change
sortSelect.addEventListener('change', () => {
  renderList();
});

// Clear validation styling on input
[nameInput, amountInput, categorySelect].forEach(el => {
  el.addEventListener('input', () => {
    el.classList.remove('invalid');
    // Clear the corresponding error
    if (el === nameInput)      nameError.textContent     = '';
    if (el === amountInput)    amountError.textContent   = '';
    if (el === categorySelect) categoryError.textContent = '';
  });
});

/* ══════════════════════════════════════════════
   UTILITY FUNCTIONS
   ══════════════════════════════════════════════ */

function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ══════════════════════════════════════════════
   BOOT / INIT
   ══════════════════════════════════════════════ */

function init() {
  // Restore theme first to avoid flash
  const savedTheme = loadTheme();
  applyTheme(savedTheme);

  // Load persisted data
  loadTransactions();
  loadLimit();

  // Restore limit input display
  updateLimitUI();

  // Render everything
  refreshUI();
}

init();
