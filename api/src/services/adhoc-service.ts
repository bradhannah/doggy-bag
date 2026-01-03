// Ad-hoc Service - Create and manage one-time bills and incomes
// Ad-hoc items exist only in a specific month and have no recurring pattern

import { MonthsServiceImpl } from './months-service';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import { CategoriesServiceImpl } from './categories-service';
import type { MonthsService } from './months-service';
import type { BillsService } from './bills-service';
import type { IncomesService } from './incomes-service';
import type { CategoriesService } from './categories-service';
import type {
  BillInstance,
  IncomeInstance,
  Bill,
  Income,
  BillingPeriod
} from '../types';

// Request types
export interface CreateAdhocBillRequest {
  name: string;
  amount: number;
  category_id?: string;
  payment_source_id?: string;
  date?: string;
}

export interface CreateAdhocIncomeRequest {
  name: string;
  amount: number;
  category_id?: string;
  payment_source_id?: string;
  date?: string;
}

export interface UpdateAdhocRequest {
  name?: string;
  actual_amount?: number;
  category_id?: string;
  payment_source_id?: string;
  is_paid?: boolean;
}

export interface MakeRegularRequest {
  name: string;
  amount: number;
  category_id: string;
  payment_source_id: string;
  billing_period: BillingPeriod;
  due_day?: number;
}

export interface AdhocService {
  // Bills
  createAdhocBill(month: string, data: CreateAdhocBillRequest): Promise<BillInstance>;
  updateAdhocBill(month: string, instanceId: string, data: UpdateAdhocRequest): Promise<BillInstance | null>;
  deleteAdhocBill(month: string, instanceId: string): Promise<void>;
  makeRegularBill(month: string, instanceId: string, data: MakeRegularRequest): Promise<{ bill: Bill; billInstance: BillInstance }>;
  
  // Incomes
  createAdhocIncome(month: string, data: CreateAdhocIncomeRequest): Promise<IncomeInstance>;
  updateAdhocIncome(month: string, instanceId: string, data: UpdateAdhocRequest): Promise<IncomeInstance | null>;
  deleteAdhocIncome(month: string, instanceId: string): Promise<void>;
  makeRegularIncome(month: string, instanceId: string, data: MakeRegularRequest): Promise<{ income: Income; incomeInstance: IncomeInstance }>;
}

// Default ad-hoc category IDs (will be created if they don't exist)
const ADHOC_BILL_CATEGORY_ID = 'adhoc-bill-category';
const ADHOC_INCOME_CATEGORY_ID = 'adhoc-income-category';

export class AdhocServiceImpl implements AdhocService {
  private monthsService: MonthsService;
  private billsService: BillsService;
  private incomesService: IncomesService;
  private categoriesService: CategoriesService;

  constructor() {
    this.monthsService = new MonthsServiceImpl();
    this.billsService = new BillsServiceImpl();
    this.incomesService = new IncomesServiceImpl();
    this.categoriesService = new CategoriesServiceImpl();
  }

  /**
   * Get or create the default ad-hoc bill category
   */
  private async getAdhocBillCategory(): Promise<string> {
    const categories = await this.categoriesService.getAll();
    let adhocCategory = categories.find(c => c.id === ADHOC_BILL_CATEGORY_ID || c.name === 'Ad-hoc');
    
    if (!adhocCategory) {
      // Create the ad-hoc category
      adhocCategory = await this.categoriesService.create({
        name: 'Ad-hoc',
        type: 'bill',
        color: '#a78bfa',
        sort_order: 999,
        is_predefined: true
      });
    }
    
    return adhocCategory.id;
  }

  /**
   * Get or create the default ad-hoc income category
   */
  private async getAdhocIncomeCategory(): Promise<string> {
    const categories = await this.categoriesService.getAll();
    let adhocCategory = categories.find(c => c.id === ADHOC_INCOME_CATEGORY_ID || (c.name === 'Ad-hoc' && c.type === 'income'));
    
    if (!adhocCategory) {
      // Create the ad-hoc income category
      adhocCategory = await this.categoriesService.create({
        name: 'Ad-hoc',
        type: 'income',
        color: '#a78bfa',
        sort_order: 999,
        is_predefined: true
      });
    }
    
    return adhocCategory.id;
  }

