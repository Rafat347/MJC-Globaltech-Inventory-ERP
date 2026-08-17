'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Percent,
  FileSpreadsheet,
  Download,
  Building2,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';
import { INDIAN_STATES } from '@/lib/gst';

export default function GSTHubPage() {
  const [gstData, setGstData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gstr3b' | 'gstr1' | 'hsn' | 'states'>('gstr3b');

  useEffect(() => {
    fetch('/api/reports/gst')
      .then((r) => r.json())
      .then((data) => {
        setGstData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load GST data:', err);
        setLoading(false);
      });
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">GST & Indian Tax Compliance Hub</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              GSTR-1 Outward Supplies, GSTR-3B Tax Liability vs Input Tax Credit (ITC), and HSN Master
            </p>
          </div>
          <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            <span>State Rule: Intra-State (CGST+SGST) | Inter-State (IGST)</span>
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('gstr3b')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'gstr3b'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>GSTR-3B Tax Liability & ITC</span>
          </button>
          <button
            onClick={() => setActiveTab('gstr1')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'gstr1'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>GSTR-1 Outward Supplies</span>
          </button>
          <button
            onClick={() => setActiveTab('hsn')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'hsn'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>HSN-Wise Tax Breakdown</span>
          </button>
          <button
            onClick={() => setActiveTab('states')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'states'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>State Code Directory</span>
          </button>
        </div>

        {/* TAB 1: GSTR-3B */}
        {activeTab === 'gstr3b' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Outward Tax */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase">1. Output Tax Liability (Sales)</span>
                <p className="text-xl font-bold font-mono text-slate-900">
                  {formatINR(gstData?.gstr3b?.outwardTax?.total)}
                </p>
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>CGST 9%:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.outwardTax?.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST 9%:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.outwardTax?.sgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IGST 18%:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.outwardTax?.igst)}</span>
                  </div>
                </div>
              </div>

              {/* Input Tax Credit */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-emerald-700 uppercase">2. Input Tax Credit (Purchases/ITC)</span>
                <p className="text-xl font-bold font-mono text-emerald-700">
                  {formatINR(gstData?.gstr3b?.inputTaxCredit?.total)}
                </p>
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Eligible CGST:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.inputTaxCredit?.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eligible SGST:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.inputTaxCredit?.sgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eligible IGST:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.inputTaxCredit?.igst)}</span>
                  </div>
                </div>
              </div>

              {/* Net Payable */}
              <div className="p-5 bg-slate-900 text-white rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-indigo-400 uppercase">3. Net GST Payable to Govt</span>
                <p className="text-2xl font-black font-mono text-emerald-400">
                  {formatINR(gstData?.gstr3b?.netPayable?.total)}
                </p>
                <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Net CGST:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.netPayable?.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net SGST:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.netPayable?.sgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net IGST:</span>
                    <span className="font-mono">{formatINR(gstData?.gstr3b?.netPayable?.igst)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GSTR-1 */}
        {activeTab === 'gstr1' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">GSTR-1 Outward Supplies Statement</h2>
              <p className="text-xs text-slate-500">B2B Registered Tax Invoices & B2C Consumer Sales</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border">
                <span className="text-xs font-bold text-slate-600">B2B Registered Invoices</span>
                <p className="text-lg font-bold text-indigo-600 mt-1">
                  {gstData?.gstr1?.b2bInvoices?.length || 0} Invoices
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border">
                <span className="text-xs font-bold text-slate-600">B2C Consumer Invoices</span>
                <p className="text-lg font-bold text-slate-700 mt-1">
                  {gstData?.gstr1?.b2cInvoices?.length || 0} Invoices
                </p>
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">GSTIN</th>
                  <th className="py-2.5 px-2 text-right">Taxable Value</th>
                  <th className="py-2.5 px-2 text-right">CGST</th>
                  <th className="py-2.5 px-2 text-right">SGST</th>
                  <th className="py-2.5 px-2 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">Invoice Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {gstData?.gstr1?.b2bInvoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-indigo-600">{inv.invoiceNo}</td>
                    <td className="py-2 px-3">{inv.customer?.name}</td>
                    <td className="py-2 px-3 font-mono text-[11px] font-bold">{inv.customer?.gstin}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatINR(inv.subtotal - inv.discountAmount)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatINR(inv.cgstTotal)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatINR(inv.sgstTotal)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatINR(inv.igstTotal)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{formatINR(inv.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: HSN SUMMARY */}
        {activeTab === 'hsn' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">HSN/SAC Code-Wise Sales Tax Summary</h2>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">HSN / SAC</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-2 text-center">Total Quantity</th>
                  <th className="py-2.5 px-2 text-right">Taxable Value (₹)</th>
                  <th className="py-2.5 px-2 text-right">CGST (₹)</th>
                  <th className="py-2.5 px-2 text-right">SGST (₹)</th>
                  <th className="py-2.5 px-2 text-right">IGST (₹)</th>
                  <th className="py-2.5 px-4 text-right">Grand Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {gstData?.hsnSummary?.map((h: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{h.hsn}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{h.description}</td>
                    <td className="py-2.5 px-2 text-center font-bold">{h.qty}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatINR(h.taxable)}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatINR(h.cgst)}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatINR(h.sgst)}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatINR(h.igst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-700">
                      {formatINR(h.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: STATE CODES */}
        {activeTab === 'states' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Official Indian GST State Code Master</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {INDIAN_STATES.map((s) => (
                <div key={s.code} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className="font-mono font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                    {s.code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
