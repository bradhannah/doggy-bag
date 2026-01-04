// Formatters Tests
import { describe, test, expect } from 'bun:test';
import {
  formatCurrency,
  formatCentsToDollars,
  formatDate,
  formatMonth,
  formatMonthString,
  parseCurrency,
  parseCurrencyToCents,
} from './formatters';

describe('formatCurrency', () => {
  test('formats positive amount', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  test('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  test('formats negative amount', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  test('returns $0.00 for non-number', () => {
    expect(formatCurrency('hello' as unknown as number)).toBe('$0.00');
  });

  test('formats small cents correctly', () => {
    expect(formatCurrency(0.01)).toBe('$0.01');
  });

  test('formats large amounts with commas', () => {
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
  });
});

describe('formatCentsToDollars', () => {
  test('converts cents to dollars format', () => {
    expect(formatCentsToDollars(10000)).toBe('$100.00');
  });

  test('handles single cent', () => {
    expect(formatCentsToDollars(1)).toBe('$0.01');
  });

  test('handles zero cents', () => {
    expect(formatCentsToDollars(0)).toBe('$0.00');
  });

  test('handles negative cents', () => {
    expect(formatCentsToDollars(-5000)).toBe('-$50.00');
  });
});

describe('formatDate', () => {
  test('formats Date object', () => {
    const date = new Date('2025-01-15');
    expect(formatDate(date)).toBe('01/15/2025');
  });

  test('formats ISO date string', () => {
    expect(formatDate('2025-12-25')).toBe('12/25/2025');
  });

  test('returns Invalid Date for invalid input', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });

  test('returns Invalid Date for invalid Date object', () => {
    expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
  });
});

describe('formatMonth', () => {
  test('formats January correctly', () => {
    expect(formatMonth(2025, 1)).toBe('January 2025');
  });

  test('formats December correctly', () => {
    expect(formatMonth(2025, 12)).toBe('December 2025');
  });

  test('formats middle of year', () => {
    expect(formatMonth(2024, 7)).toBe('July 2024');
  });
});

describe('formatMonthString', () => {
  test('formats YYYY-MM string to long month', () => {
    expect(formatMonthString('2025-01')).toBe('January 2025');
  });

  test('formats December string', () => {
    expect(formatMonthString('2025-12')).toBe('December 2025');
  });
});

describe('parseCurrency', () => {
  test('parses plain number string', () => {
    expect(parseCurrency('100')).toBe(100);
  });

  test('parses currency with dollar sign', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56);
  });

  test('parses currency with commas', () => {
    expect(parseCurrency('1,000,000')).toBe(1000000);
  });

  test('parses negative value', () => {
    expect(parseCurrency('-50.00')).toBe(-50);
  });

  test('returns 0 for empty string', () => {
    expect(parseCurrency('')).toBe(0);
  });

  test('returns 0 for null/undefined', () => {
    expect(parseCurrency(null as unknown as string)).toBe(0);
    expect(parseCurrency(undefined as unknown as string)).toBe(0);
  });

  test('returns 0 for non-numeric string', () => {
    expect(parseCurrency('abc')).toBe(0);
  });

  test('handles leading decimal', () => {
    expect(parseCurrency('.99')).toBe(0.99);
  });

  test('handles trailing decimal', () => {
    expect(parseCurrency('100.')).toBe(100);
  });
});

describe('parseCurrencyToCents', () => {
  test('converts dollars to cents', () => {
    expect(parseCurrencyToCents('100.00')).toBe(10000);
  });

  test('converts with dollar sign', () => {
    expect(parseCurrencyToCents('$25.50')).toBe(2550);
  });

  test('rounds to nearest cent', () => {
    expect(parseCurrencyToCents('10.999')).toBe(1100);
  });

  test('handles zero', () => {
    expect(parseCurrencyToCents('0')).toBe(0);
  });
});
