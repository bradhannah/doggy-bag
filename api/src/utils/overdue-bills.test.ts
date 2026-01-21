import { describe, expect, it } from 'bun:test';
import type { BillInstanceDetailed, Occurrence, Payment } from '../types';
import { getOverdueBills } from './overdue-bills';

function makePayment(amount: number, date: string): Payment {
  return {
    id: crypto.randomUUID(),
    amount,
    date,
    created_at: date + 'T00:00:00Z',
  };
}

function makeOccurrence(
  expected_date: string,
  expected_amount: number,
  payments: Payment[] = [],
  is_closed = false
): Occurrence {
  return {
    id: crypto.randomUUID(),
    sequence: 1,
    expected_date,
    expected_amount,
    is_closed,
    payments,
    is_adhoc: false,
    created_at: expected_date + 'T00:00:00Z',
    updated_at: expected_date + 'T00:00:00Z',
  };
}

function makeBill(name: string, occurrences: Occurrence[]): BillInstanceDetailed {
  return {
    id: crypto.randomUUID(),
    bill_id: crypto.randomUUID(),
    name,
    billing_period: 'monthly',
    expected_amount: 0,
    actual_amount: 0,
    occurrences,
    occurrence_count: occurrences.length,
    is_extra_occurrence_month: false,
    total_paid: 0,
    remaining: 0,
    is_closed: false,
    is_adhoc: false,
    is_payoff_bill: false,
    closed_date: null,
    is_overdue: false,
    days_overdue: null,
    payment_source: null,
    category_id: 'cat-1',
    payment_method: 'manual',
    metadata: undefined,
  };
}

describe('getOverdueBills', () => {
  it('returns unpaid overdue occurrences before balance start date', () => {
    const karate = makeBill('Karate - Tallacks', [
      makeOccurrence('2026-01-04', 6500, [makePayment(6500, '2026-01-04')]),
      makeOccurrence('2026-01-18', 6441, []),
    ]);

    const transfer = makeBill('Shared Account Transfer', [
      makeOccurrence('2026-01-01', 140000, [makePayment(140000, '2026-01-01')]),
    ]);

    const overdue = getOverdueBills([karate, transfer], '2026-01', '2026-01-20');

    expect(overdue).toEqual([{ name: 'Karate - Tallacks', amount: 6441, due_date: '2026-01-18' }]);
  });

  it('excludes occurrences on or after balance start date', () => {
    const rent = makeBill('Rent', [makeOccurrence('2026-02-01', 120000)]);

    const overdue = getOverdueBills([rent], '2026-02', '2026-01-20');

    expect(overdue).toEqual([]);
  });

  it('excludes closed occurrences', () => {
    const bill = makeBill('Utilities', [makeOccurrence('2026-01-03', 8900, [], true)]);

    const overdue = getOverdueBills([bill], '2026-01', '2026-01-20');

    expect(overdue).toEqual([]);
  });
});
