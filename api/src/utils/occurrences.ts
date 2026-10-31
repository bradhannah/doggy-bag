// Occurrence Generation Utilities
// Calculate individual payment occurrences for bills/incomes within a month

import type { Bill, Income, Occurrence, BillingPeriod } from '../types';
import { parseLocalDate } from './due-date';
import { ValidationError } from './errors';

export interface OccurrenceEdits {
  expected_amount?: number;
  expected_date?: string;
}

// Apply edits before closing/splitting, so the persisted payment matches its preview.
export function applyOccurrenceEdits(
  occurrence: Occurrence,
  edits: OccurrenceEdits,
  month: string
): Occurrence {
  if (
    edits.expected_amount !== undefined &&
    (!Number.isSafeInteger(edits.expected_amount) || edits.expected_amount < 0)
  ) {
    throw new ValidationError('Amount must be a non-negative integer in cents');
  }
  if (edits.expected_date !== undefined) {
    const date = edits.expected_date;
    const [year, monthNumber, day] = typeof date === 'string' ? date.split('-').map(Number) : [];
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date.slice(0, 7) !== month ||
      monthNumber < 1 ||
      monthNumber > 12 ||
      day < 1 ||
      day > new Date(year, monthNumber, 0).getDate()
    ) {
      throw new ValidationError('Due date must be a valid date within the budget month');
    }
  }
  return {
    ...occurrence,
    expected_amount: edits.expected_amount ?? occurrence.expected_amount,
    expected_date: edits.expected_date ?? occurrence.expected_date,
  };
}

/**
 * Generate occurrences for a bill within a specific month
 */
export function generateBillOccurrences(
  bill: Bill,
  month: string // "2026-01"
): Occurrence[] {
  const occurrences = generateOccurrences(
    bill.billing_period,
    bill.amount,
    bill.start_date,
    bill.day_of_month,
    month,
    bill.recurrence_week,
    bill.recurrence_day
  );
  const effectiveFrom =
    bill.effective_from ?? (bill.billing_period === 'monthly' ? bill.start_date : undefined);
  return effectiveFrom
    ? occurrences.filter((occurrence) => occurrence.expected_date >= effectiveFrom)
    : occurrences;
}

/**
 * Generate occurrences for an income within a specific month
 */
export function generateIncomeOccurrences(
  income: Income,
  month: string // "2026-01"
): Occurrence[] {
  const occurrences = generateOccurrences(
    income.billing_period,
    income.amount,
    income.start_date,
    income.day_of_month,
    month,
    income.recurrence_week,
    income.recurrence_day
  );
  const effectiveFrom =
    income.effective_from ?? (income.billing_period === 'monthly' ? income.start_date : undefined);
  return effectiveFrom
    ? occurrences.filter((occurrence) => occurrence.expected_date >= effectiveFrom)
    : occurrences;
}

/**
 * Core occurrence generation logic
 * Generates occurrences without the legacy payments[] array
 */
export function generateOccurrences(
  billingPeriod: BillingPeriod,
  amount: number,
  startDate: string | undefined,
  dayOfMonth: number | undefined,
  month: string,
  recurrenceWeek?: number,
  recurrenceDay?: number
): Occurrence[] {
  const now = new Date().toISOString();
  const dates = getOccurrenceDatesInMonth(
    billingPeriod,
    startDate,
    dayOfMonth,
    month,
    recurrenceWeek,
    recurrenceDay
  );

  return dates.map((date, index) => ({
    id: crypto.randomUUID(),
    sequence: index + 1,
    expected_date: date,
    expected_amount: amount,
    is_closed: false,
    is_adhoc: false,
    created_at: now,
    updated_at: now,
  }));
}

/**
 * Get all occurrence dates within a month based on billing period
 */
