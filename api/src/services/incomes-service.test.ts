// Incomes Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { IncomesServiceImpl } from './incomes-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Income, PaymentSource, Category } from '../types';

describe('IncomesService', () => {
  let service: IncomesServiceImpl;
  let testDir: string;

  // Sample payment source for incomes
  const samplePaymentSource: PaymentSource = {
    id: 'ps-checking-001',
    name: 'Checking',
    type: 'bank_account',
    balance: 500000,
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  // Sample category for incomes
  const sampleCategory: Category = {
    id: 'cat-salary-001',
    name: 'Salary',
    type: 'income',
    color: '#22c55e',
    sort_order: 0,
    is_predefined: false,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  // Sample incomes for testing
  const sampleIncomes: Income[] = [
    {
      id: 'income-salary-001',
      name: 'Primary Salary',
      amount: 500000, // $5,000.00
      billing_period: 'bi_weekly',
      start_date: '2025-01-03',
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-salary-001',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'income-freelance-002',
      name: 'Freelance',
      amount: 100000, // $1,000.00
      billing_period: 'monthly',
      day_of_month: 15,
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-salary-001',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'income-inactive-003',
      name: 'Old Side Gig',
      amount: 25000, // $250.00
      billing_period: 'monthly',
      day_of_month: 1,
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-salary-001',
      is_active: false, // Inactive income
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `incomes-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset files before each test
    await writeFile(
      join(testDir, 'entities', 'incomes.json'),
      JSON.stringify(sampleIncomes, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify([samplePaymentSource], null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify([sampleCategory], null, 2)
    );
    // Create new service instance
    service = new IncomesServiceImpl();
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getAll', () => {
    test('returns all incomes', async () => {
      const incomes = await service.getAll();
      expect(incomes.length).toBe(3);
    });

    test('returns empty array when no incomes exist', async () => {
      await writeFile(join(testDir, 'entities', 'incomes.json'), '[]');
      service = new IncomesServiceImpl();
      const incomes = await service.getAll();
      expect(incomes).toEqual([]);
    });

    test('returns incomes with correct structure', async () => {
      const incomes = await service.getAll();
      const salary = incomes.find((i) => i.name === 'Primary Salary');
      expect(salary).toBeDefined();
      expect(salary?.amount).toBe(500000);
      expect(salary?.billing_period).toBe('bi_weekly');
      expect(salary?.payment_source_id).toBe('ps-checking-001');
    });
  });

  describe('getById', () => {
    test('returns income when found', async () => {
      const income = await service.getById('income-salary-001');
      expect(income).not.toBeNull();
      expect(income?.name).toBe('Primary Salary');
      expect(income?.amount).toBe(500000);
    });

    test('returns null when not found', async () => {
      const income = await service.getById('non-existent-id');
      expect(income).toBeNull();
    });
  });

  describe('create', () => {
    test('creates new income with generated id', async () => {
      const newIncome = await service.create({
        name: 'Bonus',
        amount: 200000,
        billing_period: 'monthly',
        day_of_month: 25,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });

      expect(newIncome.id).toBeDefined();
      expect(newIncome.name).toBe('Bonus');
      expect(newIncome.amount).toBe(200000);
      expect(newIncome.is_active).toBe(true);
      expect(newIncome.created_at).toBeDefined();
      expect(newIncome.updated_at).toBeDefined();
    });

    test('persists new income', async () => {
      await service.create({
        name: 'Dividends',
        amount: 50000,
        billing_period: 'monthly',
        day_of_month: 1,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });

      const incomes = await service.getAll();
      const found = incomes.find((i) => i.name === 'Dividends');
      expect(found).toBeDefined();
      expect(found?.amount).toBe(50000);
    });

    test('creates income with bi-weekly period', async () => {
      const newIncome = await service.create({
        name: 'Second Job',
        amount: 150000,
        billing_period: 'bi_weekly',
        start_date: '2025-01-10',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });

      expect(newIncome.billing_period).toBe('bi_weekly');
      expect(newIncome.start_date).toBe('2025-01-10');
    });

    test('creates income with category', async () => {
      const newIncome = await service.create({
        name: 'Rental Income',
        amount: 120000,
        billing_period: 'monthly',
        day_of_month: 1,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });

      expect(newIncome.category_id).toBe('cat-salary-001');
    });

    test('throws error for invalid data - missing name', async () => {
      await expect(
        service.create({
          name: '',
          amount: 50000,
          billing_period: 'monthly',
          day_of_month: 1,
          payment_source_id: 'ps-checking-001',
          category_id: 'cat-salary-001',
        })
      ).rejects.toThrow();
    });

    test('throws error for invalid data - negative amount', async () => {
      await expect(
        service.create({
          name: 'Test',
          amount: -100,
          billing_period: 'monthly',
          day_of_month: 1,
          payment_source_id: 'ps-checking-001',
          category_id: 'cat-salary-001',
        })
      ).rejects.toThrow();
    });

    test('throws error for invalid billing period', async () => {
      await expect(
        service.create({
          name: 'Test',
          amount: 50000,
          billing_period: 'invalid' as 'monthly',
          day_of_month: 1,
          payment_source_id: 'ps-checking-001',
          category_id: 'cat-salary-001',
        })
      ).rejects.toThrow();
    });

    test('throws error for missing category_id', async () => {
      await expect(
        service.create({
          name: 'Test',
          amount: 50000,
          billing_period: 'monthly',
          day_of_month: 1,
          payment_source_id: 'ps-checking-001',
          category_id: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    test('updates existing income', async () => {
      const updated = await service.update('income-salary-001', {
        amount: 550000, // Raise
      });

      expect(updated).not.toBeNull();
      expect(updated?.amount).toBe(550000);
      expect(updated?.name).toBe('Primary Salary'); // Unchanged
      expect(updated?.updated_at).not.toBe('2025-01-01T00:00:00.000Z');
    });

    test('updates multiple fields', async () => {
      const updated = await service.update('income-freelance-002', {
        name: 'Consulting',
        amount: 150000,
        day_of_month: 20,
      });

      expect(updated?.name).toBe('Consulting');
      expect(updated?.amount).toBe(150000);
      expect(updated?.day_of_month).toBe(20);
    });

    test('returns null for non-existent income', async () => {
      const result = await service.update('non-existent-id', { amount: 50000 });
      expect(result).toBeNull();
    });

    test('can deactivate an income', async () => {
      const updated = await service.update('income-salary-001', {
        is_active: false,
      });

      expect(updated?.is_active).toBe(false);
    });

    test('can reactivate an income', async () => {
      const updated = await service.update('income-inactive-003', {
        is_active: true,
      });

      expect(updated?.is_active).toBe(true);
    });
  });

  describe('delete', () => {
    test('deletes existing income', async () => {
      await service.delete('income-freelance-002');
      const income = await service.getById('income-freelance-002');
      expect(income).toBeNull();
    });

    test('does not throw for non-existent income', async () => {
      await expect(service.delete('non-existent-id')).resolves.toBeUndefined();
    });

    test('only deletes specified income', async () => {
      const beforeCount = (await service.getAll()).length;
      await service.delete('income-salary-001');
      const afterCount = (await service.getAll()).length;
      expect(afterCount).toBe(beforeCount - 1);

      // Other incomes should still exist
      const freelance = await service.getById('income-freelance-002');
      expect(freelance).not.toBeNull();
    });
  });

  describe('validate', () => {
    test('returns valid for correct data', () => {
      const result = service.validate({
        name: 'Test Income',
        amount: 100000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns invalid for missing name', () => {
      const result = service.validate({
        amount: 100000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for invalid amount', () => {
      const result = service.validate({
        name: 'Test',
        amount: -100,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for invalid billing period', () => {
      const result = service.validate({
        name: 'Test',
        amount: 100000,
        billing_period: 'daily' as 'monthly',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });
      expect(result.isValid).toBe(false);
    });

    test('returns valid for bi_weekly billing', () => {
      const result = service.validate({
        name: 'Bi-weekly Income',
        amount: 250000,
        billing_period: 'bi_weekly',
        start_date: '2025-01-03',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });
      expect(result.isValid).toBe(true);
    });

    test('returns valid for weekly billing', () => {
      const result = service.validate({
        name: 'Weekly Income',
        amount: 50000,
        billing_period: 'weekly',
        start_date: '2025-01-06',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-salary-001',
      });
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for missing category_id', () => {
      const result = service.validate({
        name: 'Test Income',
        amount: 100000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category ID is required');
    });

    test('returns invalid for empty category_id', () => {
      const result = service.validate({
        name: 'Test Income',
        amount: 100000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category ID is required');
    });
  });
});
