// Ad-hoc Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { AdhocServiceImpl } from './adhoc-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Category, MonthlyData, SavingsGoal } from '../types';

describe('AdhocService', () => {
  let service: AdhocServiceImpl;
  let testDir: string;

  // Sample categories for testing
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
    {
      id: 'cat-bills',
      name: 'Bills',
      type: 'bill',
      color: '#ff6b6b',
      sort_order: 1,
      is_predefined: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  // Sample savings goal for testing
  const sampleGoals: SavingsGoal[] = [
    {
      id: 'goal-winter-tires-001',
      name: 'Winter Tires',
      target_amount: 80000, // $800.00
      current_amount: 20000,
      target_date: '2026-10-01',
      linked_account_id: 'ps-savings-001',
      status: 'saving',
      notes: 'For the SUV',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  // Empty monthly data for the current month
  const getEmptyMonthData = (month: string): MonthlyData => ({
    month,
    bill_instances: [],
    income_instances: [],
    variable_expenses: [],
    free_flowing_expenses: [],
    bank_balances: {},
    is_read_only: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `adhoc-service-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset files before each test
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify(sampleCategories, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'savings-goals.json'),
      JSON.stringify(sampleGoals, null, 2)
    );

    // Create month data for current month
    const currentMonth = new Date().toISOString().substring(0, 7);
    await writeFile(
      join(testDir, 'months', `${currentMonth}.json`),
      JSON.stringify(getEmptyMonthData(currentMonth), null, 2)
    );

    // Create new service instance
    service = new AdhocServiceImpl();
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  // ============================================================================
  // Goal Contribution Tests
  // ============================================================================

  describe('createGoalContribution', () => {
    test('should create a goal contribution with payment', async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      const contribution = await service.createGoalContribution(currentMonth, {
        goal_id: 'goal-winter-tires-001',
        goal_name: 'Winter Tires',
        amount: 10000, // $100
        category_id: 'cat-savings-goals',
        payment_source_id: 'ps-savings-001',
        date: today,
      });

      expect(contribution.id).toBeDefined();
      expect(contribution.goal_id).toBe('goal-winter-tires-001');
      expect(contribution.name).toBe('Payment: Winter Tires');
      expect(contribution.expected_amount).toBe(10000);
      expect(contribution.is_adhoc).toBe(true);
      expect(contribution.is_closed).toBe(true);
      expect(contribution.category_id).toBe('cat-savings-goals');
      expect(contribution.payment_source_id).toBe('ps-savings-001');

      // Should have a single closed occurrence (closing = payment in occurrence-only model)
      expect(contribution.occurrences).toHaveLength(1);
      expect(contribution.occurrences[0].is_closed).toBe(true);
      expect(contribution.occurrences[0].closed_date).toBe(today);
      expect(contribution.occurrences[0].expected_amount).toBe(10000);
    });

    test('should reject contribution without goal_id', async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      await expect(
        service.createGoalContribution(currentMonth, {
          goal_id: '',
          goal_name: 'Test',
          amount: 10000,
          category_id: 'cat-savings-goals',
          payment_source_id: 'ps-savings-001',
          date: today,
        })
      ).rejects.toThrow('Goal ID is required');
    });

    test('should reject contribution without goal_name', async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      await expect(
        service.createGoalContribution(currentMonth, {
          goal_id: 'goal-winter-tires-001',
          goal_name: '',
          amount: 10000,
          category_id: 'cat-savings-goals',
          payment_source_id: 'ps-savings-001',
          date: today,
        })
      ).rejects.toThrow('Goal name is required');
    });

    test('should reject contribution with zero amount', async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      await expect(
        service.createGoalContribution(currentMonth, {
          goal_id: 'goal-winter-tires-001',
          goal_name: 'Winter Tires',
          amount: 0,
          category_id: 'cat-savings-goals',
          payment_source_id: 'ps-savings-001',
          date: today,
        })
      ).rejects.toThrow('Amount must be positive');
    });

    test('should reject contribution with negative amount', async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      await expect(
        service.createGoalContribution(currentMonth, {
          goal_id: 'goal-winter-tires-001',
          goal_name: 'Winter Tires',
          amount: -100,
          category_id: 'cat-savings-goals',
          payment_source_id: 'ps-savings-001',
          date: today,
        })
      ).rejects.toThrow('Amount must be positive');
    });

    test('should reject contribution without category_id', async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      await expect(
        service.createGoalContribution(currentMonth, {
          goal_id: 'goal-winter-tires-001',
          goal_name: 'Winter Tires',
          amount: 10000,
          category_id: '',
          payment_source_id: 'ps-savings-001',
          date: today,
        })
      ).rejects.toThrow('Category ID is required');
    });

    test('should reject contribution without payment_source_id', async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      await expect(
        service.createGoalContribution(currentMonth, {
          goal_id: 'goal-winter-tires-001',
          goal_name: 'Winter Tires',
          amount: 10000,
          category_id: 'cat-savings-goals',
          payment_source_id: '',
          date: today,
        })
      ).rejects.toThrow('Payment source ID is required');
    });

    test('should reject contribution without date', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      await expect(
        service.createGoalContribution(currentMonth, {
          goal_id: 'goal-winter-tires-001',
          goal_name: 'Winter Tires',
          amount: 10000,
          category_id: 'cat-savings-goals',
          payment_source_id: 'ps-savings-001',
          date: '',
        })
      ).rejects.toThrow('Date is required');
    });

    test('should reject contribution with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().substring(0, 7);

      await expect(
        service.createGoalContribution(currentMonth, {
          goal_id: 'goal-winter-tires-001',
          goal_name: 'Winter Tires',
          amount: 10000,
          category_id: 'cat-savings-goals',
          payment_source_id: 'ps-savings-001',
          date: futureDateStr,
        })
      ).rejects.toThrow('Payment date cannot be in the future');
    });

    test('should reject contribution with date in different month', async () => {
      const today = new Date().toISOString().split('T')[0];
      const differentMonth = '2025-06'; // A month in the past

      await expect(
        service.createGoalContribution(differentMonth, {
          goal_id: 'goal-winter-tires-001',
          goal_name: 'Winter Tires',
          amount: 10000,
          category_id: 'cat-savings-goals',
          payment_source_id: 'ps-savings-001',
          date: today, // Today is not in 2025-06
        })
      ).rejects.toThrow('Payment date must be within the specified month');
    });

    test('should create month data if it does not exist', async () => {
      // Use a date in the past that exists
      const pastMonth = '2025-12';
      const pastDate = '2025-12-15';

      // This should work because createGoalContribution generates month if missing
      // But the future date check will fail since 2025-12-15 is in the past
      // So let's test with a date that IS in the past (not future)
      const contribution = await service.createGoalContribution(pastMonth, {
        goal_id: 'goal-winter-tires-001',
        goal_name: 'Winter Tires',
        amount: 5000,
        category_id: 'cat-savings-goals',
        payment_source_id: 'ps-savings-001',
        date: pastDate,
      });

      expect(contribution.id).toBeDefined();
      expect(contribution.month).toBe(pastMonth);
    });
  });

  // ============================================================================
  // Ad-hoc Bill Tests
  // ============================================================================

  describe('createAdhocBill', () => {
    test('should create an ad-hoc bill', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      const bill = await service.createAdhocBill(currentMonth, {
        name: 'Emergency Repair',
        amount: 25000,
        category_id: 'cat-bills',
        payment_source_id: 'ps-savings-001',
      });

      expect(bill.id).toBeDefined();
      expect(bill.name).toBe('Emergency Repair');
      expect(bill.expected_amount).toBe(25000);
      expect(bill.is_adhoc).toBe(true);
      expect(bill.bill_id).toBeNull();
      expect(bill.occurrences).toHaveLength(1);
    });

    test('should reject ad-hoc bill without name', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      await expect(
        service.createAdhocBill(currentMonth, {
          name: '',
          amount: 25000,
        })
      ).rejects.toThrow('Name is required');
    });

    test('should reject ad-hoc bill with zero amount', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      await expect(
        service.createAdhocBill(currentMonth, {
          name: 'Test',
          amount: 0,
        })
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('updateAdhocBill', () => {
    test('should update an ad-hoc bill', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      const bill = await service.createAdhocBill(currentMonth, {
        name: 'Original Name',
        amount: 10000,
      });

      const updated = await service.updateAdhocBill(currentMonth, bill.id, {
        name: 'Updated Name',
        expected_amount: 15000,
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.expected_amount).toBe(15000);
    });

    test('should return null for non-existent bill', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      const result = await service.updateAdhocBill(currentMonth, 'non-existent', {
        name: 'Test',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteAdhocBill', () => {
    test('should delete an ad-hoc bill', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      const bill = await service.createAdhocBill(currentMonth, {
        name: 'To Delete',
        amount: 5000,
      });

      await service.deleteAdhocBill(currentMonth, bill.id);

      // Trying to update should return null since it's deleted
      const result = await service.updateAdhocBill(currentMonth, bill.id, {
        name: 'Test',
      });

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Ad-hoc Income Tests
  // ============================================================================

  describe('createAdhocIncome', () => {
    test('should create an ad-hoc income', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      const income = await service.createAdhocIncome(currentMonth, {
        name: 'Bonus',
        amount: 50000,
      });

      expect(income.id).toBeDefined();
      expect(income.name).toBe('Bonus');
      expect(income.expected_amount).toBe(50000);
      expect(income.is_adhoc).toBe(true);
      expect(income.income_id).toBeNull();
    });

    test('should reject ad-hoc income without name', async () => {
      const currentMonth = new Date().toISOString().substring(0, 7);

      await expect(
        service.createAdhocIncome(currentMonth, {
          name: '',
          amount: 50000,
        })
      ).rejects.toThrow('Name is required');
    });
  });
});
