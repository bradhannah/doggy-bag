// Payments Store Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

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

  describe('instance-level payments', () => {
    it('rejects instance-level bill payments', async () => {
      await expect(payments.addPayment('2025-01', 'bill-instance-1', 5000)).rejects.toThrow(
        'Instance-level payments have been removed. Use occurrences instead.'
      );
      expect(get(payments).error).toBe(
        'Instance-level payments have been removed. Use occurrences instead.'
      );
    });

    it('rejects instance-level bill updates', async () => {
      await expect(
        payments.updatePayment('2025-01', 'bill-instance-1', 'payment-1', 7500, '2025-01-20')
      ).rejects.toThrow('Instance-level payments have been removed. Use occurrences instead.');
    });

    it('rejects instance-level bill removals', async () => {
      await expect(
        payments.removePayment('2025-01', 'bill-instance-1', 'payment-1')
      ).rejects.toThrow('Instance-level payments have been removed. Use occurrences instead.');
    });

    it('rejects instance-level income payments', async () => {
      await expect(
        payments.addIncomePayment('2025-01', 'income-instance-1', 100000)
      ).rejects.toThrow('Instance-level payments have been removed. Use occurrences instead.');
      expect(get(payments).error).toBe(
        'Instance-level payments have been removed. Use occurrences instead.'
      );
    });

    it('rejects instance-level income updates', async () => {
      await expect(
        payments.updateIncomePayment(
          '2025-01',
          'income-instance-1',
          'payment-1',
          110000,
          '2025-01-20'
        )
      ).rejects.toThrow('Instance-level payments have been removed. Use occurrences instead.');
    });

    it('rejects instance-level income removals', async () => {
      await expect(
        payments.removeIncomePayment('2025-01', 'income-instance-1', 'payment-1')
      ).rejects.toThrow('Instance-level payments have been removed. Use occurrences instead.');
    });
  });

  describe('clearError', () => {
    it('clears the error state', async () => {
      try {
        await payments.addPayment('2025-01', 'bill-1', 1000);
      } catch {
        // expected
      }

      expect(get(payments).error).toBe(
        'Instance-level payments have been removed. Use occurrences instead.'
      );

      payments.clearError();

      expect(get(payments).error).toBeNull();
    });
  });
});
