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
  createMonthsHandlerList,
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
  createBillInstanceHandlerTogglePaid,
  createIncomeInstanceHandlerPUT,
  createIncomeInstanceHandlerReset,
  createIncomeInstanceHandlerTogglePaid,
  createBillInstanceHandlerClose,
  createBillInstanceHandlerReopen,
  createIncomeInstanceHandlerClose,
  createIncomeInstanceHandlerReopen,
  createBillInstanceHandlerUpdateExpected,
  createIncomeInstanceHandlerUpdateExpected
} from './handlers/instances.handlers';

import {
  createCategoriesHandlerGET,
  createCategoriesHandlerPOST,
  createCategoriesHandlerPUT,
  createCategoriesHandlerDELETE,
  createCategoriesReorderHandler
} from './handlers/categories.handlers';

import { createSeedDefaultsHandler } from './handlers/seed.handlers';

import { createDetailedViewHandler } from './handlers/detailed-view.handlers';

import {
  createAddPaymentHandler,
  createUpdatePaymentHandler,
  createDeletePaymentHandler,
  createGetPaymentsHandler,
  createAddIncomePaymentHandler,
  createUpdateIncomePaymentHandler,
  createDeleteIncomePaymentHandler,
  createGetIncomePaymentsHandler
} from './handlers/payments.handlers';

import {
  createUndoHandlerGET,
  createUndoHandlerPOST,
  createUndoHandlerDELETE
} from './handlers/undo.handlers';

import {
  createBackupHandlerGET,
  createBackupHandlerPOST,
  createBackupHandlerValidate
} from './handlers/backup.handlers';

