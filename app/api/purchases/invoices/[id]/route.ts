import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { numberToWordsINR } from '@/lib/invoicing';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const bill = await db.purchaseInvoice.findUnique({
      where: { id, companyId: user.companyId },
      include: {
        supplier: true,
        items: { include: { product: true } },
        allocations: { include: { payment: true } },
        company: true,
      },
    });

    if (!bill) return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 });

    return NextResponse.json({
      bill,
      amountInWords: numberToWordsINR(bill.totalAmount),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
