import { db } from './db';
import { AccountSubType, AccountType, EntryReferenceType, Prisma } from '@prisma/client';

export interface SystemAccountDef {
  code: string;
  name: string;
  accountType: AccountType;
  subType: AccountSubType;
}

export const SYSTEM_ACCOUNTS: SystemAccountDef[] = [
  // ASSETS (1xxx)
  { code: '1001', name: 'Cash on Hand', accountType: AccountType.ASSET, subType: AccountSubType.CASH },
  { code: '1002', name: 'Bank Account (Main)', accountType: AccountType.ASSET, subType: AccountSubType.BANK },
  { code: '1003', name: 'Accounts Receivable (Debtors)', accountType: AccountType.ASSET, subType: AccountSubType.ACCOUNTS_RECEIVABLE },
  { code: '1004', name: 'Inventory Asset', accountType: AccountType.ASSET, subType: AccountSubType.INVENTORY_ASSET },
  { code: '1005', name: 'Input CGST Credit', accountType: AccountType.ASSET, subType: AccountSubType.TAX_CREDIT_CGST },
  { code: '1006', name: 'Input SGST Credit', accountType: AccountType.ASSET, subType: AccountSubType.TAX_CREDIT_SGST },
  { code: '1007', name: 'Input IGST Credit', accountType: AccountType.ASSET, subType: AccountSubType.TAX_CREDIT_IGST },
  
  // LIABILITIES (2xxx)
  { code: '2001', name: 'Accounts Payable (Creditors)', accountType: AccountType.LIABILITY, subType: AccountSubType.ACCOUNTS_PAYABLE },
  { code: '2002', name: 'Output CGST Payable', accountType: AccountType.LIABILITY, subType: AccountSubType.TAX_PAYABLE_CGST },
  { code: '2003', name: 'Output SGST Payable', accountType: AccountType.LIABILITY, subType: AccountSubType.TAX_PAYABLE_SGST },
  { code: '2004', name: 'Output IGST Payable', accountType: AccountType.LIABILITY, subType: AccountSubType.TAX_PAYABLE_IGST },
  
  // EQUITY (3xxx)
  { code: '3001', name: "Owner's Capital / Equity", accountType: AccountType.EQUITY, subType: AccountSubType.OWNERS_EQUITY },
  { code: '3002', name: 'Retained Earnings', accountType: AccountType.EQUITY, subType: AccountSubType.RETAINED_EARNINGS },
  
  // REVENUE (4xxx)
  { code: '4001', name: 'Sales Revenue', accountType: AccountType.REVENUE, subType: AccountSubType.SALES_REVENUE },
  { code: '4002', name: 'Other Operating Income', accountType: AccountType.REVENUE, subType: AccountSubType.OTHER_INCOME },
  
  // EXPENSES (5xxx)
  { code: '5001', name: 'Cost of Goods Sold (COGS)', accountType: AccountType.EXPENSE, subType: AccountSubType.COST_OF_GOODS_SOLD },
  { code: '5002', name: 'Operating & Admin Expenses', accountType: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
];

export async function ensureDefaultAccounts(companyId: string, tx?: Prisma.TransactionClient) {
  const client = tx || db;
  for (const acc of SYSTEM_ACCOUNTS) {
    const existing = await client.account.findUnique({
      where: { code_companyId: { code: acc.code, companyId } },
    });
    if (!existing) {
      await client.account.create({
        data: {
          code: acc.code,
          name: acc.name,
          accountType: acc.accountType,
          subType: acc.subType,
          isSystem: true,
          companyId,
        },
      });
    }
  }
}

export async function getAccountByCode(code: string, companyId: string, tx?: Prisma.TransactionClient) {
  const client = tx || db;
  let acc = await client.account.findUnique({
    where: { code_companyId: { code, companyId } },
  });
  if (!acc) {
    await ensureDefaultAccounts(companyId, client);
    acc = await client.account.findUnique({
      where: { code_companyId: { code, companyId } },
    });
  }
  return acc;
}

export interface JournalLineInput {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
}

export async function postJournalEntry(
  params: {
    companyId: string;
    entryDate: Date;
    referenceType: EntryReferenceType;
    referenceId?: string;
    narration: string;
    createdById?: string;
    lines: JournalLineInput[];
  },
  tx?: Prisma.TransactionClient
) {
  const client = tx || db;
  const { companyId, entryDate, referenceType, referenceId, narration, createdById, lines } = params;

  // Filter non-zero lines
  const activeLines = lines.filter((l) => (l.debit > 0 || l.credit > 0));

  const totalDebit = Number(activeLines.reduce((sum, l) => sum + (l.debit || 0), 0).toFixed(2));
  const totalCredit = Number(activeLines.reduce((sum, l) => sum + (l.credit || 0), 0).toFixed(2));

  if (Math.abs(totalDebit - totalCredit) > 0.05) {
    throw new Error(
      `Accounting Error: Unbalanced journal entry! Total Debit (₹${totalDebit}) must equal Total Credit (₹${totalCredit})`
    );
  }

  // Count existing entries for numbering
  const count = await client.journalEntry.count({ where: { companyId } });
  const entryNo = `JV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  const entry = await client.journalEntry.create({
    data: {
      entryNo,
      entryDate,
      referenceType,
      referenceId,
      narration,
      totalDebit,
      totalCredit,
      status: 'POSTED',
      createdById,
      companyId,
      lines: {
        create: activeLines.map((l) => ({
          accountId: l.accountId,
          description: l.description,
          debitAmount: Number(l.debit.toFixed(2)),
          creditAmount: Number(l.credit.toFixed(2)),
        })),
      },
    },
    include: { lines: true },
  });

  // Update Account Balances
  for (const line of activeLines) {
    const acc = await client.account.findUnique({ where: { id: line.accountId } });
    if (acc) {
      // Normal balance: ASSET and EXPENSE increase with debit, decrease with credit
      // LIABILITY, EQUITY, REVENUE increase with credit, decrease with debit
      const isDebitNormal = acc.accountType === AccountType.ASSET || acc.accountType === AccountType.EXPENSE;
      const change = isDebitNormal ? line.debit - line.credit : line.credit - line.debit;
      await client.account.update({
        where: { id: line.accountId },
        data: { currentBalance: { increment: change } },
      });
    }
  }

  return entry;
}

/**
 * Creates double-entry records when a Sales Invoice is finalized:
 * DR: Accounts Receivable (1003) = Grand Total
 * CR: Sales Revenue (4001) = Taxable Amount
 * CR: Output CGST (2002) = CGST Total
 * CR: Output SGST (2003) = SGST Total
 * CR: Output IGST (2004) = IGST Total
 */
export async function recordInvoiceAccounting(
  invoice: {
    id: string;
    invoiceNo: string;
    invoiceDate: Date;
    companyId: string;
    taxableAmount: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    totalAmount: number;
    customerName: string;
    createdById?: string | null;
  },
  tx?: Prisma.TransactionClient
) {
  const client = tx || db;
  const { companyId, invoiceNo, invoiceDate, taxableAmount, cgstTotal, sgstTotal, igstTotal, totalAmount, customerName } = invoice;

  const arAcc = await getAccountByCode('1003', companyId, client);
  const salesAcc = await getAccountByCode('4001', companyId, client);
  const cgstAcc = await getAccountByCode('2002', companyId, client);
  const sgstAcc = await getAccountByCode('2003', companyId, client);
  const igstAcc = await getAccountByCode('2004', companyId, client);

  if (!arAcc || !salesAcc || !cgstAcc || !sgstAcc || !igstAcc) {
    throw new Error('System chart of accounts could not be initialized.');
  }

  const lines: JournalLineInput[] = [
    {
      accountId: arAcc.id,
      description: `Sales Invoice #${invoiceNo} - ${customerName}`,
      debit: totalAmount,
      credit: 0,
    },
    {
      accountId: salesAcc.id,
      description: `Sales Revenue - Inv #${invoiceNo}`,
      debit: 0,
      credit: taxableAmount,
    },
  ];

  if (cgstTotal > 0) {
    lines.push({
      accountId: cgstAcc.id,
      description: `Output CGST - Inv #${invoiceNo}`,
      debit: 0,
      credit: cgstTotal,
    });
  }

  if (sgstTotal > 0) {
    lines.push({
      accountId: sgstAcc.id,
      description: `Output SGST - Inv #${invoiceNo}`,
      debit: 0,
      credit: sgstTotal,
    });
  }

  if (igstTotal > 0) {
    lines.push({
      accountId: igstAcc.id,
      description: `Output IGST - Inv #${invoiceNo}`,
      debit: 0,
      credit: igstTotal,
    });
  }

  return postJournalEntry(
    {
      companyId,
      entryDate: invoiceDate,
      referenceType: EntryReferenceType.INVOICE,
      referenceId: invoice.id,
      narration: `Sales Invoice #${invoiceNo} issued to ${customerName}`,
      createdById: invoice.createdById || undefined,
      lines,
    },
    client
  );
}

