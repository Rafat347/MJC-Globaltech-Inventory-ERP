import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const taxRates = await db.taxRate.findMany({
      where: { companyId: user.companyId },
      orderBy: { rate: 'asc' },
    });
    return NextResponse.json({ taxRates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, rate, description, isDefault } = await request.json();
    const numRate = Number(rate);
    const halfRate = numRate / 2;

    const taxRate = await db.taxRate.create({
      data: {
        name,
        rate: numRate,
        cgstRate: halfRate,
        sgstRate: halfRate,
        igstRate: numRate,
        description,
        isDefault: Boolean(isDefault),
        companyId: user.companyId,
      },
    });
    return NextResponse.json({ success: true, taxRate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
