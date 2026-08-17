import { PrismaClient, UserRole, MovementType, InvoiceStatus, PartyType, PaymentMode, EntryReferenceType, AccountType, AccountSubType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Starting Zenith ERP Database Seeder...');

  // Clean existing tables (prevent unique constraint failures on multiple builds)
  console.log('🧹 Clearing existing database tables to prevent unique key constraint conflicts...');
  await prisma.journalEntryLine.deleteMany().catch(() => {});
  await prisma.journalEntry.deleteMany().catch(() => {});
  await prisma.account.deleteMany().catch(() => {});
  await prisma.stockMovement.deleteMany().catch(() => {});
  await prisma.stockAdjustmentItem.deleteMany().catch(() => {});
  await prisma.stockAdjustment.deleteMany().catch(() => {});
  await prisma.stock.deleteMany().catch(() => {});
  await prisma.invoiceItem.deleteMany().catch(() => {});
  await prisma.invoice.deleteMany().catch(() => {});
  await prisma.quotationItem.deleteMany().catch(() => {});
  await prisma.quotation.deleteMany().catch(() => {});
  await prisma.salesOrderItem.deleteMany().catch(() => {});
  await prisma.salesOrder.deleteMany().catch(() => {});
  await prisma.purchaseInvoiceItem.deleteMany().catch(() => {});
  await prisma.purchaseInvoice.deleteMany().catch(() => {});
  await prisma.purchaseOrderItem.deleteMany().catch(() => {});
  await prisma.purchaseOrder.deleteMany().catch(() => {});
  await prisma.paymentAllocation.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.expense.deleteMany().catch(() => {});
  await prisma.expenseCategory.deleteMany().catch(() => {});
  await prisma.product.deleteMany().catch(() => {});
  await prisma.productCategory.deleteMany().catch(() => {});
  await prisma.unit.deleteMany().catch(() => {});
  await prisma.warehouse.deleteMany().catch(() => {});
  await prisma.taxRate.deleteMany().catch(() => {});
  await prisma.customer.deleteMany().catch(() => {});
  await prisma.supplier.deleteMany().catch(() => {});
  await prisma.financialYear.deleteMany().catch(() => {});
  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  await prisma.company.deleteMany().catch(() => {});
  console.log('🧹 Existing database tables cleared.');

  // 1. Create Company
  const company = await prisma.company.upsert({
    where: { id: 'apex-tech-demo-company' },
    update: {},
    create: {
      id: 'apex-tech-demo-company',
      name: 'MJC Globaltech Pvt Ltd',
      tradeName: 'MJC Globaltech Inventory ERP',
      businessType: 'Technology, Hardware & Inventory Solutions',
      ownerName: 'MJC Director',
      email: 'contact@mjcglobaltech.com',
      phone: '+91 98450 12345',
      gstin: '29AABCU9603R1ZM',
      pan: 'AABCU9603R',
      state: 'Karnataka',
      stateCode: '29',
      address: '#42, Tech Park Boulevard, Koramangala 4th Block',
      city: 'Bengaluru',
      pincode: '560034',
      website: 'https://mjcglobaltech.com',
      bankName: 'HDFC Bank',
      bankAccountNo: '50200012345678',
      bankIfsc: 'HDFC0001234',
      bankBranch: 'Koramangala, Bengaluru',
      upiId: 'mjcglobaltech@okhdfcbank',
      currency: 'INR',
      currencySymbol: '₹',
      invoicePrefix: 'MJC-INV',
      quotationPrefix: 'MJC-QTN',
      salesOrderPrefix: 'MJC-SO',
      poPrefix: 'MJC-PO',
      purchasePrefix: 'MJC-BILL',
      paymentPrefix: 'MJC-PAY',
      expensePrefix: 'MJC-EXP',
      currentFinancialYear: '2026-27',
      termsAndConditions:
        '1. Goods once sold will not be taken back without original seal.\n2. Interest @18% p.a. will be charged if payment is delayed beyond due date.\n3. Subject to Bengaluru jurisdiction.',
    },
  });

  console.log(`✅ Company created: ${company.name}`);

  // 2. Financial Year
  await prisma.financialYear.upsert({
    where: { name_companyId: { name: '2026-27', companyId: company.id } },
    update: {},
    create: {
      name: '2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isLocked: false,
      companyId: company.id,
    },
  });

  // 3. Tax Rates
  const tax18 = await prisma.taxRate.create({
    data: {
      name: 'GST 18%',
      rate: 18.0,
      cgstRate: 9.0,
      sgstRate: 9.0,
      igstRate: 18.0,
      description: 'Standard Electronics & IT Hardware GST Rate',
      isDefault: true,
      companyId: company.id,
    },
  });

  const tax12 = await prisma.taxRate.create({
    data: {
      name: 'GST 12%',
      rate: 12.0,
      cgstRate: 6.0,
      sgstRate: 6.0,
      igstRate: 12.0,
      description: 'Standard IT Peripherals GST Rate',
      isDefault: false,
      companyId: company.id,
    },
  });

  const tax28 = await prisma.taxRate.create({
    data: {
      name: 'GST 28%',
      rate: 28.0,
      cgstRate: 14.0,
      sgstRate: 14.0,
      igstRate: 28.0,
      description: 'Luxury & High-end Computing GST Rate',
      isDefault: false,
      companyId: company.id,
    },
  });

  // 4. Default Chart of Accounts
  const accountsData = [
    { code: '1001', name: 'Cash on Hand', accountType: AccountType.ASSET, subType: AccountSubType.CASH, balance: 45000 },
    { code: '1002', name: 'HDFC Current Bank A/c', accountType: AccountType.ASSET, subType: AccountSubType.BANK, balance: 350000 },
    { code: '1003', name: 'Accounts Receivable (Debtors)', accountType: AccountType.ASSET, subType: AccountSubType.ACCOUNTS_RECEIVABLE, balance: 0 },
    { code: '1004', name: 'Inventory Asset', accountType: AccountType.ASSET, subType: AccountSubType.INVENTORY_ASSET, balance: 0 },
    { code: '1005', name: 'Input CGST Credit', accountType: AccountType.ASSET, subType: AccountSubType.TAX_CREDIT_CGST, balance: 0 },
    { code: '1006', name: 'Input SGST Credit', accountType: AccountType.ASSET, subType: AccountSubType.TAX_CREDIT_SGST, balance: 0 },
    { code: '1007', name: 'Input IGST Credit', accountType: AccountType.ASSET, subType: AccountSubType.TAX_CREDIT_IGST, balance: 0 },
    
    { code: '2001', name: 'Accounts Payable (Creditors)', accountType: AccountType.LIABILITY, subType: AccountSubType.ACCOUNTS_PAYABLE, balance: 0 },
    { code: '2002', name: 'Output CGST Payable', accountType: AccountType.LIABILITY, subType: AccountSubType.TAX_PAYABLE_CGST, balance: 0 },
    { code: '2003', name: 'Output SGST Payable', accountType: AccountType.LIABILITY, subType: AccountSubType.TAX_PAYABLE_SGST, balance: 0 },
    { code: '2004', name: 'Output IGST Payable', accountType: AccountType.LIABILITY, subType: AccountSubType.TAX_PAYABLE_IGST, balance: 0 },
    
    { code: '3001', name: "Owner's Capital / Equity", accountType: AccountType.EQUITY, subType: AccountSubType.OWNERS_EQUITY, balance: 395000 },
    { code: '3002', name: 'Retained Earnings', accountType: AccountType.EQUITY, subType: AccountSubType.RETAINED_EARNINGS, balance: 0 },
    
    { code: '4001', name: 'Sales Revenue', accountType: AccountType.REVENUE, subType: AccountSubType.SALES_REVENUE, balance: 0 },
    { code: '4002', name: 'Other Operating Income', accountType: AccountType.REVENUE, subType: AccountSubType.OTHER_INCOME, balance: 0 },
    
    { code: '5001', name: 'Cost of Goods Sold (COGS)', accountType: AccountType.EXPENSE, subType: AccountSubType.COST_OF_GOODS_SOLD, balance: 0 },
    { code: '5002', name: 'Operating & Admin Expenses', accountType: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, balance: 0 },
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { code_companyId: { code: acc.code, companyId: company.id } },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        accountType: acc.accountType,
        subType: acc.subType,
        currentBalance: acc.balance,
        isSystem: true,
        companyId: company.id,
      },
    });
  }

  // 5. Users
  const passwordHash = await hashPassword('admin123');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mjcglobaltech.com' },
    update: {},
    create: {
      email: 'admin@mjcglobaltech.com',
      passwordHash,
      name: 'Rajesh Kumar',
      role: UserRole.ADMIN,
      phone: '+91 98450 12345',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@mjcglobaltech.com' },
    update: {},
    create: {
      email: 'manager@mjcglobaltech.com',
      passwordHash,
      name: 'Priya Sharma',
      role: UserRole.MANAGER,
      phone: '+91 98450 67890',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'accountant@mjcglobaltech.com' },
    update: {},
    create: {
      email: 'accountant@mjcglobaltech.com',
      passwordHash,
      name: 'Suresh Mehta',
      role: UserRole.ACCOUNTANT,
      phone: '+91 98450 11223',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'sales@mjcglobaltech.com' },
    update: {},
    create: {
      email: 'sales@mjcglobaltech.com',
      passwordHash,
      name: 'Vikram Singh',
      role: UserRole.SALESPERSON,
      phone: '+91 98450 44556',
      companyId: company.id,
    },
  });

  // 6. Warehouses
  const whMain = await prisma.warehouse.create({
    data: {
      name: 'Central Warehouse (Bengaluru)',
      code: 'WH-BLR-01',
      address: 'Plot 18, Electronic City Phase 1, Bengaluru',
      isDefault: true,
      companyId: company.id,
    },
  });

  const whSec = await prisma.warehouse.create({
    data: {
      name: 'Whitefield Depot Hub',
      code: 'WH-BLR-02',
      address: 'ITPL Main Road, Whitefield, Bengaluru',
      isDefault: false,
      companyId: company.id,
    },
  });

  // 7. Categories & Units
  const catLaptops = await prisma.productCategory.create({
    data: { name: 'Laptops & Workstations', description: 'Enterprise and Business laptops', companyId: company.id },
  });
  const catMonitors = await prisma.productCategory.create({
    data: { name: 'Monitors & Displays', description: '4K, IPS and Curved Displays', companyId: company.id },
  });
  const catNetworking = await prisma.productCategory.create({
    data: { name: 'Networking Equipment', description: 'Switches, Routers, Access Points', companyId: company.id },
  });
  const catStorage = await prisma.productCategory.create({
    data: { name: 'Storage & Memory', description: 'SSDs, NVMe drives, RAM modules', companyId: company.id },
  });
  const catAccessories = await prisma.productCategory.create({
    data: { name: 'Peripherals & Accessories', description: 'Mice, Keyboards, Docking stations', companyId: company.id },
  });

  const unitPcs = await prisma.unit.create({
    data: { name: 'Pieces', symbol: 'PCS', companyId: company.id },
  });
  const unitNos = await prisma.unit.create({
    data: { name: 'Numbers', symbol: 'NOS', companyId: company.id },
  });
  const unitBox = await prisma.unit.create({
    data: { name: 'Boxes', symbol: 'BOX', companyId: company.id },
  });

  // 8. Products
  const productsData = [
    {
      name: 'Dell Latitude 5440 Core i7 Laptop (16GB/512GB SSD)',
      sku: 'LAP-DELL-5440',
      barcode: '890123456701',
      description: 'Intel Core i7 13th Gen, 16GB DDR5, 512GB PCIe NVMe SSD, 14" FHD IPS Anti-Glare',
      categoryId: catLaptops.id,
      unitId: unitPcs.id,
      purchasePrice: 62000,
      sellingPrice: 74500,
      mrp: 82000,
      minStockLevel: 5,
      openingStock: 25,
      hsnCode: '84713010',
      taxRateId: tax18.id,
    },
    {
      name: 'Lenovo ThinkPad E14 Gen 5 Ryzen 7 (16GB/1TB SSD)',
      sku: 'LAP-LNV-E14',
      barcode: '890123456702',
      description: 'AMD Ryzen 7 7730U, 16GB DDR4, 1TB NVMe, Aluminum Chassis, Backlit Keyboard',
      categoryId: catLaptops.id,
      unitId: unitPcs.id,
      purchasePrice: 54000,
      sellingPrice: 65000,
      mrp: 72000,
      minStockLevel: 4,
      openingStock: 18,
      hsnCode: '84713010',
      taxRateId: tax18.id,
    },
    {
      name: 'Samsung 27" 4K UHD IPS Professional Monitor (S27A700)',
      sku: 'MON-SAM-27UHD',
      barcode: '890123456703',
      description: '3840x2160 UHD Resolution, HDR10, Borderless Design, HDMI/DP Ports',
      categoryId: catMonitors.id,
      unitId: unitPcs.id,
      purchasePrice: 21500,
      sellingPrice: 27900,
      mrp: 32500,
      minStockLevel: 8,
      openingStock: 30,
      hsnCode: '85285200',
      taxRateId: tax18.id,
    },
    {
      name: 'Cisco Catalyst 1000 24-Port Gigabit Ethernet Switch',
      sku: 'NET-CISCO-24G',
      barcode: '890123456704',
      description: '24x 10/100/1000 Gigabit Ports + 4x 1G SFP Uplinks, Managed Switch',
      categoryId: catNetworking.id,
      unitId: unitNos.id,
      purchasePrice: 16000,
      sellingPrice: 22500,
      mrp: 26000,
      minStockLevel: 3,
      openingStock: 12,
      hsnCode: '85176290',
      taxRateId: tax18.id,
    },
    {
      name: 'Samsung 980 Pro 2TB PCIe 4.0 NVMe M.2 Internal SSD',
      sku: 'SSD-SAM-980P2',
      barcode: '890123456705',
      description: 'Read speeds up to 7000 MB/s, V-NAND 3-bit MLC, Heatsink compatible',
      categoryId: catStorage.id,
      unitId: unitPcs.id,
      purchasePrice: 11200,
      sellingPrice: 15400,
      mrp: 18500,
      minStockLevel: 10,
      openingStock: 45,
      hsnCode: '84717020',
      taxRateId: tax18.id,
    },
    {
      name: 'Logitech MX Master 3S Wireless Performance Mouse',
      sku: 'ACC-LOGI-MX3S',
      barcode: '890123456706',
      description: '8000 DPI Any-Surface Tracking, Quiet Clicks, MagSpeed Scrolling, Bluetooth/USB',
      categoryId: catAccessories.id,
      unitId: unitPcs.id,
      purchasePrice: 6500,
      sellingPrice: 8995,
      mrp: 10995,
      minStockLevel: 12,
      openingStock: 50,
      hsnCode: '84716060',
      taxRateId: tax18.id,
    },
    {
      name: 'APC Back-UPS Pro 1100VA 230V Line Interactive UPS',
      sku: 'PWR-APC-1100',
      barcode: '890123456707',
      description: '1100VA / 660W, Automatic Voltage Regulation (AVR), LCD interface',
      categoryId: catAccessories.id,
      unitId: unitNos.id,
      purchasePrice: 6800,
      sellingPrice: 9200,
      mrp: 11500,
      minStockLevel: 5,
      openingStock: 15,
      hsnCode: '85044090',
      taxRateId: tax18.id,
    },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({
      data: {
        ...p,
        currentStock: p.openingStock,
        companyId: company.id,
      },
    });

    // Create Stock & StockMovement
    await prisma.stock.create({
      data: {
        productId: prod.id,
        warehouseId: whMain.id,
        quantity: p.openingStock,
        companyId: company.id,
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        warehouseId: whMain.id,
        movementType: MovementType.OPENING_STOCK,
        quantity: p.openingStock,
        balanceAfter: p.openingStock,
        unitPrice: p.purchasePrice,
        totalValue: p.openingStock * p.purchasePrice,
        referenceType: 'OPENING',
        notes: 'Initial opening stock ledger entry',
        createdById: adminUser.id,
        companyId: company.id,
      },
    });

    createdProducts.push(prod);
  }

  // 9. Customers
  const cust1 = await prisma.customer.create({
    data: {
      customerCode: 'CUST-001',
      name: 'Infosys Edge Solutions LLP',
      companyName: 'Infosys Edge Solutions',
      gstin: '29AAACI1234A1Z1',
      pan: 'AAACI1234A',
      email: 'procurement@infosys-edge.example.com',
      phone: '+91 80 2852 0364',
      billingAddress: 'Plot 44, Electronic City, Hosur Road',
      state: 'Karnataka',
      stateCode: '29',
      city: 'Bengaluru',
      pincode: '560100',
      creditLimit: 500000,
      openingBalance: 0,
      currentBalance: 0,
      companyId: company.id,
    },
  });

  const cust2 = await prisma.customer.create({
    data: {
      customerCode: 'CUST-002',
      name: 'Reliance Cloud Technologies Ltd',
      companyName: 'Reliance Cloud Technologies',
      gstin: '27AAACR9876C1Z3',
      pan: 'AAACR9876C',
      email: 'vendor-desk@reliancecloud.example.com',
      phone: '+91 22 4477 8899',
      billingAddress: 'Maker Chambers IV, Nariman Point',
      state: 'Maharashtra',
      stateCode: '27',
      city: 'Mumbai',
      pincode: '400021',
      creditLimit: 1000000,
      openingBalance: 0,
      currentBalance: 0,
      companyId: company.id,
    },
  });

  const cust3 = await prisma.customer.create({
    data: {
      customerCode: 'CUST-003',
      name: 'Bharat Retail Services Ltd',
      companyName: 'Bharat Retail Services',
      gstin: '07AAACB4321D1Z4',
      pan: 'AAACB4321D',
      email: 'accounts@bharatretail.example.com',
      phone: '+91 11 2334 5566',
      billingAddress: 'Barakhamba Road, Connaught Place',
      state: 'Delhi',
      stateCode: '07',
      city: 'New Delhi',
      pincode: '110001',
      creditLimit: 400000,
      openingBalance: 0,
      currentBalance: 0,
      companyId: company.id,
    },
  });

  // 10. Suppliers
  const supp1 = await prisma.supplier.create({
    data: {
      supplierCode: 'SUPP-001',
      name: 'Ingram Micro India Pvt Ltd',
      companyName: 'Ingram Micro Distribution',
      gstin: '29AAACI3344P1Z8',
      pan: 'AAACI3344P',
      email: 'sales@ingrammicro.example.in',
      phone: '+91 80 4110 5500',
      address: 'Prestige Meridian, MG Road, Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      city: 'Bengaluru',
      pincode: '560001',
      openingBalance: 0,
      currentBalance: 0,
      companyId: company.id,
    },
  });

  const supp2 = await prisma.supplier.create({
    data: {
      supplierCode: 'SUPP-002',
      name: 'Redington India Limited',
      companyName: 'Redington Distribution',
      gstin: '33AAACR2211Q1Z6',
      pan: 'AAACR2211Q',
      email: 'orders@redingtongroup.example.com',
      phone: '+91 44 4224 3355',
      address: 'SPL Guindy House, Mount Road, Guindy',
      state: 'Tamil Nadu',
      stateCode: '33',
      city: 'Chennai',
      pincode: '600032',
      openingBalance: 0,
      currentBalance: 0,
      companyId: company.id,
    },
  });

  // 11. Expense Categories
  const expRent = await prisma.expenseCategory.create({
    data: { name: 'Office Rent & Maintenance', code: 'RENT', description: 'Commercial premises rental', companyId: company.id },
  });
  const expSalary = await prisma.expenseCategory.create({
    data: { name: 'Staff Salaries & Wages', code: 'SALARY', description: 'Monthly employee compensation', companyId: company.id },
  });
  const expUtil = await prisma.expenseCategory.create({
    data: { name: 'Electricity & Utilities', code: 'UTIL', description: 'BESCOM power & water supply', companyId: company.id },
  });
  const expLogistics = await prisma.expenseCategory.create({
    data: { name: 'Transport & Freight', code: 'FREIGHT', description: 'Courier, delivery and freight', companyId: company.id },
  });
  const expSoftware = await prisma.expenseCategory.create({
    data: { name: 'Software & Internet Subscriptions', code: 'SOFT', description: 'AWS, Google Workspace, ISP', companyId: company.id },
  });

  // 12. Create Sample Sales Invoice #1 (Intra-State: Karnataka -> Karnataka)
  // 2x Dell Laptops (74,500 * 2 = 1,49,000) + 2x Samsung Monitors (27,900 * 2 = 55,800)
  // Subtotal: 2,04,800. GST 18% (CGST 9% = 18,432, SGST 9% = 18,432). Total: 2,41,664.
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNo: 'APX-INV-2026-0001',
      invoiceDate: new Date('2026-08-10'),
      dueDate: new Date('2026-08-25'),
      customerId: cust1.id,
      isInterState: false,
      subtotal: 204800,
      discountAmount: 0,
      taxAmount: 36864,
      cgstTotal: 18432,
      sgstTotal: 18432,
      igstTotal: 0,
      roundOff: 0,
      totalAmount: 241664,
      paidAmount: 241664,
      outstandingAmount: 0,
      status: InvoiceStatus.PAID,
      paymentTerms: 'Net 15',
      notes: 'Thank you for your business! Delivered via Express Courier.',
      createdById: adminUser.id,
      companyId: company.id,
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            description: createdProducts[0].name,
            hsnCode: createdProducts[0].hsnCode,
            quantity: 2,
            unitPrice: 74500,
            taxRate: 18,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
            cgstAmount: 13410,
            sgstAmount: 13410,
            igstAmount: 0,
            totalAmount: 175820,
          },
          {
            productId: createdProducts[2].id,
            description: createdProducts[2].name,
            hsnCode: createdProducts[2].hsnCode,
            quantity: 2,
            unitPrice: 27900,
            taxRate: 18,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
            cgstAmount: 5022,
            sgstAmount: 5022,
            igstAmount: 0,
            totalAmount: 65844,
          },
        ],
      },
    },
  });

  // Adjust stock for Inv 1
  await prisma.product.update({
    where: { id: createdProducts[0].id },
    data: { currentStock: { decrement: 2 } },
  });
  await prisma.stock.update({
    where: { productId_warehouseId: { productId: createdProducts[0].id, warehouseId: whMain.id } },
    data: { quantity: { decrement: 2 } },
  });
  await prisma.stockMovement.create({
    data: {
      productId: createdProducts[0].id,
      warehouseId: whMain.id,
      movementType: MovementType.INVOICE_SALE,
      quantity: -2,
      balanceAfter: 23,
      unitPrice: 74500,
      totalValue: 149000,
      referenceType: 'INVOICE',
      referenceId: inv1.id,
      createdById: adminUser.id,
      companyId: company.id,
    },
  });

  await prisma.product.update({
    where: { id: createdProducts[2].id },
    data: { currentStock: { decrement: 2 } },
  });
  await prisma.stock.update({
    where: { productId_warehouseId: { productId: createdProducts[2].id, warehouseId: whMain.id } },
    data: { quantity: { decrement: 2 } },
  });
  await prisma.stockMovement.create({
    data: {
      productId: createdProducts[2].id,
      warehouseId: whMain.id,
      movementType: MovementType.INVOICE_SALE,
      quantity: -2,
      balanceAfter: 28,
      unitPrice: 27900,
      totalValue: 55800,
      referenceType: 'INVOICE',
      referenceId: inv1.id,
      createdById: adminUser.id,
      companyId: company.id,
    },
  });

  // Payment for Invoice 1
  const pay1 = await prisma.payment.create({
    data: {
      paymentNo: 'APX-REC-2026-0001',
      paymentDate: new Date('2026-08-11'),
      partyType: PartyType.CUSTOMER,
      customerId: cust1.id,
      paymentMode: PaymentMode.BANK_TRANSFER,
      amount: 241664,
      referenceNo: 'HDFCR52026081100912',
      notes: 'NEFT Payment from Infosys Edge for Inv #0001',
      createdById: adminUser.id,
      companyId: company.id,
      allocations: {
        create: {
          invoiceId: inv1.id,
          allocatedAmount: 241664,
        },
      },
    },
  });

  // 13. Create Sample Sales Invoice #2 (Inter-State: Karnataka -> Maharashtra)
  // 1x Cisco Switch (22,500) + 5x Samsung 2TB SSDs (15,400 * 5 = 77,000)
  // Subtotal: 99,500. GST 18% (IGST 18% = 17,910). Total: 1,17,410.
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNo: 'APX-INV-2026-0002',
      invoiceDate: new Date('2026-08-14'),
      dueDate: new Date('2026-08-29'),
      customerId: cust2.id,
      isInterState: true,
      subtotal: 99500,
      discountAmount: 0,
      taxAmount: 17910,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 17910,
      roundOff: 0,
      totalAmount: 117410,
      paidAmount: 50000,
      outstandingAmount: 67410,
      status: InvoiceStatus.PARTIALLY_PAID,
      paymentTerms: 'Net 15',
      notes: 'Inter-state B2B delivery via Blue Dart Express',
      createdById: adminUser.id,
      companyId: company.id,
      items: {
        create: [
          {
            productId: createdProducts[3].id,
            description: createdProducts[3].name,
            hsnCode: createdProducts[3].hsnCode,
            quantity: 1,
            unitPrice: 22500,
            taxRate: 18,
            cgstRate: 0,
            sgstRate: 0,
            igstRate: 18,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 4050,
            totalAmount: 26550,
          },
          {
            productId: createdProducts[4].id,
            description: createdProducts[4].name,
            hsnCode: createdProducts[4].hsnCode,
            quantity: 5,
            unitPrice: 15400,
            taxRate: 18,
            cgstRate: 0,
            sgstRate: 0,
            igstRate: 18,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 13860,
            totalAmount: 90860,
          },
        ],
      },
    },
  });

  // Adjust stock for Inv 2
  await prisma.product.update({
    where: { id: createdProducts[3].id },
    data: { currentStock: { decrement: 1 } },
  });
  await prisma.stockMovement.create({
    data: {
      productId: createdProducts[3].id,
      warehouseId: whMain.id,
      movementType: MovementType.INVOICE_SALE,
      quantity: -1,
      balanceAfter: 11,
      unitPrice: 22500,
      totalValue: 22500,
      referenceType: 'INVOICE',
      referenceId: inv2.id,
      createdById: adminUser.id,
      companyId: company.id,
    },
  });

  await prisma.product.update({
    where: { id: createdProducts[4].id },
    data: { currentStock: { decrement: 5 } },
  });
  await prisma.stockMovement.create({
    data: {
      productId: createdProducts[4].id,
      warehouseId: whMain.id,
      movementType: MovementType.INVOICE_SALE,
      quantity: -5,
      balanceAfter: 40,
      unitPrice: 15400,
      totalValue: 77000,
      referenceType: 'INVOICE',
      referenceId: inv2.id,
      createdById: adminUser.id,
      companyId: company.id,
    },
  });

  // Update Customer 2 Outstanding Balance
  await prisma.customer.update({
    where: { id: cust2.id },
    data: { currentBalance: 67410 },
  });

  // Partial Payment for Invoice 2
  await prisma.payment.create({
    data: {
      paymentNo: 'APX-REC-2026-0002',
      paymentDate: new Date('2026-08-15'),
      partyType: PartyType.CUSTOMER,
      customerId: cust2.id,
      paymentMode: PaymentMode.UPI,
      amount: 50000,
      referenceNo: 'UPI/422891002341',
      notes: 'Part advance payment via UPI from Reliance Cloud',
      createdById: adminUser.id,
      companyId: company.id,
      allocations: {
        create: {
          invoiceId: inv2.id,
          allocatedAmount: 50000,
        },
      },
    },
  });

  // 14. Sample Expenses
  await prisma.expense.create({
    data: {
      expenseNo: 'APX-EXP-2026-0001',
      expenseDate: new Date('2026-08-05'),
      categoryId: expRent.id,
      amount: 35000,
      paymentMode: PaymentMode.BANK_TRANSFER,
      payeeName: 'Brigade Commercial Properties',
      description: 'Office rent for August 2026',
      referenceNo: 'TXN-RENT-AUG26',
      isGstClaimable: true,
      gstin: '29AABCB8877E1Z0',
      cgstAmount: 3150,
      sgstAmount: 3150,
      igstAmount: 0,
      totalWithTax: 41300,
      createdById: adminUser.id,
      companyId: company.id,
    },
  });

  await prisma.expense.create({
    data: {
      expenseNo: 'APX-EXP-2026-0002',
      expenseDate: new Date('2026-08-08'),
      categoryId: expUtil.id,
      amount: 8400,
      paymentMode: PaymentMode.UPI,
      payeeName: 'BESCOM Power Utility',
      description: 'Electricity bill for Koramangala office',
      referenceNo: 'BESCOM-AUG-991',
      isGstClaimable: false,
      totalWithTax: 8400,
      createdById: adminUser.id,
      companyId: company.id,
    },
  });

  // 15. Create Balanced Journal Entries for the Transactions
  const arAcc = await prisma.account.findUnique({ where: { code_companyId: { code: '1003', companyId: company.id } } });
  const salesAcc = await prisma.account.findUnique({ where: { code_companyId: { code: '4001', companyId: company.id } } });
  const cgstPay = await prisma.account.findUnique({ where: { code_companyId: { code: '2002', companyId: company.id } } });
  const sgstPay = await prisma.account.findUnique({ where: { code_companyId: { code: '2003', companyId: company.id } } });
  const igstPay = await prisma.account.findUnique({ where: { code_companyId: { code: '2004', companyId: company.id } } });
  const bankAcc = await prisma.account.findUnique({ where: { code_companyId: { code: '1002', companyId: company.id } } });
  const expAcc = await prisma.account.findUnique({ where: { code_companyId: { code: '5002', companyId: company.id } } });
  const cgstCred = await prisma.account.findUnique({ where: { code_companyId: { code: '1005', companyId: company.id } } });
  const sgstCred = await prisma.account.findUnique({ where: { code_companyId: { code: '1006', companyId: company.id } } });

  // JV 1: Sales Invoice 1
  if (arAcc && salesAcc && cgstPay && sgstPay) {
    await prisma.journalEntry.create({
      data: {
        entryNo: 'JV-2026-00001',
        entryDate: new Date('2026-08-10'),
        referenceType: EntryReferenceType.INVOICE,
        referenceId: inv1.id,
        narration: 'Sales Invoice #APX-INV-2026-0001 to Infosys Edge Solutions',
        totalDebit: 241664,
        totalCredit: 241664,
        companyId: company.id,
        lines: {
          create: [
            { accountId: arAcc.id, debitAmount: 241664, creditAmount: 0, description: 'Debtors - Infosys' },
            { accountId: salesAcc.id, debitAmount: 0, creditAmount: 204800, description: 'Sales Revenue' },
            { accountId: cgstPay.id, debitAmount: 0, creditAmount: 18432, description: 'Output CGST 9%' },
            { accountId: sgstPay.id, debitAmount: 0, creditAmount: 18432, description: 'Output SGST 9%' },
          ],
        },
      },
    });
  }

  // JV 2: Customer Payment 1
  if (bankAcc && arAcc) {
    await prisma.journalEntry.create({
      data: {
        entryNo: 'JV-2026-00002',
        entryDate: new Date('2026-08-11'),
        referenceType: EntryReferenceType.PAYMENT,
        referenceId: pay1.id,
        narration: 'Customer Receipt #APX-REC-2026-0001 from Infosys Edge',
        totalDebit: 241664,
        totalCredit: 241664,
        companyId: company.id,
        lines: {
          create: [
            { accountId: bankAcc.id, debitAmount: 241664, creditAmount: 0, description: 'HDFC Bank deposit' },
            { accountId: arAcc.id, debitAmount: 0, creditAmount: 241664, description: 'Clearing AR' },
          ],
        },
      },
    });
  }

  // JV 3: Sales Invoice 2 (Inter-State)
  if (arAcc && salesAcc && igstPay) {
    await prisma.journalEntry.create({
      data: {
        entryNo: 'JV-2026-00003',
        entryDate: new Date('2026-08-14'),
        referenceType: EntryReferenceType.INVOICE,
        referenceId: inv2.id,
        narration: 'Sales Invoice #APX-INV-2026-0002 to Reliance Cloud Tech (Inter-state)',
        totalDebit: 117410,
        totalCredit: 117410,
        companyId: company.id,
        lines: {
          create: [
            { accountId: arAcc.id, debitAmount: 117410, creditAmount: 0, description: 'Debtors - Reliance' },
            { accountId: salesAcc.id, debitAmount: 0, creditAmount: 99500, description: 'Sales Revenue' },
            { accountId: igstPay.id, debitAmount: 0, creditAmount: 17910, description: 'Output IGST 18%' },
          ],
        },
      },
    });
  }

  // JV 4: Customer Partial Payment 2
  if (bankAcc && arAcc) {
    await prisma.journalEntry.create({
      data: {
        entryNo: 'JV-2026-00004',
        entryDate: new Date('2026-08-15'),
        referenceType: EntryReferenceType.PAYMENT,
        referenceId: 'pay-2',
        narration: 'Customer Partial Payment from Reliance Cloud Tech',
        totalDebit: 50000,
        totalCredit: 50000,
        companyId: company.id,
        lines: {
          create: [
            { accountId: bankAcc.id, debitAmount: 50000, creditAmount: 0, description: 'UPI Bank receipt' },
            { accountId: arAcc.id, debitAmount: 0, creditAmount: 50000, description: 'Partial AR reduction' },
          ],
        },
      },
    });
  }

  // JV 5: Office Rent Expense
  if (expAcc && cgstCred && sgstCred && bankAcc) {
    await prisma.journalEntry.create({
      data: {
        entryNo: 'JV-2026-00005',
        entryDate: new Date('2026-08-05'),
        referenceType: EntryReferenceType.EXPENSE,
        referenceId: 'exp-1',
        narration: 'Office Rent & Maintenance for August 2026',
        totalDebit: 41300,
        totalCredit: 41300,
        companyId: company.id,
        lines: {
          create: [
            { accountId: expAcc.id, debitAmount: 35000, creditAmount: 0, description: 'Rent Expense' },
            { accountId: cgstCred.id, debitAmount: 3150, creditAmount: 0, description: 'Input CGST on Rent' },
            { accountId: sgstCred.id, debitAmount: 3150, creditAmount: 0, description: 'Input SGST on Rent' },
            { accountId: bankAcc.id, debitAmount: 0, creditAmount: 41300, description: 'HDFC Bank payout' },
          ],
        },
      },
    });
  }

  console.log('✅ Seeding completed successfully!');
  console.log('------------------------------------------------');
  console.log('Demo Login Credentials:');
  console.log('👑 Admin:      admin@mjcglobaltech.com / admin123');
  console.log('👔 Manager:    manager@mjcglobaltech.com / admin123');
  console.log('💰 Accountant: accountant@mjcglobaltech.com / admin123');
  console.log('💼 Sales:      sales@mjcglobaltech.com / admin123');
  console.log('------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
