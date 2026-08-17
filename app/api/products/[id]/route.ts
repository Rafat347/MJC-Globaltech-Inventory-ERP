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
    const product = await db.product.findUnique({
      where: { id, companyId: user.companyId },
      include: {
        category: true,
        unit: true,
        taxRate: true,
        stocks: {
          include: { warehouse: true },
        },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
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

    const updated = await db.product.update({
      where: { id, companyId: user.companyId },
      data: {
        name: body.name,
        sku: body.sku.trim().toUpperCase(),
        barcode: body.barcode,
        description: body.description,
        categoryId: body.categoryId || null,
        unitId: body.unitId || null,
        purchasePrice: Number(body.purchasePrice) || 0,
        sellingPrice: Number(body.sellingPrice) || 0,
        mrp: Number(body.mrp) || 0,
        minStockLevel: Number(body.minStockLevel) || 5,
        hsnCode: body.hsnCode,
        taxRateId: body.taxRateId || null,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      module: 'PRODUCT',
      recordId: id,
      description: `Updated product ${updated.name} (Price: ₹${updated.sellingPrice})`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, product: updated });
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
      return NextResponse.json({ error: 'Only admins can archive products' }, { status: 403 });
    }

    const { id } = await params;
    const product = await db.product.update({
      where: { id, companyId: user.companyId },
      data: { isActive: false },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      module: 'PRODUCT',
      recordId: id,
      description: `Archived product ${product.name}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
