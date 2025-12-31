// Due Date Utilities for 002-detailed-monthly-view
// Calculate due dates and overdue status for bills/incomes

/**
 * Calculate the due date for a bill/income in a specific month
 * Handles edge cases like due day 31 in short months
 * 
 * @param month - Month in YYYY-MM format
 * @param dueDay - Day of month when due (1-31)
 * @returns ISO date string (YYYY-MM-DD) or undefined if no due day
 */
export function calculateDueDate(month: string, dueDay: number | undefined): string | undefined {
  if (!dueDay) return undefined;
  
  const [year, monthNum] = month.split('-').map(Number);
  // Get the last day of the month (day 0 of next month)
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const actualDay = Math.min(dueDay, daysInMonth);
  
  return `${month}-${String(actualDay).padStart(2, '0')}`;
}

/**
 * Check if a bill/income is overdue
 * An item is overdue if it has a due date in the past and is not paid
 * 
 * @param dueDate - Due date in YYYY-MM-DD format
 * @param isPaid - Whether the item has been paid
 * @returns true if overdue, false otherwise
 */
export function isOverdue(dueDate: string | undefined, isPaid: boolean): boolean {
  if (!dueDate || isPaid) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  return due.getTime() < today.getTime();
}

/**
 * Get the number of days overdue
 * Returns 0 if not overdue
 * 
 * @param dueDate - Due date in YYYY-MM-DD format
 * @returns Number of days overdue (negative if due in future)
 */
export function getDaysOverdue(dueDate: string | undefined): number | null {
  if (!dueDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format a due date for display (e.g., "Jan 15")
 * 
 * @param dueDate - Due date in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Jan 15")
 */
export function formatDueDate(dueDate: string | undefined): string | null {
  if (!dueDate) return null;
  
  const date = new Date(dueDate);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Check if a due date is within a specified number of days from today
 * Useful for "due soon" warnings
 * 
 * @param dueDate - Due date in YYYY-MM-DD format
 * @param days - Number of days threshold
 * @returns true if due within the specified days
 */
export function isDueSoon(dueDate: string | undefined, days: number = 3): boolean {
  if (!dueDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays <= days;
}
