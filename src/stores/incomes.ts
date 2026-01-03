import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';
import { categories, type Category } from './categories';

export interface Income {
  id: string;
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  start_date?: string; // ISO date string (YYYY-MM-DD), required for bi_weekly/weekly/semi_annually
  // For monthly billing: specify EITHER day_of_month OR (recurrence_week + recurrence_day)
  day_of_month?: number;      // 1-31 (use 31 for "last day of month")
  recurrence_week?: number;   // 1-5 (1st, 2nd, 3rd, 4th, 5th/last weekday of month)
  recurrence_day?: number;    // 0=Sunday, 1=Monday, ..., 6=Saturday
  payment_source_id: string;
  category_id?: string;       // Reference to income category
  due_day?: number;           // Day of month when expected (1-31, optional)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeWithContribution extends Income {
  monthlyContribution: number;
}

export interface IncomeData {
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id?: string;       // Reference to income category
  due_day?: number;           // Day of month when expected (1-31, optional)
}

// Billing period multipliers (average instances per month)
const BILLING_PERIOD_MULTIPLIERS: Record<string, number> = {
  monthly: 1,
  bi_weekly: 2.16666667,  // 26 times per year / 12 months
  weekly: 4.33333333,     // 52 times per year / 12 months
  semi_annually: 0.16666667  // 2 times per year / 12 months
};

/**
 * Calculate monthly contribution for an income based on its billing period
 */
export function calculateMonthlyContribution(amount: number, billingPeriod: string): number {
  const multiplier = BILLING_PERIOD_MULTIPLIERS[billingPeriod] || 1;
  return Math.round(amount * multiplier);
}

type IncomeState = {
  incomes: Income[];
  loading: boolean;
  error: string | null;
};

const initialState: IncomeState = {
  incomes: [],
  loading: false,
  error: null
};

const store = writable<IncomeState>(initialState);

export const incomes = derived(store, s => s.incomes);
export const loading = derived(store, s => s.loading);
export const error = derived(store, s => s.error);
export const activeIncomes = derived(store, s => 
  s.incomes.filter(i => i.is_active)
);

export async function loadIncomes() {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    const data = await apiClient.get('/api/incomes');
    const incomes = (data || []) as Income[];
    store.update(s => ({ ...s, incomes, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load incomes');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function createIncome(data: IncomeData) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.post('/api/incomes', data);
    await loadIncomes();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create income');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateIncome(id: string, updates: Partial<IncomeData>) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.put('/api/incomes', id, updates);
    await loadIncomes();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update income');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteIncome(id: string) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.delete('/api/incomes', id);
    await loadIncomes();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete income');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearError() {
  store.update(s => ({ ...s, error: null }));
}

export const incomesStore = store;

// Derived store for incomes with monthly contribution calculated
export const incomesWithContribution = derived(incomes, ($incomes): IncomeWithContribution[] => 
  $incomes.map(income => ({
    ...income,
    monthlyContribution: calculateMonthlyContribution(income.amount, income.billing_period)
  }))
);

// Derived store for active incomes with monthly contribution
export const activeIncomesWithContribution = derived(incomesWithContribution, ($incomes) =>
  $incomes.filter(i => i.is_active)
);

// Derived store for total monthly income (sum of all active incomes' monthly contributions)
export const totalMonthlyIncome = derived(activeIncomesWithContribution, ($incomes) =>
  $incomes.reduce((sum, income) => sum + income.monthlyContribution, 0)
);

// Type for incomes grouped by category
export interface IncomeCategoryGroup {
  category: Category | null;
  incomes: IncomeWithContribution[];
  subtotal: number;
}

// Derived store for incomes grouped by category
export const incomesByCategory = derived(
  [activeIncomesWithContribution, categories],
  ([$incomes, $categories]): IncomeCategoryGroup[] => {
    // Get income categories sorted by sort_order
    const incomeCats = $categories
      .filter(c => c.type === 'income')
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const grouped: IncomeCategoryGroup[] = [];
    
    // Uncategorized first
    const uncategorized = $incomes.filter(i => !i.category_id);
    if (uncategorized.length > 0 || true) { // Always show uncategorized section
      grouped.push({ 
        category: null, 
        incomes: uncategorized,
        subtotal: uncategorized.reduce((sum, i) => sum + i.monthlyContribution, 0)
      });
    }
    
    // Then each category in sort_order
    for (const cat of incomeCats) {
      const catIncomes = $incomes.filter(i => i.category_id === cat.id);
      grouped.push({ 
        category: cat, 
        incomes: catIncomes,
        subtotal: catIncomes.reduce((sum, i) => sum + i.monthlyContribution, 0)
      });
    }
    
    return grouped;
  }
);
