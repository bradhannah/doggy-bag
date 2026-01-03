import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

export type CategoryType = 'bill' | 'income' | 'variable';

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
  error: null
};

const store = writable<CategoryState>(initialState);

export const categories = derived(store, s => s.categories);
export const loading = derived(store, s => s.loading);
export const error = derived(store, s => s.error);

// Derived stores for predefined vs custom categories
export const predefinedCategories = derived(categories, cats => 
  cats.filter(c => c.is_predefined)
);
export const customCategories = derived(categories, cats => 
  cats.filter(c => !c.is_predefined)
);

// Derived stores for bill vs income categories
export const billCategories = derived(categories, cats => 
  cats.filter(c => c.type === 'bill').sort((a, b) => a.sort_order - b.sort_order)
);
export const incomeCategories = derived(categories, cats => 
  cats.filter(c => c.type === 'income').sort((a, b) => a.sort_order - b.sort_order)
);

export async function loadCategories() {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    const data = await apiClient.get('/api/categories');
    const categories = (data || []) as Category[];
    store.update(s => ({ ...s, categories, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load categories');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function createCategory(data: CategoryData) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.post('/api/categories', data);
    await loadCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create category');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateCategory(id: string, updates: Partial<CategoryData>) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.put('/api/categories', id, updates);
    await loadCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update category');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteCategory(id: string) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.delete('/api/categories', id);
    await loadCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete category');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function reorderCategories(type: CategoryType, orderedIds: string[]) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.putPath('/api/categories/reorder', { type, orderedIds });
    
    // Reload categories to get the updated sort_order values
    await loadCategories();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to reorder categories');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearError() {
  store.update(s => ({ ...s, error: null }));
}

export const categoriesStore = store;
