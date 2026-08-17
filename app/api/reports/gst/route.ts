import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const dateFilter = startDate || endDate
      ? {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        }
      : undefined;

    // 1. Invoices (Outward Supplies)
    const invoices = await db.invoice.findMany({
      where: {
        companyId: user.companyId,
        status: { not: 'CANCELLED' },
        ...(startDate || endDate ? { invoiceDate: dateFilter } : {}),
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    // 2. Purchases (Inward Supplies / ITC)
    const bills = await db.purchaseInvoice.findMany({
      where: {
        companyId: user.companyId,
        status: { not: 'CANCELLED' },
        ...(startDate || endDate ? { billDate: dateFilter } : {}),
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    // 3. GST Claimable Expenses
    const expenses = await db.expense.findMany({
      where: {
        companyId: user.companyId,
        isGstClaimable: true,
        ...(startDate || endDate ? { expenseDate: dateFilter } : {}),
      },
    });

    // Compute GSTR-1 (B2B vs B2C)
    const b2bInvoices = invoices.filter((i) => Boolean(i.customer.gstin));
    const b2cInvoices = invoices.filter((i) => !i.customer.gstin);

    // Outward Tax Summary
    const outputTaxable = invoices.reduce((s, i) => s + (i.subtotal - i.discountAmount), 0);
    const outputCGST = invoices.reduce((s, i) => s + i.cgstTotal, 0);
    const outputSGST = invoices.reduce((s, i) => s + i.sgstTotal, 0);
    const outputIGST = invoices.reduce((s, i) => s + i.igstTotal, 0);
    const totalOutputTax = outputCGST + outputSGST + outputIGST;

    // Inward Tax Summary (ITC)
    const itcCGST = bills.reduce((s, b) => s + b.cgstTotal, 0) + expenses.reduce((s, e) => s + e.cgstAmount, 0);
    const itcSGST = bills.reduce((s, b) => s + b.sgstTotal, 0) + expenses.reduce((s, e) => s + e.sgstAmount, 0);
    const itcIGST = bills.reduce((s, b) => s + b.igstTotal, 0) + expenses.reduce((s, e) => s + e.igstAmount, 0);
    const totalITC = itcCGST + itcSGST + itcIGST;

    // Net GST Liability
    const netCGSTPayable = Math.max(0, outputCGST - itcCGST);
    const netSGSTPayable = Math.max(0, outputSGST - itcSGST);
    const netIGSTPayable = Math.max(0, outputIGST - itcIGST);
    const netTaxPayable = netCGSTPayable + netSGSTPayable + netIGSTPayable;

    // HSN-wise breakdown
    const hsnMap = new Map<
      string,
      { hsn: string; description: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }
    >();

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const hsn = item.hsnCode || 'N/A';
        const existing = hsnMap.get(hsn) || {
          hsn,
          description: item.description || item.product?.name || 'General Product',
          qty: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
        };
        const taxable = item.quantity * item.unitPrice - item.discountAmount;
        existing.qty += item.quantity;
        existing.taxable += taxable;
        existing.cgst += item.cgstAmount;
        existing.sgst += item.sgstAmount;
        existing.igst += item.igstAmount;
        existing.total += item.totalAmount;
        hsnMap.set(hsn, existing);
      });
    });

    const hsnSummary = Array.from(hsnMap.values()).map((h) => ({
      ...h,
      taxable: Number(h.taxable.toFixed(2)),
      cgst: Number(h.cgst.toFixed(2)),
      sgst: Number(h.sgst.toFixed(2)),
      igst: Number(h.igst.toFixed(2)),
      total: Number(h.total.toFixed(2)),
    }));

    return NextResponse.json({
      gstr1: {
        b2bInvoices,
        b2cInvoices,
        totalInvoices: invoices.length,
        outputTaxable: Number(outputTaxable.toFixed(2)),
        outputCGST: Number(outputCGST.toFixed(2)),
        outputSGST: Number(outputSGST.toFixed(2)),
        outputIGST: Number(outputIGST.toFixed(2)),
        totalOutputTax: Number(totalOutputTax.toFixed(2)),
      },
      gstr3b: {
        outwardTax: {
          cgst: Number(outputCGST.toFixed(2)),
          sgst: Number(outputSGST.toFixed(2)),
          igst: Number(outputIGST.toFixed(2)),
          total: Number(totalOutputTax.toFixed(2)),
        },
        inputTaxCredit: {
          cgst: Number(itcCGST.toFixed(2)),
          sgst: Number(itcSGST.toFixed(2)),
          igst: Number(itcIGST.toFixed(2)),
          total: Number(totalITC.toFixed(2)),
        },
        netPayable: {
          cgst: Number(netCGSTPayable.toFixed(2)),
          sgst: Number(netSGSTPayable.toFixed(2)),
          igst: Number(netIGSTPayable.toFixed(2)),
          total: Number(netTaxPayable.toFixed(2)),
        },
      },
      hsnSummary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
