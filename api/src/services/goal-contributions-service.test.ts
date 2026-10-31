import { beforeEach, afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import { SavingsGoalsServiceImpl } from './savings-goals-service';
import { BillsServiceImpl } from './bills-service';
import { MonthsServiceImpl } from './months-service';
import { updateGoalContributions } from './goal-contributions-service';
import { createBillInstance } from '../utils/monthly-instances';
import { getTodayLocalDateString } from '../utils/due-date';
import { savingsEntries } from '../utils/savings';
import type { Bill, MonthlyData, SavingsGoal } from '../types';

describe('Goal contributions follow lifecycle actions', () => {
  let directory: string;
  let storage: StorageService;
  let goals: SavingsGoalsServiceImpl;
  let months: MonthsServiceImpl;
  let goal: SavingsGoal;
  let source: Bill;
  const today = getTodayLocalDateString();
  const current = today.slice(0, 7);
  const relativeMonth = (offset: number) => {
    const date = new Date(Number(current.slice(0, 4)), Number(current.slice(5)) - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  const read = async (month = current) => (await months.getMonthlyData(month))!;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'goal-contributions-'));
    await mkdir(join(directory, 'entities'));
    await mkdir(join(directory, 'months'));
    StorageServiceImpl.initialize(directory);
    storage = StorageServiceImpl.getInstance();
    for (const name of [
      'bills',
      'incomes',
      'categories',
      'payment-sources',
      'todos',
      'insurance-claims',
      'savings-goals',
    ]) {
      await storage.writeJSON(`data/entities/${name}.json`, []);
    }
    goals = new SavingsGoalsServiceImpl();
    months = new MonthsServiceImpl();
    goal = await goals.create({
      name: 'Emergency fund',
      linked_account_id: 'savings',
      status: 'saving',
    });
    source = {
      id: 'plan',
      name: 'Emergency fund contribution',
      goal_id: goal.id,
      amount: 20000,
      billing_period: 'monthly',
      day_of_month: 31,
      category_id: 'savings',
      payment_source_id: 'checking',
      savings_account_id: 'savings',
      is_active: true,
      created_at: today,
      updated_at: today,
    };
    await storage.writeJSON('data/entities/bills.json', [source]);
    for (const offset of [-1, 0, 1, 2]) {
      const month = relativeMonth(offset);
      const instance = createBillInstance(source, month)!;
      instance.is_default = false;
      instance.occurrences[0].expected_amount = 15000;
      instance.occurrences[0].notes = 'Monthly override';
      instance.occurrences.push({
        ...instance.occurrences[0],
        id: 'recorded',
        expected_amount: 5000,
        is_closed: true,
        closed_date: `${month}-01`,
        expected_date: `${month}-01`,
        is_adhoc: true,
        notes: 'Already transferred',
      });
      const data: MonthlyData = {
        month,
        bill_instances: [instance],
        income_instances: [],
        todo_instances: [],
        variable_expenses: [],
        free_flowing_expenses: [],
        bank_balances: { checking: 100000 },
        savings_contributions: { savings: 50000 },
        is_read_only: offset === 2,
        created_at: today,
        updated_at: today,
      };
      await storage.writeJSON(`data/months/${month}.json`, data);
    }
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  test('pause removes unpaid plans, retains recorded amounts, and preserves past/locked budgets', async () => {
    const past = await read(relativeMonth(-1));
    const locked = await read(relativeMonth(2));
    await goals.pause(goal.id);
    const data = await read();
    expect(data.bill_instances[0].occurrences).toHaveLength(1);
    expect(data.bill_instances[0].occurrences[0]).toMatchObject({
      id: 'recorded',
      expected_amount: 5000,
      notes: 'Already transferred',
    });
    expect(savingsEntries(data, 'savings')[0]).toMatchObject({ planned: 5000, recorded: 5000 });
    expect(data.bank_balances).toEqual({ checking: 100000 });
    expect(data.savings_contributions?.savings).toBe(35000);
    expect(data.paused_goal_contributions?.[0].instance.occurrences[0].expected_amount).toBe(15000);
    expect((await new BillsServiceImpl().getById(source.id))?.is_active).toBe(false);
    expect(await read(relativeMonth(-1))).toEqual(past);
    expect(await read(relativeMonth(2))).toEqual(locked);
    expect((await months.createMonth(relativeMonth(3))).bill_instances).toHaveLength(0);
  });

  test('resume preserves monthly overrides, restores future plans once, and keeps legacy remainder constant', async () => {
    await goals.pause(goal.id);
    await goals.resume(goal.id);
    const data = await read();
    expect(data.bill_instances[0].occurrences).toHaveLength(2);
    expect(data.bill_instances[0].occurrences.find((item) => !item.is_closed)).toMatchObject({
      expected_amount: 15000,
      notes: 'Monthly override',
    });
    expect(data.savings_contributions?.savings).toBe(50000);
    expect(savingsEntries(data, 'savings')[0]).toMatchObject({ planned: 20000, recorded: 5000 });
    expect(data.paused_goal_contributions).toEqual([]);
    const resumed = (await new BillsServiceImpl().getById(source.id))!;
    expect(resumed.is_active).toBe(true);
    expect(resumed.effective_from).toBe(today);
    expect((await months.createMonth(relativeMonth(3))).bill_instances[0].expected_amount).toBe(
      20000
    );
  });

  test('keep-current-month is an explicit exception; future budgets still pause', async () => {
    const original = await read();
    await goals.pause(goal.id, { keep_current_month: true });
    expect((await read()).bill_instances).toEqual(original.bill_instances);
    expect((await read(relativeMonth(1))).bill_instances[0].expected_amount).toBe(5000);
  });

  test('stopping a schedule while paused prevents its automatic restoration', async () => {
    await goals.pause(goal.id);
    await new BillsServiceImpl().update(source.id, { is_active: false });
    await goals.resume(goal.id);
    expect((await read()).bill_instances[0].expected_amount).toBe(5000);
    expect((await new BillsServiceImpl().getById(source.id))?.is_active).toBe(false);
  });

  test('resume honours explicit monthly exclusions', async () => {
    await goals.pause(goal.id);
    const data = await read();
    data.excluded_budget_sources = ['bill:plan'];
    await months.saveMonthlyData(current, data);
    await goals.resume(goal.id);
    expect((await read()).bill_instances[0].expected_amount).toBe(5000);
  });

  test('completion stops schedules without creating paid money', async () => {
    await goals.pause(goal.id);
    await goals.complete(goal.id);
    expect((await read()).paused_goal_contributions).toEqual([]);
    expect(savingsEntries(await read(), 'savings')[0].recorded).toBe(5000);
    expect((await new BillsServiceImpl().getById(source.id))?.paused_by_goal_id).toBeUndefined();
    expect((await months.createMonth(relativeMonth(3))).bill_instances).toHaveLength(0);
    await expect(goals.update(goal.id, { status: 'saving' })).rejects.toThrow('Cannot change goal');
  });

  test('missed paused dates are not backfilled on resume', async () => {
    await goals.pause(goal.id);
    const paused = (await goals.getById(goal.id))!;
    await updateGoalContributions(paused, 'saving', {}, `${relativeMonth(1)}-01`);
    expect((await read()).bill_instances[0].expected_amount).toBe(5000);
    expect((await read(relativeMonth(1))).bill_instances[0].expected_amount).toBe(20000);
  });

  test('abandon and delete retain recorded history and never restart the stopped source', async () => {
    await goals.abandon(goal.id);
    expect((await read()).bill_instances[0].occurrences).toHaveLength(1);
    expect((await new BillsServiceImpl().getById(source.id))?.is_active).toBe(false);
    await goals.delete(goal.id);
    expect(await goals.getById(goal.id)).toBeNull();
    expect(savingsEntries(await read(), 'savings')[0]).toMatchObject({
      recorded: 5000,
      goal_id: goal.id,
    });
    expect((await months.createMonth(relativeMonth(3))).bill_instances).toHaveLength(0);
  });

  test('pausing a contribution does not change a separate legacy withdrawal hint', async () => {
    const data = await read();
    data.savings_contributions = { savings: -5000 };
    await months.saveMonthlyData(current, data);
    await goals.pause(goal.id);
    expect((await read()).savings_contributions?.savings).toBe(-5000);
  });

  test('old paused/closed goals are excluded from generation and add-to-month even if their source is still active', async () => {
    await storage.writeJSON('data/entities/savings-goals.json', [{ ...goal, status: 'paused' }]);
    const target = relativeMonth(3);
    expect((await months.createMonth(target)).bill_instances).toHaveLength(0);
    expect((await months.addSourceToMonth(target, 'bill', source.id)).added).toBe(false);
  });
});
