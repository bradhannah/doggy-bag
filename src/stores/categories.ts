import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

export type CategoryType = 'bill' | 'income' | 'variable' | 'savings_goal';

export interface Category {
  id: string;
  name: string;
  is_predefined: boolean;
  sort_order: number;
  color: string;
  type: CategoryType;
  created_at: string;
  updated_at: string;
}

export interface CategoryData {
  name: string;
  type?: CategoryType;
  color?: string;
}

type CategoryState = {
  categories: Category[];
  loading: boolean;
  error: string | null;
};

const initialState: CategoryState = {
  categories: [],
  loading: false,
  error: null,
};

const store = writable<CategoryState>(initialState);

export const categories = derived(store, (s) => s.categories);
export const loading = derived(store, (s) => s.loading);
export const error = derived(store, (s) => s.error);

// Derived stores for predefined vs custom categories
export const predefinedCategories = derived(categories, (cats) =>
  cats.filter((c) => c.is_predefined)
);
export const customCategories = derived(categories, (cats) => cats.filter((c) => !c.is_predefined));

// Derived stores for bill vs income categories
export const billCategories = derived(categories, (cats) =>
  cats.filter((c) => c.type === 'bill').sort((a, b) => a.sort_order - b.sort_order)
);
export const incomeCategories = derived(categories, (cats) =>
  cats.filter((c) => c.type === 'income').sort((a, b) => a.sort_order - b.sort_order)
);

// Track whether data has been loaded at least once
let initialized = false;
// Deduplicate concurrent in-flight loads
let inFlightPromise: Promise<void> | null = null;

export async function loadCategories() {
  // Reset initialized so future loadIfNeeded calls will re-fetch
  initialized = false;
  inFlightPromise = null;

  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.get('/api/categories');
    const categories = (data || []) as Category[];
    store.update((s) => ({ ...s, categories, loading: false }));
    initialized = true;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load categories');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Load categories only if they haven't been loaded yet.
 * Deduplicates concurrent calls — if a load is already in-flight, returns the same promise.
 */
export async function loadCategoriesIfNeeded(): Promise<void> {
  if (initialized) return;
  if (inFlightPromise) return inFlightPromise;

  inFlightPromise = loadCategories().finally(() => {
    inFlightPromise = null;
  });
  return inFlightPromise;
}

/**
 * Reset initialized flag (for testing)
 */
export function resetCategoriesInitialized(): void {
  initialized = false;
  inFlightPromise = null;
}

export async function createCategory(data: CategoryData) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.post('/api/categories', data);
    await loadCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create category');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateCategory(id: string, updates: Partial<CategoryData>) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.put('/api/categories', id, updates);
    await loadCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update category');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteCategory(id: string) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.delete('/api/categories', id);
    await loadCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete category');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function reorderCategories(type: CategoryType, orderedIds: string[]) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.putPath('/api/categories/reorder', { type, orderedIds });

    // Reload categories to get the updated sort_order values
    await loadCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to reorder categories');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearError() {
  store.update((s) => ({ ...s, error: null }));
}

export const categoriesStore = store;
