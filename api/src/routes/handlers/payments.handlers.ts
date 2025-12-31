// Payments API Handlers
// Manages partial payments for bill instances

import { PaymentsServiceImpl } from '../../services/payments-service';
import { formatErrorForUser, NotFoundError, ValidationError } from '../../utils/errors';

const paymentsService = new PaymentsServiceImpl();

// Helper to extract params from URL path
// /api/months/2025-01/bills/uuid/payments -> { month: '2025-01', billId: 'uuid' }
// /api/months/2025-01/bills/uuid/payments/payment-uuid -> { month: '2025-01', billId: 'uuid', paymentId: 'payment-uuid' }
function extractPaymentParams(url: string): { month: string | null; billId: string | null; paymentId: string | null } {
  const withPaymentId = url.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^\/]+)\/payments\/([^\/]+)/);
  if (withPaymentId) {
    return { month: withPaymentId[1], billId: withPaymentId[2], paymentId: withPaymentId[3] };
  }
  
  const withoutPaymentId = url.match(/\/api\/months\/(\d{4}-\d{2})\/bills\/([^\/]+)\/payments/);
  if (withoutPaymentId) {
    return { month: withoutPaymentId[1], billId: withoutPaymentId[2], paymentId: null };
  }
  
  return { month: null, billId: null, paymentId: null };
}

// POST /api/months/:month/bills/:id/payments - Add a new payment
export function createAddPaymentHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, billId } = extractPaymentParams(url.pathname);
      
      if (!month || !billId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/payments'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const body = await request.json();
      
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return new Response(JSON.stringify({
          error: 'Amount is required and must be a positive number (in cents)'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Default to today if date not provided
      const date = body.date || new Date().toISOString().split('T')[0];
      
      const billInstance = await paymentsService.addPayment(month, billId, body.amount, date);
      
      return new Response(JSON.stringify({
        billInstance,
        message: 'Payment added successfully'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201
      });
    } catch (error) {
      console.error('[PaymentsHandler] Add payment failed:', error);
      
      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({
          error: error.message
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({
          error: error.message
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to add payment'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// PUT /api/months/:month/bills/:id/payments/:paymentId - Update a payment
export function createUpdatePaymentHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, billId, paymentId } = extractPaymentParams(url.pathname);
      
      if (!month || !billId || !paymentId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/payments/:paymentId'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const body = await request.json();
      
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return new Response(JSON.stringify({
          error: 'Amount is required and must be a positive number (in cents)'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      if (!body.date) {
        return new Response(JSON.stringify({
          error: 'Date is required in YYYY-MM-DD format'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const billInstance = await paymentsService.updatePayment(month, billId, paymentId, body.amount, body.date);
      
      return new Response(JSON.stringify({
        billInstance,
        message: 'Payment updated successfully'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[PaymentsHandler] Update payment failed:', error);
      
      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({
          error: error.message
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({
          error: error.message
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to update payment'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// DELETE /api/months/:month/bills/:id/payments/:paymentId - Remove a payment
export function createDeletePaymentHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, billId, paymentId } = extractPaymentParams(url.pathname);
      
      if (!month || !billId || !paymentId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/payments/:paymentId'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const billInstance = await paymentsService.removePayment(month, billId, paymentId);
      
      return new Response(JSON.stringify({
        billInstance,
        message: 'Payment removed successfully'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[PaymentsHandler] Delete payment failed:', error);
      
      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({
          error: error.message
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to remove payment'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// GET /api/months/:month/bills/:id/payments - Get all payments for a bill instance
export function createGetPaymentsHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const { month, billId } = extractPaymentParams(url.pathname);
      
      if (!month || !billId) {
        return new Response(JSON.stringify({
          error: 'Invalid URL. Expected /api/months/YYYY-MM/bills/:id/payments'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const payments = await paymentsService.getPayments(month, billId);
      
      return new Response(JSON.stringify({
        payments,
        count: payments.length
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[PaymentsHandler] Get payments failed:', error);
      
      if (error instanceof NotFoundError) {
        return new Response(JSON.stringify({
          error: error.message
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to get payments'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}
