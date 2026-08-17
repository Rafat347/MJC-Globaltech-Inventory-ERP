import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cashAcc = await db.account.findFirst({
      where: { companyId: user.companyId, subType: 'CASH' },
    });

    if (!cashAcc) {
      return NextResponse.json({ account: null, entries: [], closingBalance: 0 });
    }

    const lines = await db.journalEntryLine.findMany({
      where: {
        accountId: cashAcc.id,
        journalEntry: { status: 'POSTED' },
      },
      include: {
        journalEntry: true,
      },
      orderBy: { journalEntry: { entryDate: 'asc' } },
    });

    let running = 0;
    const entries = lines.map((l) => {
      running += l.debitAmount - l.creditAmount;
      return {
        id: l.id,
        entryNo: l.journalEntry.entryNo,
        date: l.journalEntry.entryDate,
        narration: l.journalEntry.narration,
        description: l.description,
        debit: l.debitAmount,
        credit: l.creditAmount,
        runningBalance: Number(running.toFixed(2)),
      };
    });

    return NextResponse.json({
      account: cashAcc,
      entries,
      totalInflow: entries.reduce((s, e) => s + e.debit, 0),
      totalOutflow: entries.reduce((s, e) => s + e.credit, 0),
      closingBalance: Number(running.toFixed(2)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
