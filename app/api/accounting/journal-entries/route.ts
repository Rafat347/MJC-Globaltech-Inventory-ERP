import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { postJournalEntry } from '@/lib/accounting';
import { logAuditEvent } from '@/lib/audit';
import { EntryReferenceType } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const referenceType = searchParams.get('referenceType');

    const entries = await db.journalEntry.findMany({
      where: {
        companyId: user.companyId,
        ...(referenceType ? { referenceType: referenceType as EntryReferenceType } : {}),
      },
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: { entryDate: 'desc' },
    });

    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { entryDate, narration, lines } = body;

    if (!narration || !lines || lines.length < 2) {
      return NextResponse.json({ error: 'Narration and at least two line items are required' }, { status: 400 });
    }

    const entry = await postJournalEntry({
      companyId: user.companyId,
      entryDate: new Date(entryDate || new Date()),
      referenceType: EntryReferenceType.MANUAL,
      narration,
      createdById: user.id,
      lines: lines.map((l: any) => ({
        accountId: l.accountId,
        description: l.description,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'POST',
      module: 'ACCOUNTING',
      recordId: entry.id,
      description: `Posted Manual Journal Voucher #${entry.entryNo} (₹${entry.totalDebit.toLocaleString('en-IN')})`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error('Journal entry error:', error);
    return NextResponse.json({ error: error.message || 'Failed to post journal entry' }, { status: 500 });
  }
}
