// Ad-hoc Items Route Handlers
// Handles creation and management of one-time bills and incomes

import { AdhocServiceImpl } from '../../services/adhoc-service';
import type {
  CreateAdhocBillRequest,
  CreateAdhocIncomeRequest,
  UpdateAdhocRequest,
  MakeRegularRequest,
} from '../../services/adhoc-service';
import { formatErrorForUser, NotFoundError, ValidationError } from '../../utils/errors';
import { checkReadOnly } from './shared';

const adhocService = new AdhocServiceImpl();

// Helper to extract params from URL path
// /api/months/2025-01/adhoc/bills -> { month: '2025-01', instanceId: null }
// /api/months/2025-01/adhoc/bills/uuid -> { month: '2025-01', instanceId: 'uuid' }
// /api/months/2025-01/adhoc/bills/uuid/make-regular -> { month: '2025-01', instanceId: 'uuid', makeRegular: true }
function extractAdhocParams(url: string): {
  month: string | null;
  instanceId: string | null;
  makeRegular: boolean;
} {
  // Match make-regular pattern first
  const makeRegularMatch = url.match(
    /\/api\/months\/(\d{4}-\d{2})\/adhoc\/(?:bills|incomes)\/([^/]+)\/make-regular/
  );
  if (makeRegularMatch) {
    return { month: makeRegularMatch[1], instanceId: makeRegularMatch[2], makeRegular: true };
  }

  // Match with instance ID
  const withId = url.match(/\/api\/months\/(\d{4}-\d{2})\/adhoc\/(?:bills|incomes)\/([^/]+)/);
  if (withId) {
    return { month: withId[1], instanceId: withId[2], makeRegular: false };
  }

  // Match without instance ID (for POST create)
  const withoutId = url.match(/\/api\/months\/(\d{4}-\d{2})\/adhoc\/(?:bills|incomes)/);
  if (withoutId) {
    return { month: withoutId[1], instanceId: null, makeRegular: false };
  }

  return { month: null, instanceId: null, makeRegular: false };
}

// ============================================================================
// Bills
// ============================================================================

/**
 * POST /api/months/:month/adhoc/bills
 * Create a new ad-hoc bill for a specific month
 */
