// Months Store Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the API client
vi.mock('$lib/api/client', () => ({
  apiUrl: (path: string) => `http://localhost:3000${path}`,
}));

// Mock the logger
vi.mock('$lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  monthsStore,
  monthlyData,
  monthlyLoading,
  monthlyError,
  monthExists,
  monthIsReadOnly,
  leftoverSummary,
  totalIncome,
  totalExpenses,
  leftover,
  billInstances,
  incomeInstances,
  bankBalances,
  type MonthlyData,
} from './months';

// Sample monthly data
const sampleMonthlyData: MonthlyData = {
  month: '2025-01',
  bill_instances: [
    {
      id: 'bi-1',
      bill_id: 'bill-1',
      month: '2025-01',
      amount: 150,
      is_default: true,
      is_paid: false,
      name: 'Electric',
      billing_period: 'monthly',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ],
  income_instances: [
    {
      id: 'ii-1',
      income_id: 'income-1',
      month: '2025-01',
      amount: 5000,
      is_default: true,
      is_paid: false,
      name: 'Salary',
      billing_period: 'monthly',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ],
  variable_expenses: [],
  free_flowing_expenses: [],
  bank_balances: { 'ps-1': 5000 },
  summary: {
    bankBalances: 5000,
    remainingIncome: 5000,
    remainingExpenses: 150,
    leftover: 9850,
    isValid: true,
    totalCash: 5000,
    totalCreditDebt: 0,
    netWorth: 5000,
    totalIncome: 5000,
    totalExpenses: 150,
  },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('Months Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    monthsStore.reset();
  });

  describe('loadMonth', () => {
    it('loads monthly data from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sampleMonthlyData),
      });

      await monthsStore.loadMonth('2025-01');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/months/2025-01');
      expect(get(monthlyData)).toEqual(sampleMonthlyData);
      expect(get(monthExists)).toBe(true);
      expect(get(monthlyLoading)).toBe(false);
    });

    it('handles 404 when month does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await monthsStore.loadMonth('2025-02');

      expect(get(monthlyData)).toBeNull();
      expect(get(monthExists)).toBe(false);
      expect(get(monthlyLoading)).toBe(false);
    });

    it('sets error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await monthsStore.loadMonth('2025-01');

      expect(get(monthlyError)).toBe('Failed to load monthly data');
      expect(get(monthlyLoading)).toBe(false);
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockFetch.mockImplementation(() => {
        loadingDuringFetch = get(monthlyLoading);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(sampleMonthlyData),
        });
      });

      await monthsStore.loadMonth('2025-01');

      expect(loadingDuringFetch).toBe(true);
    });

    it('handles read-only months', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...sampleMonthlyData, is_read_only: true }),
      });

      await monthsStore.loadMonth('2024-12');

      expect(get(monthIsReadOnly)).toBe(true);
    });
  });

  describe('createMonth', () => {
    it('generates new month data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sampleMonthlyData),
      });

      const result = await monthsStore.createMonth('2025-01');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/months/2025-01/generate', {
        method: 'POST',
      });
      expect(result).toBe(true);
      expect(get(monthExists)).toBe(true);
    });

    it('returns false on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await monthsStore.createMonth('2025-01');

      expect(result).toBe(false);
      expect(get(monthlyError)).toBe('Failed to generate monthly data');
    });
  });

  describe('syncMonth', () => {
    it('syncs month data with bills/incomes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sampleMonthlyData),
      });

      const result = await monthsStore.syncMonth('2025-01');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/months/2025-01/sync', {
        method: 'POST',
      });
      expect(result).toBe(true);
    });

    it('returns false on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await monthsStore.syncMonth('2025-01');

      expect(result).toBe(false);
    });
  });

  describe('refreshSummary', () => {
    it('updates only the summary portion', async () => {
      // First load the month
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sampleMonthlyData),
      });
      await monthsStore.loadMonth('2025-01');

      // Then refresh summary
      const updatedSummary = { ...sampleMonthlyData.summary, leftover: 10000 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedSummary),
      });

      await monthsStore.refreshSummary('2025-01');

      expect(get(leftover)).toBe(10000);
    });
  });

  describe('updateBankBalances', () => {
    it('updates bank balances via API', async () => {
      // First load the month
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sampleMonthlyData),
      });
      await monthsStore.loadMonth('2025-01');

      // Then update balances
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ summary: sampleMonthlyData.summary }),
      });

      await monthsStore.updateBankBalances('2025-01', { 'ps-1': 6000 });

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:3000/api/months/2025-01/bank-balances',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 'ps-1': 6000 }),
        })
      );
    });

    it('throws on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(monthsStore.updateBankBalances('2025-01', {})).rejects.toThrow();
    });
  });

  describe('reset', () => {
    it('resets store to initial state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sampleMonthlyData),
      });
      await monthsStore.loadMonth('2025-01');

      monthsStore.reset();

      expect(get(monthlyData)).toBeNull();
      expect(get(monthExists)).toBe(false);
      expect(get(monthlyLoading)).toBe(false);
    });
  });

  describe('derived stores', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sampleMonthlyData),
      });
      await monthsStore.loadMonth('2025-01');
    });

    it('provides leftoverSummary', () => {
      expect(get(leftoverSummary)).toEqual(sampleMonthlyData.summary);
    });

    it('provides totalIncome', () => {
      expect(get(totalIncome)).toBe(5000);
    });

    it('provides totalExpenses', () => {
      expect(get(totalExpenses)).toBe(150);
    });

    it('provides leftover', () => {
      expect(get(leftover)).toBe(9850);
    });

    it('provides billInstances', () => {
      expect(get(billInstances)).toHaveLength(1);
      expect(get(billInstances)[0].name).toBe('Electric');
    });

    it('provides incomeInstances', () => {
      expect(get(incomeInstances)).toHaveLength(1);
      expect(get(incomeInstances)[0].name).toBe('Salary');
    });

    it('provides bankBalances', () => {
      expect(get(bankBalances)).toEqual({ 'ps-1': 5000 });
    });
  });
});
