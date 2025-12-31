import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

export interface Bill {
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
  category_id?: string;
  due_day?: number;           // Day of month when due (1-31, optional)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillWithContribution extends Bill {
  monthlyContribution: number;
}

export interface BillData {
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id?: string;
  due_day?: number;           // Day of month when due (1-31, optional)
}

// Billing period multipliers (average instances per month)
const BILLING_PERIOD_MULTIPLIERS: Record<string, number> = {
  monthly: 1,
  bi_weekly: 2.16666667,  // 26 times per year / 12 months
  weekly: 4.33333333,     // 52 times per year / 12 months
  semi_annually: 0.16666667  // 2 times per year / 12 months
};

/**
 * Calculate monthly contribution for a bill based on its billing period
 */
export function calculateMonthlyContribution(amount: number, billingPeriod: string): number {
  const multiplier = BILLING_PERIOD_MULTIPLIERS[billingPeriod] || 1;
  return Math.round(amount * multiplier);
}

type BillState = {
  bills: Bill[];
  loading: boolean;
  error: string | null;
};

const initialState: BillState = {
  bills: [],
  loading: false,
  error: null
};

const store = writable<BillState>(initialState);

export const bills = derived(store, s => s.bills);
export const loading = derived(store, s => s.loading);
export const error = derived(store, s => s.error);
export const activeBills = derived(bills, b => 
  b.filter(b => b.is_active)
);

export async function loadBills() {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    const data = await apiClient.get('/api/bills');
    const bills = (data || []) as Bill[];
    store.update(s => ({ ...s, bills, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load bills');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function createBill(data: BillData) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.post('/api/bills', data);
    await loadBills();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create bill');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateBill(id: string, updates: Partial<BillData>) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.put('/api/bills', id, updates);
    await loadBills();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update bill');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteBill(id: string) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.delete('/api/bills', id);
    await loadBills();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete bill');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearError() {
  store.update(s => ({ ...s, error: null }));
}

export const billsStore = store;

// Derived store for bills with monthly contribution calculated
export const billsWithContribution = derived(bills, ($bills): BillWithContribution[] => 
  $bills.map(bill => ({
    ...bill,
    monthlyContribution: calculateMonthlyContribution(bill.amount, bill.billing_period)
  }))
);

// Derived store for active bills with monthly contribution
export const activeBillsWithContribution = derived(billsWithContribution, ($bills) =>
  $bills.filter(b => b.is_active)
);

// Derived store for total fixed costs (sum of all active bills' monthly contributions)
export const totalFixedCosts = derived(activeBillsWithContribution, ($bills) =>
  $bills.reduce((sum, bill) => sum + bill.monthlyContribution, 0)
);
