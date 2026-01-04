// Categories Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { CategoriesServiceImpl, VARIABLE_EXPENSES_CATEGORY_ID } from './categories-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Category } from '../types';

describe('CategoriesService', () => {
  let service: CategoriesServiceImpl;
  let testDir: string;

  // Sample categories for testing
  const sampleCategories: Category[] = [
    {
      id: 'cat-housing-001',
      name: 'Housing',
      type: 'bill',
      color: '#3b82f6',
      sort_order: 0,
      is_predefined: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-utilities-002',
      name: 'Utilities',
      type: 'bill',
      color: '#10b981',
      sort_order: 1,
      is_predefined: false,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-salary-003',
      name: 'Salary',
      type: 'income',
      color: '#22c55e',
      sort_order: 0,
      is_predefined: false,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `categories-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset categories file before each test
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify(sampleCategories, null, 2)
    );
    // Create new service instance to avoid caching issues
    service = new CategoriesServiceImpl();
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
    test('returns all categories sorted by type and sort_order', async () => {
      const categories = await service.getAll();
      // Should have original 3 + auto-created variable expenses category
      expect(categories.length).toBeGreaterThanOrEqual(3);

      // Find bill categories - should be sorted by sort_order
      const bills = categories.filter((c) => c.type === 'bill');
      expect(bills.length).toBeGreaterThanOrEqual(2);
      expect(bills[0].name).toBe('Housing');
      expect(bills[1].name).toBe('Utilities');
    });

    test('ensures Variable Expenses category exists', async () => {
      const categories = await service.getAll();
      const variableCategory = categories.find((c) => c.type === 'variable');
      expect(variableCategory).toBeDefined();
      expect(variableCategory?.name).toBe('Variable Expenses');
    });

    test('returns empty array when file is empty', async () => {
      await writeFile(join(testDir, 'entities', 'categories.json'), '[]');
      service = new CategoriesServiceImpl();
      const categories = await service.getAll();
      // Should still have Variable Expenses auto-created
      expect(categories.length).toBe(1);
      expect(categories[0].type).toBe('variable');
    });
  });

  describe('getByType', () => {
    test('returns only bill categories', async () => {
      const bills = await service.getByType('bill');
      expect(bills.every((c) => c.type === 'bill')).toBe(true);
      expect(bills.length).toBeGreaterThanOrEqual(2);
    });

    test('returns only income categories', async () => {
      const incomes = await service.getByType('income');
      expect(incomes.every((c) => c.type === 'income')).toBe(true);
      expect(incomes.length).toBe(1);
      expect(incomes[0].name).toBe('Salary');
    });

    test('returns categories sorted by sort_order', async () => {
      const bills = await service.getByType('bill');
      for (let i = 1; i < bills.length; i++) {
        expect(bills[i].sort_order).toBeGreaterThanOrEqual(bills[i - 1].sort_order);
      }
    });
  });

  describe('getById', () => {
    test('returns category when found', async () => {
      const category = await service.getById('cat-housing-001');
      expect(category).not.toBeNull();
      expect(category?.name).toBe('Housing');
    });

    test('returns null when not found', async () => {
      const category = await service.getById('non-existent-id');
      expect(category).toBeNull();
    });
  });

  describe('create', () => {
    test('creates new category with generated id', async () => {
      const newCategory = await service.create({
        name: 'Insurance',
        type: 'bill',
        color: '#ef4444',
        sort_order: 10,
        is_predefined: false,
      });

      expect(newCategory.id).toBeDefined();
      expect(newCategory.name).toBe('Insurance');
      expect(newCategory.type).toBe('bill');
      expect(newCategory.created_at).toBeDefined();
      expect(newCategory.updated_at).toBeDefined();
    });

    test('persists new category', async () => {
      await service.create({
        name: 'Transportation',
        type: 'bill',
        color: '#f59e0b',
        sort_order: 20,
        is_predefined: false,
      });

      const categories = await service.getAll();
      const found = categories.find((c) => c.name === 'Transportation');
      expect(found).toBeDefined();
    });

    test('auto-calculates sort_order when not provided', async () => {
      const newCategory = await service.create({
        name: 'Food',
        type: 'bill',
        color: '#84cc16',
        is_predefined: false,
      } as Omit<Category, 'created_at' | 'updated_at' | 'id'>);

      // Should be greater than existing bill categories sort_order
      expect(newCategory.sort_order).toBeGreaterThan(1);
    });

    test('throws error for invalid data', async () => {
      await expect(
        service.create({
          name: '', // Invalid - empty name
          type: 'bill',
          color: '#000000',
          sort_order: 0,
          is_predefined: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    test('updates existing category', async () => {
      const updated = await service.update('cat-utilities-002', {
        name: 'Utilities & Services',
        color: '#06b6d4',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Utilities & Services');
      expect(updated?.color).toBe('#06b6d4');
      expect(updated?.updated_at).not.toBe('2025-01-01T00:00:00.000Z');
    });

    test('returns null for non-existent category', async () => {
      const result = await service.update('non-existent-id', { name: 'Test' });
      expect(result).toBeNull();
    });

    test('prevents modification of Variable Expenses category by ID', async () => {
      // First ensure the variable expenses category exists
      await service.ensureVariableExpensesCategory();

      await expect(
        service.update(VARIABLE_EXPENSES_CATEGORY_ID, { name: 'Renamed' })
      ).rejects.toThrow('Cannot modify the Variable Expenses category');
    });

    test('prevents modification of Variable Expenses category by type', async () => {
      // Create a variable category with different ID
      await writeFile(
        join(testDir, 'entities', 'categories.json'),
        JSON.stringify([
          ...sampleCategories,
          {
            id: 'different-variable-id',
            name: 'Variable Expenses',
            type: 'variable',
            color: '#f59e0b',
            sort_order: 9999,
            is_predefined: true,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ])
      );
      service = new CategoriesServiceImpl();

      await expect(service.update('different-variable-id', { name: 'Renamed' })).rejects.toThrow(
        'Cannot modify the Variable Expenses category'
      );
    });
  });

  describe('delete', () => {
    test('deletes non-predefined category', async () => {
      await service.delete('cat-utilities-002');
      const category = await service.getById('cat-utilities-002');
      expect(category).toBeNull();
    });

    test('prevents deletion of predefined category', async () => {
      await expect(service.delete('cat-housing-001')).rejects.toThrow(
        'Cannot delete predefined category'
      );
    });

    test('prevents deletion of Variable Expenses category by ID', async () => {
      await service.ensureVariableExpensesCategory();

      await expect(service.delete(VARIABLE_EXPENSES_CATEGORY_ID)).rejects.toThrow(
        'Cannot delete the Variable Expenses category'
      );
    });

    test('prevents deletion of Variable Expenses category by type', async () => {
      await writeFile(
        join(testDir, 'entities', 'categories.json'),
        JSON.stringify([
          ...sampleCategories,
          {
            id: 'another-variable-id',
            name: 'Variable Expenses',
            type: 'variable',
            color: '#f59e0b',
            sort_order: 9999,
            is_predefined: false, // Even if not predefined
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ])
      );
      service = new CategoriesServiceImpl();

      await expect(service.delete('another-variable-id')).rejects.toThrow(
        'Cannot delete the Variable Expenses category'
      );
    });
  });

  describe('reorder', () => {
    test('reorders categories by type', async () => {
      // Add more bill categories for testing
      await service.create({
        name: 'Insurance',
        type: 'bill',
        color: '#ef4444',
        sort_order: 2,
        is_predefined: false,
      });

      const initialBills = await service.getByType('bill');
      const reversedIds = [...initialBills].reverse().map((c) => c.id);

      const reordered = await service.reorder('bill', reversedIds);

      // Verify sort_order updated
      reordered.forEach((cat, index) => {
        expect(cat.sort_order).toBe(index);
      });
    });

    test('only reorders categories of specified type', async () => {
      const initialIncomes = await service.getByType('income');
      const incomeOrders = initialIncomes.map((c) => c.sort_order);

      // Reorder bills
      const bills = await service.getByType('bill');
      await service.reorder('bill', bills.map((c) => c.id).reverse());

      // Income order should be unchanged
      const afterIncomes = await service.getByType('income');
      afterIncomes.forEach((inc, i) => {
        expect(inc.sort_order).toBe(incomeOrders[i]);
      });
    });
  });

  describe('ensurePayoffCategory', () => {
    test('creates payoff category if not exists', async () => {
      const payoff = await service.ensurePayoffCategory();
      expect(payoff.name).toBe('Credit Card Payoffs');
      expect(payoff.type).toBe('bill');
      expect(payoff.sort_order).toBe(-1); // Appears first
      expect(payoff.is_predefined).toBe(true);
    });

    test('returns existing payoff category if exists', async () => {
      const first = await service.ensurePayoffCategory();
      const second = await service.ensurePayoffCategory();
      expect(first.id).toBe(second.id);
    });
  });

  describe('ensureVariableExpensesCategory', () => {
    test('creates variable expenses category if not exists', async () => {
      // Start with no variable category
      await writeFile(
        join(testDir, 'entities', 'categories.json'),
        JSON.stringify(sampleCategories)
      );
      service = new CategoriesServiceImpl();

      const variable = await service.ensureVariableExpensesCategory();
      expect(variable.name).toBe('Variable Expenses');
      expect(variable.type).toBe('variable');
      expect(variable.sort_order).toBe(9999); // Appears last
      expect(variable.is_predefined).toBe(true);
      expect(variable.id).toBe(VARIABLE_EXPENSES_CATEGORY_ID);
    });

    test('returns existing variable category if exists', async () => {
      const first = await service.ensureVariableExpensesCategory();
      const second = await service.ensureVariableExpensesCategory();
      expect(first.id).toBe(second.id);
    });
  });

  describe('validate', () => {
    test('returns valid for correct data', () => {
      const result = service.validate({
        name: 'Test Category',
        type: 'bill',
        color: '#000000',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns invalid for missing name', () => {
      const result = service.validate({
        type: 'bill',
        color: '#000000',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns valid when type is missing (optional in validation)', () => {
      const result = service.validate({
        name: 'Test',
        color: '#000000',
      });
      // Type is optional in validation - only validated if provided
      expect(result.isValid).toBe(true);
    });

    test('returns valid when color is missing (optional in validation)', () => {
      const result = service.validate({
        name: 'Test',
        type: 'bill',
      });
      // Color is optional in validation - only validated if provided
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for invalid type', () => {
      const result = service.validate({
        name: 'Test',
        type: 'invalid' as 'bill',
        color: '#000000',
      });
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for invalid color format', () => {
      const result = service.validate({
        name: 'Test',
        type: 'bill',
        color: 'not-a-color',
      });
      expect(result.isValid).toBe(false);
    });
  });
});
