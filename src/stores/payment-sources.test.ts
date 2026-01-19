// Payment Sources Store Tests
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

import {
  paymentSources,
  loading,
  error,
  bankAccounts,
  cashSources,
  assetAccounts,
  creditCards,
  linesOfCredit,
  debtAccounts,
  loadPaymentSources,
  createPaymentSource,
  updatePaymentSource,
  deletePaymentSource,
  clearError,
  paymentSourcesStore,
  isDebtAccount,
  formatBalanceForDisplay,
  getTypeDisplayName,
  getTypeIcon,
  type PaymentSource,
} from './payment-sources';
import { apiClient } from '$lib/api/client';

// Get typed mock functions
const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockDelete = vi.mocked(apiClient.delete);

// Sample payment source data
const samplePaymentSources: PaymentSource[] = [
  {
    id: 'ps-1',
    name: 'Checking',
    type: 'bank_account',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ps-2',
    name: 'Savings',
    type: 'bank_account',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ps-3',
    name: 'Visa',
    type: 'credit_card',
    is_active: true,
    pay_off_monthly: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ps-4',
    name: 'Home Equity',
    type: 'line_of_credit',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ps-5',
    name: 'Wallet',
    type: 'cash',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

describe('Payment Sources Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    paymentSourcesStore.set({ paymentSources: [], loading: false, error: null });
  });

  describe('helper functions', () => {
    describe('isDebtAccount', () => {
      it('returns true for credit_card', () => {
        expect(isDebtAccount('credit_card')).toBe(true);
      });

      it('returns true for line_of_credit', () => {
        expect(isDebtAccount('line_of_credit')).toBe(true);
      });

      it('returns false for bank_account', () => {
        expect(isDebtAccount('bank_account')).toBe(false);
      });

      it('returns false for cash', () => {
        expect(isDebtAccount('cash')).toBe(false);
      });
    });

    describe('formatBalanceForDisplay', () => {
      it('flips sign for credit card (debt accounts)', () => {
        expect(formatBalanceForDisplay(1500, 'credit_card')).toBe(-1500);
        expect(formatBalanceForDisplay(-100, 'credit_card')).toBe(100);
      });

      it('flips sign for line of credit', () => {
        expect(formatBalanceForDisplay(5000, 'line_of_credit')).toBe(-5000);
      });

      it('preserves sign for bank accounts', () => {
        expect(formatBalanceForDisplay(5000, 'bank_account')).toBe(5000);
      });

      it('preserves sign for cash', () => {
        expect(formatBalanceForDisplay(200, 'cash')).toBe(200);
      });
    });

    describe('getTypeDisplayName', () => {
      it('returns "Bank Account" for bank_account', () => {
        expect(getTypeDisplayName('bank_account')).toBe('Bank Account');
      });

      it('returns "Credit Card" for credit_card', () => {
        expect(getTypeDisplayName('credit_card')).toBe('Credit Card');
      });

      it('returns "Line of Credit" for line_of_credit', () => {
        expect(getTypeDisplayName('line_of_credit')).toBe('Line of Credit');
      });

      it('returns "Cash" for cash', () => {
        expect(getTypeDisplayName('cash')).toBe('Cash');
      });
    });

    describe('getTypeIcon', () => {
      it('returns bank icon for bank_account', () => {
        expect(getTypeIcon('bank_account')).toBe('🏦');
      });

      it('returns card icon for credit_card', () => {
        expect(getTypeIcon('credit_card')).toBe('💳');
      });

      it('returns ATM icon for line_of_credit', () => {
        expect(getTypeIcon('line_of_credit')).toBe('🏧');
      });

      it('returns cash icon for cash', () => {
        expect(getTypeIcon('cash')).toBe('💵');
      });
    });
  });

  describe('loadPaymentSources', () => {
    it('fetches payment sources from API and updates store', async () => {
      mockGet.mockResolvedValue(samplePaymentSources);

      await loadPaymentSources();

      expect(mockGet).toHaveBeenCalledWith('/api/payment-sources');
      expect(get(paymentSources)).toEqual(samplePaymentSources);
      expect(get(loading)).toBe(false);
      expect(get(error)).toBeNull();
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockGet.mockImplementation(() => {
        loadingDuringFetch = get(loading);
        return Promise.resolve([]);
      });

      await loadPaymentSources();

      expect(loadingDuringFetch).toBe(true);
      expect(get(loading)).toBe(false);
    });

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null);

      await loadPaymentSources();

      expect(get(paymentSources)).toEqual([]);
    });

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(loadPaymentSources()).rejects.toThrow('Network error');
      expect(get(error)).toBe('Network error');
      expect(get(loading)).toBe(false);
    });
  });

  describe('createPaymentSource', () => {
    it('calls API and reloads payment sources on success', async () => {
      const newSource = {
        name: 'New Account',
        type: 'bank_account' as const,
      };

      mockPost.mockResolvedValue({ id: 'ps-new', ...newSource });
      mockGet.mockResolvedValue(samplePaymentSources);

      await createPaymentSource(newSource);

      expect(mockPost).toHaveBeenCalledWith('/api/payment-sources', newSource);
      expect(mockGet).toHaveBeenCalledWith('/api/payment-sources');
    });

    it('sets error on API failure', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'));

      await expect(createPaymentSource({ name: '', type: 'bank_account' })).rejects.toThrow(
        'Validation failed'
      );
      expect(get(error)).toBe('Validation failed');
    });
  });

  describe('updatePaymentSource', () => {
    it('calls API with ID and updates, then reloads', async () => {
      mockPut.mockResolvedValue({ id: 'ps-1' });
      mockGet.mockResolvedValue(samplePaymentSources);

      await updatePaymentSource('ps-1', { name: 'Updated Account' });

      expect(mockPut).toHaveBeenCalledWith('/api/payment-sources', 'ps-1', {
        name: 'Updated Account',
      });
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockPut.mockRejectedValue(new Error('Not found'));

      await expect(updatePaymentSource('ps-999', { name: 'Missing' })).rejects.toThrow('Not found');
      expect(get(error)).toBe('Not found');
    });
  });

  describe('deletePaymentSource', () => {
    it('calls API and reloads on success', async () => {
      mockDelete.mockResolvedValue(null);
      mockGet.mockResolvedValue([]);

      await deletePaymentSource('ps-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/payment-sources', 'ps-1');
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockDelete.mockRejectedValue(new Error('Cannot delete'));

      await expect(deletePaymentSource('ps-1')).rejects.toThrow('Cannot delete');
      expect(get(error)).toBe('Cannot delete');
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      paymentSourcesStore.set({ paymentSources: [], loading: false, error: 'Some error' });

      clearError();

      expect(get(error)).toBeNull();
    });
  });

  describe('derived stores', () => {
    beforeEach(() => {
      paymentSourcesStore.set({
        paymentSources: samplePaymentSources,
        loading: false,
        error: null,
      });
    });

    describe('bankAccounts', () => {
      it('filters to only bank accounts', () => {
        const banks = get(bankAccounts);
        expect(banks).toHaveLength(2);
        expect(banks.every((p) => p.type === 'bank_account')).toBe(true);
      });
    });

    describe('cashSources', () => {
      it('filters to only cash sources', () => {
        const cash = get(cashSources);
        expect(cash).toHaveLength(1);
        expect(cash[0].name).toBe('Wallet');
      });
    });

    describe('assetAccounts', () => {
      it('includes bank accounts and cash', () => {
        const assets = get(assetAccounts);
        expect(assets).toHaveLength(3);
        expect(assets.every((p) => p.type === 'bank_account' || p.type === 'cash')).toBe(true);
      });
    });

    describe('creditCards', () => {
      it('filters to only credit cards', () => {
        const cards = get(creditCards);
        expect(cards).toHaveLength(1);
        expect(cards[0].name).toBe('Visa');
      });
    });

    describe('linesOfCredit', () => {
      it('filters to only lines of credit', () => {
        const loc = get(linesOfCredit);
        expect(loc).toHaveLength(1);
        expect(loc[0].name).toBe('Home Equity');
      });
    });

    describe('debtAccounts', () => {
      it('includes credit cards and lines of credit', () => {
        const debt = get(debtAccounts);
        expect(debt).toHaveLength(2);
        expect(debt.every((p) => isDebtAccount(p.type))).toBe(true);
      });
    });
  });
});
