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
  return {
    id: instance.id,
    bill_id: instance.bill_id ?? null,
    month: instance.month,
    amount: instance.amount ?? 0,
    expected_amount: instance.expected_amount ?? instance.amount ?? 0,
    actual_amount: instance.actual_amount ?? (instance.is_paid ? instance.amount : undefined),
    payments: instance.payments ?? [],
    is_default: instance.is_default ?? false,
    is_paid: instance.is_paid ?? false,
    is_adhoc: instance.is_adhoc ?? false,
    due_date: instance.due_date ?? undefined,
    name: instance.name ?? undefined,
    category_id: instance.category_id ?? undefined,
    payment_source_id: instance.payment_source_id ?? undefined,
    created_at: instance.created_at ?? new Date().toISOString(),
    updated_at: instance.updated_at ?? new Date().toISOString()
  };
}

/**
 * Migrate an IncomeInstance from old schema to new schema
 * Adds new fields with sensible defaults if missing
 */
export function migrateIncomeInstance(instance: any): IncomeInstance {
  return {
    id: instance.id,
    income_id: instance.income_id ?? null,
    month: instance.month,
    amount: instance.amount ?? 0,
    expected_amount: instance.expected_amount ?? instance.amount ?? 0,
    actual_amount: instance.actual_amount ?? (instance.is_paid ? instance.amount : undefined),
    is_default: instance.is_default ?? false,
    is_paid: instance.is_paid ?? false,
    is_adhoc: instance.is_adhoc ?? false,
    due_date: instance.due_date ?? undefined,
    name: instance.name ?? undefined,
    category_id: instance.category_id ?? undefined,
    payment_source_id: instance.payment_source_id ?? undefined,
    created_at: instance.created_at ?? new Date().toISOString(),
    updated_at: instance.updated_at ?? new Date().toISOString()
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
    instance.is_adhoc === undefined
  );
}

/**
 * Check if an IncomeInstance needs migration
 */
export function needsIncomeInstanceMigration(instance: any): boolean {
  return (
    instance.expected_amount === undefined ||
    instance.is_adhoc === undefined
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
