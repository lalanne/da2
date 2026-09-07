/** Decimal places for a currency's minor unit. CLP and a few others have none. */
const ZERO_DECIMAL = new Set([
  'CLP',
  'JPY',
  'KRW',
  'PYG',
  'VND',
  'ISK',
  'COP',
]);

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Parse user input ("12.500", "12500", "1.234,56") into an integer amount in
 * the currency's minor unit, or null if it isn't a valid non-negative number.
 */
export function parseAmount(input: string, currency: string): number | null {
  const decimals = currencyDecimals(currency);
  let s = input.trim();
  if (!s) return null;

  if (decimals === 0) {
    // Accept a plain integer or one with 3-digit thousands groups; reject a
    // trailing 1-2 digit group (that would be cents, which CLP has none of).
    if (!/^\d+$/.test(s) && !/^\d{1,3}([.,\s]\d{3})+$/.test(s)) return null;
    return Number(s.replace(/[.,\s]/g, ''));
  }

  // Normalise "1.234,56" / "1,234.56" → "1234.56"
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const decSep = lastDot > lastComma ? '.' : ',';
  s = s
    .split('')
    .filter((c) => /\d/.test(c) || c === decSep)
    .join('')
    .replace(decSep, '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(Number(s) * 10 ** decimals);
}

/** Format an integer minor-unit amount for display, e.g. 12500 CLP → "$12.500". */
export function formatAmount(amount: number, currency: string): string {
  const decimals = currencyDecimals(currency);
  const major = amount / 10 ** decimals;
  const [intPart, fracPart] = major.toFixed(decimals).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const symbol = currency.toUpperCase() === 'CLP' || currency.toUpperCase() === 'USD' ? '$' : '';
  const body = decimals ? `${grouped},${fracPart}` : grouped;
  return `${symbol}${body}`;
}
