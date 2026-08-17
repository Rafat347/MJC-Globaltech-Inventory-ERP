import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const customers = await db.customer.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { companyName: { contains: search } },
                { phone: { contains: search } },
                { gstin: { contains: search } },
                { customerCode: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: { invoices: true, quotations: true, payments: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    // Auto-generate customer code if not provided
    let customerCode = body.customerCode;
    if (!customerCode) {
      const count = await db.customer.count({ where: { companyId: user.companyId } });
      customerCode = `CUST-${String(count + 1).padStart(4, '0')}`;
    }

    const openingBalance = Number(body.openingBalance) || 0;

    const customer = await db.customer.create({
      data: {
        customerCode,
        name: body.name,
        companyName: body.companyName || null,
        gstin: body.gstin ? body.gstin.trim().toUpperCase() : null,
        pan: body.pan ? body.pan.trim().toUpperCase() : null,
        email: body.email || null,
        phone: body.phone || null,
        billingAddress: body.billingAddress || null,
        shippingAddress: body.shippingAddress || null,
        state: body.state || 'Karnataka',
        stateCode: body.stateCode || '29',
        city: body.city || null,
        pincode: body.pincode || null,
        creditLimit: Number(body.creditLimit) || 0,
        openingBalance,
        currentBalance: openingBalance,
        companyId: user.companyId,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'CUSTOMER',
      recordId: customer.id,
      description: `Created customer ${customer.name} (${customer.customerCode})`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
