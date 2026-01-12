// Insurance Plans API Handlers

import {
  InsurancePlansService,
  InsurancePlansServiceImpl,
} from '../../services/insurance-plans-service';
import { InsuranceClaimsServiceImpl } from '../../services/insurance-claims-service';
import { formatErrorForUser } from '../../utils/errors';

const plansService: InsurancePlansService = new InsurancePlansServiceImpl();

export function createInsurancePlansHandlerGET() {
  return async () => {
    try {
      const plans = await plansService.getAll();

      return new Response(JSON.stringify(plans), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsurancePlansHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load insurance plans',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsurancePlansHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = plansService.validate(body);

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

      const newPlan = await plansService.create(body);

      return new Response(JSON.stringify(newPlan), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[InsurancePlansHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create insurance plan',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsurancePlansHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing plan ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedPlan = await plansService.update(id, body);

      if (!updatedPlan) {
        return new Response(
          JSON.stringify({
            error: 'Insurance plan not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedPlan), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsurancePlansHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update insurance plan',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsurancePlansHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing plan ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if plan has existing claims
      const claimsService = new InsuranceClaimsServiceImpl();
      const claims = await claimsService.getAll();
      const planClaims = claims.filter((c) => c.submissions.some((s) => s.plan_id === id));

      if (planClaims.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Cannot delete plan with existing claims',
            details: `This plan has ${planClaims.length} claim(s) associated with it`,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 409,
          }
        );
      }

      await plansService.delete(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[InsurancePlansHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete insurance plan',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
