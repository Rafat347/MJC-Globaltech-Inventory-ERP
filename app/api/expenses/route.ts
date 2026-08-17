import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordExpenseAccounting } from '@/lib/accounting';
import { logAuditEvent } from '@/lib/audit';
import { PaymentMode } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const expenses = await db.expense.findMany({
      where: {
        companyId: user.companyId,
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: true,
      },
      orderBy: { expenseDate: 'desc' },
    });

    return NextResponse.json({ expenses });
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
      categoryId,
      amount,
      expenseDate,
      paymentMode,
      payeeName,
      description,
      referenceNo,
      isGstClaimable,
      gstin,
      cgstAmount,
      sgstAmount,
      igstAmount,
    } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid expense amount is required' }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: 'Expense category is required' }, { status: 400 });
    }

    const company = await db.company.findUnique({ where: { id: user.companyId } });
    const category = await db.expenseCategory.findUnique({ where: { id: categoryId } });
    if (!company || !category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const cgst = Number(cgstAmount) || 0;
    const sgst = Number(sgstAmount) || 0;
    const igst = Number(igstAmount) || 0;
    const totalWithTax = numAmount + (isGstClaimable ? cgst + sgst + igst : 0);

    const count = await db.expense.count({ where: { companyId: user.companyId } });
    const prefix = company.expensePrefix || 'EXP';
    const year = new Date().getFullYear();
    const expenseNo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    const expense = await db.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          expenseNo,
          expenseDate: new Date(expenseDate || new Date()),
          categoryId,
          amount: numAmount,
          paymentMode: (paymentMode as PaymentMode) || PaymentMode.CASH,
          payeeName,
          description,
          referenceNo,
          isGstClaimable: Boolean(isGstClaimable),
          gstin: gstin ? gstin.trim().toUpperCase() : null,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalWithTax,
          createdById: user.id,
          companyId: user.companyId!,
        },
        include: { category: true },
      });

      await recordExpenseAccounting(
        {
          id: exp.id,
          expenseNo,
          expenseDate: exp.expenseDate,
          amount: numAmount,
          paymentMode: exp.paymentMode,
          categoryName: category.name,
          payeeName,
          isGstClaimable: Boolean(isGstClaimable),
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          companyId: user.companyId!,
          createdById: user.id,
        },
        tx
      );

      return exp;
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'EXPENSE',
      recordId: expense.id,
      description: `Logged expense #${expense.expenseNo} (${category.name} - ₹${expense.totalWithTax.toLocaleString('en-IN')})`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Expense logging error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
