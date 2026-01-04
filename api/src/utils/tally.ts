// Tally Utilities for 002-detailed-monthly-view
// Calculate section tallies for bills and income

import type { BillInstance, IncomeInstance, SectionTally } from '../types';
import { sumOccurrencePayments } from './occurrences';

/**
 * Calculate the effective amount for a bill instance
 * Uses sum of payments from occurrences
 *
 * @param bill - Bill instance
 * @returns Effective amount (what has actually been paid/entered)
 */
export function getEffectiveBillAmount(bill: BillInstance): number {
  // Sum payments from all occurrences
  if (bill.occurrences && bill.occurrences.length > 0) {
    return sumOccurrencePayments(bill.occurrences);
  }
  return 0;
}

/**
 * Calculate the remaining amount for a bill instance
 * For open instances: expected - total paid from occurrences
 * For closed instances: 0
 *
 * @param bill - Bill instance
 * @returns Remaining amount to be paid
 */
export function getRemainingBillAmount(bill: BillInstance): number {
  // If closed, nothing remaining
  if (bill.is_closed) {
    return 0;
  }

  // Calculate remaining from occurrences
  const totalPaid = getEffectiveBillAmount(bill);
  return Math.max(0, bill.expected_amount - totalPaid);
}

/**
 * Calculate the section tally for bills
 *
 * @param bills - Array of bill instances
 * @returns SectionTally with expected, actual, and remaining totals
 */
export function calculateBillsTally(bills: BillInstance[]): SectionTally {
  return {
    expected: bills.reduce((sum, b) => sum + b.expected_amount, 0),
    actual: bills.reduce((sum, b) => sum + getEffectiveBillAmount(b), 0),
    remaining: bills.reduce((sum, b) => sum + getRemainingBillAmount(b), 0),
  };
}

/**
 * Calculate the effective amount for an income instance
 * Uses sum of payments from occurrences
 *
 * @param income - Income instance
 * @returns Effective amount (what has actually been received/entered)
 */
export function getEffectiveIncomeAmount(income: IncomeInstance): number {
  // Sum payments from all occurrences
  if (income.occurrences && income.occurrences.length > 0) {
    return sumOccurrencePayments(income.occurrences);
  }
  return 0;
}

/**
 * Calculate the remaining amount for an income instance
 * For open instances: expected - total received from occurrences
 * For closed instances: 0
 *
 * @param income - Income instance
 * @returns Remaining amount to be received
 */
export function getRemainingIncomeAmount(income: IncomeInstance): number {
  // If closed, nothing remaining
  if (income.is_closed) {
    return 0;
  }

  // Calculate remaining from occurrences
  const totalReceived = getEffectiveIncomeAmount(income);
  return Math.max(0, income.expected_amount - totalReceived);
}

/**
 * Calculate the section tally for income
 *
 * @param incomes - Array of income instances
 * @returns SectionTally with expected, actual, and remaining totals
 */
export function calculateIncomeTally(incomes: IncomeInstance[]): SectionTally {
  const expected = incomes.reduce((sum, i) => sum + i.expected_amount, 0);
  const actual = incomes.reduce((sum, i) => sum + getEffectiveIncomeAmount(i), 0);
  const remaining = incomes.reduce((sum, i) => sum + getRemainingIncomeAmount(i), 0);

  return { expected, actual, remaining };
}

/**
 * Calculate category subtotals for a group of bill instances
 *
 * @param bills - Array of bill instances (already filtered by category)
 * @returns Object with expected and actual subtotals
 */
export function calculateCategoryBillSubtotal(bills: BillInstance[]): {
  expected: number;
  actual: number;
} {
  return {
    expected: bills.reduce((sum, b) => sum + b.expected_amount, 0),
    actual: bills.reduce((sum, b) => sum + getEffectiveBillAmount(b), 0),
  };
}

/**
 * Calculate category subtotals for a group of income instances
 *
 * @param incomes - Array of income instances (already filtered by category)
 * @returns Object with expected and actual subtotals
 */
export function calculateCategoryIncomeSubtotal(incomes: IncomeInstance[]): {
  expected: number;
  actual: number;
} {
  return {
    expected: incomes.reduce((sum, i) => sum + i.expected_amount, 0),
    actual: incomes.reduce((sum, i) => sum + getEffectiveIncomeAmount(i), 0),
  };
}

/**
 * Calculate tally for regular bills only (non-adhoc, with expected amounts)
 *
 * @param bills - Array of all bill instances
 * @returns SectionTally for regular bills
 */
export function calculateRegularBillsTally(bills: BillInstance[]): SectionTally {
  const regularBills = bills.filter((b) => !b.is_adhoc);
  return calculateBillsTally(regularBills);
}

/**
 * Calculate tally for ad-hoc bills only
 * Ad-hoc bills have no expected amount, only actual
 *
 * @param bills - Array of all bill instances
 * @returns SectionTally for ad-hoc bills (expected=0, remaining=0)
 */
export function calculateAdhocBillsTally(bills: BillInstance[]): SectionTally {
  const adhocBills = bills.filter((b) => b.is_adhoc);
  const actual = adhocBills.reduce((sum, b) => sum + getEffectiveBillAmount(b), 0);
  return {
    expected: 0, // Ad-hoc items have no expected amount
    actual,
    remaining: 0, // No remaining since no expected
  };
}

/**
 * Calculate tally for regular income only (non-adhoc, with expected amounts)
 *
 * @param incomes - Array of all income instances
 * @returns SectionTally for regular income
 */
export function calculateRegularIncomeTally(incomes: IncomeInstance[]): SectionTally {
  const regularIncomes = incomes.filter((i) => !i.is_adhoc);
  return calculateIncomeTally(regularIncomes);
}

/**
 * Calculate tally for ad-hoc income only
 * Ad-hoc income has no expected amount, only actual
 *
 * @param incomes - Array of all income instances
 * @returns SectionTally for ad-hoc income (expected=0, remaining=0)
 */
export function calculateAdhocIncomeTally(incomes: IncomeInstance[]): SectionTally {
  const adhocIncomes = incomes.filter((i) => i.is_adhoc);
  const actual = adhocIncomes.reduce((sum, i) => sum + getEffectiveIncomeAmount(i), 0);
  return {
    expected: 0, // Ad-hoc items have no expected amount
    actual,
    remaining: 0, // No remaining since no expected
  };
}

/**
 * Combine two section tallies
 *
 * @param a - First tally
 * @param b - Second tally
 * @returns Combined tally
 */
export function combineTallies(a: SectionTally, b: SectionTally): SectionTally {
  return {
    expected: a.expected + b.expected,
    actual: a.actual + b.actual,
    remaining: a.remaining + b.remaining,
  };
}
