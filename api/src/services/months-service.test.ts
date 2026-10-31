// Months Service savings balance tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { MonthsServiceImpl } from './months-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Bill, Income, PaymentSource, Category, MonthlyData } from '../types';

describe('MonthsService - savings balances', () => {
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

  describe('pushSavingsBalancesToNextMonth', () => {
    test('keeps zero final balances distinct from cleared balances', async () => {
      await service.updateSavingsBalances(testMonth, undefined, { savings: 0 });
      expect((await service.getMonthlyData(testMonth))?.savings_balances_end).toEqual({
        savings: 0,
      });
      await service.updateSavingsBalances(testMonth, undefined, { savings: null });
      expect((await service.getMonthlyData(testMonth))?.savings_balances_end).toEqual({});
    });

    const destinationMonth = '2025-04';

    async function writeDestination(start: Record<string, number> = {}) {
      await writeFile(
        join(testDir, 'months', `${destinationMonth}.json`),
        JSON.stringify(
          {
            ...sampleMonthlyData,
            month: destinationMonth,
            savings_balances_start: start,
            savings_balances_end: { savings: 125000 },
          },
          null,
          2
        )
      );
    }

    test('pushes final balances without confirmation when destination starts are zero', async () => {
      await writeDestination({ savings: 0 });

      const result = await service.pushSavingsBalancesToNextMonth(testMonth, {
        savings: 120000,
        investment: 450000,
      });

      expect(result.requiresConfirmation).toBe(false);
      expect(result.destinationMonth).toBe(destinationMonth);
      expect(result.monthlyData?.savings_balances_start).toEqual({
        savings: 120000,
        investment: 450000,
      });
      expect(result.monthlyData?.savings_balances_end).toEqual({ savings: 125000 });
    });

    test('requires confirmation before overwriting a non-zero destination start', async () => {
      await writeDestination({ savings: 99999 });

      const preview = await service.pushSavingsBalancesToNextMonth(testMonth, { savings: 120000 });
      expect(preview.requiresConfirmation).toBe(true);
      expect((await service.getMonthlyData(destinationMonth))?.savings_balances_start).toEqual({
        savings: 99999,
      });

      const result = await service.pushSavingsBalancesToNextMonth(
        testMonth,
        { savings: 120000 },
        true
      );
      expect(result.requiresConfirmation).toBe(false);
      expect(result.monthlyData?.savings_balances_start).toEqual({ savings: 120000 });
    });

    test('handles December to January and rejects a missing destination month', async () => {
      await expect(
        service.pushSavingsBalancesToNextMonth('2025-12', { savings: 120000 })
      ).rejects.toThrow('Monthly data for 2026-01 not found');
    });

    test('does not overwrite a locked destination month', async () => {
      await writeDestination({ savings: 99999 });
      await service.toggleReadOnly(destinationMonth);
      await expect(
        service.pushSavingsBalancesToNextMonth(testMonth, { savings: 0 }, true)
      ).rejects.toThrow('read-only');
      expect((await service.getMonthlyData(destinationMonth))?.savings_balances_start).toEqual({
        savings: 99999,
      });
    });
  });
});
