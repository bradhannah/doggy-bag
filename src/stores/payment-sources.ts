import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

// Payment source types
export type PaymentSourceType = 'bank_account' | 'credit_card' | 'line_of_credit' | 'cash';

// Debt account types - balances represent money owed (displayed as negative)
export const DEBT_ACCOUNT_TYPES: PaymentSourceType[] = ['credit_card', 'line_of_credit'];

// Helper to check if a type is a debt account
export function isDebtAccount(type: PaymentSourceType): boolean {
  return DEBT_ACCOUNT_TYPES.includes(type);
}

// Helper to format balance for display based on account type
// Debt accounts: positive stored value = debt owed, displayed as negative
// Debt accounts: negative stored value = credit/overpayment, displayed as positive
export function formatBalanceForDisplay(balance: number, type: PaymentSourceType): number {
  if (isDebtAccount(type)) {
    return -balance; // Flip the sign for display
  }
  return balance;
}

// Helper to get display-friendly type name
export function getTypeDisplayName(type: PaymentSourceType): string {
  switch (type) {
    case 'bank_account': return 'Bank Account';
    case 'credit_card': return 'Credit Card';
    case 'line_of_credit': return 'Line of Credit';
    case 'cash': return 'Cash';
    default: return type;
  }
}

// Helper to get unicode icon for account type
export function getTypeIcon(type: PaymentSourceType): string {
  switch (type) {
    case 'bank_account': return '🏦';
    case 'credit_card': return '💳';
    case 'line_of_credit': return '🏧';
    case 'cash': return '💵';
    default: return '💰';
  }
}

export interface PaymentSource {
  id: string;
  name: string;
  type: PaymentSourceType;
  balance: number;
  is_active: boolean;
  exclude_from_leftover?: boolean;  // If true, balance not included in leftover calculation
  pay_off_monthly?: boolean;        // If true, auto-generate payoff bill (implies exclude_from_leftover)
  created_at: string;
  updated_at: string;
}

export interface PaymentSourceData {
  name: string;
  type: PaymentSourceType;
  balance: number;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
}

type PaymentSourceState = {
  paymentSources: PaymentSource[];
  loading: boolean;
  error: string | null;
};

const initialState: PaymentSourceState = {
  paymentSources: [],
  loading: false,
  error: null
};

const store = writable<PaymentSourceState>(initialState);

export const paymentSources = derived(store, s => s.paymentSources);
export const loading = derived(store, s => s.loading);
export const error = derived(store, s => s.error);

// Asset accounts (positive balance = money you have)
export const bankAccounts = derived(paymentSources, ps => 
  ps.filter(p => p.type === 'bank_account')
);
export const cashSources = derived(paymentSources, ps => 
  ps.filter(p => p.type === 'cash')
);
export const assetAccounts = derived(paymentSources, ps => 
  ps.filter(p => p.type === 'bank_account' || p.type === 'cash')
);

// Debt accounts (positive balance = money you owe)
export const creditCards = derived(paymentSources, ps => 
  ps.filter(p => p.type === 'credit_card')
);
export const linesOfCredit = derived(paymentSources, ps => 
  ps.filter(p => p.type === 'line_of_credit')
);
export const debtAccounts = derived(paymentSources, ps => 
  ps.filter(p => isDebtAccount(p.type))
);

export async function loadPaymentSources() {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    const data = await apiClient.get('/api/payment-sources');
    const paymentSources = (data || []) as PaymentSource[];
    store.update(s => ({ ...s, paymentSources, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load payment sources');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function createPaymentSource(data: PaymentSourceData) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.post('/api/payment-sources', data);
    await loadPaymentSources();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create payment source');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updatePaymentSource(id: string, updates: Partial<PaymentSourceData>) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.put('/api/payment-sources', id, updates);
    await loadPaymentSources();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update payment source');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deletePaymentSource(id: string) {
  store.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    await apiClient.delete('/api/payment-sources', id);
    await loadPaymentSources();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete payment source');
    store.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearError() {
  store.update(s => ({ ...s, error: null }));
}

export const paymentSourcesStore = store;
