import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordPaymentAccounting } from '@/lib/accounting';
import { logAuditEvent } from '@/lib/audit';
import { PartyType, PaymentMode, InvoiceStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const partyType = searchParams.get('partyType');
    const customerId = searchParams.get('customerId');
    const supplierId = searchParams.get('supplierId');

    const payments = await db.payment.findMany({
      where: {
        companyId: user.companyId,
        ...(partyType ? { partyType: partyType as PartyType } : {}),
        ...(customerId ? { customerId } : {}),
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
        supplier: { select: { id: true, name: true, supplierCode: true } },
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNo: true, totalAmount: true, outstandingAmount: true } },
            purchaseInvoice: { select: { id: true, billNo: true, totalAmount: true, outstandingAmount: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      partyType, // 'CUSTOMER' or 'SUPPLIER'
      customerId,
      supplierId,
      paymentMode, // 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD'
      amount,
      paymentDate,
      referenceNo,
      notes,
      allocations, // Array of { invoiceId?: string, purchaseInvoiceId?: string, allocatedAmount: number }
    } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    if (partyType === 'CUSTOMER' && !customerId) {
      return NextResponse.json({ error: 'Customer is required for customer receipt' }, { status: 400 });
    }
    if (partyType === 'SUPPLIER' && !supplierId) {
      return NextResponse.json({ error: 'Supplier is required for supplier payment' }, { status: 400 });
    }

    const company = await db.company.findUnique({ where: { id: user.companyId } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    let partyName = 'Party';
    if (partyType === 'CUSTOMER' && customerId) {
      const cust = await db.customer.findUnique({ where: { id: customerId } });
      if (cust) partyName = cust.name;
    } else if (supplierId) {
      const supp = await db.supplier.findUnique({ where: { id: supplierId } });
      if (supp) partyName = supp.name;
    }

    const count = await db.payment.count({ where: { companyId: user.companyId } });
    const prefix = partyType === 'CUSTOMER' ? company.receiptPrefix || 'REC' : company.paymentPrefix || 'PAY';
    const year = new Date().getFullYear();
    const paymentNo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    // Execute in Database Transaction
    const payment = await db.$transaction(async (tx) => {
      const pay = await tx.payment.create({
        data: {
          paymentNo,
          paymentDate: new Date(paymentDate || new Date()),
          partyType: partyType as PartyType,
          customerId: customerId || null,
          supplierId: supplierId || null,
          paymentMode: (paymentMode as PaymentMode) || PaymentMode.BANK_TRANSFER,
          amount: numAmount,
          referenceNo,
          notes,
          status: 'COMPLETED',
          createdById: user.id,
          companyId: user.companyId!,
          allocations: {
            create: (allocations || []).map((a: any) => ({
              invoiceId: a.invoiceId || null,
              purchaseInvoiceId: a.purchaseInvoiceId || null,
              allocatedAmount: Number(a.allocatedAmount),
            })),
          },
        },
        include: { allocations: true },
      });

      // Update Invoices if allocated
      if (allocations && Array.isArray(allocations)) {
        for (const alloc of allocations) {
          const allocAmt = Number(alloc.allocatedAmount);
          if (alloc.invoiceId && allocAmt > 0) {
            const inv = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } });
            if (inv) {
              const newPaid = inv.paidAmount + allocAmt;
              const newOutstanding = Math.max(0, inv.totalAmount - newPaid);
              const newStatus = newOutstanding <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
              await tx.invoice.update({
                where: { id: alloc.invoiceId },
                data: {
                  paidAmount: newPaid,
                  outstandingAmount: newOutstanding,
                  status: newStatus,
                },
              });
            }
          } else if (alloc.purchaseInvoiceId && allocAmt > 0) {
            const bill = await tx.purchaseInvoice.findUnique({ where: { id: alloc.purchaseInvoiceId } });
            if (bill) {
              const newPaid = bill.paidAmount + allocAmt;
              const newOutstanding = Math.max(0, bill.totalAmount - newPaid);
              const newStatus = newOutstanding <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
              await tx.purchaseInvoice.update({
                where: { id: alloc.purchaseInvoiceId },
                data: {
                  paidAmount: newPaid,
                  outstandingAmount: newOutstanding,
                  status: newStatus,
                },
              });
            }
          }
        }
      }

      // Update Party current balance
      if (partyType === 'CUSTOMER' && customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { currentBalance: { decrement: numAmount } },
        });
      } else if (supplierId) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: { currentBalance: { decrement: numAmount } },
        });
      }

      // Post Double-Entry Accounting Entry
      await recordPaymentAccounting(
        {
          id: pay.id,
          paymentNo,
          paymentDate: pay.paymentDate,
          partyType: partyType as 'CUSTOMER' | 'SUPPLIER',
          amount: numAmount,
          paymentMode: pay.paymentMode,
          partyName,
          companyId: user.companyId!,
          createdById: user.id,
        },
        tx
      );

      return pay;
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'PAYMENT',
      recordId: payment.id,
      description: `Recorded ${partyType === 'CUSTOMER' ? 'Receipt' : 'Payment'} #${payment.paymentNo} for ₹${payment.amount.toLocaleString('en-IN')} (${partyName})`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record payment' }, { status: 500 });
  }
}
