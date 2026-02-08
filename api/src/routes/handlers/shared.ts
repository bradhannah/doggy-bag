// Shared Handler Utilities
// Common helper functions used across multiple handler files

import { MonthsServiceImpl } from '../../services/months-service';

const monthsService = new MonthsServiceImpl();

/**
 * Check if a month is read-only and return a 403 response if so.
 * Returns null if the month is not read-only (caller should proceed).
 */
export async function checkReadOnly(month: string): Promise<Response | null> {
  const isReadOnly = await monthsService.isReadOnly(month);
  if (isReadOnly) {
    return new Response(
      JSON.stringify({
        error: `Month ${month} is read-only. Unlock it to make changes.`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 403,
      }
    );
  }
  return null;
}
