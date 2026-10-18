import { createHash } from 'node:crypto';
import { MonthsServiceImpl } from './months-service';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import { PaymentSourcesServiceImpl } from './payment-sources-service';
import { CategoriesServiceImpl } from './categories-service';
import { runWithDataAccess } from './data-access';
import { createBillInstance, createIncomeInstance } from '../utils/monthly-instances';
import { calculateUnifiedLeftover } from '../utils/leftover';
import { createAdhocOccurrence, sumOccurrenceExpectedAmounts } from '../utils/occurrences';
import {
  remainingLegacySavings,
  retireCoveredLegacySavings,
  savingsEntries,
} from '../utils/savings';
import { ConflictError, NotFoundError, ReadOnlyError, ValidationError } from '../utils/errors';
import type { BillInstance, IncomeInstance, MonthlyData } from '../types';
import type {
  BudgetUpdateItem,
  BudgetUpdatePreview,
  BudgetUpdateResult,
} from '../types/budget-workflow';
import { effectiveBudgetUpdates } from '../types/budget-workflow';
import { recurringBudgetChanges, type RecurringChangeTarget } from './recurring-budget-changes';

export function validateBudgetMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new ValidationError('Choose a valid budget month');
}

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type PreparedItem = {
  item: BudgetUpdateItem;
  instance?: BillInstance | IncomeInstance;
  linkId?: string;
  legacyAccountId?: string;
  targets?: RecurringChangeTarget[];
  changeVersion?: string;
};

export class BudgetUpdatesService {
  private months = new MonthsServiceImpl();
  private bills = new BillsServiceImpl();
  private incomes = new IncomesServiceImpl();
  private accounts = new PaymentSourcesServiceImpl();
  private categories = new CategoriesServiceImpl();

  private async prepare(month: string) {
    validateBudgetMonth(month);
    const data = await this.months.getMonthlyData(month);
    if (!data) throw new NotFoundError('Budget', month);
    const [bills, incomes, accounts] = await Promise.all([
      this.bills.getAll(),
      this.incomes.getAll(),
      this.accounts.getAll(),
    ]);
    const revision = digest({ data, bills, incomes, accounts });
    const excluded = new Set(data.excluded_budget_sources ?? []);
    const existingBills = new Set(data.bill_instances.map((instance) => instance.bill_id));
    const existingIncomes = new Set(data.income_instances.map((instance) => instance.income_id));
    const prepared: PreparedItem[] = [];
    for (const source of bills) {
      if (existingBills.has(source.id)) continue;
      const instance = createBillInstance(source, month);
      if (instance) prepared.push(this.sourceItem(`bill:${source.id}`, 'bill', instance, excluded));
    }
    for (const source of incomes) {
      if (existingIncomes.has(source.id)) continue;
      const instance = createIncomeInstance(source, month);
      if (instance)
        prepared.push(this.sourceItem(`income:${source.id}`, 'income', instance, excluded));
    }

    for (const [kind, instances, sources] of [
      ['bill', data.bill_instances, bills],
      ['income', data.income_instances, incomes],
    ] as const) {
      for (const instance of instances) {
        const id = 'bill_id' in instance ? instance.bill_id : instance.income_id;
        const source = sources.find((item) => item.id === id);
        if (!source) continue;
        const change = recurringBudgetChanges(kind, source, instance);
        if (change)
          prepared.push({
            item: change.item,
            instance,
            targets: change.targets,
            changeVersion: change.version,
          });
      }
    }

    // A sole matching recurring plan can take over an unpaid imported legacy
    // allocation. Linking keeps its monthly amount/dates instead of adding twice.
    for (const candidate of prepared) {
      if (candidate.item.operation === 'update') continue;
      const accountId = candidate.item.savings_account_id;
      if (
        !accountId ||
        candidate.instance?.billing_period !== 'monthly' ||
        candidate.instance.occurrences.length !== 1
      )
        continue;
      const matches = prepared.filter(
        (other) => other.item.operation !== 'update' && other.item.savings_account_id === accountId
      );
      const instances =
        candidate.item.kind === 'bill' ? data.bill_instances : data.income_instances;
      const legacy = instances.filter(
        (instance) =>
          instance.legacy_savings_account_id === accountId &&
          instance.expected_amount === candidate.item.amount &&
          instance.occurrences.length === 1 &&
          instance.occurrences.every((occurrence) => !occurrence.is_closed)
      );
      if (matches.length === 1 && legacy.length === 1) {
        candidate.linkId = legacy[0].id;
        candidate.item.operation = 'link';
        candidate.item.impact = 0;
        candidate.item.dates = legacy[0].occurrences.map((occurrence) => occurrence.expected_date);
        candidate.item.reason =
          'Link to the existing unlinked savings plan; keep this month’s amount and dates.';
      }
    }

    // Old per-account totals overlap recurring plans. The UI and apply operation
    // use the same selection-aware calculation to avoid importing both in full.
    for (const [accountId, target] of Object.entries(data.savings_contributions ?? {})) {
      if (!Number.isSafeInteger(target))
        throw new ValidationError(
          'An unlinked Savings amount is invalid. Correct it before reviewing this budget.'
        );
      const existing = savingsEntries(data, accountId).reduce(
        (sum, entry) => sum + entry.planned,
        0
      );
      const remaining = remainingLegacySavings(target, existing);
      if (remaining === 0) continue;
      const key = `legacy-savings:${accountId}`;
      const account = accounts.find((account) => account.id === accountId);
      const name = account?.name ?? 'Archived savings account';
      const kind = remaining > 0 ? 'bill' : 'income';
      const [year, monthNumber] = month.split('-').map(Number);
      const date = `${month}-${new Date(year, monthNumber, 0).getDate()}`;
      prepared.push({
        legacyAccountId: accountId,
        item: {
          key,
          kind,
          group: 'savings',
          name: `${remaining > 0 ? 'Savings' : 'Withdrawal'}: ${name}`,
          amount: Math.abs(remaining),
          dates: [date],
          impact: -remaining,
          excluded: excluded.has(key),
          savings_account_id: accountId,
          operation: 'add',
          legacy: { target, planned: existing },
          reason:
            'Previous unlinked Savings total. Existing budget entries and the other plans you select count toward it.',
        },
      });
    }
    const leftover = calculateUnifiedLeftover(data, accounts);
    const preview: BudgetUpdatePreview = {
      month,
      revision,
      is_read_only: data.is_read_only,
      available: leftover.isValid ? leftover.leftover : null,
      items: prepared.map((candidate) => candidate.item),
    };
    return { data, prepared, preview };
  }

