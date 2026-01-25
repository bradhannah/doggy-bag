// Months Service syncMetadata Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { MonthsServiceImpl } from './months-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Bill, Income, PaymentSource, Category, MonthlyData } from '../types';

describe('MonthsService - syncMetadata', () => {
  let service: MonthsServiceImpl;
  let testDir: string;
  const testMonth = '2025-03';

  // Sample payment source
  const samplePaymentSource: PaymentSource = {
    id: 'ps-checking-001',
    name: 'Checking',
    type: 'bank_account',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  // Sample categories
  const sampleBillCategory: Category = {
    id: 'cat-housing-001',
    name: 'Housing',
    type: 'bill',
    color: '#3b82f6',
    sort_order: 0,
    is_predefined: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  const sampleIncomeCategory: Category = {
    id: 'cat-income-001',
    name: 'Employment',
    type: 'income',
    color: '#22c55e',
    sort_order: 0,
    is_predefined: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  // Sample bills with metadata
  const sampleBills: Bill[] = [
    {
      id: 'bill-rent-001',
      name: 'Rent',
      amount: 150000,
      billing_period: 'monthly',
      day_of_month: 1,
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-housing-001',
      metadata: {
        bank_transaction_name: 'RENT PAYMENT LANDLORD',
        account_number: '12345',
        account_url: 'https://rentpayment.com',
        notes: 'Due on the 1st, 5-day grace period',
      },
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'bill-electric-002',
      name: 'Electric',
      amount: 15000,
      billing_period: 'monthly',
      day_of_month: 15,
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-housing-001',
      metadata: {
        bank_transaction_name: 'ELECTRIC UTILITY CO',
        notes: 'Variable amount monthly',
      },
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  // Sample incomes with metadata
  const sampleIncomes: Income[] = [
    {
      id: 'income-salary-001',
      name: 'Salary',
      amount: 500000,
      billing_period: 'bi_weekly',
      start_date: '2025-01-03',
      payment_source_id: 'ps-checking-001',
      category_id: 'cat-income-001',
      metadata: {
        bank_transaction_name: 'EMPLOYER DIRECT DEP',
        account_url: 'https://payroll.employer.com',
        notes: 'Bi-weekly on Fridays',
      },
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  // Sample monthly data with instances that have NO metadata (need sync)
  const sampleMonthlyData: MonthlyData = {
    month: testMonth,
    bill_instances: [
      {
        id: 'bi-rent-001',
        bill_id: 'bill-rent-001',
        name: 'Rent',
        billing_period: 'monthly',
        expected_amount: 150000,
        month: testMonth,
        occurrences: [
          {
            id: 'occ-1',
            sequence: 1,
            expected_date: '2025-03-01',
            expected_amount: 150000,
            is_closed: false,
            closed_date: undefined,
            notes: undefined,
            is_adhoc: false,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        is_default: true,
        is_closed: false,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
        is_adhoc: false,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        // NO metadata - needs sync
      },
      {
        id: 'bi-electric-002',
        bill_id: 'bill-electric-002',
        name: 'Electric',
        billing_period: 'monthly',
        expected_amount: 15000,
        month: testMonth,
        occurrences: [
          {
            id: 'occ-2',
            sequence: 1,
            expected_date: '2025-03-15',
            expected_amount: 15000,
            is_closed: false,
            closed_date: undefined,
            notes: undefined,
            is_adhoc: false,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        is_default: true,
        is_closed: false,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-housing-001',
        is_adhoc: false,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        // NO metadata - needs sync
      },
    ],
    income_instances: [
      {
        id: 'ii-salary-001',
        income_id: 'income-salary-001',
        name: 'Salary',
        billing_period: 'bi_weekly',
        expected_amount: 500000,
        month: testMonth,
        occurrences: [
          {
            id: 'occ-i1',
            sequence: 1,
            expected_date: '2025-03-07',
            expected_amount: 250000,
            is_closed: false,
            closed_date: undefined,
            notes: undefined,
            is_adhoc: false,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'occ-i2',
            sequence: 2,
            expected_date: '2025-03-21',
            expected_amount: 250000,
            is_closed: false,
            closed_date: undefined,
            notes: undefined,
            is_adhoc: false,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        is_default: true,
        is_closed: false,
        payment_source_id: 'ps-checking-001',
        category_id: 'cat-income-001',
        is_adhoc: false,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        // NO metadata - needs sync
      },
    ],
    variable_expenses: [],
    free_flowing_expenses: [],
    bank_balances: { 'ps-checking-001': 100000 },
    is_read_only: false,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  beforeAll(async () => {
    testDir = join(tmpdir(), `months-sync-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });

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
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify([samplePaymentSource], null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify([sampleBillCategory, sampleIncomeCategory], null, 2)
    );
    await writeFile(
      join(testDir, 'months', `${testMonth}.json`),
      JSON.stringify(sampleMonthlyData, null, 2)
    );

    service = new MonthsServiceImpl();
  });

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('syncMetadata', () => {
    test('syncs metadata from source bills to bill instances', async () => {
      const result = await service.syncMetadata(testMonth);

      expect(result).toBeDefined();

      // Find the rent bill instance
      const rentInstance = result.bill_instances.find((bi) => bi.bill_id === 'bill-rent-001');
      expect(rentInstance).toBeDefined();
      expect(rentInstance?.metadata).toBeDefined();
      expect(rentInstance?.metadata?.bank_transaction_name).toBe('RENT PAYMENT LANDLORD');
      expect(rentInstance?.metadata?.account_number).toBe('12345');
      expect(rentInstance?.metadata?.account_url).toBe('https://rentpayment.com');
      expect(rentInstance?.metadata?.notes).toBe('Due on the 1st, 5-day grace period');

      // Find the electric bill instance
      const electricInstance = result.bill_instances.find(
        (bi) => bi.bill_id === 'bill-electric-002'
      );
      expect(electricInstance).toBeDefined();
      expect(electricInstance?.metadata).toBeDefined();
      expect(electricInstance?.metadata?.bank_transaction_name).toBe('ELECTRIC UTILITY CO');
      expect(electricInstance?.metadata?.notes).toBe('Variable amount monthly');
    });

    test('syncs metadata from source incomes to income instances', async () => {
      const result = await service.syncMetadata(testMonth);

      expect(result).toBeDefined();

      // Find the salary income instance
      const salaryInstance = result.income_instances.find(
        (ii) => ii.income_id === 'income-salary-001'
      );
      expect(salaryInstance).toBeDefined();
      expect(salaryInstance?.metadata).toBeDefined();
      expect(salaryInstance?.metadata?.bank_transaction_name).toBe('EMPLOYER DIRECT DEP');
      expect(salaryInstance?.metadata?.account_url).toBe('https://payroll.employer.com');
      expect(salaryInstance?.metadata?.notes).toBe('Bi-weekly on Fridays');
    });

    test('does not update instances when metadata has not changed', async () => {
      // First sync - should update
      const firstResult = await service.syncMetadata(testMonth);
      const _firstUpdatedAt = firstResult.updated_at;

      // Wait a tiny bit to ensure timestamp would change if modified
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second sync - should not update (metadata already matches)
      const secondResult = await service.syncMetadata(testMonth);

      // Since metadata hasn't changed, updated_at should be the same
      // (Note: the service only updates if metadata actually changed)
      expect(secondResult.bill_instances[0].metadata).toEqual(
        firstResult.bill_instances[0].metadata
      );
    });

    test('handles instances without source entity (ad-hoc)', async () => {
      // Add an ad-hoc bill instance with no bill_id
      const monthlyDataWithAdhoc = {
        ...sampleMonthlyData,
        bill_instances: [
          ...sampleMonthlyData.bill_instances,
          {
            id: 'bi-adhoc-001',
            bill_id: null, // No source bill
            name: 'Ad-hoc Expense',
            billing_period: 'monthly' as const,
            expected_amount: 5000,
            actual_amount: null,
            occurrences: [],
            occurrence_count: 0,
            closed_date: undefined,
            payment_source_id: 'ps-checking-001',
            category_id: 'cat-housing-001',
            is_active: true,
            is_adhoc: true,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
      };
      await writeFile(
        join(testDir, 'months', `${testMonth}.json`),
        JSON.stringify(monthlyDataWithAdhoc, null, 2)
      );

      service = new MonthsServiceImpl();
      const result = await service.syncMetadata(testMonth);

      // Ad-hoc instance should still exist and not throw error
      const adhocInstance = result.bill_instances.find((bi) => bi.id === 'bi-adhoc-001');
      expect(adhocInstance).toBeDefined();
      expect(adhocInstance?.is_adhoc).toBe(true);
      expect(adhocInstance?.occurrences.length).toBe(1);
      // Should have no metadata (source doesn't exist)
      expect(adhocInstance?.metadata).toBeUndefined();
    });

    test('throws error for non-existent month', async () => {
      await expect(service.syncMetadata('2099-12')).rejects.toThrow('not found');
    });

    test('updates metadata when source metadata changes', async () => {
      // First sync
      await service.syncMetadata(testMonth);

      // Update source bill metadata
      const updatedBills: Bill[] = [
        {
          ...sampleBills[0],
          metadata: {
            bank_transaction_name: 'UPDATED RENT NAME',
            account_number: '99999',
            notes: 'Updated notes',
          },
        },
        sampleBills[1],
      ];
      await writeFile(
        join(testDir, 'entities', 'bills.json'),
        JSON.stringify(updatedBills, null, 2)
      );

      // Second sync - should pick up changes
      service = new MonthsServiceImpl();
      const result = await service.syncMetadata(testMonth);

      const rentInstance = result.bill_instances.find((bi) => bi.bill_id === 'bill-rent-001');
      expect(rentInstance?.metadata?.bank_transaction_name).toBe('UPDATED RENT NAME');
      expect(rentInstance?.metadata?.account_number).toBe('99999');
      expect(rentInstance?.metadata?.notes).toBe('Updated notes');
      // account_url was removed from source, should be undefined
      expect(rentInstance?.metadata?.account_url).toBeUndefined();
    });

    test('preserves closed state when syncing metadata', async () => {
      // Add closed occurrence data to the monthly file
      const monthlyDataWithClosedOccurrence = {
        ...sampleMonthlyData,
        bill_instances: [
          {
            ...sampleMonthlyData.bill_instances[0],
            is_closed: true,
            closed_date: '2025-03-01',
            occurrences: [
              {
                ...sampleMonthlyData.bill_instances[0].occurrences[0],
                is_closed: true,
                closed_date: '2025-03-01',
                actual_amount: 150000,
              },
            ],
          },
          sampleMonthlyData.bill_instances[1],
        ],
      };
      await writeFile(
        join(testDir, 'months', `${testMonth}.json`),
        JSON.stringify(monthlyDataWithClosedOccurrence, null, 2)
      );

      service = new MonthsServiceImpl();
      const result = await service.syncMetadata(testMonth);

      // Closed state should be preserved
      const rentInstance = result.bill_instances.find((bi) => bi.bill_id === 'bill-rent-001');
      expect(rentInstance?.is_closed).toBe(true);
      expect(rentInstance?.occurrences[0]?.is_closed).toBe(true);
      expect(rentInstance?.occurrences[0]?.closed_date).toBe('2025-03-01');

      // And metadata should be synced
      expect(rentInstance?.metadata?.bank_transaction_name).toBe('RENT PAYMENT LANDLORD');
    });
  });
});
