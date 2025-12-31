// Months Service - Generate and manage monthly budget data

import { StorageServiceImpl } from './storage';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import type { StorageService } from './storage';
import type { BillsService } from './bills-service';
import type { IncomesService } from './incomes-service';
import type { 
  MonthlyData,
  BillInstance,
  IncomeInstance,
  VariableExpense,
  FreeFlowingExpense,
  Bill,
  Income 
} from '../types';
import { getMonthlyInstanceCount, calculateActualMonthlyAmount } from '../utils/billing-period';

// Summary for a single month in the list
export interface MonthSummary {
  month: string;
  created_at: string;
  updated_at: string;
  total_income: number;
  total_bills: number;
  total_expenses: number;
  leftover: number;
}

export interface MonthsService {
  getMonthlyData(month: string): Promise<MonthlyData | null>;
  getAllMonths(): Promise<MonthSummary[]>;
  generateMonthlyData(month: string): Promise<MonthlyData>;
  syncMonthlyData(month: string): Promise<MonthlyData>;
  updateBankBalances(month: string, balances: Record<string, number>): Promise<MonthlyData>;
  saveMonthlyData(month: string, data: MonthlyData): Promise<void>;
  
  getBillInstances(month: string): Promise<BillInstance[]>;
  getIncomeInstances(month: string): Promise<IncomeInstance[]>;
  getVariableExpenses(month: string): Promise<VariableExpense[]>;
  getFreeFlowingExpenses(month: string): Promise<FreeFlowingExpense[]>;
  
  // Instance update methods
  updateBillInstance(month: string, instanceId: string, amount: number): Promise<BillInstance | null>;
  updateIncomeInstance(month: string, instanceId: string, amount: number): Promise<IncomeInstance | null>;
  resetBillInstance(month: string, instanceId: string): Promise<BillInstance | null>;
  resetIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null>;
  
  // Mark as paid methods
  toggleBillInstancePaid(month: string, instanceId: string): Promise<BillInstance | null>;
  toggleIncomeInstancePaid(month: string, instanceId: string): Promise<IncomeInstance | null>;
}

export class MonthsServiceImpl implements MonthsService {
  private storage: StorageService;
  private billsService: BillsService;
  private incomesService: IncomesService;
  
