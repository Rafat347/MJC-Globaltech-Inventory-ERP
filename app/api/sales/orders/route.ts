import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateGST } from '@/lib/gst';
import { logAuditEvent } from '@/lib/audit';
import { SalesOrderStatus } from '@prisma/client';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orders = await db.salesOrder.findMany({
      where: { companyId: user.companyId },
      include: {
        customer: { select: { name: true, customerCode: true } },
        items: { include: { product: true } },
      },
      orderBy: { orderDate: 'desc' },
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
    const { customerId, orderDate, expectedDeliveryDate, items, quotationId } = body;

    if (!customerId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Customer and items are required' }, { status: 400 });
    }

    const company = await db.company.findUnique({ where: { id: user.companyId } });
    const customer = await db.customer.findUnique({ where: { id: customerId, companyId: user.companyId } });
    if (!company || !customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const gstCalc = calculateGST(
      company.stateCode || '29',
      customer.stateCode || '29',
      items.map((i: any) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discountPercent: Number(i.discountPercent) || 0,
        taxRate: Number(i.taxRate) || 0,
      }))
    );

    const count = await db.salesOrder.count({ where: { companyId: user.companyId } });
    const prefix = company.salesOrderPrefix || 'SO';
    const year = new Date().getFullYear();
    const orderNo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    const order = await db.salesOrder.create({
      data: {
        orderNo,
        orderDate: new Date(orderDate || new Date()),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        customerId,
        quotationId,
        subtotal: gstCalc.subtotal,
        discountAmount: gstCalc.discountTotal,
        taxAmount: gstCalc.totalTax,
        totalAmount: gstCalc.grandTotal,
        status: SalesOrderStatus.CONFIRMED,
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
      module: 'SALES_ORDER',
      recordId: order.id,
      description: `Created Sales Order #${order.orderNo} for ${customer.name}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
