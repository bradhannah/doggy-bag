// Calendar Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { CalendarServiceImpl } from './calendar-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { MonthlyData, Bill, Income, SavingsGoal } from '../types';

describe('CalendarService', () => {
  let service: CalendarServiceImpl;
  let testDir: string;

  // Sample bills for testing
  const sampleBills: Bill[] = [
    {
      id: 'bill-rent-001',
      name: 'Rent',
      amount: 150000,
      billing_period: 'monthly',
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-housing-001',
      day_of_month: 1,
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'bill-internet-002',
      name: 'Internet',
      amount: 7999,
      billing_period: 'monthly',
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-utilities-001',
      day_of_month: 15,
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    // Bill that is linked to a savings goal (recurring contribution)
    {
      id: 'bill-goal-recurring-001',
      name: 'Monthly Vacation Savings',
      amount: 25000,
      billing_period: 'monthly',
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-savings-001',
      day_of_month: 5,
      goal_id: 'goal-vacation-001', // Linked to savings goal
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  // Sample incomes for testing
  const sampleIncomes: Income[] = [
    {
      id: 'income-salary-001',
      name: 'Salary',
      amount: 500000,
      billing_period: 'bi_weekly',
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-income-001',
      start_date: '2026-01-03',
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  // Sample savings goals for testing
  const sampleGoals: SavingsGoal[] = [
    {
      id: 'goal-vacation-001',
      name: 'Vacation Fund',
      target_amount: 300000,
      current_amount: 100000,
      target_date: '2026-07-01',
      linked_account_id: 'ps-savings-001',
      status: 'saving',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  // Sample monthly data with bill instances, income instances, and todo instances
  const sampleMonthlyData: MonthlyData = {
    month: '2026-02',
    starting_balances: {},
    bill_instances: [
      {
        id: 'bi-rent-001',
        bill_id: 'bill-rent-001',
        month: '2026-02',
        billing_period: 'monthly',
        expected_amount: 150000,
        is_default: true,
        is_closed: true,
        is_adhoc: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-02-01T00:00:00.000Z',
        occurrences: [
          {
            id: 'occ-rent-001',
            sequence: 1,
            expected_date: '2026-02-01',
            expected_amount: 150000,
            is_closed: true,
            closed_date: '2026-02-01',
            is_adhoc: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-02-01T00:00:00.000Z',
          },
        ],
      },
      {
        id: 'bi-internet-001',
        bill_id: 'bill-internet-002',
        month: '2026-02',
        billing_period: 'monthly',
        expected_amount: 7999,
        is_default: true,
        is_closed: false,
        is_adhoc: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        occurrences: [
          {
            id: 'occ-internet-001',
            sequence: 1,
            expected_date: '2026-02-15',
            expected_amount: 7999,
            is_closed: false,
            is_adhoc: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      // Ad-hoc goal contribution (instance has goal_id, no matching bill)
      {
        id: 'bi-goal-adhoc-001',
        bill_id: null,
        month: '2026-02',
        billing_period: 'once',
        expected_amount: 10000,
        is_default: false,
        is_closed: false,
        is_adhoc: true,
        goal_id: 'goal-vacation-001', // Ad-hoc contribution via instance.goal_id
        name: 'Extra Vacation Contribution',
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-02-01T00:00:00.000Z',
        occurrences: [
          {
            id: 'occ-goal-adhoc-001',
            sequence: 1,
            expected_date: '2026-02-20',
            expected_amount: 10000,
            is_closed: false,
            is_adhoc: true,
            created_at: '2026-02-01T00:00:00.000Z',
            updated_at: '2026-02-01T00:00:00.000Z',
          },
        ],
      },
      // Recurring goal contribution (bill has goal_id, instance references that bill)
      {
        id: 'bi-goal-recurring-001',
        bill_id: 'bill-goal-recurring-001', // References bill with goal_id
        month: '2026-02',
        billing_period: 'monthly',
        expected_amount: 25000,
        is_default: true,
        is_closed: false,
        is_adhoc: false,
        // Note: NO goal_id on instance - it should be detected from the Bill
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        occurrences: [
          {
            id: 'occ-goal-recurring-001',
            sequence: 1,
            expected_date: '2026-02-05',
            expected_amount: 25000,
            is_closed: false,
            is_adhoc: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ],
    income_instances: [
      {
        id: 'ii-salary-001',
        income_id: 'income-salary-001',
        month: '2026-02',
        billing_period: 'bi_weekly',
        expected_amount: 1000000,
        is_default: true,
        is_closed: false,
        is_adhoc: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        occurrences: [
          {
            id: 'occ-salary-001',
            sequence: 1,
            expected_date: '2026-02-07',
            expected_amount: 500000,
            is_closed: true,
            closed_date: '2026-02-07',
            is_adhoc: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-02-07T00:00:00.000Z',
          },
          {
            id: 'occ-salary-002',
            sequence: 2,
            expected_date: '2026-02-21',
            expected_amount: 500000,
            is_closed: false,
            is_adhoc: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ],
    variable_expenses: [],
    todo_instances: [
      {
        id: 'ti-001',
        todo_id: 'todo-001',
        month: '2026-02',
        title: 'Pay taxes',
        due_date: '2026-02-15',
        status: 'pending',
        is_adhoc: false,
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 'ti-002',
        todo_id: 'todo-002',
        month: '2026-02',
        title: 'Review budget',
        due_date: '2026-02-28',
        status: 'completed',
        is_adhoc: false,
        completed_at: '2026-02-25T00:00:00.000Z',
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-02-25T00:00:00.000Z',
      },
    ],
  };

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `calendar-service-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset files before each test
    await writeFile(join(testDir, 'entities', 'bills.json'), JSON.stringify(sampleBills, null, 2));
    await writeFile(
      join(testDir, 'entities', 'incomes.json'),
      JSON.stringify(sampleIncomes, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'savings-goals.json'),
      JSON.stringify(sampleGoals, null, 2)
    );
    await writeFile(
      join(testDir, 'months', '2026-02.json'),
      JSON.stringify(sampleMonthlyData, null, 2)
    );

    // Create new service instance
    service = new CalendarServiceImpl();
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  // ============================================================================
  // getEventsForMonth Tests
  // ============================================================================

  describe('getEventsForMonth', () => {
    test('should return all events for a month', async () => {
      const response = await service.getEventsForMonth('2026-02');

      expect(response.month).toBe('2026-02');
      expect(response.events.length).toBeGreaterThan(0);
    });

    test('should include bill events', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const billEvents = response.events.filter((e) => e.type === 'bill');

      expect(billEvents.length).toBe(2); // Rent and Internet (goal contribs are type 'goal')
      expect(billEvents.some((e) => e.title === 'Rent')).toBe(true);
      expect(billEvents.some((e) => e.title === 'Internet')).toBe(true);
    });

    test('should include income events', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const incomeEvents = response.events.filter((e) => e.type === 'income');

      expect(incomeEvents.length).toBe(2); // Two salary occurrences
      expect(incomeEvents.every((e) => e.title === 'Salary')).toBe(true);
    });

    test('should include goal contribution events with type goal (ad-hoc via instance.goal_id)', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const goalEvents = response.events.filter((e) => e.type === 'goal');

      // Should have 2 goal events: one ad-hoc, one recurring
      expect(goalEvents.length).toBe(2);

      // Find the ad-hoc contribution (from instance.goal_id)
      const adhocGoal = goalEvents.find((e) => e.id.includes('bi-goal-adhoc-001'));
      expect(adhocGoal).toBeDefined();
      expect(adhocGoal?.title).toBe('Vacation Fund'); // Uses goal name
      expect(adhocGoal?.amount).toBe(10000);
      expect(adhocGoal?.date).toBe('2026-02-20');
    });

    test('should include goal contribution events with type goal (recurring via bill.goal_id)', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const goalEvents = response.events.filter((e) => e.type === 'goal');

      // Find the recurring contribution (from bill.goal_id)
      const recurringGoal = goalEvents.find((e) => e.id.includes('bi-goal-recurring-001'));
      expect(recurringGoal).toBeDefined();
      expect(recurringGoal?.title).toBe('Vacation Fund'); // Uses goal name, not bill name
      expect(recurringGoal?.amount).toBe(25000);
      expect(recurringGoal?.date).toBe('2026-02-05');
    });

    test('should include todo events', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const todoEvents = response.events.filter((e) => e.type === 'todo');

      expect(todoEvents.length).toBe(2);
      expect(todoEvents.some((e) => e.title === 'Pay taxes')).toBe(true);
      expect(todoEvents.some((e) => e.title === 'Review budget')).toBe(true);
    });

    test('should mark closed events correctly', async () => {
      const response = await service.getEventsForMonth('2026-02');

      // Rent bill is closed
      const rentEvent = response.events.find((e) => e.title === 'Rent');
      expect(rentEvent?.is_closed).toBe(true);

      // Internet bill is open
      const internetEvent = response.events.find((e) => e.title === 'Internet');
      expect(internetEvent?.is_closed).toBe(false);

      // Completed todo is closed
      const completedTodo = response.events.find((e) => e.title === 'Review budget');
      expect(completedTodo?.is_closed).toBe(true);
    });

    test('should sort events by date', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const dates = response.events.map((e) => e.date);

      // Check that dates are in ascending order
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] >= dates[i - 1]).toBe(true);
      }
    });

    test('should calculate summary correctly', async () => {
      const response = await service.getEventsForMonth('2026-02');

      expect(response.summary.bills).toBe(2); // Rent + Internet
      expect(response.summary.incomes).toBe(2); // 2 salary occurrences
      expect(response.summary.goals).toBe(2); // 1 ad-hoc + 1 recurring
      expect(response.summary.todos).toBe(2);
      expect(response.summary.total).toBe(8);
    });

    test('should return empty events for non-existent month', async () => {
      const response = await service.getEventsForMonth('2099-01');

      expect(response.month).toBe('2099-01');
      expect(response.events).toHaveLength(0);
      expect(response.summary.total).toBe(0);
    });
  });

  // ============================================================================
  // getEventsForDate Tests
  // ============================================================================

  describe('getEventsForDate', () => {
    test('should return events for a specific date', async () => {
      const events = await service.getEventsForDate('2026-02', '2026-02-15');

      expect(events.length).toBe(2); // Internet bill and Pay taxes todo
      expect(events.some((e) => e.title === 'Internet')).toBe(true);
      expect(events.some((e) => e.title === 'Pay taxes')).toBe(true);
    });

    test('should return empty array for date with no events', async () => {
      const events = await service.getEventsForDate('2026-02', '2026-02-10');

      expect(events).toHaveLength(0);
    });

    test('should return events on first of month', async () => {
      const events = await service.getEventsForDate('2026-02', '2026-02-01');

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Rent');
    });
  });

  // ============================================================================
  // Overdue Detection Tests
  // ============================================================================

  describe('overdue detection', () => {
    test('should mark past unclosed events as overdue', async () => {
      // Get events (today is in the future of 2026-02-01 since we're testing)
      // For this test, we need to check the logic
      const response = await service.getEventsForMonth('2026-02');

      // The Rent event on 2026-02-01 is closed, so not overdue
      const rentEvent = response.events.find((e) => e.title === 'Rent');
      expect(rentEvent?.is_overdue).toBe(false);
    });

    test('should not mark closed events as overdue', async () => {
      const response = await service.getEventsForMonth('2026-02');

      // All closed events should not be overdue
      const closedEvents = response.events.filter((e) => e.is_closed);
      closedEvents.forEach((e) => {
        expect(e.is_overdue).toBe(false);
      });
    });
  });

  // ============================================================================
  // Event ID Tests
  // ============================================================================

  describe('event IDs', () => {
    test('should generate unique event IDs', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const ids = response.events.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    test('should include type prefix in event ID', async () => {
      const response = await service.getEventsForMonth('2026-02');

      const billEvent = response.events.find((e) => e.type === 'bill');
      expect(billEvent?.id.startsWith('bill-')).toBe(true);

      const incomeEvent = response.events.find((e) => e.type === 'income');
      expect(incomeEvent?.id.startsWith('income-')).toBe(true);

      const goalEvent = response.events.find((e) => e.type === 'goal');
      expect(goalEvent?.id.startsWith('goal-')).toBe(true);

      const todoEvent = response.events.find((e) => e.type === 'todo');
      expect(todoEvent?.id.startsWith('todo-')).toBe(true);
    });
  });

  // ============================================================================
  // Source ID Tests
  // ============================================================================

  describe('source IDs', () => {
    test('should include correct source_id for bills', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const rentEvent = response.events.find((e) => e.title === 'Rent');

      expect(rentEvent?.source_id).toBe('bill-rent-001');
    });

    test('should include correct source_id for incomes', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const salaryEvent = response.events.find((e) => e.type === 'income');

      expect(salaryEvent?.source_id).toBe('income-salary-001');
    });

    test('should include goal_id as source_id for goal contributions (both ad-hoc and recurring)', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const goalEvents = response.events.filter((e) => e.type === 'goal');

      // Both goal events should have the goal_id as source_id
      expect(goalEvents.length).toBe(2);
      goalEvents.forEach((e) => {
        expect(e.source_id).toBe('goal-vacation-001');
      });
    });
  });

  // ============================================================================
  // Goal Detection Tests (separating goals from bills)
  // ============================================================================

  describe('goal detection', () => {
    test('should detect goal from instance.goal_id (ad-hoc contribution)', async () => {
      const response = await service.getEventsForMonth('2026-02');

      // The ad-hoc contribution has goal_id on the instance
      const adhocEvent = response.events.find((e) => e.instance_id === 'bi-goal-adhoc-001');
      expect(adhocEvent).toBeDefined();
      expect(adhocEvent?.type).toBe('goal');
      expect(adhocEvent?.title).toBe('Vacation Fund');
    });

    test('should detect goal from bill.goal_id (recurring contribution)', async () => {
      const response = await service.getEventsForMonth('2026-02');

      // The recurring contribution has goal_id on the Bill entity, not the instance
      const recurringEvent = response.events.find((e) => e.instance_id === 'bi-goal-recurring-001');
      expect(recurringEvent).toBeDefined();
      expect(recurringEvent?.type).toBe('goal');
      expect(recurringEvent?.title).toBe('Vacation Fund'); // Uses goal name
    });

    test('should NOT detect goal for regular bills without goal_id', async () => {
      const response = await service.getEventsForMonth('2026-02');

      // Regular bills should remain as type 'bill'
      const rentEvent = response.events.find((e) => e.instance_id === 'bi-rent-001');
      expect(rentEvent?.type).toBe('bill');
      expect(rentEvent?.title).toBe('Rent');

      const internetEvent = response.events.find((e) => e.instance_id === 'bi-internet-001');
      expect(internetEvent?.type).toBe('bill');
      expect(internetEvent?.title).toBe('Internet');
    });

    test('should use goal name for title when goal_id is present', async () => {
      const response = await service.getEventsForMonth('2026-02');
      const goalEvents = response.events.filter((e) => e.type === 'goal');

      // Both goal events should use the goal name "Vacation Fund", not the bill/instance name
      goalEvents.forEach((e) => {
        expect(e.title).toBe('Vacation Fund');
      });
    });

    test('should prioritize instance.goal_id over bill.goal_id', async () => {
      // This test ensures that if both instance and bill have goal_id,
      // the instance's goal_id takes precedence
      const response = await service.getEventsForMonth('2026-02');

      // The ad-hoc event has instance.goal_id set
      const adhocEvent = response.events.find((e) => e.instance_id === 'bi-goal-adhoc-001');
      expect(adhocEvent?.source_id).toBe('goal-vacation-001');
    });

    test('should correctly count goals vs bills in summary', async () => {
      const response = await service.getEventsForMonth('2026-02');

      // 2 regular bills (Rent, Internet)
      expect(response.summary.bills).toBe(2);

      // 2 goal contributions (1 ad-hoc, 1 recurring)
      expect(response.summary.goals).toBe(2);
    });
  });
});
