// Bills API Handlers

import { BillsService, BillsServiceImpl } from '../../services/bills-service';
import { formatErrorForUser, getErrorStatus } from '../../utils/errors';
import { MonthsServiceImpl } from '../../services/months-service';

const billsService: BillsService = new BillsServiceImpl();

export function createBillsHandlerGET() {
  return async () => {
    try {
      const bills = await billsService.getAll();

      return new Response(JSON.stringify(bills), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[BillsHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load bills',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createBillsHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = billsService.validate(body);

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

      const newBill = await billsService.create(body);

      return new Response(JSON.stringify(newBill), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[BillsHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create bill',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createBillsHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing bill ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedBill = await billsService.update(id, body);

      if (!updatedBill) {
        return new Response(
          JSON.stringify({
            error: 'Bill not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedBill), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[BillsHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update bill',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createBillsHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing bill ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await billsService.delete(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[BillsHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete bill',
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
export function createBillAddToMonthHandler() {
  return async (request: Request) => {
    try {
      const id = new URL(request.url).pathname.match(/\/api\/bills\/([^/]+)\/add-to-month$/)?.[1];
      const body = (await request.json().catch(() => ({}))) as { month?: string };
      if (!id || typeof body.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) {
        return Response.json({ error: 'Choose a valid budget month' }, { status: 400 });
      }
      const result = await new MonthsServiceImpl().addSourceToMonth(body.month, 'bill', id);
      return Response.json(result, { status: 200 });
    } catch (error) {
      console.error('[BillsHandler] add-to-month failed:', error);
      return Response.json({ error: formatErrorForUser(error) }, { status: getErrorStatus(error) });
    }
  };
}
