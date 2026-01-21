/**
 * Shared formatting utilities for the frontend
 * Mirrors api/src/utils/formatters.ts for consistency
 */

/**
 * Formats cents into a USD currency string
 * @param cents - Amount in cents (e.g., 1050 = $10.50)
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Parses a dollar string input into cents
 * @param value - String like "10.50" or "$10.50"
 * @returns Amount in cents (e.g., 1050)
 */
export function parseDollarsToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const dollars = parseFloat(cleaned);
  return isNaN(dollars) ? 0 : Math.round(dollars * 100);
}

/**
 * Returns today's date as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns the first day of the current month as YYYY-MM-DD
 */
export function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

/**
 * Formats a date string or Date object into a localized display string
 * @param date - ISO date string (YYYY-MM-DD) or Date object
 */
export function formatDate(date: string | Date): string {
  let d: Date;
  if (typeof date === 'string') {
    // For YYYY-MM-DD strings, parse as local date to avoid timezone issues
    const parts = date.split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
