// Categories Store Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock the API client before importing the store
vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    putPath: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  categories,
  loading,
  error,
  predefinedCategories,
  customCategories,
  billCategories,
  incomeCategories,
  loadCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  clearError,
  categoriesStore,
  type Category,
} from './categories';
import { apiClient } from '$lib/api/client';

// Get typed mock functions
const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockPutPath = vi.mocked(apiClient.putPath);
const mockDelete = vi.mocked(apiClient.delete);

// Sample category data
const sampleCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Utilities',
    is_predefined: true,
    sort_order: 0,
    color: '#ff0000',
    type: 'bill',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Subscriptions',
    is_predefined: false,
    sort_order: 1,
    color: '#00ff00',
    type: 'bill',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cat-3',
    name: 'Primary Income',
    is_predefined: true,
    sort_order: 0,
    color: '#0000ff',
    type: 'income',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cat-4',
    name: 'Side Income',
    is_predefined: false,
    sort_order: 1,
    color: '#ffff00',
    type: 'income',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

describe('Categories Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    categoriesStore.set({ categories: [], loading: false, error: null });
  });

  describe('loadCategories', () => {
    it('fetches categories from API and updates store', async () => {
      mockGet.mockResolvedValue(sampleCategories);

      await loadCategories();

      expect(mockGet).toHaveBeenCalledWith('/api/categories');
      expect(get(categories)).toEqual(sampleCategories);
      expect(get(loading)).toBe(false);
      expect(get(error)).toBeNull();
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockGet.mockImplementation(() => {
        loadingDuringFetch = get(loading);
        return Promise.resolve([]);
      });

      await loadCategories();

      expect(loadingDuringFetch).toBe(true);
      expect(get(loading)).toBe(false);
    });

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null);

      await loadCategories();

      expect(get(categories)).toEqual([]);
    });

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(loadCategories()).rejects.toThrow('Network error');
      expect(get(error)).toBe('Network error');
      expect(get(loading)).toBe(false);
    });
  });

  describe('createCategory', () => {
    it('calls API and reloads categories on success', async () => {
      const newCategory = { name: 'New Category', type: 'bill' as const };

      mockPost.mockResolvedValue({ id: 'cat-new', ...newCategory });
      mockGet.mockResolvedValue(sampleCategories);

      await createCategory(newCategory);

      expect(mockPost).toHaveBeenCalledWith('/api/categories', newCategory);
      expect(mockGet).toHaveBeenCalledWith('/api/categories');
    });

    it('sets error on API failure', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'));

      await expect(createCategory({ name: '' })).rejects.toThrow('Validation failed');
      expect(get(error)).toBe('Validation failed');
    });
  });

  describe('updateCategory', () => {
    it('calls API with ID and updates, then reloads', async () => {
      mockPut.mockResolvedValue({ id: 'cat-1', name: 'Updated' });
      mockGet.mockResolvedValue(sampleCategories);

      await updateCategory('cat-1', { name: 'Updated' });

      expect(mockPut).toHaveBeenCalledWith('/api/categories', 'cat-1', { name: 'Updated' });
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockPut.mockRejectedValue(new Error('Not found'));

      await expect(updateCategory('cat-999', { name: 'Test' })).rejects.toThrow('Not found');
      expect(get(error)).toBe('Not found');
    });
  });

  describe('deleteCategory', () => {
    it('calls API and reloads on success', async () => {
      mockDelete.mockResolvedValue(null);
      mockGet.mockResolvedValue([]);

      await deleteCategory('cat-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/categories', 'cat-1');
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockDelete.mockRejectedValue(new Error('Cannot delete'));

      await expect(deleteCategory('cat-1')).rejects.toThrow('Cannot delete');
      expect(get(error)).toBe('Cannot delete');
    });
  });

  describe('reorderCategories', () => {
    it('calls putPath with type and orderedIds', async () => {
      mockPutPath.mockResolvedValue({});
      mockGet.mockResolvedValue(sampleCategories);

      await reorderCategories('bill', ['cat-2', 'cat-1']);

      expect(mockPutPath).toHaveBeenCalledWith('/api/categories/reorder', {
        type: 'bill',
        orderedIds: ['cat-2', 'cat-1'],
      });
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockPutPath.mockRejectedValue(new Error('Reorder failed'));

      await expect(reorderCategories('bill', ['cat-1'])).rejects.toThrow('Reorder failed');
      expect(get(error)).toBe('Reorder failed');
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      categoriesStore.set({ categories: [], loading: false, error: 'Some error' });

      clearError();

      expect(get(error)).toBeNull();
    });
  });

  describe('derived stores', () => {
    beforeEach(() => {
      categoriesStore.set({ categories: sampleCategories, loading: false, error: null });
    });

    describe('predefinedCategories', () => {
      it('filters to only predefined categories', () => {
        const predefined = get(predefinedCategories);
        expect(predefined).toHaveLength(2);
        expect(predefined.every((c) => c.is_predefined)).toBe(true);
      });
    });

    describe('customCategories', () => {
      it('filters to only custom categories', () => {
        const custom = get(customCategories);
        expect(custom).toHaveLength(2);
        expect(custom.every((c) => !c.is_predefined)).toBe(true);
      });
    });

    describe('billCategories', () => {
      it('filters to only bill categories sorted by sort_order', () => {
        const bills = get(billCategories);
        expect(bills).toHaveLength(2);
        expect(bills.every((c) => c.type === 'bill')).toBe(true);
        expect(bills[0].sort_order).toBeLessThanOrEqual(bills[1].sort_order);
      });
    });

    describe('incomeCategories', () => {
      it('filters to only income categories sorted by sort_order', () => {
        const incomes = get(incomeCategories);
        expect(incomes).toHaveLength(2);
        expect(incomes.every((c) => c.type === 'income')).toBe(true);
        expect(incomes[0].sort_order).toBeLessThanOrEqual(incomes[1].sort_order);
      });
    });
  });
});
