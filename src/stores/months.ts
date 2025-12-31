// Months Store - Manages monthly budget data

import { writable, derived } from 'svelte/store';
import { currentMonth } from './ui';

// Types for monthly data
export interface BillInstance {
  id: string;
  bill_id: string;
  month: string;
  amount: number;
  is_default: boolean;
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
  totalCash: number;
  totalCreditDebt: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  leftover: number;
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
}

const initialState: MonthsState = {
  data: null,
  loading: false,
  error: null
};

// Create the store
function createMonthsStore() {
  const { subscribe, set, update } = writable<MonthsState>(initialState);

  return {
    subscribe,

    async loadMonth(month: string): Promise<void> {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        // Try to load existing month data
        const response = await fetch(`/api/months/${month}`);
        
        if (response.status === 404) {
          // Month doesn't exist, generate it
          const generateResponse = await fetch(`/api/months/${month}/generate`, {
            method: 'POST'
          });

          if (!generateResponse.ok) {
            throw new Error('Failed to generate monthly data');
          }

          const data = await generateResponse.json();
          update(state => ({
            ...state,
            data: data as MonthlyData,
            loading: false
          }));
        } else if (!response.ok) {
          throw new Error('Failed to load monthly data');
        } else {
          // Month exists - sync to add any missing bills/incomes
          const syncResponse = await fetch(`/api/months/${month}/sync`, {
            method: 'POST'
          });
          
          if (syncResponse.ok) {
            const data = await syncResponse.json();
            update(state => ({
              ...state,
              data: data as MonthlyData,
              loading: false
            }));
          } else {
            // Sync failed, just use the original data
            const data = await response.json();
            update(state => ({
              ...state,
              data: data as MonthlyData,
              loading: false
            }));
          }
        }
      } catch (error) {
        update(state => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    },

    async refreshSummary(month: string): Promise<void> {
      try {
        const response = await fetch(`/api/months/${month}/summary`);

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

// Summary values for dashboard cards
export const leftoverSummary = derived(monthsStore, ($store) => $store.data?.summary || null);
export const totalIncome = derived(monthsStore, ($store) => $store.data?.summary?.totalIncome || 0);
export const totalExpenses = derived(monthsStore, ($store) => $store.data?.summary?.totalExpenses || 0);
export const leftover = derived(monthsStore, ($store) => $store.data?.summary?.leftover || 0);
export const netWorth = derived(monthsStore, ($store) => $store.data?.summary?.netWorth || 0);

// Bill and income instances
export const billInstances = derived(monthsStore, ($store) => $store.data?.bill_instances || []);
export const incomeInstances = derived(monthsStore, ($store) => $store.data?.income_instances || []);

// Variable expenses
export const variableExpenses = derived(monthsStore, ($store) => $store.data?.variable_expenses || []);
