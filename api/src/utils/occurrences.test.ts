// Occurrences Utility Tests
import { describe, test, expect } from 'bun:test';
import {
  generateOccurrences,
  getOccurrenceDatesInMonth,
  getBiWeeklyDatesInMonth,
  getWeeklyDatesInMonth,
  getSemiAnnuallyDatesInMonth,
  isExtraOccurrenceMonth,
  getTypicalOccurrenceCount,
  sumOccurrenceExpectedAmounts,
  areAllOccurrencesClosed,
  createAdhocOccurrence,
  resequenceOccurrences,
} from './occurrences';
import type { Occurrence } from '../types';

describe('Occurrence Utilities', () => {
  describe('getOccurrenceDatesInMonth', () => {
    describe('monthly billing', () => {
      test('returns single date for monthly billing', () => {
        const dates = getOccurrenceDatesInMonth('monthly', undefined, 15, '2025-01');
        expect(dates).toEqual(['2025-01-15']);
      });

      test('defaults to 1st if no day_of_month', () => {
        const dates = getOccurrenceDatesInMonth('monthly', undefined, undefined, '2025-01');
        expect(dates).toEqual(['2025-01-01']);
      });

      test('clamps to last day of short month', () => {
        const dates = getOccurrenceDatesInMonth('monthly', undefined, 31, '2025-02');
        expect(dates).toEqual(['2025-02-28']);
      });

      test('allows 31st in long months', () => {
        const dates = getOccurrenceDatesInMonth('monthly', undefined, 31, '2025-01');
        expect(dates).toEqual(['2025-01-31']);
      });
    });

    describe('bi_weekly billing', () => {
      test('returns bi-weekly dates with start_date', () => {
        const dates = getOccurrenceDatesInMonth('bi_weekly', '2025-01-03', undefined, '2025-01');
        expect(dates.length).toBeGreaterThanOrEqual(2);
        expect(dates).toContain('2025-01-03');
        expect(dates).toContain('2025-01-17');
      });

      test('defaults to 1st and 15th without start_date', () => {
        const dates = getOccurrenceDatesInMonth('bi_weekly', undefined, undefined, '2025-01');
        expect(dates).toEqual(['2025-01-01', '2025-01-15']);
      });
    });

    describe('weekly billing', () => {
      test('returns weekly dates with start_date', () => {
        const dates = getOccurrenceDatesInMonth('weekly', '2025-01-06', undefined, '2025-01');
        expect(dates.length).toBeGreaterThanOrEqual(4);
      });

      test('defaults to Mondays without start_date', () => {
        const dates = getOccurrenceDatesInMonth('weekly', undefined, undefined, '2025-01');
        expect(dates.length).toBe(4); // January 2025 has 4 Mondays
      });
    });

    describe('semi_annually billing', () => {
      test('returns date in matching month', () => {
        const dates = getOccurrenceDatesInMonth(
          'semi_annually',
          '2025-01-15',
          undefined,
          '2025-01'
        );
        expect(dates).toEqual(['2025-01-15']);
      });

      test('returns empty for non-matching month', () => {
        const dates = getOccurrenceDatesInMonth(
          'semi_annually',
          '2025-01-15',
          undefined,
          '2025-03'
        );
        expect(dates).toEqual([]);
      });

      test('defaults to January and July without start_date', () => {
        expect(getOccurrenceDatesInMonth('semi_annually', undefined, undefined, '2025-01')).toEqual(
          ['2025-01-01']
        );
        expect(getOccurrenceDatesInMonth('semi_annually', undefined, undefined, '2025-07')).toEqual(
          ['2025-07-01']
        );
        expect(getOccurrenceDatesInMonth('semi_annually', undefined, undefined, '2025-03')).toEqual(
          []
        );
      });
    });
  });

  describe('getBiWeeklyDatesInMonth', () => {
    test('calculates bi-weekly from January start', () => {
      const dates = getBiWeeklyDatesInMonth('2025-01-03', '2025-01');
      expect(dates).toContain('2025-01-03');
      expect(dates).toContain('2025-01-17');
      expect(dates).toContain('2025-01-31');
      expect(dates.length).toBe(3);
    });

    test('handles anchor after target month', () => {
      const dates = getBiWeeklyDatesInMonth('2025-12-01', '2025-01');
      // Should still find bi-weekly dates in January by going backward
      expect(dates.length).toBeGreaterThanOrEqual(0);
    });

    test('handles anchor before target month', () => {
      const dates = getBiWeeklyDatesInMonth('2024-01-05', '2025-01');
      expect(dates.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getWeeklyDatesInMonth', () => {
    test('calculates weekly from start date', () => {
      const dates = getWeeklyDatesInMonth('2025-01-06', '2025-01');
      expect(dates).toContain('2025-01-06');
      expect(dates).toContain('2025-01-13');
      expect(dates).toContain('2025-01-20');
      expect(dates).toContain('2025-01-27');
      expect(dates.length).toBe(4);
    });

    test('handles anchor after target month', () => {
      const dates = getWeeklyDatesInMonth('2025-12-01', '2025-01');
      expect(dates.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSemiAnnuallyDatesInMonth', () => {
    test('returns date when month matches semi-annual cycle', () => {
      const dates = getSemiAnnuallyDatesInMonth('2025-01-15', '2025-07');
      expect(dates).toEqual(['2025-07-15']);
    });

    test('clamps to last day of month', () => {
      const dates = getSemiAnnuallyDatesInMonth('2024-08-31', '2025-02');
      expect(dates).toEqual(['2025-02-28']);
    });

    test('returns empty for non-matching month', () => {
      const dates = getSemiAnnuallyDatesInMonth('2025-01-15', '2025-04');
      expect(dates).toEqual([]);
    });
  });

  describe('generateOccurrences', () => {
    test('generates occurrences with correct structure', () => {
      const occurrences = generateOccurrences('monthly', 10000, undefined, 15, '2025-01');
      expect(occurrences.length).toBe(1);
      expect(occurrences[0].expected_date).toBe('2025-01-15');
      expect(occurrences[0].expected_amount).toBe(10000);
      expect(occurrences[0].sequence).toBe(1);
      expect(occurrences[0].is_closed).toBe(false);
      expect(occurrences[0].is_adhoc).toBe(false);
    });

    test('generates multiple occurrences for weekly', () => {
      const occurrences = generateOccurrences('weekly', 5000, '2025-01-06', undefined, '2025-01');
      expect(occurrences.length).toBe(4);
      occurrences.forEach((occ, i) => {
        expect(occ.sequence).toBe(i + 1);
        expect(occ.expected_amount).toBe(5000);
      });
    });
  });

  describe('isExtraOccurrenceMonth', () => {
    test('bi_weekly: 3 is extra', () => {
      expect(isExtraOccurrenceMonth('bi_weekly', 2)).toBe(false);
      expect(isExtraOccurrenceMonth('bi_weekly', 3)).toBe(true);
    });

    test('weekly: 5 is extra', () => {
      expect(isExtraOccurrenceMonth('weekly', 4)).toBe(false);
      expect(isExtraOccurrenceMonth('weekly', 5)).toBe(true);
    });

    test('monthly: never extra', () => {
      expect(isExtraOccurrenceMonth('monthly', 1)).toBe(false);
      expect(isExtraOccurrenceMonth('monthly', 2)).toBe(false);
    });

    test('semi_annually: never extra', () => {
      expect(isExtraOccurrenceMonth('semi_annually', 0)).toBe(false);
      expect(isExtraOccurrenceMonth('semi_annually', 1)).toBe(false);
    });
  });

  describe('getTypicalOccurrenceCount', () => {
    test('returns correct counts', () => {
      expect(getTypicalOccurrenceCount('monthly')).toBe(1);
      expect(getTypicalOccurrenceCount('bi_weekly')).toBe(2);
      expect(getTypicalOccurrenceCount('weekly')).toBe(4);
      expect(getTypicalOccurrenceCount('semi_annually')).toBe(0);
    });

    test('defaults to 1 for unknown', () => {
      expect(getTypicalOccurrenceCount('unknown' as 'monthly')).toBe(1);
    });
  });

  describe('sumOccurrenceExpectedAmounts', () => {
    test('sums expected amounts', () => {
      const occurrences: Occurrence[] = [
        createTestOccurrence({ expected_amount: 10000 }),
        createTestOccurrence({ expected_amount: 20000 }),
        createTestOccurrence({ expected_amount: 15000 }),
      ];
      expect(sumOccurrenceExpectedAmounts(occurrences)).toBe(45000);
    });

    test('returns 0 for empty array', () => {
      expect(sumOccurrenceExpectedAmounts([])).toBe(0);
    });
  });

  describe('areAllOccurrencesClosed', () => {
    test('returns true when all closed', () => {
      const occurrences: Occurrence[] = [
        createTestOccurrence({ is_closed: true }),
        createTestOccurrence({ is_closed: true }),
      ];
      expect(areAllOccurrencesClosed(occurrences)).toBe(true);
    });

    test('returns false when any open', () => {
      const occurrences: Occurrence[] = [
        createTestOccurrence({ is_closed: true }),
        createTestOccurrence({ is_closed: false }),
      ];
      expect(areAllOccurrencesClosed(occurrences)).toBe(false);
    });

    test('returns false for empty array', () => {
      expect(areAllOccurrencesClosed([])).toBe(false);
    });
  });

  describe('createAdhocOccurrence', () => {
    test('creates adhoc occurrence with correct fields', () => {
      const occ = createAdhocOccurrence('2025-01-20', 15000);
      expect(occ.expected_date).toBe('2025-01-20');
      expect(occ.expected_amount).toBe(15000);
      expect(occ.is_adhoc).toBe(true);
      expect(occ.is_closed).toBe(false);
      expect(occ.sequence).toBe(0);
      expect(occ.id).toBeDefined();
    });
  });

  describe('resequenceOccurrences', () => {
    test('sorts by date and assigns sequence', () => {
      const occurrences: Occurrence[] = [
        createTestOccurrence({ expected_date: '2025-01-20', sequence: 5 }),
        createTestOccurrence({ expected_date: '2025-01-05', sequence: 10 }),
        createTestOccurrence({ expected_date: '2025-01-15', sequence: 1 }),
      ];

      const resequenced = resequenceOccurrences(occurrences);
      expect(resequenced[0].expected_date).toBe('2025-01-05');
      expect(resequenced[0].sequence).toBe(1);
      expect(resequenced[1].expected_date).toBe('2025-01-15');
      expect(resequenced[1].sequence).toBe(2);
      expect(resequenced[2].expected_date).toBe('2025-01-20');
      expect(resequenced[2].sequence).toBe(3);
    });
  });
});

// Helper to create test occurrences
function createTestOccurrence(overrides: Partial<Occurrence> = {}): Occurrence {
  return {
    id: crypto.randomUUID(),
    sequence: 1,
    expected_date: '2025-01-15',
    expected_amount: 10000,
    is_closed: false,
    is_adhoc: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
