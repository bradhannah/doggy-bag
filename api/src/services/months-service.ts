// Months Service - Generate and manage monthly budget data

import { StorageServiceImpl } from './storage';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import { VariableExpenseTemplatesServiceImpl } from './variable-expense-templates-service';
import type { StorageService } from './storage';
import type { BillsService } from './bills-service';
import type { IncomesService } from './incomes-service';
import type { VariableExpenseTemplatesService } from './variable-expense-templates-service';
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
import { 
  migrateBillInstance, 
  migrateIncomeInstance,
  needsBillInstanceMigration,
  needsIncomeInstanceMigration 
} from '../utils/migration';

// Summary for a single month in the list
export interface MonthSummary {
  month: string;
  exists: boolean;              // Whether the month file exists
  is_read_only: boolean;        // Lock status
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
  
  // Month management
  monthExists(month: string): Promise<boolean>;
  createMonth(month: string): Promise<MonthlyData>;
  deleteMonth(month: string): Promise<void>;
  toggleReadOnly(month: string): Promise<MonthlyData>;
  isReadOnly(month: string): Promise<boolean>;
  getMonthsForManagement(): Promise<MonthSummary[]>;
  
  getBillInstances(month: string): Promise<BillInstance[]>;
  getIncomeInstances(month: string): Promise<IncomeInstance[]>;
  getVariableExpenses(month: string): Promise<VariableExpense[]>;
  getFreeFlowingExpenses(month: string): Promise<FreeFlowingExpense[]>;
  
  // Instance update methods
  updateBillInstance(month: string, instanceId: string, amount: number): Promise<BillInstance | null>;
  updateIncomeInstance(month: string, instanceId: string, amount: number): Promise<IncomeInstance | null>;
  resetBillInstance(month: string, instanceId: string): Promise<BillInstance | null>;
  resetIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null>;
  
  // Mark as paid methods (DEPRECATED - use close/reopen instead)
  toggleBillInstancePaid(month: string, instanceId: string): Promise<BillInstance | null>;
  toggleIncomeInstancePaid(month: string, instanceId: string, actualAmount?: number): Promise<IncomeInstance | null>;
  
  // Close/Reopen methods (new transaction-based flow)
  closeBillInstance(month: string, instanceId: string): Promise<BillInstance | null>;
  reopenBillInstance(month: string, instanceId: string): Promise<BillInstance | null>;
  closeIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null>;
  reopenIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null>;
  
  // Expected amount update (inline edit)
  updateBillExpectedAmount(month: string, instanceId: string, amount: number): Promise<BillInstance | null>;
  updateIncomeExpectedAmount(month: string, instanceId: string, amount: number): Promise<IncomeInstance | null>;
}

