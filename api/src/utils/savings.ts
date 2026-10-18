import type {
  Bill,
  Income,
  BillInstance,
  IncomeInstance,
  MonthlyData,
  PaymentSource,
} from '../types';
import { sumClosedOccurrenceAmounts } from './tally';

export function isSavingsAccount(account: PaymentSource): boolean {
  return (
    account.is_savings === true || account.is_investment === true || account.type === 'investment'
  );
}

export function isSpendingAccount(account: PaymentSource): boolean {
  return (
    account.is_active &&
    !isSavingsAccount(account) &&
    !account.exclude_from_leftover &&
    (account.type === 'bank_account' || account.type === 'cash')
  );
}

// Older goal schedules stored their destination as payment_source_id. Resolve
// that historical convention once, then keep an explicit destination on records.
export function savingsAccountId(
  instance: BillInstance | IncomeInstance,
  source?: Bill | Income
): string | undefined {
  const snapshot = instance.source_snapshot ?? source;
  return (
    instance.savings_account_id ??
    snapshot?.savings_account_id ??
    (instance.goal_id || snapshot?.goal_id
      ? (instance.payment_source_id ?? snapshot?.payment_source_id)
      : undefined)
  );
}

export function annotateSavingsAccounts(data: MonthlyData, bills: Bill[], incomes: Income[]): void {
  const billMap = new Map(bills.map((bill) => [bill.id, bill]));
  const incomeMap = new Map(incomes.map((income) => [income.id, income]));
  for (const instance of data.bill_instances) {
    const id = savingsAccountId(
      instance,
      instance.bill_id ? billMap.get(instance.bill_id) : undefined
    );
    if (id) instance.savings_account_id = id;
  }
  for (const instance of data.income_instances) {
    const id = savingsAccountId(
      instance,
      instance.income_id ? incomeMap.get(instance.income_id) : undefined
    );
    if (id) instance.savings_account_id = id;
  }
}

export interface SavingsEntry {
  id: string;
  kind: 'bill' | 'income';
  name: string;
  planned: number;
  recorded: number;
  goal_id?: string;
}

export function savingsEntries(data: MonthlyData, accountId: string): SavingsEntry[] {
  const entries: SavingsEntry[] = [];
  for (const [kind, instances, sign] of [
    ['bill', data.bill_instances, 1],
    ['income', data.income_instances, -1],
  ] as const) {
    for (const instance of instances) {
      if (savingsAccountId(instance) !== accountId) continue;
      entries.push({
        id: instance.id,
        kind,
        name: instance.name ?? instance.source_snapshot?.name ?? 'Savings transfer',
        planned: sign * instance.expected_amount,
        recorded: sign * sumClosedOccurrenceAmounts(instance.occurrences ?? []),
        goal_id: instance.goal_id,
      });
    }
  }
  return entries;
}

export function remainingLegacySavings(target: number, covered: number): number {
  return target >= 0 ? Math.max(0, target - covered) : Math.min(0, target - covered);
}

// Retire old hints only when the budget actually covers them. New source plans
// which have not been applied to this month do not count as coverage.
export function retireCoveredLegacySavings(data: MonthlyData): void {
  for (const [accountId, target] of Object.entries(data.savings_contributions ?? {})) {
    if (target === 0) continue;
    const covered = savingsEntries(data, accountId).reduce((sum, entry) => sum + entry.planned, 0);
    if (remainingLegacySavings(target, covered) === 0)
      delete data.savings_contributions![accountId];
  }
}

export function budgetSourceKey(instance: BillInstance | IncomeInstance): string | undefined {
  if ('bill_id' in instance && instance.bill_id) return `bill:${instance.bill_id}`;
  if ('income_id' in instance && instance.income_id) return `income:${instance.income_id}`;
  if (instance.legacy_savings_account_id)
    return `legacy-savings:${instance.legacy_savings_account_id}`;
  return undefined;
}

export function excludeBudgetInstance(
  data: MonthlyData,
  instance: BillInstance | IncomeInstance
): void {
  retireCoveredLegacySavings(data);
  const key = budgetSourceKey(instance);
  if (key)
    data.excluded_budget_sources = [...new Set([...(data.excluded_budget_sources ?? []), key])];
}
