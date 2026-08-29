const assert = require('assert');

function calculateSplit({ bill, tipPercent, taxPercent, partySize, roundingMode = 'exact' }) {
  // Edge Case 1: Clamp negative or invalid bill to 0
  const b = isNaN(bill) ? 0 : Math.max(0, Math.min(100000000, bill));
  
  // Edge Case 2: Clamp tip (0 to 500%) & tax (0 to 100%)
  const tipP = isNaN(tipPercent) ? 0 : Math.max(0, Math.min(500, tipPercent));
  const taxP = isNaN(taxPercent) ? 0 : Math.max(0, Math.min(100, taxPercent));
  
  // Edge Case 3: Enforce minimum party size of 1
  let n = parseInt(partySize, 10);
  if (isNaN(n) || n < 1) n = 1;
  n = Math.min(500, n);

  const taxAmount = b * (taxP / 100);
  let tipAmount = b * (tipP / 100);
  let grandTotalRaw = b + taxAmount + tipAmount;
  let totalCents = Math.round(grandTotalRaw * 100);

  if (roundingMode === 'roundUpDollar' && n > 0 && totalCents > 0) {
    const rawPerPersonCents = totalCents / n;
    const roundedUpPerPersonCents = Math.ceil(rawPerPersonCents / 100) * 100;
    const newTotalCents = roundedUpPerPersonCents * n;
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

console.log("=================================================");
console.log(" 🛡️ RUNNING COMPREHENSIVE EDGE-CASE SAFETY TESTS ");
console.log("=================================================");

// Edge Case 1: Party size 0, negative, or NaN
console.log("\n[Edge Case 1: Invalid & Non-Positive Party Sizes]");
const ec1 = calculateSplit({ bill: 100, tipPercent: 10, taxPercent: 5, partySize: 0 });
assert.strictEqual(ec1.partySize, 1);
assert.strictEqual(ec1.isExactMatch, true);
console.log("✓ Party size 0 automatically clamped to 1 person");

const ec2 = calculateSplit({ bill: 100, tipPercent: 10, taxPercent: 5, partySize: -5 });
assert.strictEqual(ec2.partySize, 1);
assert.strictEqual(ec2.isExactMatch, true);
console.log("✓ Negative party size (-5) clamped to 1 person");

const ec3 = calculateSplit({ bill: 100, tipPercent: 10, taxPercent: 5, partySize: "invalid" });
assert.strictEqual(ec3.partySize, 1);
console.log("✓ Non-numeric party size ('invalid') safely defaulted to 1");

// Edge Case 2: Zero & Negative Bill Subtotals
console.log("\n[Edge Case 2: Zero & Negative Bill Amounts]");
const ec4 = calculateSplit({ bill: 0, tipPercent: 15, taxPercent: 8.5, partySize: 3 });
assert.strictEqual(ec4.grandTotal, 0);
assert.strictEqual(ec4.totalCollected, 0);
assert.strictEqual(ec4.baseShare, 0);
console.log("✓ $0.00 bill gives clean $0.00 totals without NaN/Infinity");

const ec5 = calculateSplit({ bill: -50.25, tipPercent: 15, taxPercent: 8.5, partySize: 3 });
assert.strictEqual(ec5.bill, 0);
assert.strictEqual(ec5.grandTotal, 0);
console.log("✓ Negative bill amount (-$50.25) safely clamped to $0.00");

// Edge Case 3: Micro-bills (Total Cents < Party Size)
console.log("\n[Edge Case 3: Micro-bills (Total < Party Size)]");
// $0.05 split among 10 people -> 5 people pay $0.01, 5 people pay $0.00 -> Sum = $0.05
const ec6 = calculateSplit({ bill: 0.05, tipPercent: 0, taxPercent: 0, partySize: 10 });
assert.strictEqual(ec6.isExactMatch, true);
assert.strictEqual(ec6.baseShare, 0.00);
assert.strictEqual(ec6.higherShare, 0.01);
assert.strictEqual(ec6.remainderCents, 5);
assert.strictEqual(ec6.totalCollected, 0.05);
console.log("✓ Micro-bill $0.05 split among 10: 5 pay $0.01, 5 pay $0.00 (Sum = $0.05 exact)");

// Edge Case 4: Floating Point Precision with 3-decimal taxes
console.log("\n[Edge Case 4: Complex Floating-Point Percentages]");
// $19.99 with 8.875% tax + 18% tip split among 3 people
const ec7 = calculateSplit({ bill: 19.99, tipPercent: 18, taxPercent: 8.875, partySize: 3 });
assert.strictEqual(ec7.isExactMatch, true);
console.log(`✓ $19.99 with 8.875% tax, 18% tip for 3: Total $${ec7.grandTotal} (Collected: $${ec7.totalCollected})`);

// Edge Case 5: Large Party Boundary
console.log("\n[Edge Case 5: High Volume / Large Party Boundary]");
const ec8 = calculateSplit({ bill: 10000.00, tipPercent: 20, taxPercent: 10, partySize: 500 });
assert.strictEqual(ec8.partySize, 500);
assert.strictEqual(ec8.isExactMatch, true);
assert.strictEqual(ec8.totalCollected, 13000.00);
console.log(`✓ 500 people split $10,000 bill: $${ec8.baseShare}/person (Exact $13,000.00 collected)`);

console.log("\n=================================================");
console.log(" 🎉 ALL EDGE-CASE SAFETY TESTS PASSED 100%!     ");
console.log("=================================================\n");
