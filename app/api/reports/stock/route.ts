import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const products = await db.product.findMany({
      where: { companyId: user.companyId, isActive: true },
      include: {
        category: true,
        unit: true,
        taxRate: true,
        stocks: { include: { warehouse: true } },
      },
      orderBy: { name: 'asc' },
    });

    let totalStockQty = 0;
    let totalPurchaseValuation = 0;
    let totalSalesValuation = 0;
    let lowStockCount = 0;

    const items = products.map((p) => {
      const stockVal = p.currentStock * p.purchasePrice;
      const salesVal = p.currentStock * p.sellingPrice;
      totalStockQty += p.currentStock;
      totalPurchaseValuation += stockVal;
      totalSalesValuation += salesVal;

      const isLowStock = p.currentStock <= p.minStockLevel;
      if (isLowStock) lowStockCount++;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        hsnCode: p.hsnCode,
        category: p.category?.name || 'Uncategorized',
        unit: p.unit?.symbol || 'PCS',
        currentStock: p.currentStock,
        minStockLevel: p.minStockLevel,
        isLowStock,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        stockValuation: Number(stockVal.toFixed(2)),
        salesValuation: Number(salesVal.toFixed(2)),
      };
    });

    return NextResponse.json({
      items,
      totalItems: products.length,
      totalStockQty,
      totalPurchaseValuation: Number(totalPurchaseValuation.toFixed(2)),
      totalSalesValuation: Number(totalSalesValuation.toFixed(2)),
      lowStockCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
