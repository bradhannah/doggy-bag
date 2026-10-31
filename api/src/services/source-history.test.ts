import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageServiceImpl } from './storage';
import { BillsServiceImpl } from './bills-service';
import { MonthsServiceImpl } from './months-service';
import { DetailedViewServiceImpl } from './detailed-view-service';

describe('Source-independent monthly history', () => {
  let directory: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'source-history-'));
    await mkdir(join(directory, 'entities'));
    await mkdir(join(directory, 'months'));
    StorageServiceImpl.initialize(directory);
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(join(directory, 'months'), { recursive: true, force: true });
    await mkdir(join(directory, 'months'));
    const storage = StorageServiceImpl.getInstance();
    const stamp = new Date().toISOString();
    await storage.writeJSON('data/entities/insurance-claims.json', []);
    await storage.writeJSON('data/entities/bills.json', [
      {
        id: 'bill',
        name: 'Savings: Emergency fund',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 1,
        category_id: 'savings',
        payment_source_id: 'account',
        savings_account_id: 'account',
        is_active: true,
        created_at: stamp,
        updated_at: stamp,
      },
    ]);
    await storage.writeJSON('data/entities/payment-sources.json', [
      {
        id: 'account',
        name: 'Savings',
        type: 'bank_account',
        is_savings: true,
        exclude_from_leftover: true,
        is_active: true,
      },
    ]);
    await storage.writeJSON('data/entities/categories.json', [
      { id: 'savings', name: 'Savings', type: 'bill', sort_order: 0 },
    ]);
    await storage.writeJSON('data/months/2026-01.json', {
      month: '2026-01',
      bill_instances: [
        {
          id: 'instance',
          bill_id: 'bill',
          month: '2026-01',
          billing_period: 'monthly',
          expected_amount: 10000,
          is_default: true,
          is_adhoc: false,
          is_closed: true,
          occurrences: [
            {
              id: 'occ',
              sequence: 1,
              expected_date: '2026-01-01',
              expected_amount: 10000,
              is_closed: true,
              is_adhoc: false,
              created_at: stamp,
              updated_at: stamp,
            },
          ],
          created_at: stamp,
          updated_at: stamp,
        },
      ],
      income_instances: [],
      variable_expenses: [],
      free_flowing_expenses: [],
      bank_balances: {},
      is_read_only: false,
      created_at: stamp,
      updated_at: stamp,
    });
  });

  test('editing then deleting a source preserves the monthly identity', async () => {
    const bills = new BillsServiceImpl();
    await bills.update('bill', { name: 'Changed name' });
    await bills.delete('bill');
    const historical = await new DetailedViewServiceImpl().getDetailedMonth('2026-01');
    expect(
      historical.billSections.find((section) => section.category.id === 'savings')?.items[0]
    ).toMatchObject({
      name: 'Savings: Emergency fund',
      category_id: 'savings',
      payment_source: { id: 'account', name: 'Savings' },
      actual_amount: 10000,
      savings_account: { id: 'account' },
    });
  });

  test('locked budgets reject edits and freeze insurance-derived values', async () => {
    const storage = StorageServiceImpl.getInstance();
    const service = new MonthsServiceImpl();
    await storage.writeJSON('data/entities/insurance-claims.json', [
      {
        id: 'claim',
        claim_number: 0,
        family_member_name: 'Person',
        category_name: 'Dental',
        service_date: '2026-01-10',
        is_expected: true,
        expected_cost: 20000,
        expected_reimbursement: 10000,
        submissions: [],
        documents: [],
        status: 'draft',
      },
    ]);
    await service.toggleReadOnly('2026-01');
    await expect(
      service.updateSavingsBalances('2026-01', undefined, { account: 12300 })
    ).rejects.toThrow('read-only');
    await storage.writeJSON('data/entities/insurance-claims.json', []);
    expect(
      (await service.getMonthlyData('2026-01'))?.bill_instances.some(
        (instance) => instance.claim_id === 'claim'
      )
    ).toBe(true);
    await service.toggleReadOnly('2026-01');
    expect(
      (await service.getMonthlyData('2026-01'))?.bill_instances.some(
        (instance) => instance.claim_id === 'claim'
      )
    ).toBe(false);
  });
});
