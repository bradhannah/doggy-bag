// Incomes Store Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock the API client before importing the store
vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the categories store
vi.mock('./categories', () => ({
  categories: {
    subscribe: vi.fn((fn) => {
      fn([
        { id: 'cat-1', name: 'Primary', type: 'income', sort_order: 0 },
        { id: 'cat-2', name: 'Side Income', type: 'income', sort_order: 1 },
      ]);
      return () => {};
    }),
  },
}));

import {
  incomes,
  loading,
  error,
  activeIncomes,
  incomesWithContribution,
  activeIncomesWithContribution,
  totalMonthlyIncome,
  incomesByCategory,
  loadIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
  clearError,
  incomesStore,
  calculateMonthlyContribution,
  type Income,
} from './incomes';
import { apiClient } from '$lib/api/client';

// Get typed mock functions
const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockDelete = vi.mocked(apiClient.delete);

// Sample income data
const sampleIncomes: Income[] = [
  {
    id: 'income-1',
    name: 'Salary',
    amount: 5000,
    billing_period: 'monthly',
    day_of_month: 15,
    payment_source_id: 'ps-1',
    category_id: 'cat-1',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'income-2',
    name: 'Freelance',
    amount: 1000,
    billing_period: 'monthly',
    day_of_month: 1,
    payment_source_id: 'ps-1',
    category_id: 'cat-2',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'income-3',
    name: 'Old Job',
    amount: 3000,
    billing_period: 'monthly',
    day_of_month: 5,
    payment_source_id: 'ps-2',
    is_active: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'income-4',
    name: 'Bi-weekly Pay',
    amount: 2000,
    billing_period: 'bi_weekly',
    start_date: '2025-01-01',
    payment_source_id: 'ps-1',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

describe('Incomes Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    incomesStore.set({ incomes: [], loading: false, error: null });
  });

  describe('calculateMonthlyContribution', () => {
    it('returns amount for monthly billing', () => {
      expect(calculateMonthlyContribution(5000, 'monthly')).toBe(5000);
    });

    it('calculates bi-weekly contribution (26x/year ÷ 12)', () => {
      // 2000 * 2.16666667 = 4333.33, rounded to 4333
      expect(calculateMonthlyContribution(2000, 'bi_weekly')).toBe(4333);
    });

    it('calculates weekly contribution (52x/year ÷ 12)', () => {
      // 500 * 4.33333333 = 2166.67, rounded to 2167
      expect(calculateMonthlyContribution(500, 'weekly')).toBe(2167);
    });

    it('calculates semi-annual contribution (2x/year ÷ 12)', () => {
      // 6000 * 0.16666667 = 1000, rounded to 1000
      expect(calculateMonthlyContribution(6000, 'semi_annually')).toBe(1000);
    });

    it('defaults to 1x multiplier for unknown billing period', () => {
      expect(calculateMonthlyContribution(1000, 'unknown')).toBe(1000);
    });
  });

  describe('loadIncomes', () => {
    it('fetches incomes from API and updates store', async () => {
      mockGet.mockResolvedValue(sampleIncomes);

      await loadIncomes();

      expect(mockGet).toHaveBeenCalledWith('/api/incomes');
      expect(get(incomes)).toEqual(sampleIncomes);
      expect(get(loading)).toBe(false);
      expect(get(error)).toBeNull();
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockGet.mockImplementation(() => {
        loadingDuringFetch = get(loading);
        return Promise.resolve([]);
      });

      await loadIncomes();

      expect(loadingDuringFetch).toBe(true);
      expect(get(loading)).toBe(false);
    });

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null);

      await loadIncomes();

      expect(get(incomes)).toEqual([]);
    });

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(loadIncomes()).rejects.toThrow('Network error');
      expect(get(error)).toBe('Network error');
      expect(get(loading)).toBe(false);
    });

    it('sets generic error for non-Error exceptions', async () => {
      mockGet.mockRejectedValue('Something went wrong');

      await expect(loadIncomes()).rejects.toThrow('Failed to load incomes');
      expect(get(error)).toBe('Failed to load incomes');
    });
  });

  describe('createIncome', () => {
    it('calls API and reloads incomes on success', async () => {
      const newIncome = {
        name: 'New Income',
        amount: 1500,
        billing_period: 'monthly' as const,
        day_of_month: 10,
        payment_source_id: 'ps-1',
      };

      mockPost.mockResolvedValue({ id: 'income-new', ...newIncome });
      mockGet.mockResolvedValue(sampleIncomes);

      await createIncome(newIncome);

      expect(mockPost).toHaveBeenCalledWith('/api/incomes', newIncome);
      expect(mockGet).toHaveBeenCalledWith('/api/incomes');
    });

    it('sets error on API failure', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'));

      await expect(
        createIncome({
          name: '',
          amount: 0,
          billing_period: 'monthly',
          payment_source_id: 'ps-1',
        })
      ).rejects.toThrow('Validation failed');

      expect(get(error)).toBe('Validation failed');
    });
  });

  describe('updateIncome', () => {
    it('calls API with ID and updates, then reloads', async () => {
      mockPut.mockResolvedValue({ id: 'income-1', amount: 6000 });
      mockGet.mockResolvedValue(sampleIncomes);

      await updateIncome('income-1', { amount: 6000 });

      expect(mockPut).toHaveBeenCalledWith('/api/incomes', 'income-1', { amount: 6000 });
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockPut.mockRejectedValue(new Error('Not found'));

      await expect(updateIncome('income-999', { amount: 1000 })).rejects.toThrow('Not found');
      expect(get(error)).toBe('Not found');
    });
  });

  describe('deleteIncome', () => {
    it('calls API and reloads on success', async () => {
      mockDelete.mockResolvedValue(null);
      mockGet.mockResolvedValue([]);

      await deleteIncome('income-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/incomes', 'income-1');
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockDelete.mockRejectedValue(new Error('Cannot delete'));

      await expect(deleteIncome('income-1')).rejects.toThrow('Cannot delete');
      expect(get(error)).toBe('Cannot delete');
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      incomesStore.set({ incomes: [], loading: false, error: 'Some error' });

      clearError();

      expect(get(error)).toBeNull();
    });
  });

  describe('derived stores', () => {
    beforeEach(() => {
      incomesStore.set({ incomes: sampleIncomes, loading: false, error: null });
    });

    describe('activeIncomes', () => {
      it('filters to only active incomes', () => {
        const active = get(activeIncomes);
        expect(active).toHaveLength(3);
        expect(active.every((i) => i.is_active)).toBe(true);
      });
    });

    describe('incomesWithContribution', () => {
      it('adds monthlyContribution to each income', () => {
        const withContrib = get(incomesWithContribution);

        expect(withContrib[0].monthlyContribution).toBe(5000); // monthly
        expect(withContrib[3].monthlyContribution).toBe(4333); // bi_weekly: 2000 * 2.166...
      });
    });

    describe('activeIncomesWithContribution', () => {
      it('filters active and adds contribution', () => {
        const active = get(activeIncomesWithContribution);
        expect(active).toHaveLength(3);
        expect(active[0].monthlyContribution).toBeDefined();
      });
    });

    describe('totalMonthlyIncome', () => {
      it('sums all active incomes monthly contributions', () => {
        // Salary: 5000, Freelance: 1000, Bi-weekly Pay: 4333 (bi-weekly)
        expect(get(totalMonthlyIncome)).toBe(5000 + 1000 + 4333);
      });
    });

    describe('incomesByCategory', () => {
      it('groups incomes by category', () => {
        const grouped = get(incomesByCategory);

        // Should have: Uncategorized, Primary (cat-1), Side Income (cat-2)
        expect(grouped.length).toBeGreaterThanOrEqual(2);

        // Find Primary category
        const primary = grouped.find((g) => g.category?.id === 'cat-1');
        expect(primary?.incomes).toHaveLength(1);
        expect(primary?.incomes[0].name).toBe('Salary');
      });

      it('puts uncategorized incomes first', () => {
        const grouped = get(incomesByCategory);
        expect(grouped[0].category).toBeNull();
      });

      it('calculates subtotals per category', () => {
        const grouped = get(incomesByCategory);
        const primary = grouped.find((g) => g.category?.id === 'cat-1');
        expect(primary?.subtotal).toBe(5000);
      });
    });
  });
});