/**
 * Creates double-entry records when a Purchase Invoice is finalized:
 * DR: Inventory Asset / Purchases (1004) = Taxable Amount
 * DR: Input CGST (1005) = CGST Total
 * DR: Input SGST (1006) = SGST Total
 * DR: Input IGST (1007) = IGST Total
 * CR: Accounts Payable (2001) = Grand Total
 */
export async function recordPurchaseAccounting(
  purchase: {
    id: string;
    billNo: string;
    billDate: Date;
    companyId: string;
    taxableAmount: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    totalAmount: number;
    supplierName: string;
    createdById?: string | null;
  },
  tx?: Prisma.TransactionClient
) {
  const client = tx || db;
  const { companyId, billNo, billDate, taxableAmount, cgstTotal, sgstTotal, igstTotal, totalAmount, supplierName } = purchase;

  const apAcc = await getAccountByCode('2001', companyId, client);
  const invAcc = await getAccountByCode('1004', companyId, client);
  const cgstAcc = await getAccountByCode('1005', companyId, client);
  const sgstAcc = await getAccountByCode('1006', companyId, client);
  const igstAcc = await getAccountByCode('1007', companyId, client);

  if (!apAcc || !invAcc || !cgstAcc || !sgstAcc || !igstAcc) {
    throw new Error('System chart of accounts could not be initialized.');
  }

  const lines: JournalLineInput[] = [
    {
      accountId: invAcc.id,
      description: `Purchase Bill #${billNo} - ${supplierName}`,
      debit: taxableAmount,
      credit: 0,
    },
  ];

  if (cgstTotal > 0) {
    lines.push({
      accountId: cgstAcc.id,
      description: `Input CGST Credit - Bill #${billNo}`,
      debit: cgstTotal,
      credit: 0,
    });
  }

  if (sgstTotal > 0) {
    lines.push({
      accountId: sgstAcc.id,
      description: `Input SGST Credit - Bill #${billNo}`,
      debit: sgstTotal,
      credit: 0,
    });
  }

  if (igstTotal > 0) {
    lines.push({
      accountId: igstAcc.id,
      description: `Input IGST Credit - Bill #${billNo}`,
      debit: igstTotal,
      credit: 0,
    });
  }

  lines.push({
    accountId: apAcc.id,
    description: `Accounts Payable - Bill #${billNo} (${supplierName})`,
    debit: 0,
    credit: totalAmount,
  });

  return postJournalEntry(
    {
      companyId,
      entryDate: billDate,
      referenceType: EntryReferenceType.PURCHASE,
      referenceId: purchase.id,
      narration: `Purchase Bill #${billNo} from ${supplierName}`,
      createdById: purchase.createdById || undefined,
      lines,
    },
    client
  );
}

