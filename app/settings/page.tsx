'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  History,
  Download,
  CheckCircle2,
  AlertCircle,
  Save,
  UserPlus,
  X,
  CreditCard,
} from 'lucide-react';
import { INDIAN_STATES } from '@/lib/gst';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'audit' | 'backup'>('company');
  const [company, setCompany] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Company Form State
  const [companyForm, setCompanyForm] = useState<any>({});
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyMessage, setCompanyMessage] = useState('');

  // New User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALESPERSON',
    phone: '',
  });
  const [submittingUser, setSubmittingUser] = useState(false);
  const [userError, setUserError] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/company').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/audit-logs').then((r) => r.json()),
    ])
      .then(([compData, userData, logData]) => {
        if (compData.company) {
          setCompany(compData.company);
          setCompanyForm(compData.company);
        }
        setUsers(userData.users || []);
        setAuditLogs(logData.logs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStateChange = (stateName: string) => {
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    setCompanyForm({
      ...companyForm,
      state: stateName,
      stateCode: found ? found.code : '29',
    });
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    setCompanyMessage('');

    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update company');

      setCompany(data.company);
      setCompanyMessage('Company profile and banking details saved successfully!');
    } catch (err: any) {
      setCompanyMessage(`Error: ${err.message}`);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    setUserError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setShowUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'SALESPERSON', phone: '' });
      loadData();
    } catch (err: any) {
      setUserError(err.message);
    } finally {
      setSubmittingUser(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Administration</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Organization Profile, UPI Banking, Role-Based Access Control & Audit Trails
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('company')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'company'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company & Bank Setup</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts & RBAC ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail Log ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Database Backup & Export</span>
          </button>
        </div>

        {/* TAB 1: COMPANY PROFILE */}
        {activeTab === 'company' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-4xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Organization & Tax Profile</h2>
                <p className="text-xs text-slate-500">
                  Configures invoice headers, tax calculation defaults, and bank payment details
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveCompany}
                disabled={savingCompany}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingCompany ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>

            {companyMessage && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-semibold ${
                  companyMessage.startsWith('Error')
                    ? 'bg-rose-50 border border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                }`}
              >
                {companyMessage}
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="mt-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Legal Entity Name *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.name || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trade / Display Name</label>
                  <input
                    type="text"
                    value={companyForm.tradeName || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={companyForm.gstin || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                    placeholder="29AABCU9603R1ZM"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={companyForm.pan || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value })}
                    placeholder="AABCU9603R"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State & State Code *</label>
                  <select
                    value={companyForm.state || 'Karnataka'}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Address</label>
                  <input
                    type="text"
                    value={companyForm.address || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={companyForm.city || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={companyForm.pincode || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Banking & UPI */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
                  Bank Account & Dynamic UPI QR
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={companyForm.bankName || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                      placeholder="HDFC Bank"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={companyForm.bankAccountNo || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, bankAccountNo: e.target.value })}
                      placeholder="50200012345678"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={companyForm.bankIfsc || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, bankIfsc: e.target.value })}
                      placeholder="HDFC0001234"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">UPI ID (For Dynamic QR)</label>
                    <input
                      type="text"
                      value={companyForm.upiId || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, upiId: e.target.value })}
                      placeholder="apextech@okhdfcbank"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-indigo-600 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Numbering Prefixes */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
                  Document Numbering Sequences
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Prefix</label>
                    <input
                      type="text"
                      value={companyForm.invoicePrefix || 'INV'}
                      onChange={(e) => setCompanyForm({ ...companyForm, invoicePrefix: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Quotation Prefix</label>
                    <input
                      type="text"
                      value={companyForm.quotationPrefix || 'QTN'}
                      onChange={(e) => setCompanyForm({ ...companyForm, quotationPrefix: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Purchase Prefix</label>
                    <input
                      type="text"
                      value={companyForm.purchasePrefix || 'BILL'}
                      onChange={(e) => setCompanyForm({ ...companyForm, purchasePrefix: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Receipt Prefix</label>
                    <input
                      type="text"
                      value={companyForm.receiptPrefix || 'REC'}
                      onChange={(e) => setCompanyForm({ ...companyForm, receiptPrefix: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: USERS & RBAC */}
        {activeTab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">User Accounts & Role Permissions</h2>
                <p className="text-xs text-slate-500">
                  Granular permission control (Admin, Manager, Accountant, Salesperson)
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUserModal(true);
                  setUserError('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User</span>
              </button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Email Address</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{u.phone || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL LOG */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Immutable chronological log of all business events, invoicing, payments and price changes
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between text-xs hover:bg-slate-50/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.userName || 'System'}</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {log.module} • {log.action}
                      </span>
                    </div>
                    <p className="text-slate-600">{log.description}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP & DATA */}
        {activeTab === 'backup' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 max-w-2xl">
            <div>
              <h2 className="text-base font-bold text-slate-900">Database Backup & Portability</h2>
              <p className="text-xs text-slate-500">
                Export full relational database snapshots in standardized JSON format
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800">1-Click Full System Backup</h3>
              <p className="text-xs text-slate-600">
                Downloads a complete snapshot of all customer masters, inventory stocks, sales tax invoices,
                double-entry journal vouchers, and audit logs.
              </p>
              <a
                href="/api/backup/export"
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Database JSON Backup</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Create New Team User</h2>
              <button onClick={() => setShowUserModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs">
              {userError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {userError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="E.g. Vikram Singh"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="name@zenith.erp"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role Permission *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold"
                  >
                    <option value="ADMIN">👑 Admin (Full Access)</option>
                    <option value="MANAGER">👔 Manager (Ops & Reports)</option>
                    <option value="ACCOUNTANT">💰 Accountant (Ledgers & Tax)</option>
                    <option value="SALESPERSON">💼 Salesperson (Invoicing)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="+91 98450 12345"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md"
                >
                  {submittingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
