import type { Bill, Income, BillInstance, IncomeInstance, PaymentSource } from '../types';
import { sourceSnapshot } from '../services/source-history';
import {
  generateBillOccurrences,
  generateIncomeOccurrences,
  sumOccurrenceExpectedAmounts,
} from './occurrences';

export function createBillInstance(bill: Bill, month: string): BillInstance | null {
  if (!bill.is_active || (bill.goal_status && bill.goal_status !== 'saving')) return null;
  const occurrences = generateBillOccurrences(bill, month);
  occurrences.forEach((occurrence, index) => {
    occurrence.recurring_origin = {
      index,
      amount: occurrence.expected_amount,
      date: occurrence.expected_date,
    };
  });
  if (occurrences.length === 0) return null;
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    bill_id: bill.id,
    ...sourceSnapshot(bill),
    month,
    billing_period: bill.billing_period,
    expected_amount: sumOccurrenceExpectedAmounts(occurrences),
    occurrences,
    is_default: true,
    is_closed: false,
    is_adhoc: false,
    created_at: now,
    updated_at: now,
  };
}

export function createIncomeInstance(income: Income, month: string): IncomeInstance | null {
  if (!income.is_active) return null;
  const occurrences = generateIncomeOccurrences(income, month);
  occurrences.forEach((occurrence, index) => {
    occurrence.recurring_origin = {
      index,
      amount: occurrence.expected_amount,
      date: occurrence.expected_date,
    };
  });
  if (occurrences.length === 0) return null;
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    income_id: income.id,
    ...sourceSnapshot(income),
    month,
    billing_period: income.billing_period,
    expected_amount: sumOccurrenceExpectedAmounts(occurrences),
    occurrences,
    is_default: true,
    is_closed: false,
    is_adhoc: false,
    created_at: now,
    updated_at: now,
  };
}

export function createManualPaymentInstance(
  source: PaymentSource,
  month: string,
  categoryId: string
): BillInstance {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    bill_id: null,
    month,
    billing_period: 'monthly',
    expected_amount: 0,
    occurrences: [],
    is_default: true,
    is_closed: false,
    is_adhoc: false,
    is_payoff_bill: true,
    payoff_source_id: source.id,
    name: `${source.name} Payments`,
    category_id: categoryId,
    payment_source_id: source.id,
    created_at: now,
    updated_at: now,
  };
}