/**
 * Creates double-entry records for Customer Receipts and Supplier Payments
 */
export async function recordPaymentAccounting(
  payment: {
    id: string;
    paymentNo: string;
    paymentDate: Date;
    partyType: 'CUSTOMER' | 'SUPPLIER';
    amount: number;
    paymentMode: string;
    partyName: string;
    companyId: string;
    bankAccountId?: string | null;
    createdById?: string | null;
  },
  tx?: Prisma.TransactionClient
) {
  const client = tx || db;
  const { id, paymentNo, paymentDate, partyType, amount, paymentMode, partyName, companyId, createdById } = payment;

  const cashAcc = await getAccountByCode('1001', companyId, client);
  const bankAcc = await getAccountByCode('1002', companyId, client);
  const arAcc = await getAccountByCode('1003', companyId, client);
  const apAcc = await getAccountByCode('2001', companyId, client);

  const moneyAcc = paymentMode === 'CASH' ? cashAcc : bankAcc;
  if (!moneyAcc || !arAcc || !apAcc) {
    throw new Error('System financial accounts missing.');
  }

  const lines: JournalLineInput[] = [];

  if (partyType === 'CUSTOMER') {
    // Customer Receipt: Debit Cash/Bank, Credit AR
    lines.push({
      accountId: moneyAcc.id,
      description: `Receipt #${paymentNo} via ${paymentMode} from ${partyName}`,
      debit: amount,
      credit: 0,
    });
    lines.push({
      accountId: arAcc.id,
      description: `Customer Receipt - ${partyName}`,
      debit: 0,
      credit: amount,
    });
  } else {
    // Supplier Payment: Debit AP, Credit Cash/Bank
    lines.push({
      accountId: apAcc.id,
      description: `Payment to ${partyName} - #${paymentNo}`,
      debit: amount,
      credit: 0,
    });
    lines.push({
      accountId: moneyAcc.id,
      description: `Disbursement via ${paymentMode} to ${partyName}`,
      debit: 0,
      credit: amount,
    });
  }

  return postJournalEntry(
    {
      companyId,
      entryDate: paymentDate,
      referenceType: EntryReferenceType.PAYMENT,
      referenceId: id,
      narration: `${partyType === 'CUSTOMER' ? 'Customer Receipt' : 'Supplier Payment'} #${paymentNo} (${partyName})`,
      createdById: createdById || undefined,
      lines,
    },
    client
  );
}

