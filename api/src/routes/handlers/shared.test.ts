import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StorageServiceImpl } from '../../services/storage';
import { checkRequestReadOnly } from './shared';

const LOCKED = '2026-10';

describe('checkRequestReadOnly', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `shared-readonly-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });
    for (const entity of [
      'bills',
      'incomes',
      'categories',
      'payment-sources',
      'insurance-claims',
    ]) {
      await writeFile(join(testDir, 'entities', `${entity}.json`), '[]');
    }
    await writeFile(
      join(testDir, 'months', `${LOCKED}.json`),
      JSON.stringify({
        month: LOCKED,
        occurrence_dates_migrated: true,
        bill_instances: [],
        income_instances: [],
        variable_expenses: [],
        free_flowing_expenses: [],
        bank_balances: {},
        is_read_only: true,
        insurance_snapshot: { billInstances: [], incomeInstances: [] },
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
    );
    StorageServiceImpl.initialize(testDir);
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const post = (path: string) =>
    checkRequestReadOnly(new Request(`http://localhost${path}`, { method: 'POST' }));

  test('blocks ordinary writes to a locked month', async () => {
    const response = await post(`/api/months/${LOCKED}/bills/inst/occurrences/occ/close`);
    expect(response?.status).toBe(403);
  });

  test('lets a payment be moved out of a locked month', async () => {
    expect(
      await post(`/api/months/${LOCKED}/bills/inst/occurrences/occ/move-to-next-month`)
    ).toBeNull();
    expect(
      await post(`/api/months/${LOCKED}/incomes/inst/occurrences/occ/move-to-next-month`)
    ).toBeNull();
  });

  test('keeps the existing lock and push exemptions', async () => {
    expect(await post(`/api/months/${LOCKED}/lock`)).toBeNull();
    expect(await post(`/api/months/${LOCKED}/push-savings-balances`)).toBeNull();
  });

  test('ignores reads and non-month paths', async () => {
    expect(
      await checkRequestReadOnly(new Request(`http://localhost/api/months/${LOCKED}`))
    ).toBeNull();
    expect(await post('/api/bills')).toBeNull();
  });
});
