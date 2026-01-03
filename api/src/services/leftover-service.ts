// Leftover Service - Calculate "leftover at end of month" value
// Uses unified leftover calculation from utils/leftover.ts

import { MonthsServiceImpl } from './months-service';
import { PaymentSourcesServiceImpl } from './payment-sources-service';
import type { MonthsService } from './months-service';
import type { PaymentSourcesService } from './payment-sources-service';
import type { UnifiedLeftoverResult } from '../types';
import { calculateUnifiedLeftover } from '../utils/leftover';

/**
 * Result from leftover calculation
 * Uses the unified calculation with validation
 */
export interface LeftoverResult {
  bankBalances: number;        // Current cash position (from bank_balances snapshot)
  remainingIncome: number;     // Income still expected to receive
  remainingExpenses: number;   // Expenses still need to pay
  leftover: number;            // Final: bank + income - expenses
  isValid: boolean;            // False if required bank balances are missing
  missingBalances?: string[];  // IDs of payment sources missing balances
  errorMessage?: string;       // Human-readable error message
  
  // Legacy fields for backward compatibility (deprecated)
  totalCash: number;
  totalCreditDebt: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface LeftoverService {
  calculateLeftover(month: string): Promise<LeftoverResult>;
}

export class LeftoverServiceImpl implements LeftoverService {
  private monthsService: MonthsService;
  private paymentSourcesService: PaymentSourcesService;
  
  constructor() {
    this.monthsService = new MonthsServiceImpl();
    this.paymentSourcesService = new PaymentSourcesServiceImpl();
  }
  
  public async calculateLeftover(month: string): Promise<LeftoverResult> {
    try {
      const [monthlyData, paymentSources] = await Promise.all([
        this.monthsService.getMonthlyData(month),
        this.paymentSourcesService.getAll()
      ]);
      
      if (!monthlyData) {
        throw new Error(`Monthly data for ${month} not found`);
      }
      
      // Use unified leftover calculation
      const unified = calculateUnifiedLeftover(monthlyData, paymentSources);
      
      // Map to LeftoverResult with backward compatibility fields
      return {
        // New unified fields
        bankBalances: unified.bankBalances,
        remainingIncome: unified.remainingIncome,
        remainingExpenses: unified.remainingExpenses,
        leftover: unified.leftover,
        isValid: unified.isValid,
        missingBalances: unified.missingBalances.length > 0 ? unified.missingBalances : undefined,
        errorMessage: unified.errorMessage,
        
        // Legacy fields (deprecated but kept for backward compat)
        totalCash: unified.bankBalances,
        totalCreditDebt: 0,
        netWorth: unified.bankBalances,
        totalIncome: unified.remainingIncome,
        totalExpenses: unified.remainingExpenses
      };
    } catch (error) {
      console.error('[LeftoverService] Failed to calculate leftover:', error);
      throw error;
    }
  }
}
