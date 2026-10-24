import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'bun:test';
import { MonthsServiceImpl } from './months-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { MonthlyData } from '../types';

describe('MonthsService - remove occurrence', () => {
  let service: MonthsServiceImpl;
  let testDir: string;
  const testMonth = '2025-04';
  const timestamp = '2025-01-01T00:00:00.000Z';

  function occurrence(id: string, expectedAmount: number, isAdhoc: boolean, day = '10') {
    return {
      id,
      sequence: 1,
      expected_date: `${testMonth}-${day}`,
      expected_amount: expectedAmount,
      is_closed: false,
      is_adhoc: isAdhoc,
      created_at: timestamp,
      updated_at: timestamp,
    };
  }

  function instance(
    id: string,
    name: string,
    isAdhoc: boolean,
    occurrences: ReturnType<typeof occurrence>[]
  ) {
    return {
      id,
      name,
      billing_period: 'monthly',
      expected_amount: occurrences.reduce((sum, occ) => sum + occ.expected_amount, 0),
      month: testMonth,
      occurrences,
      is_default: false,
      is_closed: false,
      is_adhoc: isAdhoc,
      created_at: timestamp,
      updated_at: timestamp,
    };
  }

  const sampleMonthlyData = {
    month: testMonth,
    bill_instances: [
      {
        ...instance('bi-adhoc', 'Repair', true, [occurrence('occ-b-adhoc', 7500, true)]),
        bill_id: null,
      },
      {
        ...instance('bi-regular', 'Rent', false, [
          occurrence('occ-b-regular', 30000, false, '01'),
          occurrence('occ-b-extra', 5000, true, '15'),
        ]),
        bill_id: null,
      },
    ],
    income_instances: [
      {
        ...instance('ii-adhoc', 'Gift', true, [occurrence('occ-i-adhoc', 5000, true)]),
        income_id: null,
      },
      {
        ...instance('ii-adhoc-multi', 'Side gig', true, [
          occurrence('occ-i-multi-1', 2000, true, '05'),
          occurrence('occ-i-multi-2', 3000, true, '20'),
        ]),
        income_id: null,
      },
    ],
    variable_expenses: [],
    free_flowing_expenses: [],
    bank_balances: {},
    is_read_only: false,
    created_at: timestamp,
    updated_at: timestamp,
  } as unknown as MonthlyData;

  beforeAll(async () => {
    testDir = join(tmpdir(), `months-remove-occ-${Date.now()}`);
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

  test('removing the last occurrence of an ad-hoc income deletes the income', async () => {
    const result = await service.removeIncomeOccurrence(testMonth, 'ii-adhoc', 'occ-i-adhoc');
    expect(result?.id).toBe('ii-adhoc');

    // Re-reading must not backfill a $0 placeholder occurrence
    const data = await service.getMonthlyData(testMonth);
    expect(data?.income_instances.find((ii) => ii.id === 'ii-adhoc')).toBeUndefined();
    expect(data?.income_instances).toHaveLength(1);
  });

  test('removing the last occurrence of an ad-hoc bill deletes the bill', async () => {
    const result = await service.removeBillOccurrence(testMonth, 'bi-adhoc', 'occ-b-adhoc');
    expect(result?.id).toBe('bi-adhoc');

    const data = await service.getMonthlyData(testMonth);
    expect(data?.bill_instances.find((bi) => bi.id === 'bi-adhoc')).toBeUndefined();
    expect(data?.bill_instances).toHaveLength(1);
  });

  test('removing one of several ad-hoc occurrences keeps the ad-hoc income', async () => {
    const result = await service.removeIncomeOccurrence(
      testMonth,
      'ii-adhoc-multi',
      'occ-i-multi-1'
    );
    expect(result?.occurrences.map((o) => o.id)).toEqual(['occ-i-multi-2']);
    expect(result?.expected_amount).toBe(3000);

    const data = await service.getMonthlyData(testMonth);
    const stored = data?.income_instances.find((ii) => ii.id === 'ii-adhoc-multi');
    expect(stored?.occurrences.map((o) => o.id)).toEqual(['occ-i-multi-2']);
  });

  test('removing an ad-hoc occurrence from a regular bill keeps the bill', async () => {
    const result = await service.removeBillOccurrence(testMonth, 'bi-regular', 'occ-b-extra');
    expect(result?.occurrences.map((o) => o.id)).toEqual(['occ-b-regular']);
    expect(result?.expected_amount).toBe(30000);

    const data = await service.getMonthlyData(testMonth);
    expect(data?.bill_instances.find((bi) => bi.id === 'bi-regular')).toBeDefined();
  });
});
