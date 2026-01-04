// Billing Period Tests
import { describe, test, expect } from 'bun:test';
import {
  getActualInstancesInMonth,
  getOccurrenceDatesInMonth,
  calculateActualMonthlyAmount,
  getMonthlyInstanceCount,
  getBillingPeriodInfo,
  calculateMonthlyContribution,
  getBiWeeklyInstancesInMonth,
  getWeeklyInstancesInMonth,
  getSemiAnnuallyInstancesInMonth,
} from '../utils/billing-period';

describe('Billing Period Calculations', () => {
  describe('getMonthlyInstanceCount', () => {
    test('monthly returns 1', () => {
      expect(getMonthlyInstanceCount('monthly')).toBe(1);
    });

    test('bi_weekly returns ~2.17', () => {
      expect(getMonthlyInstanceCount('bi_weekly')).toBeCloseTo(2.16666667, 5);
    });

    test('weekly returns ~4.33', () => {
      expect(getMonthlyInstanceCount('weekly')).toBeCloseTo(4.33333333, 5);
    });

    test('semi_annually returns ~0.17', () => {
      expect(getMonthlyInstanceCount('semi_annually')).toBeCloseTo(0.16666667, 5);
    });
  });

  describe('getBillingPeriodInfo', () => {
    test('returns correct info for monthly', () => {
      const info = getBillingPeriodInfo('monthly');
      expect(info.period).toBe('monthly');
      expect(info.instancesPerMonth).toBe(1);
      expect(info.description).toBe('Once per month');
    });

    test('returns correct info for bi_weekly', () => {
      const info = getBillingPeriodInfo('bi_weekly');
      expect(info.period).toBe('bi_weekly');
      expect(info.description).toBe('Every 2 weeks (26 times per year)');
    });

    test('returns correct info for weekly', () => {
      const info = getBillingPeriodInfo('weekly');
      expect(info.period).toBe('weekly');
      expect(info.description).toBe('Every week (52 times per year)');
    });

    test('returns correct info for semi_annually', () => {
      const info = getBillingPeriodInfo('semi_annually');
      expect(info.period).toBe('semi_annually');
      expect(info.description).toBe('Twice per year');
    });
  });

  describe('calculateMonthlyContribution', () => {
    test('monthly returns same amount', () => {
      expect(calculateMonthlyContribution(10000, 'monthly')).toBe(10000);
    });

    test('bi_weekly returns ~2.17x amount', () => {
      expect(calculateMonthlyContribution(10000, 'bi_weekly')).toBe(21667);
    });

    test('weekly returns ~4.33x amount', () => {
      expect(calculateMonthlyContribution(10000, 'weekly')).toBe(43333);
    });

    test('semi_annually returns ~0.17x amount', () => {
      expect(calculateMonthlyContribution(10000, 'semi_annually')).toBe(1667);
    });
  });

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

    test('semi_annually returns 0 or 1 depending on month', () => {
      // Start date in January, semi-annually means January and July
      expect(getActualInstancesInMonth('semi_annually', '2025-01-15', '2025-01')).toBe(1);
      expect(getActualInstancesInMonth('semi_annually', '2025-01-15', '2025-07')).toBe(1);
      expect(getActualInstancesInMonth('semi_annually', '2025-01-15', '2025-03')).toBe(0);
    });
  });

  describe('getOccurrenceDatesInMonth', () => {
    test('monthly returns one date on same day of month', () => {
      const dates = getOccurrenceDatesInMonth('monthly', '2025-01-15', '2025-03');
      expect(dates.length).toBe(1);
      expect(dates[0].getDate()).toBe(15);
    });

    test('monthly clamps day to last day of short month', () => {
      // Start on 31st, February only has 28 days in 2025
      const dates = getOccurrenceDatesInMonth('monthly', '2025-01-31', '2025-02');
      expect(dates.length).toBe(1);
      expect(dates[0].getDate()).toBe(28);
    });

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

    test('semi_annually returns date in occurrence months', () => {
      const dates = getOccurrenceDatesInMonth('semi_annually', '2025-01-15', '2025-01');
      expect(dates.length).toBe(1);
      expect(dates[0].getDate()).toBe(15);
    });

    test('semi_annually returns empty array in non-occurrence months', () => {
      const dates = getOccurrenceDatesInMonth('semi_annually', '2025-01-15', '2025-03');
      expect(dates.length).toBe(0);
    });

    test('semi_annually handles target month before start date', () => {
      // Start date is in June 2025, checking January 2025 (before start)
      const dates = getOccurrenceDatesInMonth('semi_annually', '2025-06-15', '2025-01');
      expect(dates.length).toBe(0);
    });

    test('weekly/bi-weekly returns empty if start is after target month', () => {
      // Start date is in December, target month is January of same year (before)
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-12-01', '2025-01');
      expect(dates.length).toBe(0);
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

    test('weekly without start_date falls back to average', () => {
      const avgInstances = getMonthlyInstanceCount('weekly');
      const expected = Math.round(10000 * avgInstances);
      expect(calculateActualMonthlyAmount(10000, 'weekly', undefined, '2025-01')).toBe(expected);
    });

    test('semi_annually without start_date falls back to average', () => {
      const avgInstances = getMonthlyInstanceCount('semi_annually');
      const expected = Math.round(10000 * avgInstances);
      expect(calculateActualMonthlyAmount(10000, 'semi_annually', undefined, '2025-01')).toBe(
        expected
      );
    });
  });

  // Legacy function tests
  describe('getBiWeeklyInstancesInMonth (legacy)', () => {
    test('returns up to 3 occurrences for bi-weekly on Fridays in January', () => {
      // January 2025: Fridays are 3, 10, 17, 24, 31
      // Bi-weekly from first Friday: 3, 17, 31
      const dates = getBiWeeklyInstancesInMonth(2025, 1, 5); // 5 = Friday
      expect(dates.length).toBe(3);
      expect(dates[0].getDate()).toBe(3);
      expect(dates[1].getDate()).toBe(17);
      expect(dates[2].getDate()).toBe(31);
    });

    test('returns 2 occurrences in February', () => {
      // February 2025: Fridays are 7, 14, 21, 28
      // Bi-weekly from first Friday: 7, 21
      const dates = getBiWeeklyInstancesInMonth(2025, 2, 5);
      expect(dates.length).toBe(2);
      expect(dates[0].getDate()).toBe(7);
      expect(dates[1].getDate()).toBe(21);
    });

    test('handles months starting on the day of week', () => {
      // June 2025 starts on Sunday (day 0)
      const dates = getBiWeeklyInstancesInMonth(2025, 6, 0); // Sunday
      expect(dates.length).toBe(3);
      expect(dates[0].getDate()).toBe(1);
      expect(dates[1].getDate()).toBe(15);
      expect(dates[2].getDate()).toBe(29);
    });
  });

  describe('getWeeklyInstancesInMonth (legacy)', () => {
    test('returns all Mondays in January 2025', () => {
      // January 2025: Mondays are 6, 13, 20, 27
      const dates = getWeeklyInstancesInMonth(2025, 1, 1); // 1 = Monday
      expect(dates.length).toBe(4);
      expect(dates[0].getDate()).toBe(6);
      expect(dates[1].getDate()).toBe(13);
      expect(dates[2].getDate()).toBe(20);
      expect(dates[3].getDate()).toBe(27);
    });

    test('returns 5 occurrences when month has 5 of that day', () => {
      // March 2025: Saturdays are 1, 8, 15, 22, 29
      const dates = getWeeklyInstancesInMonth(2025, 3, 6); // 6 = Saturday
      expect(dates.length).toBe(5);
    });

    test('returns 4 occurrences in February', () => {
      const dates = getWeeklyInstancesInMonth(2025, 2, 1); // Mondays
      expect(dates.length).toBe(4);
    });
  });

  describe('getSemiAnnuallyInstancesInMonth (legacy)', () => {
    test('returns January 1st for first-half months', () => {
      const dates1 = getSemiAnnuallyInstancesInMonth(2025, 1);
      expect(dates1.length).toBe(1);
      expect(dates1[0].getMonth()).toBe(0); // January

      const dates3 = getSemiAnnuallyInstancesInMonth(2025, 3);
      expect(dates3.length).toBe(1);
      expect(dates3[0].getMonth()).toBe(0);

      const dates6 = getSemiAnnuallyInstancesInMonth(2025, 6);
      expect(dates6.length).toBe(1);
      expect(dates6[0].getMonth()).toBe(0);
    });

    test('returns July 1st for second-half months', () => {
      const dates7 = getSemiAnnuallyInstancesInMonth(2025, 7);
      expect(dates7.length).toBe(1);
      expect(dates7[0].getMonth()).toBe(6); // July

      const dates10 = getSemiAnnuallyInstancesInMonth(2025, 10);
      expect(dates10.length).toBe(1);
      expect(dates10[0].getMonth()).toBe(6);

      const dates12 = getSemiAnnuallyInstancesInMonth(2025, 12);
      expect(dates12.length).toBe(1);
      expect(dates12[0].getMonth()).toBe(6);
    });
  });
});
