// Leftover Calculation Utility for BudgetForFun
// Unified leftover calculation: "What will we have at end of month?"
//
// Formula: Leftover = BankBalances + RemainingIncome - RemainingExpenses
//
// Where:
//   BankBalances = Σ bank_balances (excluding pay_off_monthly/exclude_from_leftover accounts)
//   RemainingIncome = Σ for each income_instance:
//     if is_closed: 0 (already received, reflected in bank balance)
//     else: expected_amount - actual_received (still expecting the remainder)
//   RemainingExpenses = Σ for each bill_instance:
//     if is_closed: 0 (already paid, reflected in bank balance)
//     else: expected_amount - actual_paid (still need to pay the remainder)

import type { MonthlyData, PaymentSource, UnifiedLeftoverResult, BillInstance, IncomeInstance } from '../types';
import { getEffectiveBillAmount } from './tally';

/**
 * Get IDs of payment sources that should be excluded from leftover calculation
 * Excludes accounts with pay_off_monthly=true OR exclude_from_leftover=true
 */
function getExcludedSourceIds(paymentSources: PaymentSource[]): Set<string> {
  return new Set(
    paymentSources
      .filter(ps => ps.pay_off_monthly === true || ps.exclude_from_leftover === true)
      .map(ps => ps.id)
  );
}

/**
 * Get IDs of payment sources that should be included in leftover calculation
 * (active accounts that are not excluded)
 */
function getIncludedSourceIds(paymentSources: PaymentSource[]): string[] {
  return paymentSources
    .filter(ps => ps.is_active && ps.pay_off_monthly !== true && ps.exclude_from_leftover !== true)
    .map(ps => ps.id);
}

/**
 * Check if all required bank balances are entered
 * Returns array of missing payment source IDs
 */
function getMissingBalances(monthData: MonthlyData, paymentSources: PaymentSource[]): string[] {
  const includedSourceIds = getIncludedSourceIds(paymentSources);
  const enteredBalanceIds = new Set(Object.keys(monthData.bank_balances));
  
  return includedSourceIds.filter(id => !enteredBalanceIds.has(id));
}

/**
 * Calculate remaining amount for a bill instance
 * Closed bills = 0 (already paid, reflected in bank balance)
 * Open bills = expected - actual_paid
 */
function getRemainingBillExpense(bill: BillInstance): number {
  if (bill.is_closed) {
    return 0; // Already paid, reflected in bank balance
  }
  
  const paid = getEffectiveBillAmount(bill); // Sum of payments or actual_amount
  return Math.max(0, bill.expected_amount - paid);
}

/**
 * Calculate remaining amount for an income instance
 * Closed income = 0 (already received, reflected in bank balance)
 * Open income = expected - actual_received
 */
function getRemainingIncomeAmount(income: IncomeInstance): number {
  if (income.is_closed) {
    return 0; // Already received, reflected in bank balance
  }
  
  const received = income.actual_amount ?? 0;
  return Math.max(0, income.expected_amount - received);
}

/**
 * Calculate unified leftover for a month
 * 
 * This is THE canonical leftover calculation for the entire application.
 * All other leftover displays should use this function.
 * 
 * @param monthData - Monthly data including all instances and balances
 * @param paymentSources - Array of payment sources (required for filtering)
 * @returns UnifiedLeftoverResult with breakdown and validation status
 */
export function calculateUnifiedLeftover(
  monthData: MonthlyData,
  paymentSources: PaymentSource[]
): UnifiedLeftoverResult {
  // Check for missing bank balances
  const missingBalances = getMissingBalances(monthData, paymentSources);
  
  if (missingBalances.length > 0) {
    // Get names of missing sources for error message
    const missingNames = missingBalances
      .map(id => paymentSources.find(ps => ps.id === id)?.name || id)
      .join(', ');
    
    return {
      bankBalances: 0,
      remainingIncome: 0,
      remainingExpenses: 0,
      leftover: 0,
      isValid: false,
      missingBalances,
      errorMessage: `Enter bank balances to calculate leftover. Missing: ${missingNames}`
    };
  }
  
  const excludedSourceIds = getExcludedSourceIds(paymentSources);
  
  // Sum bank balances (excluding excluded sources)
  const bankBalances = Object.entries(monthData.bank_balances)
    .filter(([sourceId]) => !excludedSourceIds.has(sourceId))
    .reduce((sum, [, balance]) => sum + balance, 0);
  
  // Calculate remaining income (what we still expect to receive)
  const remainingIncome = monthData.income_instances
    .reduce((sum, inc) => sum + getRemainingIncomeAmount(inc), 0);
  
  // Calculate remaining expenses (what we still need to pay)
  // This includes ALL bill instances (regular bills AND payoff bills)
  const remainingExpenses = monthData.bill_instances
    .reduce((sum, bill) => sum + getRemainingBillExpense(bill), 0);
  
  const leftover = bankBalances + remainingIncome - remainingExpenses;
  
  return {
    bankBalances,
    remainingIncome,
    remainingExpenses,
    leftover,
    isValid: true,
    missingBalances: []
  };
}

