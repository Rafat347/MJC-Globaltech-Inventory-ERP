import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateGST } from '@/lib/gst';
import { recordStockMovement } from '@/lib/inventory';
import { recordInvoiceAccounting } from '@/lib/accounting';
import { generateUPIPaymentUrl } from '@/lib/invoicing';
import { logAuditEvent } from '@/lib/audit';
import { MovementType, InvoiceStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';

    const invoices = await db.invoice.findMany({
      where: {
        companyId: user.companyId,
        ...(customerId ? { customerId } : {}),
        ...(status ? { status: status as InvoiceStatus } : {}),
        ...(search
          ? {
              OR: [
                { invoiceNo: { contains: search } },
                { customer: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        customer: { select: { id: true, name: true, customerCode: true, gstin: true, phone: true } },
        items: { include: { product: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return NextResponse.json({ invoices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { customerId, invoiceDate, dueDate, items, paymentTerms, notes, termsAndConditions } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const company = await db.company.findUnique({ where: { id: user.companyId } });
    const customer = await db.customer.findUnique({ where: { id: customerId, companyId: user.companyId } });

    if (!company || !customer) {
      return NextResponse.json({ error: 'Company or Customer not found' }, { status: 404 });
    }

    // 1. Calculate GST breakdown
    const gstCalc = calculateGST(
      company.stateCode || '29',
      customer.stateCode || '29',
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

    // 2. Generate Invoice Number
    const count = await db.invoice.count({ where: { companyId: user.companyId } });
    const prefix = company.invoicePrefix || 'INV';
    const year = new Date(invoiceDate || new Date()).getFullYear();
    const invoiceNo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    // 3. Generate dynamic UPI QR string
    const qrCodeString = company.upiId
      ? generateUPIPaymentUrl({
          upiId: company.upiId,
          payeeName: company.tradeName || company.name,
          amount: gstCalc.grandTotal,
          invoiceNo,
        })
      : null;

    // 4. Atomic Execution inside Database Transaction
    const result = await db.$transaction(async (tx) => {
      // Create Invoice & Items
      const inv = await tx.invoice.create({
        data: {
          invoiceNo,
          invoiceDate: new Date(invoiceDate || new Date()),
          dueDate: dueDate ? new Date(dueDate) : null,
          customerId,
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
          paymentTerms: paymentTerms || 'Net 15',
          notes,
          termsAndConditions: termsAndConditions || company.termsAndConditions,
          qrCodeString,
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

      // Update Stock and Record StockMovement for each product
      for (const item of gstCalc.items) {
        await recordStockMovement(
          {
            productId: item.productId,
            movementType: MovementType.INVOICE_SALE,
            quantity: -Math.abs(item.quantity),
            unitPrice: item.unitPrice,
            referenceType: 'INVOICE',
            referenceId: inv.id,
            notes: `Sale on Invoice #${invoiceNo} to ${customer.name}`,
            createdById: user.id,
            companyId: user.companyId!,
          },
          tx
        );
      }

      // Update Customer Outstanding Balance
      await tx.customer.update({
        where: { id: customerId },
        data: { currentBalance: { increment: gstCalc.grandTotal } },
      });

      // Generate Double-Entry Accounting Journal Entry
      await recordInvoiceAccounting(
        {
          id: inv.id,
          invoiceNo,
          invoiceDate: inv.invoiceDate,
          companyId: user.companyId!,
          taxableAmount: gstCalc.taxableAmount,
          cgstTotal: gstCalc.cgstTotal,
          sgstTotal: gstCalc.sgstTotal,
          igstTotal: gstCalc.igstTotal,
          totalAmount: gstCalc.grandTotal,
          customerName: customer.name,
          createdById: user.id,
        },
        tx
      );

      return inv;
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'INVOICE',
      recordId: result.id,
      description: `Created Sales Tax Invoice #${result.invoiceNo} for ${customer.name} (₹${result.totalAmount.toLocaleString('en-IN')})`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 });
  }
}
