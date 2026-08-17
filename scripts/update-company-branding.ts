import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating company name and branding to MJC Globaltech Inventory ERP...');

  // 1. Update Company Record
  const company = await prisma.company.findFirst();
  if (company) {
    await prisma.company.update({
      where: { id: company.id },
      data: {
        name: 'MJC Globaltech Pvt Ltd',
        tradeName: 'MJC Globaltech Inventory ERP',
        businessType: 'Technology, Hardware & Inventory Solutions',
        ownerName: 'MJC Director',
        email: 'contact@mjcglobaltech.com',
        website: 'https://mjcglobaltech.com',
        upiId: 'mjcglobaltech@okhdfcbank',
        invoicePrefix: 'MJC-INV',
        quotationPrefix: 'MJC-QTN',
        salesOrderPrefix: 'MJC-SO',
        purchasePrefix: 'MJC-BILL',
        paymentPrefix: 'MJC-PAY',
        expensePrefix: 'MJC-EXP',
      },
    });
    console.log('✅ Company updated to: MJC Globaltech Pvt Ltd (MJC Globaltech Inventory ERP)');
  }

  // 2. Ensure Users with @mjcglobaltech.com exist
  const passwordHash = await bcrypt.hash('admin123', 10);

  const usersToSync = [
    { email: 'admin@mjcglobaltech.com', name: 'Rajesh Kumar (MJC Admin)', role: UserRole.ADMIN },
    { email: 'manager@mjcglobaltech.com', name: 'Priya Sharma (MJC Manager)', role: UserRole.MANAGER },
    { email: 'accountant@mjcglobaltech.com', name: 'Suresh Mehta (MJC Accountant)', role: UserRole.ACCOUNTANT },
    { email: 'sales@mjcglobaltech.com', name: 'Vikram Singh (MJC Sales)', role: UserRole.SALESPERSON },
  ];

  if (company) {
    for (const u of usersToSync) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash, companyId: company.id },
        create: {
          email: u.email,
          passwordHash,
          name: u.name,
          role: u.role,
          companyId: company.id,
        },
      });
    }
  }

  console.log('✅ All MJC Globaltech users synchronized successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
