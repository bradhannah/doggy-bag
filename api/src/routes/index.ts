// Main routes file - Combined routes from all modules

import { createHealthHandler, createTestHandler } from './handlers/common.handlers';

import {
  createPaymentSourcesHandlerGET,
  createPaymentSourcesHandlerPOST,
  createPaymentSourcesHandlerPUT,
  createPaymentSourcesHandlerDELETE,
  createPaymentSourcesSavingsHandlerGET,
} from './handlers/payment-sources.handlers';

import {
  createBillsHandlerGET,
  createBillsHandlerPOST,
  createBillsHandlerPUT,
  createBillsHandlerDELETE,
} from './handlers/bills.handlers';

import {
  createIncomesHandlerGET,
  createIncomesHandlerPOST,
  createIncomesHandlerPUT,
  createIncomesHandlerDELETE,
} from './handlers/incomes.handlers';

import {
  createMonthsHandlerGET,
  createMonthsHandlerList,
  createMonthsHandlerGenerate,
  createMonthsHandlerSync,
  createMonthsHandlerSyncMetadata,
  createMonthsHandlerUpdateBalances,
  createMonthsHandlerUpdateSavingsBalances,
  createMonthsHandlerSummary,
  createMonthsHandlerManage,
  createMonthsHandlerExists,
  createMonthsHandlerCreate,
  createMonthsHandlerDelete,
  createMonthsHandlerLock,
} from './handlers/months.handlers';

import {
  createExpensesHandlerGET,
  createExpensesHandlerPOST,
  createExpensesHandlerPUT,
  createExpensesHandlerDELETE,
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
  createIncomeInstanceHandlerUpdateExpected,
  createBillInstanceHandlerDELETE,
  createIncomeInstanceHandlerDELETE,
  // Occurrence handlers
  createBillOccurrenceHandlerPUT,
  createIncomeOccurrenceHandlerPUT,
  createBillOccurrenceHandlerClose,
  createBillOccurrenceHandlerReopen,
  createIncomeOccurrenceHandlerClose,
  createIncomeOccurrenceHandlerReopen,
  createBillOccurrencePaymentHandler,
  createIncomeOccurrencePaymentHandler,
  createBillAdhocOccurrenceHandler,
  createIncomeAdhocOccurrenceHandler,
  createBillOccurrenceHandlerDelete,
  createIncomeOccurrenceHandlerDelete,
  createDeleteBillOccurrencePaymentHandler,
  createDeleteIncomeOccurrencePaymentHandler,
} from './handlers/instances.handlers';

import {
  createCategoriesHandlerGET,
  createCategoriesHandlerPOST,
  createCategoriesHandlerPUT,
  createCategoriesHandlerDELETE,
  createCategoriesReorderHandler,
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
  createGetIncomePaymentsHandler,
} from './handlers/payments.handlers';

import {
  createBackupHandlerGET,
  createBackupHandlerPOST,
  createBackupHandlerValidate,
  createVersionHandlerGET,
  createVersionCheckHandler,
  createVersionBackupsListHandler,
  createVersionBackupRestoreHandler,
  createVersionBackupDeleteHandler,
  createManualBackupHandler,
} from './handlers/backup.handlers';

import {
  createAdhocBillHandlerPOST,
  createAdhocBillHandlerPUT,
  createAdhocBillHandlerDELETE,
  createMakeRegularBillHandler,
  createAdhocIncomeHandlerPOST,
  createAdhocIncomeHandlerPUT,
  createAdhocIncomeHandlerDELETE,
  createMakeRegularIncomeHandler,
} from './handlers/adhoc.handlers';

import {
  getSettings,
  getDataDirectory,
  validateDirectory,
  migrateData,
  switchDirectory,
} from './handlers/settings';

import {
  createInsurancePlansHandlerGET,
  createInsurancePlansHandlerPOST,
  createInsurancePlansHandlerPUT,
  createInsurancePlansHandlerDELETE,
} from './handlers/insurance-plans.handlers';