/**
 * Creates double-entry records for Business Expenses
 */
export async function recordExpenseAccounting(
  expense: {
    id: string;
    expenseNo: string;
    expenseDate: Date;
    amount: number;
    paymentMode: string;
    categoryName: string;
    payeeName?: string | null;
    isGstClaimable: boolean;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    companyId: string;
    createdById?: string | null;
  },
  tx?: Prisma.TransactionClient
) {
  const client = tx || db;
  const { id, expenseNo, expenseDate, amount, paymentMode, categoryName, payeeName, isGstClaimable, cgstAmount, sgstAmount, igstAmount, companyId, createdById } = expense;

  const cashAcc = await getAccountByCode('1001', companyId, client);
  const bankAcc = await getAccountByCode('1002', companyId, client);
  const expAcc = await getAccountByCode('5002', companyId, client);
  const cgstAcc = await getAccountByCode('1005', companyId, client);
  const sgstAcc = await getAccountByCode('1006', companyId, client);
  const igstAcc = await getAccountByCode('1007', companyId, client);

  const moneyAcc = paymentMode === 'CASH' ? cashAcc : bankAcc;
  if (!moneyAcc || !expAcc) throw new Error('System expense accounts missing.');

  const totalPaid = amount + (isGstClaimable ? cgstAmount + sgstAmount + igstAmount : 0);

  const lines: JournalLineInput[] = [
    {
      accountId: expAcc.id,
      description: `Expense #${expenseNo} [${categoryName}] - ${payeeName || 'General'}`,
      debit: amount,
      credit: 0,
    },
  ];

  if (isGstClaimable && cgstAmount > 0 && cgstAcc) {
    lines.push({ accountId: cgstAcc.id, description: `Input CGST on Expense #${expenseNo}`, debit: cgstAmount, credit: 0 });
  }
  if (isGstClaimable && sgstAmount > 0 && sgstAcc) {
    lines.push({ accountId: sgstAcc.id, description: `Input SGST on Expense #${expenseNo}`, debit: sgstAmount, credit: 0 });
  }
  if (isGstClaimable && igstAmount > 0 && igstAcc) {
    lines.push({ accountId: igstAcc.id, description: `Input IGST on Expense #${expenseNo}`, debit: igstAmount, credit: 0 });
  }

  lines.push({
    accountId: moneyAcc.id,
    description: `Paid via ${paymentMode} for ${categoryName}`,
    debit: 0,
    credit: totalPaid,
  });

  return postJournalEntry(
    {
      companyId,
      entryDate: expenseDate,
      referenceType: EntryReferenceType.EXPENSE,
      referenceId: id,
      narration: `Expense #${expenseNo} (${categoryName}) paid to ${payeeName || 'Vendor'}`,
      createdById: createdById || undefined,
      lines,
    },
    client
  );
}

// ---------------------------------------------------------
// FINANCIAL REPORTS GENERATION ENGINES
// ---------------------------------------------------------