  private sourceItem(
    key: string,
    kind: 'bill' | 'income',
    instance: BillInstance | IncomeInstance,
    excluded: Set<string>
  ): PreparedItem {
    return {
      instance,
      item: {
        key,
        kind,
        group: instance.savings_account_id ? 'savings' : kind === 'bill' ? 'expenses' : 'income',
        name: instance.name ?? 'Recurring item',
        amount: instance.expected_amount,
        dates: instance.occurrences.map((occurrence) => occurrence.expected_date),
        impact: (kind === 'bill' ? -1 : 1) * instance.expected_amount,
        excluded: excluded.has(key),
        operation: 'add',
        savings_account_id: instance.savings_account_id,
        reason: excluded.has(key)
          ? 'Previously skipped or removed from this month.'
          : 'Recurring plan is missing from this budget.',
      },
    };
  }

  preview(month: string): Promise<BudgetUpdatePreview> {
    return runWithDataAccess(async () => (await this.prepare(month)).preview);
  }

  apply(
    month: string,
    revision: string,
    selected: string[],
    skipped: string[]
  ): Promise<BudgetUpdateResult> {
    return runWithDataAccess(async () => {
      if (
        typeof revision !== 'string' ||
        !revision ||
        !Array.isArray(selected) ||
        !Array.isArray(skipped) ||
        ![...selected, ...skipped].every((key) => typeof key === 'string') ||
        new Set([...selected, ...skipped]).size !== selected.length + skipped.length
      ) {
        throw new ValidationError('Choose distinct budget updates to add or skip');
      }
      const { data, prepared, preview } = await this.prepare(month);
      if (data.is_read_only) throw new ReadOnlyError(month);
      const requestKey = digest({
        revision,
        selected: [...selected].sort(),
        skipped: [...skipped].sort(),
      });
      const result: BudgetUpdateResult = {
        month,
        added: 0,
        linked: 0,
        skipped: 0,
        updated: 0,
        kept: 0,
      };
      if (data.last_budget_update?.request_key === requestKey)
        return { ...result, already_applied: true };
      if (revision !== preview.revision)
        throw new ConflictError(
          'This budget or its recurring plans changed. Review the latest updates.'
        );
      const byKey = new Map<string, PreparedItem>();
      for (const candidate of prepared) {
        byKey.set(candidate.item.key, candidate);
        for (const target of candidate.targets ?? []) byKey.set(target.change.key, candidate);
      }
      if ([...selected, ...skipped].some((key) => !byKey.has(key)))
        throw new ConflictError('Some updates are no longer available. Refresh the review.');
      for (const candidate of prepared.filter((item) => item.targets)) {
        if (selected.includes(candidate.item.key))
          throw new ValidationError('Select individual amount or date changes');
        if (
          skipped.includes(candidate.item.key) &&
          candidate.targets!.some((target) => [...selected, ...skipped].includes(target.change.key))
        ) {
          throw new ValidationError('Keep the whole monthly plan or choose its fields, not both');
        }
      }
      const effective = new Map(
        effectiveBudgetUpdates(preview.items, selected).map((item) => [item.key, item])
      );
      const excluded = new Set(data.excluded_budget_sources ?? []);
      for (const key of skipped) {
        const candidate = byKey.get(key)!;
        if (candidate.targets) {
          const target = candidate.targets.find((target) => target.change.key === key);
          if (target) {
            target.occurrence.recurring_origin ??= target.origin;
            target.occurrence.recurring_review = {
              ...target.occurrence.recurring_review,
              [target.change.field]: { version: target.version, value: target.change.proposed },
            };
          } else {
            candidate.instance!.kept_recurring_revision = candidate.changeVersion;
            for (const field of candidate.targets) {
              field.occurrence.recurring_origin ??= field.origin;
              field.occurrence.recurring_review = {
                ...field.occurrence.recurring_review,
                [field.change.field]: { version: field.version, value: field.change.proposed },
              };
            }
          }
          result.kept!++;
        } else {
          excluded.add(key);
          result.skipped++;
        }
      }
      // Link sources before adding legacy remainders: both operations can refer
      // to the same previously unlinked row, regardless of request key order.
      const ordered = [...selected].sort(
        (a, b) => Number(!!byKey.get(a)!.legacyAccountId) - Number(!!byKey.get(b)!.legacyAccountId)
      );
      for (const key of ordered) {
        const candidate = byKey.get(key)!;
        if (candidate.targets) {
          const target = candidate.targets.find((target) => target.change.key === key)!;
          const { occurrence, change, version } = target;
          occurrence.recurring_origin ??= target.origin;
          // Targets come from the fresh preview; no client-supplied amounts/dates.
          if (change.field === 'expected_amount')
            occurrence.expected_amount = Number(change.proposed);
          else occurrence.expected_date = String(change.proposed);
          occurrence.recurring_review = {
            ...occurrence.recurring_review,
            [change.field]: { version, value: change.proposed },
          };
          occurrence.updated_at = new Date().toISOString();
          candidate.instance!.expected_amount = sumOccurrenceExpectedAmounts(
            candidate.instance!.occurrences
          );
          candidate.instance!.updated_at = occurrence.updated_at;
          candidate.instance!.is_default = false;
          result.updated!++;
          continue;
        }
        candidate.item = effective.get(key)!;
        if (candidate.legacyAccountId && candidate.item.amount === 0) {
          excluded.delete(key);
          continue;
        }
        if (candidate.legacyAccountId) await this.addLegacy(data, candidate);
        else if (candidate.linkId) {
          const instances =
            candidate.item.kind === 'bill' ? data.bill_instances : data.income_instances;
          const existing = instances.find((instance) => instance.id === candidate.linkId)!;
          const source = candidate.instance!;
          if ('bill_id' in existing && 'bill_id' in source) existing.bill_id = source.bill_id;
          if ('income_id' in existing && 'income_id' in source)
            existing.income_id = source.income_id;
          existing.source_snapshot = source.source_snapshot;
          existing.goal_id = source.goal_id;
          existing.payment_source_id = source.payment_source_id;
          existing.is_adhoc = false;
          // The matching unpaid allocation is now a scheduled occurrence. Its
          // existing date remains an explicit monthly override when different.
          existing.occurrences[0].is_adhoc = false;
          existing.occurrences[0].recurring_origin = source.occurrences[0].recurring_origin;
          delete existing.legacy_savings_account_id;
          existing.updated_at = new Date().toISOString();
          result.linked++;
        } else if (candidate.item.kind === 'bill')
          data.bill_instances.push(candidate.instance as BillInstance);
        else data.income_instances.push(candidate.instance as IncomeInstance);
        if (!candidate.linkId) result.added++;
        excluded.delete(key);
      }
      data.excluded_budget_sources = [...excluded];
      retireCoveredLegacySavings(data);
      data.last_budget_update = { request_key: requestKey };
      data.updated_at = new Date().toISOString();
      await this.months.saveMonthlyData(month, data);
      return result;
    });
  }

