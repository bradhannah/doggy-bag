// Payments Store - Manages partial payments operations
import { writable } from 'svelte/store';
import { apiClient } from '../lib/api/client';

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
    error: null
  });

  return {
    subscribe,

    async addPayment(month: string, billInstanceId: string, amount: number, date?: string): Promise<void> {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const payload: { amount: number; date?: string } = { amount };
        if (date) payload.date = date;
        
        const response = await fetch(`http://localhost:3000/api/months/${month}/bills/${billInstanceId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add payment');
        }
        
        update(state => ({ ...state, loading: false }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add payment';
        update(state => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    async updatePayment(month: string, billInstanceId: string, paymentId: string, amount: number, date: string): Promise<void> {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await fetch(`http://localhost:3000/api/months/${month}/bills/${billInstanceId}/payments/${paymentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, date })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update payment');
        }
        
        update(state => ({ ...state, loading: false }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update payment';
        update(state => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    async removePayment(month: string, billInstanceId: string, paymentId: string): Promise<void> {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await fetch(`http://localhost:3000/api/months/${month}/bills/${billInstanceId}/payments/${paymentId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to remove payment');
        }
        
        update(state => ({ ...state, loading: false }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove payment';
        update(state => ({ ...state, loading: false, error: message }));
        throw err;
      }
    },

    clearError() {
      update(state => ({ ...state, error: null }));
    }
  };
}

export const payments = createPaymentsStore();
