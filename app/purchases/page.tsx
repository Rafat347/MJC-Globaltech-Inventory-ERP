'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  ShoppingCart,
  Plus,
  Search,
  Printer,
  FileText,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';
import { formatINR, numberToWordsINR } from '@/lib/invoicing';

export default function PurchasesPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'bills' | 'orders'>('bills');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Purchase Bill Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
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
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // View Bill Modal State
  const [viewBill, setViewBill] = useState<any>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/purchases/invoices').then((r) => r.json()),
      fetch('/api/purchases/orders').then((r) => r.json()),
      fetch('/api/suppliers').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([billData, ordData, suppData, prodData]) => {
        setBills(billData.bills || []);
        setOrders(ordData.orders || []);
        setSuppliers(suppData.suppliers || []);
        setProducts(prodData.products || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load purchases:', err);
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
      unitPrice: prod.purchasePrice || 0,
      taxRate: prod.taxRate?.rate || 18,
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
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Live calculation for Purchase modal
  const selectedSuppObj = suppliers.find((s) => s.id === selectedSupplier);
  const isInterState = selectedSuppObj ? selectedSuppObj.stateCode !== '29' : false;

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

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedSupplier) {
      setFormError('Please select a supplier.');
      return;
    }
    const validItems = lineItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one valid product.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          supplierInvoiceNo,
          billDate,
          dueDate: dueDate || undefined,
          notes,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record purchase bill');

      setShowNewModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewBill = async (id: string) => {
    try {
      const res = await fetch(`/api/purchases/invoices/${id}`);
      const data = await res.json();
      if (data.bill) {
        setViewBill(data);
      }
    } catch (err) {
      console.error('Failed to view bill:', err);
    }
  };

  const filteredBills = bills.filter(
    (b) =>
      b.billNo.toLowerCase().includes(search.toLowerCase()) ||
      b.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (b.supplierInvoiceNo && b.supplierInvoiceNo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchases & Inward Supplies</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supplier Bills, Input Tax Credit (ITC), Stock Inward & Accounts Payable
            </p>
          </div>
          <button
            onClick={() => {
              setShowNewModal(true);
              setFormError('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Inward Bill</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bills')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'bills'
                ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Purchase Bills ({bills.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Purchase Orders ({orders.length})</span>
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
              placeholder="Search bill number, vendor or invoice..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Purchase Bills Table */}
        {activeTab === 'bills' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Bill #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier / Vendor</th>
                    <th className="py-3 px-4">Supplier Inv #</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Payable</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No purchase bills recorded yet. Click "Record Inward Bill" to add stock.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.billNo}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(b.billDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{b.supplier?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {b.supplier?.gstin || 'Unregistered Vendor'}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {b.supplierInvoiceNo || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          {formatINR(b.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-mono">
                          {formatINR(b.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-600 font-mono font-semibold">
                          {formatINR(b.outstandingAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              b.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : b.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleViewBill(b.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            View
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

        {/* Purchase Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Purchase Orders to Suppliers</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No purchase orders created yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 font-mono">{o.poNo}</p>
                      <p className="text-slate-700 font-medium">{o.supplier?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 font-mono">{formatINR(o.totalAmount)}</p>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
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

      {/* NEW PURCHASE BILL MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Record Inward Purchase Bill</h2>
                <p className="text-xs text-slate-500">
                  Increases stock levels & updates supplier accounts payable
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Supplier / Vendor *
                  </label>
                  <select
                    required
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.state} - {s.stateCode})
                      </option>
                    ))}
                  </select>
                  {selectedSuppObj && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      GSTIN: <span className="font-mono font-semibold">{selectedSuppObj.gstin || 'Unregistered'}</span> |{' '}
                      {isInterState ? (
                        <span className="text-purple-600 font-semibold">Inter-State ITC (IGST)</span>
                      ) : (
                        <span className="text-indigo-600 font-semibold">Intra-State ITC (CGST+SGST)</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor Invoice Number
                  </label>
                  <input
                    type="text"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder="E.g. INV-99214"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bill Date *</label>
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Inward Products (Stock Increment)
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
                        <th className="py-2.5 px-3 w-5/12">Product</th>
                        <th className="py-2.5 px-2 w-2/12">HSN</th>
                        <th className="py-2.5 px-2 w-1/12 text-center">Qty</th>
                        <th className="py-2.5 px-2 w-2/12 text-right">Purchase Price (₹)</th>
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
                                  {p.name} (Current Stock: {p.currentStock})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.hsnCode}
                              onChange={(e) => updateLineItem(idx, 'hsnCode', e.target.value)}
                              placeholder="HSN"
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

              {/* Summary */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Received in good condition at Bangalore warehouse."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs"
                  />
                </div>

                <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-semibold">{formatINR(modalTaxable)}</span>
                  </div>
                  {isInterState ? (
                    <div className="flex justify-between text-purple-700">
                      <span>Input IGST (ITC):</span>
                      <span className="font-mono font-semibold">{formatINR(modalIGST)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-indigo-700">
                        <span>Input CGST (ITC):</span>
                        <span className="font-mono font-semibold">{formatINR(modalCGST)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-700">
                        <span>Input SGST (ITC):</span>
                        <span className="font-mono font-semibold">{formatINR(modalSGST)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900">
                    <span>Total Bill Payable:</span>
                    <span className="font-mono text-slate-900">{formatINR(modalGrandTotal)}</span>
                  </div>
                </div>
              </div>

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
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Recording Purchase...' : 'Save & Stock Inward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BILL MODAL */}
      {viewBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  PURCHASE BILL
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{viewBill.bill.billNo}</h3>
                <p className="text-xs text-slate-500">
                  Vendor: {viewBill.bill.supplier?.name} (GSTIN: {viewBill.bill.supplier?.gstin || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setViewBill(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewBill.bill.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2 px-3">{item.product?.name}</td>
                      <td className="py-2 px-2 text-center font-bold">{item.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatINR(item.unitPrice)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatINR(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-xs">
                <div>
                  <p className="text-slate-500">In Words:</p>
                  <p className="font-bold text-slate-800 italic">{viewBill.amountInWords}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Grand Total:</p>
                  <p className="text-base font-bold text-slate-900 font-mono">
                    {formatINR(viewBill.bill.totalAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewBill(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
