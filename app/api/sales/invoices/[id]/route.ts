import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { numberToWordsINR, formatINR } from '@/lib/invoicing';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const invoice = await db.invoice.findUnique({
      where: { id, companyId: user.companyId },
      include: {
        customer: true,
        items: { include: { product: true } },
        allocations: { include: { payment: true } },
        company: true,
      },
    });

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const amountInWords = numberToWordsINR(invoice.totalAmount);

    return NextResponse.json({
      invoice,
      amountInWords,
      formattedTotal: formatINR(invoice.totalAmount),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
