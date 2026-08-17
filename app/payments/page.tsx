'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  CreditCard,
  Plus,
  Search,
  Printer,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Building,
  Users,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'supplier'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Payment Modal State
  const [showModal, setShowModal] = useState(false);
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Voucher Modal State
  const [voucherData, setVoucherData] = useState<any>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/payments').then((r) => r.json()),
      fetch('/api/customers').then((r) => r.json()),
      fetch('/api/suppliers').then((r) => r.json()),
      fetch('/api/sales/invoices').then((r) => r.json()),
      fetch('/api/purchases/invoices').then((r) => r.json()),
    ])
      .then(([payData, custData, suppData, invData, billData]) => {
        setPayments(payData.payments || []);
        setCustomers(custData.customers || []);
        setSuppliers(suppData.suppliers || []);
        setInvoices(invData.invoices || []);
        setBills(billData.bills || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load payments:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    if (!selectedPartyId) {
      setFormError('Please select a customer or supplier.');
      setSubmitting(false);
      return;
    }
    if (!amount || amount <= 0) {
      setFormError('Please enter a valid payment amount.');
      setSubmitting(false);
      return;
    }

    try {
      const allocations = [];
      if (selectedInvoiceId) {
        if (partyType === 'CUSTOMER') {
          allocations.push({ invoiceId: selectedInvoiceId, allocatedAmount: Number(amount) });
        } else {
          allocations.push({ purchaseInvoiceId: selectedInvoiceId, allocatedAmount: Number(amount) });
        }
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyType,
          customerId: partyType === 'CUSTOMER' ? selectedPartyId : undefined,
          supplierId: partyType === 'SUPPLIER' ? selectedPartyId : undefined,
          paymentMode,
          amount: Number(amount),
          paymentDate,
          referenceNo,
          notes,
          allocations,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter available invoices for the selected party
  const partyInvoices =
    partyType === 'CUSTOMER'
      ? invoices.filter((i) => i.customerId === selectedPartyId && i.outstandingAmount > 0)
      : bills.filter((b) => b.supplierId === selectedPartyId && b.outstandingAmount > 0);

  const filteredPayments = payments.filter((p) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'customer' && p.partyType === 'CUSTOMER') ||
      (activeTab === 'supplier' && p.partyType === 'SUPPLIER');
    const matchesSearch =
      p.paymentNo.toLowerCase().includes(search.toLowerCase()) ||
      (p.customer?.name && p.customer.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.supplier?.name && p.supplier.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.referenceNo && p.referenceNo.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Receipts</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer Collections, Supplier Disbursements, Cash/Bank Vouchers & Invoice Reconciliation
            </p>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setFormError('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment / Receipt</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>All Vouchers ({payments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'customer'
                ? 'border-b-2 border-emerald-600 text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Customer Receipts (Inward)</span>
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'supplier'
                ? 'border-b-2 border-rose-600 text-rose-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <span>Supplier Payments (Outward)</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voucher number, party or ref..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Mode / Ref</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Allocated Document</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => {
                    const isReceipt = pay.partyType === 'CUSTOMER';
                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{pay.paymentNo}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(pay.paymentDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isReceipt
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isReceipt ? 'RECEIPT' : 'PAYMENT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {pay.customer?.name || pay.supplier?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <p className="font-semibold">{pay.paymentMode}</p>
                          {pay.referenceNo && (
                            <p className="text-[10px] text-slate-400 font-mono">Ref: {pay.referenceNo}</p>
                          )}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold font-mono text-sm ${
                            isReceipt ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {formatINR(pay.amount)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {pay.allocations?.map((a: any) => (
                            <span
                              key={a.id}
                              className="inline-block bg-slate-100 px-1.5 py-0.5 rounded mr-1 text-[10px]"
                            >
                              {a.invoice?.invoiceNo || a.purchaseInvoice?.billNo || 'On Account'} (
                              {formatINR(a.allocatedAmount)})
                            </span>
                          ))}
                          {pay.allocations?.length === 0 && <span className="text-slate-400">On Account</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                            {pay.status}
                          </span>
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

      {/* RECORD PAYMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Record Payment / Receipt Voucher</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Type</label>
                  <select
                    value={partyType}
                    onChange={(e: any) => {
                      setPartyType(e.target.value);
                      setSelectedPartyId('');
                      setSelectedInvoiceId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold"
                  >
                    <option value="CUSTOMER">🟢 Customer Receipt (Inward)</option>
                    <option value="SUPPLIER">🔴 Supplier Payment (Outward)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {partyType === 'CUSTOMER' ? 'Customer *' : 'Supplier *'}
                  </label>
                  <select
                    required
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium"
                  >
                    <option value="">-- Choose Party --</option>
                    {partyType === 'CUSTOMER'
                      ? customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Due: {formatINR(c.currentBalance)})
                          </option>
                        ))
                      : suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Payable: {formatINR(s.currentBalance)})
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {selectedPartyId && partyInvoices.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Allocate to Document (Optional)
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="">-- On Account (No specific invoice) --</option>
                    {partyInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo || inv.billNo} - Outstanding: {formatINR(inv.outstandingAmount)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="E.g. 50000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash on Hand</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="CARD">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reference / UTR / Cheque #</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="E.g. UTR-49912001"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Part payment received via Bank."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                />
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
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md"
                >
                  {submitting ? 'Posting...' : 'Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
