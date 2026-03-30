// Migration Utilities for 002-detailed-monthly-view
// Handles backward-compatible migration of existing data to new schema

import type { Bill, Income, BillInstance, IncomeInstance, Category, BillingPeriod } from '../types';
import { getOccurrenceDatesInMonth } from './occurrences';

// Legacy data types for migration (data with unknown shapes from old schemas)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyData = Record<string, any>;

// Default color palette for categories
const DEFAULT_COLORS: Record<string, string> = {
  Home: '#3b82f6',
  Debt: '#ef4444',
  Utilities: '#f59e0b',
  Streaming: '#8b5cf6',
  Transportation: '#10b981',
  Entertainment: '#ec4899',
  Insurance: '#06b6d4',
  Subscriptions: '#6366f1',
  Variable: '#f97316',
  'Ad-hoc': '#64748b',
  Salary: '#10b981',
  'Freelance/Contract': '#8b5cf6',
  Investment: '#3b82f6',
  Government: '#f59e0b',
  Other: '#64748b',
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
export function migrateBillInstance(instance: LegacyData): BillInstance {
  const now = new Date().toISOString();
  const legacyPayments = Array.isArray(instance.payments) ? instance.payments : [];

  // Create a default occurrence if occurrences is missing
  const fallbackOccurrence = {
    id: crypto.randomUUID(),
    sequence: 1,
    expected_date: instance.due_date || `${instance.month}-01`,
    expected_amount: instance.expected_amount ?? instance.amount ?? 0,
    is_closed: instance.is_closed ?? false,
    closed_date: instance.closed_date,
    payments: [],
    is_adhoc: instance.is_adhoc ?? false,
    created_at: instance.created_at ?? now,
    updated_at: instance.updated_at ?? now,
  };

  const isInstanceClosed = instance.is_closed ?? instance.is_paid ?? false;

  const occurrences = (instance.occurrences ?? [fallbackOccurrence]).map(
    (occ: LegacyData, index: number) => ({
      ...occ,
      sequence: occ.sequence ?? index + 1,
      expected_date: occ.expected_date ?? instance.due_date ?? `${instance.month}-01`,
      expected_amount: occ.expected_amount ?? instance.expected_amount ?? instance.amount ?? 0,
      is_closed: isInstanceClosed
        ? true
        : (occ.is_closed ?? instance.is_closed ?? instance.is_paid ?? false),
      closed_date: occ.closed_date ?? instance.closed_date,
      payments: Array.isArray(occ.payments) ? occ.payments : [],
      is_adhoc: occ.is_adhoc ?? instance.is_adhoc ?? false,
      created_at: occ.created_at ?? instance.created_at ?? now,
      updated_at: occ.updated_at ?? instance.updated_at ?? now,
    })
  );

  if (legacyPayments.length > 0 && occurrences.length > 0) {
    occurrences[0].payments = [...occurrences[0].payments, ...legacyPayments];
  }

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
    is_payoff_bill: instance.is_payoff_bill ?? undefined,
    payoff_source_id: instance.payoff_source_id ?? undefined,
    closed_date: instance.closed_date ?? undefined,
    name: instance.name ?? undefined,
    category_id: instance.category_id ?? undefined,
    payment_source_id: instance.payment_source_id ?? undefined,
    metadata: instance.metadata ?? undefined,
    created_at: instance.created_at ?? now,
    updated_at: instance.updated_at ?? now,
  };
}

/**
 * Migrate an IncomeInstance from old schema to new schema
 * Adds new fields with sensible defaults if missing
 */
