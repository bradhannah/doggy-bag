// Bill and Income Instance Handlers

import { MonthsServiceImpl } from '../../services/months-service';
import { LeftoverServiceImpl } from '../../services/leftover-service';
import { BillsServiceImpl } from '../../services/bills-service';
import { IncomesServiceImpl } from '../../services/incomes-service';
import { formatErrorForUser, ReadOnlyError } from '../../utils/errors';

const monthsService = new MonthsServiceImpl();
const leftoverService = new LeftoverServiceImpl();
const billsService = new BillsServiceImpl();
const incomesService = new IncomesServiceImpl();

// Helper to check if month is read-only and return 403 response if so
async function checkReadOnly(month: string): Promise<Response | null> {
  const isReadOnly = await monthsService.isReadOnly(month);
  if (isReadOnly) {
    return new Response(JSON.stringify({
      error: `Month ${month} is read-only. Unlock it to make changes.`
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 403
    });
  }
  return null;
}

// Extract month and instance ID from URL: /api/months/2025-01/bills/uuid
function extractMonthAndId(url: string, type: 'bills' | 'incomes'): { month: string | null; id: string | null } {
  const regex = new RegExp(`/api/months/(\\d{4}-\\d{2})/${type}/([^/]+)`);
  const match = url.match(regex);
  return {
    month: match ? match[1] : null,
    id: match ? match[2] : null
  };
}

// PUT /api/months/:month/bills/:id - Update bill instance amount
export function createBillInstanceHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, id } = extractMonthAndId(url.pathname, 'bills');
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      const { amount } = body;
      
      if (typeof amount !== 'number' || amount < 0) {
        return new Response(JSON.stringify({
          error: 'Amount must be a non-negative number in cents'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const instance = await monthsService.updateBillInstance(month, id, amount);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      // Get enriched instance with bill name
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: bill?.name || 'Unknown Bill',
        billing_period: bill?.billing_period || 'monthly'
      };
      
      // Calculate updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill PUT failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to update bill instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/bills/:id/reset - Reset bill instance to default amount
export function createBillInstanceHandlerReset() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      // Extract from /api/months/2025-01/bills/uuid/reset
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/reset/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/reset'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.resetBillInstance(month, id);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      // Get enriched instance with bill name
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: bill?.name || 'Unknown Bill',
        billing_period: bill?.billing_period || 'monthly'
      };
      
      // Calculate updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Reset failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to reset bill instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// PUT /api/months/:month/incomes/:id - Update income instance amount
export function createIncomeInstanceHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, id } = extractMonthAndId(url.pathname, 'incomes');
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:id'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      const { amount } = body;
      
      if (typeof amount !== 'number' || amount < 0) {
        return new Response(JSON.stringify({
          error: 'Amount must be a non-negative number in cents'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const instance = await monthsService.updateIncomeInstance(month, id, amount);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      // Get enriched instance with income name
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: income?.name || 'Unknown Income',
        billing_period: income?.billing_period || 'monthly'
      };
      
      // Calculate updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income PUT failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to update income instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/incomes/:id/reset - Reset income instance to default amount
export function createIncomeInstanceHandlerReset() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      // Extract from /api/months/2025-01/incomes/uuid/reset
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/reset/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:id/reset'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.resetIncomeInstance(month, id);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      // Get enriched instance with income name
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: income?.name || 'Unknown Income',
        billing_period: income?.billing_period || 'monthly'
      };
      
      // Calculate updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Reset failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to reset income instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/bills/:id/paid - Toggle bill instance paid status
export function createBillInstanceHandlerTogglePaid() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      // Extract from /api/months/2025-01/bills/uuid/paid
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/paid/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/paid'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.toggleBillInstancePaid(month, id);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      // Get enriched instance with bill name
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: bill?.name || 'Unknown Bill',
        billing_period: bill?.billing_period || 'monthly'
      };
      
      // Calculate updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Toggle Paid failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to toggle bill paid status'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/incomes/:id/paid - Toggle income instance paid status
// Optionally accepts { actualAmount: number } in body to set the received amount
export function createIncomeInstanceHandlerTogglePaid() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      // Extract from /api/months/2025-01/incomes/uuid/paid
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/paid/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:id/paid'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      // Parse optional actualAmount from body
      let actualAmount: number | undefined;
      try {
        const body = await request.json();
        if (body && typeof body.actualAmount === 'number' && body.actualAmount >= 0) {
          actualAmount = body.actualAmount;
        }
      } catch {
        // No body or invalid JSON - that's fine, actualAmount stays undefined
      }
      
      const instance = await monthsService.toggleIncomeInstancePaid(month, id, actualAmount);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      // Get enriched instance with income name
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: income?.name || 'Unknown Income',
        billing_period: income?.billing_period || 'monthly'
      };
      
      // Calculate updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Toggle Paid failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to toggle income paid status'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// ============================================================================
// Close/Reopen Handlers (New Transaction-Based Flow)
// ============================================================================

// POST /api/months/:month/bills/:id/close - Close bill instance (no more payments expected)
export function createBillInstanceHandlerClose() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/close/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/close'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.closeBillInstance(month, id);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill',
        billing_period: bill?.billing_period || 'monthly'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Close failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to close bill instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/bills/:id/reopen - Reopen closed bill instance
export function createBillInstanceHandlerReopen() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/reopen/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/reopen'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.reopenBillInstance(month, id);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill',
        billing_period: bill?.billing_period || 'monthly'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Reopen failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to reopen bill instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/incomes/:id/close - Close income instance (no more receipts expected)
export function createIncomeInstanceHandlerClose() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/close/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:id/close'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.closeIncomeInstance(month, id);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income',
        billing_period: income?.billing_period || 'monthly'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Close failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to close income instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/incomes/:id/reopen - Reopen closed income instance
export function createIncomeInstanceHandlerReopen() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/reopen/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:id/reopen'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.reopenIncomeInstance(month, id);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income',
        billing_period: income?.billing_period || 'monthly'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Reopen failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to reopen income instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// ============================================================================
// Expected Amount Update Handlers (Inline Edit)
// ============================================================================

// PUT /api/months/:month/bills/:id/expected - Update bill expected amount
export function createBillInstanceHandlerUpdateExpected() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/expected/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/expected'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      const { amount } = body;
      
      if (typeof amount !== 'number' || amount < 0) {
        return new Response(JSON.stringify({
          error: 'Amount must be a non-negative number in cents'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const instance = await monthsService.updateBillExpectedAmount(month, id, amount);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill',
        billing_period: bill?.billing_period || 'monthly'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Update Expected failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to update bill expected amount'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// PUT /api/months/:month/incomes/:id/expected - Update income expected amount
export function createIncomeInstanceHandlerUpdateExpected() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/expected/);
      const month = match ? match[1] : null;
      const id = match ? match[2] : null;
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:id/expected'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      const { amount } = body;
      
      if (typeof amount !== 'number' || amount < 0) {
        return new Response(JSON.stringify({
          error: 'Amount must be a non-negative number in cents'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const instance = await monthsService.updateIncomeExpectedAmount(month, id, amount);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income',
        billing_period: income?.billing_period || 'monthly'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Update Expected failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to update income expected amount'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// ============================================================================
// Occurrence Handlers
// ============================================================================

// Helper to extract month, instance ID, and occurrence ID from URL
function extractOccurrenceIds(url: string, type: 'bills' | 'incomes'): { 
  month: string | null; 
  instanceId: string | null; 
  occurrenceId: string | null;
} {
  const regex = new RegExp(`/api/months/(\\d{4}-\\d{2})/${type}/([^/]+)/occurrences/([^/]+)`);
  const match = url.match(regex);
  return {
    month: match ? match[1] : null,
    instanceId: match ? match[2] : null,
    occurrenceId: match ? match[3] : null
  };
}

// PUT /api/months/:month/bills/:instanceId/occurrences/:occurrenceId - Update occurrence
export function createBillOccurrenceHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId, occurrenceId } = extractOccurrenceIds(url.pathname, 'bills');
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:instanceId/occurrences/:occurrenceId'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      const updates: { expected_date?: string; expected_amount?: number } = {};
      
      if (body.expected_date) updates.expected_date = body.expected_date;
      if (typeof body.expected_amount === 'number') updates.expected_amount = body.expected_amount;
      
      const instance = await monthsService.updateBillOccurrence(month, instanceId, occurrenceId, updates);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Occurrence Update failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to update bill occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// PUT /api/months/:month/incomes/:instanceId/occurrences/:occurrenceId - Update occurrence
export function createIncomeOccurrenceHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId, occurrenceId } = extractOccurrenceIds(url.pathname, 'incomes');
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:instanceId/occurrences/:occurrenceId'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      const updates: { expected_date?: string; expected_amount?: number } = {};
      
      if (body.expected_date) updates.expected_date = body.expected_date;
      if (typeof body.expected_amount === 'number') updates.expected_amount = body.expected_amount;
      
      const instance = await monthsService.updateIncomeOccurrence(month, instanceId, occurrenceId, updates);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Occurrence Update failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to update income occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/bills/:instanceId/occurrences/:occurrenceId/close - Close occurrence
export function createBillOccurrenceHandlerClose() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/occurrences\/([^/]+)\/close/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      const occurrenceId = match ? match[3] : null;
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:instanceId/occurrences/:occurrenceId/close'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.closeBillOccurrence(month, instanceId, occurrenceId);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Occurrence Close failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to close bill occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/bills/:instanceId/occurrences/:occurrenceId/reopen - Reopen occurrence
export function createBillOccurrenceHandlerReopen() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/occurrences\/([^/]+)\/reopen/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      const occurrenceId = match ? match[3] : null;
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:instanceId/occurrences/:occurrenceId/reopen'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.reopenBillOccurrence(month, instanceId, occurrenceId);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Occurrence Reopen failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to reopen bill occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/incomes/:instanceId/occurrences/:occurrenceId/close - Close occurrence
export function createIncomeOccurrenceHandlerClose() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/occurrences\/([^/]+)\/close/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      const occurrenceId = match ? match[3] : null;
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:instanceId/occurrences/:occurrenceId/close'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.closeIncomeOccurrence(month, instanceId, occurrenceId);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Occurrence Close failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to close income occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/incomes/:instanceId/occurrences/:occurrenceId/reopen - Reopen occurrence
export function createIncomeOccurrenceHandlerReopen() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/occurrences\/([^/]+)\/reopen/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      const occurrenceId = match ? match[3] : null;
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:instanceId/occurrences/:occurrenceId/reopen'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.reopenIncomeOccurrence(month, instanceId, occurrenceId);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Occurrence Reopen failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to reopen income occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/bills/:instanceId/occurrences/:occurrenceId/payments - Add payment to occurrence
export function createBillOccurrencePaymentHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/occurrences\/([^/]+)\/payments/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      const occurrenceId = match ? match[3] : null;
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:instanceId/occurrences/:occurrenceId/payments'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return new Response(JSON.stringify({
          error: 'Amount must be a positive number in cents'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      if (!body.date) {
        return new Response(JSON.stringify({
          error: 'Date is required (YYYY-MM-DD)'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const payment = {
        amount: body.amount,
        date: body.date,
        payment_source_id: body.payment_source_id
      };
      
      const instance = await monthsService.addBillOccurrencePayment(month, instanceId, occurrenceId, payment);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Occurrence Payment failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to add payment to bill occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/incomes/:instanceId/occurrences/:occurrenceId/payments - Add payment to occurrence
export function createIncomeOccurrencePaymentHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/occurrences\/([^/]+)\/payments/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      const occurrenceId = match ? match[3] : null;
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:instanceId/occurrences/:occurrenceId/payments'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return new Response(JSON.stringify({
          error: 'Amount must be a positive number in cents'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      if (!body.date) {
        return new Response(JSON.stringify({
          error: 'Date is required (YYYY-MM-DD)'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const payment = {
        amount: body.amount,
        date: body.date,
        payment_source_id: body.payment_source_id
      };
      
      const instance = await monthsService.addIncomeOccurrencePayment(month, instanceId, occurrenceId, payment);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Occurrence Payment failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to add payment to income occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/bills/:instanceId/occurrences - Add ad-hoc occurrence
export function createBillAdhocOccurrenceHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/occurrences$/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      
      if (!month || !instanceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:instanceId/occurrences'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      
      if (!body.expected_date) {
        return new Response(JSON.stringify({
          error: 'Expected date is required (YYYY-MM-DD)'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      if (typeof body.expected_amount !== 'number' || body.expected_amount < 0) {
        return new Response(JSON.stringify({
          error: 'Expected amount must be a non-negative number in cents'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const occurrence = {
        expected_date: body.expected_date,
        expected_amount: body.expected_amount
      };
      
      const instance = await monthsService.addBillAdhocOccurrence(month, instanceId, occurrence);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill instance not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Add Adhoc Occurrence failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to add ad-hoc occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/incomes/:instanceId/occurrences - Add ad-hoc occurrence
export function createIncomeAdhocOccurrenceHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/occurrences$/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      
      if (!month || !instanceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:instanceId/occurrences'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const body = await request.json();
      
      if (!body.expected_date) {
        return new Response(JSON.stringify({
          error: 'Expected date is required (YYYY-MM-DD)'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      if (typeof body.expected_amount !== 'number' || body.expected_amount < 0) {
        return new Response(JSON.stringify({
          error: 'Expected amount must be a non-negative number in cents'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const occurrence = {
        expected_date: body.expected_date,
        expected_amount: body.expected_amount
      };
      
      const instance = await monthsService.addIncomeAdhocOccurrence(month, instanceId, occurrence);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income instance not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Add Adhoc Occurrence failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to add ad-hoc occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// DELETE /api/months/:month/bills/:instanceId/occurrences/:occurrenceId - Remove ad-hoc occurrence
export function createBillOccurrenceHandlerDelete() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId, occurrenceId } = extractOccurrenceIds(url.pathname, 'bills');
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:instanceId/occurrences/:occurrenceId'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.removeBillOccurrence(month, instanceId, occurrenceId);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Bill occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Occurrence Delete failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to remove bill occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// DELETE /api/months/:month/incomes/:instanceId/occurrences/:occurrenceId - Remove ad-hoc occurrence
export function createIncomeOccurrenceHandlerDelete() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, instanceId, occurrenceId } = extractOccurrenceIds(url.pathname, 'incomes');
      
      if (!month || !instanceId || !occurrenceId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:instanceId/occurrences/:occurrenceId'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.removeIncomeOccurrence(month, instanceId, occurrenceId);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Income occurrence not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Occurrence Delete failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to remove income occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// DELETE /api/months/:month/bills/:instanceId/occurrences/:occurrenceId/payments/:paymentId - Remove payment from occurrence
export function createDeleteBillOccurrencePaymentHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^/]+)\/occurrences\/([^/]+)\/payments\/([^/]+)/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      const occurrenceId = match ? match[3] : null;
      const paymentId = match ? match[4] : null;
      
      if (!month || !instanceId || !occurrenceId || !paymentId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:instanceId/occurrences/:occurrenceId/payments/:paymentId'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.removeBillOccurrencePayment(month, instanceId, occurrenceId, paymentId);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Payment not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const bill = instance.bill_id ? await billsService.getById(instance.bill_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || bill?.name || 'Unknown Bill'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Occurrence Payment Delete failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to remove payment from bill occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// DELETE /api/months/:month/incomes/:instanceId/occurrences/:occurrenceId/payments/:paymentId - Remove payment from occurrence
export function createDeleteIncomeOccurrencePaymentHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/incomes\/([^/]+)\/occurrences\/([^/]+)\/payments\/([^/]+)/);
      const month = match ? match[1] : null;
      const instanceId = match ? match[2] : null;
      const occurrenceId = match ? match[3] : null;
      const paymentId = match ? match[4] : null;
      
      if (!month || !instanceId || !occurrenceId || !paymentId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:instanceId/occurrences/:occurrenceId/payments/:paymentId'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      const instance = await monthsService.removeIncomeOccurrencePayment(month, instanceId, occurrenceId, paymentId);
      
      if (!instance) {
        return new Response(JSON.stringify({
          error: `Payment not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const income = instance.income_id ? await incomesService.getById(instance.income_id) : null;
      const enrichedInstance = {
        ...instance,
        name: instance.name || income?.name || 'Unknown Income'
      };
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        instance: enrichedInstance,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Occurrence Payment Delete failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to remove payment from income occurrence'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// ============================================================================
// Instance Delete Handlers (Delete any bill/income instance from month)
// ============================================================================

// DELETE /api/months/:month/bills/:id - Delete any bill instance from month
export function createBillInstanceHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, id } = extractMonthAndId(url.pathname, 'bills');
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      // Get month data and find the instance
      const monthData = await monthsService.getMonthlyData(month);
      if (!monthData) {
        return new Response(JSON.stringify({
          error: `Month ${month} not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const instanceIndex = monthData.bill_instances.findIndex(bi => bi.id === id);
      if (instanceIndex === -1) {
        return new Response(JSON.stringify({
          error: `Bill instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      // Remove the instance
      monthData.bill_instances.splice(instanceIndex, 1);
      await monthsService.saveMonthlyData(month, monthData);
      
      // Calculate updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({ success: true, summary }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Bill Instance DELETE failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to delete bill instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// DELETE /api/months/:month/incomes/:id - Delete any income instance from month
export function createIncomeInstanceHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, id } = extractMonthAndId(url.pathname, 'incomes');
      
      if (!month || !id) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/incomes/:id'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Check if month is read-only
      const readOnlyResponse = await checkReadOnly(month);
      if (readOnlyResponse) return readOnlyResponse;
      
      // Get month data and find the instance
      const monthData = await monthsService.getMonthlyData(month);
      if (!monthData) {
        return new Response(JSON.stringify({
          error: `Month ${month} not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const instanceIndex = monthData.income_instances.findIndex(ii => ii.id === id);
      if (instanceIndex === -1) {
        return new Response(JSON.stringify({
          error: `Income instance ${id} not found in month ${month}`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      // Remove the instance
      monthData.income_instances.splice(instanceIndex, 1);
      await monthsService.saveMonthlyData(month, monthData);
      
      // Calculate updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({ success: true, summary }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[InstancesHandler] Income Instance DELETE failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to delete income instance'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}
