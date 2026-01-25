// Payment Sources API Handlers

import {
  PaymentSourcesService,
  PaymentSourcesServiceImpl,
} from '../../services/payment-sources-service';
import { MonthsServiceImpl } from '../../services/months-service';
import { formatErrorForUser } from '../../utils/errors';

const paymentSourcesService: PaymentSourcesService = new PaymentSourcesServiceImpl();
const monthsService = new MonthsServiceImpl();

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

      // If this is a track_payments_manually credit card, sync it to the current month
      if (newSource.track_payments_manually === true) {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        try {
          const monthExists = await monthsService.monthExists(currentMonth);
          if (monthExists) {
            await monthsService.syncWithDefaults(currentMonth);
            console.log(
              `[PaymentSourcesHandler] Synced new track_payments_manually card ${newSource.name} to ${currentMonth}`
            );
          }
        } catch (syncError) {
          // Log but don't fail the request - the card was created successfully
          console.warn(`[PaymentSourcesHandler] Failed to sync to current month:`, syncError);
        }
      }

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

      // Get the old source to check if track_payments_manually changed
      const oldSource = await paymentSourcesService.getById(id);
      const wasTrackManually = oldSource?.track_payments_manually === true;

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

      // If track_payments_manually was just enabled, sync to current month
      if (!wasTrackManually && updatedSource.track_payments_manually === true) {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        try {
          const monthExists = await monthsService.monthExists(currentMonth);
          if (monthExists) {
            await monthsService.syncWithDefaults(currentMonth);
            console.log(
              `[PaymentSourcesHandler] Synced updated track_payments_manually card ${updatedSource.name} to ${currentMonth}`
            );
          }
        } catch (syncError) {
          // Log but don't fail the request - the card was updated successfully
          console.warn(`[PaymentSourcesHandler] Failed to sync to current month:`, syncError);
        }
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

/**
 * GET /api/payment-sources/savings
 * Returns all payment sources marked as savings or investment accounts
 */
export function createPaymentSourcesSavingsHandlerGET() {
  return async () => {
    try {
      const allSources = await paymentSourcesService.getAll();
      const savingsAndInvestments = allSources.filter(
        (source) => source.is_savings === true || source.is_investment === true
      );

      return new Response(JSON.stringify(savingsAndInvestments), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[PaymentSourcesHandler] GET savings failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load savings and investment accounts',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
