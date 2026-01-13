// Insurance Categories Store
// Manages insurance category entities for claims

import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';
import type { InsuranceCategory } from '../types/insurance';

type InsuranceCategoriesState = {
  categories: InsuranceCategory[];
  loading: boolean;
  error: string | null;
};

const initialState: InsuranceCategoriesState = {
  categories: [],
  loading: false,
  error: null,
};

const store = writable<InsuranceCategoriesState>(initialState);

// Derived stores
export const insuranceCategories = derived(store, (s) => s.categories);
export const insuranceCategoriesLoading = derived(store, (s) => s.loading);
export const insuranceCategoriesError = derived(store, (s) => s.error);

// Active categories only (sorted by sort_order)
export const activeCategories = derived(insuranceCategories, (cats) =>
  cats.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order)
);

// Predefined vs custom categories
export const predefinedCategories = derived(insuranceCategories, (cats) =>
  cats.filter((c) => c.is_predefined)
);
export const customCategories = derived(insuranceCategories, (cats) =>
  cats.filter((c) => !c.is_predefined)
);

// Create data type
export interface InsuranceCategoryData {
  name: string;
  icon: string;
  sort_order?: number;
}

export async function loadInsuranceCategories() {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.get('/api/insurance-categories');
    const categories = (data || []) as InsuranceCategory[];
    store.update((s) => ({ ...s, categories, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load insurance categories');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function createInsuranceCategory(data: InsuranceCategoryData) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const newCategory = await apiClient.post('/api/insurance-categories', data);
    await loadInsuranceCategories();
    return newCategory as InsuranceCategory;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create insurance category');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateInsuranceCategory(
  id: string,
  updates: Partial<InsuranceCategoryData> & { is_active?: boolean }
) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const updated = await apiClient.put('/api/insurance-categories', id, updates);
    await loadInsuranceCategories();
    return updated as InsuranceCategory;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update insurance category');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteInsuranceCategory(id: string) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.delete('/api/insurance-categories', id);
    await loadInsuranceCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete insurance category');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearInsuranceCategoriesError() {
  store.update((s) => ({ ...s, error: null }));
}

// Get category by ID (synchronous lookup from store)
export function getCategoryById(id: string): InsuranceCategory | undefined {
  let result: InsuranceCategory | undefined;
  store.subscribe((s) => {
    result = s.categories.find((c) => c.id === id);
  })();
  return result;
}

export const insuranceCategoriesStore = store;
