'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  SlidersHorizontal,
  Edit2,
  CheckCircle2,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'adjustments'>('products');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    unitId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    minStockLevel: 5,
    openingStock: 0,
    hsnCode: '',
    taxRateId: '',
  });

  // Stock Adjustment Modal State
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjProductId, setAdjProductId] = useState('');
  const [adjType, setAdjType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [adjQuantity, setAdjQuantity] = useState(1);
  const [adjReason, setAdjReason] = useState('Physical Stock Audit Count');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/units').then((r) => r.json()),
      fetch('/api/tax-rates').then((r) => r.json()),
      fetch('/api/inventory/movements').then((r) => r.json()),
      fetch('/api/inventory/adjustments').then((r) => r.json()),
    ])
      .then(([prodData, catData, unitData, taxData, movData, adjData]) => {
        setProducts(prodData.products || []);
        setCategories(catData.categories || []);
        setUnits(unitData.units || []);
        setTaxRates(taxData.taxRates || []);
        setMovements(movData.movements || []);
        setAdjustments(adjData.adjustments || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load inventory data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      setShowProductModal(false);
      setEditingProduct(null);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    if (!adjProductId) {
      setFormError('Please select a product.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: adjReason,
          items: [
            {
              productId: adjProductId,
              type: adjType,
              quantity: Number(adjQuantity),
              notes: adjReason,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

      setShowAdjustmentModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      categoryId: categories[0]?.id || '',
      unitId: units[0]?.id || '',
      purchasePrice: 0,
      sellingPrice: 0,
      mrp: 0,
      minStockLevel: 5,
      openingStock: 0,
      hsnCode: '',
      taxRateId: taxRates[0]?.id || '',
    });
    setFormError('');
    setShowProductModal(true);
  };

  const openEditProductModal = (prod: any) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      barcode: prod.barcode || '',
      description: prod.description || '',
      categoryId: prod.categoryId || '',
      unitId: prod.unitId || '',
      purchasePrice: prod.purchasePrice,
      sellingPrice: prod.sellingPrice,
      mrp: prod.mrp,
      minStockLevel: prod.minStockLevel,
      openingStock: prod.openingStock,
      hsnCode: prod.hsnCode || '',
      taxRateId: prod.taxRateId || '',
    });
    setFormError('');
    setShowProductModal(true);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.hsnCode && p.hsnCode.includes(search));
    const matchesCat = categoryFilter === 'ALL' || p.categoryId === categoryFilter;
    const matchesLow = !lowStockFilter || p.currentStock <= p.minStockLevel;
    return matchesSearch && matchesCat && matchesLow;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory & Item Master</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Stock Valuation, Traceable Movements, HSN Codes & Physical Stock Adjustments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAdjustmentModal(true);
                setFormError('');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Stock Adjustment</span>
            </button>
            <button
              onClick={openNewProductModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'products'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Master ({products.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'movements'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Stock Audit Timeline ({movements.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'adjustments'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Adjustments Log ({adjustments.length})</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU or HSN..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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

            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                lowStockFilter
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Low Stock Only</span>
            </button>
          </div>
        </div>

        {/* Product Catalog Table */}
        {activeTab === 'products' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item Name / SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">HSN Code</th>
                    <th className="py-3 px-4 text-right">Purchase (₹)</th>
                    <th className="py-3 px-4 text-right">Selling (₹)</th>
                    <th className="py-3 px-4 text-center">Tax Rate</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No products match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => {
                      const isLow = prod.currentStock <= prod.minStockLevel;
                      const val = prod.currentStock * prod.purchasePrice;
                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{prod.name}</p>
                            <p className="text-[10px] text-indigo-600 font-mono">SKU: {prod.sku}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {prod.category?.name || 'General'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {prod.hsnCode || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatINR(prod.purchasePrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatINR(prod.sellingPrice)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {prod.taxRate?.rate || 18}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-bold text-slate-900">{prod.currentStock}</span>
                              <span className="text-[10px] text-slate-400">{prod.unit?.symbol || 'PCS'}</span>
                              {isLow && (
                                <span className="p-0.5 bg-amber-100 text-amber-700 rounded-full" title="Low Stock Warning">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">
                            {formatINR(val)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => openEditProductModal(prod)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Movements Tab */}
        {activeTab === 'movements' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-center">Quantity</th>
                    <th className="py-3 px-4 text-center">Stock Balance</th>
                    <th className="py-3 px-4">Notes / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {movements.map((m) => {
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(m.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{m.product?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: {m.product?.sku}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {m.movementType}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-center font-bold font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-slate-900">
                          {m.balanceAfter}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {m.notes || m.referenceType || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Adjustments Tab */}
        {activeTab === 'adjustments' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Physical Stock Adjustments Log</h3>
            <div className="divide-y divide-slate-100">
              {adjustments.map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-indigo-600 font-mono">{a.adjustmentNo}</p>
                    <p className="text-slate-500">{new Date(a.date).toLocaleDateString('en-IN')} - Reason: {a.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* NEW / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Product Item' : 'Add New Inventory Item'}
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="E.g. Dell Latitude 5440 Core i7 Laptop"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="E.g. LAP-DELL-5440"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs uppercase font-mono focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="E.g. 890123456701"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    placeholder="E.g. 84713010"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="">-- None --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="">-- None --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax Rate</label>
                  <select
                    value={formData.taxRateId}
                    onChange={(e) => setFormData({ ...formData, taxRateId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="">Default 18%</option>
                    {taxRates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!editingProduct && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Opening Stock Qty</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.openingStock}
                      onChange={(e) => setFormData({ ...formData, openingStock: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Low Stock Warning Level</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Adjust Physical Stock</h2>
              <button onClick={() => setShowAdjustmentModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Item *</label>
                <select
                  required
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Action Type</label>
                  <select
                    value={adjType}
                    onChange={(e: any) => setAdjType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold"
                  >
                    <option value="INCREASE">➕ Stock In (+)</option>
                    <option value="DECREASE">➖ Stock Out (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Adjustment Qty *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Physical audit count, damaged stock, etc."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md"
                >
                  {submitting ? 'Applying...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