export async function getTrialBalance(companyId: string, startDate?: Date, endDate?: Date) {
  const accounts = await db.account.findMany({
    where: { companyId },
    orderBy: { code: 'asc' },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            status: 'POSTED',
            ...(startDate || endDate
              ? {
                  entryDate: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                  },
                }
              : {}),
          },
        },
      },
    },
  });

  let totalDebit = 0;
  let totalCredit = 0;

  const rows = accounts.map((acc) => {
    const sumDebit = acc.journalLines.reduce((s, l) => s + l.debitAmount, 0);
    const sumCredit = acc.journalLines.reduce((s, l) => s + l.creditAmount, 0);

    const isDebitNormal = acc.accountType === AccountType.ASSET || acc.accountType === AccountType.EXPENSE;
    const net = sumDebit - sumCredit;

    let debit = 0;
    let credit = 0;

    if (isDebitNormal) {
      if (net >= 0) debit = net;
      else credit = Math.abs(net);
    } else {
      if (net <= 0) credit = Math.abs(net);
      else debit = net;
    }

    totalDebit += debit;
    totalCredit += credit;

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      accountType: acc.accountType,
      subType: acc.subType,
      totalDebitSum: sumDebit,
      totalCreditSum: sumCredit,
      debitBalance: Number(debit.toFixed(2)),
      creditBalance: Number(credit.toFixed(2)),
    };
  });

  return {
    rows,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.05,
  };
}

export async function getProfitAndLoss(companyId: string, startDate?: Date, endDate?: Date) {
  const accounts = await db.account.findMany({
    where: {
      companyId,
      accountType: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            status: 'POSTED',
            ...(startDate || endDate
              ? {
                  entryDate: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                  },
                }
              : {}),
          },
        },
      },
    },
  });

  let totalRevenue = 0;
  let totalExpenses = 0;

  const revenueAccounts = accounts
    .filter((a) => a.accountType === AccountType.REVENUE)
    .map((a) => {
      const cr = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
      const dr = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
      const amount = cr - dr;
      totalRevenue += amount;
      return { id: a.id, code: a.code, name: a.name, amount: Number(amount.toFixed(2)) };
    });

  const expenseAccounts = accounts
    .filter((a) => a.accountType === AccountType.EXPENSE)
    .map((a) => {
      const dr = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
      const cr = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
      const amount = dr - cr;
      totalExpenses += amount;
      return { id: a.id, code: a.code, name: a.name, amount: Number(amount.toFixed(2)) };
    });

  const netProfit = totalRevenue - totalExpenses;

  return {
    revenueAccounts,
    expenseAccounts,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
  };
}

export async function getBalanceSheet(companyId: string, asOfDate?: Date) {
  const accounts = await db.account.findMany({
    where: {
      companyId,
      accountType: { in: [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY] },
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            status: 'POSTED',
            ...(asOfDate ? { entryDate: { lte: asOfDate } } : {}),
          },
        },
      },
    },
  });

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  const assetAccounts = accounts
    .filter((a) => a.accountType === AccountType.ASSET)
    .map((a) => {
      const dr = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
      const cr = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
      const balance = dr - cr;
      totalAssets += balance;
      return { id: a.id, code: a.code, name: a.name, subType: a.subType, balance: Number(balance.toFixed(2)) };
    });

  const liabilityAccounts = accounts
    .filter((a) => a.accountType === AccountType.LIABILITY)
    .map((a) => {
      const cr = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
      const dr = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
      const balance = cr - dr;
      totalLiabilities += balance;
      return { id: a.id, code: a.code, name: a.name, subType: a.subType, balance: Number(balance.toFixed(2)) };
    });

  const equityAccounts = accounts
    .filter((a) => a.accountType === AccountType.EQUITY)
    .map((a) => {
      const cr = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
      const dr = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
      const balance = cr - dr;
      totalEquity += balance;
      return { id: a.id, code: a.code, name: a.name, subType: a.subType, balance: Number(balance.toFixed(2)) };
    });

  // Calculate Retained Net Profit to date
  const pnl = await getProfitAndLoss(companyId, undefined, asOfDate);
  const retainedProfit = pnl.netProfit;
  totalEquity += retainedProfit;

  return {
    assetAccounts,
    liabilityAccounts,
    equityAccounts,
    retainedProfit: Number(retainedProfit.toFixed(2)),
    totalAssets: Number(totalAssets.toFixed(2)),
    totalLiabilities: Number(totalLiabilities.toFixed(2)),
    totalEquity: Number(totalEquity.toFixed(2)),
    totalLiabilitiesAndEquity: Number((totalLiabilities + totalEquity).toFixed(2)),
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.05,
  };
}