  // ========================================================================
  // Bills
  // ========================================================================

  public async createAdhocBill(month: string, data: CreateAdhocBillRequest): Promise<BillInstance> {
    // Validate
    if (!data.name || !data.name.trim()) {
      throw new Error('Name is required');
    }
    if (!data.amount || data.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Get or create month data
    let monthData = await this.monthsService.getMonthlyData(month);
    if (!monthData) {
      monthData = await this.monthsService.generateMonthlyData(month);
    }

    // Get category ID (use provided or default ad-hoc)
    const categoryId = data.category_id || await this.getAdhocBillCategory();

    const now = new Date().toISOString();
    const today = now.split('T')[0]; // YYYY-MM-DD
    
    // Ad-hoc bills have a single occurrence
    const occurrence = {
      id: crypto.randomUUID(),
      sequence: 1,
      expected_date: data.date || today,
      expected_amount: data.amount,
      is_closed: !!data.date,
      closed_date: data.date || undefined,
      payments: [],
      is_adhoc: true,
      created_at: now,
      updated_at: now
    };
    
    const newInstance: BillInstance = {
      id: crypto.randomUUID(),
      bill_id: null, // Always null for ad-hoc
      month,
      billing_period: 'monthly',  // Ad-hoc items are treated as monthly
      amount: data.amount,
      expected_amount: data.amount, // Ad-hoc items use entered amount as expected
      actual_amount: undefined,     // No actual until payments are made
      payments: [],                // DEPRECATED
      occurrences: [occurrence],   // Single occurrence for ad-hoc
      is_default: false,
      is_paid: !!data.date, // Paid if date provided
      is_closed: !!data.date, // Closed if date provided
      is_adhoc: true,
      due_date: undefined,
      name: data.name.trim(),
      category_id: categoryId,
      payment_source_id: data.payment_source_id,
      created_at: now,
      updated_at: now
    };

    monthData.bill_instances.push(newInstance);
    await this.monthsService.saveMonthlyData(month, monthData);

    console.log(`[AdhocService] Created ad-hoc bill "${data.name}" for ${month}`);
    return newInstance;
  }

  public async updateAdhocBill(month: string, instanceId: string, data: UpdateAdhocRequest): Promise<BillInstance | null> {
    const monthData = await this.monthsService.getMonthlyData(month);
    if (!monthData) {
      throw new Error(`Month ${month} not found`);
    }

    const index = monthData.bill_instances.findIndex(bi => bi.id === instanceId);
    if (index === -1) {
      return null;
    }

    const instance = monthData.bill_instances[index];
    if (!instance.is_adhoc) {
      throw new Error('Cannot update non-adhoc item with adhoc endpoint');
    }

    const now = new Date().toISOString();
    const updated: BillInstance = {
      ...instance,
      name: data.name !== undefined ? data.name : instance.name,
      actual_amount: data.actual_amount !== undefined ? data.actual_amount : instance.actual_amount,
      category_id: data.category_id !== undefined ? data.category_id : instance.category_id,
      payment_source_id: data.payment_source_id !== undefined ? data.payment_source_id : instance.payment_source_id,
      is_paid: data.is_paid !== undefined ? data.is_paid : instance.is_paid,
      updated_at: now
    };

    monthData.bill_instances[index] = updated;
    await this.monthsService.saveMonthlyData(month, monthData);

    console.log(`[AdhocService] Updated ad-hoc bill "${updated.name}" for ${month}`);
    return updated;
  }

  public async deleteAdhocBill(month: string, instanceId: string): Promise<void> {
    const monthData = await this.monthsService.getMonthlyData(month);
    if (!monthData) {
      throw new Error(`Month ${month} not found`);
    }

    const instance = monthData.bill_instances.find(bi => bi.id === instanceId);
    if (!instance) {
      throw new Error(`Bill instance ${instanceId} not found`);
    }

    if (!instance.is_adhoc) {
      throw new Error('Cannot delete non-adhoc item with adhoc endpoint');
    }

    monthData.bill_instances = monthData.bill_instances.filter(bi => bi.id !== instanceId);
    await this.monthsService.saveMonthlyData(month, monthData);

    console.log(`[AdhocService] Deleted ad-hoc bill "${instance.name}" from ${month}`);
  }

  public async makeRegularBill(
    month: string, 
    instanceId: string, 
    data: MakeRegularRequest
  ): Promise<{ bill: Bill; billInstance: BillInstance }> {
    const monthData = await this.monthsService.getMonthlyData(month);
    if (!monthData) {
      throw new Error(`Month ${month} not found`);
    }

    const index = monthData.bill_instances.findIndex(bi => bi.id === instanceId);
    if (index === -1) {
      throw new Error(`Bill instance ${instanceId} not found`);
    }

    const instance = monthData.bill_instances[index];
    if (!instance.is_adhoc) {
      throw new Error('Can only make regular from ad-hoc items');
    }

    // Create the new recurring bill
    // For monthly bills, use due_day as day_of_month if provided, otherwise default to 1
    const billData: any = {
      name: data.name,
      amount: data.amount,
      billing_period: data.billing_period,
      payment_source_id: data.payment_source_id,
      category_id: data.category_id,
      due_day: data.due_day
    };
    
    // Add day_of_month for monthly billing (required by validation)
    if (data.billing_period === 'monthly') {
      billData.day_of_month = data.due_day || 1;
    } else {
      // For non-monthly, we need a start_date - use today
      billData.start_date = new Date().toISOString().split('T')[0];
    }
    
    const newBill = await this.billsService.create(billData);

    // Update the instance to reference the new bill
    const now = new Date().toISOString();
    const updatedInstance: BillInstance = {
      ...instance,
      bill_id: newBill.id,
      expected_amount: data.amount,
      // Keep is_adhoc: true as historical record
      updated_at: now
    };

    monthData.bill_instances[index] = updatedInstance;
    await this.monthsService.saveMonthlyData(month, monthData);

    console.log(`[AdhocService] Converted ad-hoc bill "${instance.name}" to regular bill "${newBill.name}"`);
    return { bill: newBill, billInstance: updatedInstance };
  }

  // ========================================================================
  // Incomes
  // ========================================================================

  public async createAdhocIncome(month: string, data: CreateAdhocIncomeRequest): Promise<IncomeInstance> {
    // Validate
    if (!data.name || !data.name.trim()) {
      throw new Error('Name is required');
    }
    if (!data.amount || data.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Get or create month data
    let monthData = await this.monthsService.getMonthlyData(month);
    if (!monthData) {
      monthData = await this.monthsService.generateMonthlyData(month);
    }

    // Get category ID (use provided or default ad-hoc)
    const categoryId = data.category_id || await this.getAdhocIncomeCategory();

    const now = new Date().toISOString();
    const today = now.split('T')[0]; // YYYY-MM-DD
    
    // Ad-hoc incomes have a single occurrence
    const occurrence = {
      id: crypto.randomUUID(),
      sequence: 1,
      expected_date: data.date || today,
      expected_amount: data.amount,
      is_closed: !!data.date,
      closed_date: data.date || undefined,
      payments: [],
      is_adhoc: true,
      created_at: now,
      updated_at: now
    };
    
    const newInstance: IncomeInstance = {
      id: crypto.randomUUID(),
      income_id: null, // Always null for ad-hoc
      month,
      billing_period: 'monthly',  // Ad-hoc items are treated as monthly
      amount: data.amount,
      expected_amount: 0, // Ad-hoc items have no expected amount
      actual_amount: data.amount,
      payments: [],                // DEPRECATED
      occurrences: [occurrence],   // Single occurrence for ad-hoc
      is_default: false,
      is_paid: !!data.date, // Received if date provided
      is_closed: !!data.date, // Closed if date provided
      is_adhoc: true,
      due_date: undefined,
      name: data.name.trim(),
      category_id: categoryId,
      payment_source_id: data.payment_source_id,
      created_at: now,
      updated_at: now
    };

    monthData.income_instances.push(newInstance);
    await this.monthsService.saveMonthlyData(month, monthData);

    console.log(`[AdhocService] Created ad-hoc income "${data.name}" for ${month}`);
    return newInstance;
  }

  public async updateAdhocIncome(month: string, instanceId: string, data: UpdateAdhocRequest): Promise<IncomeInstance | null> {
    const monthData = await this.monthsService.getMonthlyData(month);
    if (!monthData) {
      throw new Error(`Month ${month} not found`);
    }

    const index = monthData.income_instances.findIndex(ii => ii.id === instanceId);
    if (index === -1) {
      return null;
    }

    const instance = monthData.income_instances[index];
    if (!instance.is_adhoc) {
      throw new Error('Cannot update non-adhoc item with adhoc endpoint');
    }

    const now = new Date().toISOString();
    const updated: IncomeInstance = {
      ...instance,
      name: data.name !== undefined ? data.name : instance.name,
      actual_amount: data.actual_amount !== undefined ? data.actual_amount : instance.actual_amount,
      category_id: data.category_id !== undefined ? data.category_id : instance.category_id,
      payment_source_id: data.payment_source_id !== undefined ? data.payment_source_id : instance.payment_source_id,
      is_paid: data.is_paid !== undefined ? data.is_paid : instance.is_paid,
      updated_at: now
    };

    monthData.income_instances[index] = updated;
    await this.monthsService.saveMonthlyData(month, monthData);

    console.log(`[AdhocService] Updated ad-hoc income "${updated.name}" for ${month}`);
    return updated;
  }

  public async deleteAdhocIncome(month: string, instanceId: string): Promise<void> {
    const monthData = await this.monthsService.getMonthlyData(month);
    if (!monthData) {
      throw new Error(`Month ${month} not found`);
    }

    const instance = monthData.income_instances.find(ii => ii.id === instanceId);
    if (!instance) {
      throw new Error(`Income instance ${instanceId} not found`);
    }

    if (!instance.is_adhoc) {
      throw new Error('Cannot delete non-adhoc item with adhoc endpoint');
    }

    monthData.income_instances = monthData.income_instances.filter(ii => ii.id !== instanceId);
    await this.monthsService.saveMonthlyData(month, monthData);

    console.log(`[AdhocService] Deleted ad-hoc income "${instance.name}" from ${month}`);
  }

  public async makeRegularIncome(
    month: string, 
    instanceId: string, 
    data: MakeRegularRequest
  ): Promise<{ income: Income; incomeInstance: IncomeInstance }> {
    const monthData = await this.monthsService.getMonthlyData(month);
    if (!monthData) {
      throw new Error(`Month ${month} not found`);
    }

    const index = monthData.income_instances.findIndex(ii => ii.id === instanceId);
    if (index === -1) {
      throw new Error(`Income instance ${instanceId} not found`);
    }

    const instance = monthData.income_instances[index];
    if (!instance.is_adhoc) {
      throw new Error('Can only make regular from ad-hoc items');
    }

    // Create the new recurring income
    // For monthly incomes, use due_day as day_of_month if provided, otherwise default to 1
    const incomeData: any = {
      name: data.name,
      amount: data.amount,
      billing_period: data.billing_period,
      payment_source_id: data.payment_source_id,
      category_id: data.category_id,
      due_day: data.due_day
    };
    
    // Add day_of_month for monthly billing (required by validation)
    if (data.billing_period === 'monthly') {
      incomeData.day_of_month = data.due_day || 1;
    } else {
      // For non-monthly, we need a start_date - use today
      incomeData.start_date = new Date().toISOString().split('T')[0];
    }
    
    const newIncome = await this.incomesService.create(incomeData);

    // Update the instance to reference the new income
    const now = new Date().toISOString();
    const updatedInstance: IncomeInstance = {
      ...instance,
      income_id: newIncome.id,
      expected_amount: data.amount,
      // Keep is_adhoc: true as historical record
      updated_at: now
    };

    monthData.income_instances[index] = updatedInstance;
    await this.monthsService.saveMonthlyData(month, monthData);

    console.log(`[AdhocService] Converted ad-hoc income "${instance.name}" to regular income "${newIncome.name}"`);
    return { income: newIncome, incomeInstance: updatedInstance };
  }
}
