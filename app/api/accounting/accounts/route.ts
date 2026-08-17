import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ensureDefaultAccounts } from '@/lib/accounting';
import { AccountType, AccountSubType } from '@prisma/client';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureDefaultAccounts(user.companyId);

    const accounts = await db.account.findMany({
      where: { companyId: user.companyId },
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { journalLines: true } },
      },
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code, name, accountType, subType, initialBalance } = await request.json();
    if (!code || !name || !accountType) {
      return NextResponse.json({ error: 'Code, name, and account type are required' }, { status: 400 });
    }

    const account = await db.account.create({
      data: {
        code: code.trim(),
        name,
        accountType: accountType as AccountType,
        subType: (subType as AccountSubType) || AccountSubType.OTHER_CURRENT_ASSET,
        currentBalance: Number(initialBalance) || 0,
        isSystem: false,
        companyId: user.companyId,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
