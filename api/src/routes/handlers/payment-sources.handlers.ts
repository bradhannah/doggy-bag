// Payment Sources API Handlers

import {
  PaymentSourcesService,
  PaymentSourcesServiceImpl,
} from '../../services/payment-sources-service';
import { formatErrorForDev, formatErrorForUser } from '../../utils/errors';
import type { PaymentSource, ValidationResult } from '../../types';

const paymentSourcesService: PaymentSourcesService = new PaymentSourcesServiceImpl();

export function createPaymentSourcesHandlerGET() {
  return async () => {
    try {
      const sources = await paymentSourcesService.getAll();

      return new Response(JSON.stringify(sources), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[PaymentSourcesHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load payment sources',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createPaymentSourcesHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = paymentSourcesService.validate(body);

      if (!validation.isValid) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: validation.errors,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const newSource = await paymentSourcesService.create(body);

      return new Response(JSON.stringify(newSource), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[PaymentSourcesHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create payment source',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createPaymentSourcesHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing payment source ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedSource = await paymentSourcesService.update(id, body);

      if (!updatedSource) {
        return new Response(
          JSON.stringify({
            error: 'Payment source not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedSource), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[PaymentSourcesHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update payment source',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createPaymentSourcesHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing payment source ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await paymentSourcesService.delete(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[PaymentSourcesHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete payment source',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
