'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Scale,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Package,
  Users,
  Percent,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';

export default function ReportsPage() {
  const [salesReport, setSalesReport] = useState<any>(null);
  const [purchReport, setPurchReport] = useState<any>(null);
  const [stockReport, setStockReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports/sales').then((r) => r.json()),
      fetch('/api/reports/purchases').then((r) => r.json()),
      fetch('/api/reports/stock').then((r) => r.json()),
    ])
      .then(([s, p, st]) => {
        setSalesReport(s);
        setPurchReport(p);
        setStockReport(st);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load reports:', err);
        setLoading(false);
      });
  }, []);

  const reportCards = [
    {
      title: 'Sales & Invoicing Report',
      description: 'Customer-wise sales, GST breakdowns (CGST/SGST/IGST), outstanding balances and revenue trends.',
      icon: Receipt,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      href: '/sales',
      stat: `Billed: ${formatINR(salesReport?.grandTotal)}`,
    },
    {
      title: 'Purchases & Supplier Dues',
      description: 'Vendor invoices, input tax credit records, bill payment statuses, and accounts payable.',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
      href: '/purchases',
      stat: `Total Inward: ${formatINR(purchReport?.grandTotal)}`,
    },
    {
      title: 'Inventory Stock & Valuation',
      description: 'Real-time stock on hand, purchase vs selling valuation, re-order thresholds, and movements.',
      icon: Package,
      color: 'text-violet-600',
      bg: 'bg-violet-50 border-violet-100',
      href: '/inventory',
      stat: `Valuation: ${formatINR(stockReport?.totalPurchaseValuation)}`,
    },
    {
      title: 'Trial Balance Statement',
      description: 'Mathematical verification that all debit and credit ledger balances match identically.',
      icon: Scale,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      href: '/accounting?tab=trial-balance',
      stat: 'Double-Entry Verified',
    },
    {
      title: 'Profit & Loss Statement',
      description: 'Operating revenues minus Cost of Goods Sold and overhead expenses.',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      href: '/accounting?tab=pnl',
      stat: 'P&L Verified',
    },
    {
      title: 'Balance Sheet',
      description: 'Financial position reflecting Assets = Liabilities + Owner Equity and Retained Profit.',
      icon: FileSpreadsheet,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      href: '/accounting?tab=balance-sheet',
      stat: 'Balanced Sheet',
    },
    {
      title: 'GSTR-1 & GSTR-3B Tax Summary',
      description: 'B2B/B2C outward supplies, eligible Input Tax Credit (ITC), and net payable GST.',
      icon: Percent,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100',
      href: '/gst',
      stat: 'Indian GST Ready',
    },
    {
      title: 'Customer & Supplier Ledgers',
      description: '360-degree party transaction timelines with chronological debits, credits, and running balance.',
      icon: Users,
      color: 'text-slate-700',
      bg: 'bg-slate-50 border-slate-200',
      href: '/parties',
      stat: 'Party Accounts',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Reports Center</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive Financial Statements, Sales Tax Registers, Stock Valuation & GST Filing Summaries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Overview</span>
            </button>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards.map((r, idx) => {
            const Icon = r.icon;
            return (
              <Link
                key={idx}
                href={r.href}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg border ${r.bg}`}>
                      <Icon className={`w-5 h-5 ${r.color}`} />
                    </div>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {r.stat}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {r.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>Open Report</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
