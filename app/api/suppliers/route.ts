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

    const suppliers = await db.supplier.findMany({
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
                { supplierCode: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: { purchaseInvoices: true, purchaseOrders: true, payments: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ suppliers });
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
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
    }

    let supplierCode = body.supplierCode;
    if (!supplierCode) {
      const count = await db.supplier.count({ where: { companyId: user.companyId } });
      supplierCode = `SUPP-${String(count + 1).padStart(4, '0')}`;
    }

    const openingBalance = Number(body.openingBalance) || 0;

    const supplier = await db.supplier.create({
      data: {
        supplierCode,
        name: body.name,
        companyName: body.companyName || null,
        gstin: body.gstin ? body.gstin.trim().toUpperCase() : null,
        pan: body.pan ? body.pan.trim().toUpperCase() : null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        state: body.state || 'Karnataka',
        stateCode: body.stateCode || '29',
        city: body.city || null,
        pincode: body.pincode || null,
        openingBalance,
        currentBalance: openingBalance,
        companyId: user.companyId,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'SUPPLIER',
      recordId: supplier.id,
      description: `Created supplier ${supplier.name} (${supplier.supplierCode})`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
