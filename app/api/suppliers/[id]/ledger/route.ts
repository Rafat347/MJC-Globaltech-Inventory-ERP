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
    const supplier = await db.supplier.findUnique({
      where: { id, companyId: user.companyId },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const bills = await db.purchaseInvoice.findMany({
      where: { supplierId: id, companyId: user.companyId, status: { not: 'CANCELLED' } },
      select: {
        id: true,
        billNo: true,
        billDate: true,
        totalAmount: true,
        status: true,
      },
    });

    const payments = await db.payment.findMany({
      where: { supplierId: id, companyId: user.companyId, status: 'COMPLETED' },
      select: {
        id: true,
        paymentNo: true,
        paymentDate: true,
        amount: true,
        paymentMode: true,
        referenceNo: true,
      },
    });

    type LedgerItem = {
      date: Date;
      type: 'BILL' | 'PAYMENT' | 'OPENING';
      referenceNo: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
    };

    const entries: LedgerItem[] = [];

    if (supplier.openingBalance !== 0) {
      entries.push({
        date: supplier.createdAt,
        type: 'OPENING',
        referenceNo: 'OPENING',
        narration: 'Opening Balance Payable',
        debit: supplier.openingBalance < 0 ? Math.abs(supplier.openingBalance) : 0,
        credit: supplier.openingBalance > 0 ? supplier.openingBalance : 0,
        balance: supplier.openingBalance,
      });
    }

    bills.forEach((b) => {
      entries.push({
        date: new Date(b.billDate),
        type: 'BILL',
        referenceNo: b.billNo,
        narration: `Purchase Bill #${b.billNo}`,
        debit: 0,
        credit: b.totalAmount, // Increases Payable
        balance: 0,
      });
    });

    payments.forEach((p) => {
      entries.push({
        date: new Date(p.paymentDate),
        type: 'PAYMENT',
        referenceNo: p.paymentNo,
        narration: `Payment Voucher #${p.paymentNo} (${p.paymentMode})`,
        debit: p.amount, // Decreases Payable
        credit: 0,
        balance: 0,
      });
    });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    entries.forEach((e) => {
      running += e.credit - e.debit;
      e.balance = Number(running.toFixed(2));
    });

    return NextResponse.json({
      supplier,
      totalPurchases: bills.reduce((s, b) => s + b.totalAmount, 0),
      totalPaid: payments.reduce((s, p) => s + p.amount, 0),
      outstandingPayable: Number(running.toFixed(2)),
      ledger: entries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
