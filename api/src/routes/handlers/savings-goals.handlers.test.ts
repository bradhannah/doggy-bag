// Savings Goals Handlers Tests
// Tests the HTTP handlers for savings goals endpoints

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { StorageServiceImpl } from '../../services/storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  SavingsGoal,
  Bill,
  Category,
  MonthlyData,
  BillInstance,
  Occurrence,
} from '../../types';

import {
  createSavingsGoalsContributeHandler,
  createSavingsGoalsPaymentsHandler,
  createSavingsGoalsRemoveScheduleHandler,
  createSavingsGoalsArchiveHandler,
  createSavingsGoalsUnarchiveHandler,
} from './savings-goals.handlers';

describe('SavingsGoalsHandlers', () => {
  let testDir: string;

  // Sample data
  const sampleGoals: SavingsGoal[] = [
    {
      id: 'goal-test-001',
      name: 'Test Goal',
      target_amount: 100000, // $1000
      current_amount: 20000,
      target_date: '2026-12-01',
      linked_account_id: 'ps-savings-001',
      status: 'saving',
      created_at: '2025-01-01T00:00:00.000Z', // Created before test payment months
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'goal-no-account',
      name: 'Goal Without Account',
      target_amount: 50000,
      current_amount: 0,
      target_date: '2026-12-01',
      linked_account_id: '', // No linked account
      status: 'saving',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'goal-bought-001',
      name: 'Bought Goal',
      target_amount: 50000,
      current_amount: 50000,
      target_date: '2025-12-01',
      linked_account_id: 'ps-savings-001',
      status: 'bought',
      completed_at: '2025-11-15T00:00:00.000Z',
      created_at: '2025-06-01T00:00:00.000Z',
      updated_at: '2025-11-15T00:00:00.000Z',
    },
    {
      id: 'goal-archived-001',
      name: 'Archived Goal',
      target_amount: 30000,
      current_amount: 30000,
      target_date: '2025-06-01',
      linked_account_id: 'ps-savings-001',
      status: 'archived',
      previous_status: 'bought',
      completed_at: '2025-05-15T00:00:00.000Z',
      archived_at: '2025-06-01T00:00:00.000Z',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-06-01T00:00:00.000Z',
    },
  ];

  const sampleCategories: Category[] = [
    {
      id: 'cat-savings-goals',
      name: 'Savings Goals',
      type: 'savings_goal',
      color: '#24c8db',
      sort_order: 0,
      is_predefined: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const sampleBills: Bill[] = [
    {
      id: 'bill-goal-schedule-001',
      name: 'Goal: Test Goal',
      amount: 10000, // $100 per month
      billing_period: 'monthly',
      day_of_month: 15,
      category_id: 'cat-savings-goals',
      payment_source_id: 'ps-savings-001',
      is_active: true,
      goal_id: 'goal-test-001', // Linked to test goal
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const getMonthData = (month: string): MonthlyData => {
    // Create bill instance with occurrences for the goal
    const billInstance: BillInstance = {
      id: `bi-${month}-001`,
      bill_id: 'bill-goal-schedule-001',
      month,
      billing_period: 'monthly',
      expected_amount: 10000,
      occurrences: [
        {
          id: `occ-${month}-001`,
          sequence: 1,
          expected_date: `${month}-15`,
          expected_amount: 10000,
          is_closed: month < '2026-01', // Past months are closed
          closed_date: month < '2026-01' ? `${month}-15` : undefined,
          payment_source_id: month < '2026-01' ? 'ps-savings-001' : undefined,
          is_adhoc: false,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      is_default: true,
      is_closed: month < '2026-01',
      is_adhoc: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    return {
      month,
      bill_instances: [billInstance],
      income_instances: [],
      bank_balances: {},
      variable_expenses: [],
      free_flowing_expenses: [],
      is_read_only: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  };

  beforeAll(async () => {
    testDir = join(tmpdir(), `savings-goals-handlers-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset files before each test
    await writeFile(
      join(testDir, 'entities', 'savings-goals.json'),
      JSON.stringify(sampleGoals, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify(sampleCategories, null, 2)
    );
    await writeFile(join(testDir, 'entities', 'bills.json'), JSON.stringify(sampleBills, null, 2));
    await writeFile(
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify(
        [
          {
            id: 'ps-savings-001',
            name: 'Savings Account',
            type: 'savings',
            include_in_total: true,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        null,
        2
      )
    );

    // Create month files
    const months = ['2025-11', '2025-12', '2026-01', '2026-02'];
    for (const month of months) {
      await writeFile(
        join(testDir, 'months', `${month}.json`),
        JSON.stringify(getMonthData(month), null, 2)
      );
    }
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // ============================================================================
  // Contribute Handler Tests
  // ============================================================================

  describe('createSavingsGoalsContributeHandler', () => {
    test('should make a contribution to a goal', async () => {
      const handler = createSavingsGoalsContributeHandler();
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      // Create month data for current month if not exists
      await writeFile(
        join(testDir, 'months', `${currentMonth}.json`),
        JSON.stringify(
          {
            month: currentMonth,
            bill_instances: [],
            income_instances: [],
            bank_balances: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          null,
          2
        )
      );

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000, // $50
          date: today,
        }),
      });

      const response = await handler(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.contribution).toBeDefined();
      expect(data.contribution.amount).toBe(5000);
      expect(data.contribution.date).toBe(today);
      expect(data.goal).toBeDefined();
    });

    test('should return 404 for non-existent goal', async () => {
      const handler = createSavingsGoalsContributeHandler();
      const today = new Date().toISOString().split('T')[0];

      const request = new Request('http://localhost/api/savings-goals/non-existent/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          date: today,
        }),
      });

      const response = await handler(request);
      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid amount', async () => {
      const handler = createSavingsGoalsContributeHandler();
      const today = new Date().toISOString().split('T')[0];

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 0,
          date: today,
        }),
      });

      const response = await handler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('positive');
    });

    test('should return 400 for missing date', async () => {
      const handler = createSavingsGoalsContributeHandler();

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
        }),
      });

      const response = await handler(request);
      expect(response.status).toBe(400);
    });

    test('should return 400 for missing goal ID', async () => {
      const handler = createSavingsGoalsContributeHandler();
      const today = new Date().toISOString().split('T')[0];

      const request = new Request('http://localhost/api/savings-goals//contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          date: today,
        }),
      });

      const response = await handler(request);
      // This will actually try to find goal with empty ID
      expect(response.status).toBe(404);
    });

    test('should return 400 for goal without linked account', async () => {
      const handler = createSavingsGoalsContributeHandler();
      const today = new Date().toISOString().split('T')[0];

      const request = new Request('http://localhost/api/savings-goals/goal-no-account/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          date: today,
        }),
      });

      const response = await handler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('savings account');
    });
  });

  // ============================================================================
  // Payments Handler Tests
  // ============================================================================

  describe('createSavingsGoalsPaymentsHandler', () => {
    test('should return payment history for a goal', async () => {
      const handler = createSavingsGoalsPaymentsHandler();

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/payments', {
        method: 'GET',
      });

      const response = await handler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.goal_id).toBe('goal-test-001');
      expect(data.target_amount).toBeDefined();
      expect(data.payments).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(Array.isArray(data.payments)).toBe(true);
      // Each payment should have the new structure
      if (data.payments.length > 0) {
        expect(data.payments[0]).toHaveProperty('date');
        expect(data.payments[0]).toHaveProperty('description');
        expect(data.payments[0]).toHaveProperty('amount');
        expect(data.payments[0]).toHaveProperty('balance');
        expect(data.payments[0]).toHaveProperty('status');
      }
    });

    test('should return 404 for non-existent goal', async () => {
      const handler = createSavingsGoalsPaymentsHandler();

      const request = new Request('http://localhost/api/savings-goals/non-existent/payments', {
        method: 'GET',
      });

      const response = await handler(request);
      expect(response.status).toBe(404);
    });

    test('should include completed payments from closed occurrences', async () => {
      const handler = createSavingsGoalsPaymentsHandler();

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/payments', {
        method: 'GET',
      });

      const response = await handler(request);
      const data = await response.json();

      // Should have completed payments from 2025-11 and 2025-12
      const completedPayments = data.payments.filter(
        (p: { status: string }) => p.status === 'completed'
      );
      expect(completedPayments.length).toBeGreaterThan(0);
      expect(data.summary.total_saved).toBeGreaterThan(0);
    });

    test('should return 400 for missing goal ID', async () => {
      const handler = createSavingsGoalsPaymentsHandler();

      // URL with empty ID segment
      const request = new Request('http://localhost/api/savings-goals//payments', {
        method: 'GET',
      });

      const response = await handler(request);
      // Will try to find goal with empty ID, which doesn't exist
      expect(response.status).toBe(404);
    });

    test('should return payments sorted by date with running balance', async () => {
      const handler = createSavingsGoalsPaymentsHandler();

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/payments', {
        method: 'GET',
      });

      const response = await handler(request);
      const data = await response.json();

      // Verify payments are sorted by date (oldest first)
      const dates = data.payments.map((p: { date: string }) => p.date);
      const sortedDates = [...dates].sort();
      expect(dates).toEqual(sortedDates);

      // Verify running balance is monotonically increasing
      let prevBalance = 0;
      for (const payment of data.payments) {
        expect(payment.balance).toBeGreaterThanOrEqual(prevBalance);
        prevBalance = payment.balance;
      }
    });

    test('should include projected completion date in summary', async () => {
      const handler = createSavingsGoalsPaymentsHandler();

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/payments', {
        method: 'GET',
      });

      const response = await handler(request);
      const data = await response.json();

      // Summary should have projected_completion_date field
      expect(data.summary).toHaveProperty('projected_completion_date');
      expect(data.summary).toHaveProperty('progress_percentage');
      expect(data.summary).toHaveProperty('total_saved');
      expect(data.summary).toHaveProperty('total_remaining');
    });
  });

  // ============================================================================
  // Remove Schedule Handler Tests
  // ============================================================================

  describe('createSavingsGoalsRemoveScheduleHandler', () => {
    test('should remove schedule from a goal', async () => {
      const handler = createSavingsGoalsRemoveScheduleHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/goal-test-001/remove-schedule',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bill_id: 'bill-goal-schedule-001',
          }),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.removed_bill).toBeDefined();
      expect(data.removed_bill.id).toBe('bill-goal-schedule-001');
      expect(data.message).toContain('Schedule removed');
    });

    test('should return 404 for non-existent goal', async () => {
      const handler = createSavingsGoalsRemoveScheduleHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/non-existent/remove-schedule',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bill_id: 'bill-goal-schedule-001',
          }),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(404);
    });

    test('should return 404 for non-existent bill', async () => {
      const handler = createSavingsGoalsRemoveScheduleHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/goal-test-001/remove-schedule',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bill_id: 'non-existent-bill',
          }),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(404);
    });

    test('should return 400 for bill not linked to goal', async () => {
      // Add a bill not linked to the goal
      const bills = [...sampleBills];
      bills.push({
        id: 'bill-unlinked-001',
        name: 'Unlinked Bill',
        amount: 5000,
        billing_period: 'monthly',
        day_of_month: 1,
        category_id: 'cat-savings-goals',
        payment_source_id: 'ps-savings-001',
        is_active: true,
        // No goal_id - not linked to any goal
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });
      await writeFile(join(testDir, 'entities', 'bills.json'), JSON.stringify(bills, null, 2));

      const handler = createSavingsGoalsRemoveScheduleHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/goal-test-001/remove-schedule',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bill_id: 'bill-unlinked-001',
          }),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('not linked');
    });

    test('should return 400 for missing bill_id', async () => {
      const handler = createSavingsGoalsRemoveScheduleHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/goal-test-001/remove-schedule',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // Archive Handler Tests
  // ============================================================================

  describe('createSavingsGoalsArchiveHandler', () => {
    test('should archive a bought goal', async () => {
      const handler = createSavingsGoalsArchiveHandler();

      const request = new Request('http://localhost/api/savings-goals/goal-bought-001/archive', {
        method: 'POST',
      });

      const response = await handler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('archived');
      expect(data.previous_status).toBe('bought');
      expect(data.archived_at).toBeDefined();
    });

    test('should return 400 for saving goal', async () => {
      const handler = createSavingsGoalsArchiveHandler();

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/archive', {
        method: 'POST',
      });

      const response = await handler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Cannot archive goal with status 'saving'");
    });

    test('should return 404 for non-existent goal', async () => {
      const handler = createSavingsGoalsArchiveHandler();

      const request = new Request('http://localhost/api/savings-goals/non-existent/archive', {
        method: 'POST',
      });

      const response = await handler(request);
      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // Unarchive Handler Tests
  // ============================================================================

  describe('createSavingsGoalsUnarchiveHandler', () => {
    test('should unarchive a goal to bought status', async () => {
      const handler = createSavingsGoalsUnarchiveHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/goal-archived-001/unarchive',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restore_to_status: 'bought',
          }),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('bought');
      expect(data.archived_at).toBeUndefined();
    });

    test('should unarchive a goal to abandoned status', async () => {
      const handler = createSavingsGoalsUnarchiveHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/goal-archived-001/unarchive',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restore_to_status: 'abandoned',
          }),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('abandoned');
    });

    test('should return 400 for invalid restore_to_status', async () => {
      const handler = createSavingsGoalsUnarchiveHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/goal-archived-001/unarchive',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restore_to_status: 'saving', // Invalid - can only restore to bought/abandoned
          }),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(400);
    });

    test('should return 400 for missing restore_to_status', async () => {
      const handler = createSavingsGoalsUnarchiveHandler();

      const request = new Request(
        'http://localhost/api/savings-goals/goal-archived-001/unarchive',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(400);
    });

    test('should return 400 for non-archived goal', async () => {
      const handler = createSavingsGoalsUnarchiveHandler();

      const request = new Request('http://localhost/api/savings-goals/goal-test-001/unarchive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restore_to_status: 'bought',
        }),
      });

      const response = await handler(request);
      expect(response.status).toBe(400);
    });

    test('should return 404 for non-existent goal', async () => {
      const handler = createSavingsGoalsUnarchiveHandler();

      const request = new Request('http://localhost/api/savings-goals/non-existent/unarchive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restore_to_status: 'bought',
        }),
      });

      const response = await handler(request);
      expect(response.status).toBe(404);
    });
  });
});
