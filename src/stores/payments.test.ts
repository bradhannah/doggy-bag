// Payments Store Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock the API client
vi.mock('../lib/api/client', () => ({
  apiUrl: (path: string) => `http://localhost:3000${path}`,
}));

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { payments } from './payments';

describe('Payments Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state by calling clearError
    payments.clearError();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = get(payments);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('addPayment', () => {
    it('adds a payment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'payment-1', amount: 5000 }),
      });

      await payments.addPayment('2025-01', 'bill-instance-1', 5000);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/months/2025-01/bills/bill-instance-1/payments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 5000 }),
        }
      );
      expect(get(payments).loading).toBe(false);
      expect(get(payments).error).toBeNull();
    });

    it('adds a payment with date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'payment-1', amount: 5000 }),
      });

      await payments.addPayment('2025-01', 'bill-instance-1', 5000, '2025-01-15');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/months/2025-01/bills/bill-instance-1/payments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 5000, date: '2025-01-15' }),
        }
      );
    });

    it('handles API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment amount exceeds remaining' }),
      });

      await expect(payments.addPayment('2025-01', 'bill-instance-1', 10000)).rejects.toThrow(
        'Payment amount exceeds remaining'
      );
      expect(get(payments).error).toBe('Payment amount exceeds remaining');
      expect(get(payments).loading).toBe(false);
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(payments.addPayment('2025-01', 'bill-instance-1', 5000)).rejects.toThrow(
        'Network error'
      );
      expect(get(payments).error).toBe('Network error');
    });

    it('handles non-Error thrown', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      await expect(payments.addPayment('2025-01', 'bill-instance-1', 5000)).rejects.toBe(
        'string error'
      );
      expect(get(payments).error).toBe('Failed to add payment');
    });
  });

  describe('updatePayment', () => {
    it('updates a payment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'payment-1', amount: 7500 }),
      });

      await payments.updatePayment('2025-01', 'bill-instance-1', 'payment-1', 7500, '2025-01-20');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/months/2025-01/bills/bill-instance-1/payments/payment-1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 7500, date: '2025-01-20' }),
        }
      );
      expect(get(payments).loading).toBe(false);
    });

    it('handles API error on update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment not found' }),
      });

      await expect(
        payments.updatePayment('2025-01', 'bill-instance-1', 'payment-999', 7500, '2025-01-20')
      ).rejects.toThrow('Payment not found');
      expect(get(payments).error).toBe('Payment not found');
    });

    it('handles non-Error thrown on update', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      await expect(
        payments.updatePayment('2025-01', 'bill-instance-1', 'payment-1', 7500, '2025-01-20')
      ).rejects.toBe('string error');
      expect(get(payments).error).toBe('Failed to update payment');
    });
  });

  describe('removePayment', () => {
    it('removes a payment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await payments.removePayment('2025-01', 'bill-instance-1', 'payment-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/months/2025-01/bills/bill-instance-1/payments/payment-1',
        {
          method: 'DELETE',
        }
      );
      expect(get(payments).loading).toBe(false);
    });

    it('handles API error on remove', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot remove payment' }),
      });

      await expect(
        payments.removePayment('2025-01', 'bill-instance-1', 'payment-1')
      ).rejects.toThrow('Cannot remove payment');
      expect(get(payments).error).toBe('Cannot remove payment');
    });

    it('handles non-Error thrown on remove', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      await expect(payments.removePayment('2025-01', 'bill-instance-1', 'payment-1')).rejects.toBe(
        'string error'
      );
      expect(get(payments).error).toBe('Failed to remove payment');
    });
  });

  // ============================================================================
  // Income Payment Tests
  // ============================================================================

  describe('addIncomePayment', () => {
    it('adds an income payment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'payment-1', amount: 100000 }),
      });

      await payments.addIncomePayment('2025-01', 'income-instance-1', 100000);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/months/2025-01/incomes/income-instance-1/payments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 100000 }),
        }
      );
      expect(get(payments).loading).toBe(false);
    });

    it('adds an income payment with date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'payment-1', amount: 100000 }),
      });

      await payments.addIncomePayment('2025-01', 'income-instance-1', 100000, '2025-01-15');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/months/2025-01/incomes/income-instance-1/payments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 100000, date: '2025-01-15' }),
        }
      );
    });

    it('handles API error on income payment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Income not found' }),
      });

      await expect(
        payments.addIncomePayment('2025-01', 'income-instance-1', 100000)
      ).rejects.toThrow('Income not found');
      expect(get(payments).error).toBe('Income not found');
    });

    it('handles non-Error thrown on add income', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      await expect(payments.addIncomePayment('2025-01', 'income-instance-1', 100000)).rejects.toBe(
        'string error'
      );
      expect(get(payments).error).toBe('Failed to add receipt');
    });
  });

  describe('updateIncomePayment', () => {
    it('updates an income payment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'payment-1', amount: 110000 }),
      });

      await payments.updateIncomePayment(
        '2025-01',
        'income-instance-1',
        'payment-1',
        110000,
        '2025-01-20'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/months/2025-01/incomes/income-instance-1/payments/payment-1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 110000, date: '2025-01-20' }),
        }
      );
      expect(get(payments).loading).toBe(false);
    });

    it('handles API error on update income payment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment not found' }),
      });

      await expect(
        payments.updateIncomePayment(
          '2025-01',
          'income-instance-1',
          'payment-999',
          110000,
          '2025-01-20'
        )
      ).rejects.toThrow('Payment not found');
      expect(get(payments).error).toBe('Payment not found');
    });

    it('handles non-Error thrown on update income', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      await expect(
        payments.updateIncomePayment(
          '2025-01',
          'income-instance-1',
          'payment-1',
          110000,
          '2025-01-20'
        )
      ).rejects.toBe('string error');
      expect(get(payments).error).toBe('Failed to update receipt');
    });
  });

  describe('removeIncomePayment', () => {
    it('removes an income payment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await payments.removeIncomePayment('2025-01', 'income-instance-1', 'payment-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/months/2025-01/incomes/income-instance-1/payments/payment-1',
        {
          method: 'DELETE',
        }
      );
      expect(get(payments).loading).toBe(false);
    });

    it('handles API error on remove income payment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot remove receipt' }),
      });

      await expect(
        payments.removeIncomePayment('2025-01', 'income-instance-1', 'payment-1')
      ).rejects.toThrow('Cannot remove receipt');
      expect(get(payments).error).toBe('Cannot remove receipt');
    });

    it('handles non-Error thrown on remove income', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      await expect(
        payments.removeIncomePayment('2025-01', 'income-instance-1', 'payment-1')
      ).rejects.toBe('string error');
      expect(get(payments).error).toBe('Failed to remove receipt');
    });
  });

  describe('clearError', () => {
    it('clears the error state', async () => {
      // First cause an error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Some error' }),
      });

      try {
        await payments.addPayment('2025-01', 'bill-1', 1000);
      } catch {
        // expected
      }

      expect(get(payments).error).toBe('Some error');

      payments.clearError();

      expect(get(payments).error).toBeNull();
    });
  });
});
