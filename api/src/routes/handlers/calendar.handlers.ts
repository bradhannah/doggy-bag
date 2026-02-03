// Calendar API Handlers
// Handles calendar event aggregation for display

import { CalendarServiceImpl } from '../../services/calendar-service';
import type { CalendarService } from '../../services/calendar-service';
import { formatErrorForUser } from '../../utils/errors';

const calendarService: CalendarService = new CalendarServiceImpl();

/**
 * GET /api/calendar/:month - Get all calendar events for a month
 * GET /api/calendar/:month/:date - Get events for a specific date
 */
export function createCalendarHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);

      // Expected: /api/calendar/:month or /api/calendar/:month/:date
      if (pathParts.length < 3 || pathParts[0] !== 'api' || pathParts[1] !== 'calendar') {
        return new Response(
          JSON.stringify({
            error: 'Invalid calendar endpoint',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const month = pathParts[2];

      // Validate month format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Use YYYY-MM.',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if requesting specific date: /api/calendar/:month/:date
      if (pathParts.length >= 4) {
        const date = pathParts[3];

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return new Response(
            JSON.stringify({
              error: 'Invalid date format. Use YYYY-MM-DD.',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }

        // Validate that date is within the requested month
        if (!date.startsWith(month)) {
          return new Response(
            JSON.stringify({
              error: 'Date must be within the requested month.',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }

        const events = await calendarService.getEventsForDate(month, date);

        return new Response(
          JSON.stringify({
            month,
            date,
            events,
            count: events.length,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Return all events for the month
      const response = await calendarService.getEventsForMonth(month);

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[CalendarHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load calendar events',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
