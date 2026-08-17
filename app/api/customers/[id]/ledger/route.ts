import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id, companyId: user.companyId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const invoices = await db.invoice.findMany({
      where: { customerId: id, companyId: user.companyId, status: { not: 'CANCELLED' } },
      select: {
        id: true,
        invoiceNo: true,
        invoiceDate: true,
        totalAmount: true,
        status: true,
      },
    });

    const payments = await db.payment.findMany({
      where: { customerId: id, companyId: user.companyId, status: 'COMPLETED' },
      select: {
        id: true,
        paymentNo: true,
        paymentDate: true,
        amount: true,
        paymentMode: true,
        referenceNo: true,
      },
    });

    // Combine into ledger entries
    type LedgerItem = {
      date: Date;
      type: 'INVOICE' | 'PAYMENT' | 'OPENING';
      referenceNo: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
    };

    const entries: LedgerItem[] = [];

    // Opening Balance
    if (customer.openingBalance !== 0) {
      entries.push({
        date: customer.createdAt,
        type: 'OPENING',
        referenceNo: 'OPENING',
        narration: 'Opening Balance',
        debit: customer.openingBalance > 0 ? customer.openingBalance : 0,
        credit: customer.openingBalance < 0 ? Math.abs(customer.openingBalance) : 0,
        balance: customer.openingBalance,
      });
    }

    invoices.forEach((inv) => {
      entries.push({
        date: new Date(inv.invoiceDate),
        type: 'INVOICE',
        referenceNo: inv.invoiceNo,
        narration: `Sales Invoice #${inv.invoiceNo}`,
        debit: inv.totalAmount,
        credit: 0,
        balance: 0,
      });
    });

    payments.forEach((pay) => {
      entries.push({
        date: new Date(pay.paymentDate),
        type: 'PAYMENT',
        referenceNo: pay.paymentNo,
        narration: `Receipt #${pay.paymentNo} (${pay.paymentMode}${pay.referenceNo ? ` - ${pay.referenceNo}` : ''})`,
        debit: 0,
        credit: pay.amount,
        balance: 0,
      });
    });

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    let running = 0;
    entries.forEach((e) => {
      running += e.debit - e.credit;
      e.balance = Number(running.toFixed(2));
    });

    return NextResponse.json({
      customer,
      totalSales: invoices.reduce((s, i) => s + i.totalAmount, 0),
      totalPaid: payments.reduce((s, p) => s + p.amount, 0),
      outstandingBalance: Number(running.toFixed(2)),
      ledger: entries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
