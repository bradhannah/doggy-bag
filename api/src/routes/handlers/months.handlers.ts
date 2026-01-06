// Months API Handlers

import { MonthsServiceImpl } from '../../services/months-service';
import { LeftoverServiceImpl } from '../../services/leftover-service';
import { BillsServiceImpl } from '../../services/bills-service';
import { IncomesServiceImpl } from '../../services/incomes-service';
import { formatErrorForUser } from '../../utils/errors';
import type { MonthlyData } from '../../types';

const monthsService = new MonthsServiceImpl();
const leftoverService = new LeftoverServiceImpl();
const billsService = new BillsServiceImpl();
const incomesService = new IncomesServiceImpl();

// Helper to extract month from URL path: /api/months/2025-01 -> 2025-01
function extractMonth(url: string): string | null {
  const match = url.match(/\/api\/months\/(\d{4}-\d{2})/);
  return match ? match[1] : null;
}

// Enrich monthly data with bill/income names for frontend display
async function enrichMonthlyData(monthlyData: MonthlyData) {
  const [bills, incomes] = await Promise.all([billsService.getAll(), incomesService.getAll()]);

  // Create lookup maps
  const billsMap = new Map(bills.map((b) => [b.id, b]));
  const incomesMap = new Map(incomes.map((i) => [i.id, i]));

  // Enrich bill instances with bill details
  const enrichedBillInstances = monthlyData.bill_instances.map((instance) => {
    const bill = instance.bill_id ? billsMap.get(instance.bill_id) : null;
    return {
      ...instance,
      name: instance.name || bill?.name || 'Unknown Bill',
      billing_period: bill?.billing_period || 'monthly',
    };
  });

  // Enrich income instances with income details
  const enrichedIncomeInstances = monthlyData.income_instances.map((instance) => {
    const income = instance.income_id ? incomesMap.get(instance.income_id) : null;
    return {
      ...instance,
      name: instance.name || income?.name || 'Unknown Income',
      billing_period: income?.billing_period || 'monthly',
    };
  });

  return {
    ...monthlyData,
    bill_instances: enrichedBillInstances,
    income_instances: enrichedIncomeInstances,
  };
}

