// Savings Goals API Handlers

import { SavingsGoalsService, SavingsGoalsServiceImpl } from '../../services/savings-goals-service';
import { BillsServiceImpl } from '../../services/bills-service';
import { MonthsServiceImpl } from '../../services/months-service';
import { AdhocServiceImpl } from '../../services/adhoc-service';
import { CategoriesServiceImpl } from '../../services/categories-service';
import { formatErrorForUser } from '../../utils/errors';
import { sumOccurrencePayments } from '../../utils/occurrences';
import type { SavingsGoalStatus, GoalTemperature } from '../../types';

const savingsGoalsService: SavingsGoalsService = new SavingsGoalsServiceImpl();
const billsService = new BillsServiceImpl();
const monthsService = new MonthsServiceImpl();
const adhocService = new AdhocServiceImpl();
const categoriesService = new CategoriesServiceImpl();

// Extended goal response with calculated fields
interface SavingsGoalWithCalculations {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  saved_amount: number; // Calculated from closed bill occurrences
  target_date: string;
  linked_account_id: string;
  status: SavingsGoalStatus;
  previous_status?: 'bought' | 'abandoned'; // Status before archiving
  paused_at?: string;
  completed_at?: string;
  archived_at?: string;
  notes?: string;
  temperature: GoalTemperature;
  expected_amount: number; // Expected amount based on linear progress
  progress_percentage: number; // Percentage of target reached
  created_at: string;
  updated_at: string;
}

/**
 * Calculate saved amount from closed bill occurrences linked to a goal.
 * This sums up:
 * 1. Payments from bill instances where the parent Bill's goal_id matches (scheduled payments)
 * 2. Payments from ad-hoc bill instances where the BillInstance's goal_id matches (one-time contributions)
 */
