// Insurance Plans Store
// Manages insurance plan entities for claims submissions

import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';
import type { InsurancePlan } from '../types/insurance';

type InsurancePlansState = {
  plans: InsurancePlan[];
  loading: boolean;
  error: string | null;
};

const initialState: InsurancePlansState = {
  plans: [],
  loading: false,
  error: null,
};

const store = writable<InsurancePlansState>(initialState);

// Derived stores
export const insurancePlans = derived(store, (s) => s.plans);
export const insurancePlansLoading = derived(store, (s) => s.loading);
export const insurancePlansError = derived(store, (s) => s.error);

// Active plans only (sorted by name)
export const activePlans = derived(insurancePlans, (plans) =>
  plans.filter((p) => p.is_active).sort((a, b) => a.name.localeCompare(b.name))
);

// Inactive plans
export const inactivePlans = derived(insurancePlans, (plans) => plans.filter((p) => !p.is_active));

// Create data type
export interface InsurancePlanData {
  name: string;
  provider_name?: string;
  policy_number?: string;
  member_id?: string;
  owner?: string;
  portal_url?: string;
  notes?: string;
}

export async function loadInsurancePlans() {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.get('/api/insurance-plans');
    const plans = (data || []) as InsurancePlan[];
    store.update((s) => ({ ...s, plans, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load insurance plans');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function createInsurancePlan(data: InsurancePlanData) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const newPlan = await apiClient.post('/api/insurance-plans', data);
    await loadInsurancePlans();
    return newPlan as InsurancePlan;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create insurance plan');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateInsurancePlan(
  id: string,
  updates: Partial<InsurancePlanData> & { is_active?: boolean }
) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const updated = await apiClient.put('/api/insurance-plans', id, updates);
    await loadInsurancePlans();
    return updated as InsurancePlan;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update insurance plan');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteInsurancePlan(id: string) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.delete('/api/insurance-plans', id);
    await loadInsurancePlans();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete insurance plan');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearInsurancePlansError() {
  store.update((s) => ({ ...s, error: null }));
}

// Get plan by ID (synchronous lookup from store)
export function getPlanById(id: string): InsurancePlan | undefined {
  let result: InsurancePlan | undefined;
  store.subscribe((s) => {
    result = s.plans.find((p) => p.id === id);
  })();
  return result;
}

export const insurancePlansStore = store;
