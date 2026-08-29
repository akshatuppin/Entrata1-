/**
 * Smart Split Bill & Fair Penny Calculator
 * Enhanced with comprehensive edge case handling:
 * - Minimum party size validation (>= 1)
 * - Bill subtotal > 0 validation and zero-state banners
 * - Non-negative clamp on tip/tax/bill
 * - Micro-bill remainder cents distribution (e.g. $0.05 / 10 people)
 * - Floating point integer cent precision
 * - Corrupted localStorage self-healing
 * - Safe clipboard copy with legacy fallback
 * - Non-blocking custom toast notification system
 */

// State Object
const state = {
  currency: '$',
  billAmount: 100.0,
  tipPercent: 15.0,
  taxPercent: 8.5,
  partySize: 3,
  roundingMode: 'exact', // 'exact' or 'roundUpDollar'
  note: '',
  historySearchQuery: '',
  history: []
};

// DOM Element Selectors
const elements = {
  currencySelect: document.getElementById('currencySelect'),
  billCurrencySymbol: document.getElementById('billCurrencySymbol'),
  heroCurrencySymbol: document.getElementById('heroCurrencySymbol'),
  toastContainer: document.getElementById('toastContainer'),
  inputStatusBadge: document.getElementById('inputStatusBadge'),
  
  // Inputs & Validation
  billGroup: document.getElementById('billGroup'),
  billAmount: document.getElementById('billAmount'),
  billValidationMsg: document.getElementById('billValidationMsg'),
  clearBillBtn: document.getElementById('clearBillBtn'),
  
  tipInput: document.getElementById('tipInput'),
  tipSlider: document.getElementById('tipSlider'),
  tipChips: document.querySelectorAll('#tipChips .chip'),
  
  taxInput: document.getElementById('taxInput'),
  taxSlider: document.getElementById('taxSlider'),
  taxChips: document.querySelectorAll('#taxChips .chip'),
  
  peopleGroup: document.getElementById('peopleGroup'),
  peopleInput: document.getElementById('peopleInput'),
  peopleValidationMsg: document.getElementById('peopleValidationMsg'),
  peopleSlider: document.getElementById('peopleSlider'),
  decreasePeopleBtn: document.getElementById('decreasePeopleBtn'),
  increasePeopleBtn: document.getElementById('increasePeopleBtn'),
  
  roundingRadios: document.querySelectorAll('input[name="roundingMode"]'),
  billNote: document.getElementById('billNote'),
  
  // Outputs & Banners
  zeroStateBanner: document.getElementById('zeroStateBanner'),
  perPersonAmount: document.getElementById('perPersonAmount'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  displaySubtotal: document.getElementById('displaySubtotal'),
  displayTaxRate: document.getElementById('displayTaxRate'),
  displayTaxAmount: document.getElementById('displayTaxAmount'),
  displayTipRate: document.getElementById('displayTipRate'),
  displayTipAmount: document.getElementById('displayTipAmount'),
  displayGrandTotal: document.getElementById('displayGrandTotal'),
  
  // Rounding Inspector
  roundingDetails: document.getElementById('roundingDetails'),
  individualPayersGrid: document.getElementById('individualPayersGrid'),
  
  // Actions
  saveHistoryBtn: document.getElementById('saveHistoryBtn'),
  copySummaryBtn: document.getElementById('copySummaryBtn'),
  resetBtn: document.getElementById('resetBtn'),
  
  // History
  historyCountBadge: document.getElementById('historyCountBadge'),
  historySearchInput: document.getElementById('historySearchInput'),
  exportHistoryBtn: document.getElementById('exportHistoryBtn'),
  clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
  historyList: document.getElementById('historyList'),
  emptyHistoryState: document.getElementById('emptyHistoryState')
};

// --- Initialization ---
function init() {
  loadHistoryFromStorage();
  attachEventListeners();
  syncAllInputs();
  calculateAndRender();
}

// --- Toast Notification System ---
function showToast(message, type = 'info', duration = 3000) {
  if (!elements.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠️' : type === 'danger' ? '✕' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- Local Storage Management with Self-Healing Recovery ---
const STORAGE_KEY = 'split_bill_history';

function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state.history = [];
    } else {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Validate each item structure
        state.history = parsed.filter(item => item && typeof item === 'object' && item.id && item.grandTotal !== undefined);
      } else {
        state.history = [];
      }
    }
  } catch (e) {
    console.warn('Corrupted history detected in localStorage. Resetting cleanly.', e);
    state.history = [];
    localStorage.removeItem(STORAGE_KEY);
  }
  renderHistoryList();
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  } catch (e) {
    console.error('Error saving history to localStorage:', e);
    showToast('Failed to save history: Storage quota exceeded or disabled.', 'danger');
  }
}

