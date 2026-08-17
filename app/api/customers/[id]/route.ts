import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id, companyId: user.companyId },
      include: {
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await db.customer.update({
      where: { id, companyId: user.companyId },
      data: {
        name: body.name,
        companyName: body.companyName,
        gstin: body.gstin ? body.gstin.trim().toUpperCase() : null,
        pan: body.pan ? body.pan.trim().toUpperCase() : null,
        email: body.email,
        phone: body.phone,
        billingAddress: body.billingAddress,
        shippingAddress: body.shippingAddress,
        state: body.state,
        stateCode: body.stateCode,
        city: body.city,
        pincode: body.pincode,
        creditLimit: Number(body.creditLimit) || 0,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      module: 'CUSTOMER',
      recordId: id,
      description: `Updated customer ${updated.name}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can archive customers' }, { status: 403 });
    }

    const { id } = await params;
    const customer = await db.customer.update({
      where: { id, companyId: user.companyId },
      data: { isActive: false },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      module: 'CUSTOMER',
      recordId: id,
      description: `Archived customer ${customer.name}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
