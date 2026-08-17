import { db } from './db';
import { MovementType, Prisma } from '@prisma/client';

export interface RecordMovementParams {
  productId: string;
  warehouseId?: string;
  movementType: MovementType;
  quantity: number; // positive for IN, negative for OUT
  unitPrice?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdById?: string;
  companyId: string;
}

/**
 * Atomically updates product currentStock and creates an audit StockMovement entry.
 */
export async function recordStockMovement(
  params: RecordMovementParams,
  tx?: Prisma.TransactionClient
) {
  const client = tx || db;
  const {
    productId,
    movementType,
    quantity,
    unitPrice = 0,
    referenceType,
    referenceId,
    notes,
    createdById,
    companyId,
  } = params;

  // Default warehouse if none specified
  let warehouseId = params.warehouseId;
  if (!warehouseId) {
    let defWarehouse = await client.warehouse.findFirst({
      where: { companyId, isDefault: true },
    });
    if (!defWarehouse) {
      defWarehouse = await client.warehouse.create({
        data: {
          name: 'Main Warehouse',
          code: 'WH-MAIN',
          isDefault: true,
          companyId,
        },
      });
    }
    warehouseId = defWarehouse.id;
  }

  // Update Product Current Stock
  const updatedProduct = await client.product.update({
    where: { id: productId },
    data: {
      currentStock: {
        increment: quantity,
      },
    },
  });

  // Update Warehouse specific Stock
  const existingStock = await client.stock.findUnique({
    where: {
      productId_warehouseId: {
        productId,
        warehouseId,
      },
    },
  });

  if (existingStock) {
    await client.stock.update({
      where: { id: existingStock.id },
      data: {
        quantity: { increment: quantity },
      },
    });
  } else {
    await client.stock.create({
      data: {
        productId,
        warehouseId,
        quantity,
        companyId,
      },
    });
  }

  const totalValue = Math.abs(quantity * unitPrice);

  // Create Movement Audit record
  const movement = await client.stockMovement.create({
    data: {
      productId,
      warehouseId,
      movementType,
      quantity,
      balanceAfter: updatedProduct.currentStock,
      unitPrice,
      totalValue,
      referenceType,
      referenceId,
      notes,
      createdById,
      companyId,
    },
  });

  return { product: updatedProduct, movement };
}

/**
 * Gets stock valuation (Total quantity * purchasePrice) and low-stock alerts
 */
export async function getInventorySummary(companyId: string) {
  const products = await db.product.findMany({
    where: { companyId, isActive: true },
    include: {
      category: true,
      unit: true,
    },
  });

  let totalItemsCount = products.length;
  let totalStockUnits = 0;
  let totalStockValue = 0;
  const lowStockItems: typeof products = [];

  for (const p of products) {
    totalStockUnits += p.currentStock;
    totalStockValue += p.currentStock * p.purchasePrice;
    if (p.currentStock <= p.minStockLevel) {
      lowStockItems.push(p);
    }
  }

  return {
    totalItemsCount,
    totalStockUnits,
    totalStockValue: Number(totalStockValue.toFixed(2)),
    lowStockItems,
  };
}
