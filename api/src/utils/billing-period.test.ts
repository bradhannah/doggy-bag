// Billing Period Tests - Verifies date calculation correctness
// Specifically tests for UTC timezone off-by-one bugs
//
// IMPORTANT: These tests must be run with TZ=America/Toronto (or any Western
// Hemisphere timezone) to reproduce the UTC parsing bugs. The Makefile test
// target should set this. Without it, bun test defaults to UTC and the bugs
// are invisible.
//
// To reproduce manually: TZ=America/Toronto bun test api/src/utils/billing-period.test.ts
import { describe, test, expect } from 'bun:test';
import {
  getOccurrenceDatesInMonth,
  getActualInstancesInMonth,
  calculateActualMonthlyAmount,
} from './billing-period';

/**
 * Helper: parse YYYY-MM-DD as LOCAL midnight and return day-of-week name.
 * We construct via new Date(y, m-1, d) to avoid the very UTC bug we're testing.
 */
function localDayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    dt.getDay()
  ];
}

/**
 * Helper: convert a Date object to "YYYY-MM-DD" using LOCAL time methods.
 * This avoids the bug where Date.toISOString() gives UTC date.
 */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('billing-period.ts', () => {
  // ============================================================
  // BUG REPRODUCTION: UTC off-by-one in bi-weekly dates
  // The old code used `new Date(startDate)` which parses "YYYY-MM-DD"
  // as UTC midnight. In timezones west of UTC (all Americas), this
  // shifts the anchor date back by one day, causing ALL subsequent
  // bi-weekly dates to land on the wrong day of the week.
  //
  // The test converts returned Date objects to YYYY-MM-DD strings
  // using LOCAL time methods, then checks the day-of-week of those
  // strings. This catches the bug regardless of test runner timezone.
  // ============================================================
  describe('getOccurrenceDatesInMonth - bi_weekly UTC bug', () => {
    test('BUG REPRO: bi-weekly payday starting Friday Jan 10, 2025 should produce Fridays, not Thursdays', () => {
      // User's exact scenario: payday starts 2025-01-10 (Friday), bi-weekly
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-10', '2026-04');
      const dateStrings = dates.map(toLocalDateString);

      expect(dateStrings.length).toBeGreaterThanOrEqual(2);

      for (const ds of dateStrings) {
        expect(localDayOfWeek(ds)).toBe('Friday');
      }
    });

    test('BUG REPRO: bi-weekly Gas bill starting Friday Jan 3, 2025 should produce Fridays', () => {
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-03', '2026-01');
      const dateStrings = dates.map(toLocalDateString);

      expect(dateStrings.length).toBeGreaterThanOrEqual(2);

      for (const ds of dateStrings) {
        expect(localDayOfWeek(ds)).toBe('Friday');
      }
    });

    test('bi-weekly dates should be exactly 14 days apart (checking calendar dates)', () => {
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-10', '2026-05');
      const dateStrings = dates.map(toLocalDateString);

      expect(dateStrings.length).toBeGreaterThanOrEqual(2);

      for (let i = 1; i < dateStrings.length; i++) {
        const [y1, m1, d1] = dateStrings[i - 1].split('-').map(Number);
        const [y2, m2, d2] = dateStrings[i].split('-').map(Number);
        const dt1 = new Date(y1, m1 - 1, d1);
        const dt2 = new Date(y2, m2 - 1, d2);
        const diffDays = Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBe(14);
      }
    });

    test('bi-weekly from Jan 10 2025 (Friday): April 2026 should have Apr 3 and Apr 17', () => {
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-10', '2026-04');
      const dateStrings = dates.map(toLocalDateString);

      expect(dateStrings).toContain('2026-04-03');
      expect(dateStrings).toContain('2026-04-17');
      expect(dateStrings.length).toBe(2);
    });

    test('bi-weekly from Jan 3 2025 (Friday): Jan 2026 should have Jan 2, 16, 30', () => {
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-03', '2026-01');
      const dateStrings = dates.map(toLocalDateString);

      expect(dateStrings).toEqual(['2026-01-02', '2026-01-16', '2026-01-30']);
    });

    test('bi-weekly from Jan 3 2025 (Friday): all 12 months of 2026 produce Fridays', () => {
      for (let m = 1; m <= 12; m++) {
        const month = `2026-${String(m).padStart(2, '0')}`;
        const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-03', month);
        const dateStrings = dates.map(toLocalDateString);

        expect(dateStrings.length).toBeGreaterThanOrEqual(2);

        for (const ds of dateStrings) {
          expect(localDayOfWeek(ds)).toBe('Friday');
        }
      }
    });

    test('3-paycheck month detection: May 2026 has 3 Fridays for start=Jan 10', () => {
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-10', '2026-05');
      const dateStrings = dates.map(toLocalDateString);

      expect(dateStrings.length).toBe(3);
      for (const ds of dateStrings) {
        expect(localDayOfWeek(ds)).toBe('Friday');
      }
    });
  });

  // ============================================================
  // BUG REPRODUCTION: UTC off-by-one in weekly dates
  // ============================================================
  describe('getOccurrenceDatesInMonth - weekly UTC bug', () => {
    test('BUG REPRO: weekly starting Monday Jan 6, 2025 should produce Mondays', () => {
      const dates = getOccurrenceDatesInMonth('weekly', '2025-01-06', '2026-03');
      const dateStrings = dates.map(toLocalDateString);

      expect(dateStrings.length).toBeGreaterThanOrEqual(4);

      for (const ds of dateStrings) {
        expect(localDayOfWeek(ds)).toBe('Monday');
      }
    });

    test('weekly dates should be exactly 7 days apart', () => {
      const dates = getOccurrenceDatesInMonth('weekly', '2025-01-06', '2026-03');
      const dateStrings = dates.map(toLocalDateString);

      for (let i = 1; i < dateStrings.length; i++) {
        const [y1, m1, d1] = dateStrings[i - 1].split('-').map(Number);
        const [y2, m2, d2] = dateStrings[i].split('-').map(Number);
        const dt1 = new Date(y1, m1 - 1, d1);
        const dt2 = new Date(y2, m2 - 1, d2);
        const diffDays = Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBe(7);
      }
    });
  });

  // ============================================================
  // BUG REPRODUCTION: UTC off-by-one in semi-annual dates
  // ============================================================
  describe('getOccurrenceDatesInMonth - semi_annually UTC bug', () => {
    test('semi-annual from Jan 15, 2025 should show in Jan and Jul 2026', () => {
      const janDates = getOccurrenceDatesInMonth('semi_annually', '2025-01-15', '2026-01');
      const janStrings = janDates.map(toLocalDateString);
      expect(janStrings.length).toBe(1);
      expect(janStrings[0]).toBe('2026-01-15');

      const julDates = getOccurrenceDatesInMonth('semi_annually', '2025-01-15', '2026-07');
      const julStrings = julDates.map(toLocalDateString);
      expect(julStrings.length).toBe(1);
      expect(julStrings[0]).toBe('2026-07-15');
    });

    test('semi-annual should return empty for non-matching months', () => {
      const dates = getOccurrenceDatesInMonth('semi_annually', '2025-01-15', '2026-03');
      expect(dates.length).toBe(0);
    });
  });

  // ============================================================
  // DST boundary tests
  // ============================================================
  describe('DST boundary correctness', () => {
    test('bi-weekly dates crossing spring DST (March) maintain day-of-week', () => {
      // Spring DST in 2026: March 8 (clocks spring forward)
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-10', '2026-03');
      const dateStrings = dates.map(toLocalDateString);

      for (const ds of dateStrings) {
        expect(localDayOfWeek(ds)).toBe('Friday');
      }
    });

    test('bi-weekly dates crossing fall DST (November) maintain day-of-week', () => {
      // Fall DST in 2026: November 1 (clocks fall back)
      const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-10', '2026-11');
      const dateStrings = dates.map(toLocalDateString);

      for (const ds of dateStrings) {
        expect(localDayOfWeek(ds)).toBe('Friday');
      }
    });

    test('weekly dates crossing DST maintain day-of-week', () => {
      const dates = getOccurrenceDatesInMonth('weekly', '2025-01-06', '2026-03');
      const dateStrings = dates.map(toLocalDateString);

      for (const ds of dateStrings) {
        expect(localDayOfWeek(ds)).toBe('Monday');
      }
    });
  });

  // ============================================================
  // Month boundary tests - dates should never leak into adjacent months
  // ============================================================
  describe('month boundary correctness', () => {
    test('bi-weekly dates all fall within the target month', () => {
      for (let m = 1; m <= 12; m++) {
        const month = `2026-${String(m).padStart(2, '0')}`;
        const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-03', month);
        const dateStrings = dates.map(toLocalDateString);

        for (const ds of dateStrings) {
          expect(ds.startsWith(month)).toBe(true);
        }
      }
    });

    test('weekly dates all fall within the target month', () => {
      for (let m = 1; m <= 12; m++) {
        const month = `2026-${String(m).padStart(2, '0')}`;
        const dates = getOccurrenceDatesInMonth('weekly', '2025-01-06', month);
        const dateStrings = dates.map(toLocalDateString);

        for (const ds of dateStrings) {
          expect(ds.startsWith(month)).toBe(true);
        }
      }
    });
  });

  // ============================================================
  // getActualInstancesInMonth
  // ============================================================
  describe('getActualInstancesInMonth', () => {
    test('returns 1 for monthly billing', () => {
      expect(getActualInstancesInMonth('monthly', '2025-01-15', '2026-03')).toBe(1);
    });

    test('returns correct count for bi-weekly (usually 2, sometimes 3)', () => {
      // May 2026 has 3 bi-weekly Fridays for Jan 10 anchor
      expect(getActualInstancesInMonth('bi_weekly', '2025-01-10', '2026-05')).toBe(3);
      // April 2026 has 2
      expect(getActualInstancesInMonth('bi_weekly', '2025-01-10', '2026-04')).toBe(2);
    });
  });

  // ============================================================
  // calculateActualMonthlyAmount
  // ============================================================
  describe('calculateActualMonthlyAmount', () => {
    test('monthly returns the per-occurrence amount', () => {
      expect(calculateActualMonthlyAmount(5000, 'monthly', '2025-01-15', '2026-03')).toBe(5000);
    });

    test('bi-weekly multiplies by actual occurrence count', () => {
      // April 2026: 2 occurrences -> 2 * 5000 = 10000
      expect(calculateActualMonthlyAmount(5000, 'bi_weekly', '2025-01-10', '2026-04')).toBe(10000);
      // May 2026: 3 occurrences -> 3 * 5000 = 15000
      expect(calculateActualMonthlyAmount(5000, 'bi_weekly', '2025-01-10', '2026-05')).toBe(15000);
    });
  });

  // ============================================================
  // Consistency check: billing-period.ts and occurrences.ts
  // should produce the same dates for the same inputs
  // ============================================================
  describe('cross-module consistency', () => {
    test('billing-period and occurrences modules agree on bi-weekly dates', async () => {
      const { getBiWeeklyDatesInMonth } = await import('./occurrences');

      for (let m = 1; m <= 12; m++) {
        const month = `2026-${String(m).padStart(2, '0')}`;

        // billing-period.ts returns Date[]
        const bpDates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-10', month);
        const bpStrings = bpDates.map(toLocalDateString).sort();

        // occurrences.ts returns string[] (already YYYY-MM-DD)
        const occStrings = getBiWeeklyDatesInMonth('2025-01-10', month).sort();

        expect(bpStrings).toEqual(occStrings);
      }
    });

    test('billing-period and occurrences modules agree on weekly dates', async () => {
      const { getWeeklyDatesInMonth } = await import('./occurrences');

      for (let m = 1; m <= 12; m++) {
        const month = `2026-${String(m).padStart(2, '0')}`;

        const bpDates = getOccurrenceDatesInMonth('weekly', '2025-01-06', month);
        const bpStrings = bpDates.map(toLocalDateString).sort();

        const occStrings = getWeeklyDatesInMonth('2025-01-06', month).sort();

        expect(bpStrings).toEqual(occStrings);
      }
    });
  });
});