  private async addLegacy(data: MonthlyData, candidate: PreparedItem): Promise<void> {
    const { item, legacyAccountId } = candidate;
    const category =
      item.kind === 'bill'
        ? await this.categories.ensureGoalsCategoryExists()
        : await this.categories.ensureGoalCompletionsCategoryExists();
    const now = new Date().toISOString();
    const occurrence = createAdhocOccurrence(item.dates[0], item.amount);
    occurrence.sequence = 1;
    const instances = item.kind === 'bill' ? data.bill_instances : data.income_instances;
    const existing = instances.find(
      (instance) => instance.legacy_savings_account_id === legacyAccountId
    );
    if (existing) {
      occurrence.sequence = Math.max(0, ...existing.occurrences.map((item) => item.sequence)) + 1;
      existing.occurrences.push(occurrence);
      existing.expected_amount = sumOccurrenceExpectedAmounts(existing.occurrences);
      existing.is_closed = false;
      existing.closed_date = undefined;
      existing.updated_at = now;
      return;
    }
    const common = {
      id: crypto.randomUUID(),
      month: data.month,
      name: item.name,
      category_id: category.id,
      savings_account_id: legacyAccountId,
      legacy_savings_account_id: legacyAccountId,
      billing_period: 'monthly',
      expected_amount: item.amount,
      occurrences: [occurrence],
      is_default: false,
      is_closed: false,
      is_adhoc: true,
      created_at: now,
      updated_at: now,
    };
    if (item.kind === 'bill') data.bill_instances.push({ ...common, bill_id: null });
    else data.income_instances.push({ ...common, income_id: null });
  }
}
