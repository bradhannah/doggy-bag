// Months Service - Generate and manage monthly budget data

import { StorageServiceImpl } from './storage';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import { CategoriesServiceImpl } from './categories-service';
import { PaymentSourcesServiceImpl } from './payment-sources-service';
import { InsuranceClaimsServiceImpl } from './insurance-claims-service';
import { TodoInstancesServiceImpl } from './todo-instances-service';
import type { StorageService } from './storage';
import type { BillsService } from './bills-service';
import type { IncomesService } from './incomes-service';
import type { CategoriesService } from './categories-service';
import type { PaymentSourcesService } from './payment-sources-service';
import type { InsuranceClaimsService } from './insurance-claims-service';
import type { TodoInstancesService } from './todo-instances-service';
import type {
  MonthlyData,
  BillInstance,
  IncomeInstance,
  VariableExpense,
  FreeFlowingExpense,
  Occurrence,
  InsuranceClaim,
} from '../types';
import { calculateActualMonthlyAmount } from '../utils/billing-period';
import {
  migrateBillInstance,
  migrateIncomeInstance,
  needsBillInstanceMigration,
  needsIncomeInstanceMigration,
} from '../utils/migration';
import {
  generateBillOccurrences,
  generateIncomeOccurrences,
  sumOccurrenceExpectedAmounts,
  areAllOccurrencesClosed,
  createAdhocOccurrence,
  ensureOccurrenceFallback,
  resequenceOccurrences,
} from '../utils/occurrences';
import { calculateUnifiedLeftover } from '../utils/leftover';

// Summary for a single month in the list
export interface MonthSummary {
  month: string;
  exists: boolean; // Whether the month file exists
  is_read_only: boolean; // Lock status
  created_at: string;
  updated_at: string;
  // Unified leftover calculation results
  leftover: number;
  isValid: boolean; // False if required bank balances are missing
  errorMessage?: string; // Human-readable error message if not valid
  bankBalances: number; // Current cash position (snapshot)
  remainingIncome: number; // Income still expected to receive
  remainingExpenses: number; // Expenses still need to pay
  // Legacy fields (deprecated)
  total_income: number;
  total_bills: number;
  total_expenses: number;
}

export interface MonthsService {
  getMonthlyData(month: string): Promise<MonthlyData | null>;
  getAllMonthlyData(): Promise<MonthlyData[]>;
  getAllMonths(): Promise<MonthSummary[]>;
  generateMonthlyData(month: string): Promise<MonthlyData>;
  syncMonthlyData(month: string): Promise<MonthlyData>;
  syncMetadata(month: string): Promise<MonthlyData>;
  updateBankBalances(month: string, balances: Record<string, number>): Promise<MonthlyData>;
  updateSavingsBalances(
    month: string,
    start?: Record<string, number>,
    end?: Record<string, number>,
    contributions?: Record<string, number>
  ): Promise<MonthlyData>;
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
  updateBillInstance(
    month: string,
    instanceId: string,
    amount: number
  ): Promise<BillInstance | null>;
  updateIncomeInstance(
    month: string,
    instanceId: string,
    amount: number
  ): Promise<IncomeInstance | null>;
  resetBillInstance(month: string, instanceId: string): Promise<BillInstance | null>;
  resetIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null>;

  // Close/Reopen methods (new transaction-based flow)
  closeBillInstance(month: string, instanceId: string): Promise<BillInstance | null>;
  reopenBillInstance(month: string, instanceId: string): Promise<BillInstance | null>;
  closeIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null>;
  reopenIncomeInstance(month: string, instanceId: string): Promise<IncomeInstance | null>;

  // Expected amount update (inline edit)
  updateBillExpectedAmount(
    month: string,
    instanceId: string,
    amount: number
  ): Promise<BillInstance | null>;
  updateIncomeExpectedAmount(
    month: string,
    instanceId: string,
    amount: number
  ): Promise<IncomeInstance | null>;

  // ============================================================================
  // Occurrence Methods
  // ============================================================================

  // Update occurrence (expected_date, expected_amount)
  updateBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    updates: { expected_date?: string; expected_amount?: number; notes?: string | null }
  ): Promise<BillInstance | null>;
  updateIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    updates: { expected_date?: string; expected_amount?: number; notes?: string | null }
  ): Promise<IncomeInstance | null>;

  // Close/Reopen occurrence
  closeBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    details?: { closed_date?: string; notes?: string; payment_source_id?: string }
  ): Promise<BillInstance | null>;
  reopenBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string
  ): Promise<BillInstance | null>;
  closeIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    details?: { closed_date?: string; notes?: string; payment_source_id?: string }
  ): Promise<IncomeInstance | null>;
  reopenIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string
  ): Promise<IncomeInstance | null>;

  // Add ad-hoc occurrence
  addBillAdhocOccurrence(
    month: string,
    instanceId: string,
    occurrence: { expected_date: string; expected_amount: number }
  ): Promise<BillInstance | null>;
  addIncomeAdhocOccurrence(
    month: string,
    instanceId: string,
    occurrence: { expected_date: string; expected_amount: number }
  ): Promise<IncomeInstance | null>;

  // Remove ad-hoc occurrence
  removeBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string
  ): Promise<BillInstance | null>;
  removeIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string
  ): Promise<IncomeInstance | null>;

  // Split occurrence (partial payment)
  splitBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    details: {
      paid_amount: number;
      closed_date: string;
      payment_source_id?: string;
      notes?: string;
    }
  ): Promise<{ closedOccurrence: Occurrence; newOccurrence: Occurrence } | null>;
  splitIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    details: {
      paid_amount: number;
      closed_date: string;
      payment_source_id?: string;
      notes?: string;
    }
  ): Promise<{ closedOccurrence: Occurrence; newOccurrence: Occurrence } | null>;

  // ============================================================================
  // Payoff Bill Methods (occurrence-based CC payment tracking)
  // ============================================================================

  // Add payment to a payoff bill (creates a closed occurrence instead of using payments[])
  addPayoffBillPayment(
    month: string,
    instanceId: string,
    amount: number,
    date: string,
    newBalance?: number
  ): Promise<{ instance: BillInstance; newBalance: number; remaining: number } | null>;
}

