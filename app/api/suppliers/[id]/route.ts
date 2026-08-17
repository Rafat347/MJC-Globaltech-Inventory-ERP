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
    const supplier = await db.supplier.findUnique({
      where: { id, companyId: user.companyId },
      include: {
        purchaseInvoices: {
          orderBy: { billDate: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ supplier });
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

    const updated = await db.supplier.update({
      where: { id, companyId: user.companyId },
      data: {
        name: body.name,
        companyName: body.companyName,
        gstin: body.gstin ? body.gstin.trim().toUpperCase() : null,
        pan: body.pan ? body.pan.trim().toUpperCase() : null,
        email: body.email,
        phone: body.phone,
        address: body.address,
        state: body.state,
        stateCode: body.stateCode,
        city: body.city,
        pincode: body.pincode,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      module: 'SUPPLIER',
      recordId: id,
      description: `Updated supplier ${updated.name}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, supplier: updated });
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
      return NextResponse.json({ error: 'Only admins can archive suppliers' }, { status: 403 });
    }

    const { id } = await params;
    const supplier = await db.supplier.update({
      where: { id, companyId: user.companyId },
      data: { isActive: false },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      module: 'SUPPLIER',
      recordId: id,
      description: `Archived supplier ${supplier.name}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
