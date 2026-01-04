// Due Date Tests
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { calculateDueDate, isOverdue, getDaysOverdue, formatDueDate, isDueSoon } from './due-date';

describe('calculateDueDate', () => {
  test('returns correct date for normal day', () => {
    expect(calculateDueDate('2025-01', 15)).toBe('2025-01-15');
  });

  test('returns correct date for first day', () => {
    expect(calculateDueDate('2025-06', 1)).toBe('2025-06-01');
  });

  test('clamps to last day of month for day 31 in short month', () => {
    expect(calculateDueDate('2025-04', 31)).toBe('2025-04-30'); // April has 30 days
  });

  test('clamps to last day for February (non-leap year)', () => {
    expect(calculateDueDate('2025-02', 31)).toBe('2025-02-28');
  });

  test('clamps to last day for February (leap year)', () => {
    expect(calculateDueDate('2024-02', 31)).toBe('2024-02-29');
  });

  test('returns undefined for undefined due day', () => {
    expect(calculateDueDate('2025-01', undefined)).toBeUndefined();
  });

  test('returns undefined for zero due day', () => {
    expect(calculateDueDate('2025-01', 0)).toBeUndefined();
  });

  test('pads single digit days', () => {
    expect(calculateDueDate('2025-03', 5)).toBe('2025-03-05');
  });
});

describe('isOverdue', () => {
  let originalDate: typeof Date;

  beforeEach(() => {
    // Mock Date to be 2025-01-15
    originalDate = globalThis.Date;
    const mockDate = new Date('2025-01-15T12:00:00Z');

    class MockDate extends Date {
      constructor(value?: string | number | Date) {
        if (value === undefined) {
          super(mockDate.getTime());
        } else {
          super(value);
        }
      }
    }

    globalThis.Date = MockDate as typeof Date;
  });

  afterEach(() => {
    globalThis.Date = originalDate;
  });

  test('returns true for past due date when not paid', () => {
    expect(isOverdue('2025-01-10', false)).toBe(true);
  });

  test('returns false for past due date when paid', () => {
    expect(isOverdue('2025-01-10', true)).toBe(false);
  });

  test('returns false for future due date', () => {
    expect(isOverdue('2025-01-20', false)).toBe(false);
  });

  test('returns false for today (not overdue yet)', () => {
    expect(isOverdue('2025-01-15', false)).toBe(false);
  });

  test('returns false for undefined due date', () => {
    expect(isOverdue(undefined, false)).toBe(false);
  });
});

describe('getDaysOverdue', () => {
  let originalDate: typeof Date;

  beforeEach(() => {
    originalDate = globalThis.Date;
    const mockDate = new Date('2025-01-15T12:00:00Z');

    class MockDate extends Date {
      constructor(value?: string | number | Date) {
        if (value === undefined) {
          super(mockDate.getTime());
        } else {
          super(value);
        }
      }
    }

    globalThis.Date = MockDate as typeof Date;
  });

  afterEach(() => {
    globalThis.Date = originalDate;
  });

  test('returns positive number for overdue dates', () => {
    expect(getDaysOverdue('2025-01-10')).toBe(5);
  });

  test('returns negative number for future dates', () => {
    expect(getDaysOverdue('2025-01-20')).toBe(-5);
  });

  test('returns 0 for today', () => {
    expect(getDaysOverdue('2025-01-15')).toBe(0);
  });

  test('returns null for undefined due date', () => {
    expect(getDaysOverdue(undefined)).toBeNull();
  });
});

describe('formatDueDate', () => {
  test('formats date correctly', () => {
    expect(formatDueDate('2025-01-15')).toBe('Jan 15');
  });

  test('formats December date', () => {
    expect(formatDueDate('2025-12-25')).toBe('Dec 25');
  });

  test('returns null for undefined', () => {
    expect(formatDueDate(undefined)).toBeNull();
  });
});

describe('isDueSoon', () => {
  let originalDate: typeof Date;

  beforeEach(() => {
    originalDate = globalThis.Date;
    const mockDate = new Date('2025-01-15T12:00:00Z');

    class MockDate extends Date {
      constructor(value?: string | number | Date) {
        if (value === undefined) {
          super(mockDate.getTime());
        } else {
          super(value);
        }
      }
    }

    globalThis.Date = MockDate as typeof Date;
  });

  afterEach(() => {
    globalThis.Date = originalDate;
  });

  test('returns true for today (0 days away)', () => {
    expect(isDueSoon('2025-01-15', 3)).toBe(true);
  });

  test('returns true for date within threshold', () => {
    expect(isDueSoon('2025-01-17', 3)).toBe(true); // 2 days away
  });

  test('returns true for date exactly at threshold', () => {
    expect(isDueSoon('2025-01-18', 3)).toBe(true); // 3 days away
  });

  test('returns false for date beyond threshold', () => {
    expect(isDueSoon('2025-01-19', 3)).toBe(false); // 4 days away
  });

  test('returns false for past dates', () => {
    expect(isDueSoon('2025-01-10', 3)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isDueSoon(undefined, 3)).toBe(false);
  });

  test('uses default threshold of 3 days', () => {
    expect(isDueSoon('2025-01-18')).toBe(true); // 3 days away, default
    expect(isDueSoon('2025-01-19')).toBe(false); // 4 days away, default
  });
});
