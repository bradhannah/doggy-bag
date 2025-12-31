// Leftover Calculation Utility for 002-detailed-monthly-view
// Calculates leftover using only actual amounts entered (not expected)

import type { MonthlyData } from '../types';
import { getEffectiveBillAmount, getEffectiveIncomeAmount } from './tally';

/**
 * Calculate the leftover amount for a month
 * Uses ONLY actual amounts entered - not expected amounts
 * 
 * Formula: Bank Balances + Actual Income - Actual Expenses = Leftover
 * 
 * @param monthData - Monthly data including all instances and balances
 * @returns Leftover amount in cents
 */
export function calculateLeftover(monthData: MonthlyData): number {
  // Sum bank balances
  const totalBankBalances = Object.values(monthData.bank_balances)
    .reduce((sum, balance) => sum + balance, 0);
  
  // Sum actual income (only what has been entered/received)
  const totalActualIncome = monthData.income_instances
    .reduce((sum, inc) => sum + getEffectiveIncomeAmount(inc), 0);
  
  // Sum actual expenses from bills (partial payments or actual_amount)
  const totalActualBills = monthData.bill_instances
    .reduce((sum, bill) => sum + getEffectiveBillAmount(bill), 0);
  
  // Variable expenses (always actual - no expected/actual distinction)
  const totalVariableExpenses = monthData.variable_expenses
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  // Free-flowing expenses (always actual - no expected/actual distinction)
  const totalFreeFlowing = monthData.free_flowing_expenses
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  // Calculate leftover
  const totalExpenses = totalActualBills + totalVariableExpenses + totalFreeFlowing;
  const leftover = totalBankBalances + totalActualIncome - totalExpenses;
  
  return leftover;
}

/**
 * Calculate leftover breakdown for detailed display
 * 
 * @param monthData - Monthly data
 * @returns Object with breakdown of all components
 */
export function calculateLeftoverBreakdown(monthData: MonthlyData): {
  bankBalances: number;
  actualIncome: number;
  actualBills: number;
  variableExpenses: number;
  freeFlowingExpenses: number;
  totalExpenses: number;
  leftover: number;
} {
  const bankBalances = Object.values(monthData.bank_balances)
    .reduce((sum, balance) => sum + balance, 0);
  
  const actualIncome = monthData.income_instances
    .reduce((sum, inc) => sum + getEffectiveIncomeAmount(inc), 0);
  
  const actualBills = monthData.bill_instances
    .reduce((sum, bill) => sum + getEffectiveBillAmount(bill), 0);
  
  const variableExpenses = monthData.variable_expenses
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  const freeFlowingExpenses = monthData.free_flowing_expenses
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  const totalExpenses = actualBills + variableExpenses + freeFlowingExpenses;
  const leftover = bankBalances + actualIncome - totalExpenses;
  
  return {
    bankBalances,
    actualIncome,
    actualBills,
    variableExpenses,
    freeFlowingExpenses,
    totalExpenses,
    leftover
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
  // Check bill instances
  const hasBillActuals = monthData.bill_instances.some(bill => 
    bill.actual_amount !== undefined || 
    (bill.payments && bill.payments.length > 0)
  );
  
  // Check income instances
  const hasIncomeActuals = monthData.income_instances.some(inc => 
    inc.actual_amount !== undefined
  );
  
  // Check variable expenses (always count as actual)
  const hasVariableExpenses = monthData.variable_expenses.length > 0;
  
  // Check free-flowing expenses (always count as actual)
  const hasFreeFlowingExpenses = monthData.free_flowing_expenses.length > 0;
  
  return hasBillActuals || hasIncomeActuals || hasVariableExpenses || hasFreeFlowingExpenses;
}
