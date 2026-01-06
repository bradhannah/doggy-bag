// Occurrence Generation Utilities
// Calculate individual payment occurrences for bills/incomes within a month

import type { Bill, Income, Occurrence, BillingPeriod } from '../types';

/**
 * Generate occurrences for a bill within a specific month
 */
export function generateBillOccurrences(
  bill: Bill,
  month: string // "2026-01"
): Occurrence[] {
  return generateOccurrences(
    bill.billing_period,
    bill.amount,
    bill.start_date,
    bill.day_of_month,
    month
  );
}

/**
 * Generate occurrences for an income within a specific month
 */
export function generateIncomeOccurrences(
  income: Income,
  month: string // "2026-01"
): Occurrence[] {
  return generateOccurrences(
    income.billing_period,
    income.amount,
    income.start_date,
    income.day_of_month,
    month
  );
}

/**
 * Core occurrence generation logic
 */
export function generateOccurrences(
  billingPeriod: BillingPeriod,
  amount: number,
  startDate: string | undefined,
  dayOfMonth: number | undefined,
  month: string
): Occurrence[] {
  const now = new Date().toISOString();
  const dates = getOccurrenceDatesInMonth(billingPeriod, startDate, dayOfMonth, month);

  return dates.map((date, index) => ({
    id: crypto.randomUUID(),
    sequence: index + 1,
    expected_date: date,
    expected_amount: amount,
    is_closed: false,
    payments: [],
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
  month: string
): string[] {
  const [year, monthNum] = month.split('-').map(Number);
  const endOfMonth = new Date(year, monthNum, 0); // Last day of month
  const lastDayOfMonth = endOfMonth.getDate();

  switch (billingPeriod) {
    case 'monthly':
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
 */
export function getBiWeeklyDatesInMonth(startDate: string | undefined, month: string): string[] {
  if (!startDate) {
    // If no start_date, default to 1st and 15th
    return [`${month}-01`, `${month}-15`];
  }

  const [year, monthNum] = month.split('-').map(Number);
  const startOfMonth = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0);

  const anchor = new Date(startDate);
  const dates: string[] = [];

  // Calculate milliseconds in 14 days
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

  // Find the first occurrence on or after the anchor date
  // that falls within this month
  let current = new Date(anchor);

  // If anchor is after the month, we need to go backwards
  if (current > endOfMonth) {
    while (current > endOfMonth) {
      current = new Date(current.getTime() - twoWeeksMs);
    }
  }

  // If anchor is before the start of month, advance to first occurrence in month
  while (current < startOfMonth) {
    current = new Date(current.getTime() + twoWeeksMs);
  }

  // Collect all bi-weekly dates within the month
  while (current <= endOfMonth) {
    if (current >= startOfMonth) {
      dates.push(formatDate(current));
    }
    current = new Date(current.getTime() + twoWeeksMs);
  }

  return dates.sort();
}

/**
 * Get weekly occurrence dates in a month
 * Requires start_date to calculate correctly
 */
export function getWeeklyDatesInMonth(startDate: string | undefined, month: string): string[] {
  if (!startDate) {
    // If no start_date, return all Mondays in the month
    return getWeekdayDatesInMonth(month, 1); // 1 = Monday
  }

  const [year, monthNum] = month.split('-').map(Number);
  const startOfMonth = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0);

  const anchor = new Date(startDate);
  const dates: string[] = [];

  // Calculate milliseconds in 7 days
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  let current = new Date(anchor);

  // If anchor is after the month, go backwards
  if (current > endOfMonth) {
    while (current > endOfMonth) {
      current = new Date(current.getTime() - oneWeekMs);
    }
  }

  // If anchor is before the start of month, advance
  while (current < startOfMonth) {
    current = new Date(current.getTime() + oneWeekMs);
  }

  // Collect all weekly dates within the month
  while (current <= endOfMonth) {
    if (current >= startOfMonth) {
      dates.push(formatDate(current));
    }
    current = new Date(current.getTime() + oneWeekMs);
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
  const anchor = new Date(startDate);
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
 * Calculate total paid amount from occurrence payments
 */
export function sumOccurrencePayments(occurrences: Occurrence[]): number {
  return occurrences.reduce((sum, occ) => {
    const occPayments = occ.payments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + occPayments;
  }, 0);
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
    payments: [],
    is_adhoc: true,
    created_at: now,
    updated_at: now,
  };
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
