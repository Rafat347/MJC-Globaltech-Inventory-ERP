import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const categories = await db.expenseCategory.findMany({
      where: { companyId: user.companyId },
      include: {
        _count: { select: { expenses: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, code, description } = await request.json();
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    const category = await db.expenseCategory.create({
      data: {
        name,
        code: code ? code.toUpperCase().trim() : null,
        description,
        companyId: user.companyId,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
