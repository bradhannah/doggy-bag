// Bills Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { BillsServiceImpl } from './bills-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Bill, PaymentSource, Category } from '../types';

describe('BillsService', () => {
  let service: BillsServiceImpl;
  let testDir: string;

  // Sample payment source for bills
  const samplePaymentSource: PaymentSource = {
    id: 'ps-checking-001',
    name: 'Checking',
    type: 'bank_account',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  // Sample category for bills
  const sampleCategory: Category = {
    id: 'cat-housing-001',
    name: 'Housing',
    type: 'bill',
    color: '#3b82f6',
    sort_order: 0,
    is_predefined: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  // Sample bills for testing
  const sampleBills: Bill[] = [
    {
      id: 'bill-rent-001',
      name: 'Rent',
      amount: 150000, // $1,500.00
      billing_period: 'monthly',
      day_of_month: 1,
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-housing-001',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'bill-electric-002',
      name: 'Electric',
      amount: 15000, // $150.00
      billing_period: 'monthly',
      day_of_month: 15,
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-housing-001',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'bill-inactive-003',
      name: 'Old Gym',
      amount: 5000, // $50.00
      billing_period: 'monthly',
      day_of_month: 20,
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-housing-001',
      is_active: false, // Inactive bill
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `bills-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset files before each test
    await writeFile(join(testDir, 'entities', 'bills.json'), JSON.stringify(sampleBills, null, 2));
    await writeFile(
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify([samplePaymentSource], null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify([sampleCategory], null, 2)
    );
    // Create new service instance
    service = new BillsServiceImpl();
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
    test('returns all bills', async () => {
      const bills = await service.getAll();
      expect(bills.length).toBe(3);
    });

    test('returns empty array when no bills exist', async () => {
      await writeFile(join(testDir, 'entities', 'bills.json'), '[]');
      service = new BillsServiceImpl();
      const bills = await service.getAll();
      expect(bills).toEqual([]);
    });

    test('returns bills with correct structure', async () => {
      const bills = await service.getAll();
      const rent = bills.find((b) => b.name === 'Rent');
      expect(rent).toBeDefined();
      expect(rent?.amount).toBe(150000);
      expect(rent?.billing_period).toBe('monthly');
      expect(rent?.payment_source_id).toBe('ps-checking-001');
    });
  });

  describe('getById', () => {
    test('returns bill when found', async () => {
      const bill = await service.getById('bill-rent-001');
      expect(bill).not.toBeNull();
      expect(bill?.name).toBe('Rent');
      expect(bill?.amount).toBe(150000);
    });

    test('returns null when not found', async () => {
      const bill = await service.getById('non-existent-id');
      expect(bill).toBeNull();
    });
  });

  describe('create', () => {
    test('creates new bill with generated id', async () => {
      const newBill = await service.create({
        name: 'Internet',
        amount: 7500,
        billing_period: 'monthly',
        day_of_month: 5,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });

      expect(newBill.id).toBeDefined();
      expect(newBill.name).toBe('Internet');
      expect(newBill.amount).toBe(7500);
      expect(newBill.is_active).toBe(true);
      expect(newBill.created_at).toBeDefined();
      expect(newBill.updated_at).toBeDefined();
    });

    test('persists new bill', async () => {
      await service.create({
        name: 'Phone',
        amount: 8500,
        billing_period: 'monthly',
        day_of_month: 10,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });

      const bills = await service.getAll();
      const found = bills.find((b) => b.name === 'Phone');
      expect(found).toBeDefined();
      expect(found?.amount).toBe(8500);
    });

    test('creates bill with bi-weekly period', async () => {
      const newBill = await service.create({
        name: 'Bi-weekly Expense',
        amount: 5000,
        billing_period: 'bi_weekly',
        start_date: '2025-01-03',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });

      expect(newBill.billing_period).toBe('bi_weekly');
      expect(newBill.start_date).toBe('2025-01-03');
    });

    test('creates bill with category', async () => {
      const newBill = await service.create({
        name: 'Insurance',
        amount: 12000,
        billing_period: 'monthly',
        day_of_month: 1,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });

      expect(newBill.category_id).toBe('cat-housing-001');
    });

    test('throws error for invalid data - missing name', async () => {
      await expect(
        service.create({
          name: '',
          amount: 5000,
          billing_period: 'monthly',
          day_of_month: 1,
          payment_source_id: 'ps-checking-001',
          category_id: 'cat-housing-001',
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
          category_id: 'cat-housing-001',
        })
      ).rejects.toThrow();
    });

    test('throws error for invalid billing period', async () => {
      await expect(
        service.create({
          name: 'Test',
          amount: 5000,
          billing_period: 'invalid' as 'monthly',
          day_of_month: 1,
          payment_source_id: 'ps-checking-001',
          category_id: 'cat-housing-001',
        })
      ).rejects.toThrow();
    });

    test('throws error for missing category_id', async () => {
      await expect(
        service.create({
          name: 'Test',
          amount: 5000,
          billing_period: 'monthly',
          day_of_month: 1,
          payment_source_id: 'ps-checking-001',
          category_id: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    test('updates existing bill', async () => {
      const updated = await service.update('bill-rent-001', {
        amount: 160000, // Rent increase
      });

      expect(updated).not.toBeNull();
      expect(updated?.amount).toBe(160000);
      expect(updated?.name).toBe('Rent'); // Unchanged
      expect(updated?.updated_at).not.toBe('2025-01-01T00:00:00.000Z');
    });

    test('updates multiple fields', async () => {
      const updated = await service.update('bill-electric-002', {
        name: 'Electric & Gas',
        amount: 20000,
        day_of_month: 20,
      });

      expect(updated?.name).toBe('Electric & Gas');
      expect(updated?.amount).toBe(20000);
      expect(updated?.day_of_month).toBe(20);
    });

    test('returns null for non-existent bill', async () => {
      const result = await service.update('non-existent-id', { amount: 5000 });
      expect(result).toBeNull();
    });

    test('can deactivate a bill', async () => {
      const updated = await service.update('bill-rent-001', {
        is_active: false,
      });

      expect(updated?.is_active).toBe(false);
    });

    test('can reactivate a bill', async () => {
      const updated = await service.update('bill-inactive-003', {
        is_active: true,
      });

      expect(updated?.is_active).toBe(true);
    });
  });

  describe('delete', () => {
    test('deletes existing bill', async () => {
      await service.delete('bill-electric-002');
      const bill = await service.getById('bill-electric-002');
      expect(bill).toBeNull();
    });

    test('does not throw for non-existent bill', async () => {
      await expect(service.delete('non-existent-id')).resolves.toBeUndefined();
    });

    test('only deletes specified bill', async () => {
      const beforeCount = (await service.getAll()).length;
      await service.delete('bill-rent-001');
      const afterCount = (await service.getAll()).length;
      expect(afterCount).toBe(beforeCount - 1);

      // Other bills should still exist
      const electric = await service.getById('bill-electric-002');
      expect(electric).not.toBeNull();
    });
  });

  describe('validate', () => {
    test('returns valid for correct data', () => {
      const result = service.validate({
        name: 'Test Bill',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns invalid for missing name', () => {
      const result = service.validate({
        amount: 10000,
        billing_period: 'monthly',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for invalid amount', () => {
      const result = service.validate({
        name: 'Test',
        amount: -100,
        billing_period: 'monthly',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for invalid billing period', () => {
      const result = service.validate({
        name: 'Test',
        amount: 10000,
        billing_period: 'daily' as 'monthly',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });
      expect(result.isValid).toBe(false);
    });

    test('returns valid for weekly billing', () => {
      const result = service.validate({
        name: 'Weekly Bill',
        amount: 5000,
        billing_period: 'weekly',
        start_date: '2025-01-06',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });
      expect(result.isValid).toBe(true);
    });

    test('returns valid for semi_annually billing', () => {
      const result = service.validate({
        name: 'Insurance',
        amount: 60000,
        billing_period: 'semi_annually',
        start_date: '2025-01-15',
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });
      expect(result.isValid).toBe(true);
    });

    test('returns valid for payment_method auto', () => {
      const result = service.validate({
        name: 'Auto Pay Bill',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
        payment_method: 'auto',
      });
      expect(result.isValid).toBe(true);
    });

    test('returns valid for payment_method manual', () => {
      const result = service.validate({
        name: 'Manual Pay Bill',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
        payment_method: 'manual',
      });
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for invalid payment_method', () => {
      const result = service.validate({
        name: 'Invalid Method Bill',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
        payment_method: 'invalid' as 'auto',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("payment_method must be 'auto' or 'manual'");
    });

    test('returns valid when payment_method is undefined (optional field)', () => {
      const result = service.validate({
        name: 'No Payment Method',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
      });
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for missing category_id', () => {
      const result = service.validate({
        name: 'Test Bill',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'ps-checking-001',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category ID is required');
    });

    test('returns invalid for empty category_id', () => {
      const result = service.validate({
        name: 'Test Bill',
        amount: 10000,
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
