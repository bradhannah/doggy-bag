import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'bun:test';
import { AdhocServiceImpl } from './adhoc-service';
import { MonthsServiceImpl } from './months-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { MonthlyData } from '../types';

const SOURCE = '2026-10';
const TARGET = '2026-11';
const TS = '2026-01-01T00:00:00.000Z';

function occurrence(id: string, date: string, amount: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    sequence: 1,
    expected_date: date,
    expected_amount: amount,
    is_closed: false,
    is_adhoc: false,
    created_at: TS,
    updated_at: TS,
    ...extra,
  };
}

function monthFixture(isReadOnly: boolean): MonthlyData {
  return {
    month: SOURCE,
    occurrence_dates_migrated: true,
    bill_instances: [
      {
        id: 'bi-rent',
        bill_id: 'bill-rent',
        name: 'Rent',
        category_id: 'cat-housing',
        payment_source_id: 'ps-checking',
        billing_period: 'monthly',
        expected_amount: 120000,
        month: SOURCE,
        occurrences: [occurrence('occ-rent', '2026-10-31', 120000, { notes: 'late this month' })],
        is_default: true,
        is_closed: false,
        is_adhoc: false,
        created_at: TS,
        updated_at: TS,
      },
      {
        id: 'bi-karate',
        bill_id: 'bill-karate',
        name: 'Karate',
        billing_period: 'bi_weekly',
        expected_amount: 12882,
        month: SOURCE,
        occurrences: [
          occurrence('occ-k1', '2026-10-09', 6441, { is_closed: true, closed_date: '2026-10-09' }),
          { ...occurrence('occ-k2', '2026-10-23', 6441), sequence: 2 },
        ],
        is_default: true,
        is_closed: false,
        is_adhoc: false,
        created_at: TS,
        updated_at: TS,
      },
      {
        id: 'bi-payoff',
        bill_id: null,
        name: 'Visa Payoff',
        billing_period: 'monthly',
        expected_amount: 50000,
        month: SOURCE,
        occurrences: [occurrence('occ-payoff', '2026-10-28', 50000, { is_adhoc: true })],
        is_default: false,
        is_closed: false,
        is_adhoc: true,
        is_payoff_bill: true,
        created_at: TS,
        updated_at: TS,
      },
    ],
    income_instances: [
      {
        id: 'ii-travel',
        income_id: null,
        name: 'TD Toronto Travel Oct',
        billing_period: 'monthly',
        expected_amount: 100000,
        month: SOURCE,
        occurrences: [occurrence('occ-travel', '2026-10-31', 100000, { is_adhoc: true })],
        is_default: false,
        is_closed: false,
        is_adhoc: true,
        created_at: TS,
        updated_at: TS,
      },
      {
        id: 'ii-two',
        income_id: null,
        name: 'Two payments',
        billing_period: 'monthly',
        expected_amount: 3000,
        month: SOURCE,
        occurrences: [
          occurrence('occ-two-a', '2026-10-05', 1000, { is_adhoc: true }),
          { ...occurrence('occ-two-b', '2026-10-15', 2000, { is_adhoc: true }), sequence: 2 },
        ],
        is_default: false,
        is_closed: false,
        is_adhoc: true,
        created_at: TS,
        updated_at: TS,
      },
    ],
    variable_expenses: [],
    free_flowing_expenses: [],
    bank_balances: {},
    is_read_only: isReadOnly,
    created_at: TS,
    updated_at: TS,
  } as unknown as MonthlyData;
}

