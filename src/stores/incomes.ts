import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

export interface Income {
  id: string;
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  start_date?: string; // ISO date string (YYYY-MM-DD), required for bi_weekly/weekly/semi_annually
  payment_source_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeData {
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  start_date?: string;
  payment_source_id: string;
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
    const incomes = (data?.data || []) as Income[];
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