/**
 * Convert UnifiedLeftoverResult to LeftoverBreakdown for API responses
 * This is a convenience function for backward compatibility
 */
export function toLeftoverBreakdown(result: UnifiedLeftoverResult): {
  bankBalances: number;
  remainingIncome: number;
  remainingExpenses: number;
  leftover: number;
  isValid: boolean;
  missingBalances?: string[];
  errorMessage?: string;
} {
  return {
    bankBalances: result.bankBalances,
    remainingIncome: result.remainingIncome,
    remainingExpenses: result.remainingExpenses,
    leftover: result.leftover,
    isValid: result.isValid,
    missingBalances: result.missingBalances.length > 0 ? result.missingBalances : undefined,
    errorMessage: result.errorMessage
  };
}

// ============================================================================
// Legacy functions - kept for backward compatibility during transition
// ============================================================================

/**
 * @deprecated Use calculateUnifiedLeftover instead
 * Calculate the leftover amount for a month using ONLY actual amounts
 */
export function calculateLeftover(monthData: MonthlyData, paymentSources?: PaymentSource[]): number {
  // Legacy behavior: just return the leftover value, don't validate
  const result = calculateUnifiedLeftover(monthData, paymentSources || []);
  return result.leftover;
}

/**
 * @deprecated Use calculateUnifiedLeftover instead
 * Calculate leftover breakdown for detailed display
 */
export function calculateLeftoverBreakdown(monthData: MonthlyData, paymentSources?: PaymentSource[]): {
  bankBalances: number;
  actualIncome: number;
  actualBills: number;
  variableExpenses: number;
  freeFlowingExpenses: number;
  totalExpenses: number;
  leftover: number;
} {
  const result = calculateUnifiedLeftover(monthData, paymentSources || []);
  
  // Map new structure to old structure for backward compatibility
  return {
    bankBalances: result.bankBalances,
    actualIncome: result.remainingIncome, // Not exactly "actual" but close enough for transition
    actualBills: result.remainingExpenses,
    variableExpenses: 0, // Now included in remainingExpenses via bills
    freeFlowingExpenses: 0, // Now included in remainingExpenses via bills
    totalExpenses: result.remainingExpenses,
    leftover: result.leftover
  };
}

/**
 * Check if any actual amounts have been entered
 * Used to determine if leftover calculation is meaningful
 * 
 * @param monthData - Monthly data
 * @returns true if at least one actual amount has been entered
 */
export function hasActualsEntered(monthData: MonthlyData): boolean {
  // Check bill instances for payments or closed status
  const hasBillActuals = monthData.bill_instances.some(bill => 
    bill.is_closed ||
    bill.actual_amount !== undefined || 
    (bill.payments && bill.payments.length > 0) ||
    (bill.occurrences && bill.occurrences.some(occ => occ.payments && occ.payments.length > 0))
  );
  
  // Check income instances
  const hasIncomeActuals = monthData.income_instances.some(inc => 
    inc.is_closed ||
    inc.actual_amount !== undefined
  );
  
  // Check variable expenses (always count as actual)
  const hasVariableExpenses = monthData.variable_expenses.length > 0;
  
  // Check free-flowing expenses (always count as actual)
  const hasFreeFlowingExpenses = monthData.free_flowing_expenses.length > 0;
  
  return hasBillActuals || hasIncomeActuals || hasVariableExpenses || hasFreeFlowingExpenses;
}
