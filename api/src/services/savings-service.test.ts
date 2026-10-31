import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageServiceImpl } from './storage';
import { MonthsServiceImpl } from './months-service';
import { SavingsService } from './savings-service';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import { DetailedViewServiceImpl } from './detailed-view-service';
import type { MonthlyData, Bill, BillInstanceDetailed } from '../types';
import type { SavingsPlanRequest } from '../types/budget-workflow';
import { createBillInstance } from '../utils/monthly-instances';

const checking = '11111111-1111-4111-8111-111111111111';
const savingsAccount = '22222222-2222-4222-8222-222222222222';
const month = '2026-10';
const stamp = '2026-01-01T00:00:00.000Z';
const plan: SavingsPlanRequest = {
  month,
  savings_account_id: savingsAccount,
  spending_account_id: checking,
  amount: 20000,
  date: `${month}-20`,
  direction: 'contribution',
  recurring: true,
};

describe('Savings plans and adding recurring items to an existing month', () => {
  let directory: string;
  let months: MonthsServiceImpl;
  let savings: SavingsService;
  const storage = () => StorageServiceImpl.getInstance();
  const emptyMonth = (): MonthlyData => ({
    month,
    occurrence_dates_migrated: true,
    bill_instances: [],
    income_instances: [],
    variable_expenses: [],
    free_flowing_expenses: [],
    bank_balances: { [checking]: 100000 },
    is_read_only: false,
    created_at: stamp,
    updated_at: stamp,
  });
  const source = (changes: Partial<Bill> = {}): Bill => ({
    id: crypto.randomUUID(),
    name: 'Expense',
    amount: 10000,
    billing_period: 'monthly',
    day_of_month: 20,
    category_id: 'expenses',
    payment_source_id: checking,
    is_active: true,
    created_at: stamp,
    updated_at: stamp,
    ...changes,
  });

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'savings-service-'));
    await mkdir(join(directory, 'entities'));
    StorageServiceImpl.initialize(directory);
  });
  beforeEach(async () => {
    await rm(join(directory, 'months'), { recursive: true, force: true });
    await mkdir(join(directory, 'months'));
    for (const entity of ['bills', 'incomes', 'insurance-claims', 'todos', 'categories']) {
      await storage().writeJSON(`data/entities/${entity}.json`, []);
    }
    await storage().writeJSON('data/entities/payment-sources.json', [
      {
        id: checking,
        name: 'Checking',
        type: 'bank_account',
        is_active: true,
        created_at: stamp,
        updated_at: stamp,
      },
      {
        id: savingsAccount,
        name: 'Emergency fund',
        type: 'bank_account',
        is_active: true,
        is_savings: true,
        exclude_from_leftover: true,
        created_at: stamp,
        updated_at: stamp,
      },
    ]);
    months = new MonthsServiceImpl();
    savings = new SavingsService();
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  test('a plan created before its budget generates the same linked commitment', async () => {
    const result = await savings.createPlan(plan);
    expect(result).toMatchObject({ recurring: true, added: false, reason: 'month_missing' });
    const generated = await months.createMonth(month);
    expect(generated.bill_instances).toHaveLength(1);
    expect(generated.bill_instances[0]).toMatchObject({
      savings_account_id: savingsAccount,
      payment_source_id: checking,
      expected_amount: 20000,
    });
    expect((await savings.summary(month)).accounts[0]).toMatchObject({
      planned: 20000,
      recorded: 0,
    });
  });

  test('a plan created after the budget exists goes straight into that month', async () => {
    await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
    const result = await savings.createPlan(plan);
    expect(result).toMatchObject({ recurring: true, added: true });
    const data = (await months.getMonthlyData(month))!;
    expect(data.bill_instances).toHaveLength(1);
    expect((await new DetailedViewServiceImpl().getDetailedMonth(month)).leftover).toBe(80000);
    const item = data.bill_instances[0];
    await months.closeBillOccurrence(month, item.id, item.occurrences[0].id, {
      closed_date: `${month}-20`,
    });
    expect((await savings.summary(month)).accounts[0]).toMatchObject({
      planned: 20000,
      recorded: 20000,
    });
  });

  test('a locked month is left alone and the caller is told why', async () => {
    await storage().writeJSON(`data/months/${month}.json`, { ...emptyMonth(), is_read_only: true });
    const result = await savings.createPlan(plan);
    expect(result).toMatchObject({ recurring: true, added: false, reason: 'locked' });
    expect(await new BillsServiceImpl().getAll()).toHaveLength(1);
    expect((await months.getMonthlyData(month))!.bill_instances).toHaveLength(0);
  });

  test('one-off contributions and withdrawals share budget records without recurring sources', async () => {
    await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
    await savings.createPlan({ ...plan, recurring: false });
    await savings.createPlan({ ...plan, recurring: false, direction: 'withdrawal', amount: 5000 });
    expect(await new BillsServiceImpl().getAll()).toEqual([]);
    expect(await new IncomesServiceImpl().getAll()).toEqual([]);
    expect((await savings.summary(month)).accounts[0].planned).toBe(15000);
    expect((await new DetailedViewServiceImpl().getDetailedMonth(month)).leftover).toBe(85000);
  });

  test('invalid accounts and dates do not create financial records', async () => {
    await expect(
      savings.createPlan({ ...plan, spending_account_id: savingsAccount })
    ).rejects.toThrow('bank or cash');
    await expect(savings.createPlan({ ...plan, date: '2026-02-31' })).rejects.toThrow('valid date');
    await expect(savings.createPlan({ ...plan, month: '2026-13' })).rejects.toThrow('valid budget');
    expect(await new BillsServiceImpl().getAll()).toEqual([]);
  });

  describe('addSourceToMonth', () => {
    test('adds a recurring bill once and respects explicit exclusions', async () => {
      const bill = source({ name: 'Internet' });
      await storage().writeJSON('data/entities/bills.json', [bill]);
      await storage().writeJSON(`data/months/${month}.json`, emptyMonth());

      expect(await months.addSourceToMonth(month, 'bill', bill.id)).toEqual({ added: true });
      expect(await months.addSourceToMonth(month, 'bill', bill.id)).toEqual({
        added: false,
        reason: 'already_present',
      });
      const data = (await months.getMonthlyData(month))!;
      expect(data.bill_instances).toHaveLength(1);
      expect(data.bill_instances[0]).toMatchObject({ bill_id: bill.id, expected_amount: 10000 });

      await storage().writeJSON(`data/months/${month}.json`, {
        ...emptyMonth(),
        excluded_budget_sources: [`bill:${bill.id}`],
      });
      expect(await months.addSourceToMonth(month, 'bill', bill.id)).toEqual({
        added: false,
        reason: 'excluded',
      });
    });

    test('explains a missing month, a locked month, an unknown item, and one that starts later', async () => {
      const bill = source({ name: 'Internet' });
      const later = source({ name: 'Gym', day_of_month: 5, start_date: '2027-01-05' });
      await storage().writeJSON('data/entities/bills.json', [bill, later]);

      expect(await months.addSourceToMonth(month, 'bill', bill.id)).toEqual({
        added: false,
        reason: 'month_missing',
      });
      await storage().writeJSON(`data/months/${month}.json`, {
        ...emptyMonth(),
        is_read_only: true,
      });
      expect(await months.addSourceToMonth(month, 'bill', bill.id)).toEqual({
        added: false,
        reason: 'locked',
      });
      await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
      expect(await months.addSourceToMonth(month, 'bill', 'nope')).toEqual({
        added: false,
        reason: 'not_found',
      });
      expect(await months.addSourceToMonth(month, 'bill', later.id)).toEqual({
        added: false,
        reason: 'no_occurrences',
      });
    });

    test('adds a recurring income too', async () => {
      const income = {
        ...source({ name: 'Side gig', amount: 5000 }),
        category_id: 'income',
      };
      await storage().writeJSON('data/entities/incomes.json', [income]);
      await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
      expect(await months.addSourceToMonth(month, 'income', income.id)).toEqual({ added: true });
      const data = (await months.getMonthlyData(month))!;
      expect(data.income_instances[0]).toMatchObject({
        income_id: income.id,
        expected_amount: 5000,
      });
    });
  });

  test('the Budget reads bank details live from Manage, falling back to the month snapshot', async () => {
    const bill = source({ name: 'Internet', metadata: { bank_transaction_name: 'OLD NAME' } });
    await storage().writeJSON('data/entities/bills.json', [bill]);
    const instance = createBillInstance(bill, month)!;
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      bill_instances: [instance],
    });
    await new BillsServiceImpl().update(bill.id, {
      metadata: { bank_transaction_name: 'NEW NAME', notes: 'autopay' },
    });

    const billItems = async () =>
      (await new DetailedViewServiceImpl().getDetailedMonth(month)).billSections.flatMap(
        (section) => section.items as BillInstanceDetailed[]
      );
    expect((await billItems())[0].metadata).toEqual({
      bank_transaction_name: 'NEW NAME',
      notes: 'autopay',
    });

    await new BillsServiceImpl().delete(bill.id);
    expect((await billItems())[0].metadata).toEqual({ bank_transaction_name: 'OLD NAME' });
  });
});
