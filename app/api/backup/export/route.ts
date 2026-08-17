import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const companyId = user.companyId;

    const [
      company,
      customers,
      suppliers,
      products,
      categories,
      units,
      warehouses,
      taxRates,
      invoices,
      purchases,
      payments,
      expenses,
      accounts,
      journalEntries,
      auditLogs,
    ] = await Promise.all([
      db.company.findUnique({ where: { id: companyId } }),
      db.customer.findMany({ where: { companyId } }),
      db.supplier.findMany({ where: { companyId } }),
      db.product.findMany({ where: { companyId } }),
      db.productCategory.findMany({ where: { companyId } }),
      db.unit.findMany({ where: { companyId } }),
      db.warehouse.findMany({ where: { companyId } }),
      db.taxRate.findMany({ where: { companyId } }),
      db.invoice.findMany({ where: { companyId }, include: { items: true } }),
      db.purchaseInvoice.findMany({ where: { companyId }, include: { items: true } }),
      db.payment.findMany({ where: { companyId }, include: { allocations: true } }),
      db.expense.findMany({ where: { companyId } }),
      db.account.findMany({ where: { companyId } }),
      db.journalEntry.findMany({ where: { companyId }, include: { lines: true } }),
      db.auditLog.findMany({ where: { companyId } }),
    ]);

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'EXPORT',
      module: 'BACKUP',
      description: 'Exported full business database backup JSON',
      companyId,
    });

    const exportPayload = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      company,
      customers,
      suppliers,
      products,
      categories,
      units,
      warehouses,
      taxRates,
      invoices,
      purchases,
      payments,
      expenses,
      accounts,
      journalEntries,
      auditLogs,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="Zenith_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
