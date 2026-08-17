import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const units = await db.unit.findMany({
      where: { companyId: user.companyId },
      orderBy: { symbol: 'asc' },
    });
    return NextResponse.json({ units });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, symbol } = await request.json();
    if (!name || !symbol) return NextResponse.json({ error: 'Name and symbol are required' }, { status: 400 });

    const unit = await db.unit.create({
      data: { name, symbol: symbol.toUpperCase().trim(), companyId: user.companyId },
    });
    return NextResponse.json({ success: true, unit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
