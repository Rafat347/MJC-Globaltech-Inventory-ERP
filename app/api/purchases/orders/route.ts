import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateGST } from '@/lib/gst';
import { logAuditEvent } from '@/lib/audit';
import { PurchaseOrderStatus } from '@prisma/client';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orders = await db.purchaseOrder.findMany({
      where: { companyId: user.companyId },
      include: {
        supplier: { select: { name: true, supplierCode: true } },
        items: { include: { product: true } },
      },
      orderBy: { poDate: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { supplierId, poDate, expectedDate, items } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Supplier and items are required' }, { status: 400 });
    }

    const company = await db.company.findUnique({ where: { id: user.companyId } });
    const supplier = await db.supplier.findUnique({ where: { id: supplierId, companyId: user.companyId } });
    if (!company || !supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const gstCalc = calculateGST(
      supplier.stateCode || '29',
      company.stateCode || '29',
      items.map((i: any) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discountPercent: Number(i.discountPercent) || 0,
        taxRate: Number(i.taxRate) || 0,
      }))
    );

    const count = await db.purchaseOrder.count({ where: { companyId: user.companyId } });
    const prefix = company.poPrefix || 'PO';
    const year = new Date().getFullYear();
    const poNo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    const order = await db.purchaseOrder.create({
      data: {
        poNo,
        poDate: new Date(poDate || new Date()),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        supplierId,
        subtotal: gstCalc.subtotal,
        discountAmount: gstCalc.discountTotal,
        taxAmount: gstCalc.totalTax,
        totalAmount: gstCalc.grandTotal,
        status: PurchaseOrderStatus.CONFIRMED,
        createdById: user.id,
        companyId: user.companyId,
        items: {
          create: gstCalc.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxRate: item.taxRate,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            igstAmount: item.igstAmount,
            totalAmount: item.totalAmount,
          })),
        },
      },
      include: { items: true },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'PURCHASE_ORDER',
      recordId: order.id,
      description: `Created Purchase Order #${order.poNo} for ${supplier.name}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
