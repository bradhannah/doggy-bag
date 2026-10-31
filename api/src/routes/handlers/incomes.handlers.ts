// Incomes API Handlers

import { IncomesService, IncomesServiceImpl } from '../../services/incomes-service';
import { formatErrorForUser, getErrorStatus } from '../../utils/errors';
import { MonthsServiceImpl } from '../../services/months-service';

const incomesService: IncomesService = new IncomesServiceImpl();

export function createIncomesHandlerGET() {
  return async () => {
    try {
      const incomes = await incomesService.getAll();

      return new Response(JSON.stringify(incomes), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[IncomesHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load incomes',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createIncomesHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = incomesService.validate(body);

      if (!validation.isValid) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: validation.errors,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const newIncome = await incomesService.create(body);

      return new Response(JSON.stringify(newIncome), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[IncomesHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create income',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createIncomesHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing income ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedIncome = await incomesService.update(id, body);

      if (!updatedIncome) {
        return new Response(
          JSON.stringify({
            error: 'Income not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedIncome), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[IncomesHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update income',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createIncomesHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing income ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await incomesService.delete(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[IncomesHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete income',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

/**
 * POST /api/{kind}s/:id/add-to-month  body: { month }
 * Puts a recurring item into an existing, unlocked month. A month that cannot take it
 * answers { added: false, reason } rather than an error, so callers can stay quiet.
 */
export function createIncomeAddToMonthHandler() {
  return async (request: Request) => {
    try {
      const id = new URL(request.url).pathname.match(/\/api\/incomes\/([^/]+)\/add-to-month$/)?.[1];
      const body = (await request.json().catch(() => ({}))) as { month?: string };
      if (!id || typeof body.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) {
        return Response.json({ error: 'Choose a valid budget month' }, { status: 400 });
      }
      const result = await new MonthsServiceImpl().addSourceToMonth(body.month, 'income', id);
      return Response.json(result, { status: 200 });
    } catch (error) {
      console.error('[IncomesHandler] add-to-month failed:', error);
      return Response.json({ error: formatErrorForUser(error) }, { status: getErrorStatus(error) });
    }
  };
}
