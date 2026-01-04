// Incomes routes - Route registration

import {
  createIncomesHandlerGET,
  createIncomesHandlerPOST,
  createIncomesHandlerPUT,
  createIncomesHandlerDELETE,
} from './handlers/incomes.handlers';

export const routes = new Map([
  ['/api/incomes', { method: 'GET', handler: createIncomesHandlerGET() }],
  ['/api/incomes', { method: 'POST', handler: createIncomesHandlerPOST() }],
  ['/api/incomes', { method: 'PUT', handler: createIncomesHandlerPUT(), path: true }],
  ['/api/incomes', { method: 'DELETE', handler: createIncomesHandlerDELETE(), path: true }],
]);
