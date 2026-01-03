// Months Store - Manages monthly budget data

import { writable, derived } from 'svelte/store';
import { currentMonth } from './ui';
import { apiUrl } from '$lib/api/client';

// Types for monthly data
export interface BillInstance {
  id: string;
  bill_id: string;
  month: string;
  amount: number;
  is_default: boolean;
  is_paid?: boolean;
  name: string;
  billing_period: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeInstance {
  id: string;
  income_id: string;
  month: string;
  amount: number;
  is_default: boolean;
  is_paid?: boolean;
  name: string;
  billing_period: string;
  created_at: string;
  updated_at: string;
}

export interface VariableExpense {
  id: string;
  month: string;
  name: string;
  amount: number;
  category_id?: string;
  payment_source_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FreeFlowingExpense {
  id: string;
  month: string;
  name: string;
  amount: number;
  category_id?: string;
  payment_source_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LeftoverSummary {
  // Unified leftover fields
  bankBalances: number;        // Current cash position (snapshot)
  remainingIncome: number;     // Income still expected to receive
  remainingExpenses: number;   // Expenses still need to pay
  leftover: number;            // bank + remainingIncome - remainingExpenses
  isValid: boolean;            // False if required bank balances are missing
  missingBalances?: string[];  // IDs of payment sources missing balances
  errorMessage?: string;       // Human-readable error message
  // Legacy fields (deprecated)
  totalCash: number;
  totalCreditDebt: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface MonthlyData {
  month: string;
  bill_instances: BillInstance[];
  income_instances: IncomeInstance[];
  variable_expenses: VariableExpense[];
  free_flowing_expenses: FreeFlowingExpense[];
  bank_balances: Record<string, number>;
  summary: LeftoverSummary;
  created_at: string;
  updated_at: string;
}

// Store state
interface MonthsState {
  data: MonthlyData | null;
  loading: boolean;
  error: string | null;
  exists: boolean;
  isReadOnly: boolean;
}

const initialState: MonthsState = {
  data: null,
  loading: false,
  error: null,
  exists: false,
  isReadOnly: false
};

// Create the store
function createMonthsStore() {
  const { subscribe, set, update } = writable<MonthsState>(initialState);

  return {
    subscribe,

    async loadMonth(month: string): Promise<void> {
      update(state => ({ ...state, loading: true, error: null, exists: false, isReadOnly: false }));

      try {
        // Try to load existing month data
        const response = await fetch(apiUrl(`/api/months/${month}`));
        
        if (response.status === 404) {
          // Month doesn't exist - don't auto-generate, let user decide
          update(state => ({
            ...state,
            data: null,
            exists: false,
            isReadOnly: false,
            loading: false
          }));
        } else if (!response.ok) {
          throw new Error('Failed to load monthly data');
        } else {
          // Month exists - load directly without syncing
          // Sync is now only triggered explicitly (e.g., when creating month or via sync button)
          // This prevents deleted instances from being re-added on refresh
          const data = await response.json();
          update(state => ({
            ...state,
            data: data as MonthlyData,
            exists: true,
            isReadOnly: data.is_read_only ?? false,
            loading: false
          }));
        }
      } catch (error) {
        update(state => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    },

    // Explicit sync method - adds any new bills/incomes that were created after the month was generated
    // Note: This will re-add any instances that were manually deleted if their bill/income entity still exists
    async syncMonth(month: string): Promise<boolean> {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const syncResponse = await fetch(apiUrl(`/api/months/${month}/sync`), {
          method: 'POST'
        });

        if (!syncResponse.ok) {
          throw new Error('Failed to sync monthly data');
        }

        const data = await syncResponse.json();
        update(state => ({
          ...state,
          data: data as MonthlyData,
          exists: true,
          isReadOnly: data.is_read_only ?? false,
          loading: false
        }));
        return true;
      } catch (error) {
        update(state => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        return false;
      }
    },

    async createMonth(month: string): Promise<boolean> {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const generateResponse = await fetch(apiUrl(`/api/months/${month}/generate`), {
          method: 'POST'
        });

        if (!generateResponse.ok) {
          throw new Error('Failed to generate monthly data');
        }

        const data = await generateResponse.json();
        update(state => ({
          ...state,
          data: data as MonthlyData,
          exists: true,
          isReadOnly: false,
          loading: false
        }));
        return true;
      } catch (error) {
        update(state => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        return false;
      }
    },

    async refreshSummary(month: string): Promise<void> {
      try {
        const response = await fetch(apiUrl(`/api/months/${month}/summary`));

        if (response.ok) {
          const summary = await response.json();
          update(state => ({
            ...state,
            data: state.data ? {
              ...state.data,
              summary: summary as LeftoverSummary
            } : null
          }));
        }
      } catch (error) {
        console.error('Failed to refresh summary:', error);
      }
    },

    async updateBankBalances(month: string, balances: Record<string, number>): Promise<void> {
      try {
        const response = await fetch(apiUrl(`/api/months/${month}/bank-balances`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(balances)
        });

        if (!response.ok) {
          throw new Error('Failed to update bank balances');
        }

        const data = await response.json();
        update(state => ({
          ...state,
          data: {
            ...state.data,
            ...data,
            bank_balances: balances
          } as MonthlyData
        }));
      } catch (error) {
        console.error('Failed to update bank balances:', error);
        throw error;
      }
    },

    reset() {
      set(initialState);
    }
  };
}

export const monthsStore = createMonthsStore();

// Derived stores for easier access
export const monthlyData = derived(monthsStore, ($store) => $store.data);
export const monthlyLoading = derived(monthsStore, ($store) => $store.loading);
export const monthlyError = derived(monthsStore, ($store) => $store.error);
export const monthExists = derived(monthsStore, ($store) => $store.exists);
export const monthIsReadOnly = derived(monthsStore, ($store) => $store.isReadOnly);

// Summary values for dashboard cards
export const leftoverSummary = derived(monthsStore, ($store) => $store.data?.summary || null);
export const totalIncome = derived(monthsStore, ($store) => $store.data?.summary?.totalIncome || 0);
export const totalExpenses = derived(monthsStore, ($store) => $store.data?.summary?.totalExpenses || 0);
export const leftover = derived(monthsStore, ($store) => $store.data?.summary?.leftover || 0);
export const netWorth = derived(monthsStore, ($store) => $store.data?.summary?.netWorth || 0);
export const totalCash = derived(monthsStore, ($store) => $store.data?.summary?.totalCash || 0);
export const totalCreditDebt = derived(monthsStore, ($store) => $store.data?.summary?.totalCreditDebt || 0);

// Bill and income instances
export const billInstances = derived(monthsStore, ($store) => $store.data?.bill_instances || []);
export const incomeInstances = derived(monthsStore, ($store) => $store.data?.income_instances || []);

// Bank balances for current month
export const bankBalances = derived(monthsStore, ($store) => $store.data?.bank_balances || {});
