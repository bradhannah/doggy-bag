// Variable Expenses API Handlers
// CRUD operations for variable expenses within a month

import { MonthsServiceImpl } from '../../services/months-service';
import { LeftoverServiceImpl } from '../../services/leftover-service';
import { formatErrorForUser } from '../../utils/errors';
import type { VariableExpense } from '../../types';

const monthsService = new MonthsServiceImpl();
const leftoverService = new LeftoverServiceImpl();

// Helper to extract month from URL path
function extractMonth(pathname: string): string | null {
  const match = pathname.match(/\/api\/months\/(\d{4}-\d{2})/);
  return match ? match[1] : null;
}

// Helper to extract expense ID from URL path
function extractExpenseId(pathname: string): string | null {
  const match = pathname.match(/\/expenses\/([a-f0-9-]+)$/);
  return match ? match[1] : null;
}

// GET /api/months/:month/expenses - Get all variable expenses for a month
export function createExpensesHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const month = extractMonth(url.pathname);
      
      if (!month) {
        return new Response(JSON.stringify({
          error: 'Invalid month format. Expected YYYY-MM'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const monthlyData = await monthsService.getMonthlyData(month);
      
      if (!monthlyData) {
        return new Response(JSON.stringify({
          error: `Monthly data for ${month} not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      return new Response(JSON.stringify(monthlyData.variable_expenses), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[ExpensesHandler] GET failed:', error);
      return new Response(JSON.stringify({
        error: formatErrorForUser(error)
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/months/:month/expenses - Create a new variable expense
export function createExpensesHandlerPOST() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const month = extractMonth(url.pathname);
      
      if (!month) {
        return new Response(JSON.stringify({
          error: 'Invalid month format. Expected YYYY-MM'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const monthlyData = await monthsService.getMonthlyData(month);
      
      if (!monthlyData) {
        return new Response(JSON.stringify({
          error: `Monthly data for ${month} not found. Generate it first.`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const body = await request.json();
      
      // Validate required fields
      if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        return new Response(JSON.stringify({
          error: 'Name is required'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return new Response(JSON.stringify({
          error: 'Amount must be a positive number'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const now = new Date().toISOString();
      const newExpense: VariableExpense = {
        id: crypto.randomUUID(),
        name: body.name.trim(),
        amount: Math.round(body.amount), // Store as cents
        payment_source_id: body.payment_source_id || '',
        month,
        created_at: now,
        updated_at: now
      };
      
      monthlyData.variable_expenses.push(newExpense);
      monthlyData.updated_at = now;
      
      await monthsService.saveMonthlyData(month, monthlyData);
      
      // Return the new expense with updated summary
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        expense: newExpense,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201
      });
    } catch (error) {
      console.error('[ExpensesHandler] POST failed:', error);
      return new Response(JSON.stringify({
        error: formatErrorForUser(error)
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// PUT /api/months/:month/expenses/:id - Update a variable expense
export function createExpensesHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const month = extractMonth(url.pathname);
      const expenseId = extractExpenseId(url.pathname);
      
      if (!month) {
        return new Response(JSON.stringify({
          error: 'Invalid month format. Expected YYYY-MM'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      if (!expenseId) {
        return new Response(JSON.stringify({
          error: 'Expense ID is required'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const monthlyData = await monthsService.getMonthlyData(month);
      
      if (!monthlyData) {
        return new Response(JSON.stringify({
          error: `Monthly data for ${month} not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const expenseIndex = monthlyData.variable_expenses.findIndex(e => e.id === expenseId);
      
      if (expenseIndex === -1) {
        return new Response(JSON.stringify({
          error: 'Expense not found'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const body = await request.json();
      const now = new Date().toISOString();
      
      const updatedExpense: VariableExpense = {
        ...monthlyData.variable_expenses[expenseIndex],
        name: body.name?.trim() || monthlyData.variable_expenses[expenseIndex].name,
        amount: typeof body.amount === 'number' ? Math.round(body.amount) : monthlyData.variable_expenses[expenseIndex].amount,
        payment_source_id: body.payment_source_id ?? monthlyData.variable_expenses[expenseIndex].payment_source_id,
        updated_at: now
      };
      
      monthlyData.variable_expenses[expenseIndex] = updatedExpense;
      monthlyData.updated_at = now;
      
      await monthsService.saveMonthlyData(month, monthlyData);
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        expense: updatedExpense,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[ExpensesHandler] PUT failed:', error);
      return new Response(JSON.stringify({
        error: formatErrorForUser(error)
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// DELETE /api/months/:month/expenses/:id - Delete a variable expense
export function createExpensesHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const month = extractMonth(url.pathname);
      const expenseId = extractExpenseId(url.pathname);
      
      if (!month) {
        return new Response(JSON.stringify({
          error: 'Invalid month format. Expected YYYY-MM'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      if (!expenseId) {
        return new Response(JSON.stringify({
          error: 'Expense ID is required'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const monthlyData = await monthsService.getMonthlyData(month);
      
      if (!monthlyData) {
        return new Response(JSON.stringify({
          error: `Monthly data for ${month} not found`
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      const expenseIndex = monthlyData.variable_expenses.findIndex(e => e.id === expenseId);
      
      if (expenseIndex === -1) {
        return new Response(JSON.stringify({
          error: 'Expense not found'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      monthlyData.variable_expenses.splice(expenseIndex, 1);
      monthlyData.updated_at = new Date().toISOString();
      
      await monthsService.saveMonthlyData(month, monthlyData);
      
      const summary = await leftoverService.calculateLeftover(month);
      
      return new Response(JSON.stringify({
        success: true,
        summary
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[ExpensesHandler] DELETE failed:', error);
      return new Response(JSON.stringify({
        error: formatErrorForUser(error)
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}
