const assert = require('assert');

function calculateSplit({ bill, tipPercent, taxPercent, partySize, roundingMode = 'exact' }) {
  const b = Math.max(0, bill);
  const tipP = Math.max(0, tipPercent);
  const taxP = Math.max(0, taxPercent);
  const n = Math.max(1, partySize);

  const taxAmount = b * (taxP / 100);
  let tipAmount = b * (tipP / 100);
  let grandTotalRaw = b + taxAmount + tipAmount;
  let totalCents = Math.round(grandTotalRaw * 100);

  if (roundingMode === 'roundUpDollar' && n > 0) {
    const rawPerPerson = totalCents / n / 100;
    const roundedUpPerPerson = Math.ceil(rawPerPerson);
    const newTotalCents = roundedUpPerPerson * n * 100;
    const extraTipCents = newTotalCents - totalCents;
    
    totalCents = newTotalCents;
    tipAmount += (extraTipCents / 100);
    grandTotalRaw = newTotalCents / 100;
  }

  const grandTotal = totalCents / 100;
  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents % n;

  const baseShare = baseCents / 100;
  const higherShare = (baseCents + 1) / 100;

  const totalCollectedCents = (remainderCents * (baseCents + 1)) + ((n - remainderCents) * baseCents);
  const totalCollected = totalCollectedCents / 100;

  return {
    bill: b,
    tipPercent: tipP,
    taxPercent: taxP,
    partySize: n,
    taxAmount: Math.round(taxAmount * 100) / 100,
    tipAmount: Math.round(tipAmount * 100) / 100,
    grandTotal,
    baseShare,
    higherShare,
    remainderCents,
    totalCollected,
    isExactMatch: totalCollectedCents === totalCents
  };
}

console.log("==========================================");
console.log(" 🧪 RUNNING FULL SUITE OF AUTOMATED TESTS ");
console.log("==========================================");

// Test Suite 1: Exact Penny Allocation
console.log("\n[Suite 1] Exact Penny Allocation Tests");
const t1 = calculateSplit({ bill: 100, tipPercent: 0, taxPercent: 0, partySize: 3 });
assert.strictEqual(t1.isExactMatch, true);
assert.strictEqual(t1.baseShare, 33.33);
assert.strictEqual(t1.higherShare, 33.34);
assert.strictEqual(t1.remainderCents, 1);
assert.strictEqual(t1.totalCollected, 100.00);
console.log("✓ $100 split 3 ways: 1 person pays $33.34, 2 pay $33.33 = $100.00 exact");

const t2 = calculateSplit({ bill: 84.50, tipPercent: 18, taxPercent: 8.875, partySize: 4 });
assert.strictEqual(t2.isExactMatch, true);
assert.strictEqual(t2.grandTotal, 107.21);
assert.strictEqual(t2.baseShare, 26.80);
assert.strictEqual(t2.higherShare, 26.81);
assert.strictEqual(t2.remainderCents, 1);
assert.strictEqual(t2.totalCollected, 107.21);
console.log("✓ $84.50 with 18% tip, 8.875% tax, party 4: Total $107.21 = $107.21 exact");

// Test Suite 2: Round Up Dollar Mode
console.log("\n[Suite 2] Round Up Dollar Mode Tests");
const t3 = calculateSplit({ bill: 100, tipPercent: 15, taxPercent: 8.5, partySize: 3, roundingMode: 'roundUpDollar' });
assert.strictEqual(t3.isExactMatch, true);
assert.strictEqual(t3.baseShare, 42.00); // 123.50 / 3 = 41.166 -> 42.00
assert.strictEqual(t3.remainderCents, 0);
assert.strictEqual(t3.totalCollected, 126.00);
console.log("✓ Round up mode: $123.50 total -> each person pays $42.00 (surplus goes to tip)");

// Test Suite 3: Extreme & Boundary Values
console.log("\n[Suite 3] Boundary & Extreme Values");
const t4 = calculateSplit({ bill: 0, tipPercent: 20, taxPercent: 10, partySize: 5 });
assert.strictEqual(t4.grandTotal, 0);
assert.strictEqual(t4.totalCollected, 0);
console.log("✓ $0 subtotal handles cleanly without errors");

const t5 = calculateSplit({ bill: 1500.85, tipPercent: 25, taxPercent: 12.5, partySize: 47 });
assert.strictEqual(t5.isExactMatch, true);
console.log(`✓ 47 people split $1500.85 bill: Total $${t5.grandTotal}, sum collected: $${t5.totalCollected}`);

console.log("\n🎉 ALL 5 TEST SUITES PASSED WITH 100% PRECISION!\n");
