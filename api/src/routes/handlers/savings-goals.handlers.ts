// Savings Goals API Handlers

import { SavingsGoalsService, SavingsGoalsServiceImpl } from '../../services/savings-goals-service';
import { BillsServiceImpl } from '../../services/bills-service';
import { formatErrorForUser } from '../../utils/errors';
import type { SavingsGoalStatus, GoalTemperature } from '../../types';

const savingsGoalsService: SavingsGoalsService = new SavingsGoalsServiceImpl();
const billsService = new BillsServiceImpl();

// Extended goal response with calculated fields
interface SavingsGoalWithCalculations {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  saved_amount: number; // Calculated from closed bill occurrences
  target_date: string;
  linked_account_id: string;
  linked_bill_ids: string[];
  status: SavingsGoalStatus;
  paused_at?: string;
  completed_at?: string;
  notes?: string;
  temperature: GoalTemperature;
  expected_amount: number; // Expected amount based on linear progress
  progress_percentage: number; // Percentage of target reached
  created_at: string;
  updated_at: string;
}

/**
 * Calculate saved amount from closed bill occurrences linked to a goal
 */
async function calculateSavedAmount(goalId: string): Promise<number> {
  // This will be enhanced later when we have full month data access
  // For now, return the current_amount from the goal
  const goal = await savingsGoalsService.getById(goalId);
  return goal?.current_amount || 0;
}

/**
 * Enhance a goal with calculated fields
 */
async function enhanceGoalWithCalculations(
  goal: Awaited<ReturnType<typeof savingsGoalsService.getById>>
): Promise<SavingsGoalWithCalculations | null> {
  if (!goal) return null;

  const savedAmount = await calculateSavedAmount(goal.id);
  const temperature = savingsGoalsService.calculateTemperature(goal, savedAmount);
  const expectedAmount = savingsGoalsService.getExpectedSavedAmount(goal);
  const progressPercentage =
    goal.target_amount > 0
      ? Math.min(100, Math.round((savedAmount / goal.target_amount) * 100))
      : 0;

  return {
    ...goal,
    saved_amount: savedAmount,
    temperature,
    expected_amount: expectedAmount,
    progress_percentage: progressPercentage,
  };
}

export function createSavingsGoalsHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);

      // Check if this is a single goal request: /api/savings-goals/:id
      if (pathParts.length === 3 && pathParts[0] === 'api' && pathParts[1] === 'savings-goals') {
        const id = pathParts[2];
        const goal = await savingsGoalsService.getById(id);

        if (!goal) {
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

        const enhancedGoal = await enhanceGoalWithCalculations(goal);

        return new Response(JSON.stringify(enhancedGoal), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Check for status filter: /api/savings-goals?status=saving
      const statusFilter = url.searchParams.get('status') as SavingsGoalStatus | null;

      let goals;
      if (statusFilter) {
        goals = await savingsGoalsService.getByStatus(statusFilter);
      } else {
        goals = await savingsGoalsService.getAll();
      }

      // Enhance all goals with calculations
      const enhancedGoals = await Promise.all(
        goals.map((goal) => enhanceGoalWithCalculations(goal))
      );

      return new Response(JSON.stringify(enhancedGoals), {
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
      const enhancedGoal = await enhanceGoalWithCalculations(newGoal);

      return new Response(JSON.stringify(enhancedGoal), {
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

      const enhancedGoal = await enhanceGoalWithCalculations(updatedGoal);

      return new Response(JSON.stringify(enhancedGoal), {
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

/**
 * Pause a goal - POST /api/savings-goals/:id/pause
 */
export function createSavingsGoalsPauseHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Path: api / savings-goals / :id / pause
      const id = pathParts[2];

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

      const pausedGoal = await savingsGoalsService.pause(id);

      if (!pausedGoal) {
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

      const enhancedGoal = await enhanceGoalWithCalculations(pausedGoal);

      return new Response(JSON.stringify(enhancedGoal), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] PAUSE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to pause goal';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to pause savings goal',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  };
}

/**
 * Resume a paused goal - POST /api/savings-goals/:id/resume
 */
export function createSavingsGoalsResumeHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const id = pathParts[2];

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

      const resumedGoal = await savingsGoalsService.resume(id);

      if (!resumedGoal) {
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

      const enhancedGoal = await enhanceGoalWithCalculations(resumedGoal);

      return new Response(JSON.stringify(enhancedGoal), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] RESUME failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to resume goal';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to resume savings goal',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  };
}

/**
 * Complete a goal (Buy That Thing!) - POST /api/savings-goals/:id/complete
 * Optional body: { completed_at?: string }
 */
export function createSavingsGoalsCompleteHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const id = pathParts[2];

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

      // Parse optional body for completion date
      let completedAt: string | undefined;
      try {
        const body = await request.json();
        completedAt = body.completed_at;
      } catch {
        // No body or invalid JSON - use default (now)
      }

      const completedGoal = await savingsGoalsService.complete(id, completedAt);

      if (!completedGoal) {
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

      const enhancedGoal = await enhanceGoalWithCalculations(completedGoal);

      return new Response(JSON.stringify(enhancedGoal), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] COMPLETE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to complete goal';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to complete savings goal',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  };
}

/**
 * Abandon a goal - POST /api/savings-goals/:id/abandon
 */
export function createSavingsGoalsAbandonHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const id = pathParts[2];

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

      const abandonedGoal = await savingsGoalsService.abandon(id);

      if (!abandonedGoal) {
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

      const enhancedGoal = await enhanceGoalWithCalculations(abandonedGoal);

      return new Response(JSON.stringify(enhancedGoal), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] ABANDON failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to abandon goal';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to abandon savings goal',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  };
}

/**
 * Get bills linked to a goal - GET /api/savings-goals/:id/bills
 */
export function createSavingsGoalsBillsHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const id = pathParts[2];

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

      // Verify the goal exists
      const goal = await savingsGoalsService.getById(id);
      if (!goal) {
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

      const bills = await billsService.getByGoalId(id);

      return new Response(JSON.stringify(bills), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] GET bills failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load goal bills',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
