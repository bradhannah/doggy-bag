import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'bun:test';
import { MonthsServiceImpl } from './months-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { MonthlyData } from '../types';

describe('MonthsService - split occurrence', () => {
  let service: MonthsServiceImpl;
  let testDir: string;
  const testMonth = '2025-04';

  const sampleMonthlyData = {
    month: testMonth,
    bill_instances: [
      {
        id: 'bi-rent-001',
        bill_id: null,
        name: 'Rent',
        billing_period: 'monthly',
        expected_amount: 30000, // $300
        month: testMonth,
        occurrences: [
          {
            id: 'occ-b1',
            sequence: 1,
            expected_date: '2025-04-01',
            expected_amount: 30000, // $300
            is_closed: false,
            closed_date: undefined,
            notes: undefined,
            payment_source_id: undefined,
            is_adhoc: false,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        occurrence_count: 1,
        is_default: false,
        is_closed: false,
        payment_source_id: undefined,
        category_id: undefined,
        is_adhoc: false,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      },
    ],
    income_instances: [
      {
        id: 'ii-pay-001',
        income_id: null,
        name: 'Pay',
        billing_period: 'monthly',
        expected_amount: 50000, // $500
        month: testMonth,
        occurrences: [
          {
            id: 'occ-i1',
            sequence: 1,
            expected_date: '2025-04-02',
            expected_amount: 50000, // $500
            is_closed: false,
            closed_date: undefined,
            notes: undefined,
            payment_source_id: undefined,
            is_adhoc: false,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        occurrence_count: 1,
        is_default: false,
        is_closed: false,
        payment_source_id: undefined,
        category_id: undefined,
        is_adhoc: false,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      },
    ],
    variable_expenses: [],
    free_flowing_expenses: [],
    bank_balances: {},
    is_read_only: false,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  } as unknown as MonthlyData;

  beforeAll(async () => {
    testDir = join(tmpdir(), `months-split-occ-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });

    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
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

  describe('splitBillOccurrence', () => {
    test('splits bill occurrence correctly', async () => {
      const result = await service.splitBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
        paid_amount: 10000, // $100
        closed_date: '2025-04-05',
        payment_source_id: 'ps-checking-001',
        notes: 'Partial payment',
      });

      expect(result).not.toBeNull();
      expect(result?.closedOccurrence.expected_amount).toBe(10000);
      expect(result?.closedOccurrence.is_closed).toBe(true);
      expect(result?.closedOccurrence.closed_date).toBe('2025-04-05');
      expect(result?.closedOccurrence.payment_source_id).toBe('ps-checking-001');
      expect(result?.closedOccurrence.notes).toBe('Partial payment');

      expect(result?.newOccurrence.expected_amount).toBe(20000); // $200 remainder
      expect(result?.newOccurrence.is_closed).toBe(false);
      expect(result?.newOccurrence.is_adhoc).toBe(true);
      expect(result?.newOccurrence.sequence).toBe(2);
      expect(result?.newOccurrence.expected_date).toBe('2025-04-30'); // End of April
    });

    test('returns null for non-existent instance', async () => {
      const result = await service.splitBillOccurrence(testMonth, 'non-existent', 'occ-b1', {
        paid_amount: 10000,
        closed_date: '2025-04-05',
      });

      expect(result).toBeNull();
    });

    test('returns null for non-existent occurrence', async () => {
      const result = await service.splitBillOccurrence(testMonth, 'bi-rent-001', 'non-existent', {
        paid_amount: 10000,
        closed_date: '2025-04-05',
      });

      expect(result).toBeNull();
    });

    test('throws error for already closed occurrence', async () => {
      // First close the occurrence
      await service.closeBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
        closed_date: '2025-04-05',
      });

      // Try to split it
      await expect(
        service.splitBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
          paid_amount: 10000,
          closed_date: '2025-04-05',
        })
      ).rejects.toThrow('Cannot split an already closed occurrence');
    });

    test('throws error for paid_amount <= 0', async () => {
      await expect(
        service.splitBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
          paid_amount: 0,
          closed_date: '2025-04-05',
        })
      ).rejects.toThrow('Paid amount must be greater than 0');

      await expect(
        service.splitBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
          paid_amount: -100,
          closed_date: '2025-04-05',
        })
      ).rejects.toThrow('Paid amount must be greater than 0');
    });

    test('throws error for paid_amount >= expected_amount', async () => {
      await expect(
        service.splitBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
          paid_amount: 30000, // Same as expected
          closed_date: '2025-04-05',
        })
      ).rejects.toThrow('Paid amount must be less than expected amount');

      await expect(
        service.splitBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
          paid_amount: 35000, // More than expected
          closed_date: '2025-04-05',
        })
      ).rejects.toThrow('Paid amount must be less than expected amount');
    });

    test('instance has two occurrences after split', async () => {
      await service.splitBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
        paid_amount: 10000,
        closed_date: '2025-04-05',
      });

      const data = await service.getMonthlyData(testMonth);
      const instance = data?.bill_instances.find((bi) => bi.id === 'bi-rent-001');

      expect(instance?.occurrences.length).toBe(2);
      expect(instance?.is_closed).toBe(false); // Not all occurrences closed
    });
  });

  describe('splitIncomeOccurrence', () => {
    test('splits income occurrence correctly', async () => {
      const result = await service.splitIncomeOccurrence(testMonth, 'ii-pay-001', 'occ-i1', {
        paid_amount: 20000, // $200
        closed_date: '2025-04-06',
        payment_source_id: 'ps-savings-001',
      });

      expect(result).not.toBeNull();
      expect(result?.closedOccurrence.expected_amount).toBe(20000);
      expect(result?.closedOccurrence.is_closed).toBe(true);
      expect(result?.closedOccurrence.closed_date).toBe('2025-04-06');

      expect(result?.newOccurrence.expected_amount).toBe(30000); // $300 remainder
      expect(result?.newOccurrence.is_closed).toBe(false);
      expect(result?.newOccurrence.is_adhoc).toBe(true);
    });

    test('throws error for already closed occurrence', async () => {
      await service.closeIncomeOccurrence(testMonth, 'ii-pay-001', 'occ-i1', {
        closed_date: '2025-04-06',
      });

      await expect(
        service.splitIncomeOccurrence(testMonth, 'ii-pay-001', 'occ-i1', {
          paid_amount: 20000,
          closed_date: '2025-04-06',
        })
      ).rejects.toThrow('Cannot split an already closed occurrence');
    });

    test('throws error for invalid amounts', async () => {
      await expect(
        service.splitIncomeOccurrence(testMonth, 'ii-pay-001', 'occ-i1', {
          paid_amount: 0,
          closed_date: '2025-04-06',
        })
      ).rejects.toThrow('Paid amount must be greater than 0');

      await expect(
        service.splitIncomeOccurrence(testMonth, 'ii-pay-001', 'occ-i1', {
          paid_amount: 50000, // Same as expected
          closed_date: '2025-04-06',
        })
      ).rejects.toThrow('Paid amount must be less than expected amount');
    });
  });
});
