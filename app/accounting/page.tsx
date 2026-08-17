'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  BookOpen,
  Plus,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Wallet,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<
    'coa' | 'trial-balance' | 'pnl' | 'balance-sheet' | 'day-book' | 'cash-book' | 'bank-book' | 'jv'
  >('trial-balance');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [dayBook, setDayBook] = useState<any>(null);
  const [cashBook, setCashBook] = useState<any>(null);
  const [bankBook, setBankBook] = useState<any>(null);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  // New Manual JV Modal State
  const [showJvModal, setShowJvModal] = useState(false);
  const [jvDate, setJvDate] = useState(new Date().toISOString().slice(0, 10));
  const [jvNarration, setJvNarration] = useState('');
  const [jvLines, setJvLines] = useState<Array<{ accountId: string; debit: number; credit: number; description: string }>>([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [jvError, setJvError] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/accounting/accounts').then((r) => r.json()),
      fetch('/api/accounting/trial-balance').then((r) => r.json()),
      fetch('/api/accounting/profit-loss').then((r) => r.json()),
      fetch('/api/accounting/balance-sheet').then((r) => r.json()),
      fetch(`/api/accounting/day-book?date=${selectedDate}`).then((r) => r.json()),
      fetch('/api/accounting/cash-book').then((r) => r.json()),
      fetch('/api/accounting/bank-book').then((r) => r.json()),
      fetch('/api/accounting/journal-entries').then((r) => r.json()),
    ])
      .then(([accData, tbData, pnlData, bsData, dbData, cbData, bbData, jvData]) => {
        setAccounts(accData.accounts || []);
        setTrialBalance(tbData);
        setPnl(pnlData);
        setBalanceSheet(bsData);
        setDayBook(dbData);
        setCashBook(cbData);
        setBankBook(bbData);
        setJournalEntries(jvData.entries || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load accounting:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const addJvLine = () => {
    setJvLines([...jvLines, { accountId: '', debit: 0, credit: 0, description: '' }]);
  };

  const removeJvLine = (index: number) => {
    if (jvLines.length <= 2) return;
    setJvLines(jvLines.filter((_, i) => i !== index));
  };

  const updateJvLine = (index: number, field: string, value: any) => {
    const newLines = [...jvLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setJvLines(newLines);
  };

  const jvTotalDebit = jvLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const jvTotalCredit = jvLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const jvIsBalanced = Math.abs(jvTotalDebit - jvTotalCredit) < 0.01 && jvTotalDebit > 0;

  const handlePostJV = async (e: React.FormEvent) => {
    e.preventDefault();
    setJvError('');

    if (!jvNarration) {
      setJvError('Please enter a narration for the journal voucher.');
      return;
    }
    if (!jvIsBalanced) {
      setJvError(`Unbalanced entry! Debit (₹${jvTotalDebit}) must equal Credit (₹${jvTotalCredit})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate: jvDate,
          narration: jvNarration,
          lines: jvLines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0)),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post JV');

      setShowJvModal(false);
      loadData();
    } catch (err: any) {
      setJvError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Double-Entry Accounting & Financial Statements
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Trial Balance, Balance Sheet, Profit & Loss, Cash/Bank Books, and Chart of Accounts
            </p>
          </div>
          <button
            onClick={() => {
              setShowJvModal(true);
              setJvError('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Post Journal Voucher (JV)</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold overflow-x-auto pb-0.5">
          <button
            onClick={() => setActiveTab('trial-balance')}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'trial-balance'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Trial Balance</span>
          </button>
          <button
            onClick={() => setActiveTab('pnl')}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pnl'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Profit & Loss</span>
          </button>
          <button
            onClick={() => setActiveTab('balance-sheet')}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'balance-sheet'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Balance Sheet</span>
          </button>
          <button
            onClick={() => setActiveTab('coa')}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'coa'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Chart of Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('day-book')}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'day-book'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Day Book</span>
          </button>
          <button
            onClick={() => setActiveTab('cash-book')}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cash-book'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Cash Book</span>
          </button>
          <button
            onClick={() => setActiveTab('bank-book')}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bank-book'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Bank Book</span>
          </button>
          <button
            onClick={() => setActiveTab('jv')}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'jv'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>All Journal Entries ({journalEntries.length})</span>
          </button>
        </div>

        {/* TAB 1: TRIAL BALANCE */}
        {activeTab === 'trial-balance' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Trial Balance Statement</h2>
                <p className="text-xs text-slate-500">
                  Comprehensive ledger balances verifying mathematical debit and credit equality
                </p>
              </div>
              <div className="flex items-center gap-2">
                {trialBalance?.isBalanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Trial Balance is Balanced (Σ Dr = Σ Cr)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Trial Balance Out of Balance
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-20">Code</th>
                    <th className="py-3 px-4">Account Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Debit Balance (₹)</th>
                    <th className="py-3 px-4 text-right">Credit Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {trialBalance?.rows?.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{row.code}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2.5 px-4 text-[11px] text-slate-500">{row.accountType}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {row.debitBalance > 0 ? formatINR(row.debitBalance) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {row.creditBalance > 0 ? formatINR(row.creditBalance) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100/80 font-black text-sm border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-4 text-slate-900 uppercase">
                      Total Trial Balance
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700">
                      {formatINR(trialBalance?.totalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700">
                      {formatINR(trialBalance?.totalCredit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PROFIT & LOSS */}
        {activeTab === 'pnl' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Statement of Profit and Loss</h2>
              <p className="text-xs text-slate-500">Summary of operating revenues and incurred expenses</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-600">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Revenue & Income</h3>
                  <span className="text-xs font-bold text-emerald-800 font-mono">
                    {formatINR(pnl?.totalRevenue)}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {pnl?.revenueAccounts?.map((r: any) => (
                    <div key={r.id} className="py-2 flex justify-between">
                      <span className="text-slate-700">{r.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(r.amount)}</span>
                    </div>
                  ))}
                  {pnl?.revenueAccounts?.length === 0 && (
                    <p className="text-xs text-slate-400 py-3 text-center">No revenue recorded.</p>
                  )}
                </div>
              </div>

              {/* Expenses */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-rose-600">
                  <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                    Operating Expenses
                  </h3>
                  <span className="text-xs font-bold text-rose-800 font-mono">
                    {formatINR(pnl?.totalExpenses)}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {pnl?.expenseAccounts?.map((e: any) => (
                    <div key={e.id} className="py-2 flex justify-between">
                      <span className="text-slate-700">{e.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(e.amount)}</span>
                    </div>
                  ))}
                  {pnl?.expenseAccounts?.length === 0 && (
                    <p className="text-xs text-slate-400 py-3 text-center">No expenses recorded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Net Profit Callout */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Net Operating Profit</p>
                <p className="text-lg font-bold">Total Revenues Minus Total Operating Expenses</p>
              </div>
              <p className="text-2xl font-black font-mono text-emerald-400">
                {formatINR(pnl?.netProfit)}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: BALANCE SHEET */}
        {activeTab === 'balance-sheet' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Statement of Financial Position (Balance Sheet)</h2>
                <p className="text-xs text-slate-500">Assets = Liabilities + Owner's Equity</p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
                Balanced Equation: {formatINR(balanceSheet?.totalAssets)} = {formatINR(balanceSheet?.totalLiabilitiesAndEquity)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-indigo-600">
                  <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Total Assets</h3>
                  <span className="text-xs font-bold text-indigo-800 font-mono">
                    {formatINR(balanceSheet?.totalAssets)}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {balanceSheet?.assetAccounts?.map((a: any) => (
                    <div key={a.id} className="py-2 flex justify-between">
                      <span className="text-slate-700">{a.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(a.balance)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b-2 border-rose-600">
                    <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider">Liabilities</h3>
                    <span className="text-xs font-bold text-rose-800 font-mono">
                      {formatINR(balanceSheet?.totalLiabilities)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {balanceSheet?.liabilityAccounts?.map((l: any) => (
                      <div key={l.id} className="py-1.5 flex justify-between">
                        <span className="text-slate-700">{l.name}</span>
                        <span className="font-mono font-bold text-slate-900">{formatINR(l.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b-2 border-amber-600">
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Equity & Profit</h3>
                    <span className="text-xs font-bold text-amber-800 font-mono">
                      {formatINR(balanceSheet?.totalEquity)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {balanceSheet?.equityAccounts?.map((eq: any) => (
                      <div key={eq.id} className="py-1.5 flex justify-between">
                        <span className="text-slate-700">{eq.name}</span>
                        <span className="font-mono font-bold text-slate-900">{formatINR(eq.balance)}</span>
                      </div>
                    ))}
                    <div className="py-1.5 flex justify-between text-emerald-700 font-bold">
                      <span>Retained Net Profit</span>
                      <span className="font-mono">{formatINR(balanceSheet?.retainedProfit)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHART OF ACCOUNTS */}
        {activeTab === 'coa' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Standard Chart of Accounts (COA)</h2>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Account Title</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Sub-Category</th>
                  <th className="py-2.5 px-4 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{acc.code}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{acc.name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{acc.accountType}</td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{acc.subType}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(acc.currentBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: DAY BOOK */}
        {activeTab === 'day-book' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Day Book Register</h2>
                <p className="text-xs text-slate-500">All journal entries posted on a specific date</p>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold"
              />
            </div>

            <div className="divide-y divide-slate-200">
              {dayBook?.entries?.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No journal entries on this date.</p>
              ) : (
                dayBook?.entries?.map((e: any) => (
                  <div key={e.id} className="py-3 text-xs space-y-2">
                    <div className="flex justify-between font-semibold">
                      <span className="font-mono text-indigo-600">{e.entryNo} - {e.narration}</span>
                      <span className="font-mono">{formatINR(e.totalDebit)}</span>
                    </div>
                    <div className="pl-4 space-y-1 text-slate-600">
                      {e.lines.map((l: any) => (
                        <div key={l.id} className="flex justify-between text-[11px]">
                          <span>{l.account.name}</span>
                          <span className="font-mono">
                            {l.debitAmount > 0 ? `Dr: ${formatINR(l.debitAmount)}` : `Cr: ${formatINR(l.creditAmount)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: CASH BOOK */}
        {activeTab === 'cash-book' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Cash on Hand Register</h2>
                <p className="text-xs text-slate-500">Physical currency inflows, outflows, and cash balance</p>
              </div>
              <span className="text-base font-bold font-mono text-emerald-600">
                Closing Cash: {formatINR(cashBook?.closingBalance)}
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Narration</th>
                  <th className="py-2.5 px-2 text-right">Inflow (₹)</th>
                  <th className="py-2.5 px-2 text-right">Outflow (₹)</th>
                  <th className="py-2.5 px-3 text-right">Running Cash (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {cashBook?.entries?.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500 font-mono">
                      {new Date(e.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2 px-3 text-slate-800">{e.narration}</td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-600">
                      {e.debit > 0 ? formatINR(e.debit) : '-'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-rose-600">
                      {e.credit > 0 ? formatINR(e.credit) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(e.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 7: BANK BOOK */}
        {activeTab === 'bank-book' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Bank Account Register (HDFC Current)</h2>
                <p className="text-xs text-slate-500">Electronic settlements, NEFT/RTGS, UPI transactions</p>
              </div>
              <span className="text-base font-bold font-mono text-indigo-600">
                Closing Bank Balance: {formatINR(bankBook?.closingBalance)}
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Narration</th>
                  <th className="py-2.5 px-2 text-right">Deposits (₹)</th>
                  <th className="py-2.5 px-2 text-right">Withdrawals (₹)</th>
                  <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {bankBook?.entries?.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500 font-mono">
                      {new Date(e.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2 px-3 text-slate-800">{e.narration}</td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-600">
                      {e.debit > 0 ? formatINR(e.debit) : '-'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-rose-600">
                      {e.credit > 0 ? formatINR(e.credit) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                      {formatINR(e.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 8: ALL JOURNAL ENTRIES */}
        {activeTab === 'jv' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">General Journal Entries Timeline</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {journalEntries.map((jv) => (
                <div key={jv.id} className="p-4 text-xs space-y-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-indigo-600 text-sm mr-2">{jv.entryNo}</span>
                      <span className="text-slate-500">
                        {new Date(jv.entryDate).toLocaleDateString('en-IN')} • Ref: {jv.referenceType}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatINR(jv.totalDebit)}</span>
                  </div>
                  <p className="text-slate-800 font-medium">{jv.narration}</p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden mt-2">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <tr>
                          <th className="py-1.5 px-3">Account</th>
                          <th className="py-1.5 px-3">Description</th>
                          <th className="py-1.5 px-2 text-right">Debit (₹)</th>
                          <th className="py-1.5 px-3 text-right">Credit (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jv.lines.map((l: any) => (
                          <tr key={l.id}>
                            <td className="py-1.5 px-3 font-semibold text-slate-800">{l.account?.name}</td>
                            <td className="py-1.5 px-3 text-slate-500">{l.description || '-'}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-900 font-bold">
                              {l.debitAmount > 0 ? formatINR(l.debitAmount) : '-'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-900 font-bold">
                              {l.creditAmount > 0 ? formatINR(l.creditAmount) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* POST MANUAL JOURNAL VOUCHER MODAL */}
      {showJvModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Post Manual Journal Voucher (JV)</h2>
              <button onClick={() => setShowJvModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostJV} className="flex-1 overflow-y-auto mt-4 space-y-4 text-xs">
              {jvError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {jvError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={jvDate}
                    onChange={(e) => setJvDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Narration / Purpose *</label>
                  <input
                    type="text"
                    required
                    value={jvNarration}
                    onChange={(e) => setJvNarration(e.target.value)}
                    placeholder="E.g. Depreciation entry / Adjustment"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-700">Journal Lines (Debits & Credits)</span>
                  <button
                    type="button"
                    onClick={addJvLine}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    + Add Row
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                      <tr>
                        <th className="py-2 px-3 w-5/12">Account Title</th>
                        <th className="py-2 px-2 w-3/12">Description</th>
                        <th className="py-2 px-2 w-2/12 text-right">Debit (₹)</th>
                        <th className="py-2 px-2 w-2/12 text-right">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jvLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <select
                              value={line.accountId}
                              onChange={(e) => updateJvLine(idx, 'accountId', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                            >
                              <option value="">-- Choose Account --</option>
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateJvLine(idx, 'description', e.target.value)}
                              placeholder="Line note"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              value={line.debit || ''}
                              onChange={(e) => updateJvLine(idx, 'debit', Number(e.target.value))}
                              placeholder="0"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              value={line.credit || ''}
                              onChange={(e) => updateJvLine(idx, 'credit', Number(e.target.value))}
                              placeholder="0"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Debit Credit Summary */}
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border">
                <span className="font-bold text-slate-700">Total Balanced Check:</span>
                <div className="flex gap-4 font-mono font-bold">
                  <span className="text-indigo-600">Total Debit: {formatINR(jvTotalDebit)}</span>
                  <span className="text-indigo-600">Total Credit: {formatINR(jvTotalCredit)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowJvModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md"
                >
                  {submitting ? 'Posting...' : 'Post Journal Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
