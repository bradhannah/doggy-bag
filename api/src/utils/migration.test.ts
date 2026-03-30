// Migration Tests - Occurrence Date Migration (UTC off-by-one fix)
//
// Tests the migrateOccurrenceDatesBills and migrateOccurrenceDatesIncomes functions
// that fix persisted data where expected_date was off by one day due to
// new Date("YYYY-MM-DD") being parsed as UTC midnight.
//
// Run with: TZ=America/Toronto bun test api/src/utils/migration.test.ts

import { describe, test, expect } from 'bun:test';
import { migrateOccurrenceDatesBills, migrateOccurrenceDatesIncomes } from './migration';
import type { Bill, Income, BillInstance, IncomeInstance, Occurrence } from '../types';

// ============================================================================
// Helpers
// ============================================================================

function makeOccurrence(overrides: Partial<Occurrence> & { expected_date: string }): Occurrence {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    sequence: 1,
    expected_amount: 100000,
    is_closed: false,
    is_adhoc: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeBillInstance(
  overrides: Partial<BillInstance> & { bill_id: string; month: string; occurrences: Occurrence[] }
): BillInstance {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    billing_period: 'bi_weekly',
    expected_amount: 200000,
    is_default: true,
    is_closed: false,
    is_adhoc: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeIncomeInstance(
  overrides: Partial<IncomeInstance> & {
    income_id: string;
    month: string;
    occurrences: Occurrence[];
  }
): IncomeInstance {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    billing_period: 'bi_weekly',
    expected_amount: 200000,
    is_default: true,
    is_closed: false,
    is_adhoc: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeBill(overrides: Partial<Bill>): Bill {
  const now = new Date().toISOString();
  return {
    id: 'bill-001',
    name: 'Test Bill',
    amount: 100000,
    billing_period: 'bi_weekly',
    payment_source_id: 'ps-001',
    category_id: 'cat-001',
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeIncome(overrides: Partial<Income>): Income {
  const now = new Date().toISOString();
  return {
    id: 'income-001',
    name: 'Test Income',
    amount: 200000,
    billing_period: 'bi_weekly',
    payment_source_id: 'ps-001',
    category_id: 'cat-001',
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============================================================================
// Tests: migrateOccurrenceDatesBills
// ============================================================================
describe('migrateOccurrenceDatesBills', () => {
  test('corrects wrong dates on open bi-weekly occurrences', () => {
    // Simulate the bug: payday starts 2025-01-10 (Friday), bi-weekly
    // In April 2026, correct dates are Apr 3 and Apr 17 (Fridays)
    // Buggy dates would be Apr 2 and Apr 16 (Thursdays)
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-02', sequence: 1 }), // Wrong (Thursday)
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }), // Wrong (Thursday)
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(true);
    expect(result.instances[0].occurrences[0].expected_date).toBe('2026-04-03'); // Friday
    expect(result.instances[0].occurrences[1].expected_date).toBe('2026-04-17'); // Friday
  });

  test('does not modify already-correct dates', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-03', sequence: 1 }), // Correct
        makeOccurrence({ expected_date: '2026-04-17', sequence: 2 }), // Correct
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
    expect(result.instances[0].occurrences[0].expected_date).toBe('2026-04-03');
    expect(result.instances[0].occurrences[1].expected_date).toBe('2026-04-17');
  });

  test('preserves closed occurrences and only fixes open ones', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({
          expected_date: '2026-04-02', // Wrong date but CLOSED - should NOT be changed
          sequence: 1,
          is_closed: true,
          closed_date: '2026-04-02',
        }),
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }), // Wrong, open - should fix
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(true);
    // Closed occurrence keeps its original (wrong) date - it's a historical record
    const closedOcc = result.instances[0].occurrences.find((o) => o.is_closed);
    expect(closedOcc?.expected_date).toBe('2026-04-02');
    // Open occurrence gets the first correct date (Apr 3 — first available in sequence)
    const openOcc = result.instances[0].occurrences.find((o) => !o.is_closed);
    expect(openOcc?.expected_date).toBe('2026-04-03');
  });

  test('skips monthly billing periods', () => {
    const bill = makeBill({
      id: 'bill-monthly',
      billing_period: 'monthly',
      day_of_month: 15,
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'monthly',
      occurrences: [makeOccurrence({ expected_date: '2026-04-15', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('skips ad-hoc instances', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      is_adhoc: true,
      occurrences: [makeOccurrence({ expected_date: '2026-04-02', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('skips instances with no bill_id (ad-hoc)', () => {
    const billMap = new Map<string, Bill>();

    const instance = makeBillInstance({
      bill_id: null as unknown as string,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [makeOccurrence({ expected_date: '2026-04-02', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('skips when source entity not found (deleted bill)', () => {
    const billMap = new Map<string, Bill>(); // Empty — no entity for bill-deleted

    const instance = makeBillInstance({
      bill_id: 'bill-deleted',
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [makeOccurrence({ expected_date: '2026-04-02', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('skips when source entity has no start_date', () => {
    const bill = makeBill({
      id: 'bill-no-start',
      billing_period: 'bi_weekly',
      // No start_date
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [makeOccurrence({ expected_date: '2026-04-02', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('skips payoff bill instances', () => {
    const bill = makeBill({
      id: 'bill-payoff',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      is_payoff_bill: true,
      occurrences: [makeOccurrence({ expected_date: '2026-04-02', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('preserves ad-hoc occurrences within an instance', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-02', sequence: 1 }), // Wrong, open
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }), // Wrong, open
        makeOccurrence({ expected_date: '2026-04-10', sequence: 3, is_adhoc: true }), // User-added
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(true);
    // Ad-hoc occurrence preserves its date
    const adhocOcc = result.instances[0].occurrences.find((o) => o.is_adhoc);
    expect(adhocOcc?.expected_date).toBe('2026-04-10');
    // Non-adhoc occurrences get corrected
    const regularOccs = result.instances[0].occurrences.filter((o) => !o.is_adhoc);
    expect(regularOccs.map((o) => o.expected_date)).toEqual(['2026-04-03', '2026-04-17']);
  });

  test('corrects weekly occurrence dates', () => {
    const bill = makeBill({
      id: 'bill-weekly',
      billing_period: 'weekly',
      start_date: '2025-01-06', // Monday
    });
    const billMap = new Map([[bill.id, bill]]);

    // In March 2026, correct Monday dates should include Mar 2, 9, 16, 23, 30
    // Buggy dates would be Mar 1, 8, 15, 22, 29 (Sundays)
    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-03',
      billing_period: 'weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-03-01', sequence: 1 }), // Wrong (Sunday)
        makeOccurrence({ expected_date: '2026-03-08', sequence: 2 }), // Wrong (Sunday)
        makeOccurrence({ expected_date: '2026-03-15', sequence: 3 }), // Wrong (Sunday)
        makeOccurrence({ expected_date: '2026-03-22', sequence: 4 }), // Wrong (Sunday)
        makeOccurrence({ expected_date: '2026-03-29', sequence: 5 }), // Wrong (Sunday)
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-03');

    expect(result.changed).toBe(true);
    const dates = result.instances[0].occurrences.map((o) => o.expected_date);
    expect(dates).toEqual(['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']);
  });

  test('handles mixed instances: only fixes non-monthly with source entity', () => {
    const biWeeklyBill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const monthlyBill = makeBill({
      id: 'bill-monthly',
      billing_period: 'monthly',
      day_of_month: 1,
    });
    const billMap = new Map([
      [biWeeklyBill.id, biWeeklyBill],
      [monthlyBill.id, monthlyBill],
    ]);

    const biWeeklyInstance = makeBillInstance({
      bill_id: biWeeklyBill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-02', sequence: 1 }), // Wrong
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }), // Wrong
      ],
    });

    const monthlyInstance = makeBillInstance({
      bill_id: monthlyBill.id,
      month: '2026-04',
      billing_period: 'monthly',
      occurrences: [makeOccurrence({ expected_date: '2026-04-01', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesBills(
      [biWeeklyInstance, monthlyInstance],
      billMap,
      '2026-04'
    );

    expect(result.changed).toBe(true);
    // Bi-weekly got fixed
    expect(result.instances[0].occurrences[0].expected_date).toBe('2026-04-03');
    expect(result.instances[0].occurrences[1].expected_date).toBe('2026-04-17');
    // Monthly unchanged
    expect(result.instances[1].occurrences[0].expected_date).toBe('2026-04-01');
  });

  test('re-sequences occurrences after migration', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-02', sequence: 1 }),
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }),
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(true);
    expect(result.instances[0].occurrences[0].sequence).toBe(1);
    expect(result.instances[0].occurrences[1].sequence).toBe(2);
  });
});

// ============================================================================
// Tests: migrateOccurrenceDatesIncomes
// ============================================================================
describe('migrateOccurrenceDatesIncomes', () => {
  test('corrects wrong dates on open bi-weekly income occurrences', () => {
    const income = makeIncome({
      id: 'income-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10', // Friday
    });
    const incomeMap = new Map([[income.id, income]]);

    const instance = makeIncomeInstance({
      income_id: income.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-02', sequence: 1 }), // Wrong (Thursday)
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }), // Wrong (Thursday)
      ],
    });

    const result = migrateOccurrenceDatesIncomes([instance], incomeMap, '2026-04');

    expect(result.changed).toBe(true);
    expect(result.instances[0].occurrences[0].expected_date).toBe('2026-04-03'); // Friday
    expect(result.instances[0].occurrences[1].expected_date).toBe('2026-04-17'); // Friday
  });

  test('does not modify already-correct income dates', () => {
    const income = makeIncome({
      id: 'income-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const incomeMap = new Map([[income.id, income]]);

    const instance = makeIncomeInstance({
      income_id: income.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-03', sequence: 1 }),
        makeOccurrence({ expected_date: '2026-04-17', sequence: 2 }),
      ],
    });

    const result = migrateOccurrenceDatesIncomes([instance], incomeMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('preserves closed income occurrences', () => {
    const income = makeIncome({
      id: 'income-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const incomeMap = new Map([[income.id, income]]);

    const instance = makeIncomeInstance({
      income_id: income.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({
          expected_date: '2026-04-02',
          sequence: 1,
          is_closed: true,
          closed_date: '2026-04-02',
        }),
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }),
      ],
    });

    const result = migrateOccurrenceDatesIncomes([instance], incomeMap, '2026-04');

    expect(result.changed).toBe(true);
    const closedOcc = result.instances[0].occurrences.find((o) => o.is_closed);
    expect(closedOcc?.expected_date).toBe('2026-04-02'); // Preserved
    const openOcc = result.instances[0].occurrences.find((o) => !o.is_closed);
    expect(openOcc?.expected_date).toBe('2026-04-03'); // Fixed (first available correct date)
  });

  test('skips monthly income', () => {
    const income = makeIncome({
      id: 'income-monthly',
      billing_period: 'monthly',
      day_of_month: 1,
    });
    const incomeMap = new Map([[income.id, income]]);

    const instance = makeIncomeInstance({
      income_id: income.id,
      month: '2026-04',
      billing_period: 'monthly',
      occurrences: [makeOccurrence({ expected_date: '2026-04-01', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesIncomes([instance], incomeMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('skips ad-hoc income instances', () => {
    const income = makeIncome({
      id: 'income-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const incomeMap = new Map([[income.id, income]]);

    const instance = makeIncomeInstance({
      income_id: income.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      is_adhoc: true,
      occurrences: [makeOccurrence({ expected_date: '2026-04-02', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesIncomes([instance], incomeMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('skips when income entity not found', () => {
    const incomeMap = new Map<string, Income>();

    const instance = makeIncomeInstance({
      income_id: 'income-deleted',
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [makeOccurrence({ expected_date: '2026-04-02', sequence: 1 })],
    });

    const result = migrateOccurrenceDatesIncomes([instance], incomeMap, '2026-04');

    expect(result.changed).toBe(false);
  });
});

// ============================================================================
// Tests: Idempotency — running migration twice should be a no-op the second time
// ============================================================================
describe('migration idempotency', () => {
  test('running bill migration twice: second run is a no-op', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-02', sequence: 1 }),
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }),
      ],
    });

    // First run: should fix
    const first = migrateOccurrenceDatesBills([instance], billMap, '2026-04');
    expect(first.changed).toBe(true);

    // Second run: should be no-op
    const second = migrateOccurrenceDatesBills(first.instances, billMap, '2026-04');
    expect(second.changed).toBe(false);
  });

  test('running income migration twice: second run is a no-op', () => {
    const income = makeIncome({
      id: 'income-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const incomeMap = new Map([[income.id, income]]);

    const instance = makeIncomeInstance({
      income_id: income.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-02', sequence: 1 }),
        makeOccurrence({ expected_date: '2026-04-16', sequence: 2 }),
      ],
    });

    const first = migrateOccurrenceDatesIncomes([instance], incomeMap, '2026-04');
    expect(first.changed).toBe(true);

    const second = migrateOccurrenceDatesIncomes(first.instances, incomeMap, '2026-04');
    expect(second.changed).toBe(false);
  });
});

// ============================================================================
// Tests: Multiple months / edge cases
// ============================================================================
describe('edge cases', () => {
  test('3-paycheck month (May 2026): 3 occurrences corrected', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    // May 2026 has 3 bi-weekly Fridays from Jan 10 2025 anchor
    // Bug dates would be May 1, 15, 29 (Thursdays)
    // Correct: May 1, 15, 29 (Fridays) — wait, let me verify
    // Actually from Jan 10 (Fri) + 14 days = Jan 24, Feb 7, ... counting forward:
    // Correct May 2026 dates: May 1, 15, 29 (all Fridays)
    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-05',
      billing_period: 'bi_weekly',
      occurrences: [
        makeOccurrence({ expected_date: '2026-04-30', sequence: 1 }), // Wrong (Thursday before May 1)
        makeOccurrence({ expected_date: '2026-05-14', sequence: 2 }), // Wrong (Thursday)
        makeOccurrence({ expected_date: '2026-05-28', sequence: 3 }), // Wrong (Thursday)
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-05');

    expect(result.changed).toBe(true);
    const dates = result.instances[0].occurrences.map((o) => o.expected_date);
    expect(dates).toEqual(['2026-05-01', '2026-05-15', '2026-05-29']);
  });

  test('empty occurrences array: no crash, no change', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      occurrences: [],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('all occurrences closed: no change', () => {
    const bill = makeBill({
      id: 'bill-biweekly',
      billing_period: 'bi_weekly',
      start_date: '2025-01-10',
    });
    const billMap = new Map([[bill.id, bill]]);

    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-04',
      billing_period: 'bi_weekly',
      is_closed: true,
      occurrences: [
        makeOccurrence({
          expected_date: '2026-04-02',
          sequence: 1,
          is_closed: true,
          closed_date: '2026-04-02',
        }),
        makeOccurrence({
          expected_date: '2026-04-16',
          sequence: 2,
          is_closed: true,
          closed_date: '2026-04-16',
        }),
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-04');

    expect(result.changed).toBe(false);
  });

  test('semi-annual occurrence corrected', () => {
    const bill = makeBill({
      id: 'bill-semi',
      billing_period: 'semi_annually',
      start_date: '2025-01-15',
    });
    const billMap = new Map([[bill.id, bill]]);

    // Semi-annual from Jan 15 2025 → next occurrences: Jul 15 2025, Jan 15 2026, Jul 15 2026
    // Bug would make it Jan 14 (shifted back one day)
    const instance = makeBillInstance({
      bill_id: bill.id,
      month: '2026-01',
      billing_period: 'semi_annually',
      occurrences: [
        makeOccurrence({ expected_date: '2026-01-14', sequence: 1 }), // Wrong
      ],
    });

    const result = migrateOccurrenceDatesBills([instance], billMap, '2026-01');

    expect(result.changed).toBe(true);
    expect(result.instances[0].occurrences[0].expected_date).toBe('2026-01-15');
  });
});