async function calculateSavedAmount(goalId: string): Promise<number> {
  try {
    // Get all bills linked to this goal (for scheduled payments)
    const linkedBills = await billsService.getByGoalId(goalId);
    const linkedBillIds = new Set(linkedBills.map((b) => b.id));

    // Get all months
    const allMonths = await monthsService.getAllMonths();

    let totalSaved = 0;

    // For each month, sum up payments from bill instances linked to this goal
    for (const monthSummary of allMonths) {
      if (!monthSummary.exists) continue;

      const monthData = await monthsService.getMonthlyData(monthSummary.month);
      if (!monthData?.bill_instances) continue;

      for (const billInstance of monthData.bill_instances) {
        // Check if this instance is linked to our goal via:
        // 1. Parent bill (scheduled payments) - bill_id matches a linked bill
        // 2. Direct goal_id on BillInstance (ad-hoc contributions)
        const isLinkedViaBill = billInstance.bill_id && linkedBillIds.has(billInstance.bill_id);
        const isLinkedDirectly = billInstance.goal_id === goalId;

        if (!isLinkedViaBill && !isLinkedDirectly) continue;

        // Sum payments from all occurrences (closed or open)
        if (billInstance.occurrences && billInstance.occurrences.length > 0) {
          totalSaved += sumOccurrencePayments(billInstance.occurrences);
        }
      }
    }

    return totalSaved;
  } catch (error) {
    console.error('[calculateSavedAmount] Error:', error);
    // Fall back to current_amount if calculation fails
    const goal = await savingsGoalsService.getById(goalId);
    return goal?.current_amount || 0;
  }
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

      // Get bills linked to this goal
      let bills = await billsService.getByGoalId(id);

      // Self-healing: If no linked bills found, look for orphaned bills with matching name
      // This handles cases where goal_id might have been lost or not saved correctly in older versions
      if (bills.length === 0) {
        const expectedBillName = `Savings: ${goal.name}`;
        const allBills = await billsService.getAll();
        const orphanBill = allBills.find(
          (b) => b.name === expectedBillName && b.is_active && !b.goal_id
        );

        if (orphanBill) {
          console.log(
            `[SavingsGoalsHandler] Found orphaned bill "${orphanBill.name}" (${orphanBill.id}) for goal "${goal.name}". Auto-linking...`
          );

          // Update the bill with the goal_id
          const updatedBill = await billsService.update(orphanBill.id, {
            goal_id: goal.id,
          });

          if (updatedBill) {
            bills = [updatedBill];
          }
        }
      }

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

/**
 * Archive a goal - POST /api/savings-goals/:id/archive
 */
export function createSavingsGoalsArchiveHandler() {
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

      const archivedGoal = await savingsGoalsService.archive(id);

      if (!archivedGoal) {
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

      const enhancedGoal = await enhanceGoalWithCalculations(archivedGoal);

      return new Response(JSON.stringify(enhancedGoal), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] ARCHIVE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to archive goal';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to archive savings goal',
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
 * Unarchive a goal - POST /api/savings-goals/:id/unarchive
 * Required body: { restore_to_status: 'bought' | 'abandoned' }
 */
export function createSavingsGoalsUnarchiveHandler() {
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

      // Parse required body for restore status
      let restoreToStatus: 'bought' | 'abandoned';
      try {
        const body = await request.json();
        restoreToStatus = body.restore_to_status;

        if (!restoreToStatus || !['bought', 'abandoned'].includes(restoreToStatus)) {
          return new Response(
            JSON.stringify({
              error: "restore_to_status is required and must be 'bought' or 'abandoned'",
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({
            error: 'Request body with restore_to_status is required',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const unarchivedGoal = await savingsGoalsService.unarchive(id, restoreToStatus);

      if (!unarchivedGoal) {
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

      const enhancedGoal = await enhanceGoalWithCalculations(unarchivedGoal);

      return new Response(JSON.stringify(enhancedGoal), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[SavingsGoalsHandler] UNARCHIVE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to unarchive goal';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to unarchive savings goal',
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
 * Make a one-time contribution to a goal - POST /api/savings-goals/:id/contribute
 * Required body: { amount: number, date: string }
 * - amount: cents
 * - date: YYYY-MM-DD (today or earlier, within current month)
 */
export function createSavingsGoalsContributeHandler() {
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

      // Get the goal
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

      // Validate goal has a linked account for payment source
      if (!goal.linked_account_id) {
        return new Response(
          JSON.stringify({
            error:
              'This goal does not have a savings account linked. Please edit the goal and select a savings account first.',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Parse request body
      let amount: number;
      let date: string;
      try {
        const body = await request.json();
        amount = body.amount;
        date = body.date;

        if (typeof amount !== 'number' || amount <= 0) {
          return new Response(
            JSON.stringify({
              error: 'Amount must be a positive number (in cents)',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return new Response(
            JSON.stringify({
              error: 'Date is required in YYYY-MM-DD format',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({
            error: 'Request body with amount and date is required',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Get or create the Savings Goals category
      const savingsGoalsCategory = await categoriesService.ensureGoalsCategoryExists();

      // Determine the month from the date
      const month = date.substring(0, 7); // YYYY-MM

      // Create the contribution
      const contribution = await adhocService.createGoalContribution(month, {
        goal_id: id,
        goal_name: goal.name,
        amount,
        category_id: savingsGoalsCategory.id,
        payment_source_id: goal.linked_account_id,
        date,
      });

      // Return the updated goal with new saved_amount
      const enhancedGoal = await enhanceGoalWithCalculations(goal);

      return new Response(
        JSON.stringify({
          goal: enhancedGoal,
          contribution: {
            id: contribution.id,
            amount,
            date,
            month,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 201,
        }
      );
    } catch (error) {
      console.error('[SavingsGoalsHandler] CONTRIBUTE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to make contribution';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to make contribution to savings goal',
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
 * Calculate the next payment date based on billing period
 */
function getNextPaymentDate(currentDate: string, billingPeriod: string): string {
  const date = new Date(currentDate + 'T00:00:00');

  switch (billingPeriod) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'bi_weekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'semi_annually':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'monthly':
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}

/**
 * Payment record for a savings goal (unified format with running balance)
 */
interface PaymentHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: number; // cents
  balance: number; // running tally in cents
  status: 'completed' | 'upcoming';
}

/**
 * Get all payments for a goal - GET /api/savings-goals/:id/payments
 * Returns a unified list of completed and projected payments with running balance
 */
export function createSavingsGoalsPaymentsHandler() {
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

      // Get the goal
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

      // Get all bills linked to this goal (for scheduled payments)
      const linkedBills = await billsService.getByGoalId(id);
      const linkedBillIds = new Set(linkedBills.map((b) => b.id));
      const billNameMap = new Map(linkedBills.map((b) => [b.id, b.name]));

      // Get all months from goal creation to present
      const allMonths = await monthsService.getAllMonths();
      const goalCreatedMonth = goal.created_at.substring(0, 7); // YYYY-MM

      interface RawPayment {
        id: string;
        date: string;
        description: string;
        amount: number;
        status: 'completed' | 'upcoming';
      }

      const rawPayments: RawPayment[] = [];
      const today = new Date().toISOString().split('T')[0];

      // Collect payments from all months
      for (const monthSummary of allMonths) {
        // Skip months before goal was created
        if (monthSummary.month < goalCreatedMonth) continue;
        if (!monthSummary.exists) continue;

        const monthData = await monthsService.getMonthlyData(monthSummary.month);
        if (!monthData?.bill_instances) continue;

        for (const billInstance of monthData.bill_instances) {
          // Check if this instance is linked to our goal
          const isLinkedViaBill = billInstance.bill_id && linkedBillIds.has(billInstance.bill_id);
          const isLinkedDirectly = billInstance.goal_id === id;

          if (!isLinkedViaBill && !isLinkedDirectly) continue;

          // Determine source name
          const isScheduled = isLinkedViaBill && !isLinkedDirectly;
          const description = isScheduled
            ? (billInstance.bill_id && billNameMap.get(billInstance.bill_id)) || 'Scheduled payment'
            : 'One-time contribution';

          // Process each occurrence
          for (const occurrence of billInstance.occurrences || []) {
            // Collect actual payments made
            for (const payment of occurrence.payments || []) {
              rawPayments.push({
                id: payment.id,
                date: payment.date,
                description,
                amount: payment.amount,
                status: 'completed',
              });
            }

            // If occurrence is not closed and in the future, it's upcoming
            if (!occurrence.is_closed && occurrence.expected_date > today) {
              rawPayments.push({
                id: `upcoming-${occurrence.id}`,
                date: occurrence.expected_date,
                description,
                amount: occurrence.expected_amount,
                status: 'upcoming',
              });
            }
          }
        }
      }

      // Project future scheduled payments until goal is complete
      // Find recurring bills linked to this goal and project their future payments
      const totalSaved = rawPayments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const remaining = goal.target_amount - totalSaved;

      if (remaining > 0 && linkedBills.length > 0) {
        // Get the primary linked bill for projections (use the first active one)
        const activeBill = linkedBills.find((b) => b.is_active);
        if (activeBill) {
          // Find the last upcoming payment date, or use today
          const upcomingPayments = rawPayments.filter((p) => p.status === 'upcoming');
          let lastDate =
            upcomingPayments.length > 0
              ? upcomingPayments[upcomingPayments.length - 1].date
              : today;

          // Calculate how many more payments are needed
          let projectedBalance =
            totalSaved + upcomingPayments.reduce((sum, p) => sum + p.amount, 0);
          const paymentAmount = activeBill.amount;

          // Project payments until we reach the target (max 36 months out to prevent infinite loops)
          let projectionCount = 0;
          const maxProjections = 36;

          while (projectedBalance < goal.target_amount && projectionCount < maxProjections) {
            // Calculate next payment date based on billing period
            const nextDate = getNextPaymentDate(lastDate, activeBill.billing_period);
            projectedBalance += paymentAmount;
            projectionCount++;

            rawPayments.push({
              id: `projected-${projectionCount}`,
              date: nextDate,
              description: activeBill.name,
              amount: paymentAmount,
              status: 'upcoming',
            });

            lastDate = nextDate;
          }
        }
      }

      // Sort all payments by date (oldest first for chronological display)
      rawPayments.sort((a, b) => a.date.localeCompare(b.date));

      // Calculate running balance
      let runningBalance = 0;
      const payments: PaymentHistoryItem[] = rawPayments.map((p) => {
        runningBalance += p.amount;
        return {
          ...p,
          balance: runningBalance,
        };
      });

      // Calculate summary
      const totalCompleted = payments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const progressPercentage =
        goal.target_amount > 0
          ? Math.min(100, Math.round((totalCompleted / goal.target_amount) * 100))
          : 0;

      // Find projected completion date (first payment where balance >= target)
      const completionPayment = payments.find((p) => p.balance >= goal.target_amount);
      const projectedCompletionDate = completionPayment?.date || null;

      return new Response(
        JSON.stringify({
          goal_id: id,
          target_amount: goal.target_amount,
          payments,
          summary: {
            total_saved: totalCompleted,
            total_remaining: Math.max(0, goal.target_amount - totalCompleted),
            progress_percentage: progressPercentage,
            projected_completion_date: projectedCompletionDate,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[SavingsGoalsHandler] GET payments failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load goal payments',
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
 * Remove schedule from a goal - POST /api/savings-goals/:id/remove-schedule
 * This deactivates the linked bill and closes all future unpaid occurrences
 * Required body: { bill_id: string }
 */
export function createSavingsGoalsRemoveScheduleHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const goalId = pathParts[2];

      if (!goalId) {
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

      // Get the goal
      const goal = await savingsGoalsService.getById(goalId);
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

      // Parse request body for bill_id
      let billId: string;
      try {
        const body = await request.json();
        billId = body.bill_id;

        if (!billId) {
          return new Response(
            JSON.stringify({
              error: 'bill_id is required',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({
            error: 'Request body with bill_id is required',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Get the bill and verify it's linked to this goal
      const bill = await billsService.getById(billId);
      if (!bill) {
        return new Response(
          JSON.stringify({
            error: 'Bill not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      if (bill.goal_id !== goalId) {
        return new Response(
          JSON.stringify({
            error: 'Bill is not linked to this goal',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const today = new Date().toISOString().split('T')[0];
      const todayFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // 1. Deactivate the bill and add note to metadata
      const existingNotes = bill.metadata?.notes || '';
      const scheduleClosedNote = `\n[Schedule ended on ${todayFormatted}]`;
      await billsService.update(billId, {
        is_active: false,
        metadata: {
          ...bill.metadata,
          notes: existingNotes + scheduleClosedNote,
        },
      });

      // 2. Close future unpaid occurrences in all existing months
      const allMonths = await monthsService.getAllMonths();
      let closedOccurrencesCount = 0;

      for (const monthSummary of allMonths) {
        if (!monthSummary.exists) continue;

        const monthData = await monthsService.getMonthlyData(monthSummary.month);
        if (!monthData?.bill_instances) continue;

        let monthModified = false;

        for (const billInstance of monthData.bill_instances) {
          if (billInstance.bill_id !== billId) continue;

          for (const occurrence of billInstance.occurrences || []) {
            // Close future unpaid occurrences (expected_date > today and not closed)
            if (!occurrence.is_closed && occurrence.expected_date > today) {
              occurrence.is_closed = true;
              occurrence.closed_date = today;
              occurrence.notes =
                (occurrence.notes || '') + '\nSchedule ended - automatically closed';
              occurrence.updated_at = new Date().toISOString();
              closedOccurrencesCount++;
              monthModified = true;
            }
          }

          // Update instance is_closed if all occurrences are now closed
          const allClosed = billInstance.occurrences?.every((o) => o.is_closed) ?? true;
          if (allClosed && !billInstance.is_closed) {
            billInstance.is_closed = true;
            billInstance.updated_at = new Date().toISOString();
            monthModified = true;
          }
        }

        if (monthModified) {
          await monthsService.saveMonthlyData(monthSummary.month, monthData);
        }
      }

      // Return success with updated goal
      const enhancedGoal = await enhanceGoalWithCalculations(goal);

      return new Response(
        JSON.stringify({
          goal: enhancedGoal,
          removed_bill: {
            id: billId,
            name: bill.name,
          },
          closed_occurrences_count: closedOccurrencesCount,
          message: `Schedule removed. ${closedOccurrencesCount} future payment(s) cancelled.`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[SavingsGoalsHandler] REMOVE-SCHEDULE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to remove schedule';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to remove schedule from savings goal',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  };
}
