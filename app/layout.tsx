import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MJC Globaltech Inventory ERP - Business Accounting & Management Platform',
  description: 'MJC Globaltech Inventory ERP - Production-Ready SME Business ERP with Billing, Sales, Purchase, Inventory, GST, and Double-Entry Accounting.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
