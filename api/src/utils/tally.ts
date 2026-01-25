// Tally Utilities for 002-detailed-monthly-view
// Calculate section tallies for bills and income
// Updated for occurrence-only model (no payments)

import type { BillInstance, IncomeInstance, Occurrence, SectionTally } from '../types';

/**
 * Calculate the paid amount from occurrences using the occurrence-only model
 * Paid amount = sum of expected_amount for all CLOSED occurrences
 *
 * @param occurrences - Array of occurrences
 * @returns Sum of expected_amount for closed occurrences
 */
export function sumClosedOccurrenceAmounts(occurrences: Occurrence[]): number {
  return occurrences
    .filter((occ) => occ.is_closed)
    .reduce((sum, occ) => sum + occ.expected_amount, 0);
}

/**
 * Calculate the effective amount for a bill instance
 * Uses occurrence-only model: sum of expected_amount from CLOSED occurrences
 *
 * @param bill - Bill instance
 * @returns Effective amount (what has actually been paid)
 */
export function getEffectiveBillAmount(bill: BillInstance): number {
  if (!bill.occurrences || bill.occurrences.length === 0) {
    return 0;
  }

  // All bills now use the same model:
  // Closed occurrences represent completed payments
  return sumClosedOccurrenceAmounts(bill.occurrences);
}

/**
 * Calculate the remaining amount for a bill instance
 * For regular bills: expected - total paid from occurrences
 * For payoff bills: the open occurrence's expected_amount (represents current balance)
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

  // Payoff bills: remaining is the open occurrence's expected_amount
  if (bill.is_payoff_bill && bill.occurrences) {
    const openOcc = bill.occurrences.find((occ) => !occ.is_closed);
    return openOcc ? openOcc.expected_amount : 0;
  }

  // Regular bills: calculate remaining from occurrences
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
 * Uses occurrence-only model: sum of expected_amount from CLOSED occurrences
 *
 * @param income - Income instance
 * @returns Effective amount (what has actually been received)
 */
export function getEffectiveIncomeAmount(income: IncomeInstance): number {
  if (!income.occurrences || income.occurrences.length === 0) {
    return 0;
  }

  // Closed occurrences represent completed income received
  return sumClosedOccurrenceAmounts(income.occurrences);
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
