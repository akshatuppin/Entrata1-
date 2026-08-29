# 💰 Smart Split Bill & Tip Calculator

A modern, responsive, and reactive Split Bill web application designed to calculate bill splits with live bidirectional slider controls, customizable tip and tax percentages, comprehensive penny-rounding distribution logic, and local memory storage (history).

---

## 📌 Table of Contents
- [✨ Key Features](#-key-features)
- [🧮 Mathematical Logic & Formulas](#-mathematical-logic--formulas)
- [🔍 Rounding Rules & The Penny Discrepancy](#-rounding-rules--the-penny-discrepancy)
- [📥 Input & Output Specifications](#-input--output-specifications)
- [💾 Local Storage Architecture](#-local-storage-architecture)
- [🚀 Roadmap & Mini-Milestones](#-roadmap--mini-milestones)
- [🛠️ Tech Stack & Getting Started](#️-tech-stack--getting-started)

---

## ✨ Key Features
- **⚡ Instant Real-Time Calculations:** Recalculates all values immediately on every input change or slider drag without requiring a "Calculate" button.
- **🎛️ Bidirectional Controls:** Move a slider to update the number input, or type into the input to update the slider position.
- **🏷️ Quick Preset Chips:** One-tap buttons for standard tips (`0%`, `10%`, `15%`, `18%`, `20%`, `25%`) and party size steppers (`-` / `+`).
- **⚖️ Fair Penny-Rounding Inspector:** Breaks down exact per-person division and explains who pays the extra penny when a bill doesn't split evenly.
- **📝 Optional Bill & Item Notes:** Tag your calculation with a label (e.g., *"Team Dinner at Joe's Pizza"*).
- **💾 Local History Storage:** Persists past calculations locally in browser memory (`localStorage`) with restore and delete options.
- **📋 Share & Copy Summary:** Formats the entire split into a clean text message ready to paste into WhatsApp, Slack, or SMS.

---

## 🧮 Mathematical Logic & Formulas

### Variable Definitions
| Variable | Description | Constraint |
|---|---|---|
| $B$ | Bill Subtotal (amount before tax and tip) | $B \ge 0$ |
| $P_{\text{tip}}$ | Tip Percentage | $0\% \le P_{\text{tip}} \le 100\%$ |
| $P_{\text{tax}}$ | Tax Percentage | $0\% \le P_{\text{tax}} \le 100\%$ |
| $N$ | Party Size (Number of people) | $N \ge 1$, Integer |

### Calculation Steps
1. **Tax Amount:**
   $$\text{Tax Amount} = B \times \left(\frac{P_{\text{tax}}}{100}\right)$$

2. **Tip Amount:**
   $$\text{Tip Amount} = B \times \left(\frac{P_{\text{tip}}}{100}\right)$$
   *(Tip is standardly computed on the pre-tax subtotal $B$)*

3. **Grand Total:**
   $$\text{Grand Total} = B + \text{Tax Amount} + \text{Tip Amount}$$

4. **Exact Share Per Person:**
   $$\text{Exact Share} = \frac{\text{Grand Total}}{N}$$

---

## 🔍 Rounding Rules & The Penny Discrepancy

### The Problem
When dividing currency among $N$ individuals, simple 2-decimal floating point division frequently causes a **1-cent or 2-cent discrepancy**:

> **Example:** A total bill of **$100.00** split among **3 people**:
> - Raw division: $\frac{100.00}{3} = 33.333333...$
> - If all 3 people pay the standard rounded **$33.33**:
>   $$\$33.33 \times 3 = \$99.99 \quad (\text{Short by } \$0.01)$$
> - If all 3 people pay rounded up **$33.34**:
>   $$\$33.34 \times 3 = \$100.02 \quad (\text{Over by } \$0.02)$$

### The Fair Split Algorithm (Penny Distribution)
To guarantee that the collected sum strictly equals the Grand Total to the exact penny:

1. Convert Grand Total into total integer cents:
   $$\text{Total Cents} = \text{round}(\text{Grand Total} \times 100)$$
2. Compute the base cents per person:
   $$\text{Base Cents} = \lfloor \text{Total Cents} / N \rfloor$$
3. Compute remainder cents:
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
- **Total Collected:** $33.34 + $33.33 + $33.33 = **$100.00 exact!**

---

## 📥 Input & Output Specifications

### Inputs
1. **Bill Amount ($):** Subtotal amount before tip and tax.
2. **Tip (%):** Percentage with slider (0%–50%) and quick presets.
3. **Tax (%):** Percentage with slider (0%–30%) and direct input.
4. **Party Size ($N$):** Number of people with counter steppers and slider (1–50).
5. **Optional Item / Bill Notes:** Custom description or memo.

### Outputs
1. **Subtotal:** Formatted currency ($B$).
2. **Tip Amount:** Total tip added ($B \times P_{\text{tip}}$).
3. **Tax Amount:** Total tax added ($B \times P_{\text{tax}}$).
4. **Grand Total:** Total payable amount.
5. **Per-Person Owed:** Base share per person with fair penny remainder allocation.

---

## 💾 Local Storage Architecture

Calculations are persisted in browser memory using `localStorage` under the key `split_bill_history`.

```json
{
  "id": "1724953000000",
  "timestamp": "2026-08-29T23:15:00.000Z",
  "note": "Dinner with Team",
  "subtotal": 120.00,
  "tipPercent": 18,
  "tipAmount": 21.60,
  "taxPercent": 8.5,
  "taxAmount": 10.20,
  "grandTotal": 151.80,
  "partySize": 4,
  "perPerson": 37.95
}
```

---

## 🚀 Roadmap & Mini-Milestones

- **Milestone 1:** Logic Clearation, Architecture & Setup (`prompts.md`, `README.md`)
- **Milestone 2:** Application UI & Real-Time Sync Engine (`index.html`, `style.css`, `app.js`)
- **Milestone 3:** Per-Person Share & Interactive Penny Rounding Breakdown
- **Milestone 4:** LocalStorage History Management & Item Notes
- **Milestone 5:** Verification, Testing, and Final Polish

---

## 🛠️ Tech Stack & Getting Started

- **Frontend:** Pure HTML5, Modern CSS (Glassmorphism & Card UI), Vanilla JavaScript (ES6+).
- **Zero Dependencies:** Runs directly in any modern browser without build tools.
- **Run Locally:** Simply open `index.html` in your web browser.
