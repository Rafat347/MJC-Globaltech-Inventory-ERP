import { db } from '../lib/db';
import { calculateGST } from '../lib/gst';
import { numberToWordsINR, formatINR } from '../lib/invoicing';
import { getTrialBalance, getProfitAndLoss, getBalanceSheet } from '../lib/accounting';
import { getInventorySummary } from '../lib/inventory';

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING AUTOMATED ZENITH ERP BUSINESS LOGIC TEST SUITE');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  // TEST 1: Intra-State GST Calculation (50/50 CGST + SGST)
  console.log('\n--- 1. Testing GST Engine (Intra-State vs Inter-State) ---');
  const intraStateGST = calculateGST('29', '29', [
    { productId: 'test-1', quantity: 2, unitPrice: 50000, taxRate: 18 },
  ]);
  assert(
    !intraStateGST.isInterState,
    'Intra-state detection when seller and buyer both in State 29 (Karnataka)'
  );
  assert(
    intraStateGST.taxableAmount === 100000,
    'Taxable amount calculation is ₹1,00,000'
  );
  assert(
    intraStateGST.cgstTotal === 9000 && intraStateGST.sgstTotal === 9000 && intraStateGST.igstTotal === 0,
    'Intra-state GST splits into CGST 9% (₹9,000) + SGST 9% (₹9,000)'
  );
  assert(
    intraStateGST.grandTotal === 118000,
    'Grand Total with GST is exactly ₹1,18,000'
  );

  // TEST 2: Inter-State GST Calculation (100% IGST)
  const interStateGST = calculateGST('29', '27', [
    { productId: 'test-2', quantity: 1, unitPrice: 20000, discountPercent: 10, taxRate: 18 },
  ]);
  assert(
    interStateGST.isInterState,
    'Inter-state detection between Karnataka (29) and Maharashtra (27)'
  );
  assert(
    interStateGST.discountTotal === 2000 && interStateGST.taxableAmount === 18000,
    '10% Discount applied properly: Taxable is ₹18,000'
  );
  assert(
    interStateGST.cgstTotal === 0 && interStateGST.sgstTotal === 0 && interStateGST.igstTotal === 3240,
    'Inter-state GST allocates 100% to IGST 18% (₹3,240)'
  );
  assert(
    interStateGST.grandTotal === 21240,
    'Grand Total is ₹21,240'
  );

  // TEST 3: Number to Words Converter (INR)
  console.log('\n--- 2. Testing Indian Currency & Number-to-Words ---');
  const words1 = numberToWordsINR(241664);
  assert(
    words1.includes('Two Lakh Forty-One Thousand Six Hundred Sixty-Four'),
    `Number to Words 241,664: "${words1}"`
  );

  const words2 = numberToWordsINR(15000000);
  assert(
    words2.includes('One Crore Fifty Lakh'),
    `Number to Words 1,50,00,000: "${words2}"`
  );

  // TEST 4: Database Double-Entry General Ledger Balance
  console.log('\n--- 3. Testing Double-Entry Accounting Ledger Integrity ---');
  const company = await db.company.findFirst();
  if (!company) throw new Error('Company not found');

  const journalEntries = await db.journalEntry.findMany({
    where: { companyId: company.id },
    include: { lines: true },
  });

  assert(
    journalEntries.length > 0,
    `Retrieved ${journalEntries.length} posted journal entries from database`
  );

  let allEntriesBalanced = true;
  for (const jv of journalEntries) {
    const sumDr = jv.lines.reduce((s, l) => s + l.debitAmount, 0);
    const sumCr = jv.lines.reduce((s, l) => s + l.creditAmount, 0);
    if (Math.abs(sumDr - sumCr) > 0.05) {
      allEntriesBalanced = false;
      console.error(`Unbalanced Entry ${jv.entryNo}: Dr ${sumDr} vs Cr ${sumCr}`);
    }
  }
  assert(
    allEntriesBalanced,
    'All Journal Entries in database satisfy double-entry rule: Sum(Debits) == Sum(Credits)'
  );

  // TEST 5: Trial Balance Calculation
  const trialBal = await getTrialBalance(company.id);
  assert(
    trialBal.isBalanced,
    `Trial Balance is balanced: Total Debit (₹${trialBal.totalDebit}) == Total Credit (₹${trialBal.totalCredit})`
  );

  // TEST 6: Profit & Loss Statement
  console.log('\n--- 4. Testing Financial Statements ---');
  const pnl = await getProfitAndLoss(company.id);
  assert(
    pnl.totalRevenue > 0,
    `P&L Total Revenue calculated from transactions: ₹${pnl.totalRevenue}`
  );
  assert(
    typeof pnl.netProfit === 'number',
    `P&L Net Profit calculated: ₹${pnl.netProfit}`
  );

  // TEST 7: Inventory & Stock Valuation
  console.log('\n--- 5. Testing Inventory Movement & Valuation ---');
  const invSummary = await getInventorySummary(company.id);
  assert(
    invSummary.totalItemsCount === 7,
    `Product count matches catalog (7 items found)`
  );
  assert(
    invSummary.totalStockValue > 0,
    `Total Stock Valuation calculated: ₹${invSummary.totalStockValue.toLocaleString('en-IN')}`
  );

  // TEST 8: Customer Outstanding Balance & Invoices
  console.log('\n--- 6. Testing Sales & Customer Outstanding Balance ---');
  const cust2 = await db.customer.findFirst({
    where: { customerCode: 'CUST-002', companyId: company.id },
  });
  assert(
    cust2?.currentBalance === 67410,
    `Customer CUST-002 (Reliance Cloud) outstanding balance is exactly ₹67,410 (Invoice ₹1,17,410 - Paid ₹50,000)`
  );

  console.log('\n========================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
