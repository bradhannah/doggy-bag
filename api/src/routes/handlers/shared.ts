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

export async function checkRequestReadOnly(request: Request): Promise<Response | null> {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return null;
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  const match = path.match(/^\/api\/months\/(\d{4}-\d{2})(?:\/|$)/);
  // Moving an unfinished payment out of a locked month is the one edit a lock permits;
  // the handler still refuses a locked destination.
  if (
    !match ||
    path === `/api/months/${match[1]}/lock` ||
    path === `/api/months/${match[1]}/push-savings-balances` ||
    path.endsWith('/move-to-next-month')
  )
    return null;
  return checkReadOnly(match[1]);
}