export class MonthsServiceImpl implements MonthsService {
  private storage: StorageService;
  private billsService: BillsService;
  private incomesService: IncomesService;
  private variableExpenseTemplatesService: VariableExpenseTemplatesService;
  
  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.billsService = new BillsServiceImpl();
    this.incomesService = new IncomesServiceImpl();
    this.variableExpenseTemplatesService = new VariableExpenseTemplatesServiceImpl();
  }
  
  public async getMonthlyData(month: string): Promise<MonthlyData | null> {
    try {
      const data = await this.storage.readJSON<MonthlyData>(`data/months/${month}.json`);
      
      if (!data) return null;
      
      // Apply migration to instances if needed (002-detailed-monthly-view)
      let needsSave = false;
      
      // Migrate bill instances
      const migratedBillInstances = data.bill_instances.map((bi: any) => {
        if (needsBillInstanceMigration(bi)) {
          needsSave = true;
          return migrateBillInstance(bi);
        }
        return bi as BillInstance;
      });
      
      // Migrate income instances
      const migratedIncomeInstances = data.income_instances.map((ii: any) => {
        if (needsIncomeInstanceMigration(ii)) {
          needsSave = true;
          return migrateIncomeInstance(ii);
        }
        return ii as IncomeInstance;
      });
      
      // Update data with migrated instances
      data.bill_instances = migratedBillInstances;
      data.income_instances = migratedIncomeInstances;
      
      // Persist migrated data if changes were made
      if (needsSave) {
        await this.storage.writeJSON(`data/months/${month}.json`, data);
        console.log(`[MonthsService] Migrated instances for ${month} to new schema`);
      }
      
      return data;
    } catch (error) {
      console.error('[MonthsService] Failed to load monthly data:', error);
      return null;
    }
  }
  
  public async getAllMonths(): Promise<MonthSummary[]> {
    try {
      // Use storage service to list files (respects DATA_DIR)
      const files = await this.storage.listFiles('data/months');
      
      const summaries: MonthSummary[] = [];
      
      for (const file of files) {
        // Skip non-JSON files and .gitkeep
        if (!file.endsWith('.json') || file === '.gitkeep') continue;
        
        const month = file.replace('.json', '');
        const data = await this.getMonthlyData(month);
        
        if (data) {
          // Calculate totals
          const totalIncome = data.income_instances.reduce((sum, i) => sum + i.amount, 0);
          const totalBills = data.bill_instances.reduce((sum, b) => sum + b.amount, 0);
          const totalExpenses = data.variable_expenses.reduce((sum, e) => sum + e.amount, 0);
          const leftover = totalIncome - totalBills - totalExpenses;
          
          summaries.push({
            month: data.month,
            exists: true,
            is_read_only: data.is_read_only ?? false,
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
          expected_amount: amount,       // NEW: Same as amount for new instances
          actual_amount: undefined,      // NEW: No actual entered yet
          payments: [],                  // NEW: Empty payments array
          is_default: true,
          is_paid: false,
          is_closed: false,              // NEW: Not closed yet
          is_adhoc: false,               // NEW: Not ad-hoc (linked to bill)
          due_date: undefined,           // NEW: Will be calculated from bill.due_day if present
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
          expected_amount: amount,       // NEW: Same as amount for new instances
          actual_amount: undefined,      // NEW: No actual entered yet
          payments: [],                  // NEW: Empty payments array
          is_default: true,
          is_paid: false,
          is_closed: false,              // NEW: Not closed yet
          is_adhoc: false,               // NEW: Not ad-hoc (linked to income)
          due_date: undefined,           // NEW: Will be calculated from income.due_day if present
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
        is_read_only: false,
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
          expected_amount: amount,       // NEW: Same as amount for new instances
          actual_amount: undefined,      // NEW: No actual entered yet
          payments: [],                  // NEW: Empty payments array
          is_default: true,
          is_paid: false,
          is_closed: false,              // NEW: Not closed yet
          is_adhoc: false,               // NEW: Not ad-hoc (linked to bill)
          due_date: undefined,           // NEW: Will be calculated from bill.due_day if present
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
          expected_amount: amount,       // NEW: Same as amount for new instances
          actual_amount: undefined,      // NEW: No actual entered yet
          payments: [],                  // NEW: Empty payments array
          is_default: true,
          is_paid: false,
          is_closed: false,              // NEW: Not closed yet
          is_adhoc: false,               // NEW: Not ad-hoc (linked to income)
          due_date: undefined,           // NEW: Will be calculated from income.due_day if present
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
      
      // Ad-hoc bills (bill_id is null) cannot be reset to default
      if (!billId) {
        throw new Error('Cannot reset ad-hoc bill instance - no default bill reference');
      }
      
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
        expected_amount: defaultAmount,
        actual_amount: undefined,
        payments: [],
        is_default: true,
        is_paid: false,
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
      
      // Ad-hoc incomes (income_id is null) cannot be reset to default
      if (!incomeId) {
        throw new Error('Cannot reset ad-hoc income instance - no default income reference');
      }
      
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
        expected_amount: defaultAmount,
        actual_amount: undefined,
        is_default: true,
        is_paid: false,
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
  
  public async toggleIncomeInstancePaid(month: string, instanceId: string, actualAmount?: number): Promise<IncomeInstance | null> {
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
      const updates: Partial<IncomeInstance> = {
        is_paid: !currentPaid,
        updated_at: now
      };
      
      // If marking as received and actualAmount provided, set the actual_amount
      if (!currentPaid && actualAmount !== undefined) {
        updates.actual_amount = actualAmount;
        updates.is_default = false;
      }
      
      data.income_instances[index] = {
        ...data.income_instances[index],
        ...updates
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to toggle income instance paid:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // Close/Reopen Methods (New Transaction-Based Flow)
  // ============================================================================
  
  public async closeBillInstance(month: string, instanceId: string): Promise<BillInstance | null> {
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
      const today = now.split('T')[0]; // YYYY-MM-DD
      
      data.bill_instances[index] = {
        ...data.bill_instances[index],
        is_closed: true,
        is_paid: true, // Keep in sync for backwards compatibility
        closed_date: today,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to close bill instance:', error);
      throw error;
    }
  }
  
  public async reopenBillInstance(month: string, instanceId: string): Promise<BillInstance | null> {
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
        is_closed: false,
        is_paid: false, // Keep in sync for backwards compatibility
        closed_date: undefined,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to reopen bill instance:', error);
      throw error;
    }
  }
  
  public async closeIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null> {
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
      const today = now.split('T')[0]; // YYYY-MM-DD
      
      data.income_instances[index] = {
        ...data.income_instances[index],
        is_closed: true,
        is_paid: true, // Keep in sync for backwards compatibility
        closed_date: today,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to close income instance:', error);
      throw error;
    }
  }
  
  public async reopenIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null> {
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
        is_closed: false,
        is_paid: false, // Keep in sync for backwards compatibility
        closed_date: undefined,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to reopen income instance:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // Expected Amount Update Methods (Inline Edit)
  // ============================================================================
  
  public async updateBillExpectedAmount(month: string, instanceId: string, amount: number): Promise<BillInstance | null> {
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
        expected_amount: amount,
        amount: amount, // Keep deprecated field in sync
        is_default: false,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to update bill expected amount:', error);
      throw error;
    }
  }
  
  public async updateIncomeExpectedAmount(month: string, instanceId: string, amount: number): Promise<IncomeInstance | null> {
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
        expected_amount: amount,
        amount: amount, // Keep deprecated field in sync
        is_default: false,
        updated_at: now
      };
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to update income expected amount:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // Month Management Methods
  // ============================================================================
  
  public async monthExists(month: string): Promise<boolean> {
    try {
      return await this.storage.fileExists(`data/months/${month}.json`);
    } catch (error) {
      console.error('[MonthsService] Failed to check month exists:', error);
      return false;
    }
  }
  
  public async createMonth(month: string): Promise<MonthlyData> {
    console.log(`[MonthsService] Creating month ${month}`);
    
    // Check if month already exists
    const exists = await this.monthExists(month);
    if (exists) {
      throw new Error(`Month ${month} already exists`);
    }
    
    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error('Invalid month format. Expected YYYY-MM');
    }
    
    // Validate month is current or next month only
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (month !== currentMonth && month !== nextMonth) {
      // Allow creating past months that don't exist (for flexibility)
      // But warn in logs
      console.warn(`[MonthsService] Creating month ${month} which is not current (${currentMonth}) or next (${nextMonth})`);
    }
    
    try {
      const bills = await this.billsService.getAll();
      const incomes = await this.incomesService.getAll();
      const variableExpenseTemplates = await this.variableExpenseTemplatesService.getActive();
      
      const nowIso = new Date().toISOString();
      
      // Generate bill instances from active bills
      const billInstances: BillInstance[] = [];
      for (const bill of bills) {
        if (!bill.is_active) continue;
        
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
          expected_amount: amount,
          actual_amount: undefined,
          payments: [],
          is_default: true,
          is_paid: false,
          is_closed: false,
          is_adhoc: false,
          due_date: undefined,
          created_at: nowIso,
          updated_at: nowIso
        });
      }
      
      // Generate income instances from active incomes
      const incomeInstances: IncomeInstance[] = [];
      for (const income of incomes) {
        if (!income.is_active) continue;
        
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
          expected_amount: amount,
          actual_amount: undefined,
          payments: [],
          is_default: true,
          is_paid: false,
          is_closed: false,
          is_adhoc: false,
          due_date: undefined,
          created_at: nowIso,
          updated_at: nowIso
        });
      }
      
      // Generate variable expenses from active templates
      const variableExpenses: VariableExpense[] = [];
      for (const template of variableExpenseTemplates) {
        variableExpenses.push({
          id: crypto.randomUUID(),
          name: template.name,
          amount: template.estimated_amount || 0,
          payment_source_id: template.payment_source_id || '',
          month,
          created_at: nowIso,
          updated_at: nowIso
        });
      }
      
      const monthlyData: MonthlyData = {
        month,
        bill_instances: billInstances,
        income_instances: incomeInstances,
        variable_expenses: variableExpenses,
        free_flowing_expenses: [],
        bank_balances: {},
        is_read_only: false,
        created_at: nowIso,
        updated_at: nowIso
      };
      
      await this.saveMonthlyData(month, monthlyData);
      console.log(`[MonthsService] Created month ${month} with ${billInstances.length} bills, ${incomeInstances.length} incomes, ${variableExpenses.length} variable expenses`);
      
      return monthlyData;
    } catch (error) {
      console.error('[MonthsService] Failed to create month:', error);
      throw error;
    }
  }
  
  public async deleteMonth(month: string): Promise<void> {
    console.log(`[MonthsService] Deleting month ${month}`);
    
    try {
      // Check if month exists
      const exists = await this.monthExists(month);
      if (!exists) {
        throw new Error(`Month ${month} does not exist`);
      }
      
      // Check if month is read-only
      const data = await this.getMonthlyData(month);
      if (data?.is_read_only) {
        throw new Error(`Month ${month} is read-only. Unlock it before deleting.`);
      }
      
      // Delete the file using storage service
      await this.storage.deleteFile(`data/months/${month}.json`);
      
      console.log(`[MonthsService] Deleted month ${month}`);
    } catch (error) {
      console.error('[MonthsService] Failed to delete month:', error);
      throw error;
    }
  }
  
  public async toggleReadOnly(month: string): Promise<MonthlyData> {
    console.log(`[MonthsService] Toggling read-only for ${month}`);
    
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Month ${month} does not exist`);
      }
      
      const now = new Date().toISOString();
      data.is_read_only = !data.is_read_only;
      data.updated_at = now;
      
      await this.saveMonthlyData(month, data);
      console.log(`[MonthsService] Month ${month} is now ${data.is_read_only ? 'read-only' : 'editable'}`);
      
      return data;
    } catch (error) {
      console.error('[MonthsService] Failed to toggle read-only:', error);
      throw error;
    }
  }
  
  public async isReadOnly(month: string): Promise<boolean> {
    try {
      const data = await this.getMonthlyData(month);
      return data?.is_read_only ?? false;
    } catch (error) {
      console.error('[MonthsService] Failed to check read-only status:', error);
      return false;
    }
  }
  
  public async getMonthsForManagement(): Promise<MonthSummary[]> {
    try {
      // Get all existing months
      const existingMonths = await this.getAllMonths();
      
      // Calculate current and next month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Build a set of existing month strings
      const existingMonthSet = new Set(existingMonths.map(m => m.month));
      
      // Add current month placeholder if it doesn't exist
      if (!existingMonthSet.has(currentMonth)) {
        existingMonths.push({
          month: currentMonth,
          exists: false,
          is_read_only: false,
          created_at: '',
          updated_at: '',
          total_income: 0,
          total_bills: 0,
          total_expenses: 0,
          leftover: 0
        });
      }
      
      // Add next month placeholder if it doesn't exist
      if (!existingMonthSet.has(nextMonth)) {
        existingMonths.push({
          month: nextMonth,
          exists: false,
          is_read_only: false,
          created_at: '',
          updated_at: '',
          total_income: 0,
          total_bills: 0,
          total_expenses: 0,
          leftover: 0
        });
      }
      
      // Sort by month descending (newest first)
      existingMonths.sort((a, b) => b.month.localeCompare(a.month));
      
      return existingMonths;
    } catch (error) {
      console.error('[MonthsService] Failed to get months for management:', error);
      return [];
    }
  }
}
