// Months Service - Generate and manage monthly budget data

import { StorageService } from './storage';
import { BillsService, BillsServiceImpl } from './bills-service';
import { IncomesService, IncomesServiceImpl } from './incomes-service';
import type { 
  MonthlyData,
  BillInstance,
  IncomeInstance,
  VariableExpense,
  FreeFlowingExpense,
  Bill,
  Income 
} from '../types';
import { getMonthlyInstanceCount } from '../utils/billing-period';

export interface MonthsService {
  getMonthlyData(month: string): Promise<MonthlyData | null>;
  generateMonthlyData(month: string): Promise<MonthlyData>;
  updateBankBalances(month: string, balances: Record<string, number>): Promise<MonthlyData>;
  saveMonthlyData(month: string, data: MonthlyData): Promise<void>;
  
  getBillInstances(month: string): Promise<BillInstance[]>;
  getIncomeInstances(month: string): Promise<IncomeInstance[]>;
  getVariableExpenses(month: string): Promise<VariableExpense[]>;
  getFreeFlowingExpenses(month: string): Promise<FreeFlowingExpense[]>;
}

export class MonthsServiceImpl implements MonthsService {
  private storage: StorageService;
  private billsService: BillsService;
  private incomesService: IncomesService;
  
  constructor() {
    this.storage = StorageService.getInstance();
    this.billsService = new BillsServiceImpl();
    this.incomesService = new IncomesServiceImpl();
  }
  
  public async getMonthlyData(month: string): Promise<MonthlyData | null> {
    try {
      const data = await this.storage.readJSON<MonthlyData>(`data/months/${month}.json`);
      return data;
    } catch (error) {
      console.error('[MonthsService] Failed to load monthly data:', error);
      return null;
    }
  }
  
  public async generateMonthlyData(month: string): Promise<MonthlyData> {
    console.log(`[MonthsService] Generating data for ${month}`);
    
    try {
      const bills = await this.billsService.getAll();
      const incomes = await this.incomesService.getAll();
      
      const now = new Date().toISOString();
      
      const billInstances: BillInstance[] = [];
      for (const bill of bills) {
        if (!bill.is_active) continue;
        
        const instancesCount = getMonthlyInstanceCount(bill.billing_period);
        const amount = Math.round(bill.amount * instancesCount);
        
        billInstances.push({
          id: crypto.randomUUID(),
          bill_id: bill.id,
          month,
          amount,
          is_default: true,
          created_at: now,
          updated_at: now
        });
      }
      
      const incomeInstances: IncomeInstance[] = [];
      for (const income of incomes) {
        if (!income.is_active) continue;
        
        const instancesCount = getMonthlyInstanceCount(income.billing_period);
        const amount = Math.round(income.amount * instancesCount);
        
        incomeInstances.push({
          id: crypto.randomUUID(),
          income_id: income.id,
          month,
          amount,
          is_default: true,
          created_at: now,
          updated_at: now
        });
      }
      
      const monthlyData: MonthlyData = {
        month,
        bill_instances: billInstances,
        income_instances: incomeInstances,
        variable_expenses: [],
        free_flowing_expenses: [],
        bank_balances: {},
        created_at: now,
        updated_at: now
      };
      
      await this.saveMonthlyData(month, monthlyData);
      return monthlyData;
    } catch (error) {
      console.error('[MonthsService] Failed to generate monthly data:', error);
      throw error;
    }
  }
  
  public async updateBankBalances(month: string, balances: Record<string, number>): Promise<MonthlyData> {
    try {
      const data = await this.getMonthlyData(month);
      
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }
      
      data.bank_balances = balances;
      data.updated_at = new Date().toISOString();
      
      await this.saveMonthlyData(month, data);
      return data;
    } catch (error) {
      console.error('[MonthsService] Failed to update bank balances:', error);
      throw error;
    }
  }
  
  public async saveMonthlyData(month: string, data: MonthlyData): Promise<void> {
    try {
      await this.storage.writeJSON(`data/months/${month}.json`, data);
      console.log(`[MonthsService] Saved monthly data for ${month}`);
    } catch (error) {
      console.error('[MonthsService] Failed to save monthly data:', error);
      throw error;
    }
  }
  
  public async getBillInstances(month: string): Promise<BillInstance[]> {
    const data = await this.getMonthlyData(month);
    return data?.bill_instances || [];
  }
  
  public async getIncomeInstances(month: string): Promise<IncomeInstance[]> {
    const data = await this.getMonthlyData(month);
    return data?.income_instances || [];
  }
  
  public async getVariableExpenses(month: string): Promise<VariableExpense[]> {
    const data = await this.getMonthlyData(month);
    return data?.variable_expenses || [];
  }
  
  public async getFreeFlowingExpenses(month: string): Promise<FreeFlowingExpense[]> {
    const data = await this.getMonthlyData(month);
    return data?.free_flowing_expenses || [];
  }
}
