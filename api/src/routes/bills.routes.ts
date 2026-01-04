// Bills routes - Route registration

import {
  createBillsHandlerGET,
  createBillsHandlerPOST,
  createBillsHandlerPUT,
  createBillsHandlerDELETE,
} from './handlers/bills.handlers';

export const routes = new Map([
  ['/api/bills', { method: 'GET', handler: createBillsHandlerGET() }],
  ['/api/bills', { method: 'POST', handler: createBillsHandlerPOST() }],
  ['/api/bills', { method: 'PUT', handler: createBillsHandlerPUT(), path: true }],
  ['/api/bills', { method: 'DELETE', handler: createBillsHandlerDELETE(), path: true }],
]);