// --- Event Listeners & Bidirectional Sync ---
function attachEventListeners() {
  // Currency Selector
  elements.currencySelect.addEventListener('change', (e) => {
    state.currency = e.target.value;
    elements.billCurrencySymbol.textContent = state.currency;
    elements.heroCurrencySymbol.textContent = state.currency;
    calculateAndRender();
  });

  // Bill Amount Input Handling with Sanitization
  elements.billAmount.addEventListener('input', (e) => {
    let rawVal = parseFloat(e.target.value);
    if (isNaN(rawVal)) rawVal = 0;
    
    // Negative number protection
    if (rawVal < 0) {
      rawVal = 0;
      elements.billAmount.value = '0.00';
      showToast('Bill subtotal cannot be negative.', 'warning');
    }
    
    // Upper boundary protection ($100 million)
    if (rawVal > 100000000) {
      rawVal = 100000000;
      elements.billAmount.value = '100000000';
      showToast('Maximum bill amount reached ($100M).', 'warning');
    }

    state.billAmount = rawVal;
    validateInputs();
    calculateAndRender();
  });

  elements.clearBillBtn.addEventListener('click', () => {
    state.billAmount = 0;
    elements.billAmount.value = '';
    elements.billAmount.focus();
    validateInputs();
    calculateAndRender();
  });

  // Tip Percentage Sync
  elements.tipSlider.addEventListener('input', (e) => {
    const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
    state.tipPercent = val;
    elements.tipInput.value = val;
    updateChipActiveState(elements.tipChips, val, 'tip');
    calculateAndRender();
  });

  elements.tipInput.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 500) val = 500; // Cap tip at 500%
    state.tipPercent = val;
    elements.tipSlider.value = Math.min(50, val);
    updateChipActiveState(elements.tipChips, val, 'tip');
    calculateAndRender();
  });

  elements.tipChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const tipVal = parseFloat(chip.getAttribute('data-tip')) || 0;
      state.tipPercent = tipVal;
      elements.tipInput.value = tipVal;
      elements.tipSlider.value = Math.min(50, tipVal);
      updateChipActiveState(elements.tipChips, tipVal, 'tip');
      calculateAndRender();
    });
  });

  // Tax Percentage Sync
  elements.taxSlider.addEventListener('input', (e) => {
    const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
    state.taxPercent = val;
    elements.taxInput.value = val;
    updateChipActiveState(elements.taxChips, val, 'tax');
    calculateAndRender();
  });

  elements.taxInput.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100) val = 100; // Tax capped at 100%
    state.taxPercent = val;
    elements.taxSlider.value = Math.min(30, val);
    updateChipActiveState(elements.taxChips, val, 'tax');
    calculateAndRender();
  });

  elements.taxChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const taxVal = parseFloat(chip.getAttribute('data-tax')) || 0;
      state.taxPercent = taxVal;
      elements.taxInput.value = taxVal;
      elements.taxSlider.value = Math.min(30, taxVal);
      updateChipActiveState(elements.taxChips, taxVal, 'tax');
      calculateAndRender();
    });
  });

  // Party Size Steppers & Slider with strict Minimum of 1
  elements.decreasePeopleBtn.addEventListener('click', () => {
    if (state.partySize > 1) {
      state.partySize--;
      syncPeopleControls();
      validateInputs();
      calculateAndRender();
    } else {
      showToast('Party size must be at least 1 person.', 'warning');
    }
  });

  elements.increasePeopleBtn.addEventListener('click', () => {
    if (state.partySize < 500) {
      state.partySize++;
      syncPeopleControls();
      validateInputs();
      calculateAndRender();
    }
  });

  elements.peopleSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    state.partySize = Math.max(1, Math.min(500, val));
    elements.peopleInput.value = state.partySize;
    validateInputs();
    calculateAndRender();
  });

  elements.peopleInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      state.partySize = 1;
      elements.peopleValidationMsg.textContent = 'Minimum 1 person required. Defaulted to 1.';
      elements.peopleValidationMsg.classList.add('visible');
    } else {
      state.partySize = Math.min(500, val);
      elements.peopleValidationMsg.classList.remove('visible');
    }
    elements.peopleSlider.value = Math.min(30, state.partySize);
    calculateAndRender();
  });

  // Rounding Mode Toggle
  elements.roundingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.roundingMode = e.target.value;
      calculateAndRender();
    });
  });

  // Note Input with Maxlength
  elements.billNote.addEventListener('input', (e) => {
    state.note = e.target.value.substring(0, 60);
  });

  // History Search & Filter
  if (elements.historySearchInput) {
    elements.historySearchInput.addEventListener('input', (e) => {
      state.historySearchQuery = e.target.value.toLowerCase().trim();
      renderHistoryList();
    });
  }

  // Export History
  if (elements.exportHistoryBtn) {
    elements.exportHistoryBtn.addEventListener('click', handleExportHistory);
  }

  // Action Buttons
  elements.saveHistoryBtn.addEventListener('click', handleSaveToHistory);
  elements.copySummaryBtn.addEventListener('click', handleCopySummary);
  elements.resetBtn.addEventListener('click', handleReset);
  elements.clearAllHistoryBtn.addEventListener('click', handleClearAllHistory);
}