describe('AdhocService - move one open payment to the next month', () => {
  let service: AdhocServiceImpl;
  let months: MonthsServiceImpl;
  let testDir: string;

  async function writeMonth(month: string, data: MonthlyData) {
    await writeFile(join(testDir, 'months', `${month}.json`), JSON.stringify(data, null, 2));
  }

  async function readRawMonth(month: string): Promise<MonthlyData> {
    return JSON.parse(await readFile(join(testDir, 'months', `${month}.json`), 'utf8'));
  }

  beforeAll(async () => {
    testDir = join(tmpdir(), `adhoc-move-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });
    for (const entity of [
      'bills',
      'incomes',
      'categories',
      'payment-sources',
      'todos',
      'insurance-claims',
      'insurance-plans',
      'savings-goals',
    ]) {
      await writeFile(join(testDir, 'entities', `${entity}.json`), '[]');
    }
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    await rm(join(testDir, 'months', `${TARGET}.json`), { force: true });
    await writeMonth(SOURCE, monthFixture(false));
    service = new AdhocServiceImpl();
    months = new MonthsServiceImpl();
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('a recurring payment becomes a $0 skipped entry with a note, and an open ad-hoc copy next month', async () => {
    const result = await service.moveBillOccurrenceToMonth(SOURCE, 'bi-rent', 'occ-rent', TARGET);

    expect(result.target_month).toBe(TARGET);
    expect(result.instance.name).toBe('Rent (Oct)');
    expect(result.instance.is_adhoc).toBe(true);
    expect(result.instance.bill_id).toBeNull();
    expect(result.instance.category_id).toBe('cat-housing');
    expect(result.instance.payment_source_id).toBe('ps-checking');
    expect(result.instance.occurrences).toHaveLength(1);
    expect(result.instance.occurrences[0].expected_date).toBe('2026-11-30'); // 31st clamps
    expect(result.instance.occurrences[0].expected_amount).toBe(120000);
    expect(result.instance.occurrences[0].is_closed).toBe(false);
    expect(result.instance.occurrences[0].is_adhoc).toBe(true);

    const source = await readRawMonth(SOURCE);
    const rent = source.bill_instances.find((b) => b.id === 'bi-rent')!;
    expect(rent.occurrences).toHaveLength(1);
    expect(rent.occurrences[0].is_closed).toBe(true);
    expect(rent.occurrences[0].expected_amount).toBe(0);
    expect(rent.occurrences[0].notes).toBe('Moved to November 2026. late this month');
    expect(rent.expected_amount).toBe(0);
    expect(rent.is_closed).toBe(true);
    expect(rent.is_default).toBe(false);

    const target = await readRawMonth(TARGET);
    expect(target.bill_instances.some((b) => b.id === result.instance.id)).toBe(true);
  });

  test('moving one of several recurring payments leaves the others untouched', async () => {
    await service.moveBillOccurrenceToMonth(SOURCE, 'bi-karate', 'occ-k2', TARGET);

    const source = await readRawMonth(SOURCE);
    const karate = source.bill_instances.find((b) => b.id === 'bi-karate')!;
    expect(karate.occurrences.map((o) => [o.id, o.expected_amount, o.is_closed])).toEqual([
      ['occ-k1', 6441, true],
      ['occ-k2', 0, true],
    ]);
    expect(karate.expected_amount).toBe(6441);
    expect(karate.is_closed).toBe(true);
  });

  test('an ad-hoc item with one payment is removed from the source month', async () => {
    const result = await service.moveIncomeOccurrenceToMonth(
      SOURCE,
      'ii-travel',
      'occ-travel',
      TARGET
    );

    expect(result.instance.name).toBe('TD Toronto Travel Oct (Oct)');
    expect(result.instance.income_id).toBeNull();
    const source = await readRawMonth(SOURCE);
    expect(source.income_instances.find((i) => i.id === 'ii-travel')).toBeUndefined();
    const target = await readRawMonth(TARGET);
    expect(target.income_instances.map((i) => i.name)).toContain('TD Toronto Travel Oct (Oct)');
  });

  test('an ad-hoc item with several payments keeps the rest', async () => {
    await service.moveIncomeOccurrenceToMonth(SOURCE, 'ii-two', 'occ-two-a', TARGET);

    const source = await readRawMonth(SOURCE);
    const two = source.income_instances.find((i) => i.id === 'ii-two')!;
    expect(two.occurrences.map((o) => o.id)).toEqual(['occ-two-b']);
    expect(two.occurrences[0].sequence).toBe(1);
    expect(two.expected_amount).toBe(2000);
  });

  test('works when the source month is locked', async () => {
    await writeMonth(SOURCE, monthFixture(true));

    const result = await service.moveIncomeOccurrenceToMonth(
      SOURCE,
      'ii-travel',
      'occ-travel',
      TARGET
    );
    expect(result.instance.occurrences[0].expected_amount).toBe(100000);

    const source = await readRawMonth(SOURCE);
    expect(source.is_read_only).toBe(true);
    expect(source.income_instances.find((i) => i.id === 'ii-travel')).toBeUndefined();
  });

  test('refuses a locked target month and leaves the source alone', async () => {
    await writeMonth(TARGET, { ...monthFixture(true), month: TARGET } as MonthlyData);

    await expect(
      service.moveBillOccurrenceToMonth(SOURCE, 'bi-rent', 'occ-rent', TARGET)
    ).rejects.toThrow(/read-only|locked/i);

    const source = await readRawMonth(SOURCE);
    expect(source.bill_instances.find((b) => b.id === 'bi-rent')!.occurrences[0].is_closed).toBe(
      false
    );
  });

  test('creates the target month when it does not exist yet', async () => {
    expect(await months.getMonthlyData(TARGET)).toBeNull();
    await service.moveBillOccurrenceToMonth(SOURCE, 'bi-rent', 'occ-rent', TARGET);
    expect(await months.getMonthlyData(TARGET)).not.toBeNull();
  });

  test('rejects closed payments, payoff bills, and same-month moves', async () => {
    await expect(
      service.moveBillOccurrenceToMonth(SOURCE, 'bi-karate', 'occ-k1', TARGET)
    ).rejects.toThrow(/open payment/);
    await expect(
      service.moveBillOccurrenceToMonth(SOURCE, 'bi-payoff', 'occ-payoff', TARGET)
    ).rejects.toThrow(/payoff/i);
    await expect(
      service.moveBillOccurrenceToMonth(SOURCE, 'bi-rent', 'occ-rent', SOURCE)
    ).rejects.toThrow(/different/);
    await expect(
      service.moveBillOccurrenceToMonth(SOURCE, 'bi-rent', 'occ-rent', 'nope')
    ).rejects.toThrow(/YYYY-MM/);
  });

  test('rejects unknown instances and occurrences', async () => {
    await expect(
      service.moveBillOccurrenceToMonth(SOURCE, 'missing', 'occ-rent', TARGET)
    ).rejects.toThrow(/not found/);
    await expect(
      service.moveBillOccurrenceToMonth(SOURCE, 'bi-rent', 'missing', TARGET)
    ).rejects.toThrow(/not found/);
  });
});
