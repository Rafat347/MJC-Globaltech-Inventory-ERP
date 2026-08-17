# MJC Globaltech Inventory ERP & Accounting Platform

A production-grade, full-featured SME Business ERP and Accounting platform engineered for Indian enterprises.

Combining **Billing + Sales + Purchases + Inventory + Double-Entry Accounting + Indian GST/Tax + Expenses + Payments & Receipts + Reports + Role-Based Access Control (RBAC)**.

---

## 🌟 Key Features

- **Executive Dashboard**: Real-time sales, purchases, outstanding receivables/payables, profit & loss, fast-moving items, and interactive 30-day revenue charts.
- **Sales & Tax Invoices**: Intra-State (CGST + SGST) vs Inter-State (IGST) split, A4 printable tax invoices with dynamic NPCI UPI QR codes and Indian Rupees number-to-words conversion.
- **Purchases & Inward Supplies**: Vendor bills, purchase orders, Input Tax Credit (ITC) tracking, and automatic stock inward increments.
- **Inventory & Item Master**: SKU, barcode, HSN codes, low-stock re-order thresholds, stock valuation, physical stock adjustments, and traceable stock movement timelines.
- **Parties & 360° Financial Ledgers**: Customer & Supplier directory with chronological transaction ledgers, debits, credits, and running balances.
- **Payments & Receipts**: Multi-mode vouchers (NEFT/RTGS, UPI, Cash, Cheque, Card) with direct invoice reconciliation.
- **Overhead Expenses**: Operating expense tracking with GST Input Tax Credit claims.
- **Double-Entry Accounting Hub**: Chart of Accounts (COA), Trial Balance ($\Sigma\text{Dr} = \Sigma\text{Cr}$ check), Statement of Profit and Loss, Balance Sheet, Day Book, Cash Book, and Bank Book.
- **GST & Tax Compliance**: GSTR-1, GSTR-3B Tax Liability vs ITC summary, HSN-wise tax reports, and 38-state GST code master.
- **Role-Based Access Control (RBAC)**: Tailored workspaces and permission filters for **Administrator**, **Operations Manager**, **Chief Accountant**, and **Sales Executive**.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment & Database
```bash
# Push schema to SQLite database
npx prisma db push

# Seed realistic demo enterprise data
npm run prisma:seed
```

### 3. Run Automated Tests
```bash
npm run test:business-logic
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Demo Credentials (with 1-Click Login on `/login`)

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| 👑 **Administrator** | `admin@mjcglobaltech.com` | `admin123` | Full access across all 11 modules, settings & users |
| 👔 **Manager** | `manager@mjcglobaltech.com` | `admin123` | Sales, purchases, inventory, parties, reports |
| 💰 **Accountant** | `accountant@mjcglobaltech.com` | `admin123` | Double-entry accounting, Trial Balance, P&L, Balance Sheet, GST |
| 💼 **Salesperson** | `sales@mjcglobaltech.com` | `admin123` | Invoicing, quotations, customer directory |

---

## ☁️ Deploying on Vercel

1. Import this repository in [Vercel](https://vercel.com).
2. Set Environment Variables in Vercel project settings:
   - `DATABASE_URL`: PostgreSQL connection string (e.g. from Supabase, Neon, or Vercel Postgres) or Turso / Prisma Accelerate.
   - `JWT_SECRET`: A secure random string for signing session tokens.
3. In **Build & Development Settings**, set:
   - Build Command: `npx prisma generate && next build`
4. Deploy!

---

## 🛡️ Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & ORM**: SQLite / PostgreSQL with Prisma ORM
- **Authentication**: JWT + bcryptjs with HTTP-only cookies
- **Charts & Visualizations**: Recharts
