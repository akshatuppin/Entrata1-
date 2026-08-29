/**
 * Smart Split Bill & Fair Penny Calculator
 * Handles real-time calculations, bidirectional slider-input synchronization,
 * penny-rounding discrepancy distribution, round-up options, and localStorage history.
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
  history: []
};

// DOM Element Selectors
const elements = {
  currencySelect: document.getElementById('currencySelect'),
  billCurrencySymbol: document.getElementById('billCurrencySymbol'),
  heroCurrencySymbol: document.getElementById('heroCurrencySymbol'),
  
  // Inputs & Sliders
  billAmount: document.getElementById('billAmount'),
  clearBillBtn: document.getElementById('clearBillBtn'),
  
  tipInput: document.getElementById('tipInput'),
  tipSlider: document.getElementById('tipSlider'),
  tipChips: document.querySelectorAll('#tipChips .chip'),
  
  taxInput: document.getElementById('taxInput'),
  taxSlider: document.getElementById('taxSlider'),
  taxChips: document.querySelectorAll('#taxChips .chip'),
  
  peopleInput: document.getElementById('peopleInput'),
  peopleSlider: document.getElementById('peopleSlider'),
  decreasePeopleBtn: document.getElementById('decreasePeopleBtn'),
  increasePeopleBtn: document.getElementById('increasePeopleBtn'),
  
  roundingRadios: document.querySelectorAll('input[name="roundingMode"]'),
  billNote: document.getElementById('billNote'),
  
  // Outputs
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
  copyFeedback: document.getElementById('copyFeedback'),
  
  // History
  historyCountBadge: document.getElementById('historyCountBadge'),
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

// --- Local Storage Management ---
const STORAGE_KEY = 'split_bill_history';

function loadHistoryFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    state.history = saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading history from localStorage:', e);
    state.history = [];
  }
  renderHistoryList();
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  } catch (e) {
    console.error('Error saving history to localStorage:', e);
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

  // Bill Amount
  elements.billAmount.addEventListener('input', (e) => {
    state.billAmount = parseFloat(e.target.value) || 0;
    calculateAndRender();
  });

  elements.clearBillBtn.addEventListener('click', () => {
    state.billAmount = 0;
    elements.billAmount.value = '';
    elements.billAmount.focus();
    calculateAndRender();
  });

  // Tip Percentage Sync
  elements.tipSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    state.tipPercent = val;
    elements.tipInput.value = val;
    updateChipActiveState(elements.tipChips, val, 'tip');
    calculateAndRender();
  });

  elements.tipInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    state.tipPercent = Math.max(0, val);
    elements.tipSlider.value = Math.min(50, state.tipPercent);
    updateChipActiveState(elements.tipChips, val, 'tip');
    calculateAndRender();
  });

  elements.tipChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const tipVal = parseFloat(chip.getAttribute('data-tip'));
      state.tipPercent = tipVal;
      elements.tipInput.value = tipVal;
      elements.tipSlider.value = Math.min(50, tipVal);
      updateChipActiveState(elements.tipChips, tipVal, 'tip');
      calculateAndRender();
    });
  });

  // Tax Percentage Sync
  elements.taxSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    state.taxPercent = val;
    elements.taxInput.value = val;
    updateChipActiveState(elements.taxChips, val, 'tax');
    calculateAndRender();
  });

  elements.taxInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    state.taxPercent = Math.max(0, val);
    elements.taxSlider.value = Math.min(30, state.taxPercent);
    updateChipActiveState(elements.taxChips, val, 'tax');
    calculateAndRender();
  });

  elements.taxChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const taxVal = parseFloat(chip.getAttribute('data-tax'));
      state.taxPercent = taxVal;
      elements.taxInput.value = taxVal;
      elements.taxSlider.value = Math.min(30, taxVal);
      updateChipActiveState(elements.taxChips, taxVal, 'tax');
      calculateAndRender();
    });
  });

  // Party Size Steppers & Slider
  elements.decreasePeopleBtn.addEventListener('click', () => {
    if (state.partySize > 1) {
      state.partySize--;
      syncPeopleControls();
      calculateAndRender();
    }
  });

  elements.increasePeopleBtn.addEventListener('click', () => {
    state.partySize++;
    syncPeopleControls();
    calculateAndRender();
  });

  elements.peopleSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    state.partySize = Math.max(1, val);
    elements.peopleInput.value = state.partySize;
    calculateAndRender();
  });

  elements.peopleInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    state.partySize = Math.max(1, val);
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

  // Note Input
  elements.billNote.addEventListener('input', (e) => {
    state.note = e.target.value;
  });

  // Action Buttons
  elements.saveHistoryBtn.addEventListener('click', handleSaveToHistory);
  elements.copySummaryBtn.addEventListener('click', handleCopySummary);
  elements.resetBtn.addEventListener('click', handleReset);
  elements.clearAllHistoryBtn.addEventListener('click', handleClearAllHistory);
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

// --- Core Calculation & Rounding Engine ---
function calculateAndRender() {
  const bill = Math.max(0, state.billAmount);
  const tipPercent = Math.max(0, state.tipPercent);
  const taxPercent = Math.max(0, state.taxPercent);
  const partySize = Math.max(1, state.partySize);

  // Base Calculations
  const taxAmount = bill * (taxPercent / 100);
  let tipAmount = bill * (tipPercent / 100);
  let grandTotalRaw = bill + taxAmount + tipAmount;
  let totalCents = Math.round(grandTotalRaw * 100);

  // If Round Up Whole Dollar mode is active
  if (state.roundingMode === 'roundUpDollar' && partySize > 0) {
    const rawPerPerson = totalCents / partySize / 100;
    const roundedUpPerPerson = Math.ceil(rawPerPerson);
    const newTotalCents = roundedUpPerPerson * partySize * 100;
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

  // Hero Display
  if (remainderCents === 0) {
    elements.perPersonAmount.textContent = baseShare.toFixed(2);
    elements.heroSubtitle.textContent = `Split evenly among ${partySize} ${partySize === 1 ? 'person' : 'people'}`;
  } else {
    elements.perPersonAmount.textContent = higherShare.toFixed(2);
    elements.heroSubtitle.textContent = `${remainderCents} ${remainderCents === 1 ? 'person pays' : 'people pay'} ${state.currency}${higherShare.toFixed(2)} & ${partySize - remainderCents} pay ${state.currency}${baseShare.toFixed(2)}`;
  }

  // Render Rounding Explanation & Individual Payer Grid
  renderRoundingExplanation(grandTotal, partySize, baseShare, higherShare, remainderCents);
}

function renderRoundingExplanation(grandTotal, partySize, baseShare, higherShare, remainderCents) {
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

  // Render individual payer badges for up to 12 people
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
    elements.individualPayersGrid.style.display = 'none';
  }
}

// --- History Operations ---
function handleSaveToHistory() {
  const bill = Math.max(0, state.billAmount);
  if (bill <= 0) {
    alert('Please enter a bill amount greater than 0.');
    return;
  }

  const taxAmount = bill * (state.taxPercent / 100);
  const tipAmount = bill * (state.tipPercent / 100);
  const grandTotal = bill + taxAmount + tipAmount;
  const partySize = state.partySize;
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

  // Button feedback
  elements.saveHistoryBtn.textContent = '✓ Saved!';
  setTimeout(() => {
    elements.saveHistoryBtn.textContent = '💾 Save to History';
  }, 1400);
}

function renderHistoryList() {
  const count = state.history.length;
  elements.historyCountBadge.textContent = `${count} ${count === 1 ? 'saved' : 'saved'}`;

  if (count === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-history-state">
        <div class="empty-icon">📂</div>
        <p>No saved splits yet</p>
        <span>Calculate a bill and click "Save to History"</span>
      </div>
    `;
    return;
  }

  elements.historyList.innerHTML = state.history.map(item => {
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteHistoryItem = function(id) {
  state.history = state.history.filter(h => h.id !== id);
  saveHistoryToStorage();
  renderHistoryList();
};

function handleClearAllHistory() {
  if (state.history.length === 0) return;
  if (confirm('Are you sure you want to clear all saved calculation history?')) {
    state.history = [];
    saveHistoryToStorage();
    renderHistoryList();
  }
}

// --- Reset ---
function handleReset() {
  state.billAmount = 100.0;
  state.tipPercent = 15.0;
  state.taxPercent = 8.5;
  state.partySize = 3;
  state.roundingMode = 'exact';
  state.note = '';
  syncAllInputs();
  calculateAndRender();
}

// --- Copy Summary ---
function handleCopySummary() {
  const bill = Math.max(0, state.billAmount);
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
  if (remainder === 0 || partySize === 1) {
    splitText = `👤 Per Person: ${state.currency}${baseShare.toFixed(2)}`;
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

  navigator.clipboard.writeText(text).then(() => {
    elements.copyFeedback.style.display = 'block';
    setTimeout(() => {
      elements.copyFeedback.style.display = 'none';
    }, 2500);
  }).catch(err => {
    console.error('Clipboard copy failed:', err);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Kick off
document.addEventListener('DOMContentLoaded', init);
