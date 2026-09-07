import { currencyDecimals, formatAmount, parseAmount } from '../money';

describe('currencyDecimals', () => {
  it('is 0 for CLP and 2 for USD', () => {
    expect(currencyDecimals('CLP')).toBe(0);
    expect(currencyDecimals('clp')).toBe(0);
    expect(currencyDecimals('USD')).toBe(2);
    expect(currencyDecimals('EUR')).toBe(2);
  });
});

describe('parseAmount (CLP, 0 decimals)', () => {
  it('parses plain and thousands-separated integers', () => {
    expect(parseAmount('12500', 'CLP')).toBe(12500);
    expect(parseAmount('12.500', 'CLP')).toBe(12500);
    expect(parseAmount('1.234.567', 'CLP')).toBe(1234567);
    expect(parseAmount(' 500 ', 'CLP')).toBe(500);
  });
  it('rejects decimals and junk', () => {
    expect(parseAmount('12,50', 'CLP')).toBeNull();
    expect(parseAmount('abc', 'CLP')).toBeNull();
    expect(parseAmount('', 'CLP')).toBeNull();
  });
});

describe('parseAmount (USD, 2 decimals)', () => {
  it('parses both separator conventions to minor units', () => {
    expect(parseAmount('12.50', 'USD')).toBe(1250);
    expect(parseAmount('1,234.56', 'USD')).toBe(123456);
    expect(parseAmount('1.234,56', 'USD')).toBe(123456);
    expect(parseAmount('12', 'USD')).toBe(1200);
  });
});

describe('formatAmount', () => {
  it('groups thousands and applies the symbol', () => {
    expect(formatAmount(12500, 'CLP')).toBe('$12.500');
    expect(formatAmount(1234567, 'CLP')).toBe('$1.234.567');
    expect(formatAmount(123456, 'USD')).toBe('$1.234,56');
    expect(formatAmount(5000, 'EUR')).toBe('50,00');
  });
});
