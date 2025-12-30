// Leftover Service - Calculate "leftover at end of month" value

import { MonthsService } from './months-service';
import { PaymentSourcesService, PaymentSourcesServiceImpl } from './payment-sources-service';
import type { 
  MonthlyData,
  PaymentSource 
} from '../types';

export interface LeftoverResult {
  totalCash: number;
  totalCreditDebt: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  leftover: number;
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
      
      const totalCash = paymentSources
        .filter(ps => ps.type === 'bank_account' || ps.type === 'cash')
        .reduce((sum, ps) => sum + ps.balance, 0);
      
      const totalCreditDebt = paymentSources
        .filter(ps => ps.type === 'credit_card')
        .reduce((sum, ps) => sum + Math.abs(ps.balance), 0);
      
      const netWorth = totalCash - totalCreditDebt;
      
      const totalIncome = monthlyData.income_instances.reduce((sum, ii) => sum + ii.amount, 0);
      
      const totalExpenses = monthlyData.bill_instances.reduce((sum, bi) => sum + bi.amount, 0) +
        monthlyData.variable_expenses.reduce((sum, ve) => sum + ve.amount, 0) +
        monthlyData.free_flowing_expenses.reduce((sum, ffe) => sum + ffe.amount, 0);
      
      const leftover = netWorth + totalIncome - totalExpenses;
      
      return {
        totalCash,
        totalCreditDebt,
        netWorth,
        totalIncome,
        totalExpenses,
        leftover
      };
    } catch (error) {
      console.error('[LeftoverService] Failed to calculate leftover:', error);
      throw error;
    }
  }
}
