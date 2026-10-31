import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runWithDataAccess } from './data-access';
import { StorageServiceImpl } from './storage';
import { MonthsServiceImpl } from './months-service';
import { BillsServiceImpl } from './bills-service';

describe('API data isolation', () => {
  let directory: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'data-access-'));
    await mkdir(join(directory, 'months'));
    await mkdir(join(directory, 'entities'));
    StorageServiceImpl.initialize(directory);
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  test('all concurrent independent Savings edits survive', async () => {
    const storage = StorageServiceImpl.getInstance();
    await storage.writeJSON('data/months/2026-10.json', {
      month: '2026-10',
      bill_instances: [],
      income_instances: [],
      variable_expenses: [],
      free_flowing_expenses: [],
      bank_balances: {},
      is_read_only: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const service = new MonthsServiceImpl();
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        runWithDataAccess(() =>
          service.updateSavingsBalances('2026-10', undefined, { [`account-${index}`]: index })
        )
      )
    );
    expect(
      Object.keys((await service.getMonthlyData('2026-10'))!.savings_balances_end!)
    ).toHaveLength(12);
  });

  test('a swallowed corrupt-file read cannot overwrite existing bytes', async () => {
    const path = join(directory, 'entities', 'bills.json');
    const damaged = '[{"id":"existing"';
    await writeFile(path, damaged);
    await expect(
      runWithDataAccess(() =>
        new BillsServiceImpl().create({
          name: 'New bill',
          amount: 1000,
          billing_period: 'monthly',
          day_of_month: 1,
          category_id: crypto.randomUUID(),
          payment_source_id: crypto.randomUUID(),
        })
      )
    ).rejects.toThrow('Unable to read saved data');
    expect(await readFile(path, 'utf8')).toBe(damaged);
    await expect(runWithDataAccess(() => new BillsServiceImpl().getAll())).rejects.toThrow(
      'Unable to read saved data'
    );
    // A failed request releases the queue for subsequent operations.
    expect(await runWithDataAccess(async () => 'ready')).toBe('ready');
  });
});
