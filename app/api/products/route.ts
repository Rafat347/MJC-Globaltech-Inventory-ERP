import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { MovementType } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const products = await db.product.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
                { barcode: { contains: search } },
                { hsnCode: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        unit: true,
        taxRate: true,
      },
      orderBy: { name: 'asc' },
    });

    const filtered = lowStockOnly
      ? products.filter((p) => p.currentStock <= p.minStockLevel)
      : products;

    return NextResponse.json({ products: filtered });
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
    if (!body.name || !body.sku) {
      return NextResponse.json({ error: 'Product name and SKU are required' }, { status: 400 });
    }

    const openingStock = Number(body.openingStock) || 0;
    const purchasePrice = Number(body.purchasePrice) || 0;

    const product = await db.product.create({
      data: {
        name: body.name,
        sku: body.sku.trim().toUpperCase(),
        barcode: body.barcode || null,
        description: body.description || null,
        categoryId: body.categoryId || null,
        unitId: body.unitId || null,
        purchasePrice,
        sellingPrice: Number(body.sellingPrice) || 0,
        mrp: Number(body.mrp) || 0,
        minStockLevel: Number(body.minStockLevel) || 5,
        openingStock,
        currentStock: openingStock,
        hsnCode: body.hsnCode || null,
        taxRateId: body.taxRateId || null,
        companyId: user.companyId,
      },
      include: {
        category: true,
        unit: true,
        taxRate: true,
      },
    });

    // Create Initial Stock and Opening Stock Movement if > 0
    if (openingStock > 0) {
      let warehouse = await db.warehouse.findFirst({
        where: { companyId: user.companyId, isDefault: true },
      });
      if (!warehouse) {
        warehouse = await db.warehouse.findFirst({
          where: { companyId: user.companyId },
        });
      }

      if (warehouse) {
        await db.stock.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            quantity: openingStock,
            companyId: user.companyId,
          },
        });

        await db.stockMovement.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            movementType: MovementType.OPENING_STOCK,
            quantity: openingStock,
            balanceAfter: openingStock,
            unitPrice: purchasePrice,
            totalValue: openingStock * purchasePrice,
            referenceType: 'OPENING',
            notes: 'Initial opening stock',
            createdById: user.id,
            companyId: user.companyId,
          },
        });
      }
    }

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'PRODUCT',
      recordId: product.id,
      description: `Created product ${product.name} (SKU: ${product.sku}) with opening stock ${openingStock}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
