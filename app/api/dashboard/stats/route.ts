import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getInventorySummary } from '@/lib/inventory';
import { getProfitAndLoss } from '@/lib/accounting';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = user.companyId;
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // 1. Today's Sales & Purchases
    const todayInvoices = await db.invoice.aggregate({
      where: {
        companyId,
        invoiceDate: { gte: todayStart, lte: todayEnd },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    });

    const todayPurchases = await db.purchaseInvoice.aggregate({
      where: {
        companyId,
        billDate: { gte: todayStart, lte: todayEnd },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    });

    // 2. Total Receivables (from active Customers)
    const receivablesAgg = await db.customer.aggregate({
      where: { companyId, isActive: true },
      _sum: { currentBalance: true },
    });

    // 3. Total Payables (from active Suppliers)
    const payablesAgg = await db.supplier.aggregate({
      where: { companyId, isActive: true },
      _sum: { currentBalance: true },
    });

    // 4. Cash & Bank Balances
    const cashAcc = await db.account.findFirst({
      where: { companyId, subType: 'CASH' },
    });
    const bankAcc = await db.account.findFirst({
      where: { companyId, subType: 'BANK' },
    });

    // 5. Total Expenses this Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExpensesAgg = await db.expense.aggregate({
      where: {
        companyId,
        expenseDate: { gte: startOfMonth },
      },
      _sum: { totalWithTax: true },
    });

    // 6. Inventory Valuation & Low Stock
    const invSummary = await getInventorySummary(companyId);

    // 7. P&L Overview
    const pnl = await getProfitAndLoss(companyId);

    // 8. 30-Day Sales & Purchase Trend
    const thirtyDaysAgo = subDays(now, 30);
    const recentInvoices = await db.invoice.findMany({
      where: {
        companyId,
        invoiceDate: { gte: thirtyDaysAgo },
        status: { not: 'CANCELLED' },
      },
      select: { invoiceDate: true, totalAmount: true },
    });

    const recentBills = await db.purchaseInvoice.findMany({
      where: {
        companyId,
        billDate: { gte: thirtyDaysAgo },
        status: { not: 'CANCELLED' },
      },
      select: { billDate: true, totalAmount: true },
    });

    // Group by Date for Chart
    const trendMap = new Map<string, { date: string; sales: number; purchases: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i);
      const key = format(d, 'dd MMM');
      trendMap.set(key, { date: key, sales: 0, purchases: 0 });
    }

    recentInvoices.forEach((inv) => {
      const key = format(new Date(inv.invoiceDate), 'dd MMM');
      const item = trendMap.get(key);
      if (item) item.sales += inv.totalAmount;
    });

    recentBills.forEach((bill) => {
      const key = format(new Date(bill.billDate), 'dd MMM');
      const item = trendMap.get(key);
      if (item) item.purchases += bill.totalAmount;
    });

    const trendData = Array.from(trendMap.values());

    // 9. Top Selling Products
    const topItems = await db.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { companyId, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true, totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    });

    const topProducts = await Promise.all(
      topItems.map(async (item) => {
        const prod = await db.product.findUnique({
          where: { id: item.productId },
          select: { name: true, sku: true, sellingPrice: true },
        });
        return {
          id: item.productId,
          name: prod?.name || 'Product',
          sku: prod?.sku || '',
          totalQuantity: item._sum.quantity || 0,
          totalSales: item._sum.totalAmount || 0,
        };
      })
    );

    // 10. Recent Transactions
    const recentInvs = await db.invoice.findMany({
      where: { companyId },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentPayments = await db.payment.findMany({
      where: { companyId },
      include: { customer: { select: { name: true } }, supplier: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      todaySales: todayInvoices._sum.totalAmount || 0,
      todayPurchases: todayPurchases._sum.totalAmount || 0,
      totalReceivables: receivablesAgg._sum.currentBalance || 0,
      totalPayables: payablesAgg._sum.currentBalance || 0,
      cashBalance: cashAcc?.currentBalance || 0,
      bankBalance: bankAcc?.currentBalance || 0,
      stockValue: invSummary.totalStockValue,
      totalStockUnits: invSummary.totalStockUnits,
      lowStockCount: invSummary.lowStockItems.length,
      lowStockItems: invSummary.lowStockItems.slice(0, 5),
      totalRevenue: pnl.totalRevenue,
      netProfit: pnl.netProfit,
      monthExpenses: monthExpensesAgg._sum.totalWithTax || 0,
      trendData,
      topProducts,
      recentInvoices: recentInvs,
      recentPayments,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