// --- Validation Logic ---
function validateInputs() {
  const isZeroBill = state.billAmount <= 0;
  if (isZeroBill) {
    elements.zeroStateBanner.style.display = 'block';
    elements.saveHistoryBtn.disabled = true;
    elements.saveHistoryBtn.classList.add('disabled');
    elements.inputStatusBadge.textContent = 'Bill is $0';
    elements.inputStatusBadge.className = 'badge-status warning';
  } else {
    elements.zeroStateBanner.style.display = 'none';
    elements.saveHistoryBtn.disabled = false;
    elements.saveHistoryBtn.classList.remove('disabled');
    elements.inputStatusBadge.textContent = 'Active';
    elements.inputStatusBadge.className = 'badge-status';
  }
}

function syncPeopleControls() {
  elements.peopleInput.value = state.partySize;
  elements.peopleSlider.value = Math.min(30, state.partySize);
}

function syncAllInputs() {
  elements.billAmount.value = state.billAmount > 0 ? state.billAmount.toFixed(2) : '';
  elements.tipInput.value = state.tipPercent;
  elements.tipSlider.value = Math.min(50, state.tipPercent);
  elements.taxInput.value = state.taxPercent;
  elements.taxSlider.value = Math.min(30, state.taxPercent);
  syncPeopleControls();
  elements.billNote.value = state.note;
  
  elements.roundingRadios.forEach(radio => {
    radio.checked = radio.value === state.roundingMode;
  });

  updateChipActiveState(elements.tipChips, state.tipPercent, 'tip');
  updateChipActiveState(elements.taxChips, state.taxPercent, 'tax');
  validateInputs();
}

