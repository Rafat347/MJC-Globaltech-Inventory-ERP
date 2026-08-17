import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateGST } from '@/lib/gst';
import { recordStockMovement } from '@/lib/inventory';
import { recordPurchaseAccounting } from '@/lib/accounting';
import { logAuditEvent } from '@/lib/audit';
import { MovementType, InvoiceStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';

    const bills = await db.purchaseInvoice.findMany({
      where: {
        companyId: user.companyId,
        ...(supplierId ? { supplierId } : {}),
        ...(status ? { status: status as InvoiceStatus } : {}),
        ...(search
          ? {
              OR: [
                { billNo: { contains: search } },
                { supplierInvoiceNo: { contains: search } },
                { supplier: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, supplierCode: true, gstin: true, phone: true } },
        items: { include: { product: true } },
      },
      orderBy: { billDate: 'desc' },
    });

    return NextResponse.json({ bills });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { supplierId, supplierInvoiceNo, billDate, dueDate, items, notes } = body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Supplier and items are required' }, { status: 400 });
    }

    const company = await db.company.findUnique({ where: { id: user.companyId } });
    const supplier = await db.supplier.findUnique({ where: { id: supplierId, companyId: user.companyId } });
    if (!company || !supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    // 1. Calculate GST breakdown (Supplier state vs Company state)
    const gstCalc = calculateGST(
      supplier.stateCode || '29',
      company.stateCode || '29',
      items.map((i: any) => ({
        productId: i.productId,
        description: i.description,
        hsnCode: i.hsnCode,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discountPercent: Number(i.discountPercent) || 0,
        discountAmount: Number(i.discountAmount) || 0,
        taxRate: Number(i.taxRate) || 0,
      }))
    );

    // 2. Generate Bill Number
    const count = await db.purchaseInvoice.count({ where: { companyId: user.companyId } });
    const prefix = company.purchasePrefix || 'BILL';
    const year = new Date(billDate || new Date()).getFullYear();
    const billNo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    // 3. Database Transaction
    const result = await db.$transaction(async (tx) => {
      const bill = await tx.purchaseInvoice.create({
        data: {
          billNo,
          supplierInvoiceNo,
          billDate: new Date(billDate || new Date()),
          dueDate: dueDate ? new Date(dueDate) : null,
          supplierId,
          isInterState: gstCalc.isInterState,
          subtotal: gstCalc.subtotal,
          discountAmount: gstCalc.discountTotal,
          taxAmount: gstCalc.totalTax,
          cgstTotal: gstCalc.cgstTotal,
          sgstTotal: gstCalc.sgstTotal,
          igstTotal: gstCalc.igstTotal,
          roundOff: gstCalc.roundOff,
          totalAmount: gstCalc.grandTotal,
          paidAmount: 0,
          outstandingAmount: gstCalc.grandTotal,
          status: InvoiceStatus.UNPAID,
          notes,
          createdById: user.id,
          companyId: user.companyId!,
          items: {
            create: gstCalc.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              taxRate: item.taxRate,
              cgstRate: item.cgstRate,
              sgstRate: item.sgstRate,
              igstRate: item.igstRate,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: { items: true },
      });

      // Increase product stock & write StockMovement
      for (const item of gstCalc.items) {
        await recordStockMovement(
          {
            productId: item.productId,
            movementType: MovementType.PURCHASE_RECEIPT,
            quantity: Math.abs(item.quantity),
            unitPrice: item.unitPrice,
            referenceType: 'PURCHASE',
            referenceId: bill.id,
            notes: `Stock In on Purchase Bill #${billNo} from ${supplier.name}`,
            createdById: user.id,
            companyId: user.companyId!,
          },
          tx
        );
      }

      // Update Supplier Payable Balance
      await tx.supplier.update({
        where: { id: supplierId },
        data: { currentBalance: { increment: gstCalc.grandTotal } },
      });

      // Record Accounting Entry (Dr Inventory, Dr Tax Credit, Cr AP)
      await recordPurchaseAccounting(
        {
          id: bill.id,
          billNo,
          billDate: bill.billDate,
          companyId: user.companyId!,
          taxableAmount: gstCalc.taxableAmount,
          cgstTotal: gstCalc.cgstTotal,
          sgstTotal: gstCalc.sgstTotal,
          igstTotal: gstCalc.igstTotal,
          totalAmount: gstCalc.grandTotal,
          supplierName: supplier.name,
          createdById: user.id,
        },
        tx
      );

      return bill;
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'PURCHASE',
      recordId: result.id,
      description: `Created Purchase Bill #${result.billNo} from ${supplier.name} (₹${result.totalAmount.toLocaleString('en-IN')})`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, bill: result });
  } catch (error: any) {
    console.error('Purchase bill error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create purchase bill' }, { status: 500 });
  }
}
