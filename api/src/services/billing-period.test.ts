// Billing Period Tests
import { describe, test, expect } from 'bun:test';
import { 
  getActualInstancesInMonth, 
  getOccurrenceDatesInMonth,
  calculateActualMonthlyAmount,
  getMonthlyInstanceCount
} from '../utils/billing-period';

describe('Billing Period Calculations', () => {
  describe('getActualInstancesInMonth', () => {
    test('monthly always returns 1', () => {
      expect(getActualInstancesInMonth('monthly', '2025-01-15', '2025-01')).toBe(1);
      expect(getActualInstancesInMonth('monthly', '2025-01-15', '2025-02')).toBe(1);
      expect(getActualInstancesInMonth('monthly', '2025-01-15', '2025-12')).toBe(1);
    });

    test('bi-weekly from Jan 3 in January 2025 = 3 occurrences', () => {
      // Jan 3, Jan 17, Jan 31
      expect(getActualInstancesInMonth('bi_weekly', '2025-01-03', '2025-01')).toBe(3);
    });

    test('bi-weekly from Jan 3 in December 2025 = 2 occurrences', () => {
      // Dec 5, Dec 19
      expect(getActualInstancesInMonth('bi_weekly', '2025-01-03', '2025-12')).toBe(2);
    });

    test('bi-weekly from Jan 3 in February 2025 = 2 occurrences', () => {
      // Feb 14, Feb 28 (2025 is not a leap year)
      expect(getActualInstancesInMonth('bi_weekly', '2025-01-03', '2025-02')).toBe(2);
    });

    test('weekly from Jan 6 in January 2025 = 4 occurrences', () => {
      // Jan 6, 13, 20, 27 (Mondays)
      expect(getActualInstancesInMonth('weekly', '2025-01-06', '2025-01')).toBe(4);
    });

    test('weekly from Jan 6 in February 2025 = 4 occurrences', () => {
      // Feb 3, 10, 17, 24 (Mondays)
      expect(getActualInstancesInMonth('weekly', '2025-01-06', '2025-02')).toBe(4);
    });
  });

  describe('getOccurrenceDatesInMonth', () => {
    test('bi-weekly from Jan 3 in January 2025 returns correct dates', () => {
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-03', '2025-01');
      expect(dates.length).toBe(3);
      expect(dates[0].getDate()).toBe(3);
      expect(dates[1].getDate()).toBe(17);
      expect(dates[2].getDate()).toBe(31);
    });

    test('weekly from Jan 6 in January 2025 returns correct dates', () => {
      const dates = getOccurrenceDatesInMonth('weekly', '2025-01-06', '2025-01');
      expect(dates.length).toBe(4);
      expect(dates[0].getDate()).toBe(6);
      expect(dates[1].getDate()).toBe(13);
      expect(dates[2].getDate()).toBe(20);
      expect(dates[3].getDate()).toBe(27);
    });
  });

  describe('calculateActualMonthlyAmount', () => {
    test('monthly returns the base amount', () => {
      expect(calculateActualMonthlyAmount(10000, 'monthly', undefined, '2025-01')).toBe(10000);
    });

    test('bi-weekly with 3 occurrences = 3x amount', () => {
      expect(calculateActualMonthlyAmount(10000, 'bi_weekly', '2025-01-03', '2025-01')).toBe(30000);
    });

    test('bi-weekly with 2 occurrences = 2x amount', () => {
      expect(calculateActualMonthlyAmount(10000, 'bi_weekly', '2025-01-03', '2025-12')).toBe(20000);
    });

    test('weekly with 4 occurrences = 4x amount', () => {
      expect(calculateActualMonthlyAmount(10000, 'weekly', '2025-01-06', '2025-01')).toBe(40000);
    });

    test('bi-weekly without start_date falls back to average', () => {
      const avgInstances = getMonthlyInstanceCount('bi_weekly');
      const expected = Math.round(10000 * avgInstances);
      expect(calculateActualMonthlyAmount(10000, 'bi_weekly', undefined, '2025-01')).toBe(expected);
    });
  });
});
