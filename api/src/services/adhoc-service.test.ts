// Ad-hoc Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { AdhocServiceImpl } from './adhoc-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Category, MonthlyData } from '../types';
import { getTodayLocalDateString } from '../utils/due-date';

describe('AdhocService', () => {
  let service: AdhocServiceImpl;
  let testDir: string;

  // Sample categories for testing
  const sampleCategories: Category[] = [
    {
      id: 'cat-savings',
      name: 'Savings',
      type: 'bill',
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

    test('defaults the due date to today in the current month', async () => {
      const today = getTodayLocalDateString();
      const bill = await service.createAdhocBill(today.substring(0, 7), {
        name: 'Repair',
        amount: 25000,
        category_id: 'cat-bills',
      });

      expect(bill.occurrences[0].expected_date).toBe(today);
      expect(bill.is_closed).toBe(false);
    });

    test('defaults the due date into the target month when adding to another month', async () => {
      const otherMonth = '2030-06';
      await writeFile(
        join(testDir, 'months', `${otherMonth}.json`),
        JSON.stringify(getEmptyMonthData(otherMonth), null, 2)
      );

      const bill = await service.createAdhocBill(otherMonth, {
        name: 'Future repair',
        amount: 25000,
        category_id: 'cat-bills',
      });
      const income = await service.createAdhocIncome(otherMonth, {
        name: 'Future gift',
        amount: 5000,
        category_id: 'cat-income',
      });

      expect(bill.occurrences[0].expected_date).toBe('2030-06-01');
      expect(income.occurrences[0].expected_date).toBe('2030-06-01');
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
