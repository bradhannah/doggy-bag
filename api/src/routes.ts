import {
  HealthController,
  BillsController,
  IncomesController,
  PaymentSourcesController
} from './controllers';
import type { BunServer } from '../server';

/**
 * Register all tsoa controllers with Bun server
 */
import {
  HealthController,
  BillsController,
  IncomesController,
  PaymentSourcesController
} from './controllers';

/**
 * Route registration map (with /api/ prefix)
 */
export const routes = new Map([
  ['/api/health', { method: 'GET', handler: createHealthHandler() }],
  ['/health', { method: 'GET', handler: createHealthHandler() }],
  ['/api/bills', { method: 'GET', handler: () => notImplemented('Bills') }],
  ['/api/bills', { method: 'POST', handler: () => notImplemented('Bills') }],
  ['/api/incomes', { method: 'GET', handler: () => notImplemented('Incomes') }],
  ['/api/incomes', { method: 'POST', handler: () => notImplemented('Incomes') }],
  ['/api/payment-sources', { method: 'GET', handler: () => notImplemented('Payment Sources') }],
  ['/api/payment-sources', { method: 'POST', handler: () => notImplemented('Payment Sources') }],
]);

function createHealthHandler() {
  const healthController = new HealthController();
  return async () => {
    const result = await healthController.getHealth();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  };
}

function notImplemented(name: string) {
  return async () => {
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: 'Not implemented yet' 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 501
    });
  };
}

