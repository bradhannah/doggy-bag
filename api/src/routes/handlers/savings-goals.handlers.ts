// Savings Goals API Handlers

import { SavingsGoalsService, SavingsGoalsServiceImpl } from '../../services/savings-goals-service';
import { formatErrorForUser } from '../../utils/errors';

const savingsGoalsService: SavingsGoalsService = new SavingsGoalsServiceImpl();

export function createSavingsGoalsHandlerGET() {
  return async () => {
    try {
      const goals = await savingsGoalsService.getAll();

      return new Response(JSON.stringify(goals), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load savings goals',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createSavingsGoalsHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = savingsGoalsService.validate(body);

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

      const newGoal = await savingsGoalsService.create(body);

      return new Response(JSON.stringify(newGoal), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create savings goal',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createSavingsGoalsHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing goal ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedGoal = await savingsGoalsService.update(id, body);

      if (!updatedGoal) {
        return new Response(
          JSON.stringify({
            error: 'Savings goal not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedGoal), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update savings goal',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createSavingsGoalsHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing goal ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await savingsGoalsService.delete(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete savings goal',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
