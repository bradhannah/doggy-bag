import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'bun:test';
import { MonthsServiceImpl } from './months-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { MonthlyData } from '../types';

// Use generic shape to avoid extra strictness in tests

describe('MonthsService - close occurrence notes', () => {
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
        expected_amount: 120000,
        month: testMonth,
        occurrences: [
          {
            id: 'occ-b1',
            sequence: 1,
            expected_date: '2025-04-01',
            expected_amount: 120000,
            is_closed: false,
            payments: [],
            closed_date: undefined,
            notes: undefined,
            is_adhoc: true,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        occurrence_count: 1,
        is_default: false,
        is_closed: false,
        payment_source_id: undefined,
        category_id: undefined,
        is_adhoc: true,
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
        expected_amount: 500000,
        month: testMonth,
        occurrences: [
          {
            id: 'occ-i1',
            sequence: 1,
            expected_date: '2025-04-02',
            expected_amount: 500000,
            is_closed: false,
            payments: [],
            closed_date: undefined,
            notes: undefined,
            is_adhoc: true,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        occurrence_count: 1,
        is_default: false,
        is_closed: false,
        payment_source_id: undefined,
        category_id: undefined,
        is_adhoc: true,
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
    testDir = join(tmpdir(), `months-close-occ-${Date.now()}`);
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

  test('stores notes on closed bill occurrence', async () => {
    const result = await service.closeBillOccurrence(testMonth, 'bi-rent-001', 'occ-b1', {
      closed_date: '2025-04-05',
      notes: 'Paid early',
    });

    expect(result?.occurrences[0].notes).toBe('Paid early');
    expect(result?.occurrences[0].closed_date).toBe('2025-04-05');
  });

  test('stores notes on closed income occurrence', async () => {
    const result = await service.closeIncomeOccurrence(testMonth, 'ii-pay-001', 'occ-i1', {
      closed_date: '2025-04-06',
      notes: 'Bonus included',
    });

    expect(result?.occurrences[0].notes).toBe('Bonus included');
    expect(result?.occurrences[0].closed_date).toBe('2025-04-06');
  });
});
