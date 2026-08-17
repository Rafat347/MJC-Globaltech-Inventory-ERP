import { GSTCalculationResult } from './types';

export interface IndianState {
  code: string; // 2-digit e.g. "29"
  name: string; // "Karnataka"
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
];

export function getStateByCode(code: string): IndianState | undefined {
  return INDIAN_STATES.find((s) => s.code === code);
}

export function getStateByName(name: string): IndianState | undefined {
  return INDIAN_STATES.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

/**
 * Validates Indian GSTIN format:
 * 2 digits (State Code) + 5 uppercase letters (PAN) + 4 digits (PAN) + 1 uppercase letter (PAN)
 * + 1 alphanumeric (Entity number) + 'Z' (Default) + 1 alphanumeric (Check digit)
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

export function extractStateCodeFromGSTIN(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null;
  const code = gstin.substring(0, 2);
  const found = INDIAN_STATES.find((s) => s.code === code);
  return found ? code : null;
}

export interface InputItem {
  productId: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number; // e.g. 18.0
}

/**
 * Calculates comprehensive GST breakdowns for Sales and Purchases.
 * Determines intra-state (CGST + SGST split 50/50) vs inter-state (IGST 100%).
 */
export function calculateGST(
  sellerStateCode: string,
  buyerStateCode: string,
  items: InputItem[]
): GSTCalculationResult {
  const isInterState = sellerStateCode.trim() !== buyerStateCode.trim();

  let subtotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const calculatedItems = items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const itemSubtotal = qty * price;
    subtotal += itemSubtotal;

    let discount = Number(item.discountAmount) || 0;
    const discountPct = Number(item.discountPercent) || 0;
    if (discountPct > 0) {
      discount = (itemSubtotal * discountPct) / 100;
    }
    discountTotal += discount;

    const itemTaxable = Math.max(0, itemSubtotal - discount);
    taxableAmount += itemTaxable;

    const rate = Number(item.taxRate) || 0;

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState) {
      igstRate = rate;
      igstAmount = Number(((itemTaxable * igstRate) / 100).toFixed(2));
      igstTotal += igstAmount;
    } else {
      cgstRate = rate / 2;
      sgstRate = rate / 2;
      cgstAmount = Number(((itemTaxable * cgstRate) / 100).toFixed(2));
      sgstAmount = Number(((itemTaxable * sgstRate) / 100).toFixed(2));
      cgstTotal += cgstAmount;
      sgstTotal += sgstAmount;
    }

    const itemTotal = Number((itemTaxable + cgstAmount + sgstAmount + igstAmount).toFixed(2));

    return {
      productId: item.productId,
      description: item.description,
      hsnCode: item.hsnCode,
      quantity: qty,
      unitPrice: price,
      discountPercent: discountPct,
      discountAmount: Number(discount.toFixed(2)),
      taxableAmount: Number(itemTaxable.toFixed(2)),
      taxRate: rate,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount: itemTotal,
    };
  });

  const totalTax = Number((cgstTotal + sgstTotal + igstTotal).toFixed(2));
  const rawGrandTotal = taxableAmount + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

  return {
    isInterState,
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgstTotal: Number(cgstTotal.toFixed(2)),
    sgstTotal: Number(sgstTotal.toFixed(2)),
    igstTotal: Number(igstTotal.toFixed(2)),
    totalTax,
    roundOff,
    grandTotal,
    items: calculatedItems,
  };
}
