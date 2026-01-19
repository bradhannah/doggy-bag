// Payments Store - Manages partial payments operations
import { writable } from 'svelte/store';

export interface Payment {
  id: string;
  amount: number;
  date: string;
  created_at: string;
}

interface PaymentsState {
  loading: boolean;
  error: string | null;
}

function createPaymentsStore() {
  const { subscribe, update } = writable<PaymentsState>({
    loading: false,
    error: null,
  });

  return {
    subscribe,

    async addPayment(
      month: string,
      billInstanceId: string,
      amount: number,
      date?: string
    ): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        throw new Error('Instance-level payments have been removed. Use occurrences instead.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add payment';
        update((state) => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    async updatePayment(
      month: string,
      billInstanceId: string,
      paymentId: string,
      amount: number,
      date: string
    ): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        throw new Error('Instance-level payments have been removed. Use occurrences instead.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update payment';
        update((state) => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    async removePayment(month: string, billInstanceId: string, paymentId: string): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        throw new Error('Instance-level payments have been removed. Use occurrences instead.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove payment';
        update((state) => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    // ============================================================================
    // Income Payment Methods
    // ============================================================================

    async addIncomePayment(
      month: string,
      incomeInstanceId: string,
      amount: number,
      date?: string
    ): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        throw new Error('Instance-level payments have been removed. Use occurrences instead.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add receipt';
        update((state) => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    async updateIncomePayment(
      month: string,
      incomeInstanceId: string,
      paymentId: string,
      amount: number,
      date: string
    ): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        throw new Error('Instance-level payments have been removed. Use occurrences instead.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update receipt';
        update((state) => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    async removeIncomePayment(
      month: string,
      incomeInstanceId: string,
      paymentId: string
    ): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        throw new Error('Instance-level payments have been removed. Use occurrences instead.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove receipt';
        update((state) => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    clearError() {
      update((state) => ({ ...state, error: null }));
    },
  };
}

export const payments = createPaymentsStore();
