'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  QrCode,
  X,
} from 'lucide-react';
import { formatINR, numberToWordsINR } from '@/lib/invoicing';

export default function SalesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotations' | 'orders'>('invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // New Invoice Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 15');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<
    Array<{
      productId: string;
      description: string;
      hsnCode: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
      availableStock: number;
    }>
  >([
    {
      productId: '',
      description: '',
      hsnCode: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxRate: 18,
      availableStock: 0,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Print Invoice Modal State
  const [printInvoice, setPrintInvoice] = useState<any>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/sales/invoices').then((r) => r.json()),
      fetch('/api/sales/quotations').then((r) => r.json()),
      fetch('/api/sales/orders').then((r) => r.json()),
      fetch('/api/customers').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([invData, qtnData, ordData, custData, prodData]) => {
        setInvoices(invData.invoices || []);
        setQuotations(qtnData.quotations || []);
        setOrders(ordData.orders || []);
        setCustomers(custData.customers || []);
        setProducts(prodData.products || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load sales data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const newLines = [...lineItems];
    newLines[index] = {
      ...newLines[index],
      productId: prod.id,
      description: prod.name,
      hsnCode: prod.hsnCode || '',
      unitPrice: prod.sellingPrice,
      taxRate: prod.taxRate?.rate || 18,
      availableStock: prod.currentStock,
    };
    setLineItems(newLines);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newLines = [...lineItems];
    newLines[index] = { ...newLines[index], [field]: value };
    setLineItems(newLines);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: '',
        description: '',
        hsnCode: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: 18,
        availableStock: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Compute live totals for modal
  const selectedCustObj = customers.find((c) => c.id === selectedCustomer);
  const isInterState = selectedCustObj ? selectedCustObj.stateCode !== '29' : false;

  let modalSubtotal = 0;
  let modalDiscount = 0;
  let modalTaxable = 0;
  let modalCGST = 0;
  let modalSGST = 0;
  let modalIGST = 0;

  lineItems.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const itemSub = qty * price;
    modalSubtotal += itemSub;

    const disc = (itemSub * (Number(item.discountPercent) || 0)) / 100;
    modalDiscount += disc;

    const taxable = Math.max(0, itemSub - disc);
    modalTaxable += taxable;

    const rate = Number(item.taxRate) || 0;
    if (isInterState) {
      modalIGST += (taxable * rate) / 100;
    } else {
      modalCGST += (taxable * (rate / 2)) / 100;
      modalSGST += (taxable * (rate / 2)) / 100;
    }
  });

  const modalTotalTax = modalCGST + modalSGST + modalIGST;
  const modalRawGrand = modalTaxable + modalTotalTax;
  const modalGrandTotal = Math.round(modalRawGrand);
  const modalRoundOff = modalGrandTotal - modalRawGrand;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedCustomer) {
      setFormError('Please select a customer.');
      return;
    }
    const validItems = lineItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one valid product item.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          invoiceDate,
          dueDate: dueDate || undefined,
          paymentTerms,
          notes,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invoice');

      setShowNewModal(false);
      loadData();
      // Open print preview immediately
      handleViewInvoice(data.invoice.id);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/sales/invoices/${id}`);
      const data = await res.json();
      if (data.invoice) {
        setPrintInvoice(data);
      }
    } catch (err) {
      console.error('Failed to fetch invoice for print:', err);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales & Billing Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              GST Tax Invoices, Quotations, Customer Ledger & Dynamic UPI Billing
            </p>
          </div>
          <button
            onClick={() => {
              setShowNewModal(true);
              setFormError('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sales Invoice</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Tax Invoices ({invoices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('quotations')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'quotations'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Quotations / Estimates ({quotations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Sales Orders ({orders.length})</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or customer..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
              <option value="UNPAID">UNPAID</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        {activeTab === 'invoices' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Tax Breakdown</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No sales invoices found. Click "Create Sales Invoice" to start billing.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {inv.invoiceNo}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{inv.customer?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {inv.customer?.gstin || 'B2C (Unregistered)'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {inv.isInterState ? (
                            <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              IGST: {formatINR(inv.igstTotal)}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              CGST+SGST: {formatINR(inv.cgstTotal + inv.sgstTotal)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          {formatINR(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-mono">
                          {formatINR(inv.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-600 font-mono font-semibold">
                          {formatINR(inv.outstandingAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleViewInvoice(inv.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print / View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quotations Tab */}
        {activeTab === 'quotations' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Quotations & Estimates</h3>
            {quotations.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No quotations generated yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <div key={q.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-indigo-600 font-mono">{q.quotationNo}</p>
                      <p className="text-slate-700 font-medium">{q.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 font-mono">{formatINR(q.totalAmount)}</p>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {q.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sales Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Confirmed Sales Orders</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No sales orders generated yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-indigo-600 font-mono">{o.orderNo}</p>
                      <p className="text-slate-700 font-medium">{o.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 font-mono">{formatINR(o.totalAmount)}</p>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* NEW INVOICE CREATION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Create New Sales Tax Invoice</h2>
                <p className="text-xs text-slate-500">Atomic inventory decrement & double-entry ledger posting</p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateInvoice} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer & Invoice Meta Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Customer *
                  </label>
                  <select
                    required
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.state} - {c.stateCode})
                      </option>
                    ))}
                  </select>
                  {selectedCustObj && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      GSTIN: <span className="font-mono font-semibold">{selectedCustObj.gstin || 'Unregistered'}</span> |{' '}
                      {isInterState ? (
                        <span className="text-purple-600 font-semibold">Inter-State (IGST)</span>
                      ) : (
                        <span className="text-indigo-600 font-semibold">Intra-State (CGST+SGST)</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                  </input>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Net 15 / Due on Receipt"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Billed Products & Services
                  </h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Row
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-5/12">Product / Description</th>
                        <th className="py-2.5 px-2 w-2/12">HSN</th>
                        <th className="py-2.5 px-2 w-1/12 text-center">Qty</th>
                        <th className="py-2.5 px-2 w-2/12 text-right">Price (₹)</th>
                        <th className="py-2.5 px-2 w-1/12 text-center">Disc%</th>
                        <th className="py-2.5 px-2 w-1/12 text-center">GST%</th>
                        <th className="py-2.5 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <select
                              value={item.productId}
                              onChange={(e) => handleProductSelect(idx, e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">-- Choose Product --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (Stock: {p.currentStock})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.hsnCode}
                              onChange={(e) => updateLineItem(idx, 'hsnCode', e.target.value)}
                              placeholder="HSN/SAC"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-center font-bold"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(idx, 'unitPrice', Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => updateLineItem(idx, 'discountPercent', Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-center font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.taxRate}
                              onChange={(e) => updateLineItem(idx, 'taxRate', Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono text-center"
                            >
                              <option value="18">18%</option>
                              <option value="12">12%</option>
                              <option value="28">28%</option>
                              <option value="5">5%</option>
                              <option value="0">0%</option>
                            </select>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax & Summary Calculation Breakdown */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
                <div className="flex-1 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Customer Notes & Terms</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. Thank you for your business. Delivered via BlueDart."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatINR(modalSubtotal)}</span>
                  </div>
                  {modalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Total Discount:</span>
                      <span className="font-mono font-semibold">-{formatINR(modalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-semibold">{formatINR(modalTaxable)}</span>
                  </div>

                  {isInterState ? (
                    <div className="flex justify-between text-purple-700">
                      <span>IGST Total:</span>
                      <span className="font-mono font-semibold">{formatINR(modalIGST)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-indigo-700">
                        <span>CGST Total:</span>
                        <span className="font-mono font-semibold">{formatINR(modalCGST)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-700">
                        <span>SGST Total:</span>
                        <span className="font-mono font-semibold">{formatINR(modalSGST)}</span>
                      </div>
                    </>
                  )}

                  {modalRoundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">{formatINR(modalRoundOff)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-indigo-600">{formatINR(modalGrandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Generating Invoice...' : 'Save & Issue Tax Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE TAX INVOICE MODAL */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Top Control Bar */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold">Printable Tax Invoice Preview</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Invoice
                </button>
                <button
                  onClick={() => setPrintInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Tax Invoice Paper (A4 Formatted) */}
            <div className="flex-1 overflow-y-auto p-8 bg-white print-container text-slate-900 select-text">
              {/* Header Box */}
              <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <div className="text-xl font-black text-indigo-700 tracking-tight">
                    {printInvoice.invoice.company?.tradeName || printInvoice.invoice.company?.name}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{printInvoice.invoice.company?.address}</p>
                  <p className="text-xs text-slate-600">
                    {printInvoice.invoice.company?.city}, {printInvoice.invoice.company?.state} - {printInvoice.invoice.company?.pincode}
                  </p>
                  <p className="text-xs text-slate-800 font-bold mt-1">
                    GSTIN: <span className="font-mono">{printInvoice.invoice.company?.gstin || 'N/A'}</span> | PAN:{' '}
                    <span className="font-mono">{printInvoice.invoice.company?.pan || 'N/A'}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded">
                    TAX INVOICE
                  </span>
                  <p className="text-sm font-mono font-bold text-indigo-600 mt-2">
                    {printInvoice.invoice.invoiceNo}
                  </p>
                  <p className="text-xs text-slate-500">
                    Date: {new Date(printInvoice.invoice.invoiceDate).toLocaleDateString('en-IN')}
                  </p>
                  {printInvoice.invoice.dueDate && (
                    <p className="text-xs text-slate-500">
                      Due: {new Date(printInvoice.invoice.dueDate).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
              </div>

              {/* Billed To / Shipped To Box */}
              <div className="grid grid-cols-2 gap-6 my-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[10px]">Billed To (Customer):</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{printInvoice.invoice.customer.name}</p>
                  <p className="text-slate-600">{printInvoice.invoice.customer.billingAddress}</p>
                  <p className="text-slate-600">
                    State: <span className="font-bold">{printInvoice.invoice.customer.state} ({printInvoice.invoice.customer.stateCode})</span>
                  </p>
                  <p className="text-slate-800 font-bold mt-1 font-mono">
                    GSTIN: {printInvoice.invoice.customer.gstin || 'Unregistered / Consumer'}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-slate-500 uppercase text-[10px]">Payment & Bank Details:</p>
                  <p className="text-slate-800 font-medium mt-0.5">Bank: {printInvoice.invoice.company?.bankName}</p>
                  <p className="text-slate-800 font-mono">A/c No: {printInvoice.invoice.company?.bankAccountNo}</p>
                  <p className="text-slate-800 font-mono">IFSC: {printInvoice.invoice.company?.bankIfsc}</p>
                  <p className="text-slate-800 font-mono">UPI ID: {printInvoice.invoice.company?.upiId}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-slate-300 my-4">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-10 text-center">#</th>
                    <th className="p-2 border-r border-slate-300">Item Description</th>
                    <th className="p-2 border-r border-slate-300 text-center">HSN</th>
                    <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right">Rate (₹)</th>
                    <th className="p-2 border-r border-slate-300 text-center">GST%</th>
                    <th className="p-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printInvoice.invoice.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 border-r border-slate-300 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-medium">
                        {item.description || item.product?.name}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-600">
                        {item.hsnCode || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{item.quantity}</td>
                      <td className="p-2 border-r border-slate-300 text-right font-mono">
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono">{item.taxRate}%</td>
                      <td className="p-2 text-right font-mono font-bold">{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculation Summary & Dynamic UPI QR */}
              <div className="grid grid-cols-2 gap-6 items-start mt-4">
                <div>
                  {/* Amount in Words */}
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                    <p className="font-bold text-slate-500 uppercase text-[10px]">Amount in Words:</p>
                    <p className="font-bold text-slate-900 mt-1 italic">{printInvoice.amountInWords}</p>
                  </div>

                  {/* QR Code Pay section */}
                  {printInvoice.invoice.company?.upiId && (
                    <div className="mt-3 p-3 bg-indigo-50/50 rounded border border-indigo-100 flex items-center gap-3">
                      <div className="w-14 h-14 bg-white border border-indigo-200 rounded flex items-center justify-center flex-shrink-0">
                        <QrCode className="w-10 h-10 text-indigo-600" />
                      </div>
                      <div className="text-[11px]">
                        <p className="font-bold text-slate-800">Scan & Pay via UPI</p>
                        <p className="text-slate-500 font-mono">{printInvoice.invoice.company?.upiId}</p>
                        <p className="text-indigo-600 font-semibold mt-0.5">Instant Reconciliation</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-semibold">
                      ₹{printInvoice.invoice.subtotal.toFixed(2)}
                    </span>
                  </div>

                  {printInvoice.invoice.isInterState ? (
                    <div className="flex justify-between text-purple-700">
                      <span>Output IGST:</span>
                      <span className="font-mono font-semibold">
                        ₹{printInvoice.invoice.igstTotal.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-indigo-700">
                        <span>Output CGST:</span>
                        <span className="font-mono font-semibold">
                          ₹{printInvoice.invoice.cgstTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-indigo-700">
                        <span>Output SGST:</span>
                        <span className="font-mono font-semibold">
                          ₹{printInvoice.invoice.sgstTotal.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="border-t border-slate-300 pt-1.5 flex justify-between text-sm font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-indigo-700">
                      ₹{printInvoice.invoice.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms & Signature Box */}
              <div className="grid grid-cols-2 gap-6 mt-8 pt-4 border-t border-slate-300 text-xs">
                <div>
                  <p className="font-bold text-slate-700 uppercase text-[10px]">Terms & Conditions:</p>
                  <p className="text-slate-500 text-[11px] whitespace-pre-line mt-1">
                    {printInvoice.invoice.termsAndConditions || 'Subject to local jurisdiction.'}
                  </p>
                </div>
                <div className="text-right flex flex-col justify-end items-end">
                  <p className="text-[11px] font-bold text-slate-800">
                    For {printInvoice.invoice.company?.tradeName || printInvoice.invoice.company?.name}
                  </p>
                  <div className="h-12" />
                  <p className="text-[10px] text-slate-500 border-t border-slate-400 pt-1 w-44 text-center">
                    Authorized Signatory
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