function updateChipActiveState(chips, value, attr) {
  chips.forEach(chip => {
    const chipVal = parseFloat(chip.getAttribute(`data-${attr}`));
    if (chipVal === value) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

// --- Core Calculation & Rounding Engine with Integer Cent Precision ---
function calculateAndRender() {
  const bill = Math.max(0, state.billAmount || 0);
  const tipPercent = Math.max(0, state.tipPercent || 0);
  const taxPercent = Math.max(0, state.taxPercent || 0);
  const partySize = Math.max(1, state.partySize || 1);

  // Exact Tax and Tip calculations
  const taxAmount = bill * (taxPercent / 100);
  let tipAmount = bill * (tipPercent / 100);
  let grandTotalRaw = bill + taxAmount + tipAmount;
  let totalCents = Math.round(grandTotalRaw * 100);

  // If Round Up Whole Dollar mode is active
  if (state.roundingMode === 'roundUpDollar' && partySize > 0 && totalCents > 0) {
    const rawPerPersonCents = totalCents / partySize;
    const roundedUpPerPersonCents = Math.ceil(rawPerPersonCents / 100) * 100;
    const newTotalCents = roundedUpPerPersonCents * partySize;
    const extraTipCents = newTotalCents - totalCents;
    
    totalCents = newTotalCents;
    tipAmount += (extraTipCents / 100);
    grandTotalRaw = newTotalCents / 100;
  }

  const grandTotal = totalCents / 100;
  const baseCentsPerPerson = Math.floor(totalCents / partySize);
  const remainderCents = totalCents % partySize;

  const baseShare = baseCentsPerPerson / 100;
  const higherShare = (baseCentsPerPerson + 1) / 100;

  // Render Display Values
  elements.displaySubtotal.textContent = `${state.currency}${bill.toFixed(2)}`;
  elements.displayTaxRate.textContent = taxPercent.toString();
  elements.displayTaxAmount.textContent = `${state.currency}${taxAmount.toFixed(2)}`;
  elements.displayTipRate.textContent = tipPercent.toString();
  elements.displayTipAmount.textContent = `${state.currency}${tipAmount.toFixed(2)}`;
  elements.displayGrandTotal.textContent = `${state.currency}${grandTotal.toFixed(2)}`;

  // Hero Display: Handle 0 bill or non-zero bill
  if (bill === 0) {
    elements.perPersonAmount.textContent = '0.00';
    elements.heroSubtitle.textContent = `Enter a bill amount to calculate split`;
  } else if (partySize === 1) {
    elements.perPersonAmount.textContent = grandTotal.toFixed(2);
    elements.heroSubtitle.textContent = `Single payer (100% of total)`;
  } else if (remainderCents === 0) {
    elements.perPersonAmount.textContent = baseShare.toFixed(2);
    elements.heroSubtitle.textContent = `Split evenly among ${partySize} people`;
  } else {
    elements.perPersonAmount.textContent = higherShare.toFixed(2);
    elements.heroSubtitle.textContent = `${remainderCents} ${remainderCents === 1 ? 'person pays' : 'people pay'} ${state.currency}${higherShare.toFixed(2)} & ${partySize - remainderCents} pay ${state.currency}${baseShare.toFixed(2)}`;
  }

  // Render Rounding Explanation & Individual Payer Grid
  renderRoundingExplanation(bill, grandTotal, partySize, baseShare, higherShare, remainderCents);
}

function renderRoundingExplanation(bill, grandTotal, partySize, baseShare, higherShare, remainderCents) {
  if (bill <= 0) {
    elements.roundingDetails.innerHTML = `<p>Waiting for bill subtotal. Enter an amount above ${state.currency}0.00.</p>`;
    elements.individualPayersGrid.innerHTML = '';
    return;
  }

  if (partySize === 1) {
    elements.roundingDetails.innerHTML = `
      <p>Single payer: Full bill of <strong>${state.currency}${grandTotal.toFixed(2)}</strong>.</p>
      <div class="rounding-badge">✓ Exact match (no split discrepancy)</div>
    `;
    elements.individualPayersGrid.innerHTML = '';
    return;
  }

  const rawPerPerson = (grandTotal / partySize).toFixed(4);

  if (state.roundingMode === 'roundUpDollar') {
    elements.roundingDetails.innerHTML = `
      <p>Convenience Round Up: Each person pays <strong>${state.currency}${baseShare.toFixed(2)}</strong>.</p>
      <div class="rounding-badge">✨ Whole-dollar split with surplus added to tip</div>
    `;
  } else if (remainderCents === 0) {
    elements.roundingDetails.innerHTML = `
      <p>Exact division: <strong>${state.currency}${grandTotal.toFixed(2)} ÷ ${partySize} = ${state.currency}${baseShare.toFixed(2)}</strong> per person.</p>
      <div class="rounding-badge">✓ Perfect Even Split (0¢ discrepancy)</div>
    `;
  } else {
    const countHigher = remainderCents;
    const countBase = partySize - remainderCents;
    elements.roundingDetails.innerHTML = `
      <p>Raw division: <code>${state.currency}${grandTotal.toFixed(2)} ÷ ${partySize} = ${state.currency}${rawPerPerson}...</code></p>
      <p style="margin-top: 0.35rem;">
        <strong>Fair Penny Allocation:</strong><br>
        • <strong>${countHigher}</strong> ${countHigher === 1 ? 'person pays' : 'people pay'}: <strong>${state.currency}${higherShare.toFixed(2)}</strong><br>
        • <strong>${countBase}</strong> ${countBase === 1 ? 'person pays' : 'people pay'}: <strong>${state.currency}${baseShare.toFixed(2)}</strong>
      </p>
      <div class="rounding-badge">⚖️ Sums exactly to ${state.currency}${grandTotal.toFixed(2)} with 0 lost cents</div>
    `;
  }

  // Render individual payer badges for up to 12 people to prevent UI clutter
  if (partySize <= 12) {
    let html = '';
    for (let i = 1; i <= partySize; i++) {
      const isExtra = (i <= remainderCents);
      const amount = isExtra ? higherShare : baseShare;
      html += `
        <div class="payer-pill ${isExtra ? 'extra-cent' : ''}">
          <span>Person ${i}:</span>
          <strong>${state.currency}${amount.toFixed(2)}</strong>
          ${isExtra ? '<span>(+1¢)</span>' : ''}
        </div>
      `;
    }
    elements.individualPayersGrid.innerHTML = html;
    elements.individualPayersGrid.style.display = 'flex';
  } else {
    elements.individualPayersGrid.innerHTML = `
      <div class="payer-pill" style="width: 100%; justify-content: center;">
        <span>👥 Large party (${partySize} people): Summary shown above</span>
      </div>
    `;
    elements.individualPayersGrid.style.display = 'flex';
  }
}

// --- History Operations ---
function handleSaveToHistory() {
  const bill = Math.max(0, state.billAmount || 0);
  if (bill <= 0) {
    showToast('Cannot save: Bill amount must be greater than zero.', 'warning');
    return;
  }

  const taxAmount = bill * (state.taxPercent / 100);
  const tipAmount = bill * (state.tipPercent / 100);
  const grandTotal = bill + taxAmount + tipAmount;
  const partySize = Math.max(1, state.partySize);
  const perPerson = grandTotal / partySize;

  const entry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    note: state.note.trim() || 'Split Bill',
    currency: state.currency,
    billAmount: bill,
    taxPercent: state.taxPercent,
    taxAmount: taxAmount,
    tipPercent: state.tipPercent,
    tipAmount: tipAmount,
    grandTotal: grandTotal,
    partySize: partySize,
    perPerson: perPerson
  };

  state.history.unshift(entry);
  saveHistoryToStorage();
  renderHistoryList();
  showToast('Split successfully saved to local history!', 'success');

  // Pulse animation on button
  elements.saveHistoryBtn.textContent = '✓ Saved!';
  setTimeout(() => {
    elements.saveHistoryBtn.textContent = '💾 Save to History';
  }, 1400);
}

function renderHistoryList() {
  const totalCount = state.history.length;
  elements.historyCountBadge.textContent = `${totalCount} saved`;

  const query = state.historySearchQuery;
  const filtered = query
    ? state.history.filter(h => 
        (h.note && h.note.toLowerCase().includes(query)) ||
        (h.grandTotal && h.grandTotal.toString().includes(query)) ||
        (h.perPerson && h.perPerson.toFixed(2).includes(query))
      )
    : state.history;

  if (totalCount === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-history-state">
        <div class="empty-icon">📂</div>
        <p>No saved splits yet</p>
        <span>Calculate a bill and click "Save to History"</span>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-history-state">
        <div class="empty-icon">🔍</div>
        <p>No matching history entries found</p>
        <span>Try searching for another keyword or amount</span>
      </div>
    `;
    return;
  }

  elements.historyList.innerHTML = filtered.map(item => {
    const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-top">
          <div class="history-note" title="${escapeHtml(item.note)}">${escapeHtml(item.note)}</div>
          <div class="history-time">${dateStr}</div>
        </div>
        <div class="history-item-stats">
          <div class="history-per-person">
            ${item.currency || '$'}${item.perPerson.toFixed(2)}
            <span>/ person</span>
          </div>
          <div class="history-total-summary">
            Total: ${item.currency || '$'}${item.grandTotal.toFixed(2)} (${item.partySize} ${item.partySize === 1 ? 'person' : 'people'})
          </div>
        </div>
        <div class="history-item-actions">
          <button type="button" class="btn-history-load" onclick="loadHistoryItem('${item.id}')">
            ⚡ Load
          </button>
          <button type="button" class="btn-history-del" onclick="deleteHistoryItem('${item.id}')" title="Delete record">
            ✕
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function handleExportHistory() {
  if (state.history.length === 0) {
    showToast('No history records available to export.', 'warning');
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.history, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `split_bill_history_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('History exported as JSON file.', 'success');
}

// Window global helper functions for inline history buttons
window.loadHistoryItem = function(id) {
  const item = state.history.find(h => h.id === id);
  if (!item) return;

  state.currency = item.currency || '$';
  elements.currencySelect.value = state.currency;
  elements.billCurrencySymbol.textContent = state.currency;
  elements.heroCurrencySymbol.textContent = state.currency;

  state.billAmount = item.billAmount;
  state.tipPercent = item.tipPercent;
  state.taxPercent = item.taxPercent;
  state.partySize = item.partySize;
  state.note = item.note || '';

  syncAllInputs();
  calculateAndRender();
  showToast(`Loaded "${item.note}" into calculator`, 'info');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteHistoryItem = function(id) {
  state.history = state.history.filter(h => h.id !== id);
  saveHistoryToStorage();
  renderHistoryList();
  showToast('Record deleted.', 'info');
};

function handleClearAllHistory() {
  if (state.history.length === 0) return;
  if (confirm('Are you sure you want to clear all saved calculation history?')) {
    state.history = [];
    saveHistoryToStorage();
    renderHistoryList();
    showToast('All history cleared.', 'info');
  }
}

// --- Reset Defaults ---
function handleReset() {
  state.billAmount = 100.0;
  state.tipPercent = 15.0;
  state.taxPercent = 8.5;
  state.partySize = 3;
  state.roundingMode = 'exact';
  state.note = '';
  syncAllInputs();
  calculateAndRender();
  showToast('Calculator reset to defaults.', 'info');
}

// --- Copy Summary with Fallback ---
function handleCopySummary() {
  const bill = Math.max(0, state.billAmount || 0);
  if (bill <= 0) {
    showToast('Please enter a bill amount before copying summary.', 'warning');
    return;
  }

  const taxAmount = bill * (state.taxPercent / 100);
  const tipAmount = bill * (state.tipPercent / 100);
  const grandTotal = bill + taxAmount + tipAmount;
  const partySize = state.partySize;
  const totalCents = Math.round(grandTotal * 100);
  const baseCents = Math.floor(totalCents / partySize);
  const remainder = totalCents % partySize;
  const baseShare = baseCents / 100;
  const higherShare = (baseCents + 1) / 100;

  const noteTitle = state.note.trim() ? `📌 ${state.note.trim()}\n` : '';
  
  let splitText = '';
  if (partySize === 1) {
    splitText = `👤 Full Payer: ${state.currency}${grandTotal.toFixed(2)}`;
  } else if (remainder === 0) {
    splitText = `👤 Per Person: ${state.currency}${baseShare.toFixed(2)} (Equal Split)`;
  } else {
    splitText = `👤 Per Person:\n  • ${remainder} people pay: ${state.currency}${higherShare.toFixed(2)}\n  • ${partySize - remainder} people pay: ${state.currency}${baseShare.toFixed(2)}`;
  }

  const text = 
`🧾 *Bill Split Summary*
${noteTitle}
💵 Subtotal: ${state.currency}${bill.toFixed(2)}
📊 Tax (${state.taxPercent}%): ${state.currency}${taxAmount.toFixed(2)}
🎁 Tip (${state.tipPercent}%): ${state.currency}${tipAmount.toFixed(2)}
━━━━━━━━━━━━━━
💰 Grand Total: ${state.currency}${grandTotal.toFixed(2)}
👥 Party Size: ${partySize}
${splitText}
━━━━━━━━━━━━━━
Generated by SplitSmart`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Summary copied to clipboard!', 'success');
    }).catch(() => {
      fallbackCopyTextToClipboard(text);
    });
  } else {
    fallbackCopyTextToClipboard(text);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Summary copied to clipboard!', 'success');
  } catch (err) {
    showToast('Unable to copy to clipboard.', 'danger');
  }
  document.body.removeChild(textArea);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString().replace(/&/g, '&amp;')
                       .replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;')
                       .replace(/"/g, '&quot;')
                       .replace(/'/g, '&#039;');
}

// Kick off
document.addEventListener('DOMContentLoaded', init);
