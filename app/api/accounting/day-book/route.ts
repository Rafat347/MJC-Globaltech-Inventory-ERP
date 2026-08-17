import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const entries = await db.journalEntry.findMany({
      where: {
        companyId: user.companyId,
        entryDate: { gte: start, lte: end },
        status: 'POSTED',
      },
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: { entryDate: 'asc' },
    });

    const totalDebit = entries.reduce((s, e) => s + e.totalDebit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);

    return NextResponse.json({
      date: targetDate,
      entries,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      count: entries.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
