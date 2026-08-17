import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const invoices = await db.invoice.findMany({
      where: {
        companyId: user.companyId,
        status: { not: 'CANCELLED' },
        ...(startDate || endDate
          ? {
              invoiceDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: {
        customer: { select: { name: true, customerCode: true, state: true, gstin: true } },
        items: { include: { product: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const totalSubtotal = invoices.reduce((s, i) => s + i.subtotal, 0);
    const totalTax = invoices.reduce((s, i) => s + i.taxAmount, 0);
    const totalCGST = invoices.reduce((s, i) => s + i.cgstTotal, 0);
    const totalSGST = invoices.reduce((s, i) => s + i.sgstTotal, 0);
    const totalIGST = invoices.reduce((s, i) => s + i.igstTotal, 0);
    const grandTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalOutstanding = invoices.reduce((s, i) => s + i.outstandingAmount, 0);

    return NextResponse.json({
      invoices,
      count: invoices.length,
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalCGST: Number(totalCGST.toFixed(2)),
      totalSGST: Number(totalSGST.toFixed(2)),
      totalIGST: Number(totalIGST.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
