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

    const bills = await db.purchaseInvoice.findMany({
      where: {
        companyId: user.companyId,
        status: { not: 'CANCELLED' },
        ...(startDate || endDate
          ? {
              billDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: {
        supplier: { select: { name: true, supplierCode: true, state: true, gstin: true } },
        items: { include: { product: true } },
      },
      orderBy: { billDate: 'desc' },
    });

    const totalSubtotal = bills.reduce((s, b) => s + b.subtotal, 0);
    const totalTax = bills.reduce((s, b) => s + b.taxAmount, 0);
    const totalCGST = bills.reduce((s, b) => s + b.cgstTotal, 0);
    const totalSGST = bills.reduce((s, b) => s + b.sgstTotal, 0);
    const totalIGST = bills.reduce((s, b) => s + b.igstTotal, 0);
    const grandTotal = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);
    const totalOutstanding = bills.reduce((s, b) => s + b.outstandingAmount, 0);

    return NextResponse.json({
      bills,
      count: bills.length,
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
