// Mock Data for UI Component Prototyping
// This provides sample data for testing widget variations

export interface MockBill {
  id: string;
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  payment_source_id: string;
  category_id?: string;
}

export interface MockIncome {
  id: string;
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  payment_source_id: string;
}

export interface MockPaymentSource {
  id: string;
  name: string;
  type: 'bank_account' | 'credit_card' | 'cash';
  balance: number;
}

export const mockBills: MockBill[] = [
  {
    id: '1',
    name: 'Rent',
    amount: 150000,
    billing_period: 'monthly',
    payment_source_id: '1',
  },
  {
    id: '2',
    name: 'Internet',
    amount: 8000,
    billing_period: 'monthly',
    payment_source_id: '1',
  },
  {
    id: '3',
    name: 'Car Insurance',
    amount: 12000,
    billing_period: 'monthly',
    payment_source_id: '2',
  },
  {
    id: '4',
    name: 'Groceries Delivery',
    amount: 15000,
    billing_period: 'bi_weekly',
    payment_source_id: '3',
  },
  {
    id: '5',
    name: 'Netflix',
    amount: 1500,
    billing_period: 'monthly',
    payment_source_id: '1',
  },
];

export const mockIncomes: MockIncome[] = [
  {
    id: '1',
    name: 'Salary',
    amount: 500000,
    billing_period: 'bi_weekly',
    payment_source_id: '1',
  },
  {
    id: '2',
    name: 'Freelance',
    amount: 50000,
    billing_period: 'monthly',
    payment_source_id: '1',
  },
  {
    id: '3',
    name: 'Bonus',
    amount: 100000,
    billing_period: 'semi_annually',
    payment_source_id: '1',
  },
];

export const mockPaymentSources: MockPaymentSource[] = [
  {
    id: '1',
    name: 'Scotia Checking',
    type: 'bank_account',
    balance: 250000,
  },
  {
    id: '2',
    name: 'Visa',
    type: 'credit_card',
    balance: -5000,
  },
  {
    id: '3',
    name: 'Cash',
    type: 'cash',
    balance: 20000,
  },
];

export const mockMonths = ['2025-01', '2025-02', '2025-03'];

export const categories = [
  'Housing',
  'Utilities',
  'Food & Groceries',
  'Transportation',
  'Insurance',
  'Entertainment',
  'Healthcare',
  'Other',
];

export const billingPeriods = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_weekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'semi_annually', label: 'Semi-annually' },
];

export const paymentSourceTypes = [
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
];
