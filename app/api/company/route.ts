import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const company = await db.company.findUnique({
      where: { id: user.companyId },
      include: {
        financialYears: true,
        taxRates: true,
        warehouses: true,
      },
    });

    return NextResponse.json({ company });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can update company profile' }, { status: 403 });
    }

    const body = await request.json();
    const updated = await db.company.update({
      where: { id: user.companyId },
      data: {
        name: body.name,
        tradeName: body.tradeName,
        businessType: body.businessType,
        ownerName: body.ownerName,
        email: body.email,
        phone: body.phone,
        gstin: body.gstin ? body.gstin.trim().toUpperCase() : null,
        pan: body.pan ? body.pan.trim().toUpperCase() : null,
        state: body.state,
        stateCode: body.stateCode,
        address: body.address,
        city: body.city,
        pincode: body.pincode,
        website: body.website,
        bankName: body.bankName,
        bankAccountNo: body.bankAccountNo,
        bankIfsc: body.bankIfsc,
        bankBranch: body.bankBranch,
        upiId: body.upiId,
        invoicePrefix: body.invoicePrefix || 'INV',
        quotationPrefix: body.quotationPrefix || 'QTN',
        salesOrderPrefix: body.salesOrderPrefix || 'SO',
        poPrefix: body.poPrefix || 'PO',
        termsAndConditions: body.termsAndConditions,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      module: 'COMPANY',
      description: `Updated company profile & banking details for ${updated.name}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, company: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