export function getOccurrenceDatesInMonth(
  billingPeriod: BillingPeriod,
  startDate: string | undefined,
  dayOfMonth: number | undefined,
  month: string,
  recurrenceWeek?: number,
  recurrenceDay?: number
): string[] {
  const [year, monthNum] = month.split('-').map(Number);
  const endOfMonth = new Date(year, monthNum, 0); // Last day of month
  const lastDayOfMonth = endOfMonth.getDate();

  switch (billingPeriod) {
    case 'monthly':
      if (recurrenceWeek !== undefined && recurrenceDay !== undefined) {
        if (
          !Number.isInteger(recurrenceWeek) ||
          recurrenceWeek < 1 ||
          recurrenceWeek > 5 ||
          !Number.isInteger(recurrenceDay) ||
          recurrenceDay < 0 ||
          recurrenceDay > 6
        ) {
          throw new ValidationError('Invalid monthly weekday recurrence');
        }
        const day =
          recurrenceWeek === 5
            ? lastDayOfMonth - ((endOfMonth.getDay() - recurrenceDay + 7) % 7)
            : 1 +
              ((recurrenceDay - new Date(year, monthNum - 1, 1).getDay() + 7) % 7) +
              (recurrenceWeek - 1) * 7;
        return [`${month}-${String(day).padStart(2, '0')}`];
      }
      return getMonthlyDates(dayOfMonth, month, lastDayOfMonth);

    case 'bi_weekly':
      return getBiWeeklyDatesInMonth(startDate, month);

    case 'weekly':
      return getWeeklyDatesInMonth(startDate, month);

    case 'semi_annually':
      return getSemiAnnuallyDatesInMonth(startDate, month);

    default:
      // Default to monthly if unknown
      return getMonthlyDates(dayOfMonth, month, lastDayOfMonth);
  }
}

/**
 * Get monthly occurrence date (single date per month)
 */
function getMonthlyDates(
  dayOfMonth: number | undefined,
  month: string,
  lastDayOfMonth: number
): string[] {
  // Default to 1st if no day_of_month set
  const day = Math.min(dayOfMonth || 1, lastDayOfMonth);
  return [`${month}-${String(day).padStart(2, '0')}`];
}

/**
 * Get bi-weekly (every 2 weeks) occurrence dates in a month
 * Requires start_date to calculate correctly
 *
 * Uses setDate() arithmetic instead of millisecond math to avoid
 * DST-related off-by-one errors. The anchor is parsed as local midnight
 * via parseLocalDate() to prevent UTC-vs-local timezone shifts.
 */
export function getBiWeeklyDatesInMonth(startDate: string | undefined, month: string): string[] {
  if (!startDate) {
    // If no start_date, default to 1st and 15th
    return [`${month}-01`, `${month}-15`];
  }

  const [year, monthNum] = month.split('-').map(Number);
  const startOfMonth = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0);

  // Parse anchor as local midnight (not UTC)
  const anchor = parseLocalDate(startDate);
  const dates: string[] = [];

  const current = new Date(anchor.getTime());

  // If anchor is after the month, we need to go backwards
  if (current > endOfMonth) {
    while (current > endOfMonth) {
      current.setDate(current.getDate() - 14);
    }
  }

  // If anchor is before the start of month, advance to first occurrence in month
  while (current < startOfMonth) {
    current.setDate(current.getDate() + 14);
  }

  // Collect all bi-weekly dates within the month
  while (current <= endOfMonth) {
    if (current >= startOfMonth) {
      dates.push(formatDate(current));
    }
    current.setDate(current.getDate() + 14);
  }

  return dates.sort();
}

/**
 * Get weekly occurrence dates in a month
 * Requires start_date to calculate correctly
 *
 * Uses setDate() arithmetic and parseLocalDate() — same DST-safe
 * approach as getBiWeeklyDatesInMonth.
 */
export function getWeeklyDatesInMonth(startDate: string | undefined, month: string): string[] {
  if (!startDate) {
    // If no start_date, return all Mondays in the month
    return getWeekdayDatesInMonth(month, 1); // 1 = Monday
  }

  const [year, monthNum] = month.split('-').map(Number);
  const startOfMonth = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0);

  // Parse anchor as local midnight (not UTC)
  const anchor = parseLocalDate(startDate);
  const dates: string[] = [];

  const current = new Date(anchor.getTime());

  // If anchor is after the month, go backwards
  if (current > endOfMonth) {
    while (current > endOfMonth) {
      current.setDate(current.getDate() - 7);
    }
  }

  // If anchor is before the start of month, advance
  while (current < startOfMonth) {
    current.setDate(current.getDate() + 7);
  }

  // Collect all weekly dates within the month
  while (current <= endOfMonth) {
    if (current >= startOfMonth) {
      dates.push(formatDate(current));
    }
    current.setDate(current.getDate() + 7);
  }

  return dates.sort();
}

