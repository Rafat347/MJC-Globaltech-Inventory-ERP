'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  TrendingDown,
  BookOpen,
  FileSpreadsheet,
  Settings,
  LogOut,
  Building2,
  Bell,
  Plus,
  ShieldCheck,
  Percent,
  ShieldAlert,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { formatINR } from '@/lib/invoicing';

interface AppShellProps {
  children: React.ReactNode;
}

// Define accessible route paths per role
const ROLE_ROUTE_ACCESS: Record<string, string[]> = {
  ADMIN: [
    '/',
    '/sales',
    '/purchases',
    '/inventory',
    '/parties',
    '/payments',
    '/expenses',
    '/accounting',
    '/gst',
    '/reports',
    '/settings',
  ],
  MANAGER: [
    '/',
    '/sales',
    '/purchases',
    '/inventory',
    '/parties',
    '/payments',
    '/expenses',
    '/reports',
  ],
  ACCOUNTANT: [
    '/',
    '/sales',
    '/purchases',
    '/parties',
    '/payments',
    '/expenses',
    '/accounting',
    '/gst',
    '/reports',
  ],
  SALESPERSON: [
    '/',
    '/sales',
    '/inventory',
    '/parties',
    '/payments',
  ],
};

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALESPERSON'] },
  { label: 'Sales & Invoices', href: '/sales', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALESPERSON'] },
  { label: 'Purchases & Bills', href: '/purchases', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { label: 'Inventory & Items', href: '/inventory', icon: Package, roles: ['ADMIN', 'MANAGER', 'SALESPERSON'] },
  { label: 'Parties (Customers/Vendors)', href: '/parties', icon: Users, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALESPERSON'] },
  { label: 'Payments & Receipts', href: '/payments', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALESPERSON'] },
  { label: 'Expenses', href: '/expenses', icon: TrendingDown, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { label: 'Accounting & Ledger', href: '/accounting', icon: BookOpen, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'GST & Tax Hub', href: '/gst', icon: Percent, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Reports', href: '/reports', icon: FileSpreadsheet, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { label: 'Settings & Admin', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const fetchSession = () => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login');
        } else {
          setUser(data.user);
          setCompany(data.company);
        }
        setLoading(false);
      })
      .catch(() => {
        router.push('/login');
      });
  };

  useEffect(() => {
    fetchSession();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleQuickSwitch = async (email: string) => {
    setSwitchingRole(true);
    setShowRoleSwitcher(false);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'admin123' }),
      });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (e) {
      console.error('Failed to switch role', e);
    } finally {
      setSwitchingRole(false);
    }
  };

  if (loading || switchingRole) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">
            {switchingRole ? 'Switching Role Workspace...' : 'Loading MJC Globaltech Inventory ERP...'}
          </p>
        </div>
      </div>
    );
  }

  const userRole = user?.role || 'SALESPERSON';
  const allowedRoutes = ROLE_ROUTE_ACCESS[userRole] || ['/'];
  const isAuthorized = allowedRoutes.some((route) =>
    route === '/' ? pathname === '/' : pathname?.startsWith(route)
  );

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  const roleMeta: Record<string, { label: string; badgeClass: string; icon: string; desc: string }> = {
    ADMIN: {
      label: 'Administrator',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      icon: '👑',
      desc: 'Full Access to All 11 Modules',
    },
    MANAGER: {
      label: 'Operations Manager',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: '👔',
      desc: 'Sales, Purchases, Inventory & Reports',
    },
    ACCOUNTANT: {
      label: 'Chief Accountant',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: '💰',
      desc: 'Ledgers, Trial Balance, P&L, GST & Tax',
    },
    SALESPERSON: {
      label: 'Sales Executive',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: '💼',
      desc: 'Invoicing, Orders & Customer Collections',
    },
  };

  const currentRoleInfo = roleMeta[userRole] || roleMeta.SALESPERSON;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 select-none">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-600/30">
            MJC
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-white tracking-tight flex items-center gap-1">
              <span className="truncate">MJC Globaltech</span>
              <span className="text-[9px] font-bold uppercase bg-indigo-500/20 text-indigo-400 px-1 py-0.2 rounded border border-indigo-500/30">
                ERP
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {company?.tradeName || company?.name || 'Inventory ERP'}
            </div>
          </div>
        </div>

        {/* User Role Badge in Sidebar */}
        <div className="mx-3 my-2.5 px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-base leading-none">{currentRoleInfo.icon}</span>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${currentRoleInfo.badgeClass}`}>
                {currentRoleInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Filtered Nav Links */}
        <nav className="flex-1 px-2.5 py-1.5 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {userRole} Workspace Modules ({visibleNavItems.length})
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-bold text-indigo-300">
                {user?.name?.slice(0, 2)?.toUpperCase() || 'US'}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-mono text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Active Company:</span>
            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 truncate max-w-xs">
              {company?.name || 'MJC Globaltech Pvt Ltd'}
            </span>
            <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
              GSTIN: {company?.gstin || '29AABCU9603R1ZM'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick 1-Click Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition-colors"
              >
                <span>{currentRoleInfo.icon} Switch Role ({userRole})</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showRoleSwitcher && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs space-y-1">
                  <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active User Role:
                  </p>
                  <button
                    onClick={() => handleQuickSwitch('admin@mjcglobaltech.com')}
                    className={`w-full p-2 text-left rounded-lg flex items-center gap-2.5 transition-colors ${
                      userRole === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">👑</span>
                    <div>
                      <p className="font-semibold">Administrator</p>
                      <p className="text-[10px] text-slate-500">Full system access</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('manager@mjcglobaltech.com')}
                    className={`w-full p-2 text-left rounded-lg flex items-center gap-2.5 transition-colors ${
                      userRole === 'MANAGER' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">👔</span>
                    <div>
                      <p className="font-semibold">Operations Manager</p>
                      <p className="text-[10px] text-slate-500">Sales, Purchase, Stock & Reports</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('accountant@mjcglobaltech.com')}
                    className={`w-full p-2 text-left rounded-lg flex items-center gap-2.5 transition-colors ${
                      userRole === 'ACCOUNTANT' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">💰</span>
                    <div>
                      <p className="font-semibold">Chief Accountant</p>
                      <p className="text-[10px] text-slate-500">Ledgers, Trial Balance, P&L, GST</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('sales@mjcglobaltech.com')}
                    className={`w-full p-2 text-left rounded-lg flex items-center gap-2.5 transition-colors ${
                      userRole === 'SALESPERSON' ? 'bg-amber-50 text-amber-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">💼</span>
                    <div>
                      <p className="font-semibold">Sales Executive</p>
                      <p className="text-[10px] text-slate-500">Invoicing & Customer Collections</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions Filtered by Role */}
            {userRole !== 'ACCOUNTANT' && (
              <Link
                href="/sales?action=new"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Invoice</span>
              </Link>
            )}
            {['ADMIN', 'ACCOUNTANT'].includes(userRole) && (
              <Link
                href="/accounting"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Accounting Hub</span>
              </Link>
            )}
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {!isAuthorized ? (
            <div className="max-w-xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-md space-y-4">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
              <p className="text-xs text-slate-600">
                Your current role <span className="font-bold text-slate-900">({userRole} - {currentRoleInfo.label})</span> does not have permissions to access the <span className="font-mono font-bold text-rose-600">{pathname}</span> module.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl text-left text-xs border space-y-1">
                <p className="font-bold text-slate-700">Role Permissions Overview:</p>
                <p className="text-slate-500">• {currentRoleInfo.desc}</p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
