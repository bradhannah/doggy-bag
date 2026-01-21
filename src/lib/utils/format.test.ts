import { describe, test, expect } from 'vitest';
import {
  formatCurrency,
  parseDollarsToCents,
  getTodayDateString,
  getFirstDayOfMonth,
  formatDate,
} from './format';

describe('formatCurrency', () => {
  test('formats positive cents', () => {
    expect(formatCurrency(1050)).toBe('$10.50');
    expect(formatCurrency(100)).toBe('$1.00');
    expect(formatCurrency(1)).toBe('$0.01');
  });

  test('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  test('formats negative cents', () => {
    expect(formatCurrency(-500)).toBe('-$5.00');
  });

  test('formats large amounts with commas', () => {
    expect(formatCurrency(123456789)).toBe('$1,234,567.89');
  });
});

describe('parseDollarsToCents', () => {
  test('parses simple dollar string', () => {
    expect(parseDollarsToCents('10.50')).toBe(1050);
    expect(parseDollarsToCents('1.00')).toBe(100);
  });

  test('parses string with dollar sign', () => {
    expect(parseDollarsToCents('$10.50')).toBe(1050);
  });

  test('parses string with commas', () => {
    expect(parseDollarsToCents('1,234.56')).toBe(123456);
  });

  test('returns 0 for invalid input', () => {
    expect(parseDollarsToCents('')).toBe(0);
    expect(parseDollarsToCents('abc')).toBe(0);
  });

  test('rounds to nearest cent', () => {
    expect(parseDollarsToCents('10.555')).toBe(1056);
    expect(parseDollarsToCents('10.554')).toBe(1055);
  });
});

describe('getTodayDateString', () => {
  test('returns YYYY-MM-DD format', () => {
    const result = getTodayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getFirstDayOfMonth', () => {
  test('returns YYYY-MM-01 format', () => {
    const result = getFirstDayOfMonth();
    expect(result).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe('formatDate', () => {
  test('formats ISO date string', () => {
    const result = formatDate('2024-06-15');
    expect(result).toContain('2024');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });

  test('formats Date object', () => {
    const result = formatDate(new Date(2024, 5, 15));
    expect(result).toContain('2024');
  });

  test('handles invalid date', () => {
    expect(formatDate('invalid')).toBe('Invalid Date');
  });
});
