# 💰 SplitSmart — Instant Split Bill & Fair Penny Calculator

A modern, responsive, and reactive web application designed to calculate bill splits with live bidirectional slider controls, customizable tip and tax rates, automated penny-rounding discrepancy distribution, zero-loss integer cent arithmetic, and browser `localStorage` history management.

---

## 📌 Table of Contents
- [✨ Key Features](#-key-features)
- [🛡️ Comprehensive Edge-Case Safety & Robustness](#️-comprehensive-edge-case-safety--robustness)
- [🧮 Mathematical Logic & Formulas](#-mathematical-logic--formulas)
- [🔍 The Penny Discrepancy & Fair Rounding Rule](#-the-penny-discrepancy--fair-rounding-rule)
- [📥 Input & Output Specifications](#-input--output-specifications)
- [💾 Local Storage Architecture](#-local-storage-architecture)
- [🧪 Automated Test Suite](#-automated-test-suite)
- [🚀 Mini-Milestone Commit History](#-mini-milestone-commit-history)
- [🛠️ Tech Stack & Getting Started](#️-tech-stack--getting-started)

---

## ✨ Key Features
- **⚡ Zero-Lag Reactive Engine:** Updates all totals and per-person shares dynamically on every input stroke or slider movement.
- **🎛️ 2-Way Bidirectional Controls:** Move a slider to adjust the number input, or type into the input to reposition the slider.
- **🏷️ One-Tap Quick Chips:** Fast preset buttons for tip percentages (`0%`, `10%`, `15%`, `18%`, `20%`, `25%`) and tax presets (`0%`, `5%`, `8.5%`, `10%`, `18%`).
- **👥 Party Size Steppers:** Quick `+` and `-` steppers along with a slider for party sizes from 1 to 500 people.
- **⚖️ Fair Penny-Rounding Inspector:** Live visual matrix displaying individual payer allocations (e.g. Person 1, Person 2, Person 3) to ensure 0 lost cents.
- **⬆️ Whole Dollar Round-Up Mode:** 1-click option to round each person's share up to the nearest whole dollar, routing the difference into an extra server tip.
- **📝 Bill & Item Notes:** Tag calculations with custom notes (e.g., *"Team Dinner at Mario's"*).
- **💾 Local History Management:** Save, filter/search, reload, delete, or export calculations as JSON directly in browser storage (`localStorage`).
- **📋 One-Click Share Summary:** Formats complete split receipts into clean Markdown/text ready to paste into WhatsApp, Slack, or SMS.
- **🌍 Multi-Currency Support:** Instant switching between `$`, `₹`, `€`, `£`, `C$`, and `A$`.

---

## 🛡️ Comprehensive Edge-Case Safety & Robustness

The application includes exhaustive defensive handling for all practical financial and UI edge cases:

| Edge Case Scenario | Risk / Dilemma | Built-in Safety Handling |
|---|---|---|
| **Party Size $\le 0$ or Non-Numeric** | Division by zero ($\text{NaN} / \infty$) | Enforces a strict minimum of $N \ge 1$. Stepper buttons prevent going below 1, and negative/invalid numbers auto-default to 1 with an inline notice. |
| **Bill Subtotal $\le \$0.00$** | Invalid calculations, saving empty records | Bill input is clamped to $\ge 0$. When bill is \$0.00, a zero-state helper banner appears, and the "Save to History" button is automatically disabled. |
| **Negative Inputs** | Negative tax or negative tip | Math engine clamps subtotal, tip %, and tax % to non-negative ranges ($B \ge 0$, $\text{Tip} \ge 0$, $\text{Tax} \ge 0$). |
| **Micro-Bills ($\text{Total Cents} < N$)** | Fractional cents or negative shares | E.g. \$0.05 bill split among 10 people: 5 people pay \$0.01 and 5 people pay \$0.00. Total collected matches \$0.05 exact without loss. |
| **Large Party Sizes ($N > 12$)** | DOM node overload / cluttered UI | Displays a clean summary card instead of generating hundreds of individual pill elements. |
| **Floating Point Inaccuracies** | JS float arithmetic (e.g. `0.1 + 0.2`) | All computations are converted into discrete **integer cents** before division and modulus operations. |
| **Corrupted `localStorage`** | App crash on malformed local data | JSON parser runs in a defensive `try/catch` block with self-healing array schema validation and graceful fallback. |
| **Blocked Clipboard API** | Copy failure in non-secure contexts | Automated fallback to `document.execCommand('copy')` with hidden DOM selection. |
| **Intrusive Alert Popups** | Poor mobile/desktop UX with `alert()` | Replaced by non-blocking animated toast notifications (Success, Warning, Info, Error). |

---

## 🧮 Mathematical Logic & Formulas

### Variable Definitions
| Variable | Description | Constraints |
|---|---|---|
| $B$ | Bill Subtotal (before tax and tip) | $B \ge 0$ |
| $P_{\text{tip}}$ | Tip Percentage | $0 \le P_{\text{tip}} \le 500$ |
| $P_{\text{tax}}$ | Tax Percentage | $0 \le P_{\text{tax}} \le 100$ |
| $N$ | Party Size (Number of people) | $N \ge 1$, Integer |

### Calculation Steps
1. **Tax Amount:**
   $$\text{Tax Amount} = B \times \left(\frac{P_{\text{tax}}}{100}\right)$$

2. **Tip Amount:**
   $$\text{Tip Amount} = B \times \left(\frac{P_{\text{tip}}}{100}\right)$$

3. **Grand Total:**
   $$\text{Grand Total} = B + \text{Tax Amount} + \text{Tip Amount}$$

4. **Exact Share Per Person:**
   $$\text{Exact Share} = \frac{\text{Grand Total}}{N}$$

---

## 🔍 The Penny Discrepancy & Fair Rounding Rule

### The Problem
Dividing currency among $N$ individuals often causes a **1-cent or 2-cent discrepancy** due to 2-decimal rounding:

> **Example:** A total bill of **$100.00** split among **3 people**:
> - Raw division: $\frac{100.00}{3} = \$33.333333...$
> - If all 3 people pay standard rounded **$33.33**:
>   $$\$33.33 \times 3 = \$99.99 \quad (\text{Short by } \$0.01)$$
> - If all 3 people pay rounded up **$33.34**:
>   $$\$33.34 \times 3 = \$100.02 \quad (\text{Over by } \$0.02)$$

### The Fair Split Algorithm (Penny Distribution)
To guarantee the collected sum strictly equals the Grand Total to the exact cent:

1. **Convert to total integer cents:**
   $$\text{Total Cents} = \text{round}(\text{Grand Total} \times 100)$$
2. **Compute base cents per person:**
   $$\text{Base Cents} = \lfloor \text{Total Cents} / N \rfloor$$
3. **Compute remainder cents:**
   $$\text{Remainder Cents} = \text{Total Cents} \pmod N$$
4. **Distribution:**
   - The first $\text{Remainder Cents}$ people pay:
     $$\text{Base Cents} + 1 \text{ cent}$$
   - The remaining $(N - \text{Remainder Cents})$ people pay:
     $$\text{Base Cents}$$

#### Result for $100.00 among 3 people:
- **Person 1:** $33.34
- **Person 2:** $33.33
- **Person 3:** $33.33
- **Total Collected:** $\$33.34 + \$33.33 + \$33.33 = \mathbf{\$100.00 \text{ exact!}}$

---

## 📥 Input & Output Specifications

### Inputs
1. **Bill Subtotal:** Amount before tip and tax.
2. **Tip (%):** Percentage with slider (0%–50%) and quick presets.
3. **Tax (%):** Percentage with slider (0%–30%) and direct input.
4. **Party Size ($N$):** Number of people with counter steppers and slider (1–30, up to 500).
5. **Rounding Strategy:** Fair Exact Penny vs Whole-Dollar Round-Up.
6. **Bill Note:** Optional description or event name (up to 60 characters).

### Outputs
1. **Subtotal:** Formatted currency.
2. **Tip Amount:** Calculated tip value.
3. **Tax Amount:** Calculated tax value.
4. **Grand Total:** Total payable amount.
5. **Per-Person Owed:** Hero card with fair remainder allocation.

---

## 💾 Local Storage Architecture

Calculations are persisted in browser memory using `localStorage` under the key `split_bill_history`.

```json
{
  "id": "1772301000000",
  "timestamp": "2026-08-29T23:20:00.000Z",
  "note": "Dinner with Team",
  "currency": "$",
  "billAmount": 120.00,
  "taxPercent": 8.5,
  "taxAmount": 10.20,
  "tipPercent": 18.0,
  "tipAmount": 21.60,
  "grandTotal": 151.80,
  "partySize": 4,
  "perPerson": 37.95
}
```

---

## 🧪 Automated Test Suite

Run the automated mathematical edge-case validation test suite:

```bash
node test_calculations.js
```

### Verified Test Cases:
- [x] Party size 0, negative numbers, or `NaN` clamped to $\ge 1$
- [x] Zero bill ($0.00) & negative subtotal handling
- [x] Exact penny split with remainder cents ($100 / 3)
- [x] Decimal taxes and tips ($84.50, 18% tip, 8.875% tax, 4 people)
- [x] Micro-bills where total cents < party size ($0.05 / 10 people)
- [x] Whole-dollar convenience round-up mode
- [x] High-volume party boundary (500 people splitting $10,000.00)

---

## 🚀 Mini-Milestone Commit History

- **Milestone 1 (`e442b41`):** Logic specifications, setup, user prompt tracking (`prompts.md`), and comprehensive `README.md`.
- **Milestone 2 (`476c93f`):** Responsive UI structure (`index.html`, `style.css`), and real-time bidirectional slider/input synchronization engine (`app.js`).
- **Milestone 3 (`13b6601`):** Per-Person Share hero display, interactive fair penny rounding breakdown inspector with individual payer badges, and formatted summary clipboard sharer.
- **Milestone 4 (`582dff2`):** Local storage history management with search/filter, JSON export, single item loader, and bill note tagger.
- **Milestone 5 (`9b35036`):** Automated test suite, comprehensive documentation, and edge-case verification.
- **Milestone 6 (Current):** Exhaustive edge-case protections (minimum party size, \$0 subtotal zero-states, micro-bills, integer cent precision, toast notification system, and clipboard fallback).

---

## 🛠️ Tech Stack & Getting Started

- **Frontend:** Pure HTML5, Modern CSS (Glassmorphism & Card UI), Vanilla JavaScript (ES6+).
- **Zero Dependencies:** No bundlers, npm dependencies, or build steps required.
- **Run Locally:**
  1. Clone this repository:
     ```bash
     git clone https://github.com/akshatuppin/Entrata1-.git
     ```
  2. Open `index.html` in any web browser.
