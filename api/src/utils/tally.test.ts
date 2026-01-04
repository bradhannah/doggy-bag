// Tally Utility Tests
import { describe, test, expect } from 'bun:test';
import {
  getEffectiveBillAmount,
  getRemainingBillAmount,
  calculateBillsTally,
  getEffectiveIncomeAmount,
  getRemainingIncomeAmount,
  calculateIncomeTally,
  calculateCategoryBillSubtotal,
  calculateCategoryIncomeSubtotal,
  calculateRegularBillsTally,
  calculateAdhocBillsTally,
  calculateRegularIncomeTally,
  calculateAdhocIncomeTally,
  combineTallies,
} from './tally';
import type { BillInstance, IncomeInstance, Occurrence, Payment, SectionTally } from '../types';

// Helper to create test payments
function createPayment(amount: number, date: string = '2025-01-15'): Payment {
  return {
    id: crypto.randomUUID(),
    amount,
    date,
    created_at: new Date().toISOString(),
  };
}

// Helper to create test occurrences
function createOccurrence(
  expectedAmount: number,
  payments: Payment[] = [],
  isClosed: boolean = false
): Occurrence {
  return {
    id: crypto.randomUUID(),
    sequence: 1,
    expected_date: '2025-01-15',
    expected_amount: expectedAmount,
    is_closed: isClosed,
    payments,
    is_adhoc: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Helper to create test bill instances
function createBillInstance(overrides: Partial<BillInstance> = {}): BillInstance {
  return {
    id: crypto.randomUUID(),
    bill_id: crypto.randomUUID(),
    month: '2025-01',
    billing_period: 'monthly',
    expected_amount: 10000, // $100.00
    occurrences: [],
    is_default: true,
    is_closed: false,
    is_adhoc: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create test income instances
function createIncomeInstance(overrides: Partial<IncomeInstance> = {}): IncomeInstance {
  return {
    id: crypto.randomUUID(),
    income_id: crypto.randomUUID(),
    month: '2025-01',
    billing_period: 'monthly',
    expected_amount: 500000, // $5,000.00
    occurrences: [],
    is_default: true,
    is_closed: false,
    is_adhoc: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Tally Utilities', () => {
  describe('getEffectiveBillAmount', () => {
    test('returns 0 when no occurrences', () => {
      const bill = createBillInstance({ occurrences: [] });
      expect(getEffectiveBillAmount(bill)).toBe(0);
    });

    test('returns 0 when occurrences have no payments', () => {
      const bill = createBillInstance({
        occurrences: [createOccurrence(10000, [])],
      });
      expect(getEffectiveBillAmount(bill)).toBe(0);
    });

    test('sums payments from single occurrence', () => {
      const bill = createBillInstance({
        occurrences: [createOccurrence(10000, [createPayment(5000), createPayment(3000)])],
      });
      expect(getEffectiveBillAmount(bill)).toBe(8000);
    });

    test('sums payments from multiple occurrences', () => {
      const bill = createBillInstance({
        occurrences: [
          createOccurrence(5000, [createPayment(5000)]),
          createOccurrence(5000, [createPayment(5000)]),
        ],
      });
      expect(getEffectiveBillAmount(bill)).toBe(10000);
    });

    test('handles partial payments', () => {
      const bill = createBillInstance({
        expected_amount: 10000,
        occurrences: [createOccurrence(10000, [createPayment(2500)])],
      });
      expect(getEffectiveBillAmount(bill)).toBe(2500);
    });
  });

  describe('getRemainingBillAmount', () => {
    test('returns 0 when bill is closed', () => {
      const bill = createBillInstance({
        is_closed: true,
        expected_amount: 10000,
        occurrences: [createOccurrence(10000, [])],
      });
      expect(getRemainingBillAmount(bill)).toBe(0);
    });

    test('returns full expected when no payments made', () => {
      const bill = createBillInstance({
        expected_amount: 10000,
        occurrences: [createOccurrence(10000, [])],
      });
      expect(getRemainingBillAmount(bill)).toBe(10000);
    });

    test('returns difference between expected and paid', () => {
      const bill = createBillInstance({
        expected_amount: 10000,
        occurrences: [createOccurrence(10000, [createPayment(7000)])],
      });
      expect(getRemainingBillAmount(bill)).toBe(3000);
    });

    test('returns 0 when fully paid', () => {
      const bill = createBillInstance({
        expected_amount: 10000,
        occurrences: [createOccurrence(10000, [createPayment(10000)])],
      });
      expect(getRemainingBillAmount(bill)).toBe(0);
    });

    test('returns 0 when overpaid (no negative remaining)', () => {
      const bill = createBillInstance({
        expected_amount: 10000,
        occurrences: [createOccurrence(10000, [createPayment(15000)])],
      });
      expect(getRemainingBillAmount(bill)).toBe(0);
    });
  });

  describe('calculateBillsTally', () => {
    test('returns zeros for empty array', () => {
      const tally = calculateBillsTally([]);
      expect(tally).toEqual({ expected: 0, actual: 0, remaining: 0 });
    });

    test('calculates tally for single bill', () => {
      const bill = createBillInstance({
        expected_amount: 10000,
        occurrences: [createOccurrence(10000, [createPayment(4000)])],
      });
      const tally = calculateBillsTally([bill]);
      expect(tally).toEqual({
        expected: 10000,
        actual: 4000,
        remaining: 6000,
      });
    });

    test('calculates tally for multiple bills', () => {
      const bills = [
        createBillInstance({
          expected_amount: 10000,
          occurrences: [createOccurrence(10000, [createPayment(10000)])],
        }),
        createBillInstance({
          expected_amount: 20000,
          occurrences: [createOccurrence(20000, [createPayment(5000)])],
        }),
        createBillInstance({
          expected_amount: 15000,
          is_closed: true,
          occurrences: [createOccurrence(15000, [createPayment(15000)])],
        }),
      ];
      const tally = calculateBillsTally(bills);
      expect(tally).toEqual({
        expected: 45000,
        actual: 30000,
        remaining: 15000, // Only second bill has remaining (closed bill = 0)
      });
    });
  });

  describe('getEffectiveIncomeAmount', () => {
    test('returns 0 when no occurrences', () => {
      const income = createIncomeInstance({ occurrences: [] });
      expect(getEffectiveIncomeAmount(income)).toBe(0);
    });

    test('returns 0 when occurrences have no payments', () => {
      const income = createIncomeInstance({
        occurrences: [createOccurrence(500000, [])],
      });
      expect(getEffectiveIncomeAmount(income)).toBe(0);
    });

    test('sums payments from occurrences', () => {
      const income = createIncomeInstance({
        occurrences: [
          createOccurrence(250000, [createPayment(250000)]),
          createOccurrence(250000, [createPayment(250000)]),
        ],
      });
      expect(getEffectiveIncomeAmount(income)).toBe(500000);
    });
  });

  describe('getRemainingIncomeAmount', () => {
    test('returns 0 when income is closed', () => {
      const income = createIncomeInstance({
        is_closed: true,
        expected_amount: 500000,
      });
      expect(getRemainingIncomeAmount(income)).toBe(0);
    });

    test('returns full expected when no payments received', () => {
      const income = createIncomeInstance({
        expected_amount: 500000,
        occurrences: [createOccurrence(500000, [])],
      });
      expect(getRemainingIncomeAmount(income)).toBe(500000);
    });

    test('returns difference between expected and received', () => {
      const income = createIncomeInstance({
        expected_amount: 500000,
        occurrences: [createOccurrence(500000, [createPayment(300000)])],
      });
      expect(getRemainingIncomeAmount(income)).toBe(200000);
    });

    test('returns 0 when fully received', () => {
      const income = createIncomeInstance({
        expected_amount: 500000,
        occurrences: [createOccurrence(500000, [createPayment(500000)])],
      });
      expect(getRemainingIncomeAmount(income)).toBe(0);
    });
  });

  describe('calculateIncomeTally', () => {
    test('returns zeros for empty array', () => {
      const tally = calculateIncomeTally([]);
      expect(tally).toEqual({ expected: 0, actual: 0, remaining: 0 });
    });

    test('calculates tally for single income', () => {
      const income = createIncomeInstance({
        expected_amount: 500000,
        occurrences: [createOccurrence(500000, [createPayment(500000)])],
      });
      const tally = calculateIncomeTally([income]);
      expect(tally).toEqual({
        expected: 500000,
        actual: 500000,
        remaining: 0,
      });
    });

    test('calculates tally for multiple incomes', () => {
      const incomes = [
        createIncomeInstance({
          expected_amount: 500000,
          occurrences: [createOccurrence(500000, [createPayment(500000)])],
        }),
        createIncomeInstance({
          expected_amount: 100000,
          occurrences: [createOccurrence(100000, [])],
        }),
      ];
      const tally = calculateIncomeTally(incomes);
      expect(tally).toEqual({
        expected: 600000,
        actual: 500000,
        remaining: 100000,
      });
    });
  });

  describe('calculateCategoryBillSubtotal', () => {
    test('returns zeros for empty array', () => {
      const subtotal = calculateCategoryBillSubtotal([]);
      expect(subtotal).toEqual({ expected: 0, actual: 0 });
    });

    test('calculates subtotal for category bills', () => {
      const bills = [
        createBillInstance({
          expected_amount: 10000,
          occurrences: [createOccurrence(10000, [createPayment(10000)])],
        }),
        createBillInstance({
          expected_amount: 20000,
          occurrences: [createOccurrence(20000, [createPayment(15000)])],
        }),
      ];
      const subtotal = calculateCategoryBillSubtotal(bills);
      expect(subtotal).toEqual({
        expected: 30000,
        actual: 25000,
      });
    });
  });

  describe('calculateCategoryIncomeSubtotal', () => {
    test('returns zeros for empty array', () => {
      const subtotal = calculateCategoryIncomeSubtotal([]);
      expect(subtotal).toEqual({ expected: 0, actual: 0 });
    });

    test('calculates subtotal for category incomes', () => {
      const incomes = [
        createIncomeInstance({
          expected_amount: 500000,
          occurrences: [createOccurrence(500000, [createPayment(500000)])],
        }),
        createIncomeInstance({
          expected_amount: 200000,
          occurrences: [createOccurrence(200000, [createPayment(100000)])],
        }),
      ];
      const subtotal = calculateCategoryIncomeSubtotal(incomes);
      expect(subtotal).toEqual({
        expected: 700000,
        actual: 600000,
      });
    });
  });

  describe('calculateRegularBillsTally', () => {
    test('excludes adhoc bills', () => {
      const bills = [
        createBillInstance({
          expected_amount: 10000,
          is_adhoc: false,
          occurrences: [createOccurrence(10000, [createPayment(10000)])],
        }),
        createBillInstance({
          expected_amount: 5000,
          is_adhoc: true, // Should be excluded
          occurrences: [createOccurrence(5000, [createPayment(5000)])],
        }),
      ];
      const tally = calculateRegularBillsTally(bills);
      expect(tally).toEqual({
        expected: 10000,
        actual: 10000,
        remaining: 0,
      });
    });

    test('handles all adhoc bills (returns zeros)', () => {
      const bills = [
        createBillInstance({ is_adhoc: true }),
        createBillInstance({ is_adhoc: true }),
      ];
      const tally = calculateRegularBillsTally(bills);
      expect(tally).toEqual({ expected: 0, actual: 0, remaining: 0 });
    });
  });

  describe('calculateAdhocBillsTally', () => {
    test('only includes adhoc bills', () => {
      const bills = [
        createBillInstance({
          expected_amount: 10000,
          is_adhoc: false, // Should be excluded
          occurrences: [createOccurrence(10000, [createPayment(10000)])],
        }),
        createBillInstance({
          expected_amount: 5000,
          is_adhoc: true,
          occurrences: [createOccurrence(5000, [createPayment(5000)])],
        }),
      ];
      const tally = calculateAdhocBillsTally(bills);
      expect(tally).toEqual({
        expected: 0, // Adhoc has no expected
        actual: 5000,
        remaining: 0, // Adhoc has no remaining
      });
    });

    test('handles no adhoc bills (returns zeros)', () => {
      const bills = [
        createBillInstance({ is_adhoc: false }),
        createBillInstance({ is_adhoc: false }),
      ];
      const tally = calculateAdhocBillsTally(bills);
      expect(tally).toEqual({ expected: 0, actual: 0, remaining: 0 });
    });

    test('sums multiple adhoc bills', () => {
      const bills = [
        createBillInstance({
          is_adhoc: true,
          occurrences: [createOccurrence(0, [createPayment(3000)])],
        }),
        createBillInstance({
          is_adhoc: true,
          occurrences: [createOccurrence(0, [createPayment(7000)])],
        }),
      ];
      const tally = calculateAdhocBillsTally(bills);
      expect(tally).toEqual({
        expected: 0,
        actual: 10000,
        remaining: 0,
      });
    });
  });

  describe('calculateRegularIncomeTally', () => {
    test('excludes adhoc income', () => {
      const incomes = [
        createIncomeInstance({
          expected_amount: 500000,
          is_adhoc: false,
          occurrences: [createOccurrence(500000, [createPayment(500000)])],
        }),
        createIncomeInstance({
          expected_amount: 10000,
          is_adhoc: true, // Should be excluded
          occurrences: [createOccurrence(10000, [createPayment(10000)])],
        }),
      ];
      const tally = calculateRegularIncomeTally(incomes);
      expect(tally).toEqual({
        expected: 500000,
        actual: 500000,
        remaining: 0,
      });
    });
  });

  describe('calculateAdhocIncomeTally', () => {
    test('only includes adhoc income', () => {
      const incomes = [
        createIncomeInstance({
          expected_amount: 500000,
          is_adhoc: false, // Should be excluded
          occurrences: [createOccurrence(500000, [createPayment(500000)])],
        }),
        createIncomeInstance({
          expected_amount: 0,
          is_adhoc: true,
          occurrences: [createOccurrence(0, [createPayment(10000)])],
        }),
      ];
      const tally = calculateAdhocIncomeTally(incomes);
      expect(tally).toEqual({
        expected: 0, // Adhoc has no expected
        actual: 10000,
        remaining: 0, // Adhoc has no remaining
      });
    });

    test('handles no adhoc income (returns zeros)', () => {
      const incomes = [createIncomeInstance({ is_adhoc: false })];
      const tally = calculateAdhocIncomeTally(incomes);
      expect(tally).toEqual({ expected: 0, actual: 0, remaining: 0 });
    });
  });

  describe('combineTallies', () => {
    test('combines two tallies correctly', () => {
      const a: SectionTally = { expected: 10000, actual: 8000, remaining: 2000 };
      const b: SectionTally = { expected: 5000, actual: 5000, remaining: 0 };
      const combined = combineTallies(a, b);
      expect(combined).toEqual({
        expected: 15000,
        actual: 13000,
        remaining: 2000,
      });
    });

    test('handles zero tallies', () => {
      const a: SectionTally = { expected: 0, actual: 0, remaining: 0 };
      const b: SectionTally = { expected: 10000, actual: 5000, remaining: 5000 };
      const combined = combineTallies(a, b);
      expect(combined).toEqual(b);
    });

    test('combines multiple zero tallies', () => {
      const a: SectionTally = { expected: 0, actual: 0, remaining: 0 };
      const b: SectionTally = { expected: 0, actual: 0, remaining: 0 };
      const combined = combineTallies(a, b);
      expect(combined).toEqual({ expected: 0, actual: 0, remaining: 0 });
    });
  });
});