export function migrateIncomeInstance(instance: LegacyData): IncomeInstance {
  const now = new Date().toISOString();
  const legacyPayments = Array.isArray(instance.payments) ? instance.payments : [];

  // Create a default occurrence if occurrences is missing
  const fallbackOccurrence = {
    id: crypto.randomUUID(),
    sequence: 1,
    expected_date: instance.due_date || `${instance.month}-01`,
    expected_amount: instance.expected_amount ?? instance.amount ?? 0,
    is_closed: instance.is_closed ?? false,
    closed_date: instance.closed_date,
    payments: [],
    is_adhoc: instance.is_adhoc ?? false,
    created_at: instance.created_at ?? now,
    updated_at: instance.updated_at ?? now,
  };

  const isInstanceClosed = instance.is_closed ?? instance.is_paid ?? false;

  const occurrences = (instance.occurrences ?? [fallbackOccurrence]).map(
    (occ: LegacyData, index: number) => ({
      ...occ,
      sequence: occ.sequence ?? index + 1,
      expected_date: occ.expected_date ?? instance.due_date ?? `${instance.month}-01`,
      expected_amount: occ.expected_amount ?? instance.expected_amount ?? instance.amount ?? 0,
      is_closed: isInstanceClosed
        ? true
        : (occ.is_closed ?? instance.is_closed ?? instance.is_paid ?? false),
      closed_date: occ.closed_date ?? instance.closed_date,
      payments: Array.isArray(occ.payments) ? occ.payments : [],
      is_adhoc: occ.is_adhoc ?? instance.is_adhoc ?? false,
      created_at: occ.created_at ?? instance.created_at ?? now,
      updated_at: occ.updated_at ?? instance.updated_at ?? now,
    })
  );

  if (legacyPayments.length > 0 && occurrences.length > 0) {
    occurrences[0].payments = [...occurrences[0].payments, ...legacyPayments];
  }

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
    metadata: instance.metadata ?? undefined,
    created_at: instance.created_at ?? now,
    updated_at: instance.updated_at ?? now,
  };
}

/**
 * Migrate a Category from old schema to new schema
 * Adds sort_order, color, and type fields if missing
 */