// GET /api/months/:month - Get monthly data with leftover calculation
export function createMonthsHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const month = extractMonth(url.pathname);

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const monthlyData = await monthsService.getMonthlyData(month);

      if (!monthlyData) {
        return new Response(
          JSON.stringify({
            error: `Monthly data for ${month} not found. Generate it first with POST /api/months/${month}/generate`,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      // Enrich with bill/income names and calculate leftover
      const [enrichedData, leftoverResult] = await Promise.all([
        enrichMonthlyData(monthlyData),
        leftoverService.calculateLeftover(month),
      ]);

      return new Response(
        JSON.stringify({
          ...enrichedData,
          summary: leftoverResult,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load monthly data',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// POST /api/months/:month/generate - Generate monthly data from defaults
export function createMonthsHandlerGenerate() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      // Extract month from /api/months/2025-01/generate
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/generate/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if month already exists
      const existingData = await monthsService.getMonthlyData(month);
      if (existingData) {
        return new Response(
          JSON.stringify({
            error: `Monthly data for ${month} already exists. Use POST /api/months/${month}/sync to add missing bills/incomes.`,
            data: existingData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 409,
          }
        );
      }

      const monthlyData = await monthsService.generateMonthlyData(month);

      // Enrich with bill/income names and calculate leftover
      const [enrichedData, leftoverResult] = await Promise.all([
        enrichMonthlyData(monthlyData),
        leftoverService.calculateLeftover(month),
      ]);

      return new Response(
        JSON.stringify({
          ...enrichedData,
          summary: leftoverResult,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 201,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] Generate failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to generate monthly data',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// POST /api/months/:month/sync - Sync monthly data with current bills/incomes (adds missing instances)
export function createMonthsHandlerSync() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      // Extract month from /api/months/2025-01/sync
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/sync/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const monthlyData = await monthsService.syncMonthlyData(month);

      // Enrich with bill/income names and calculate leftover
      const [enrichedData, leftoverResult] = await Promise.all([
        enrichMonthlyData(monthlyData),
        leftoverService.calculateLeftover(month),
      ]);

      return new Response(
        JSON.stringify({
          ...enrichedData,
          summary: leftoverResult,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] Sync failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to sync monthly data',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// PUT /api/months/:month/bank-balances - Update bank balances for a month
export function createMonthsHandlerUpdateBalances() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      // Extract month from /api/months/2025-01/bank-balances
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/bank-balances/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();

      if (typeof body !== 'object' || body === null) {
        return new Response(
          JSON.stringify({
            error:
              'Request body must be an object with payment source IDs as keys and balances as values',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const monthlyData = await monthsService.updateBankBalances(month, body);
      const leftoverResult = await leftoverService.calculateLeftover(month);

      return new Response(
        JSON.stringify({
          ...monthlyData,
          summary: leftoverResult,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] UpdateBalances failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update bank balances',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// GET /api/months/:month/summary - Get just the leftover calculation
export function createMonthsHandlerSummary() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      // Extract month from /api/months/2025-01/summary
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/summary/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const leftoverResult = await leftoverService.calculateLeftover(month);

      return new Response(JSON.stringify(leftoverResult), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[MonthsHandler] Summary failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to calculate summary',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// GET /api/months - List all available months with summaries
export function createMonthsHandlerList() {
  return async (_request: Request) => {
    try {
      const months = await monthsService.getAllMonths();

      return new Response(
        JSON.stringify({
          months,
          count: months.length,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] List failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to list months',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// GET /api/months/manage - List months for management (includes current + next month placeholders)
export function createMonthsHandlerManage() {
  return async (_request: Request) => {
    try {
      const months = await monthsService.getMonthsForManagement();

      return new Response(
        JSON.stringify({
          months,
          count: months.length,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] Manage failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to list months for management',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// GET /api/months/:month/exists - Check if a month exists
export function createMonthsHandlerExists() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/exists/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const exists = await monthsService.monthExists(month);
      const data = exists ? await monthsService.getMonthlyData(month) : null;

      return new Response(
        JSON.stringify({
          month,
          exists,
          is_read_only: data?.is_read_only ?? false,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] Exists check failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to check month existence',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// POST /api/months/:month/create - Create a new month from templates
export function createMonthsHandlerCreate() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/create/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const monthlyData = await monthsService.createMonth(month);

      // Enrich with bill/income names and calculate leftover
      const [enrichedData, leftoverResult] = await Promise.all([
        enrichMonthlyData(monthlyData),
        leftoverService.calculateLeftover(month),
      ]);

      return new Response(
        JSON.stringify({
          ...enrichedData,
          summary: leftoverResult,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 201,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] Create failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const status = errorMessage.includes('already exists') ? 409 : 500;

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create month',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status,
        }
      );
    }
  };
}

// DELETE /api/months/:month - Delete a month
export function createMonthsHandlerDelete() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})$/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await monthsService.deleteMonth(month);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[MonthsHandler] Delete failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const status = errorMessage.includes('read-only')
        ? 403
        : errorMessage.includes('does not exist')
          ? 404
          : 500;

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete month',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status,
        }
      );
    }
  };
}

// POST /api/months/:month/lock - Toggle read-only status
export function createMonthsHandlerLock() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/lock/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const monthlyData = await monthsService.toggleReadOnly(month);

      return new Response(
        JSON.stringify({
          month,
          is_read_only: monthlyData.is_read_only,
          message: monthlyData.is_read_only
            ? 'Month is now locked (read-only)'
            : 'Month is now unlocked (editable)',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] Lock toggle failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to toggle lock status',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// PUT /api/months/:month/savings-balances - Update savings/investment account balances for a month
export function createMonthsHandlerUpdateSavingsBalances() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/api\/months\/(\d{4}-\d{2})\/savings-balances/);
      const month = match ? match[1] : null;

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-01)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();

      // Validate body structure: { start: {id: amount}, end: {id: amount} }
      if (typeof body !== 'object' || body === null) {
        return new Response(
          JSON.stringify({
            error: 'Request body must be an object with start and/or end balance maps',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const { start, end } = body as {
        start?: Record<string, number>;
        end?: Record<string, number>;
      };

      const monthlyData = await monthsService.updateSavingsBalances(month, start, end);

      return new Response(
        JSON.stringify({
          month,
          savings_balances_start: monthlyData.savings_balances_start,
          savings_balances_end: monthlyData.savings_balances_end,
          message: 'Savings balances updated successfully',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[MonthsHandler] UpdateSavingsBalances failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const status = errorMessage.includes('not found') ? 404 : 500;

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update savings balances',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status,
        }
      );
    }
  };
}
