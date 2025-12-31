// Main routes file - Combined routes from all modules

import { 
  createHealthHandler,
  createTestHandler
} from './handlers/common.handlers';

import {
  createPaymentSourcesHandlerGET,
  createPaymentSourcesHandlerPOST,
  createPaymentSourcesHandlerPUT,
  createPaymentSourcesHandlerDELETE
} from './handlers/payment-sources.handlers';

import {
  createBillsHandlerGET,
  createBillsHandlerPOST,
  createBillsHandlerPUT,
  createBillsHandlerDELETE
} from './handlers/bills.handlers';

import {
  createIncomesHandlerGET,
  createIncomesHandlerPOST,
  createIncomesHandlerPUT,
  createIncomesHandlerDELETE
} from './handlers/incomes.handlers';

import {
  createMonthsHandlerGET,
  createMonthsHandlerGenerate,
  createMonthsHandlerSync,
  createMonthsHandlerUpdateBalances,
  createMonthsHandlerSummary
} from './handlers/months.handlers';

import {
  createExpensesHandlerGET,
  createExpensesHandlerPOST,
  createExpensesHandlerPUT,
  createExpensesHandlerDELETE
} from './handlers/expenses.handlers';

import {
  createBillInstanceHandlerPUT,
  createBillInstanceHandlerReset,
  createIncomeInstanceHandlerPUT,
  createIncomeInstanceHandlerReset
} from './handlers/instances.handlers';

// Route definition type
interface RouteDefinition {
  method: string;
  handler: (req: Request) => Promise<Response>;
  hasPathParam?: boolean;
}

// Routes array - allows multiple methods per path
export const routes: Array<{ path: string; definition: RouteDefinition }> = [
  // Health
  { path: '/api/health', definition: { method: 'GET', handler: createHealthHandler() } },
  { path: '/health', definition: { method: 'GET', handler: createHealthHandler() } },
  { path: '/api/test', definition: { method: 'GET', handler: createTestHandler() } },
  
  // Payment Sources
  { path: '/api/payment-sources', definition: { method: 'GET', handler: createPaymentSourcesHandlerGET() } },
  { path: '/api/payment-sources', definition: { method: 'POST', handler: createPaymentSourcesHandlerPOST() } },
  { path: '/api/payment-sources', definition: { method: 'PUT', handler: createPaymentSourcesHandlerPUT(), hasPathParam: true } },
  { path: '/api/payment-sources', definition: { method: 'DELETE', handler: createPaymentSourcesHandlerDELETE(), hasPathParam: true } },
  
  // Bills
  { path: '/api/bills', definition: { method: 'GET', handler: createBillsHandlerGET() } },
  { path: '/api/bills', definition: { method: 'POST', handler: createBillsHandlerPOST() } },
  { path: '/api/bills', definition: { method: 'PUT', handler: createBillsHandlerPUT(), hasPathParam: true } },
  { path: '/api/bills', definition: { method: 'DELETE', handler: createBillsHandlerDELETE(), hasPathParam: true } },
  
  // Incomes
  { path: '/api/incomes', definition: { method: 'GET', handler: createIncomesHandlerGET() } },
  { path: '/api/incomes', definition: { method: 'POST', handler: createIncomesHandlerPOST() } },
  { path: '/api/incomes', definition: { method: 'PUT', handler: createIncomesHandlerPUT(), hasPathParam: true } },
  { path: '/api/incomes', definition: { method: 'DELETE', handler: createIncomesHandlerDELETE(), hasPathParam: true } },
  
  // Months - routes with sub-paths (generate, bank-balances, summary) first for proper matching
  { path: '/api/months/generate', definition: { method: 'POST', handler: createMonthsHandlerGenerate(), hasPathParam: true } },
  { path: '/api/months/sync', definition: { method: 'POST', handler: createMonthsHandlerSync(), hasPathParam: true } },
  { path: '/api/months/bank-balances', definition: { method: 'PUT', handler: createMonthsHandlerUpdateBalances(), hasPathParam: true } },
  { path: '/api/months/summary', definition: { method: 'GET', handler: createMonthsHandlerSummary(), hasPathParam: true } },
  
  // Bill instances - must come before expenses for proper matching
  { path: '/api/months/bills/reset', definition: { method: 'POST', handler: createBillInstanceHandlerReset(), hasPathParam: true } },
  { path: '/api/months/bills', definition: { method: 'PUT', handler: createBillInstanceHandlerPUT(), hasPathParam: true } },
  
  // Income instances
  { path: '/api/months/incomes/reset', definition: { method: 'POST', handler: createIncomeInstanceHandlerReset(), hasPathParam: true } },
  { path: '/api/months/incomes', definition: { method: 'PUT', handler: createIncomeInstanceHandlerPUT(), hasPathParam: true } },
  
  // Variable expenses
  { path: '/api/months/expenses', definition: { method: 'GET', handler: createExpensesHandlerGET(), hasPathParam: true } },
  { path: '/api/months/expenses', definition: { method: 'POST', handler: createExpensesHandlerPOST(), hasPathParam: true } },
  { path: '/api/months/expenses', definition: { method: 'PUT', handler: createExpensesHandlerPUT(), hasPathParam: true } },
  { path: '/api/months/expenses', definition: { method: 'DELETE', handler: createExpensesHandlerDELETE(), hasPathParam: true } },
  { path: '/api/months', definition: { method: 'GET', handler: createMonthsHandlerGET(), hasPathParam: true } },
];