  constructor() {
    this.storage = StorageServiceImpl.getInstance();
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
  
  public async getAllMonths(): Promise<MonthSummary[]> {
    try {
      const monthsDir = 'data/months';
      const files = await Bun.file(monthsDir).exists() ? [] : [];
      
      // Read the months directory
      const dir = await import('node:fs/promises');
      const entries = await dir.readdir(monthsDir);
      
      const summaries: MonthSummary[] = [];
      
      for (const entry of entries) {
        // Skip non-JSON files and .gitkeep
        if (!entry.endsWith('.json') || entry === '.gitkeep') continue;
        
        const month = entry.replace('.json', '');
        const data = await this.getMonthlyData(month);
        
        if (data) {
          // Calculate totals
          const totalIncome = data.income_instances.reduce((sum, i) => sum + i.amount, 0);
          const totalBills = data.bill_instances.reduce((sum, b) => sum + b.amount, 0);
          const totalExpenses = data.variable_expenses.reduce((sum, e) => sum + e.amount, 0);
          const leftover = totalIncome - totalBills - totalExpenses;
          
          summaries.push({
            month: data.month,
            created_at: data.created_at,
            updated_at: data.updated_at,
            total_income: totalIncome,
            total_bills: totalBills,
            total_expenses: totalExpenses,
            leftover
          });
        }
      }
      
      // Sort by month descending (newest first)
      summaries.sort((a, b) => b.month.localeCompare(a.month));
      
      return summaries;
    } catch (error) {
      console.error('[MonthsService] Failed to get all months:', error);
      return [];
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
        
        // Use actual calculation with start_date if available, otherwise fallback to average
        const amount = calculateActualMonthlyAmount(
          bill.amount,
          bill.billing_period,
          bill.start_date,
          month
        );
        
        billInstances.push({
          id: crypto.randomUUID(),
          bill_id: bill.id,
          month,
          amount,
          is_default: true,
          is_paid: false,
          created_at: now,
          updated_at: now
        });
      }
      
      const incomeInstances: IncomeInstance[] = [];
      for (const income of incomes) {
        if (!income.is_active) continue;
        
        // Use actual calculation with start_date if available, otherwise fallback to average
        const amount = calculateActualMonthlyAmount(
          income.amount,
          income.billing_period,
          income.start_date,
          month
        );
        
        incomeInstances.push({
          id: crypto.randomUUID(),
          income_id: income.id,
          month,
          amount,
          is_default: true,
          is_paid: false,
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
  
  public async syncMonthlyData(month: string): Promise<MonthlyData> {
    console.log(`[MonthsService] Syncing data for ${month}`);
    
    try {
      const existingData = await this.getMonthlyData(month);
      
      if (!existingData) {
        // No existing data, just generate fresh
        return this.generateMonthlyData(month);
      }
      
      const bills = await this.billsService.getAll();
      const incomes = await this.incomesService.getAll();
      
      const now = new Date().toISOString();
      
      // Find bills that don't have instances yet
      const existingBillIds = new Set(existingData.bill_instances.map(bi => bi.bill_id));
      const newBillInstances: BillInstance[] = [];
      
      for (const bill of bills) {
        if (!bill.is_active) continue;
        if (existingBillIds.has(bill.id)) continue; // Already exists
        
        // Use actual calculation with start_date if available
        const amount = calculateActualMonthlyAmount(
          bill.amount,
          bill.billing_period,
          bill.start_date,
          month
        );
        
        newBillInstances.push({
          id: crypto.randomUUID(),
          bill_id: bill.id,
          month,
          amount,
          is_default: true,
          is_paid: false,
          created_at: now,
          updated_at: now
        });
      }
      
      // Find incomes that don't have instances yet
      const existingIncomeIds = new Set(existingData.income_instances.map(ii => ii.income_id));
      const newIncomeInstances: IncomeInstance[] = [];
      
      for (const income of incomes) {
        if (!income.is_active) continue;
        if (existingIncomeIds.has(income.id)) continue; // Already exists
        
        // Use actual calculation with start_date if available
        const amount = calculateActualMonthlyAmount(
          income.amount,
          income.billing_period,
          income.start_date,
          month
        );
        
        newIncomeInstances.push({
          id: crypto.randomUUID(),
          income_id: income.id,
          month,
          amount,
          is_default: true,
          is_paid: false,
          created_at: now,
          updated_at: now
        });
      }
      
      // Only update if there are new instances
      if (newBillInstances.length > 0 || newIncomeInstances.length > 0) {
        existingData.bill_instances = [...existingData.bill_instances, ...newBillInstances];
        existingData.income_instances = [...existingData.income_instances, ...newIncomeInstances];
        existingData.updated_at = now;
        
        await this.saveMonthlyData(month, existingData);
        console.log(`[MonthsService] Added ${newBillInstances.length} bills, ${newIncomeInstances.length} incomes to ${month}`);
      }
      
      return existingData;
    } catch (error) {
      console.error('[MonthsService] Failed to sync monthly data:', error);
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
  
  public async updateBillInstance(month: string, instanceId: string, amount: number): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }
      
      const index = data.bill_instances.findIndex(bi => bi.id === instanceId);
      if (index === -1) {
        return null;
      }
      
      const now = new Date().toISOString();
      data.bill_instances[index] = {
        ...data.bill_instances[index],
        amount,
        is_default: false,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to update bill instance:', error);
      throw error;
    }
  }
  
  public async updateIncomeInstance(month: string, instanceId: string, amount: number): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }
      
      const index = data.income_instances.findIndex(ii => ii.id === instanceId);
      if (index === -1) {
        return null;
      }
      
      const now = new Date().toISOString();
      data.income_instances[index] = {
        ...data.income_instances[index],
        amount,
        is_default: false,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to update income instance:', error);
      throw error;
    }
  }
  
  public async resetBillInstance(month: string, instanceId: string): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }
      
      const index = data.bill_instances.findIndex(bi => bi.id === instanceId);
      if (index === -1) {
        return null;
      }
      
      // Get the original bill to calculate default amount
      const billId = data.bill_instances[index].bill_id;
      const bill = await this.billsService.getById(billId);
      
      if (!bill) {
        throw new Error(`Bill ${billId} not found`);
      }
      
      // Use actual calculation with start_date if available
      const defaultAmount = calculateActualMonthlyAmount(
        bill.amount,
        bill.billing_period,
        bill.start_date,
        month
      );
      
      const now = new Date().toISOString();
      data.bill_instances[index] = {
        ...data.bill_instances[index],
        amount: defaultAmount,
        is_default: true,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to reset bill instance:', error);
      throw error;
    }
  }
  
  public async resetIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }
      
      const index = data.income_instances.findIndex(ii => ii.id === instanceId);
      if (index === -1) {
        return null;
      }
      
      // Get the original income to calculate default amount
      const incomeId = data.income_instances[index].income_id;
      const income = await this.incomesService.getById(incomeId);
      
      if (!income) {
        throw new Error(`Income ${incomeId} not found`);
      }
      
      // Use actual calculation with start_date if available
      const defaultAmount = calculateActualMonthlyAmount(
        income.amount,
        income.billing_period,
        income.start_date,
        month
      );
      
      const now = new Date().toISOString();
      data.income_instances[index] = {
        ...data.income_instances[index],
        amount: defaultAmount,
        is_default: true,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to reset income instance:', error);
      throw error;
    }
  }
  
  public async toggleBillInstancePaid(month: string, instanceId: string): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }
      
      const index = data.bill_instances.findIndex(bi => bi.id === instanceId);
      if (index === -1) {
        return null;
      }
      
      const now = new Date().toISOString();
      const currentPaid = data.bill_instances[index].is_paid ?? false;
      data.bill_instances[index] = {
        ...data.bill_instances[index],
        is_paid: !currentPaid,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to toggle bill instance paid:', error);
      throw error;
    }
  }
  
  public async toggleIncomeInstancePaid(month: string, instanceId: string): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }
      
      const index = data.income_instances.findIndex(ii => ii.id === instanceId);
      if (index === -1) {
        return null;
      }
      
      const now = new Date().toISOString();
      const currentPaid = data.income_instances[index].is_paid ?? false;
      data.income_instances[index] = {
        ...data.income_instances[index],
        is_paid: !currentPaid,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to toggle income instance paid:', error);
      throw error;
    }
  }
}