export function migrateCategory(category: LegacyData, index: number): Category {
  return {
    id: category.id,
    name: category.name,
    is_predefined: category.is_predefined ?? false,
    sort_order: category.sort_order ?? index,
    color: category.color ?? getDefaultColor(category.name),
    type: category.type ?? 'bill', // Default to 'bill' for existing categories
    created_at: category.created_at ?? new Date().toISOString(),
    updated_at: category.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Check if a BillInstance needs migration
 */
export function needsBillInstanceMigration(instance: LegacyData): boolean {
  // Check for missing fields
  if (
    instance.expected_amount === undefined ||
    instance.is_adhoc === undefined ||
    instance.is_closed === undefined ||
    instance.billing_period === undefined ||
    instance.occurrences === undefined
  ) {
    return true;
  }

  // Check for legacy payments field that should be migrated to occurrences
  // The BillInstance type no longer has a payments field - all payments should be in occurrences
  if (Array.isArray(instance.payments) && instance.payments.length > 0) {
    return true;
  }

  // Check for state mismatch: Parent is closed/paid but has open occurrences
  // This triggers a re-migration to fix the state
  const isParentClosed = instance.is_closed === true || instance.is_paid === true;
  if (isParentClosed && Array.isArray(instance.occurrences)) {
    const hasOpenOccurrence = instance.occurrences.some((occ: LegacyData) => !occ.is_closed);
    if (hasOpenOccurrence) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an IncomeInstance needs migration
 */
export function needsIncomeInstanceMigration(instance: LegacyData): boolean {
  // Check for missing fields
  if (
    instance.expected_amount === undefined ||
    instance.is_adhoc === undefined ||
    instance.is_closed === undefined ||
    instance.billing_period === undefined ||
    instance.occurrences === undefined
  ) {
    return true;
  }

  // Check for legacy payments field that should be migrated to occurrences
  // The IncomeInstance type no longer has a payments field - all payments should be in occurrences
  if (Array.isArray(instance.payments) && instance.payments.length > 0) {
    return true;
  }

  // Check for state mismatch: Parent is closed/paid but has open occurrences
  const isParentClosed = instance.is_closed === true || instance.is_paid === true;
  if (isParentClosed && Array.isArray(instance.occurrences)) {
    const hasOpenOccurrence = instance.occurrences.some((occ: LegacyData) => !occ.is_closed);
    if (hasOpenOccurrence) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a Category needs migration
 */
export function needsCategoryMigration(category: LegacyData): boolean {
  return (
    category.sort_order === undefined || category.color === undefined || category.type === undefined
  );
}

// ============================================================================
// Occurrence Date Migration (UTC off-by-one fix)
//
// Prior to this fix, `new Date("YYYY-MM-DD")` was used to parse start_date
// strings, which produces UTC midnight. In timezones west of UTC, local-time
// methods then shift the date back by one day, causing all recurring dates
// (bi-weekly, weekly, semi-annual) to land on the wrong day-of-week.
//
// This migration recalculates expected_date on OPEN occurrences of non-monthly
// instances using the corrected parseLocalDate() logic in occurrences.ts.
// Closed occurrences are left untouched (their dates are historical records).
// ============================================================================

/**
 * Migrate occurrence dates on bill instances to fix UTC off-by-one.
 *
 * @param instances  Bill instances from a single month
 * @param billMap    Map of bill entities by ID (for start_date lookup)
 * @param month      The month string (YYYY-MM)
 * @returns { instances, changed } — the possibly-updated array and a flag
 */
export function migrateOccurrenceDatesBills(
  instances: BillInstance[],
  billMap: Map<string, Bill>,
  month: string
): { instances: BillInstance[]; changed: boolean } {
  let changed = false;

  const result = instances.map((inst) => {
    // Skip monthly, ad-hoc, payoff, virtual, and fully-closed instances
    if (
      inst.billing_period === 'monthly' ||
      inst.is_adhoc ||
      inst.is_payoff_bill ||
      inst.is_virtual ||
      !inst.bill_id
    ) {
      return inst;
    }

    const bill = billMap.get(inst.bill_id);
    if (!bill || !bill.start_date) return inst;

    const updated = recalcOccurrenceDates(
      inst.occurrences,
      inst.billing_period as BillingPeriod,
      bill.start_date,
      bill.day_of_month,
      month
    );

    if (!updated) return inst;

    changed = true;
    return {
      ...inst,
      occurrences: updated,
      updated_at: new Date().toISOString(),
    };
  });

  return { instances: result, changed };
}

/**
 * Migrate occurrence dates on income instances to fix UTC off-by-one.
 *
 * @param instances   Income instances from a single month
 * @param incomeMap   Map of income entities by ID (for start_date lookup)
 * @param month       The month string (YYYY-MM)
 * @returns { instances, changed } — the possibly-updated array and a flag
 */
export function migrateOccurrenceDatesIncomes(
  instances: IncomeInstance[],
  incomeMap: Map<string, Income>,
  month: string
): { instances: IncomeInstance[]; changed: boolean } {
  let changed = false;

  const result = instances.map((inst) => {
    // Skip monthly, ad-hoc, virtual, and fully-closed instances
    if (inst.billing_period === 'monthly' || inst.is_adhoc || inst.is_virtual || !inst.income_id) {
      return inst;
    }

    const income = incomeMap.get(inst.income_id);
    if (!income || !income.start_date) return inst;

    const updated = recalcOccurrenceDates(
      inst.occurrences,
      inst.billing_period as BillingPeriod,
      income.start_date,
      income.day_of_month,
      month
    );

    if (!updated) return inst;

    changed = true;
    return {
      ...inst,
      occurrences: updated,
      updated_at: new Date().toISOString(),
    };
  });

  return { instances: result, changed };
}

/**
 * Recalculate occurrence dates for a single instance's occurrences.
 * Returns null if no changes are needed, or the updated occurrences array.
 *
 * Rules:
 * - Closed occurrences are never modified (historical records).
 * - Ad-hoc occurrences are never modified (user-created dates).
 * - Open non-adhoc occurrences have their expected_date corrected.
 * - If the correct date count differs from open occurrence count, extra
 *   correct dates are ignored (user may have manually deleted occurrences)
 *   and extra open occurrences keep their current dates.
 */
function recalcOccurrenceDates(
  occurrences: BillInstance['occurrences'],
  billingPeriod: BillingPeriod,
  startDate: string,
  dayOfMonth: number | undefined,
  month: string
): BillInstance['occurrences'] | null {
  // Generate the correct dates
  const correctDates = getOccurrenceDatesInMonth(billingPeriod, startDate, dayOfMonth, month);

  // Separate occurrences into frozen (closed or adhoc) and fixable (open, non-adhoc)
  const frozen = occurrences.filter((occ) => occ.is_closed || occ.is_adhoc);
  const fixable = occurrences.filter((occ) => !occ.is_closed && !occ.is_adhoc);

  // Sort fixable by sequence to maintain ordering
  fixable.sort((a, b) => a.sequence - b.sequence);

  // Check if any date actually changed
  let anyChanged = false;
  const updatedFixable = fixable.map((occ, i) => {
    if (i < correctDates.length && occ.expected_date !== correctDates[i]) {
      anyChanged = true;
      return {
        ...occ,
        expected_date: correctDates[i],
        updated_at: new Date().toISOString(),
      };
    }
    return occ;
  });

  if (!anyChanged) return null;

  // Rebuild the full occurrences array: frozen first, then updated fixable,
  // re-sorted by expected_date and re-sequenced.
  const all = [...frozen, ...updatedFixable];
  all.sort((a, b) => a.expected_date.localeCompare(b.expected_date));
  return all.map((occ, i) => ({ ...occ, sequence: i + 1 }));
}
