import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

// Payment source types
export type PaymentSourceType =
  | 'bank_account'
  | 'credit_card'
  | 'line_of_credit'
  | 'cash'
  | 'investment';

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
    case 'bank_account':
      return 'Bank Account';
    case 'credit_card':
      return 'Credit Card';
    case 'line_of_credit':
      return 'Line of Credit';
    case 'cash':
      return 'Cash';
    case 'investment':
      return 'Investment Account';
    default:
      return type;
  }
}

// Helper to get unicode icon for account type
export function getTypeIcon(type: PaymentSourceType): string {
  switch (type) {
    case 'bank_account':
      return '🏦';
    case 'credit_card':
      return '💳';
    case 'line_of_credit':
      return '🏧';
    case 'cash':
      return '💵';
    case 'investment':
      return '📈';
    default:
      return '💰';
  }
}

/**
 * PaymentSourceMetadata - Metadata fields for Payment Sources
 * Fields are conditional based on payment source type:
 * - last_four_digits: All types
 * - credit_limit: credit_card, line_of_credit
 * - interest_rate: All types
 * - interest_rate_cash_advance: credit_card only
 * - is_variable_rate: line_of_credit, savings, investment
 * - statement_day: credit_card, line_of_credit
 * - account_url: All types
 * - notes: All types
 */
export interface PaymentSourceMetadata {
  last_four_digits?: string; // Last 4 digits of account/card number
  credit_limit?: number; // Credit limit in cents (credit_card, line_of_credit)
  interest_rate?: number; // Interest rate as decimal (e.g., 0.1999 for 19.99%)
  interest_rate_cash_advance?: number; // Cash advance rate (credit_card only)
  is_variable_rate?: boolean; // True if rate is variable (line_of_credit, savings, investment)
  statement_day?: number; // Day of month statement closes (1-31)
  account_url?: string; // URL to manage account
  notes?: string; // Freeform notes
}

export interface PaymentSource {
  id: string;
  name: string;
  type: PaymentSourceType;
  is_active: boolean;
  exclude_from_leftover?: boolean; // If true, balance not included in leftover calculation
  pay_off_monthly?: boolean; // If true, auto-generate payoff bill (implies exclude_from_leftover)
  is_savings?: boolean; // If true, this is a savings account (mutually exclusive with is_investment and pay_off_monthly)
  is_investment?: boolean; // If true, this is an investment account (mutually exclusive with is_savings and pay_off_monthly)
  metadata?: PaymentSourceMetadata; // Optional metadata (last 4, limits, rates, etc.)
  created_at: string;
  updated_at: string;
}

export interface PaymentSourceData {
  name: string;
  type: PaymentSourceType;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
  is_savings?: boolean;
  is_investment?: boolean;
  metadata?: PaymentSourceMetadata;
}

type PaymentSourceState = {
  paymentSources: PaymentSource[];
  loading: boolean;
  error: string | null;
};

const initialState: PaymentSourceState = {
  paymentSources: [],
  loading: false,
  error: null,
};

const store = writable<PaymentSourceState>(initialState);

export const paymentSources = derived(store, (s) => s.paymentSources);
export const loading = derived(store, (s) => s.loading);
export const error = derived(store, (s) => s.error);

// Asset accounts (positive balance = money you have)
export const bankAccounts = derived(paymentSources, (ps) =>
  ps.filter((p) => p.type === 'bank_account')
);
export const cashSources = derived(paymentSources, (ps) => ps.filter((p) => p.type === 'cash'));
export const assetAccounts = derived(paymentSources, (ps) =>
  ps.filter((p) => p.type === 'bank_account' || p.type === 'cash')
);

// Debt accounts (positive balance = money you owe)
export const creditCards = derived(paymentSources, (ps) =>
  ps.filter((p) => p.type === 'credit_card')
);
export const linesOfCredit = derived(paymentSources, (ps) =>
  ps.filter((p) => p.type === 'line_of_credit')
);
export const debtAccounts = derived(paymentSources, (ps) =>
  ps.filter((p) => isDebtAccount(p.type))
);

// Savings and investment accounts
export const savingsAccounts = derived(paymentSources, (ps) =>
  ps.filter((p) => p.is_savings === true)
);
export const investmentAccounts = derived(paymentSources, (ps) =>
  ps.filter((p) => p.is_investment === true || p.type === 'investment')
);
export const savingsAndInvestmentAccounts = derived(paymentSources, (ps) =>
  ps.filter((p) => p.is_savings === true || p.is_investment === true || p.type === 'investment')
);

export async function loadPaymentSources() {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.get('/api/payment-sources');
    const paymentSources = (data || []) as PaymentSource[];
    store.update((s) => ({ ...s, paymentSources, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load payment sources');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function createPaymentSource(data: {
  name: string;
  type: PaymentSourceType;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
  is_savings?: boolean;
  is_investment?: boolean;
  metadata?: PaymentSourceMetadata;
}) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.post('/api/payment-sources', data);
    await loadPaymentSources();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create payment source');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updatePaymentSource(
  id: string,
  updates: Partial<{
    name: string;
    type: PaymentSourceType;
    exclude_from_leftover?: boolean;
    pay_off_monthly?: boolean;
    is_savings?: boolean;
    is_investment?: boolean;
    metadata?: PaymentSourceMetadata;
  }>
) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.put('/api/payment-sources', id, updates);
    await loadPaymentSources();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update payment source');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deletePaymentSource(id: string) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.delete('/api/payment-sources', id);
    await loadPaymentSources();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete payment source');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearError() {
  store.update((s) => ({ ...s, error: null }));
}

export const paymentSourcesStore = store;
