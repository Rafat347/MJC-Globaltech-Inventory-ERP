/**
 * Converts a numeric amount into Words in the Indian Numbering System (Lakhs & Crores)
 * Example: 145250.50 -> "Rupees One Lakh Forty-Five Thousand Two Hundred Fifty and Fifty Paise Only"
 */
export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n < 20) return twoDigits[n - 10];
    const tens = Math.floor(n / 10);
    const unit = n % 10;
    return tensMultiple[tens] + (unit > 0 ? '-' + singleDigits[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let result = '';
    if (hundred > 0) {
      result += singleDigits[hundred] + ' Hundred';
      if (rest > 0) result += ' ';
    }
    if (rest > 0) {
      result += convertTwoDigits(rest);
    }
    return result;
  }

  const rounded = Math.abs(amount);
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let result = '';

  const crores = Math.floor(rupees / 10000000);
  const lakhs = Math.floor((rupees % 10000000) / 100000);
  const thousands = Math.floor((rupees % 100000) / 1000);
  const remaining = rupees % 1000;

  if (crores > 0) {
    result += convertTwoDigits(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    result += convertTwoDigits(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    result += convertTwoDigits(thousands) + ' Thousand ';
  }
  if (remaining > 0) {
    result += convertThreeDigits(remaining);
  }

  result = result.trim();
  if (!result) result = 'Zero';

  let finalString = `Rupees ${result}`;

  if (paise > 0) {
    finalString += ` and ${convertTwoDigits(paise)} Paise`;
  }

  finalString += ' Only';
  return finalString;
}

/**
 * Generates an NPCI UPI payment URL string suitable for dynamic QR codes:
 * upi://pay?pa=merchant@upi&pn=BusinessName&am=12500.00&cu=INR&tn=Invoice%20INV-2026-001
 */
export function generateUPIPaymentUrl(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNo: string;
}): string {
  const { upiId, payeeName, amount, invoiceNo } = params;
  if (!upiId) return '';
  const note = `Invoice ${invoiceNo}`;
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
}

/**
 * Formats Indian Currency (INR):
 * ₹ 1,50,000.00
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