import {
  createInsuranceCategoriesHandlerGET,
  createInsuranceCategoriesHandlerPOST,
  createInsuranceCategoriesHandlerPUT,
  createInsuranceCategoriesHandlerDELETE,
} from './handlers/insurance-categories.handlers';

import {
  createInsuranceClaimsHandlerGET,
  createInsuranceClaimsSummaryHandler,
  createInsuranceClaimsHandlerPOST,
  createInsuranceClaimsHandlerPUT,
  createInsuranceClaimsHandlerDELETE,
  createClaimDocumentUploadHandler,
  createClaimDocumentDownloadHandler,
  createClaimDocumentDeleteHandler,
  createClaimSubmissionPOSTHandler,
  createClaimSubmissionPUTHandler,
  createClaimSubmissionDELETEHandler,
} from './handlers/insurance-claims.handlers';

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
  {
    path: '/api/seed-defaults',
    definition: { method: 'POST', handler: createSeedDefaultsHandler() },
  },

  // Backup
  { path: '/api/backup', definition: { method: 'GET', handler: createBackupHandlerGET() } },
  { path: '/api/backup', definition: { method: 'POST', handler: createBackupHandlerPOST() } },
  {
    path: '/api/backup/validate',
    definition: { method: 'POST', handler: createBackupHandlerValidate() },
  },

  // Version & Version Backups
  { path: '/api/version', definition: { method: 'GET', handler: createVersionHandlerGET() } },
  {
    path: '/api/version/check',
    definition: { method: 'POST', handler: createVersionCheckHandler() },
  },
  {
    path: '/api/version/backups',
    definition: { method: 'GET', handler: createVersionBackupsListHandler() },
  },
  {
    path: '/api/version/backups/manual',
    definition: { method: 'POST', handler: createManualBackupHandler() },
  },
  {
    path: '/api/version/backups/restore',
    definition: {
      method: 'POST',
      handler: createVersionBackupRestoreHandler(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/version/backups',
    definition: {
      method: 'DELETE',
      handler: createVersionBackupDeleteHandler(),
      hasPathParam: true,
    },
  },

  // Settings
  { path: '/api/settings', definition: { method: 'GET', handler: getSettings } },
  {
    path: '/api/settings/data-directory',
    definition: { method: 'GET', handler: getDataDirectory },
  },
  {
    path: '/api/settings/validate-directory',
    definition: { method: 'POST', handler: validateDirectory },
  },
  { path: '/api/settings/migrate-data', definition: { method: 'POST', handler: migrateData } },
  {
    path: '/api/settings/switch-directory',
    definition: { method: 'POST', handler: switchDirectory },
  },

  // Categories
  { path: '/api/categories', definition: { method: 'GET', handler: createCategoriesHandlerGET() } },
  {
    path: '/api/categories',
    definition: { method: 'POST', handler: createCategoriesHandlerPOST() },
  },
  {
    path: '/api/categories',
    definition: { method: 'PUT', handler: createCategoriesHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/categories',
    definition: { method: 'DELETE', handler: createCategoriesHandlerDELETE(), hasPathParam: true },
  },
  {
    path: '/api/categories/reorder',
    definition: { method: 'PUT', handler: createCategoriesReorderHandler() },
  },

  // Insurance Plans
  {
    path: '/api/insurance-plans',
    definition: { method: 'GET', handler: createInsurancePlansHandlerGET() },
  },
  {
    path: '/api/insurance-plans',
    definition: { method: 'POST', handler: createInsurancePlansHandlerPOST() },
  },
  {
    path: '/api/insurance-plans',
    definition: { method: 'PUT', handler: createInsurancePlansHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/insurance-plans',
    definition: {
      method: 'DELETE',
      handler: createInsurancePlansHandlerDELETE(),
      hasPathParam: true,
    },
  },

  // Insurance Categories
  {
    path: '/api/insurance-categories',
    definition: { method: 'GET', handler: createInsuranceCategoriesHandlerGET() },
  },
  {
    path: '/api/insurance-categories',
    definition: { method: 'POST', handler: createInsuranceCategoriesHandlerPOST() },
  },
  {
    path: '/api/insurance-categories',
    definition: {
      method: 'PUT',
      handler: createInsuranceCategoriesHandlerPUT(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/insurance-categories',
    definition: {
      method: 'DELETE',
      handler: createInsuranceCategoriesHandlerDELETE(),
      hasPathParam: true,
    },
  },

  // Insurance Claims - summary route must come before generic claims route
  {
    path: '/api/insurance-claims/summary',
    definition: { method: 'GET', handler: createInsuranceClaimsSummaryHandler() },
  },
  // Insurance Claims - document routes must come before generic claims routes
  {
    path: '/api/insurance-claims/documents',
    definition: { method: 'POST', handler: createClaimDocumentUploadHandler(), hasPathParam: true },
  },
  {
    path: '/api/insurance-claims/documents',
    definition: {
      method: 'GET',
      handler: createClaimDocumentDownloadHandler(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/insurance-claims/documents',
    definition: {
      method: 'DELETE',
      handler: createClaimDocumentDeleteHandler(),
      hasPathParam: true,
    },
  },
  // Insurance Claims - submission routes
  {
    path: '/api/insurance-claims/submissions',
    definition: { method: 'POST', handler: createClaimSubmissionPOSTHandler(), hasPathParam: true },
  },
  {
    path: '/api/insurance-claims/submissions',
    definition: { method: 'PUT', handler: createClaimSubmissionPUTHandler(), hasPathParam: true },
  },
  {
    path: '/api/insurance-claims/submissions',
    definition: {
      method: 'DELETE',
      handler: createClaimSubmissionDELETEHandler(),
      hasPathParam: true,
    },
  },
  // Insurance Claims - main CRUD
  {
    path: '/api/insurance-claims',
    definition: { method: 'GET', handler: createInsuranceClaimsHandlerGET(), hasPathParam: true },
  },
  {
    path: '/api/insurance-claims',
    definition: { method: 'POST', handler: createInsuranceClaimsHandlerPOST() },
  },
  {
    path: '/api/insurance-claims',
    definition: { method: 'PUT', handler: createInsuranceClaimsHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/insurance-claims',
    definition: {
      method: 'DELETE',
      handler: createInsuranceClaimsHandlerDELETE(),
      hasPathParam: true,
    },
  },

  // Payment Sources - savings endpoint must come before generic payment-sources routes
  {
    path: '/api/payment-sources/savings',
    definition: { method: 'GET', handler: createPaymentSourcesSavingsHandlerGET() },
  },
  {
    path: '/api/payment-sources',
    definition: { method: 'GET', handler: createPaymentSourcesHandlerGET() },
  },
  {
    path: '/api/payment-sources',
    definition: { method: 'POST', handler: createPaymentSourcesHandlerPOST() },
  },
  {
    path: '/api/payment-sources',
    definition: { method: 'PUT', handler: createPaymentSourcesHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/payment-sources',
    definition: {
      method: 'DELETE',
      handler: createPaymentSourcesHandlerDELETE(),
      hasPathParam: true,
    },
  },

  // Bills
  { path: '/api/bills', definition: { method: 'GET', handler: createBillsHandlerGET() } },
  { path: '/api/bills', definition: { method: 'POST', handler: createBillsHandlerPOST() } },
  {
    path: '/api/bills',
    definition: { method: 'PUT', handler: createBillsHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/bills',
    definition: { method: 'DELETE', handler: createBillsHandlerDELETE(), hasPathParam: true },
  },

  // Incomes
  { path: '/api/incomes', definition: { method: 'GET', handler: createIncomesHandlerGET() } },
  { path: '/api/incomes', definition: { method: 'POST', handler: createIncomesHandlerPOST() } },
  {
    path: '/api/incomes',
    definition: { method: 'PUT', handler: createIncomesHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/incomes',
    definition: { method: 'DELETE', handler: createIncomesHandlerDELETE(), hasPathParam: true },
  },

  // Months list - must come before specific month routes
  { path: '/api/months', definition: { method: 'GET', handler: createMonthsHandlerList() } },

  // Month management routes - must come before other month routes with path params
  {
    path: '/api/months/manage',
    definition: { method: 'GET', handler: createMonthsHandlerManage() },
  },
  {
    path: '/api/months/exists',
    definition: { method: 'GET', handler: createMonthsHandlerExists(), hasPathParam: true },
  },
  {
    path: '/api/months/create',
    definition: { method: 'POST', handler: createMonthsHandlerCreate(), hasPathParam: true },
  },
  {
    path: '/api/months/lock',
    definition: { method: 'POST', handler: createMonthsHandlerLock(), hasPathParam: true },
  },

  // Months - routes with sub-paths (generate, bank-balances, summary, detailed) first for proper matching
  {
    path: '/api/months/detailed',
    definition: { method: 'GET', handler: createDetailedViewHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/generate',
    definition: { method: 'POST', handler: createMonthsHandlerGenerate(), hasPathParam: true },
  },
  {
    path: '/api/months/sync',
    definition: { method: 'POST', handler: createMonthsHandlerSync(), hasPathParam: true },
  },
  {
    path: '/api/months/sync-metadata',
    definition: { method: 'POST', handler: createMonthsHandlerSyncMetadata(), hasPathParam: true },
  },
  {
    path: '/api/months/bank-balances',
    definition: { method: 'PUT', handler: createMonthsHandlerUpdateBalances(), hasPathParam: true },
  },
  {
    path: '/api/months/savings-balances',
    definition: {
      method: 'PUT',
      handler: createMonthsHandlerUpdateSavingsBalances(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/summary',
    definition: { method: 'GET', handler: createMonthsHandlerSummary(), hasPathParam: true },
  },

  // Bill instances - must come before expenses for proper matching
  // Occurrence routes must come before other bill instance routes
  {
    path: '/api/months/bills/occurrences/close',
    definition: { method: 'POST', handler: createBillOccurrenceHandlerClose(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/occurrences/reopen',
    definition: {
      method: 'POST',
      handler: createBillOccurrenceHandlerReopen(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/bills/occurrences/payments',
    definition: {
      method: 'POST',
      handler: createBillOccurrencePaymentHandler(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/bills/occurrences/payments',
    definition: {
      method: 'DELETE',
      handler: createDeleteBillOccurrencePaymentHandler(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/bills/occurrences',
    definition: { method: 'POST', handler: createBillAdhocOccurrenceHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/occurrences',
    definition: { method: 'PUT', handler: createBillOccurrenceHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/occurrences',
    definition: {
      method: 'DELETE',
      handler: createBillOccurrenceHandlerDelete(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/bills/payments',
    definition: { method: 'GET', handler: createGetPaymentsHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/payments',
    definition: { method: 'POST', handler: createAddPaymentHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/payments',
    definition: { method: 'PUT', handler: createUpdatePaymentHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/payments',
    definition: { method: 'DELETE', handler: createDeletePaymentHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/reset',
    definition: { method: 'POST', handler: createBillInstanceHandlerReset(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/paid',
    definition: {
      method: 'POST',
      handler: createBillInstanceHandlerTogglePaid(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/bills/close',
    definition: { method: 'POST', handler: createBillInstanceHandlerClose(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/reopen',
    definition: { method: 'POST', handler: createBillInstanceHandlerReopen(), hasPathParam: true },
  },
  {
    path: '/api/months/bills/expected',
    definition: {
      method: 'PUT',
      handler: createBillInstanceHandlerUpdateExpected(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/bills',
    definition: { method: 'PUT', handler: createBillInstanceHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/months/bills',
    definition: {
      method: 'DELETE',
      handler: createBillInstanceHandlerDELETE(),
      hasPathParam: true,
    },
  },

  // Income instances
  // Occurrence routes must come before other income instance routes
  {
    path: '/api/months/incomes/occurrences/close',
    definition: {
      method: 'POST',
      handler: createIncomeOccurrenceHandlerClose(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/occurrences/reopen',
    definition: {
      method: 'POST',
      handler: createIncomeOccurrenceHandlerReopen(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/occurrences/payments',
    definition: {
      method: 'POST',
      handler: createIncomeOccurrencePaymentHandler(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/occurrences/payments',
    definition: {
      method: 'DELETE',
      handler: createDeleteIncomeOccurrencePaymentHandler(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/occurrences',
    definition: {
      method: 'POST',
      handler: createIncomeAdhocOccurrenceHandler(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/occurrences',
    definition: { method: 'PUT', handler: createIncomeOccurrenceHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/months/incomes/occurrences',
    definition: {
      method: 'DELETE',
      handler: createIncomeOccurrenceHandlerDelete(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/payments',
    definition: { method: 'GET', handler: createGetIncomePaymentsHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/incomes/payments',
    definition: { method: 'POST', handler: createAddIncomePaymentHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/incomes/payments',
    definition: { method: 'PUT', handler: createUpdateIncomePaymentHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/incomes/payments',
    definition: {
      method: 'DELETE',
      handler: createDeleteIncomePaymentHandler(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/reset',
    definition: { method: 'POST', handler: createIncomeInstanceHandlerReset(), hasPathParam: true },
  },
  {
    path: '/api/months/incomes/paid',
    definition: {
      method: 'POST',
      handler: createIncomeInstanceHandlerTogglePaid(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/close',
    definition: { method: 'POST', handler: createIncomeInstanceHandlerClose(), hasPathParam: true },
  },
  {
    path: '/api/months/incomes/reopen',
    definition: {
      method: 'POST',
      handler: createIncomeInstanceHandlerReopen(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes/expected',
    definition: {
      method: 'PUT',
      handler: createIncomeInstanceHandlerUpdateExpected(),
      hasPathParam: true,
    },
  },
  {
    path: '/api/months/incomes',
    definition: { method: 'PUT', handler: createIncomeInstanceHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/months/incomes',
    definition: {
      method: 'DELETE',
      handler: createIncomeInstanceHandlerDELETE(),
      hasPathParam: true,
    },
  },

  // Ad-hoc bills - make-regular must come before other adhoc routes
  {
    path: '/api/months/adhoc/bills/make-regular',
    definition: { method: 'POST', handler: createMakeRegularBillHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/adhoc/bills',
    definition: { method: 'POST', handler: createAdhocBillHandlerPOST(), hasPathParam: true },
  },
  {
    path: '/api/months/adhoc/bills',
    definition: { method: 'PUT', handler: createAdhocBillHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/months/adhoc/bills',
    definition: { method: 'DELETE', handler: createAdhocBillHandlerDELETE(), hasPathParam: true },
  },

  // Ad-hoc incomes - make-regular must come before other adhoc routes
  {
    path: '/api/months/adhoc/incomes/make-regular',
    definition: { method: 'POST', handler: createMakeRegularIncomeHandler(), hasPathParam: true },
  },
  {
    path: '/api/months/adhoc/incomes',
    definition: { method: 'POST', handler: createAdhocIncomeHandlerPOST(), hasPathParam: true },
  },
  {
    path: '/api/months/adhoc/incomes',
    definition: { method: 'PUT', handler: createAdhocIncomeHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/months/adhoc/incomes',
    definition: { method: 'DELETE', handler: createAdhocIncomeHandlerDELETE(), hasPathParam: true },
  },

  // Variable expenses
  {
    path: '/api/months/expenses',
    definition: { method: 'GET', handler: createExpensesHandlerGET(), hasPathParam: true },
  },
  {
    path: '/api/months/expenses',
    definition: { method: 'POST', handler: createExpensesHandlerPOST(), hasPathParam: true },
  },
  {
    path: '/api/months/expenses',
    definition: { method: 'PUT', handler: createExpensesHandlerPUT(), hasPathParam: true },
  },
  {
    path: '/api/months/expenses',
    definition: { method: 'DELETE', handler: createExpensesHandlerDELETE(), hasPathParam: true },
  },

  // Month DELETE must come after other /api/months/* routes
  {
    path: '/api/months',
    definition: { method: 'DELETE', handler: createMonthsHandlerDelete(), hasPathParam: true },
  },
  {
    path: '/api/months',
    definition: { method: 'GET', handler: createMonthsHandlerGET(), hasPathParam: true },
  },
];
