// Calendar Handlers Tests
// Tests the HTTP handlers for calendar endpoints

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { StorageServiceImpl } from '../../services/storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { MonthlyData, Bill, Income, SavingsGoal } from '../../types';
import { createCalendarHandlerGET } from './calendar.handlers';

describe('CalendarHandlers', () => {
  let testDir: string;
  let handler: (request: Request) => Promise<Response>;

  // Sample bills for testing
  const sampleBills: Bill[] = [
    {
      id: 'bill-rent-001',
      name: 'Rent',
      default_amount: 150000,
      recurrence: 'monthly',
      payment_source_id: 'ps-checking-001',
      day_of_month: 1,
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
      default_amount: 500000,
      recurrence: 'bi_weekly',
      deposit_account_id: 'ps-checking-001',
      start_date: '2026-01-03',
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  // Sample savings goals for testing
  const sampleGoals: SavingsGoal[] = [];

  // Sample monthly data
  const sampleMonthlyData: MonthlyData = {
    month: '2026-02',
    starting_balances: {},
    bill_instances: [
      {
        id: 'bi-rent-001',
        bill_id: 'bill-rent-001',
        name: 'Rent',
        occurrences: [
          {
            id: 'occ-rent-001',
            expected_date: '2026-02-01',
            expected_amount: 150000,
            is_closed: false,
            is_adhoc: false,
          },
        ],
      },
    ],
    income_instances: [
      {
        id: 'ii-salary-001',
        income_id: 'income-salary-001',
        name: 'Salary',
        occurrences: [
          {
            id: 'occ-salary-001',
            expected_date: '2026-02-07',
            expected_amount: 500000,
            is_closed: false,
            is_adhoc: false,
          },
        ],
      },
    ],
    variable_expenses: [],
    todo_instances: [
      {
        id: 'ti-001',
        todo_id: 'todo-001',
        title: 'Pay taxes',
        due_date: '2026-02-15',
        status: 'pending',
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-02-01T00:00:00.000Z',
      },
    ],
  };

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `calendar-handlers-test-${Date.now()}`);
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

    // Create handler
    handler = createCalendarHandlerGET();
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  // ============================================================================
  // GET /api/calendar/:month Tests
  // ============================================================================

  describe('GET /api/calendar/:month', () => {
    test('should return calendar events for a valid month', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.month).toBe('2026-02');
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
      expect(data.summary).toBeDefined();
    });

    test('should return events with correct structure', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02');
      const response = await handler(request);
      const data = await response.json();

      expect(data.events.length).toBeGreaterThan(0);

      // Check first event structure
      const event = data.events[0];
      expect(event.id).toBeDefined();
      expect(event.type).toBeDefined();
      expect(event.date).toBeDefined();
      expect(event.title).toBeDefined();
      expect(typeof event.is_closed).toBe('boolean');
      expect(typeof event.is_overdue).toBe('boolean');
      expect(event.source_id).toBeDefined();
      expect(event.instance_id).toBeDefined();
    });

    test('should return summary counts', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02');
      const response = await handler(request);
      const data = await response.json();

      expect(data.summary.bills).toBe(1);
      expect(data.summary.incomes).toBe(1);
      expect(data.summary.goals).toBe(0);
      expect(data.summary.todos).toBe(1);
      expect(data.summary.total).toBe(3);
    });

    test('should return empty events for non-existent month', async () => {
      const request = new Request('http://localhost/api/calendar/2099-01');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toHaveLength(0);
      expect(data.summary.total).toBe(0);
    });

    test('should return 400 for invalid month format', async () => {
      const request = new Request('http://localhost/api/calendar/2026-2');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid month format');
    });

    test('should return 400 for non-date month format', async () => {
      const request = new Request('http://localhost/api/calendar/invalid');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid month format');
    });
  });

  // ============================================================================
  // GET /api/calendar/:month/:date Tests
  // ============================================================================

  describe('GET /api/calendar/:month/:date', () => {
    test('should return events for a specific date', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02/2026-02-01');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.month).toBe('2026-02');
      expect(data.date).toBe('2026-02-01');
      expect(data.events).toBeDefined();
      expect(data.count).toBe(data.events.length);
    });

    test('should return only events on the specified date', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02/2026-02-01');
      const response = await handler(request);
      const data = await response.json();

      // Should only have the Rent event on Feb 1
      expect(data.events.length).toBe(1);
      expect(data.events[0].title).toBe('Rent');
      expect(data.events[0].date).toBe('2026-02-01');
    });

    test('should return events for date with todos', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02/2026-02-15');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events.length).toBe(1);
      expect(data.events[0].title).toBe('Pay taxes');
      expect(data.events[0].type).toBe('todo');
    });

    test('should return empty events for date with no events', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02/2026-02-10');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    test('should return 400 for invalid date format', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02/2026-2-1');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid date format');
    });

    test('should return 400 for date not in requested month', async () => {
      const request = new Request('http://localhost/api/calendar/2026-02/2026-03-01');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Date must be within the requested month');
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('should return 400 for missing calendar path', async () => {
      const request = new Request('http://localhost/api/other/2026-02');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});