export function createAdhocBillHandlerPOST() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month } = extractAdhocParams(url.pathname);

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid URL. Expected /api/months/YYYY-MM/adhoc/bills',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;

      const body = (await request.json()) as CreateAdhocBillRequest;
      const billInstance = await adhocService.createAdhocBill(month, body);

      return new Response(JSON.stringify({ billInstance }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[AdhocHandler] Create bill error:', error);

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create ad-hoc bill',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * PUT /api/months/:month/adhoc/bills/:id
 * Update an existing ad-hoc bill
 */
export function createAdhocBillHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId } = extractAdhocParams(url.pathname);

      if (!month || !instanceId) {
        return new Response(
          JSON.stringify({
            error: 'Invalid URL. Expected /api/months/YYYY-MM/adhoc/bills/:id',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;

      const body = (await request.json()) as UpdateAdhocRequest;
      const billInstance = await adhocService.updateAdhocBill(month, instanceId, body);

      if (!billInstance) {
        return new Response(JSON.stringify({ error: 'Bill instance not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ billInstance }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[AdhocHandler] Update bill error:', error);

      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update ad-hoc bill',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * DELETE /api/months/:month/adhoc/bills/:id
 * Delete an ad-hoc bill
 */
export function createAdhocBillHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId } = extractAdhocParams(url.pathname);

      if (!month || !instanceId) {
        return new Response(
          JSON.stringify({
            error: 'Invalid URL. Expected /api/months/YYYY-MM/adhoc/bills/:id',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;

      await adhocService.deleteAdhocBill(month, instanceId);

      return new Response(null, { status: 204 });
    } catch (error) {
      console.error('[AdhocHandler] Delete bill error:', error);

      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete ad-hoc bill',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * POST /api/months/:month/adhoc/bills/:id/make-regular
 * Convert an ad-hoc bill to a regular recurring bill
 */
export function createMakeRegularBillHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId, makeRegular } = extractAdhocParams(url.pathname);

      if (!month || !instanceId || !makeRegular) {
        return new Response(
          JSON.stringify({
            error: 'Invalid URL. Expected /api/months/YYYY-MM/adhoc/bills/:id/make-regular',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;

      const body = (await request.json()) as MakeRegularRequest;

      // Validate required fields
      if (
        !body.name ||
        !body.amount ||
        !body.category_id ||
        !body.payment_source_id ||
        !body.billing_period
      ) {
        return new Response(
          JSON.stringify({
            error:
              'Missing required fields: name, amount, category_id, payment_source_id, billing_period',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const { bill, billInstance } = await adhocService.makeRegularBill(month, instanceId, body);

      return new Response(
        JSON.stringify({
          bill,
          billInstance,
          message: `Created recurring bill: ${bill.name}`,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('[AdhocHandler] Make regular bill error:', error);

      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to make bill regular',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

// ============================================================================
// Incomes
// ============================================================================

/**
 * POST /api/months/:month/adhoc/incomes
 * Create a new ad-hoc income for a specific month
 */
export function createAdhocIncomeHandlerPOST() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month } = extractAdhocParams(url.pathname);

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid URL. Expected /api/months/YYYY-MM/adhoc/incomes',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;

      const body = (await request.json()) as CreateAdhocIncomeRequest;
      const incomeInstance = await adhocService.createAdhocIncome(month, body);

      return new Response(JSON.stringify({ incomeInstance }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[AdhocHandler] Create income error:', error);

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create ad-hoc income',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * PUT /api/months/:month/adhoc/incomes/:id
 * Update an existing ad-hoc income
 */
export function createAdhocIncomeHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId } = extractAdhocParams(url.pathname);

      if (!month || !instanceId) {
        return new Response(
          JSON.stringify({
            error: 'Invalid URL. Expected /api/months/YYYY-MM/adhoc/incomes/:id',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;

      const body = (await request.json()) as UpdateAdhocRequest;
      const incomeInstance = await adhocService.updateAdhocIncome(month, instanceId, body);

      if (!incomeInstance) {
        return new Response(JSON.stringify({ error: 'Income instance not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ incomeInstance }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[AdhocHandler] Update income error:', error);

      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update ad-hoc income',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * DELETE /api/months/:month/adhoc/incomes/:id
 * Delete an ad-hoc income
 */
export function createAdhocIncomeHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId } = extractAdhocParams(url.pathname);

      if (!month || !instanceId) {
        return new Response(
          JSON.stringify({
            error: 'Invalid URL. Expected /api/months/YYYY-MM/adhoc/incomes/:id',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;

      await adhocService.deleteAdhocIncome(month, instanceId);

      return new Response(null, { status: 204 });
    } catch (error) {
      console.error('[AdhocHandler] Delete income error:', error);

      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete ad-hoc income',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * POST /api/months/:month/adhoc/incomes/:id/make-regular
 * Convert an ad-hoc income to a regular recurring income
 */
export function createMakeRegularIncomeHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId, makeRegular } = extractAdhocParams(url.pathname);

      if (!month || !instanceId || !makeRegular) {
        return new Response(
          JSON.stringify({
            error: 'Invalid URL. Expected /api/months/YYYY-MM/adhoc/incomes/:id/make-regular',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;

      const body = (await request.json()) as MakeRegularRequest;

      // Validate required fields
      if (
        !body.name ||
        !body.amount ||
        !body.category_id ||
        !body.payment_source_id ||
        !body.billing_period
      ) {
        return new Response(
          JSON.stringify({
            error:
              'Missing required fields: name, amount, category_id, payment_source_id, billing_period',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const { income, incomeInstance } = await adhocService.makeRegularIncome(
        month,
        instanceId,
        body
      );

      return new Response(
        JSON.stringify({
          income,
          incomeInstance,
          message: `Created recurring income: ${income.name}`,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('[AdhocHandler] Make regular income error:', error);

      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to make income regular',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
