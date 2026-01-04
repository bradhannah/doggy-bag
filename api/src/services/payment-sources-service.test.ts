// Payment Sources Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { PaymentSourcesServiceImpl } from './payment-sources-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PaymentSource } from '../types';

describe('PaymentSourcesService', () => {
  let service: PaymentSourcesServiceImpl;
  let testDir: string;

  // Sample payment sources for testing
  const samplePaymentSources: PaymentSource[] = [
    {
      id: 'ps-checking-001',
      name: 'Checking Account',
      type: 'bank_account',
      balance: 500000, // $5,000.00
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'ps-savings-002',
      name: 'Savings Account',
      type: 'bank_account',
      balance: 1000000, // $10,000.00
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'ps-creditcard-003',
      name: 'Visa',
      type: 'credit_card',
      balance: -50000, // -$500.00 (owed)
      is_active: true,
      pay_off_monthly: true,
      exclude_from_leftover: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'ps-inactive-004',
      name: 'Old Account',
      type: 'bank_account',
      balance: 0,
      is_active: false, // Inactive
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `payment-sources-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset files before each test
    await writeFile(
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify(samplePaymentSources, null, 2)
    );
    // Create new service instance
    service = new PaymentSourcesServiceImpl();
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
    test('returns all payment sources', async () => {
      const sources = await service.getAll();
      expect(sources.length).toBe(4);
    });

    test('returns empty array when no sources exist', async () => {
      await writeFile(join(testDir, 'entities', 'payment-sources.json'), '[]');
      service = new PaymentSourcesServiceImpl();
      const sources = await service.getAll();
      expect(sources).toEqual([]);
    });

    test('returns sources with correct structure', async () => {
      const sources = await service.getAll();
      const checking = sources.find((s) => s.name === 'Checking Account');
      expect(checking).toBeDefined();
      expect(checking?.type).toBe('bank_account');
      expect(checking?.balance).toBe(500000);
      expect(checking?.is_active).toBe(true);
    });

    test('includes sources with pay_off_monthly flag', async () => {
      const sources = await service.getAll();
      const visa = sources.find((s) => s.name === 'Visa');
      expect(visa?.pay_off_monthly).toBe(true);
      expect(visa?.exclude_from_leftover).toBe(true);
    });
  });

  describe('getById', () => {
    test('returns payment source when found', async () => {
      const source = await service.getById('ps-checking-001');
      expect(source).not.toBeNull();
      expect(source?.name).toBe('Checking Account');
      expect(source?.balance).toBe(500000);
    });

    test('returns null when not found', async () => {
      const source = await service.getById('non-existent-id');
      expect(source).toBeNull();
    });
  });

  describe('create', () => {
    test('creates new payment source with generated id', async () => {
      const newSource = await service.create({
        name: 'Emergency Fund',
        type: 'bank_account',
        balance: 200000,
      });

      expect(newSource.id).toBeDefined();
      expect(newSource.name).toBe('Emergency Fund');
      expect(newSource.type).toBe('bank_account');
      expect(newSource.balance).toBe(200000);
      expect(newSource.is_active).toBe(true);
      expect(newSource.created_at).toBeDefined();
      expect(newSource.updated_at).toBeDefined();
    });

    test('persists new payment source', async () => {
      await service.create({
        name: 'New Savings',
        type: 'bank_account',
        balance: 100000,
      });

      const sources = await service.getAll();
      const found = sources.find((s) => s.name === 'New Savings');
      expect(found).toBeDefined();
      expect(found?.balance).toBe(100000);
    });

    test('creates credit card with pay_off_monthly', async () => {
      const newSource = await service.create({
        name: 'Mastercard',
        type: 'credit_card',
        balance: -10000,
        pay_off_monthly: true,
      });

      expect(newSource.type).toBe('credit_card');
      expect(newSource.pay_off_monthly).toBe(true);
    });

    test('creates line of credit', async () => {
      const newSource = await service.create({
        name: 'Home Equity',
        type: 'line_of_credit',
        balance: -25000,
        exclude_from_leftover: true,
      });

      expect(newSource.type).toBe('line_of_credit');
      expect(newSource.exclude_from_leftover).toBe(true);
    });

    test('creates cash payment source', async () => {
      const newSource = await service.create({
        name: 'Petty Cash',
        type: 'cash',
        balance: 5000,
      });

      expect(newSource.type).toBe('cash');
      expect(newSource.balance).toBe(5000);
    });
  });

  describe('update', () => {
    test('updates existing payment source', async () => {
      const updated = await service.update('ps-checking-001', {
        balance: 600000,
      });

      expect(updated).not.toBeNull();
      expect(updated?.balance).toBe(600000);
      expect(updated?.name).toBe('Checking Account'); // Unchanged
      expect(updated?.updated_at).not.toBe('2025-01-01T00:00:00.000Z');
    });

    test('updates multiple fields', async () => {
      const updated = await service.update('ps-savings-002', {
        name: 'High-Yield Savings',
        balance: 1500000,
      });

      expect(updated?.name).toBe('High-Yield Savings');
      expect(updated?.balance).toBe(1500000);
    });

    test('returns null for non-existent source', async () => {
      const result = await service.update('non-existent-id', { balance: 100 });
      expect(result).toBeNull();
    });

    test('can deactivate a payment source', async () => {
      const updated = await service.update('ps-checking-001', {
        is_active: false,
      });

      expect(updated?.is_active).toBe(false);
    });

    test('can reactivate a payment source', async () => {
      const updated = await service.update('ps-inactive-004', {
        is_active: true,
      });

      expect(updated?.is_active).toBe(true);
    });

    test('can toggle pay_off_monthly', async () => {
      const updated = await service.update('ps-creditcard-003', {
        pay_off_monthly: false,
      });

      expect(updated?.pay_off_monthly).toBe(false);
    });
  });

  describe('delete', () => {
    test('deletes existing payment source', async () => {
      await service.delete('ps-savings-002');
      const source = await service.getById('ps-savings-002');
      expect(source).toBeNull();
    });

    test('does not throw for non-existent source', async () => {
      await expect(service.delete('non-existent-id')).resolves.toBeUndefined();
    });

    test('only deletes specified source', async () => {
      const beforeCount = (await service.getAll()).length;
      await service.delete('ps-checking-001');
      const afterCount = (await service.getAll()).length;
      expect(afterCount).toBe(beforeCount - 1);

      // Other sources should still exist
      const savings = await service.getById('ps-savings-002');
      expect(savings).not.toBeNull();
    });
  });

  describe('validate', () => {
    test('returns valid for bank account', () => {
      const result = service.validate({
        name: 'Test Account',
        type: 'bank_account',
        balance: 100000,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns valid for credit card', () => {
      const result = service.validate({
        name: 'Test Card',
        type: 'credit_card',
        balance: -5000,
      });
      expect(result.isValid).toBe(true);
    });

    test('returns valid for line of credit', () => {
      const result = service.validate({
        name: 'Test LOC',
        type: 'line_of_credit',
        balance: -10000,
      });
      expect(result.isValid).toBe(true);
    });

    test('returns valid for cash', () => {
      const result = service.validate({
        name: 'Cash',
        type: 'cash',
        balance: 500,
      });
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for missing name', () => {
      const result = service.validate({
        type: 'bank_account',
        balance: 100000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be blank or whitespace only');
    });

    test('returns invalid for empty name', () => {
      const result = service.validate({
        name: '   ',
        type: 'bank_account',
        balance: 100000,
      });
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for name exceeding 100 characters', () => {
      const result = service.validate({
        name: 'A'.repeat(101),
        type: 'bank_account',
        balance: 0,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot exceed 100 characters');
    });

    test('returns invalid for missing type', () => {
      const result = service.validate({
        name: 'Test',
        balance: 100000,
      });
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for invalid type', () => {
      const result = service.validate({
        name: 'Test',
        type: 'invalid' as 'bank_account',
        balance: 100000,
      });
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for pay_off_monthly on non-debt account', () => {
      const result = service.validate({
        name: 'Test',
        type: 'bank_account',
        balance: 100000,
        pay_off_monthly: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'pay_off_monthly can only be enabled for credit cards and lines of credit'
      );
    });

    test('returns valid for pay_off_monthly on credit card', () => {
      const result = service.validate({
        name: 'Test Card',
        type: 'credit_card',
        balance: -5000,
        pay_off_monthly: true,
      });
      expect(result.isValid).toBe(true);
    });

    test('returns valid for pay_off_monthly on line of credit', () => {
      const result = service.validate({
        name: 'Test LOC',
        type: 'line_of_credit',
        balance: -5000,
        pay_off_monthly: true,
      });
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for exclude_from_leftover on non-debt account', () => {
      const result = service.validate({
        name: 'Test',
        type: 'bank_account',
        balance: 100000,
        exclude_from_leftover: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'exclude_from_leftover can only be enabled for credit cards and lines of credit'
      );
    });

    test('returns valid for exclude_from_leftover on credit card', () => {
      const result = service.validate({
        name: 'Test Card',
        type: 'credit_card',
        balance: -5000,
        exclude_from_leftover: true,
      });
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for cash with pay_off_monthly', () => {
      const result = service.validate({
        name: 'Petty Cash',
        type: 'cash',
        balance: 500,
        pay_off_monthly: true,
      });
      expect(result.isValid).toBe(false);
    });
  });
});
