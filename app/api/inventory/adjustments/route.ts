import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordStockMovement } from '@/lib/inventory';
import { logAuditEvent } from '@/lib/audit';
import { MovementType } from '@prisma/client';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adjustments = await db.stockAdjustment.findMany({
      where: { companyId: user.companyId },
      include: {
        items: {
          include: { product: true, warehouse: true },
        },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ adjustments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { reason, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const count = await db.stockAdjustment.count({ where: { companyId: user.companyId } });
    const adjustmentNo = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Execute in transaction
    const adjustment = await db.$transaction(async (tx) => {
      const adj = await tx.stockAdjustment.create({
        data: {
          adjustmentNo,
          date: new Date(),
          reason,
          createdById: user.id,
          companyId: user.companyId!,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              warehouseId: item.warehouseId || undefined,
              type: item.type, // 'INCREASE' or 'DECREASE'
              quantity: Number(item.quantity),
              unitCost: Number(item.unitCost) || 0,
              notes: item.notes || undefined,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        const qty = item.type === 'INCREASE' ? Number(item.quantity) : -Math.abs(Number(item.quantity));
        const movType = item.type === 'INCREASE' ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;

        await recordStockMovement(
          {
            productId: item.productId,
            warehouseId: item.warehouseId,
            movementType: movType,
            quantity: qty,
            unitPrice: Number(item.unitCost) || 0,
            referenceType: 'ADJUSTMENT',
            referenceId: adj.id,
            notes: `Stock Adjustment #${adjustmentNo}: ${item.notes || reason || ''}`,
            createdById: user.id,
            companyId: user.companyId!,
          },
          tx
        );
      }

      return adj;
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'INVENTORY',
      recordId: adjustment.id,
      description: `Created Stock Adjustment #${adjustment.adjustmentNo} (${items.length} items)`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, adjustment });
  } catch (error: any) {
    console.error('Adjustment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