/**
 * Get semi-annually dates (every 6 months)
 * Typically only 0 or 1 occurrence per month
 */
export function getSemiAnnuallyDatesInMonth(
  startDate: string | undefined,
  month: string
): string[] {
  if (!startDate) {
    // If no start date, check if this is January or July
    const [_year, monthNum] = month.split('-').map(Number);
    if (monthNum === 1 || monthNum === 7) {
      return [`${month}-01`];
    }
    return [];
  }

  const [year, monthNum] = month.split('-').map(Number);
  // Parse anchor as local midnight to get correct month/day
  const anchor = parseLocalDate(startDate);
  const anchorMonth = anchor.getMonth(); // 0-based
  const anchorDay = anchor.getDate();

  // Semi-annually means every 6 months from start date
  // Check if this month is 0, 6, 12, 18... months from anchor
  const monthsDiff = (year - anchor.getFullYear()) * 12 + (monthNum - 1 - anchorMonth);

  if (monthsDiff >= 0 && monthsDiff % 6 === 0) {
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const day = Math.min(anchorDay, lastDayOfMonth);
    return [`${month}-${String(day).padStart(2, '0')}`];
  }

  return [];
}

/**
 * Helper: Get all dates of a specific weekday in a month
 */
function getWeekdayDatesInMonth(month: string, weekday: number): string[] {
  const [year, monthNum] = month.split('-').map(Number);
  const dates: string[] = [];

  const current = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0);

  // Find first occurrence of the weekday
  while (current.getDay() !== weekday) {
    current.setDate(current.getDate() + 1);
  }

  // Collect all occurrences
  while (current <= endOfMonth) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
}

/**
 * Format a Date as YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Detect if this is an "extra occurrence" month
 * For bi-weekly: usually 2 per month, sometimes 3
 * For weekly: usually 4 per month, sometimes 5
 */
export function isExtraOccurrenceMonth(
  billingPeriod: BillingPeriod,
  occurrenceCount: number
): boolean {
  switch (billingPeriod) {
    case 'bi_weekly':
      // Normally 2 bi-weekly occurrences, 3 is extra
      return occurrenceCount > 2;

    case 'weekly':
      // Normally 4 weekly occurrences, 5 is extra
      return occurrenceCount > 4;

    default:
      return false;
  }
}

/**
 * Get the typical (non-extra) occurrence count for a billing period
 */
export function getTypicalOccurrenceCount(billingPeriod: BillingPeriod): number {
  switch (billingPeriod) {
    case 'monthly':
      return 1;
    case 'bi_weekly':
      return 2;
    case 'weekly':
      return 4;
    case 'semi_annually':
      return 0; // Only 0 or 1, depends on the month
    default:
      return 1;
  }
}

/**
 * Calculate total expected amount from occurrences
 */
export function sumOccurrenceExpectedAmounts(occurrences: Occurrence[]): number {
  return occurrences.reduce((sum, occ) => sum + occ.expected_amount, 0);
}

/**
 * Check if all occurrences are closed
 */
export function areAllOccurrencesClosed(occurrences: Occurrence[]): boolean {
  if (occurrences.length === 0) return false;
  return occurrences.every((occ) => occ.is_closed);
}

/**
 * Create a single ad-hoc occurrence (user-added)
 */
export function createAdhocOccurrence(expectedDate: string, expectedAmount: number): Occurrence {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    sequence: 0, // Will be updated when added to array
    expected_date: expectedDate,
    expected_amount: expectedAmount,
    is_closed: false,
    is_adhoc: true,
    created_at: now,
    updated_at: now,
  };
}

export function ensureOccurrenceFallback(
  occurrences: Occurrence[] | undefined,
  expectedDate: string,
  expectedAmount = 0
): Occurrence[] {
  if (occurrences && occurrences.length > 0) {
    return occurrences;
  }

  return resequenceOccurrences([createAdhocOccurrence(expectedDate, expectedAmount)]);
}

/**
 * Resequence occurrences after add/remove
 * Sorts by expected_date and assigns sequence numbers
 */
export function resequenceOccurrences(occurrences: Occurrence[]): Occurrence[] {
  return occurrences
    .sort((a, b) => a.expected_date.localeCompare(b.expected_date))
    .map((occ, index) => ({
      ...occ,
      sequence: index + 1,
    }));
}
