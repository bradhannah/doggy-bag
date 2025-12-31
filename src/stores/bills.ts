import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  start_date?: string; // ISO date string (YYYY-MM-DD), required for bi_weekly/weekly/semi_annually
  payment_source_id: string;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillData {
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  start_date?: string;
  payment_source_id: string;
  category_id?: string;
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