import {
  createAdhocBillHandlerPOST,
  createAdhocBillHandlerPUT,
  createAdhocBillHandlerDELETE,
  createMakeRegularBillHandler,
  createAdhocIncomeHandlerPOST,
  createAdhocIncomeHandlerPUT,
  createAdhocIncomeHandlerDELETE,
  createMakeRegularIncomeHandler
} from './handlers/adhoc.handlers';

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
  
  // Seed Defaults
  { path: '/api/seed-defaults', definition: { method: 'POST', handler: createSeedDefaultsHandler() } },
  
  // Undo
  { path: '/api/undo', definition: { method: 'GET', handler: createUndoHandlerGET() } },
  { path: '/api/undo', definition: { method: 'POST', handler: createUndoHandlerPOST() } },
  { path: '/api/undo', definition: { method: 'DELETE', handler: createUndoHandlerDELETE() } },
  
  // Backup
  { path: '/api/backup', definition: { method: 'GET', handler: createBackupHandlerGET() } },
  { path: '/api/backup', definition: { method: 'POST', handler: createBackupHandlerPOST() } },
  { path: '/api/backup/validate', definition: { method: 'POST', handler: createBackupHandlerValidate() } },
  
  // Categories
  { path: '/api/categories', definition: { method: 'GET', handler: createCategoriesHandlerGET() } },
  { path: '/api/categories', definition: { method: 'POST', handler: createCategoriesHandlerPOST() } },
  { path: '/api/categories', definition: { method: 'PUT', handler: createCategoriesHandlerPUT(), hasPathParam: true } },
  { path: '/api/categories', definition: { method: 'DELETE', handler: createCategoriesHandlerDELETE(), hasPathParam: true } },
  { path: '/api/categories/reorder', definition: { method: 'PUT', handler: createCategoriesReorderHandler() } },
  
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
  
  // Months list - must come before specific month routes
  { path: '/api/months', definition: { method: 'GET', handler: createMonthsHandlerList() } },
  
  // Months - routes with sub-paths (generate, bank-balances, summary, detailed) first for proper matching
  { path: '/api/months/detailed', definition: { method: 'GET', handler: createDetailedViewHandler(), hasPathParam: true } },
  { path: '/api/months/generate', definition: { method: 'POST', handler: createMonthsHandlerGenerate(), hasPathParam: true } },
  { path: '/api/months/sync', definition: { method: 'POST', handler: createMonthsHandlerSync(), hasPathParam: true } },
  { path: '/api/months/bank-balances', definition: { method: 'PUT', handler: createMonthsHandlerUpdateBalances(), hasPathParam: true } },
  { path: '/api/months/summary', definition: { method: 'GET', handler: createMonthsHandlerSummary(), hasPathParam: true } },
  
  // Bill instances - must come before expenses for proper matching
  { path: '/api/months/bills/payments', definition: { method: 'GET', handler: createGetPaymentsHandler(), hasPathParam: true } },
  { path: '/api/months/bills/payments', definition: { method: 'POST', handler: createAddPaymentHandler(), hasPathParam: true } },
  { path: '/api/months/bills/payments', definition: { method: 'PUT', handler: createUpdatePaymentHandler(), hasPathParam: true } },
  { path: '/api/months/bills/payments', definition: { method: 'DELETE', handler: createDeletePaymentHandler(), hasPathParam: true } },
  { path: '/api/months/bills/reset', definition: { method: 'POST', handler: createBillInstanceHandlerReset(), hasPathParam: true } },
  { path: '/api/months/bills/paid', definition: { method: 'POST', handler: createBillInstanceHandlerTogglePaid(), hasPathParam: true } },
  { path: '/api/months/bills/close', definition: { method: 'POST', handler: createBillInstanceHandlerClose(), hasPathParam: true } },
  { path: '/api/months/bills/reopen', definition: { method: 'POST', handler: createBillInstanceHandlerReopen(), hasPathParam: true } },
  { path: '/api/months/bills/expected', definition: { method: 'PUT', handler: createBillInstanceHandlerUpdateExpected(), hasPathParam: true } },
  { path: '/api/months/bills', definition: { method: 'PUT', handler: createBillInstanceHandlerPUT(), hasPathParam: true } },
  
  // Income instances
  { path: '/api/months/incomes/payments', definition: { method: 'GET', handler: createGetIncomePaymentsHandler(), hasPathParam: true } },
  { path: '/api/months/incomes/payments', definition: { method: 'POST', handler: createAddIncomePaymentHandler(), hasPathParam: true } },
  { path: '/api/months/incomes/payments', definition: { method: 'PUT', handler: createUpdateIncomePaymentHandler(), hasPathParam: true } },
  { path: '/api/months/incomes/payments', definition: { method: 'DELETE', handler: createDeleteIncomePaymentHandler(), hasPathParam: true } },
  { path: '/api/months/incomes/reset', definition: { method: 'POST', handler: createIncomeInstanceHandlerReset(), hasPathParam: true } },
  { path: '/api/months/incomes/paid', definition: { method: 'POST', handler: createIncomeInstanceHandlerTogglePaid(), hasPathParam: true } },
  { path: '/api/months/incomes/close', definition: { method: 'POST', handler: createIncomeInstanceHandlerClose(), hasPathParam: true } },
  { path: '/api/months/incomes/reopen', definition: { method: 'POST', handler: createIncomeInstanceHandlerReopen(), hasPathParam: true } },
  { path: '/api/months/incomes/expected', definition: { method: 'PUT', handler: createIncomeInstanceHandlerUpdateExpected(), hasPathParam: true } },
  { path: '/api/months/incomes', definition: { method: 'PUT', handler: createIncomeInstanceHandlerPUT(), hasPathParam: true } },
  
  // Ad-hoc bills - make-regular must come before other adhoc routes
  { path: '/api/months/adhoc/bills/make-regular', definition: { method: 'POST', handler: createMakeRegularBillHandler(), hasPathParam: true } },
  { path: '/api/months/adhoc/bills', definition: { method: 'POST', handler: createAdhocBillHandlerPOST(), hasPathParam: true } },
  { path: '/api/months/adhoc/bills', definition: { method: 'PUT', handler: createAdhocBillHandlerPUT(), hasPathParam: true } },
  { path: '/api/months/adhoc/bills', definition: { method: 'DELETE', handler: createAdhocBillHandlerDELETE(), hasPathParam: true } },
  
  // Ad-hoc incomes - make-regular must come before other adhoc routes
  { path: '/api/months/adhoc/incomes/make-regular', definition: { method: 'POST', handler: createMakeRegularIncomeHandler(), hasPathParam: true } },
  { path: '/api/months/adhoc/incomes', definition: { method: 'POST', handler: createAdhocIncomeHandlerPOST(), hasPathParam: true } },
  { path: '/api/months/adhoc/incomes', definition: { method: 'PUT', handler: createAdhocIncomeHandlerPUT(), hasPathParam: true } },
  { path: '/api/months/adhoc/incomes', definition: { method: 'DELETE', handler: createAdhocIncomeHandlerDELETE(), hasPathParam: true } },
  
  // Variable expenses
  { path: '/api/months/expenses', definition: { method: 'GET', handler: createExpensesHandlerGET(), hasPathParam: true } },
  { path: '/api/months/expenses', definition: { method: 'POST', handler: createExpensesHandlerPOST(), hasPathParam: true } },
  { path: '/api/months/expenses', definition: { method: 'PUT', handler: createExpensesHandlerPUT(), hasPathParam: true } },
  { path: '/api/months/expenses', definition: { method: 'DELETE', handler: createExpensesHandlerDELETE(), hasPathParam: true } },
  { path: '/api/months', definition: { method: 'GET', handler: createMonthsHandlerGET(), hasPathParam: true } },
];