export class MonthsServiceImpl implements MonthsService {
  private storage: StorageService;
  private billsService: BillsService;
  private incomesService: IncomesService;
  private categoriesService: CategoriesService;
  private paymentSourcesService: PaymentSourcesService;
  private insuranceClaimsService: InsuranceClaimsService;
  private todoInstancesService: TodoInstancesService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.billsService = new BillsServiceImpl();
    this.incomesService = new IncomesServiceImpl();
    this.categoriesService = new CategoriesServiceImpl();
    this.paymentSourcesService = new PaymentSourcesServiceImpl();
    this.insuranceClaimsService = new InsuranceClaimsServiceImpl();
    this.todoInstancesService = new TodoInstancesServiceImpl();
  }

  public async getMonthlyData(month: string): Promise<MonthlyData | null> {
    try {
      const data = await this.storage.readJSON<MonthlyData>(`data/months/${month}.json`);

      if (!data) return null;

      // Apply migration to instances if needed (002-detailed-monthly-view)
      let needsSave = false;

      // Migrate bill instances
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const migratedBillInstances = data.bill_instances.map((bi: any) => {
        if (needsBillInstanceMigration(bi)) {
          needsSave = true;
          return migrateBillInstance(bi);
        }
        return bi as BillInstance;
      });

      // Migrate income instances
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const migratedIncomeInstances = data.income_instances.map((ii: any) => {
        if (needsIncomeInstanceMigration(ii)) {
          needsSave = true;
          return migrateIncomeInstance(ii);
        }
        return ii as IncomeInstance;
      });

      // Ensure occurrences are never empty
      // Exception: payoff bills for track_payments_manually cards should start with zero occurrences
      const fallbackDate = `${month}-01`;
      const normalizedBillInstances = migratedBillInstances.map((instance) => {
        // Skip fallback for payoff bills - they intentionally have zero occurrences
        // (user adds payments manually for track_payments_manually cards)
        if (instance.is_payoff_bill) {
          return instance;
        }
        const ensured = ensureOccurrenceFallback(instance.occurrences, fallbackDate, 0);
        if (ensured !== instance.occurrences) {
          needsSave = true;
          return {
            ...instance,
            occurrences: ensured,
            occurrence_count: ensured.length,
            expected_amount:
              instance.expected_amount === 0 && ensured.length === 1
                ? ensured[0].expected_amount
                : instance.expected_amount,
            is_closed: instance.is_closed && areAllOccurrencesClosed(ensured),
          };
        }
        return instance;
      });
      const normalizedIncomeInstances = migratedIncomeInstances.map((instance) => {
        const ensured = ensureOccurrenceFallback(instance.occurrences, fallbackDate, 0);
        if (ensured !== instance.occurrences) {
          needsSave = true;
          return {
            ...instance,
            occurrences: ensured,
            occurrence_count: ensured.length,
            expected_amount:
              instance.expected_amount === 0 && ensured.length === 1
                ? ensured[0].expected_amount
                : instance.expected_amount,
            is_closed: instance.is_closed && areAllOccurrencesClosed(ensured),
          };
        }
        return instance;
      });

      // Update data with migrated instances
      data.bill_instances = normalizedBillInstances;
      data.income_instances = normalizedIncomeInstances;

      // Persist migrated data if changes were made
      if (needsSave) {
        await this.storage.writeJSON(`data/months/${month}.json`, data);
        console.log(`[MonthsService] Migrated instances for ${month} to new schema`);
      }

      // Clean up any virtual entries that were accidentally persisted (bug fix)
      // Virtual entries should never be in the JSON file - they are generated on-the-fly
      const persistedVirtualBills = data.bill_instances.filter((bi) => bi.is_virtual);
      const persistedVirtualIncomes = data.income_instances.filter((ii) => ii.is_virtual);
      if (persistedVirtualBills.length > 0 || persistedVirtualIncomes.length > 0) {
        console.log(
          `[MonthsService] Cleaning up ${persistedVirtualBills.length} virtual bills and ` +
            `${persistedVirtualIncomes.length} virtual incomes from ${month}`
        );
        data.bill_instances = data.bill_instances.filter((bi) => !bi.is_virtual);
        data.income_instances = data.income_instances.filter((ii) => !ii.is_virtual);
        // Save cleaned data
        await this.storage.writeJSON(`data/months/${month}.json`, data);
      }

      // Inject virtual insurance entries (not persisted, generated on-the-fly)
      const virtualEntries = await this.generateVirtualInsuranceEntries(month);
      if (virtualEntries.billInstances.length > 0 || virtualEntries.incomeInstances.length > 0) {
        data.bill_instances = [...data.bill_instances, ...virtualEntries.billInstances];
        data.income_instances = [...data.income_instances, ...virtualEntries.incomeInstances];
      }

      return data;
    } catch (error) {
      console.error('[MonthsService] Failed to load monthly data:', error);
      return null;
    }
  }

  /**
   * Load all month files in parallel and return full MonthlyData objects.
   * This avoids the N+1 read pattern where callers would call getAllMonths()
   * (which reads every file) and then re-read each file individually.
   */
  public async getAllMonthlyData(): Promise<MonthlyData[]> {
    try {
      const files = await this.storage.listFiles('data/months');

      const months = files
        .filter((f) => f.endsWith('.json') && f !== '.gitkeep')
        .map((f) => f.replace('.json', ''));

      // Read all month files in parallel instead of sequentially
      const results = await Promise.all(months.map((month) => this.getMonthlyData(month)));

      return results.filter((data): data is MonthlyData => data !== null);
    } catch (error) {
      console.error('[MonthsService] Failed to get all monthly data:', error);
      return [];
    }
  }

  public async getAllMonths(): Promise<MonthSummary[]> {
    try {
      // Load all month data in parallel (single pass)
      const allData = await this.getAllMonthlyData();

      // Load payment sources once for all months
      const paymentSources = await this.paymentSourcesService.getAll();

      const summaries: MonthSummary[] = allData.map((data) => {
        // Use unified leftover calculation
        const leftoverResult = calculateUnifiedLeftover(data, paymentSources);

        // Legacy totals for backward compatibility
        const totalIncome = data.income_instances.reduce((sum, i) => sum + i.expected_amount, 0);
        const totalBills = data.bill_instances.reduce((sum, b) => sum + b.expected_amount, 0);
        const totalExpenses = data.variable_expenses.reduce((sum, e) => sum + e.amount, 0);

        return {
          month: data.month,
          exists: true,
          is_read_only: data.is_read_only ?? false,
          created_at: data.created_at,
          updated_at: data.updated_at,
          // Unified leftover fields
          leftover: leftoverResult.leftover,
          isValid: leftoverResult.isValid,
          errorMessage: leftoverResult.errorMessage,
          bankBalances: leftoverResult.bankBalances,
          remainingIncome: leftoverResult.remainingIncome,
          remainingExpenses: leftoverResult.remainingExpenses,
          // Legacy fields (deprecated)
          total_income: totalIncome,
          total_bills: totalBills,
          total_expenses: totalExpenses,
        };
      });

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

        // Generate occurrences for this bill in this month
        const occurrences = generateBillOccurrences(bill, month);

        // Calculate expected_amount as sum of all occurrence amounts
        const expectedAmount = sumOccurrenceExpectedAmounts(occurrences);

        billInstances.push({
          id: crypto.randomUUID(),
          bill_id: bill.id,
          month,
          billing_period: bill.billing_period,
          expected_amount: expectedAmount,
          occurrences,
          is_default: true,
          is_closed: false,
          is_adhoc: false,
          metadata: bill.metadata, // Copy metadata as point-in-time snapshot
          created_at: now,
          updated_at: now,
        });
      }

      // Generate payoff bills when balances are provided (see updateBankBalances)
      const paymentSources = await this.paymentSourcesService.getAll();
      const payOffMonthlySources = paymentSources.filter(
        (ps) => ps.pay_off_monthly === true && ps.is_active
      );

      if (payOffMonthlySources.length > 0) {
        console.log(
          `[MonthsService] Skipping payoff bill generation for ${month} until balances are entered`
        );
      }

      // Generate payoff bills for track_payments_manually cards immediately (with zero occurrences)
      const manualTrackSources = paymentSources.filter(
        (ps) => ps.track_payments_manually === true && ps.is_active
      );

      if (manualTrackSources.length > 0) {
        const payoffCategory = await this.categoriesService.ensurePayoffCategory();

        for (const source of manualTrackSources) {
          billInstances.push({
            id: crypto.randomUUID(),
            bill_id: null,
            month,
            billing_period: 'monthly',
            expected_amount: 0, // No pre-calculated amount
            occurrences: [], // Zero occurrences - user adds payments manually
            is_default: true,
            is_closed: false,
            is_adhoc: false,
            is_payoff_bill: true,
            payoff_source_id: source.id,
            name: `${source.name} Payments`,
            category_id: payoffCategory.id,
            payment_source_id: source.id,
            created_at: now,
            updated_at: now,
          });

          console.log(
            `[MonthsService] Created manual payment tracking bill for ${source.name} in ${month}`
          );
        }
      }

      const incomeInstances: IncomeInstance[] = [];
      for (const income of incomes) {
        if (!income.is_active) continue;

        // Generate occurrences for this income in this month
        const occurrences = generateIncomeOccurrences(income, month);

        // Calculate expected_amount as sum of all occurrence amounts
        const expectedAmount = sumOccurrenceExpectedAmounts(occurrences);

        incomeInstances.push({
          id: crypto.randomUUID(),
          income_id: income.id,
          month,
          billing_period: income.billing_period,
          expected_amount: expectedAmount,
          occurrences,
          is_default: true,
          is_closed: false,
          is_adhoc: false,
          metadata: income.metadata, // Copy metadata as point-in-time snapshot
          created_at: now,
          updated_at: now,
        });
      }

      // Generate todo instances from active todos
      const todoInstances = await this.todoInstancesService.generateInstancesForMonth(month);

      const monthlyData: MonthlyData = {
        month,
        bill_instances: billInstances,
        income_instances: incomeInstances,
        variable_expenses: [],
        free_flowing_expenses: [],
        bank_balances: {},
        todo_instances: todoInstances,
        is_read_only: false,
        created_at: now,
        updated_at: now,
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
      const existingBillIds = new Set(existingData.bill_instances.map((bi) => bi.bill_id));
      const newBillInstances: BillInstance[] = [];

      for (const bill of bills) {
        if (!bill.is_active) continue;
        if (existingBillIds.has(bill.id)) continue; // Already exists

        // Generate occurrences for this bill in this month
        const occurrences = generateBillOccurrences(bill, month);

        // Calculate expected_amount as sum of all occurrence amounts
        const expectedAmount = sumOccurrenceExpectedAmounts(occurrences);

        newBillInstances.push({
          id: crypto.randomUUID(),
          bill_id: bill.id,
          month,
          billing_period: bill.billing_period,
          expected_amount: expectedAmount,
          occurrences,
          is_default: true,
          is_closed: false,
          is_adhoc: false,
          created_at: now,
          updated_at: now,
        });
      }

      // Sync payoff bills for pay_off_monthly payment sources
      const paymentSources = await this.paymentSourcesService.getAll();
      const payOffMonthlySources = paymentSources.filter(
        (ps) => ps.pay_off_monthly === true && ps.is_active
      );

      // Find existing payoff bills by their payoff_source_id
      const existingPayoffSourceIds = new Set(
        existingData.bill_instances
          .filter((bi) => bi.is_payoff_bill === true && bi.payoff_source_id)
          .map((bi) => bi.payoff_source_id)
      );

      // Create payoff bills for sources that don't have one yet
      const newPayoffSources = payOffMonthlySources.filter(
        (ps) => !existingPayoffSourceIds.has(ps.id)
      );

      if (newPayoffSources.length > 0) {
        console.log(
          `[MonthsService] Skipping payoff bill sync for ${month} until balances are entered`
        );
      }

      // Sync payoff bills for track_payments_manually payment sources
      const manualTrackSources = paymentSources.filter(
        (ps) => ps.track_payments_manually === true && ps.is_active
      );

      // Create payoff bills for manual-track sources that don't have one yet
      const newManualTrackSources = manualTrackSources.filter(
        (ps) => !existingPayoffSourceIds.has(ps.id)
      );

      if (newManualTrackSources.length > 0) {
        const payoffCategory = await this.categoriesService.ensurePayoffCategory();

        for (const source of newManualTrackSources) {
          newBillInstances.push({
            id: crypto.randomUUID(),
            bill_id: null,
            month,
            billing_period: 'monthly',
            expected_amount: 0, // No pre-calculated amount
            occurrences: [], // Zero occurrences - user adds payments manually
            is_default: true,
            is_closed: false,
            is_adhoc: false,
            is_payoff_bill: true,
            payoff_source_id: source.id,
            name: `${source.name} Payments`,
            category_id: payoffCategory.id,
            payment_source_id: source.id,
            created_at: now,
            updated_at: now,
          });

          console.log(
            `[MonthsService] Created manual payment tracking bill for ${source.name} in ${month}`
          );
        }
      }

      // Find incomes that don't have instances yet
      const existingIncomeIds = new Set(existingData.income_instances.map((ii) => ii.income_id));
      const newIncomeInstances: IncomeInstance[] = [];

      for (const income of incomes) {
        if (!income.is_active) continue;
        if (existingIncomeIds.has(income.id)) continue; // Already exists

        // Generate occurrences for this income in this month
        const occurrences = generateIncomeOccurrences(income, month);

        // Calculate expected_amount as sum of all occurrence amounts
        const expectedAmount = sumOccurrenceExpectedAmounts(occurrences);

        newIncomeInstances.push({
          id: crypto.randomUUID(),
          income_id: income.id,
          month,
          billing_period: income.billing_period,
          expected_amount: expectedAmount,
          occurrences,
          is_default: true,
          is_closed: false,
          is_adhoc: false,
          created_at: now,
          updated_at: now,
        });
      }

      // Only update if there are new instances
      if (newBillInstances.length > 0 || newIncomeInstances.length > 0) {
        existingData.bill_instances = [...existingData.bill_instances, ...newBillInstances];
        existingData.income_instances = [...existingData.income_instances, ...newIncomeInstances];
        existingData.updated_at = now;

        await this.saveMonthlyData(month, existingData);
        console.log(
          `[MonthsService] Added ${newBillInstances.length} bills, ${newIncomeInstances.length} incomes to ${month}`
        );
      }

      // Sync todo instances (adds missing instances without overwriting existing ones)
      await this.todoInstancesService.syncInstancesForMonth(month);

      // Re-fetch after todo sync to get the updated data
      const updatedData = await this.getMonthlyData(month);
      return updatedData || existingData;
    } catch (error) {
      console.error('[MonthsService] Failed to sync monthly data:', error);
      throw error;
    }
  }

  /**
   * Sync metadata from source bills/incomes to existing month instances.
   * This updates metadata without regenerating the month or losing payment data.
   */
  public async syncMetadata(month: string): Promise<MonthlyData> {
    console.log(`[MonthsService] Syncing metadata for ${month}`);

    try {
      const data = await this.getMonthlyData(month);

      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const bills = await this.billsService.getAll();
      const incomes = await this.incomesService.getAll();

      // Create lookup maps for quick access
      const billMap = new Map(bills.map((b) => [b.id, b]));
      const incomeMap = new Map(incomes.map((i) => [i.id, i]));

      const now = new Date().toISOString();
      let updated = false;

      // Update bill instances with source metadata
      for (let i = 0; i < data.bill_instances.length; i++) {
        const bi = data.bill_instances[i];
        if (bi.bill_id) {
          const sourceBill = billMap.get(bi.bill_id);
          if (sourceBill) {
            // Only update if metadata has changed
            const currentMeta = JSON.stringify(bi.metadata ?? null);
            const sourceMeta = JSON.stringify(sourceBill.metadata ?? null);
            if (currentMeta !== sourceMeta) {
              data.bill_instances[i] = {
                ...bi,
                metadata: sourceBill.metadata,
                updated_at: now,
              };
              updated = true;
            }
          }
        }
      }

      // Update income instances with source metadata
      for (let i = 0; i < data.income_instances.length; i++) {
        const ii = data.income_instances[i];
        if (ii.income_id) {
          const sourceIncome = incomeMap.get(ii.income_id);
          if (sourceIncome) {
            // Only update if metadata has changed
            const currentMeta = JSON.stringify(ii.metadata ?? null);
            const sourceMeta = JSON.stringify(sourceIncome.metadata ?? null);
            if (currentMeta !== sourceMeta) {
              data.income_instances[i] = {
                ...ii,
                metadata: sourceIncome.metadata,
                updated_at: now,
              };
              updated = true;
            }
          }
        }
      }

      if (updated) {
        data.updated_at = now;
        await this.saveMonthlyData(month, data);
        console.log(`[MonthsService] Metadata synced for ${month}`);
      } else {
        console.log(`[MonthsService] No metadata changes for ${month}`);
      }

      return data;
    } catch (error) {
      console.error('[MonthsService] Failed to sync metadata:', error);
      throw error;
    }
  }

  public async updateBankBalances(
    month: string,
    balances: Record<string, number>
  ): Promise<MonthlyData> {
    try {
      const data = await this.getMonthlyData(month);

      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const now = new Date().toISOString();

      // Update bank balances
      data.bank_balances = balances;
      data.updated_at = now;

      // Also update payoff bills' expected_amount when their source's balance changes
      // Create payoff bills for pay_off_monthly sources when balances are provided
      const paymentSources = await this.paymentSourcesService.getAll();
      const payoffSources = paymentSources.filter(
        (ps) => ps.pay_off_monthly === true && ps.is_active
      );
      const payoffCategory = payoffSources.length
        ? await this.categoriesService.ensurePayoffCategory()
        : null;

      for (let i = 0; i < data.bill_instances.length; i++) {
        const bi = data.bill_instances[i];
        if (bi.is_payoff_bill && bi.payoff_source_id) {
          const newBalance = balances[bi.payoff_source_id];
          if (newBalance !== undefined) {
            // NEW: Occurrence-based reconciliation for payoff bills
            // The newBalance IS the current remaining debt on the card.
            // Closed occurrences are historical payment records - we don't subtract them
            // because the bank balance already reflects those payments.
            const remaining = Math.abs(newBalance);

            // Find the open occurrence (should be at most one)
            const openOccurrenceIndex = bi.occurrences.findIndex((o) => !o.is_closed);

            if (remaining > 0) {
              // Update or create the open occurrence for remaining amount
              if (openOccurrenceIndex !== -1) {
                bi.occurrences[openOccurrenceIndex].expected_amount = remaining;
                bi.occurrences[openOccurrenceIndex].updated_at = now;
              } else {
                // Create a new open occurrence for the remaining amount
                const nextSequence = Math.max(0, ...bi.occurrences.map((o) => o.sequence)) + 1;
                const remainingOccurrence: Occurrence = {
                  id: crypto.randomUUID(),
                  sequence: nextSequence,
                  expected_date: `${month}-28`,
                  expected_amount: remaining,
                  is_closed: false,
                  is_adhoc: false,
                  created_at: now,
                  updated_at: now,
                };
                bi.occurrences.push(remainingOccurrence);
              }
              bi.is_closed = false;
              bi.closed_date = undefined;
            } else {
              // Remaining is 0 - close any open occurrence and the instance
              if (openOccurrenceIndex !== -1) {
                bi.occurrences[openOccurrenceIndex].expected_amount = 0;
                bi.occurrences[openOccurrenceIndex].is_closed = true;
                bi.occurrences[openOccurrenceIndex].closed_date = new Date()
                  .toISOString()
                  .split('T')[0];
                bi.occurrences[openOccurrenceIndex].updated_at = now;
              }
              bi.is_closed = true;
              bi.closed_date = bi.closed_date || new Date().toISOString().split('T')[0];
            }

            // Resequence occurrences
            bi.occurrences = resequenceOccurrences(bi.occurrences);

            data.bill_instances[i] = {
              ...bi,
              expected_amount: remaining, // Total remaining = card balance
              updated_at: now,
            };

            console.log(
              `[MonthsService] Reconciled payoff bill ${bi.id}: remaining=$${(remaining / 100).toFixed(2)}`
            );
          }
        }
      }

      if (payoffSources.length > 0 && payoffCategory) {
        const existingPayoffSourceIds = new Set(
          data.bill_instances
            .filter((bi) => bi.is_payoff_bill === true && bi.payoff_source_id)
            .map((bi) => bi.payoff_source_id)
        );

        for (const source of payoffSources) {
          const newBalance = balances[source.id];
          if (newBalance === undefined) continue;
          if (existingPayoffSourceIds.has(source.id)) continue;

          const expectedAmount = Math.abs(newBalance);
          const payoffOccurrence: Occurrence = {
            id: crypto.randomUUID(),
            sequence: 1,
            expected_date: `${month}-28`,
            expected_amount: expectedAmount,
            is_closed: false,
            is_adhoc: false,
            created_at: now,
            updated_at: now,
          };

          data.bill_instances.push({
            id: crypto.randomUUID(),
            bill_id: null,
            month,
            billing_period: 'monthly',
            expected_amount: expectedAmount,
            occurrences: [payoffOccurrence],
            is_default: true,
            is_closed: false,
            is_adhoc: false,
            is_payoff_bill: true,
            payoff_source_id: source.id,
            name: `${source.name} Payoff`,
            category_id: payoffCategory.id,
            payment_source_id: source.id,
            created_at: now,
            updated_at: now,
          });

          console.log(
            `[MonthsService] Created payoff bill for ${source.name} in ${month} with ${expectedAmount}`
          );
        }
      }

      await this.saveMonthlyData(month, data);
      return data;
    } catch (error) {
      console.error('[MonthsService] Failed to update bank balances:', error);
      throw error;
    }
  }

  public async updateSavingsBalances(
    month: string,
    start?: Record<string, number>,
    end?: Record<string, number>,
    contributions?: Record<string, number>
  ): Promise<MonthlyData> {
    try {
      const data = await this.getMonthlyData(month);

      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const now = new Date().toISOString();

      // Update savings balances
      if (start !== undefined) {
        data.savings_balances_start = {
          ...(data.savings_balances_start || {}),
          ...start,
        };
      }
      if (end !== undefined) {
        data.savings_balances_end = {
          ...(data.savings_balances_end || {}),
          ...end,
        };
      }
      if (contributions !== undefined) {
        data.savings_contributions = {
          ...(data.savings_contributions || {}),
          ...contributions,
        };
      }
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      console.log(`[MonthsService] Updated savings balances for ${month}`);
      return data;
    } catch (error) {
      console.error('[MonthsService] Failed to update savings balances:', error);
      throw error;
    }
  }

  public async saveMonthlyData(month: string, data: MonthlyData): Promise<void> {
    try {
      // Filter out virtual entries before saving - they are generated on-the-fly from insurance claims
      // and should never be persisted to the JSON file
      const dataToSave: MonthlyData = {
        ...data,
        bill_instances: data.bill_instances.filter((bi) => !bi.is_virtual),
        income_instances: data.income_instances.filter((ii) => !ii.is_virtual),
      };
      await this.storage.writeJSON(`data/months/${month}.json`, dataToSave);
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

  public async updateBillInstance(
    month: string,
    instanceId: string,
    amount: number
  ): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const index = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      data.bill_instances[index] = {
        ...data.bill_instances[index],
        expected_amount: amount,
        is_default: false,
        updated_at: now,
      };
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to update bill instance:', error);
      throw error;
    }
  }

  public async updateIncomeInstance(
    month: string,
    instanceId: string,
    amount: number
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const index = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      data.income_instances[index] = {
        ...data.income_instances[index],
        expected_amount: amount,
        is_default: false,
        updated_at: now,
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

      const index = data.bill_instances.findIndex((bi) => bi.id === instanceId);
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

      // Regenerate occurrences from the bill template
      const occurrences = generateBillOccurrences(bill, month);

      const now = new Date().toISOString();
      data.bill_instances[index] = {
        ...data.bill_instances[index],
        expected_amount: defaultAmount,
        occurrences,
        is_default: true,
        is_closed: false,
        updated_at: now,
      };
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to reset bill instance:', error);
      throw error;
    }
  }

  public async resetIncomeInstance(
    month: string,
    instanceId: string
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const index = data.income_instances.findIndex((ii) => ii.id === instanceId);
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

      // Regenerate occurrences from the income template
      const occurrences = generateIncomeOccurrences(income, month);

      const now = new Date().toISOString();
      data.income_instances[index] = {
        ...data.income_instances[index],
        expected_amount: defaultAmount,
        occurrences,
        is_default: true,
        is_closed: false,
        updated_at: now,
      };
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to reset income instance:', error);
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

      const index = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const today = now.split('T')[0]; // YYYY-MM-DD

      // Close instance and all occurrences
      const updatedOccurrences = (data.bill_instances[index].occurrences || []).map((occ) => ({
        ...occ,
        is_closed: true,
        closed_date: today,
        updated_at: now,
      }));

      data.bill_instances[index] = {
        ...data.bill_instances[index],
        is_closed: true,
        closed_date: today,
        occurrences: updatedOccurrences,
        updated_at: now,
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

      const index = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();

      // Reopen instance and all occurrences
      const updatedOccurrences = (data.bill_instances[index].occurrences || []).map((occ) => ({
        ...occ,
        is_closed: false,
        closed_date: undefined,
        updated_at: now,
      }));

      data.bill_instances[index] = {
        ...data.bill_instances[index],
        is_closed: false,
        closed_date: undefined,
        occurrences: updatedOccurrences,
        updated_at: now,
      };
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to reopen bill instance:', error);
      throw error;
    }
  }

  public async closeIncomeInstance(
    month: string,
    instanceId: string
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const index = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const today = now.split('T')[0]; // YYYY-MM-DD

      // Close instance and all occurrences
      const updatedOccurrences = (data.income_instances[index].occurrences || []).map((occ) => ({
        ...occ,
        is_closed: true,
        closed_date: today,
        updated_at: now,
      }));

      data.income_instances[index] = {
        ...data.income_instances[index],
        is_closed: true,
        closed_date: today,
        occurrences: updatedOccurrences,
        updated_at: now,
      };
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return data.income_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to close income instance:', error);
      throw error;
    }
  }

  public async reopenIncomeInstance(
    month: string,
    instanceId: string
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const index = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();

      // Reopen instance and all occurrences
      const updatedOccurrences = (data.income_instances[index].occurrences || []).map((occ) => ({
        ...occ,
        is_closed: false,
        closed_date: undefined,
        updated_at: now,
      }));

      data.income_instances[index] = {
        ...data.income_instances[index],
        is_closed: false,
        closed_date: undefined,
        occurrences: updatedOccurrences,
        updated_at: now,
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

  public async updateBillExpectedAmount(
    month: string,
    instanceId: string,
    amount: number
  ): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const index = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      data.bill_instances[index] = {
        ...data.bill_instances[index],
        expected_amount: amount,
        is_default: false,
        updated_at: now,
      };
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return data.bill_instances[index];
    } catch (error) {
      console.error('[MonthsService] Failed to update bill expected amount:', error);
      throw error;
    }
  }

  public async updateIncomeExpectedAmount(
    month: string,
    instanceId: string,
    amount: number
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const index = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      data.income_instances[index] = {
        ...data.income_instances[index],
        expected_amount: amount,
        is_default: false,
        updated_at: now,
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

  /**
   * Calculate the previous month string from a given month (YYYY-MM format)
   */
  private getPreviousMonth(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    const prevDate = new Date(year, monthNum - 2); // monthNum - 1 for 0-based, -1 more for previous
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
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
      console.warn(
        `[MonthsService] Creating month ${month} which is not current (${currentMonth}) or next (${nextMonth})`
      );
    }

    try {
      const bills = await this.billsService.getAll();
      const incomes = await this.incomesService.getAll();

      const nowIso = new Date().toISOString();

      // Try to get previous month's end balances to use as this month's start
      const prevMonth = this.getPreviousMonth(month);
      const prevMonthData = await this.getMonthlyData(prevMonth);
      const savingsBalancesStart = prevMonthData?.savings_balances_end || {};

      // Generate bill instances from active bills
      const billInstances: BillInstance[] = [];
      for (const bill of bills) {
        if (!bill.is_active) continue;

        // Generate occurrences for this bill in this month
        const occurrences = generateBillOccurrences(bill, month);

        // Calculate expected_amount as sum of all occurrence amounts
        const expectedAmount = sumOccurrenceExpectedAmounts(occurrences);

        billInstances.push({
          id: crypto.randomUUID(),
          bill_id: bill.id,
          month,
          billing_period: bill.billing_period,
          expected_amount: expectedAmount,
          occurrences,
          is_default: true,
          is_closed: false,
          is_adhoc: false,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      // Generate payoff bills for pay_off_monthly payment sources
      const paymentSources = await this.paymentSourcesService.getAll();
      const payOffMonthlySources = paymentSources.filter(
        (ps) => ps.pay_off_monthly === true && ps.is_active
      );

      if (payOffMonthlySources.length > 0) {
        console.log(
          `[MonthsService] Skipping payoff bill generation for ${month} until balances are entered`
        );
      }

      // Generate payoff bills for track_payments_manually cards immediately (with zero occurrences)
      const manualTrackSources = paymentSources.filter(
        (ps) => ps.track_payments_manually === true && ps.is_active
      );

      if (manualTrackSources.length > 0) {
        const payoffCategory = await this.categoriesService.ensurePayoffCategory();

        for (const source of manualTrackSources) {
          billInstances.push({
            id: crypto.randomUUID(),
            bill_id: null,
            month,
            billing_period: 'monthly',
            expected_amount: 0, // No pre-calculated amount
            occurrences: [], // Zero occurrences - user adds payments manually
            is_default: true,
            is_closed: false,
            is_adhoc: false,
            is_payoff_bill: true,
            payoff_source_id: source.id,
            name: `${source.name} Payments`,
            category_id: payoffCategory.id,
            payment_source_id: source.id,
            created_at: nowIso,
            updated_at: nowIso,
          });

          console.log(
            `[MonthsService] Created manual payment tracking bill for ${source.name} in ${month}`
          );
        }
      }

      // Generate income instances from active incomes
      const incomeInstances: IncomeInstance[] = [];
      for (const income of incomes) {
        if (!income.is_active) continue;

        // Generate occurrences for this income in this month
        const occurrences = generateIncomeOccurrences(income, month);

        // Calculate expected_amount as sum of all occurrence amounts
        const expectedAmount = sumOccurrenceExpectedAmounts(occurrences);

        incomeInstances.push({
          id: crypto.randomUUID(),
          income_id: income.id,
          month,
          billing_period: income.billing_period,
          expected_amount: expectedAmount,
          occurrences,
          is_default: true,
          is_closed: false,
          is_adhoc: false,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      // Variable expenses are now created via ad-hoc bills in the Variable Expenses category
      const variableExpenses: VariableExpense[] = [];

      const monthlyData: MonthlyData = {
        month,
        bill_instances: billInstances,
        income_instances: incomeInstances,
        variable_expenses: variableExpenses,
        free_flowing_expenses: [],
        bank_balances: {},
        savings_balances_start: savingsBalancesStart,
        is_read_only: false,
        created_at: nowIso,
        updated_at: nowIso,
      };

      await this.saveMonthlyData(month, monthlyData);
      console.log(
        `[MonthsService] Created month ${month} with ${billInstances.length} bills, ${incomeInstances.length} incomes, ${variableExpenses.length} variable expenses`
      );

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
      console.log(
        `[MonthsService] Month ${month} is now ${data.is_read_only ? 'read-only' : 'editable'}`
      );

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
      const existingMonthSet = new Set(existingMonths.map((m) => m.month));

      // Add current month placeholder if it doesn't exist
      if (!existingMonthSet.has(currentMonth)) {
        existingMonths.push({
          month: currentMonth,
          exists: false,
          is_read_only: false,
          created_at: '',
          updated_at: '',
          // Unified leftover fields (not valid for non-existent months)
          leftover: 0,
          isValid: false,
          errorMessage: 'Month data not yet created',
          bankBalances: 0,
          remainingIncome: 0,
          remainingExpenses: 0,
          // Legacy fields
          total_income: 0,
          total_bills: 0,
          total_expenses: 0,
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
          // Unified leftover fields (not valid for non-existent months)
          leftover: 0,
          isValid: false,
          errorMessage: 'Month data not yet created',
          bankBalances: 0,
          remainingIncome: 0,
          remainingExpenses: 0,
          // Legacy fields
          total_income: 0,
          total_bills: 0,
          total_expenses: 0,
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

  // ============================================================================
  // Occurrence Methods Implementation
  // ============================================================================

  public async updateBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    updates: { expected_date?: string; expected_amount?: number; notes?: string | null }
  ): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.bill_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      const now = new Date().toISOString();

      // Update the occurrence
      instance.occurrences[occIndex] = {
        ...instance.occurrences[occIndex],
        expected_date: updates.expected_date ?? instance.occurrences[occIndex].expected_date,
        expected_amount: updates.expected_amount ?? instance.occurrences[occIndex].expected_amount,
        notes:
          updates.notes === null
            ? undefined
            : (updates.notes ?? instance.occurrences[occIndex].notes),
        updated_at: now,
      };

      // Resequence occurrences by date
      instance.occurrences = resequenceOccurrences(instance.occurrences);

      // Update instance totals
      instance.expected_amount = sumOccurrenceExpectedAmounts(instance.occurrences);
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      instance.updated_at = now;

      data.bill_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to update bill occurrence:', error);
      throw error;
    }
  }

  public async updateIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    updates: { expected_date?: string; expected_amount?: number; notes?: string | null }
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.income_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      const now = new Date().toISOString();

      // Update the occurrence
      instance.occurrences[occIndex] = {
        ...instance.occurrences[occIndex],
        expected_date: updates.expected_date ?? instance.occurrences[occIndex].expected_date,
        expected_amount: updates.expected_amount ?? instance.occurrences[occIndex].expected_amount,
        notes:
          updates.notes === null
            ? undefined
            : (updates.notes ?? instance.occurrences[occIndex].notes),
        updated_at: now,
      };

      // Resequence occurrences by date
      instance.occurrences = resequenceOccurrences(instance.occurrences);

      // Update instance totals
      instance.expected_amount = sumOccurrenceExpectedAmounts(instance.occurrences);
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      instance.updated_at = now;

      data.income_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to update income occurrence:', error);
      throw error;
    }
  }

  public async closeBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    details?: { closed_date?: string; notes?: string; payment_source_id?: string }
  ): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.bill_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const closedDate = details?.closed_date ?? today;
      const notes = details?.notes?.trim() || undefined;
      const paymentSourceId = details?.payment_source_id || undefined;

      instance.occurrences[occIndex] = {
        ...instance.occurrences[occIndex],
        is_closed: true,
        closed_date: closedDate,
        notes,
        payment_source_id: paymentSourceId,
        updated_at: now,
      };

      // Update instance-level is_closed if all occurrences are closed
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      if (instance.is_closed) {
        instance.closed_date = closedDate;
      }
      instance.updated_at = now;

      data.bill_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to close bill occurrence:', error);
      throw error;
    }
  }

  public async reopenBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string
  ): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.bill_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      const now = new Date().toISOString();

      instance.occurrences[occIndex] = {
        ...instance.occurrences[occIndex],
        is_closed: false,
        closed_date: undefined,
        updated_at: now,
      };

      // Update instance-level is_closed (now false since one is open)
      instance.is_closed = false;
      instance.closed_date = undefined;
      instance.updated_at = now;

      data.bill_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to reopen bill occurrence:', error);
      throw error;
    }
  }

  public async closeIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    details?: { closed_date?: string; notes?: string; payment_source_id?: string }
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.income_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const closedDate = details?.closed_date ?? today;
      const notes = details?.notes?.trim() || undefined;
      const paymentSourceId = details?.payment_source_id || undefined;

      instance.occurrences[occIndex] = {
        ...instance.occurrences[occIndex],
        is_closed: true,
        closed_date: closedDate,
        notes,
        payment_source_id: paymentSourceId,
        updated_at: now,
      };

      // Update instance-level is_closed if all occurrences are closed
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      if (instance.is_closed) {
        instance.closed_date = closedDate;
      }
      instance.updated_at = now;

      data.income_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to close income occurrence:', error);
      throw error;
    }
  }

  public async reopenIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.income_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      const now = new Date().toISOString();

      instance.occurrences[occIndex] = {
        ...instance.occurrences[occIndex],
        is_closed: false,
        closed_date: undefined,
        updated_at: now,
      };

      // Update instance-level is_closed (now false since one is open)
      instance.is_closed = false;
      instance.closed_date = undefined;
      instance.updated_at = now;

      data.income_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to reopen income occurrence:', error);
      throw error;
    }
  }

  public async addBillAdhocOccurrence(
    month: string,
    instanceId: string,
    occurrence: { expected_date: string; expected_amount: number }
  ): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.bill_instances[instanceIndex];
      const now = new Date().toISOString();

      const newOccurrence = createAdhocOccurrence(
        occurrence.expected_date,
        occurrence.expected_amount
      );
      instance.occurrences.push(newOccurrence);

      // Resequence and update totals
      instance.occurrences = resequenceOccurrences(instance.occurrences);
      instance.expected_amount = sumOccurrenceExpectedAmounts(instance.occurrences);
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      instance.updated_at = now;

      data.bill_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to add bill ad-hoc occurrence:', error);
      throw error;
    }
  }

  public async addIncomeAdhocOccurrence(
    month: string,
    instanceId: string,
    occurrence: { expected_date: string; expected_amount: number }
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.income_instances[instanceIndex];
      const now = new Date().toISOString();

      const newOccurrence = createAdhocOccurrence(
        occurrence.expected_date,
        occurrence.expected_amount
      );
      instance.occurrences.push(newOccurrence);

      // Resequence and update totals
      instance.occurrences = resequenceOccurrences(instance.occurrences);
      instance.expected_amount = sumOccurrenceExpectedAmounts(instance.occurrences);
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      instance.updated_at = now;

      data.income_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to add income ad-hoc occurrence:', error);
      throw error;
    }
  }

  public async removeBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string
  ): Promise<BillInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.bill_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      // Only allow removing ad-hoc occurrences OR occurrences from payoff bills
      if (!instance.occurrences[occIndex].is_adhoc && !instance.is_payoff_bill) {
        throw new Error('Can only remove ad-hoc occurrences');
      }

      const now = new Date().toISOString();

      instance.occurrences.splice(occIndex, 1);

      // Resequence and update totals
      instance.occurrences = resequenceOccurrences(instance.occurrences);
      instance.expected_amount = sumOccurrenceExpectedAmounts(instance.occurrences);
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      instance.updated_at = now;

      data.bill_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to remove bill occurrence:', error);
      throw error;
    }
  }

  public async removeIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string
  ): Promise<IncomeInstance | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.income_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      // Only allow removing ad-hoc occurrences
      if (!instance.occurrences[occIndex].is_adhoc) {
        throw new Error('Can only remove ad-hoc occurrences');
      }

      const now = new Date().toISOString();

      instance.occurrences.splice(occIndex, 1);

      // Resequence and update totals
      instance.occurrences = resequenceOccurrences(instance.occurrences);
      instance.expected_amount = sumOccurrenceExpectedAmounts(instance.occurrences);
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      instance.updated_at = now;

      data.income_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);
      return instance;
    } catch (error) {
      console.error('[MonthsService] Failed to remove income occurrence:', error);
      throw error;
    }
  }

  // ============================================================================
  // Payoff Bill Methods (occurrence-based CC payment tracking)
  // ============================================================================

  /**
   * Add a payment to a payoff bill by creating a new closed occurrence (payment chunk).
   * This replaces the old payments[] approach for payoff bills specifically.
   *
   * Logic:
   * 1. Create a new closed occurrence with the payment amount
   * 2. Update the CC balance if newBalance is provided, or calculate it
   * 3. Reconcile the open "remaining" occurrence based on balance - closedChunks
   *
   * @param month - Month in YYYY-MM format
   * @param instanceId - The payoff bill instance ID
   * @param amount - Payment amount in cents
   * @param date - Payment date (YYYY-MM-DD)
   * @param newBalance - Optional new CC balance (if user overrides auto-calculation)
   * @returns Updated instance, new balance, and remaining amount
   */
  public async addPayoffBillPayment(
    month: string,
    instanceId: string,
    amount: number,
    date: string,
    newBalance?: number
  ): Promise<{ instance: BillInstance; newBalance: number; remaining: number } | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.bill_instances[instanceIndex];

      // Validate this is a payoff bill
      if (!instance.is_payoff_bill || !instance.payoff_source_id) {
        console.error(`[MonthsService] Instance ${instanceId} is not a payoff bill`);
        return null;
      }

      const now = new Date().toISOString();

      // Get current balance for this payment source
      const currentBalance = data.bank_balances?.[instance.payoff_source_id] ?? 0;

      // Calculate new balance if not provided
      // CC balances are stored as negative, so adding payment (positive) decreases debt
      // If current = -200000 (-$2000), payment = 100 ($1), new = -199900 (-$1999)
      const calculatedNewBalance =
        newBalance !== undefined ? -Math.abs(newBalance) : currentBalance + amount;

      // The new balance (remaining debt) - always positive for display
      const newBalanceAbs = Math.abs(calculatedNewBalance);

      // Find the current open occurrence (at most one)
      const openOccurrenceIndex = instance.occurrences.findIndex((o) => !o.is_closed);

      if (openOccurrenceIndex !== -1) {
        // CLOSE the existing open occurrence and set its amount to the payment
        // This occurrence now represents this payment in the history
        const openOcc = instance.occurrences[openOccurrenceIndex];
        openOcc.expected_amount = amount; // This occurrence now represents the payment
        openOcc.is_closed = true;
        openOcc.closed_date = date;
        openOcc.updated_at = now;
        // Keep original sequence number - it stays where it is in history
      } else {
        // No open occurrence exists - create a closed one for the payment record
        const nextSequence = Math.max(0, ...instance.occurrences.map((o) => o.sequence)) + 1;
        const paymentOccurrence: Occurrence = {
          id: crypto.randomUUID(),
          sequence: nextSequence,
          expected_date: date,
          expected_amount: amount,
          is_closed: true,
          closed_date: date,
          is_adhoc: true,
          created_at: now,
          updated_at: now,
        };
        instance.occurrences.push(paymentOccurrence);
      }

      // Calculate remaining amount
      const remaining = newBalanceAbs;

      if (remaining > 0) {
        // Create NEW open occurrence for remaining balance
        const nextSequence = Math.max(0, ...instance.occurrences.map((o) => o.sequence)) + 1;
        const remainingOccurrence: Occurrence = {
          id: crypto.randomUUID(),
          sequence: nextSequence,
          expected_date: `${month}-28`, // Default to 28th for payoff bills
          expected_amount: remaining,
          is_closed: false,
          is_adhoc: false,
          created_at: now,
          updated_at: now,
        };
        instance.occurrences.push(remainingOccurrence);
        instance.is_closed = false;
        instance.closed_date = undefined;
      } else {
        // Balance is 0 - payoff bill is complete, close it
        instance.is_closed = true;
        instance.closed_date = date;
      }

      // Resequence occurrences and update instance totals
      instance.occurrences = resequenceOccurrences(instance.occurrences);
      instance.expected_amount = newBalanceAbs; // Total owed = card balance
      instance.updated_at = now;

      data.bill_instances[instanceIndex] = instance;

      // Update the bank balance for this payment source
      if (!data.bank_balances) {
        data.bank_balances = {};
      }
      data.bank_balances[instance.payoff_source_id] = calculatedNewBalance;
      data.updated_at = now;

      console.log(
        `[MonthsService] Added payoff payment: $${(amount / 100).toFixed(2)} to ${instance.name}, ` +
          `new balance: $${(calculatedNewBalance / 100).toFixed(2)}, remaining: $${(remaining / 100).toFixed(2)}`
      );

      await this.saveMonthlyData(month, data);

      return {
        instance,
        newBalance: calculatedNewBalance,
        remaining,
      };
    } catch (error) {
      console.error('[MonthsService] Failed to add payoff bill payment:', error);
      throw error;
    }
  }

  // ============================================================================
  // Split Occurrence Methods (for partial payments)
  // ============================================================================

  public async splitBillOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    details: {
      paid_amount: number;
      closed_date: string;
      payment_source_id?: string;
      notes?: string;
    }
  ): Promise<{ closedOccurrence: Occurrence; newOccurrence: Occurrence } | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.bill_instances.findIndex((bi) => bi.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.bill_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      const occurrence = instance.occurrences[occIndex];

      // Validation
      if (occurrence.is_closed) {
        throw new Error('Cannot split an already closed occurrence');
      }
      if (details.paid_amount <= 0) {
        throw new Error('Paid amount must be greater than 0');
      }
      if (details.paid_amount >= occurrence.expected_amount) {
        throw new Error('Paid amount must be less than expected amount');
      }

      const now = new Date().toISOString();
      const remainingAmount = occurrence.expected_amount - details.paid_amount;

      // Calculate end of month for new occurrence
      const [year, monthNum] = month.split('-').map(Number);
      const endOfMonth = new Date(year, monthNum, 0).getDate();
      const newExpectedDate = `${month}-${String(endOfMonth).padStart(2, '0')}`;

      // Get next sequence number
      const maxSequence = Math.max(...instance.occurrences.map((o) => o.sequence));
      const nextSequence = maxSequence + 1;

      // Update original occurrence: reduce amount and close it
      const closedOccurrence: Occurrence = {
        ...occurrence,
        expected_amount: details.paid_amount,
        is_closed: true,
        closed_date: details.closed_date,
        payment_source_id: details.payment_source_id,
        notes: details.notes?.trim() || undefined,
        updated_at: now,
      };

      // Create new occurrence for remainder
      const newOccurrence: Occurrence = {
        id: crypto.randomUUID(),
        sequence: nextSequence,
        expected_date: newExpectedDate,
        expected_amount: remainingAmount,
        is_closed: false,
        is_adhoc: true,
        created_at: now,
        updated_at: now,
      };

      // Update occurrences array
      instance.occurrences[occIndex] = closedOccurrence;
      instance.occurrences.push(newOccurrence);

      // Update instance-level is_closed (not all occurrences are closed now)
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      instance.updated_at = now;

      data.bill_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);

      console.log(
        `[MonthsService] Split bill occurrence: paid $${(details.paid_amount / 100).toFixed(2)}, ` +
          `remaining $${(remainingAmount / 100).toFixed(2)}`
      );

      return { closedOccurrence, newOccurrence };
    } catch (error) {
      console.error('[MonthsService] Failed to split bill occurrence:', error);
      throw error;
    }
  }

  public async splitIncomeOccurrence(
    month: string,
    instanceId: string,
    occurrenceId: string,
    details: {
      paid_amount: number;
      closed_date: string;
      payment_source_id?: string;
      notes?: string;
    }
  ): Promise<{ closedOccurrence: Occurrence; newOccurrence: Occurrence } | null> {
    try {
      const data = await this.getMonthlyData(month);
      if (!data) throw new Error(`Monthly data for ${month} not found`);

      const instanceIndex = data.income_instances.findIndex((ii) => ii.id === instanceId);
      if (instanceIndex === -1) return null;

      const instance = data.income_instances[instanceIndex];
      const occIndex = instance.occurrences.findIndex((o) => o.id === occurrenceId);
      if (occIndex === -1) return null;

      const occurrence = instance.occurrences[occIndex];

      // Validation
      if (occurrence.is_closed) {
        throw new Error('Cannot split an already closed occurrence');
      }
      if (details.paid_amount <= 0) {
        throw new Error('Paid amount must be greater than 0');
      }
      if (details.paid_amount >= occurrence.expected_amount) {
        throw new Error('Paid amount must be less than expected amount');
      }

      const now = new Date().toISOString();
      const remainingAmount = occurrence.expected_amount - details.paid_amount;

      // Calculate end of month for new occurrence
      const [year, monthNum] = month.split('-').map(Number);
      const endOfMonth = new Date(year, monthNum, 0).getDate();
      const newExpectedDate = `${month}-${String(endOfMonth).padStart(2, '0')}`;

      // Get next sequence number
      const maxSequence = Math.max(...instance.occurrences.map((o) => o.sequence));
      const nextSequence = maxSequence + 1;

      // Update original occurrence: reduce amount and close it
      const closedOccurrence: Occurrence = {
        ...occurrence,
        expected_amount: details.paid_amount,
        is_closed: true,
        closed_date: details.closed_date,
        payment_source_id: details.payment_source_id,
        notes: details.notes?.trim() || undefined,
        updated_at: now,
      };

      // Create new occurrence for remainder
      const newOccurrence: Occurrence = {
        id: crypto.randomUUID(),
        sequence: nextSequence,
        expected_date: newExpectedDate,
        expected_amount: remainingAmount,
        is_closed: false,
        is_adhoc: true,
        created_at: now,
        updated_at: now,
      };

      // Update occurrences array
      instance.occurrences[occIndex] = closedOccurrence;
      instance.occurrences.push(newOccurrence);

      // Update instance-level is_closed (not all occurrences are closed now)
      instance.is_closed = areAllOccurrencesClosed(instance.occurrences);
      instance.updated_at = now;

      data.income_instances[instanceIndex] = instance;
      data.updated_at = now;

      await this.saveMonthlyData(month, data);

      console.log(
        `[MonthsService] Split income occurrence: received $${(details.paid_amount / 100).toFixed(2)}, ` +
          `remaining $${(remainingAmount / 100).toFixed(2)}`
      );

      return { closedOccurrence, newOccurrence };
    } catch (error) {
      console.error('[MonthsService] Failed to split income occurrence:', error);
      throw error;
    }
  }

  // ============================================================================
  // Virtual Insurance Entry Generation
  // ============================================================================

  /**
   * Generate virtual BillInstance and IncomeInstance entries from insurance claims.
   * These are NOT persisted - they are generated on-the-fly when loading month data.
   *
   * For Expected claims (is_expected: true):
   * - 1 virtual BillInstance: amount = expected_cost
   * - 1 virtual IncomeInstance: amount = expected_reimbursement
   *
   * For Actual claims (is_expected: false):
   * - 1 virtual BillInstance: amount = total_amount
   * - 1 virtual IncomeInstance per claim: with N occurrences (one per submission)
   *
   * Naming convention:
   * - Format: "#{claim_number} {category} - {provider}"
   * - Example: "#1 Dental - Dr. Smith"
   */
  private async generateVirtualInsuranceEntries(month: string): Promise<{
    billInstances: BillInstance[];
    incomeInstances: IncomeInstance[];
  }> {
    try {
      const claims = await this.insuranceClaimsService.getClaimsForMonth(month);
      const billInstances: BillInstance[] = [];
      const incomeInstances: IncomeInstance[] = [];

      for (const claim of claims) {
        // Naming: "#{claim_number} {category} - {provider}" for actual claims
        // For expected claims (claim_number=0), just use "{category} - {provider}"
        const claimPrefix = claim.claim_number > 0 ? `#${claim.claim_number} ` : '';
        const claimLabel = claim.provider_name
          ? `${claimPrefix}${claim.category_name} - ${claim.provider_name}`
          : `${claimPrefix}${claim.category_name}`;

        if (claim.is_expected) {
          // Expected claim: single bill and single reimbursement income
          const expectedCost = claim.expected_cost ?? 0;
          const expectedReimbursement = claim.expected_reimbursement ?? 0;

          // Virtual bill instance for the expected expense
          billInstances.push({
            id: `virtual-bill-${claim.id}`,
            bill_id: null,
            month,
            billing_period: 'monthly',
            expected_amount: expectedCost,
            occurrences: [
              {
                id: `virtual-occ-bill-${claim.id}`,
                sequence: 1,
                expected_date: claim.service_date,
                expected_amount: expectedCost,
                is_closed: false,
                is_adhoc: false,
                created_at: claim.created_at,
                updated_at: claim.updated_at,
              },
            ],
            is_default: false,
            is_closed: false,
            is_adhoc: true,
            is_insurance_expense: true,
            is_expected_claim: true,
            is_virtual: true,
            claim_id: claim.id,
            name: claimLabel,
            category_id: claim.category_id,
            payment_source_id: claim.payment_source_id,
            created_at: claim.created_at,
            updated_at: claim.updated_at,
          });

          // Virtual income instance for the expected reimbursement
          if (expectedReimbursement > 0) {
            incomeInstances.push({
              id: `virtual-income-${claim.id}`,
              income_id: null,
              month,
              billing_period: 'monthly',
              expected_amount: expectedReimbursement,
              occurrences: [
                {
                  id: `virtual-occ-income-${claim.id}`,
                  sequence: 1,
                  expected_date: claim.service_date,
                  expected_amount: expectedReimbursement,
                  is_closed: false,
                  is_adhoc: false,
                  created_at: claim.created_at,
                  updated_at: claim.updated_at,
                  // Occurrence-level linking for navigation
                  claim_id: claim.id,
                },
              ],
              is_default: false,
              is_closed: false,
              is_adhoc: true,
              is_insurance_reimbursement: true,
              is_expected_claim: true,
              is_virtual: true,
              claim_id: claim.id,
              name: claimLabel,
              created_at: claim.created_at,
              updated_at: claim.updated_at,
            });
          }
        } else {
          // Actual claim: bill for total_amount, one income per claim with N occurrences
          // Bill is paid if: explicitly marked as paid, OR claim is in_progress/closed (submission-driven)
          const billIsPaid =
            claim.bill_paid || claim.status === 'in_progress' || claim.status === 'closed';
          const billPaidDate = claim.bill_paid
            ? (claim.bill_paid_date ?? claim.service_date)
            : claim.service_date;

          billInstances.push({
            id: `virtual-bill-${claim.id}`,
            bill_id: null,
            month,
            billing_period: 'monthly',
            expected_amount: claim.total_amount,
            occurrences: [
              {
                id: `virtual-occ-bill-${claim.id}`,
                sequence: 1,
                expected_date: claim.service_date,
                expected_amount: claim.total_amount,
                // Bill is paid once user marks it paid OR we start submitting to insurers
                is_closed: billIsPaid,
                closed_date: billIsPaid ? billPaidDate : undefined,
                is_adhoc: false,
                created_at: claim.created_at,
                updated_at: claim.updated_at,
              },
            ],
            is_default: false,
            // Bill instance is paid once user marks it paid OR we start submitting to insurers
            is_closed: billIsPaid,
            is_adhoc: true,
            is_insurance_expense: true,
            is_expected_claim: false,
            is_virtual: true,
            claim_id: claim.id,
            name: claimLabel,
            category_id: claim.category_id,
            payment_source_id: claim.payment_source_id,
            created_at: claim.created_at,
            updated_at: claim.updated_at,
          });

          // Build occurrences for this claim's submissions
          const submissionOccurrences: Array<{
            id: string;
            sequence: number;
            expected_date: string;
            expected_amount: number;
            is_closed: boolean;
            closed_date?: string;
            is_adhoc: boolean;
            created_at: string;
            updated_at: string;
            plan_name: string;
            claim_id: string;
            claim_submission_id: string;
          }> = [];

          let sequenceCounter = 0;
          for (const submission of claim.submissions) {
            const reimbursedAmount = submission.amount_reimbursed ?? 0;
            const planName = submission.plan_snapshot?.name ?? 'Insurance';
            const isClosed = submission.status === 'approved' || submission.status === 'denied';

            sequenceCounter++;
            submissionOccurrences.push({
              id: `virtual-occ-income-${claim.id}-${submission.id}`,
              sequence: sequenceCounter,
              expected_date:
                submission.date_resolved ?? submission.date_submitted ?? claim.service_date,
              expected_amount: reimbursedAmount,
              is_closed: isClosed,
              closed_date: isClosed ? submission.date_resolved : undefined,
              is_adhoc: false,
              created_at: claim.created_at,
              updated_at: claim.updated_at,
              // Occurrence-level fields for navigation and display
              plan_name: planName,
              claim_id: claim.id,
              claim_submission_id: submission.id,
            });
          }

          // Create income instance for this claim
          // Use actual submission data if any submissions have been resolved,
          // otherwise fall back to expected_reimbursement if available
          const hasAnyResolvedSubmission = claim.submissions.some(
            (s) => s.status === 'approved' || s.status === 'denied'
          );

          if (submissionOccurrences.length > 0 && hasAnyResolvedSubmission) {
            // Use actual submission-based income (existing behavior)
            const totalExpectedAmount = submissionOccurrences.reduce(
              (sum, occ) => sum + occ.expected_amount,
              0
            );
            const allClosed = submissionOccurrences.every((occ) => occ.is_closed);

            incomeInstances.push({
              id: `virtual-income-${claim.id}`,
              income_id: null,
              month,
              billing_period: 'monthly',
              expected_amount: totalExpectedAmount,
              occurrences: submissionOccurrences,
              is_default: false,
              is_closed: allClosed,
              is_adhoc: true,
              is_insurance_reimbursement: true,
              is_expected_claim: false,
              is_virtual: true,
              claim_id: claim.id,
              name: claimLabel,
              created_at: claim.created_at,
              updated_at: claim.updated_at,
            });
          } else if (claim.expected_reimbursement && claim.expected_reimbursement > 0) {
            // No submissions resolved yet - use expected_reimbursement as estimate
            incomeInstances.push({
              id: `virtual-income-${claim.id}`,
              income_id: null,
              month,
              billing_period: 'monthly',
              expected_amount: claim.expected_reimbursement,
              occurrences: [
                {
                  id: `virtual-occ-income-expected-${claim.id}`,
                  sequence: 1,
                  expected_date: claim.service_date,
                  expected_amount: claim.expected_reimbursement,
                  is_closed: false,
                  is_adhoc: false,
                  created_at: claim.created_at,
                  updated_at: claim.updated_at,
                  claim_id: claim.id,
                },
              ],
              is_default: false,
              is_closed: false,
              is_adhoc: true,
              is_insurance_reimbursement: true,
              is_expected_claim: false,
              is_virtual: true,
              claim_id: claim.id,
              name: claimLabel,
              created_at: claim.created_at,
              updated_at: claim.updated_at,
            });
          } else if (submissionOccurrences.length > 0) {
            // Has submissions but none resolved, no expected reimbursement - show submission-based income
            const totalExpectedAmount = submissionOccurrences.reduce(
              (sum, occ) => sum + occ.expected_amount,
              0
            );
            const allClosed = submissionOccurrences.every((occ) => occ.is_closed);

            incomeInstances.push({
              id: `virtual-income-${claim.id}`,
              income_id: null,
              month,
              billing_period: 'monthly',
              expected_amount: totalExpectedAmount,
              occurrences: submissionOccurrences,
              is_default: false,
              is_closed: allClosed,
              is_adhoc: true,
              is_insurance_reimbursement: true,
              is_expected_claim: false,
              is_virtual: true,
              claim_id: claim.id,
              name: claimLabel,
              created_at: claim.created_at,
              updated_at: claim.updated_at,
            });
          }
        }
      }

      return { billInstances, incomeInstances };
    } catch (error) {
      console.error('[MonthsService] Failed to generate virtual insurance entries:', error);
      return { billInstances: [], incomeInstances: [] };
    }
  }
}
