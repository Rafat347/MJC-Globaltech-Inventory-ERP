'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Package,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  Wallet,
  Building,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  BookOpen,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then((res) => res.json()),
      fetch('/api/auth/me').then((res) => res.json()),
    ])
      .then(([statsData, userData]) => {
        setStats(statsData);
        setUser(userData.user);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppShell>
    );
  }

  const role = user?.role || 'SALESPERSON';

  const kpis = [
    {
      title: "Today's Sales",
      value: formatINR(stats?.todaySales),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      change: 'Real-time billing',
    },
    {
      title: "Today's Purchases",
      value: formatINR(stats?.todayPurchases),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
      change: 'Inward bills',
    },
    {
      title: 'Total Receivables (Debtors)',
      value: formatINR(stats?.totalReceivables),
      icon: ArrowUpRight,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      change: 'Pending collections',
      href: '/parties?tab=customers',
    },
    {
      title: 'Total Payables (Creditors)',
      value: formatINR(stats?.totalPayables),
      icon: ArrowDownLeft,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      change: 'Supplier dues',
      href: '/parties?tab=suppliers',
    },
    {
      title: 'Bank & Cash Balance',
      value: formatINR((stats?.bankBalance || 0) + (stats?.cashBalance || 0)),
      icon: Wallet,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      sub: `Bank: ${formatINR(stats?.bankBalance)} | Cash: ${formatINR(stats?.cashBalance)}`,
      href: '/accounting?tab=cash-bank',
    },
    {
      title: 'Stock Valuation',
      value: formatINR(stats?.stockValue),
      icon: Package,
      color: 'text-violet-600',
      bg: 'bg-violet-50 border-violet-100',
      sub: `${stats?.totalStockUnits || 0} Total Units in Stock`,
      href: '/inventory',
    },
    {
      title: 'Net Profit (P&L)',
      value: formatINR(stats?.netProfit),
      icon: DollarSign,
      color: stats?.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
      bg: 'bg-slate-50 border-slate-200',
      sub: `Revenue: ${formatINR(stats?.totalRevenue)}`,
      href: '/accounting?tab=pnl',
    },
    {
      title: 'Low Stock Alerts',
      value: `${stats?.lowStockCount || 0} Items`,
      icon: AlertTriangle,
      color: stats?.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-500',
      bg: stats?.lowStockCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200',
      sub: stats?.lowStockCount > 0 ? 'Requires immediate re-order' : 'All items well stocked',
      href: '/inventory?filter=low',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {role === 'ADMIN' && 'Executive Business Overview'}
                {role === 'MANAGER' && 'Operations & Stock Management'}
                {role === 'ACCOUNTANT' && 'Financial Ledgers & Tax Center'}
                {role === 'SALESPERSON' && 'Sales Billing & Quotations Hub'}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.email}) • MJC Globaltech Inventory ERP
            </p>
          </div>
          <div className="flex items-center gap-2">
            {role !== 'ACCOUNTANT' && (
              <Link
                href="/sales?action=new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Sales Invoice</span>
              </Link>
            )}
            {['ADMIN', 'ACCOUNTANT'].includes(role) && (
              <Link
                href="/accounting"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Accounting Ledgers</span>
              </Link>
            )}
            {['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(role) && (
              <Link
                href="/reports"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <span>View Reports</span>
              </Link>
            )}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const cardContent = (
              <div
                key={idx}
                className={`p-4 rounded-xl border bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between ${
                  kpi.href ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">{kpi.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg border ${kpi.bg}`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 truncate">{kpi.sub || kpi.change}</span>
                  {kpi.href && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>
            );

            return kpi.href ? (
              <Link key={idx} href={kpi.href}>
                {cardContent}
              </Link>
            ) : (
              <div key={idx}>{cardContent}</div>
            );
          })}
        </div>

        {/* 30-Day Sales & Purchase Trend Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">30-Day Sales & Purchase Revenue Trend</h2>
              <p className="text-xs text-slate-500">Daily financial trajectory comparing billed sales vs inward purchases</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                <span className="text-slate-600 font-medium">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                <span className="text-slate-600 font-medium">Purchases</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trendData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value)), '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#purchGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two Columns: Top Products & Recent Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Top Fast-Moving Products</h3>
                <Link href="/inventory" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  Inventory Master &rarr;
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {stats?.topProducts?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No sales recorded yet.</p>
                ) : (
                  stats?.topProducts?.map((item: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">{formatINR(item.totalSales)}</p>
                        <p className="text-[10px] text-slate-500">{item.totalQuantity} Units sold</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Sales Invoices */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Recent Sales Invoices</h3>
                <Link href="/sales" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  All Invoices &rarr;
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {stats?.recentInvoices?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No invoices created yet.</p>
                ) : (
                  stats?.recentInvoices?.map((inv: any) => (
                    <div key={inv.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 font-mono">{inv.invoiceNo}</span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 mt-0.5">{inv.customer?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">{formatINR(inv.totalAmount)}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
