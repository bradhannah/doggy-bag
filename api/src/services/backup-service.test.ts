// Backup Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { BackupServiceImpl } from './backup-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BackupFileData, Bill, Income, PaymentSource, Category, MonthlyData } from '../types';

describe('BackupService', () => {
  let service: BackupServiceImpl;
  let testDir: string;

  // Sample entity data with proper literal types
  const sampleBills: Bill[] = [
    {
      id: 'bill-001',
      name: 'Rent',
      amount: 150000,
      billing_period: 'monthly',
      day_of_month: 1,
      payment_source_id: 'ps-001',
      category_id: 'cat-001',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const sampleIncomes: Income[] = [
    {
      id: 'income-001',
      name: 'Salary',
      amount: 500000,
      billing_period: 'monthly',
      day_of_month: 15,
      payment_source_id: 'ps-001',
      category_id: 'cat-income-001',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const samplePaymentSources: PaymentSource[] = [
    {
      id: 'ps-001',
      name: 'Checking',
      type: 'bank_account',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const sampleCategories: Category[] = [
    {
      id: 'cat-001',
      name: 'Housing',
      type: 'bill',
      color: '#3b82f6',
      sort_order: 0,
      is_predefined: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const sampleMonths: MonthlyData[] = [
    {
      month: '2025-01',
      bill_instances: [],
      income_instances: [],
      variable_expenses: [],
      free_flowing_expenses: [],
      bank_balances: { 'ps-001': 350000 },
      is_read_only: false,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-15T00:00:00.000Z',
    },
    {
      month: '2025-02',
      bill_instances: [],
      income_instances: [],
      variable_expenses: [],
      free_flowing_expenses: [],
      bank_balances: {},
      is_read_only: false,
      created_at: '2025-02-01T00:00:00.000Z',
      updated_at: '2025-02-01T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    testDir = join(tmpdir(), `backup-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });
    await mkdir(join(testDir, 'backups'), { recursive: true });

    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset entity files
    await writeFile(join(testDir, 'entities', 'bills.json'), JSON.stringify(sampleBills, null, 2));
    await writeFile(
      join(testDir, 'entities', 'incomes.json'),
      JSON.stringify(sampleIncomes, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify(samplePaymentSources, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify(sampleCategories, null, 2)
    );

    // Reset month files
    // Clear existing months first
    try {
      const files = await readdir(join(testDir, 'months'));
      for (const file of files) {
        await rm(join(testDir, 'months', file), { force: true });
      }
    } catch {
      // Ignore if directory doesn't exist
    }

    // Write sample month files
    for (const month of sampleMonths) {
      await writeFile(
        join(testDir, 'months', `${month.month}.json`),
        JSON.stringify(month, null, 2)
      );
    }

    // Create fresh service instance
    service = new BackupServiceImpl();
  });

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ==========================================================================
  // exportBackup
  // ==========================================================================

  describe('exportBackup', () => {
    test('exports all entities and months', async () => {
      const backup = await service.exportBackup();

      expect(backup.export_date).toBeDefined();
      expect(backup.bills).toHaveLength(1);
      expect(backup.bills[0].id).toBe('bill-001');
      expect(backup.incomes).toHaveLength(1);
      expect(backup.incomes[0].id).toBe('income-001');
      expect(backup.payment_sources).toHaveLength(1);
      expect(backup.payment_sources[0].id).toBe('ps-001');
      expect(backup.categories).toHaveLength(1);
      expect(backup.categories[0].id).toBe('cat-001');
      expect(backup.months).toHaveLength(2);
    });

    test('exports months with correct data', async () => {
      const backup = await service.exportBackup();

      const jan = backup.months.find((m) => m.month === '2025-01');
      const feb = backup.months.find((m) => m.month === '2025-02');

      expect(jan).toBeDefined();
      expect(jan!.bank_balances['ps-001']).toBe(350000);
      expect(feb).toBeDefined();
    });

    test('exports valid ISO date for export_date', async () => {
      const backup = await service.exportBackup();

      // Should be a valid ISO string
      const parsed = new Date(backup.export_date);
      expect(parsed.getTime()).not.toBeNaN();
    });

    test('writes backup file to data directory', async () => {
      await service.exportBackup();

      const backupFile = await readFile(join(testDir, 'doggybag-backup.json'), 'utf-8');
      const parsed = JSON.parse(backupFile);
      expect(parsed.export_date).toBeDefined();
      expect(parsed.bills).toHaveLength(1);
    });

    test('exports empty arrays when no data exists', async () => {
      // Clear all entities
      await writeFile(join(testDir, 'entities', 'bills.json'), '[]');
      await writeFile(join(testDir, 'entities', 'incomes.json'), '[]');
      await writeFile(join(testDir, 'entities', 'payment-sources.json'), '[]');
      await writeFile(join(testDir, 'entities', 'categories.json'), '[]');

      // Clear months
      const files = await readdir(join(testDir, 'months'));
      for (const file of files) {
        await rm(join(testDir, 'months', file), { force: true });
      }

      const backup = await service.exportBackup();
      expect(backup.bills).toEqual([]);
      expect(backup.incomes).toEqual([]);
      expect(backup.payment_sources).toEqual([]);
      expect(backup.categories).toEqual([]);
      expect(backup.months).toEqual([]);
    });
  });

  // ==========================================================================
  // importBackup
  // ==========================================================================

  describe('importBackup', () => {
    test('restores entities and months from backup', async () => {
      const backupData: BackupFileData = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: [
          {
            ...sampleBills[0],
            id: 'restored-bill-001',
            name: 'Restored Bill',
          },
        ],
        incomes: [
          {
            ...sampleIncomes[0],
            id: 'restored-income-001',
            name: 'Restored Income',
          },
        ],
        payment_sources: samplePaymentSources,
        categories: sampleCategories,
        months: [
          {
            month: '2025-03',
            bill_instances: [],
            income_instances: [],
            variable_expenses: [],
            free_flowing_expenses: [],
            bank_balances: { 'ps-001': 200000 },
            is_read_only: false,
            created_at: '2025-03-01T00:00:00.000Z',
            updated_at: '2025-03-01T00:00:00.000Z',
          },
        ],
      };

      await service.importBackup(backupData);

      // Verify entities were restored
      const storage = StorageServiceImpl.getInstance();
      const bills = await storage.readJSON<unknown[]>('data/entities/bills.json');
      expect(bills).toHaveLength(1);
      expect((bills![0] as { id: string }).id).toBe('restored-bill-001');

      const incomes = await storage.readJSON<unknown[]>('data/entities/incomes.json');
      expect(incomes).toHaveLength(1);
      expect((incomes![0] as { id: string }).id).toBe('restored-income-001');

      // Verify month was restored
      const monthData = await storage.readJSON<{
        month: string;
        bank_balances: Record<string, number>;
      }>('data/months/2025-03.json');
      expect(monthData).not.toBeNull();
      expect(monthData!.month).toBe('2025-03');
      expect(monthData!.bank_balances['ps-001']).toBe(200000);
    });

    test('handles empty months array gracefully', async () => {
      const backupData: BackupFileData = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: sampleBills,
        incomes: sampleIncomes,
        payment_sources: samplePaymentSources,
        categories: sampleCategories,
        months: [],
      };

      // Should not throw
      await service.importBackup(backupData);

      // Entities should still be restored
      const storage = StorageServiceImpl.getInstance();
      const bills = await storage.readJSON<unknown[]>('data/entities/bills.json');
      expect(bills).toHaveLength(1);
    });

    test('handles missing months property (backward compat)', async () => {
      // Simulate an old backup without months property
      const backupData = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: sampleBills,
        incomes: sampleIncomes,
        payment_sources: samplePaymentSources,
        categories: sampleCategories,
      } as unknown as BackupFileData;

      // Should not throw
      await service.importBackup(backupData);

      // Entities should still be restored
      const storage = StorageServiceImpl.getInstance();
      const bills = await storage.readJSON<unknown[]>('data/entities/bills.json');
      expect(bills).toHaveLength(1);
    });

    test('restores multiple months', async () => {
      const backupData: BackupFileData = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: sampleBills,
        incomes: sampleIncomes,
        payment_sources: samplePaymentSources,
        categories: sampleCategories,
        months: sampleMonths,
      };

      await service.importBackup(backupData);

      const storage = StorageServiceImpl.getInstance();
      const jan = await storage.readJSON<{ month: string }>('data/months/2025-01.json');
      const feb = await storage.readJSON<{ month: string }>('data/months/2025-02.json');
      expect(jan).not.toBeNull();
      expect(jan!.month).toBe('2025-01');
      expect(feb).not.toBeNull();
      expect(feb!.month).toBe('2025-02');
    });

    test('throws on invalid backup data', async () => {
      const invalidData = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: 'not-an-array',
        incomes: [],
        payment_sources: [],
        categories: [],
        months: [],
      } as unknown as BackupFileData;

      await expect(service.importBackup(invalidData)).rejects.toThrow('Invalid backup data');
    });
  });

  // ==========================================================================
  // validateBackup
  // ==========================================================================

  describe('validateBackup', () => {
    test('passes valid backup data', () => {
      const validData: BackupFileData = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: sampleBills,
        incomes: sampleIncomes,
        payment_sources: samplePaymentSources,
        categories: sampleCategories,
        months: sampleMonths,
      };

      const result = service.validateBackup(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('passes valid backup data with empty arrays', () => {
      const validData: BackupFileData = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: [],
        incomes: [],
        payment_sources: [],
        categories: [],
        months: [],
      };

      const result = service.validateBackup(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails when export_date is missing', () => {
      const data = {
        bills: [],
        incomes: [],
        payment_sources: [],
        categories: [],
        months: [],
      } as unknown as BackupFileData;

      const result = service.validateBackup(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('export_date is required');
    });

    test('fails when bills is not an array', () => {
      const data = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: 'invalid',
        incomes: [],
        payment_sources: [],
        categories: [],
        months: [],
      } as unknown as BackupFileData;

      const result = service.validateBackup(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('bills must be an array');
    });

    test('fails when incomes is not an array', () => {
      const data = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: [],
        incomes: 42,
        payment_sources: [],
        categories: [],
        months: [],
      } as unknown as BackupFileData;

      const result = service.validateBackup(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('incomes must be an array');
    });

    test('fails when payment_sources is not an array', () => {
      const data = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: [],
        incomes: [],
        payment_sources: {},
        categories: [],
        months: [],
      } as unknown as BackupFileData;

      const result = service.validateBackup(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('payment_sources must be an array');
    });

    test('fails when categories is not an array', () => {
      const data = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: [],
        incomes: [],
        payment_sources: [],
        categories: null,
        months: [],
      } as unknown as BackupFileData;

      const result = service.validateBackup(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('categories must be an array');
    });

    test('fails when months is defined but not an array', () => {
      const data = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: [],
        incomes: [],
        payment_sources: [],
        categories: [],
        months: 'not-an-array',
      } as unknown as BackupFileData;

      const result = service.validateBackup(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('months must be an array if provided');
    });

    test('passes when months is undefined (backward compat)', () => {
      const data = {
        export_date: '2025-06-01T00:00:00.000Z',
        bills: [],
        incomes: [],
        payment_sources: [],
        categories: [],
      } as unknown as BackupFileData;

      // months is undefined — should still be valid
      const result = service.validateBackup(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('collects multiple errors', () => {
      const data = {
        // missing export_date
        bills: 'invalid',
        incomes: 'invalid',
        payment_sources: 'invalid',
        categories: 'invalid',
        months: 'invalid',
      } as unknown as BackupFileData;

      const result = service.validateBackup(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(6); // export_date + 4 entities + months
    });
  });
});
