import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBalanceSheet } from '@/lib/accounting';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate') ? new Date(searchParams.get('asOfDate')!) : undefined;

    const data = await getBalanceSheet(user.companyId, asOfDate);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
