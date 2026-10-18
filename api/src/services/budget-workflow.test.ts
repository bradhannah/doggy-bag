import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageServiceImpl } from './storage';
import { MonthsServiceImpl } from './months-service';
import { SavingsService } from './savings-service';
import { BudgetUpdatesService } from './budget-updates-service';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import { DetailedViewServiceImpl } from './detailed-view-service';
import { createBillInstanceHandlerDELETE } from '../routes/handlers/instances.handlers';
import type { MonthlyData, Bill } from '../types';
import type { SavingsPlanRequest } from '../types/budget-workflow';
import { effectiveBudgetUpdates } from '../types/budget-workflow';
import { createBillInstance, createIncomeInstance } from '../utils/monthly-instances';

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

describe('Budget and Savings workflow', () => {
  let directory: string;
  let months: MonthsServiceImpl;
  let savings: SavingsService;
  let updates: BudgetUpdatesService;
  const storage = () => StorageServiceImpl.getInstance();
  const emptyMonth = (): MonthlyData => ({
    month,
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
    directory = await mkdtemp(join(tmpdir(), 'budget-workflow-'));
    await mkdir(join(directory, 'entities'));
    StorageServiceImpl.initialize(directory);
  });
  beforeEach(async () => {
    await rm(join(directory, 'months'), { recursive: true, force: true });
    await mkdir(join(directory, 'months'));
    for (const entity of [
      'bills',
      'incomes',
      'insurance-claims',
      'savings-goals',
      'todos',
      'categories',
    ]) {
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
    updates = new BudgetUpdatesService();
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  test('a plan created before its budget generates the same linked commitment', async () => {
    await savings.createPlan(plan);
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
    expect((await updates.preview(month)).items).toHaveLength(0);
  });

  async function changedExpense(overrides = false) {
    const bill = source({ name: 'Internet', amount: 8000, day_of_month: 12 });
    await storage().writeJSON('data/entities/bills.json', [bill]);
    const instance = createBillInstance(bill, month)!;
    if (overrides) {
      instance.occurrences[0].expected_amount = 9000;
      instance.occurrences[0].expected_date = `${month}-14`;
      instance.expected_amount = 9000;
    }
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      bill_instances: [instance],
    });
    await new BillsServiceImpl().update(bill.id, { amount: 9500, day_of_month: 15 });
    return { bill, instance };
  }

  test('reviews amount and due date independently and preserves the original history snapshot', async () => {
    const { instance } = await changedExpense();
    const preview = await updates.preview(month);
    const change = preview.items.find((item) => item.operation === 'update')!;
    expect(change.changes).toHaveLength(2);
    const amount = change.changes!.find((field) => field.field === 'expected_amount')!;
    expect(amount).toMatchObject({
      original: 8000,
      current: 8000,
      proposed: 9500,
      is_override: false,
      impact: -1500,
    });
    const result = await updates.apply(month, preview.revision, [amount.key], []);
    expect(result).toMatchObject({ updated: 1, added: 0 });
    const saved = (await months.getMonthlyData(month))!.bill_instances[0];
    expect(saved.id).toBe(instance.id);
    expect(saved.occurrences[0]).toMatchObject({
      expected_amount: 9500,
      expected_date: `${month}-12`,
    });
    expect(saved.source_snapshot?.amount).toBe(8000);
    expect((await updates.preview(month)).items[0].changes!.map((field) => field.field)).toEqual([
      'expected_date',
    ]);
    expect((await updates.apply(month, preview.revision, [amount.key], [])).already_applied).toBe(
      true
    );
  });

  test('detects overrides and remembers a keep decision only for the relevant recurring version', async () => {
    const { bill } = await changedExpense(true);
    let preview = await updates.preview(month);
    expect(preview.items[0].changes!.every((field) => field.is_override)).toBe(true);
    await updates.apply(month, preview.revision, [], [preview.items[0].key]);
    expect((await updates.preview(month)).items).toHaveLength(0);
    await new BillsServiceImpl().update(bill.id, { name: 'Internet renamed' });
    expect((await updates.preview(month)).items).toHaveLength(0);
    await new BillsServiceImpl().update(bill.id, { amount: 10000 });
    preview = await updates.preview(month);
    expect(
      preview.items[0].changes!.find((field) => field.field === 'expected_amount')
    ).toMatchObject({ current: 9000, proposed: 10000, is_override: true });
  });

  test('can keep a customised amount while accepting a new date, then review a later amount', async () => {
    const { bill } = await changedExpense(true);
    const preview = await updates.preview(month);
    const fields = preview.items[0].changes!;
    const amount = fields.find((field) => field.field === 'expected_amount')!;
    const date = fields.find((field) => field.field === 'expected_date')!;
    await updates.apply(month, preview.revision, [date.key], [amount.key]);
    expect((await updates.preview(month)).items).toHaveLength(0);
    expect((await months.getMonthlyData(month))!.bill_instances[0].occurrences[0]).toMatchObject({
      expected_amount: 9000,
      expected_date: `${month}-15`,
    });
    await new BillsServiceImpl().update(bill.id, { amount: 11000 });
    const next = (await updates.preview(month)).items[0];
    expect(next.changes).toHaveLength(1);
    expect(next.changes![0]).toMatchObject({
      original: 9500,
      current: 9000,
      proposed: 11000,
      is_override: true,
    });
  });

  test('source reversion after accepting an update is still reviewable', async () => {
    const { bill } = await changedExpense();
    const preview = await updates.preview(month);
    await updates.apply(
      month,
      preview.revision,
      preview.items[0].changes!.map((field) => field.key),
      []
    );
    await new BillsServiceImpl().update(bill.id, { amount: 8000, day_of_month: 12 });
    const next = (await updates.preview(month)).items[0];
    expect(next.changes).toHaveLength(2);
    expect(next.changes!.every((field) => !field.is_override)).toBe(true);
  });

  test('reviewed legacy dates retain a stable reference for subsequent changes', async () => {
    const { bill } = await changedExpense();
    const data = (await months.getMonthlyData(month))!;
    delete data.bill_instances[0].occurrences[0].recurring_origin;
    await months.saveMonthlyData(month, data);
    const preview = await updates.preview(month);
    const date = preview.items[0].changes!.find((change) => change.field === 'expected_date')!;
    await updates.apply(month, preview.revision, [date.key], []);
    await new BillsServiceImpl().update(bill.id, { day_of_month: 22 });
    expect(
      (await updates.preview(month)).items[0].changes!.find(
        (change) => change.field === 'expected_date'
      )
    ).toMatchObject({
      original: `${month}-15`,
      current: `${month}-15`,
      proposed: `${month}-22`,
      is_override: false,
    });
  });

  test('ambiguous edited legacy weekly dates are kept for manual review', async () => {
    const bill = source({ billing_period: 'weekly', start_date: '2026-10-01' });
    await storage().writeJSON('data/entities/bills.json', [bill]);
    const instance = createBillInstance(bill, month)!;
    instance.is_default = false;
    instance.occurrences.forEach((item) => delete item.recurring_origin);
    instance.occurrences[0].expected_date = instance.occurrences[1].expected_date;
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      occurrence_dates_migrated: true,
      bill_instances: [instance],
    });
    await new BillsServiceImpl().update(bill.id, { start_date: '2026-10-02' });
    const change = (await updates.preview(month)).items[0];
    expect(change.changes).toHaveLength(3);
    expect(change.notices).toHaveLength(1);
  });

  test('a later return to a reviewed amount is offered after an intermediate source version', async () => {
    const { bill, instance } = await changedExpense();
    const preview = await updates.preview(month);
    await updates.apply(
      month,
      preview.revision,
      preview.items[0].changes!.map((field) => field.key),
      []
    );
    await months.updateBillOccurrence(month, instance.id, instance.occurrences[0].id, {
      expected_amount: 8000,
    });
    await new BillsServiceImpl().update(bill.id, { amount: 8000 });
    expect((await updates.preview(month)).items).toHaveLength(0);
    await new BillsServiceImpl().update(bill.id, { amount: 9500 });
    expect((await updates.preview(month)).items[0].changes![0]).toMatchObject({
      current: 8000,
      proposed: 9500,
      is_override: true,
    });
  });

  test('recorded payments and partial remainders are preserved when the source changes', async () => {
    const { instance } = await changedExpense();
    await months.splitBillOccurrence(month, instance.id, instance.occurrences[0].id, {
      paid_amount: 3000,
      closed_date: `${month}-12`,
    });
    const before = (await months.getMonthlyData(month))!.bill_instances[0];
    const preview = await updates.preview(month);
    expect(preview.items[0].changes).toHaveLength(0);
    expect(preview.items[0].preserved).toHaveLength(2);
    await updates.apply(month, preview.revision, [], [preview.items[0].key]);
    expect((await months.getMonthlyData(month))!.bill_instances[0].occurrences).toEqual(
      before.occurrences
    );
    expect((await updates.preview(month)).items).toHaveLength(0);
  });

  test('weekly schedule shape changes require manual date review but allow amount updates', async () => {
    const bill = source({ billing_period: 'weekly', start_date: '2026-10-01', amount: 10000 });
    await storage().writeJSON('data/entities/bills.json', [bill]);
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      bill_instances: [createBillInstance(bill, month)!],
    });
    await new BillsServiceImpl().update(bill.id, { start_date: '2026-10-05', amount: 12000 });
    const change = (await updates.preview(month)).items[0];
    expect(change.changes!.every((field) => field.field === 'expected_amount')).toBe(true);
    expect(change.notices?.length).toBeGreaterThan(0);
  });

  test('updates unpaid weekly slots while preserving recorded occurrences byte-for-byte', async () => {
    const bill = source({ billing_period: 'weekly', start_date: '2026-10-01', amount: 10000 });
    await storage().writeJSON('data/entities/bills.json', [bill]);
    const instance = createBillInstance(bill, month)!;
    instance.occurrences[0].is_closed = true;
    instance.occurrences[0].closed_date = `${month}-01`;
    instance.occurrences[0].notes = 'Recorded bank transfer';
    const recorded = structuredClone(instance.occurrences[0]);
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      bill_instances: [instance],
    });
    await new BillsServiceImpl().update(bill.id, { start_date: '2026-10-02', amount: 12000 });
    const preview = await updates.preview(month);
    const fields = preview.items[0].changes!;
    expect(fields).toHaveLength(8);
    await updates.apply(
      month,
      preview.revision,
      fields.map((field) => field.key),
      []
    );
    const saved = (await months.getMonthlyData(month))!.bill_instances[0];
    expect(saved.occurrences[0]).toEqual(recorded);
    expect(saved.occurrences[1]).toMatchObject({
      expected_date: `${month}-09`,
      expected_amount: 12000,
    });
    expect(saved.expected_amount).toBe(58000);
  });

  test('changed-field apply rejects stale previews, locked months, and conflicting choices', async () => {
    const { instance } = await changedExpense();
    const preview = await updates.preview(month);
    const field = preview.items[0].changes![0].key;
    await expect(
      updates.apply(month, preview.revision, [field], [preview.items[0].key])
    ).rejects.toThrow('not both');
    await months.closeBillOccurrence(month, instance.id, instance.occurrences[0].id, {
      closed_date: `${month}-12`,
    });
    await expect(updates.apply(month, preview.revision, [field], [])).rejects.toThrow('changed');
    await months.toggleReadOnly(month);
    await expect(
      updates.apply(month, (await updates.preview(month)).revision, [], [])
    ).rejects.toThrow('read-only');
  });

  test('income increases raise available budget and selected savings changes reduce legacy overlap', async () => {
    const income = { ...source({ amount: 10000 }), name: 'Salary' };
    await storage().writeJSON('data/entities/incomes.json', [income]);
    const bill = source({ amount: 20000, savings_account_id: savingsAccount });
    await storage().writeJSON('data/entities/bills.json', [bill]);
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      bill_instances: [createBillInstance(bill, month)!],
      income_instances: [createIncomeInstance(income, month)!],
      savings_contributions: { [savingsAccount]: 50000 },
    });
    await new IncomesServiceImpl().update(income.id, { amount: 15000 });
    await new BillsServiceImpl().update(bill.id, { amount: 30000 });
    const preview = await updates.preview(month);
    const changed = preview.items.filter((item) => item.operation === 'update');
    const keys = changed.flatMap((item) => item.changes!.map((field) => field.key));
    const effective = effectiveBudgetUpdates(preview.items, keys);
    expect(effective.find((item) => item.kind === 'income')?.impact).toBe(5000);
    expect(effective.find((item) => item.legacy)?.amount).toBe(20000);
    await updates.apply(month, preview.revision, [...keys, `legacy-savings:${savingsAccount}`], []);
    expect((await savings.summary(month)).accounts[0].planned).toBe(50000);
  });

  test('balance edits merge accounts and timestamp only submitted snapshots', async () => {
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      bank_balances_updated_at: { [checking]: stamp },
    });
    const updated = await months.updateBankBalances(month, { other: -1000 });
    expect(updated.bank_balances).toEqual({ [checking]: 100000, other: -1000 });
    expect(updated.bank_balances_updated_at?.[checking]).toBe(stamp);
    expect(updated.bank_balances_updated_at?.other).toBeDefined();
    await expect(months.updateBankBalances(month, { other: 0.5 })).rejects.toThrow('integer cents');
  });

  test('manual card sync adds only that card, not unrelated missing recurring entries', async () => {
    await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
    const sources = await storage().readJSON<Record<string, unknown>[]>(
      'data/entities/payment-sources.json'
    );
    await storage().writeJSON('data/entities/payment-sources.json', [
      ...sources!,
      {
        id: 'manual-card',
        name: 'Card',
        type: 'credit_card',
        is_active: true,
        track_payments_manually: true,
        created_at: stamp,
        updated_at: stamp,
      },
    ]);
    await storage().writeJSON('data/entities/bills.json', [source()]);
    await months.syncManualPaymentSource(month, 'manual-card');
    await months.syncManualPaymentSource(month, 'manual-card');
    const data = (await months.getMonthlyData(month))!;
    expect(data.bill_instances).toHaveLength(1);
    expect(data.bill_instances[0]).toMatchObject({
      payoff_source_id: 'manual-card',
      occurrences: [],
      expected_amount: 0,
    });
    expect((await updates.preview(month)).items).toHaveLength(1);
  });

  test('a later plan is selectively applied once and recording it updates Savings', async () => {
    await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
    const created = await savings.createPlan(plan);
    expect((await months.getMonthlyData(month))?.bill_instances).toHaveLength(0);
    const preview = await updates.preview(month);
    expect(preview.available).toBe(100000);
    expect(preview.items[0]).toMatchObject({ key: created.key, impact: -20000, group: 'savings' });
    await updates.apply(month, preview.revision, [created.key!], []);
    expect((await updates.apply(month, preview.revision, [created.key!], [])).already_applied).toBe(
      true
    );
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

  test('one-off contributions and withdrawals share budget records without recurring sources', async () => {
    await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
    await savings.createPlan({ ...plan, recurring: false });
    await savings.createPlan({ ...plan, recurring: false, direction: 'withdrawal', amount: 5000 });
    expect(await new BillsServiceImpl().getAll()).toEqual([]);
    expect(await new IncomesServiceImpl().getAll()).toEqual([]);
    expect((await savings.summary(month)).accounts[0].planned).toBe(15000);
    expect((await new DetailedViewServiceImpl().getDetailedMonth(month)).leftover).toBe(85000);
  });

  test('legacy account amounts and missing goal schedules are not counted twice', async () => {
    const bill = source({
      name: 'Savings: Vacation',
      amount: 20000,
      goal_id: 'goal',
      payment_source_id: savingsAccount,
    });
    await storage().writeJSON('data/entities/bills.json', [bill]);
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      savings_contributions: { [savingsAccount]: 50000 },
    });
    const preview = await updates.preview(month);
    expect(
      effectiveBudgetUpdates(
        preview.items,
        preview.items.map((item) => item.key)
      )
        .map((item) => item.amount)
        .sort()
    ).toEqual([20000, 30000]);
    await updates.apply(
      month,
      preview.revision,
      preview.items.map((item) => item.key),
      []
    );
    expect((await savings.summary(month)).accounts[0].planned).toBe(50000);
    expect((await months.getMonthlyData(month))?.savings_contributions).toEqual({});
    expect((await updates.preview(month)).items).toHaveLength(0);
  });

  test('legacy imports can be linked to a new recurring plan without increasing the budget', async () => {
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      savings_contributions: { [savingsAccount]: 20000 },
    });
    const legacy = await updates.preview(month);
    await updates.apply(
      month,
      legacy.revision,
      legacy.items.map((item) => item.key),
      []
    );
    const originalId = (await months.getMonthlyData(month))!.bill_instances[0].id;
    const created = await savings.createPlan(plan);
    const preview = await updates.preview(month);
    expect(preview.items[0]).toMatchObject({ operation: 'link', impact: 0 });
    await updates.apply(month, preview.revision, [created.key!], []);
    const data = (await months.getMonthlyData(month))!;
    expect(data.bill_instances).toHaveLength(1);
    expect(data.bill_instances[0].id).toBe(originalId);
    expect((await savings.summary(month)).accounts[0].planned).toBe(20000);
  });

  test('restoring a skipped plan and selecting the legacy amount cannot double-count savings', async () => {
    const bill = source({ amount: 20000, goal_id: 'goal', payment_source_id: savingsAccount });
    await storage().writeJSON('data/entities/bills.json', [bill]);
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      savings_contributions: { [savingsAccount]: 20000 },
      excluded_budget_sources: [`bill:${bill.id}`],
    });
    const preview = await updates.preview(month);
    await updates.apply(
      month,
      preview.revision,
      preview.items.map((item) => item.key),
      []
    );
    expect((await months.getMonthlyData(month))?.bill_instances).toHaveLength(1);
    expect((await savings.summary(month)).accounts[0].planned).toBe(20000);
  });

  test('linking an existing plan and adding a remainder is independent of selection order', async () => {
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      savings_contributions: { [savingsAccount]: 20000 },
    });
    const first = await updates.preview(month);
    await updates.apply(
      month,
      first.revision,
      first.items.map((item) => item.key),
      []
    );
    await months.updateSavingsBalances(month, undefined, undefined, { [savingsAccount]: 50000 });
    const created = await savings.createPlan(plan);
    const preview = await updates.preview(month);
    await updates.apply(
      month,
      preview.revision,
      [`legacy-savings:${savingsAccount}`, created.key!],
      []
    );
    const data = (await months.getMonthlyData(month))!;
    expect(data.bill_instances).toHaveLength(2);
    expect(data.bill_instances.find((item) => item.bill_id)?.expected_amount).toBe(20000);
    expect((await savings.summary(month)).accounts[0].planned).toBe(50000);
  });

  test('selecting a subset leaves other items available; skipping and deleting are remembered', async () => {
    const a = source({ name: 'A' });
    const b = source({ name: 'B' });
    const c = source({ name: 'C' });
    const pay = source({ name: 'Pay', amount: 50000 });
    await storage().writeJSON('data/entities/bills.json', [a, b, c]);
    await storage().writeJSON('data/entities/incomes.json', [pay]);
    await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
    const preview = await updates.preview(month);
    await updates.apply(
      month,
      preview.revision,
      [`bill:${a.id}`, `income:${pay.id}`],
      [`bill:${b.id}`]
    );
    expect((await months.getMonthlyData(month))?.income_instances[0].income_id).toBe(pay.id);
    expect((await new DetailedViewServiceImpl().getDetailedMonth(month)).leftover).toBe(140000);
    const next = await updates.preview(month);
    expect(next.items.find((item) => item.key === `bill:${b.id}`)?.excluded).toBe(true);
    expect(next.items.find((item) => item.key === `bill:${c.id}`)?.excluded).toBe(false);
    const instance = (await months.getMonthlyData(month))!.bill_instances[0];
    const deleted = await createBillInstanceHandlerDELETE()(
      new Request(`http://localhost/api/months/${month}/bills/${instance.id}`, { method: 'DELETE' })
    );
    expect(deleted.status).toBe(200);
    expect(
      (await updates.preview(month)).items.find((item) => item.key === `bill:${a.id}`)?.excluded
    ).toBe(true);
    await months.syncMonthlyData(month);
    expect(
      (await months.getMonthlyData(month))!.bill_instances.map((item) => item.bill_id)
    ).toEqual([c.id]);
  });

  test('stale previews and locked budgets cannot apply changes', async () => {
    await storage().writeJSON(`data/months/${month}.json`, emptyMonth());
    const created = await savings.createPlan(plan);
    const preview = await updates.preview(month);
    await new BillsServiceImpl().update(created.key!.slice(5), { amount: 30000 });
    await expect(updates.apply(month, preview.revision, [created.key!], [])).rejects.toThrow(
      'changed'
    );
    expect((await months.getMonthlyData(month))?.bill_instances).toHaveLength(0);
    await months.toggleReadOnly(month);
    const locked = await updates.preview(month);
    await expect(updates.apply(month, locked.revision, [created.key!], [])).rejects.toThrow(
      'read-only'
    );
    await expect(savings.createPlan({ ...plan, recurring: false })).rejects.toThrow('read-only');
  });

  test('future plans are not offered early; existing monthly edits and payments are preserved', async () => {
    await savings.createPlan(plan);
    await months.generateMonthlyData(month);
    const instance = (await months.getMonthlyData(month))!.bill_instances[0];
    await months.closeBillOccurrence(month, instance.id, instance.occurrences[0].id, {
      expected_amount: 15000,
    });
    await savings.createPlan({ ...plan, date: '2026-11-01' });
    expect((await updates.preview(month)).items).toEqual([]);
    expect((await savings.summary(month)).accounts[0]).toMatchObject({
      planned: 15000,
      recorded: 15000,
    });
  });

  test('a negative legacy plan imports as a withdrawal into the budget', async () => {
    await storage().writeJSON(`data/months/${month}.json`, {
      ...emptyMonth(),
      savings_contributions: { [savingsAccount]: -10000 },
    });
    const preview = await updates.preview(month);
    expect(preview.items[0]).toMatchObject({ kind: 'income', impact: 10000 });
    await updates.apply(
      month,
      preview.revision,
      preview.items.map((item) => item.key),
      []
    );
    expect((await savings.summary(month)).accounts[0].planned).toBe(-10000);
    expect((await new DetailedViewServiceImpl().getDetailedMonth(month)).leftover).toBe(110000);
  });

  test('invalid accounts and dates do not create financial records', async () => {
    await expect(
      savings.createPlan({ ...plan, spending_account_id: savingsAccount })
    ).rejects.toThrow('bank or cash');
    await expect(savings.createPlan({ ...plan, date: '2026-02-31' })).rejects.toThrow('valid date');
    expect(await new BillsServiceImpl().getAll()).toEqual([]);
  });
});
