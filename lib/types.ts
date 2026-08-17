export type UserRole = 'ADMIN' | 'MANAGER' | 'SALESPERSON' | 'ACCOUNTANT';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  companyId?: string | null;
  companyName?: string | null;
}

export interface GSTCalculationResult {
  isInterState: boolean;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  items: Array<{
    productId: string;
    description?: string;
    hsnCode?: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    taxableAmount: number;
    taxRate: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
  }>;
}

export interface StateInfo {
  code: string;
  name: string;
  tin: string;
}

export interface AccountLedgerRow {
  date: Date;
  entryNo: string;
  referenceType: string;
  referenceId?: string | null;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
}
