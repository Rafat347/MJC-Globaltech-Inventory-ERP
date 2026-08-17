'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Users,
  UserPlus,
  Search,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';
import { INDIAN_STATES } from '@/lib/gst';

export default function PartiesPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Party Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    gstin: '',
    pan: '',
    email: '',
    phone: '',
    address: '',
    state: 'Karnataka',
    stateCode: '29',
    city: '',
    pincode: '',
    creditLimit: 0,
    openingBalance: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // 360-Degree Ledger Drawer State
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/customers').then((r) => r.json()),
      fetch('/api/suppliers').then((r) => r.json()),
    ])
      .then(([custData, suppData]) => {
        setCustomers(custData.customers || []);
        setSuppliers(suppData.suppliers || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load parties:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStateChange = (stateName: string) => {
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    setFormData({
      ...formData,
      state: stateName,
      stateCode: found ? found.code : '29',
    });
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const endpoint = partyType === 'customer' ? '/api/customers' : '/api/suppliers';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save party');

      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openLedger = async (id: string, type: 'customer' | 'supplier') => {
    setLoadingLedger(true);
    setLedgerData(null);
    try {
      const endpoint =
        type === 'customer' ? `/api/customers/${id}/ledger` : `/api/suppliers/${id}/ledger`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setLedgerData({ ...data, type });
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const currentList = activeTab === 'customers' ? customers : suppliers;
  const filteredList = currentList.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.companyName && p.companyName.toLowerCase().includes(search.toLowerCase())) ||
      (p.gstin && p.gstin.includes(search)) ||
      (p.phone && p.phone.includes(search))
  );

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Party Directory & Ledgers</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              360-Degree Customer & Supplier Profiles, Transaction Audit, and Outstanding Balances
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPartyType('customer');
                setFormData({
                  name: '',
                  companyName: '',
                  gstin: '',
                  pan: '',
                  email: '',
                  phone: '',
                  address: '',
                  state: 'Karnataka',
                  stateCode: '29',
                  city: '',
                  pincode: '',
                  creditLimit: 0,
                  openingBalance: 0,
                });
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
            <button
              onClick={() => {
                setPartyType('supplier');
                setFormData({
                  name: '',
                  companyName: '',
                  gstin: '',
                  pan: '',
                  email: '',
                  phone: '',
                  address: '',
                  state: 'Karnataka',
                  stateCode: '29',
                  city: '',
                  pincode: '',
                  creditLimit: 0,
                  openingBalance: 0,
                });
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('customers')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers / Debtors ({customers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'suppliers'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Suppliers / Creditors ({suppliers.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Parties List Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Code / Party Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">GSTIN & PAN</th>
                  <th className="py-3 px-4">State & Location</th>
                  {activeTab === 'customers' && <th className="py-3 px-4 text-right">Credit Limit</th>}
                  <th className="py-3 px-4 text-right">
                    {activeTab === 'customers' ? 'Outstanding Receivable' : 'Outstanding Payable'}
                  </th>
                  <th className="py-3 px-4 text-center">360° Financial Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No parties found.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-indigo-600 font-mono">
                          {p.customerCode || p.supplierCode} {p.companyName ? `• ${p.companyName}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-800">{p.phone || '-'}</p>
                        <p className="text-[10px] text-slate-400">{p.email || '-'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-slate-800">{p.gstin || 'Unregistered'}</p>
                        {p.pan && <p className="text-[10px] text-slate-400 font-mono">PAN: {p.pan}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-800">{p.state} ({p.stateCode})</p>
                        <p className="text-[10px] text-slate-400">{p.city || '-'}</p>
                      </td>
                      {activeTab === 'customers' && (
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {p.creditLimit > 0 ? formatINR(p.creditLimit) : 'No Limit'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        <span
                          className={
                            p.currentBalance > 0
                              ? activeTab === 'customers'
                                ? 'text-rose-600'
                                : 'text-amber-600'
                              : 'text-slate-600'
                          }
                        >
                          {formatINR(p.currentBalance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openLedger(p.id, activeTab === 'customers' ? 'customer' : 'supplier')}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>View Ledger</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 360-DEGREE FINANCIAL LEDGER DRAWER */}
      {(ledgerData || loadingLedger) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  360° Financial Ledger
                </span>
                <h2 className="text-base font-bold mt-0.5">
                  {ledgerData?.customer?.name || ledgerData?.supplier?.name || 'Loading Party...'}
                </h2>
              </div>
              <button
                onClick={() => setLedgerData(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingLedger ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {ledgerData?.type === 'customer' ? 'Total Sales Billed' : 'Total Purchases'}
                    </span>
                    <p className="text-sm font-bold text-slate-900 font-mono mt-1">
                      {formatINR(ledgerData?.totalSales || ledgerData?.totalPurchases || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">
                      {ledgerData?.type === 'customer' ? 'Total Collected' : 'Total Paid Out'}
                    </span>
                    <p className="text-sm font-bold text-emerald-700 font-mono mt-1">
                      {formatINR(ledgerData?.totalPaid || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-700 uppercase">
                      Outstanding Balance
                    </span>
                    <p className="text-sm font-bold text-rose-700 font-mono mt-1">
                      {formatINR(ledgerData?.outstandingBalance || ledgerData?.outstandingPayable || 0)}
                    </p>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Chronological Ledger Entries
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Reference / Details</th>
                          <th className="py-2.5 px-2 text-right">Debit (₹)</th>
                          <th className="py-2.5 px-2 text-right">Credit (₹)</th>
                          <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {ledgerData?.ledger?.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">
                              No financial transactions recorded for this party.
                            </td>
                          </tr>
                        ) : (
                          ledgerData?.ledger?.map((entry: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 text-slate-500 font-mono">
                                {new Date(entry.date).toLocaleDateString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-slate-800">{entry.narration}</p>
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono text-slate-900">
                                {entry.debit > 0 ? formatINR(entry.debit) : '-'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono text-emerald-600">
                                {entry.credit > 0 ? formatINR(entry.credit) : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                                {formatINR(entry.balance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD PARTY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Add New {partyType === 'customer' ? 'Customer' : 'Supplier'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {partyType === 'customer' ? 'Customer Name' : 'Supplier Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="E.g. Acme Enterprises"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="29AABCU9603R1ZM"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98450 12345"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State *</label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {partyType === 'customer' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md"
                >
                  {submitting ? 'Saving...' : 'Save Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
