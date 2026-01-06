// Bills Store Tests
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
        { id: 'cat-1', name: 'Utilities', type: 'bill', sort_order: 0 },
        { id: 'cat-2', name: 'Subscriptions', type: 'bill', sort_order: 1 },
      ]);
      return () => {};
    }),
  },
}));

import {
  bills,
  loading,
  error,
  activeBills,
  billsWithContribution,
  activeBillsWithContribution,
  totalFixedCosts,
  billsByCategory,
  loadBills,
  createBill,
  updateBill,
  deleteBill,
  clearError,
  billsStore,
  calculateMonthlyContribution,
  type Bill,
} from './bills';
import { apiClient } from '$lib/api/client';

// Get typed mock functions
const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockDelete = vi.mocked(apiClient.delete);

// Sample bill data
const sampleBills: Bill[] = [
  {
    id: 'bill-1',
    name: 'Electric',
    amount: 150,
    billing_period: 'monthly',
    day_of_month: 15,
    payment_source_id: 'ps-1',
    category_id: 'cat-1',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bill-2',
    name: 'Netflix',
    amount: 20,
    billing_period: 'monthly',
    day_of_month: 1,
    payment_source_id: 'ps-1',
    category_id: 'cat-2',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bill-3',
    name: 'Gym',
    amount: 50,
    billing_period: 'monthly',
    day_of_month: 5,
    payment_source_id: 'ps-2',
    category_id: 'cat-1',
    is_active: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bill-4',
    name: 'Paycheck Deduction',
    amount: 100,
    billing_period: 'bi_weekly',
    start_date: '2025-01-01',
    payment_source_id: 'ps-1',
    category_id: 'cat-1',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

describe('Bills Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    billsStore.set({ bills: [], loading: false, error: null });
  });

  describe('calculateMonthlyContribution', () => {
    it('returns amount for monthly billing', () => {
      expect(calculateMonthlyContribution(100, 'monthly')).toBe(100);
    });

    it('calculates bi-weekly contribution (26x/year ÷ 12)', () => {
      // 100 * 2.16666667 = 216.666667, rounded to 217
      expect(calculateMonthlyContribution(100, 'bi_weekly')).toBe(217);
    });

    it('calculates weekly contribution (52x/year ÷ 12)', () => {
      // 100 * 4.33333333 = 433.333333, rounded to 433
      expect(calculateMonthlyContribution(100, 'weekly')).toBe(433);
    });

    it('calculates semi-annual contribution (2x/year ÷ 12)', () => {
      // 600 * 0.16666667 = 100, rounded to 100
      expect(calculateMonthlyContribution(600, 'semi_annually')).toBe(100);
    });

    it('defaults to 1x multiplier for unknown billing period', () => {
      expect(calculateMonthlyContribution(100, 'unknown')).toBe(100);
    });
  });

  describe('loadBills', () => {
    it('fetches bills from API and updates store', async () => {
      mockGet.mockResolvedValue(sampleBills);

      await loadBills();

      expect(mockGet).toHaveBeenCalledWith('/api/bills');
      expect(get(bills)).toEqual(sampleBills);
      expect(get(loading)).toBe(false);
      expect(get(error)).toBeNull();
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockGet.mockImplementation(() => {
        loadingDuringFetch = get(loading);
        return Promise.resolve([]);
      });

      await loadBills();

      expect(loadingDuringFetch).toBe(true);
      expect(get(loading)).toBe(false);
    });

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null);

      await loadBills();

      expect(get(bills)).toEqual([]);
    });

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(loadBills()).rejects.toThrow('Network error');
      expect(get(error)).toBe('Network error');
      expect(get(loading)).toBe(false);
    });

    it('sets generic error for non-Error exceptions', async () => {
      mockGet.mockRejectedValue('Something went wrong');

      await expect(loadBills()).rejects.toThrow('Failed to load bills');
      expect(get(error)).toBe('Failed to load bills');
    });
  });

  describe('createBill', () => {
    it('calls API and reloads bills on success', async () => {
      const newBill = {
        name: 'New Bill',
        amount: 75,
        billing_period: 'monthly' as const,
        day_of_month: 10,
        payment_source_id: 'ps-1',
        category_id: 'cat-1',
      };

      mockPost.mockResolvedValue({ id: 'bill-new', ...newBill });
      mockGet.mockResolvedValue(sampleBills);

      await createBill(newBill);

      expect(mockPost).toHaveBeenCalledWith('/api/bills', newBill);
      expect(mockGet).toHaveBeenCalledWith('/api/bills');
    });

    it('sets error on API failure', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'));

      await expect(
        createBill({
          name: '',
          amount: 0,
          billing_period: 'monthly',
          payment_source_id: 'ps-1',
          category_id: 'cat-1',
        })
      ).rejects.toThrow('Validation failed');

      expect(get(error)).toBe('Validation failed');
    });
  });

  describe('updateBill', () => {
    it('calls API with ID and updates, then reloads', async () => {
      mockPut.mockResolvedValue({ id: 'bill-1', amount: 200 });
      mockGet.mockResolvedValue(sampleBills);

      await updateBill('bill-1', { amount: 200 });

      expect(mockPut).toHaveBeenCalledWith('/api/bills', 'bill-1', { amount: 200 });
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockPut.mockRejectedValue(new Error('Not found'));

      await expect(updateBill('bill-999', { amount: 100 })).rejects.toThrow('Not found');
      expect(get(error)).toBe('Not found');
    });
  });

  describe('deleteBill', () => {
    it('calls API and reloads on success', async () => {
      mockDelete.mockResolvedValue(null);
      mockGet.mockResolvedValue([]);

      await deleteBill('bill-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/bills', 'bill-1');
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockDelete.mockRejectedValue(new Error('Cannot delete'));

      await expect(deleteBill('bill-1')).rejects.toThrow('Cannot delete');
      expect(get(error)).toBe('Cannot delete');
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      billsStore.set({ bills: [], loading: false, error: 'Some error' });

      clearError();

      expect(get(error)).toBeNull();
    });
  });

  describe('derived stores', () => {
    beforeEach(() => {
      billsStore.set({ bills: sampleBills, loading: false, error: null });
    });

    describe('activeBills', () => {
      it('filters to only active bills', () => {
        const active = get(activeBills);
        expect(active).toHaveLength(3);
        expect(active.every((b) => b.is_active)).toBe(true);
      });
    });

    describe('billsWithContribution', () => {
      it('adds monthlyContribution to each bill', () => {
        const withContrib = get(billsWithContribution);

        expect(withContrib[0].monthlyContribution).toBe(150); // monthly
        expect(withContrib[3].monthlyContribution).toBe(217); // bi_weekly: 100 * 2.166...
      });
    });

    describe('activeBillsWithContribution', () => {
      it('filters active and adds contribution', () => {
        const active = get(activeBillsWithContribution);
        expect(active).toHaveLength(3);
        expect(active[0].monthlyContribution).toBeDefined();
      });
    });

    describe('totalFixedCosts', () => {
      it('sums all active bills monthly contributions', () => {
        // Electric: 150, Netflix: 20, Paycheck Deduction: 217 (bi-weekly)
        expect(get(totalFixedCosts)).toBe(150 + 20 + 217);
      });
    });

    describe('billsByCategory', () => {
      it('groups bills by category', () => {
        const grouped = get(billsByCategory);

        // Should have: Uncategorized, Utilities (cat-1), Subscriptions (cat-2)
        expect(grouped.length).toBeGreaterThanOrEqual(2);

        // Find utilities category (cat-1 has Electric and Paycheck Deduction active)
        const utilities = grouped.find((g) => g.category?.id === 'cat-1');
        expect(utilities?.bills).toHaveLength(2);
        expect(utilities?.bills.map((b) => b.name)).toContain('Electric');
      });

      it('puts uncategorized bills first', () => {
        const grouped = get(billsByCategory);
        expect(grouped[0].category).toBeNull();
      });

      it('calculates subtotals per category', () => {
        const grouped = get(billsByCategory);
        // cat-1 has Electric (150) + Paycheck Deduction (100 bi_weekly = 217)
        const utilities = grouped.find((g) => g.category?.id === 'cat-1');
        expect(utilities?.subtotal).toBe(150 + 217);
      });
    });
  });
});
