// Migration Utilities for 002-detailed-monthly-view
// Handles backward-compatible migration of existing data to new schema

import type { BillInstance, IncomeInstance, Category, Payment } from '../types';

// Default color palette for categories
const DEFAULT_COLORS: Record<string, string> = {
  'Home': '#3b82f6',
  'Debt': '#ef4444',
  'Utilities': '#f59e0b',
  'Streaming': '#8b5cf6',
  'Transportation': '#10b981',
  'Entertainment': '#ec4899',
  'Insurance': '#06b6d4',
  'Subscriptions': '#6366f1',
  'Variable': '#f97316',
  'Ad-hoc': '#64748b',
  'Salary': '#10b981',
  'Freelance/Contract': '#8b5cf6',
  'Investment': '#3b82f6',
  'Government': '#f59e0b',
  'Other': '#64748b'
};

/**
 * Get default color for a category by name
 */
export function getDefaultColor(name: string): string {
  return DEFAULT_COLORS[name] || '#6b7280'; // gray-500 as fallback
}

/**
 * Migrate a BillInstance from old schema to new schema
 * Adds new fields with sensible defaults if missing
 */
export function migrateBillInstance(instance: any): BillInstance {
  const now = new Date().toISOString();
  
  // Create a default occurrence if occurrences is missing
  const occurrences = instance.occurrences ?? [{
    id: crypto.randomUUID(),
    sequence: 1,
    expected_date: instance.due_date || `${instance.month}-01`,
    expected_amount: instance.expected_amount ?? instance.amount ?? 0,
    is_closed: instance.is_closed ?? instance.is_paid ?? false,
    closed_date: instance.closed_date,
    payments: instance.payments ?? [],
    is_adhoc: instance.is_adhoc ?? false,
    created_at: instance.created_at ?? now,
    updated_at: instance.updated_at ?? now
  }];
  
  return {
    id: instance.id,
    bill_id: instance.bill_id ?? null,
    month: instance.month,
    billing_period: instance.billing_period ?? 'monthly',
    expected_amount: instance.expected_amount ?? instance.amount ?? 0,
    occurrences,
    is_default: instance.is_default ?? false,
    is_closed: instance.is_closed ?? instance.is_paid ?? false,
    is_adhoc: instance.is_adhoc ?? false,
    closed_date: instance.closed_date ?? undefined,
    name: instance.name ?? undefined,
    category_id: instance.category_id ?? undefined,
    payment_source_id: instance.payment_source_id ?? undefined,
    created_at: instance.created_at ?? now,
    updated_at: instance.updated_at ?? now
  };
}

/**
 * Migrate an IncomeInstance from old schema to new schema
 * Adds new fields with sensible defaults if missing
 */
export function migrateIncomeInstance(instance: any): IncomeInstance {
  const now = new Date().toISOString();
  
  // Create a default occurrence if occurrences is missing
  const occurrences = instance.occurrences ?? [{
    id: crypto.randomUUID(),
    sequence: 1,
    expected_date: instance.due_date || `${instance.month}-01`,
    expected_amount: instance.expected_amount ?? instance.amount ?? 0,
    is_closed: instance.is_closed ?? instance.is_paid ?? false,
    closed_date: instance.closed_date,
    payments: instance.payments ?? [],
    is_adhoc: instance.is_adhoc ?? false,
    created_at: instance.created_at ?? now,
    updated_at: instance.updated_at ?? now
  }];
  
  return {
    id: instance.id,
    income_id: instance.income_id ?? null,
    month: instance.month,
    billing_period: instance.billing_period ?? 'monthly',
    expected_amount: instance.expected_amount ?? instance.amount ?? 0,
    occurrences,
    is_default: instance.is_default ?? false,
    is_closed: instance.is_closed ?? instance.is_paid ?? false,
    is_adhoc: instance.is_adhoc ?? false,
    closed_date: instance.closed_date ?? undefined,
    name: instance.name ?? undefined,
    category_id: instance.category_id ?? undefined,
    payment_source_id: instance.payment_source_id ?? undefined,
    created_at: instance.created_at ?? now,
    updated_at: instance.updated_at ?? now
  };
}

/**
 * Migrate a Category from old schema to new schema
 * Adds sort_order, color, and type fields if missing
 */
export function migrateCategory(category: any, index: number): Category {
  return {
    id: category.id,
    name: category.name,
    is_predefined: category.is_predefined ?? false,
    sort_order: category.sort_order ?? index,
    color: category.color ?? getDefaultColor(category.name),
    type: category.type ?? 'bill', // Default to 'bill' for existing categories
    created_at: category.created_at ?? new Date().toISOString(),
    updated_at: category.updated_at ?? new Date().toISOString()
  };
}

/**
 * Check if a BillInstance needs migration
 */
export function needsBillInstanceMigration(instance: any): boolean {
  return (
    instance.expected_amount === undefined ||
    instance.payments === undefined ||
    instance.is_adhoc === undefined ||
    instance.is_closed === undefined ||
    instance.billing_period === undefined ||
    instance.occurrences === undefined
  );
}

/**
 * Check if an IncomeInstance needs migration
 */
export function needsIncomeInstanceMigration(instance: any): boolean {
  return (
    instance.expected_amount === undefined ||
    instance.is_adhoc === undefined ||
    instance.payments === undefined ||
    instance.is_closed === undefined ||
    instance.billing_period === undefined ||
    instance.occurrences === undefined
  );
}

/**
 * Check if a Category needs migration
 */
export function needsCategoryMigration(category: any): boolean {
  return (
    category.sort_order === undefined ||
    category.color === undefined ||
    category.type === undefined
  );
}
