'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  TrendingDown,
  Plus,
  Search,
  Tag,
  Receipt,
  X,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // New Expense Modal State
  const [showModal, setShowModal] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [payeeName, setPayeeName] = useState('');
  const [description, setDescription] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [isGstClaimable, setIsGstClaimable] = useState(false);
  const [gstin, setGstin] = useState('');
  const [cgstAmount, setCgstAmount] = useState<number>(0);
  const [sgstAmount, setSgstAmount] = useState<number>(0);
  const [igstAmount, setIgstAmount] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/expenses').then((r) => r.json()),
      fetch('/api/expenses/categories').then((r) => r.json()),
    ])
      .then(([expData, catData]) => {
        setExpenses(expData.expenses || []);
        setCategories(catData.categories || []);
        if (catData.categories?.length > 0 && !categoryId) {
          setCategoryId(catData.categories[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load expenses:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    if (!categoryId) {
      setFormError('Please select an expense category.');
      setSubmitting(false);
      return;
    }
    if (!amount || amount <= 0) {
      setFormError('Please enter a valid expense amount.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: Number(amount),
          expenseDate,
          paymentMode,
          payeeName,
          description,
          referenceNo,
          isGstClaimable,
          gstin,
          cgstAmount: Number(cgstAmount) || 0,
          sgstAmount: Number(sgstAmount) || 0,
          igstAmount: Number(igstAmount) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record expense');

      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpensesAmount = expenses.reduce((s, e) => s + e.totalWithTax, 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = categoryFilter === 'ALL' || e.categoryId === categoryFilter;
    const matchesSearch =
      e.expenseNo.toLowerCase().includes(search.toLowerCase()) ||
      (e.payeeName && e.payeeName.toLowerCase().includes(search.toLowerCase())) ||
      (e.category?.name && e.category.name.toLowerCase().includes(search.toLowerCase())) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Expense Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Operating Overheads, Vendor Payouts, Input GST Claimable Expenses & General Ledger Flow
            </p>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setFormError('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Log Business Expense</span>
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-medium text-slate-500">Total Expenses Logged</span>
            <p className="text-xl font-bold text-slate-900 font-mono mt-1">
              {formatINR(totalExpensesAmount)}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-medium text-slate-500">Expense Entries Count</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{expenses.length} Records</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-medium text-slate-500">Active Categories</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{categories.length} Categories</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payee, category or description..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Expenses Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Expense #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payee / Vendor</th>
                  <th className="py-3 px-4">Mode / Ref</th>
                  <th className="py-3 px-4 text-center">GST Claimable</th>
                  <th className="py-3 px-4 text-right">Tax (₹)</th>
                  <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No expense records found. Click "Log Business Expense" to record office costs.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const totalTax = exp.cgstAmount + exp.sgstAmount + exp.igstAmount;
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{exp.expenseNo}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(exp.expenseDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                            <Tag className="w-3 h-3 text-indigo-500" />
                            {exp.category?.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {exp.payeeName || 'General Payee'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <p className="font-semibold">{exp.paymentMode}</p>
                          {exp.referenceNo && (
                            <p className="text-[10px] text-slate-400 font-mono">Ref: {exp.referenceNo}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {exp.isGstClaimable ? (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                              Yes (ITC)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {totalTax > 0 ? formatINR(totalTax) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatINR(exp.totalWithTax)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LOG EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Log Business Expense</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="E.g. 15000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (HDFC Bank)</option>
                    <option value="UPI">UPI (Google Pay/Paytm)</option>
                    <option value="CASH">Cash on Hand</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Credit / Debit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payee / Vendor Name</label>
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="E.g. BESCOM / Office Landlord"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reference / Bill #</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="E.g. BILL-AUG-102"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Narration</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Monthly office maintenance and supplies"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* GST Input Tax Credit Option */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGstClaimable}
                    onChange={(e) => setIsGstClaimable(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-slate-800">Claim GST Input Tax Credit (ITC) for this expense</span>
                </label>

                {isGstClaimable && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">CGST (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={cgstAmount || ''}
                        onChange={(e) => setCgstAmount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">SGST (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={sgstAmount || ''}
                        onChange={(e) => setSgstAmount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">IGST (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={igstAmount || ''}
                        onChange={(e) => setIgstAmount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md"
                >
                  {submitting ? 'Recording...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
