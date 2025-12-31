// Detailed View API Handlers
// GET /api/months/:month/detailed - Returns comprehensive monthly view data

import { DetailedViewServiceImpl } from '../../services/detailed-view-service';
import { formatErrorForUser } from '../../utils/errors';

const detailedViewService = new DetailedViewServiceImpl();

// Helper to extract month from URL path: /api/months/2025-01/detailed -> 2025-01
function extractMonthFromDetailed(url: string): string | null {
  const match = url.match(/\/api\/months\/(\d{4}-\d{2})\/detailed/);
  return match ? match[1] : null;
}

// GET /api/months/:month/detailed - Get detailed monthly view data
export function createDetailedViewHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const month = extractMonthFromDetailed(url.pathname);
      
      if (!month) {
        return new Response(JSON.stringify({
          error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const detailedData = await detailedViewService.getDetailedMonth(month);
      
      return new Response(JSON.stringify(detailedData), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[DetailedViewHandler] GET failed:', error);
      
      // Check if it's a "not found" error
      if (error instanceof Error && error.message.includes('not found')) {
        return new Response(JSON.stringify({
          error: error.message,
          message: 'Monthly data not found. Generate it first with POST /api/months/{month}/generate'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to load detailed monthly view'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}
