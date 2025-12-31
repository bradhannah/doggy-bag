// Tally Utilities for 002-detailed-monthly-view
// Calculate section tallies for bills and income

import type { BillInstance, IncomeInstance, SectionTally } from '../types';

/**
 * Calculate the effective amount for a bill instance
 * Uses sum of payments if partial, otherwise actual_amount if set
 * 
 * @param bill - Bill instance
 * @returns Effective amount (what has actually been paid/entered)
 */
export function getEffectiveBillAmount(bill: BillInstance): number {
  // If there are partial payments, sum them
  if (bill.payments && bill.payments.length > 0) {
    return bill.payments.reduce((sum, p) => sum + p.amount, 0);
  }
  // Otherwise use actual_amount if set, or 0
  return bill.actual_amount ?? 0;
}

/**
 * Calculate the remaining amount for a bill instance
 * For partial payments: expected - total paid
 * For unpaid with no actual: expected
 * Otherwise: 0
 * 
 * @param bill - Bill instance
 * @returns Remaining amount to be paid
 */
export function getRemainingBillAmount(bill: BillInstance): number {
  // If there are partial payments, remaining = expected - paid
  if (bill.payments && bill.payments.length > 0) {
    const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, bill.expected_amount - totalPaid);
  }
  
  // If not paid and no actual entered, expected is remaining
  if (!bill.is_paid && bill.actual_amount === undefined) {
    return bill.expected_amount;
  }
  
  // Paid or has actual amount - nothing remaining
  return 0;
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
    remaining: bills.reduce((sum, b) => sum + getRemainingBillAmount(b), 0)
  };
}

/**
 * Calculate the effective amount for an income instance
 * Uses actual_amount if set, otherwise 0
 * 
 * @param income - Income instance
 * @returns Effective amount (what has actually been received/entered)
 */
export function getEffectiveIncomeAmount(income: IncomeInstance): number {
  return income.actual_amount ?? 0;
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
  
  // For income, remaining is expected income not yet received
  const remaining = incomes.reduce((sum, i) => {
    if (!i.is_paid && i.actual_amount === undefined) {
      return sum + i.expected_amount;
    }
    return sum;
  }, 0);
  
  return { expected, actual, remaining };
}

/**
 * Calculate category subtotals for a group of bill instances
 * 
 * @param bills - Array of bill instances (already filtered by category)
 * @returns Object with expected and actual subtotals
 */
export function calculateCategoryBillSubtotal(bills: BillInstance[]): { expected: number; actual: number } {
  return {
    expected: bills.reduce((sum, b) => sum + b.expected_amount, 0),
    actual: bills.reduce((sum, b) => sum + getEffectiveBillAmount(b), 0)
  };
}

/**
 * Calculate category subtotals for a group of income instances
 * 
 * @param incomes - Array of income instances (already filtered by category)
 * @returns Object with expected and actual subtotals
 */
export function calculateCategoryIncomeSubtotal(incomes: IncomeInstance[]): { expected: number; actual: number } {
  return {
    expected: incomes.reduce((sum, i) => sum + i.expected_amount, 0),
    actual: incomes.reduce((sum, i) => sum + getEffectiveIncomeAmount(i), 0)
  };
}
