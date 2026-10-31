import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { mkdtemp, mkdir, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageServiceImpl } from '../services/storage';
import { migrateGoalsToSavings } from './remove-goals';

const stamp = '2026-01-01T00:00:00.000Z';
const bill = (overrides: Record<string, unknown>) => ({
  id: 'bill',
  name: 'Savings: Car',
  amount: 10000,
  billing_period: 'monthly',
  day_of_month: 15,
  start_date: '2026-03-15',
  category_id: 'savings',
  payment_source_id: 'car-fund',
  is_active: true,
  created_at: stamp,
  updated_at: stamp,
  ...overrides,
});
const instance = (overrides: Record<string, unknown>) => ({
  id: 'instance',
  bill_id: 'bill',
  month: '2026-10',
  billing_period: 'monthly',
  expected_amount: 10000,
  occurrences: [],
  is_default: true,
  is_closed: false,
  is_adhoc: false,
  payment_source_id: 'car-fund',
  created_at: stamp,
  updated_at: stamp,
  ...overrides,
});

describe('migrateGoalsToSavings', () => {
  let directory: string;
  const storage = () => StorageServiceImpl.getInstance();
  const read = async (path: string) => JSON.parse(await readFile(join(directory, path), 'utf8'));

  beforeEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
    directory = await mkdtemp(join(tmpdir(), 'remove-goals-'));
    await mkdir(join(directory, 'entities'));
    await mkdir(join(directory, 'months'));
    StorageServiceImpl.initialize(directory);
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  test('does nothing, and takes no backup, when there is nothing to convert', async () => {
    await storage().writeJSON('data/entities/bills.json', [bill({})]);
    const result = await migrateGoalsToSavings(storage(), directory);
    expect(result).toMatchObject({ changed: false, sources: 0, months: 0, categories: 0 });
    expect(await readdir(directory)).not.toContain('backups');
  });

  test('converts goal schedules, instances and the category, after a backup', async () => {
    await storage().writeJSON('data/entities/savings-goals.json', [
      { id: 'saving', status: 'saving', linked_account_id: 'car-fund' },
      { id: 'bought', status: 'bought', linked_account_id: 'us' },
      { id: 'chequing', status: 'saving', linked_account_id: 'checking' },
    ]);
    await storage().writeJSON('data/entities/payment-sources.json', [
      { id: 'car-fund', name: 'Car fund', type: 'bank_account', is_savings: true, is_active: true },
      { id: 'us', name: 'US account', type: 'investment', is_active: true },
      { id: 'checking', name: 'Checking', type: 'bank_account', is_active: true },
    ]);
    await storage().writeJSON('data/entities/bills.json', [
      bill({ goal_id: 'saving', paused_by_goal_id: 'saving' }),
      bill({ id: 'done', name: 'Savings: US', goal_id: 'bought', payment_source_id: 'us' }),
      bill({ id: 'gone', name: 'Savings: Old', goal_id: 'missing' }),
      bill({ id: 'explicit', goal_id: 'saving', savings_account_id: 'chosen' }),
      bill({
        id: 'unlinked',
        name: 'Savings: Trip',
        goal_id: 'chequing',
        payment_source_id: 'checking',
      }),
      bill({ id: 'plain', name: 'Rent', payment_source_id: 'checking' }),
    ]);
    await storage().writeJSON('data/entities/incomes.json', [
      { ...bill({ id: 'withdrawal', goal_id: 'saving' }), category_id: 'withdrawals' },
    ]);
    await storage().writeJSON('data/entities/categories.json', [
      { id: 'savings', name: 'Savings Goals', type: 'savings_goal', sort_order: 3 },
      { id: 'rent', name: 'Housing', type: 'bill', sort_order: 0 },
    ]);
    await storage().writeJSON('data/months/2026-10.json', {
      month: '2026-10',
      is_read_only: true,
      bill_instances: [
        instance({ goal_id: 'saving', source_snapshot: bill({ goal_id: 'saving' }) }),
        instance({ id: 'already', savings_account_id: 'car-fund', goal_id: 'saving' }),
        instance({
          id: 'wrongly-linked',
          bill_id: 'unlinked',
          goal_id: 'chequing',
          savings_account_id: 'checking',
          payment_source_id: 'checking',
        }),
        instance({ id: 'untouched', bill_id: 'plain', payment_source_id: 'checking' }),
      ],
      income_instances: [],
      variable_expenses: [],
      free_flowing_expenses: [],
      bank_balances: {},
      paused_goal_contributions: [],
      created_at: stamp,
      updated_at: stamp,
    });
    await storage().writeJSON('data/months/2026-11.json', {
      month: '2026-11',
      is_read_only: false,
      bill_instances: [instance({ id: 'plain-only', bill_id: 'plain' })],
      income_instances: [],
      variable_expenses: [],
      free_flowing_expenses: [],
      bank_balances: {},
      created_at: stamp,
      updated_at: stamp,
    });

    const result = await migrateGoalsToSavings(storage(), directory);
    expect(result).toMatchObject({ changed: true, sources: 6, months: 1, categories: 1 });

    const bills = await read('entities/bills.json');
    expect(bills.find((b: { id: string }) => b.id === 'bill')).toMatchObject({
      savings_account_id: 'car-fund',
      effective_from: '2026-03-15',
      is_active: true,
    });
    for (const converted of bills) {
      expect(converted).not.toHaveProperty('goal_id');
      expect(converted).not.toHaveProperty('paused_by_goal_id');
    }
    expect(bills.find((b: { id: string }) => b.id === 'done').is_active).toBe(false);
    expect(bills.find((b: { id: string }) => b.id === 'gone').is_active).toBe(false);
    expect(bills.find((b: { id: string }) => b.id === 'gone')).not.toHaveProperty(
      'savings_account_id'
    );
    // The goal's account wins over whatever the bill carried
    expect(bills.find((b: { id: string }) => b.id === 'explicit').savings_account_id).toBe(
      'car-fund'
    );
    expect(bills.find((b: { id: string }) => b.id === 'done').savings_account_id).toBe('us');
    // A goal "linked" to a chequing account leaves an ordinary bill in the Savings category
    expect(bills.find((b: { id: string }) => b.id === 'unlinked')).not.toHaveProperty(
      'savings_account_id'
    );
    expect(bills.find((b: { id: string }) => b.id === 'unlinked').is_active).toBe(true);
    expect(bills.find((b: { id: string }) => b.id === 'plain')).not.toHaveProperty(
      'savings_account_id'
    );
    expect((await read('entities/incomes.json'))[0]).toMatchObject({
      savings_account_id: 'car-fund',
    });
    expect((await read('entities/categories.json'))[0]).toMatchObject({
      name: 'Savings',
      type: 'bill',
      sort_order: 3,
    });

    const october = await read('months/2026-10.json');
    expect(october.is_read_only).toBe(true); // locked history gets the identity it needs
    expect(october).not.toHaveProperty('paused_goal_contributions');
    expect(october.bill_instances[0]).toMatchObject({ savings_account_id: 'car-fund' });
    expect(october.bill_instances[0]).not.toHaveProperty('goal_id');
    expect(october.bill_instances[0].source_snapshot).not.toHaveProperty('goal_id');
    expect(october.bill_instances[0].source_snapshot.savings_account_id).toBe('car-fund');
    expect(october.bill_instances[1]).not.toHaveProperty('goal_id');
    expect(october.bill_instances[2]).not.toHaveProperty('goal_id');
    expect(october.bill_instances[2]).not.toHaveProperty('savings_account_id');
    expect(october.bill_instances[3]).not.toHaveProperty('savings_account_id');
    expect((await read('months/2026-11.json')).updated_at).toBe(stamp);

    const backups = await readdir(join(directory, 'backups'));
    expect(backups).toHaveLength(1);
    expect(backups[0].startsWith('pre-remove-goals_')).toBe(true);
    const saved = await readdir(join(directory, 'backups', backups[0], 'entities'));
    expect(saved).toContain('bills.json');
    expect(saved).toContain('savings-goals.json');
    const original = JSON.parse(
      await readFile(join(directory, 'backups', backups[0], 'entities', 'bills.json'), 'utf8')
    );
    expect(original[0].goal_id).toBe('saving');

    // Running again is a no-op and takes no second backup
    expect((await migrateGoalsToSavings(storage(), directory)).changed).toBe(false);
    expect(await readdir(join(directory, 'backups'))).toHaveLength(1);
  });
});
