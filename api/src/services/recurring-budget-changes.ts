import { createHash } from 'node:crypto';
import type { Bill, Income, BillInstance, IncomeInstance, Occurrence } from '../types';
import type { BudgetUpdateItem, BudgetFieldChange } from '../types/budget-workflow';
import {
  applyOccurrenceEdits,
  generateBillOccurrences,
  generateIncomeOccurrences,
} from '../utils/occurrences';
import { ValidationError } from '../utils/errors';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export interface RecurringChangeTarget {
  occurrence: Occurrence;
  change: BudgetFieldChange;
  version: string;
  origin?: Occurrence['recurring_origin'];
}

export function recurringBudgetChanges(
  kind: 'bill' | 'income',
  source: Bill | Income,
  instance: BillInstance | IncomeInstance
): { item: BudgetUpdateItem; targets: RecurringChangeTarget[]; version: string } | null {
  if (
    !source.is_active ||
    ('goal_status' in source && source.goal_status && source.goal_status !== 'saving')
  )
    return null;
  if (
    instance.is_adhoc ||
    instance.is_virtual ||
    instance.claim_id ||
    ('is_payoff_bill' in instance && instance.is_payoff_bill)
  )
    return null;
  const snapshot = instance.source_snapshot;
  if (!snapshot) return null;
  if (!Number.isSafeInteger(source.amount) || source.amount < 0)
    throw new ValidationError('Recurring amounts must be non-negative integer cents');
  const generate = (definition: Bill | Income) =>
    kind === 'bill'
      ? generateBillOccurrences(definition as Bill, instance.month)
      : generateIncomeOccurrences(definition as Income, instance.month);
  const original = generate(snapshot);
  const latest = generate(source);
  latest.forEach((occurrence) =>
    applyOccurrenceEdits(occurrence, { expected_date: occurrence.expected_date }, instance.month)
  );
  const schedule = latest.map((occurrence) => occurrence.expected_date);
  const version = digest({
    amount: source.amount,
    schedule,
    period: source.billing_period,
    revisions: source.recurring_revisions,
  });
  if (instance.kept_recurring_revision === version) return null;
  const scheduleChanged =
    snapshot.billing_period !== source.billing_period ||
    JSON.stringify(original.map((occurrence) => occurrence.expected_date)) !==
      JSON.stringify(schedule);
  const amountChanged = snapshot.amount !== source.amount;
  const sameSlots =
    snapshot.billing_period === source.billing_period && original.length === latest.length;
  const targets: RecurringChangeTarget[] = [];
  const preserved: NonNullable<BudgetUpdateItem['preserved']> = [];
  const notices = new Set<string>();
  const key = `update:${kind}:${instance.id}`;
  for (const occurrence of instance.occurrences) {
    if (occurrence.is_closed) {
      preserved.push({
        date: occurrence.closed_date ?? occurrence.expected_date,
        amount: occurrence.expected_amount,
        reason: 'Recorded — preserved',
      });
      continue;
    }
    if (occurrence.is_adhoc) {
      if (amountChanged || scheduleChanged) {
        preserved.push({
          date: occurrence.expected_date,
          amount: occurrence.expected_amount,
          reason: 'Partial-payment remainder or extra entry — keep monthly plan',
        });
        notices.add(
          'Partial-payment remainders and extra entries stay as planned. Use Edit plan in Budget to adjust them explicitly.'
        );
      }
      continue;
    }
    // New records retain stable schedule slots even when monthly dates are edited
    // or occurrences are reordered. For older records, use an unambiguous date or
    // the original sequence only when the full occurrence structure is intact.
    let index = occurrence.recurring_origin?.index;
    if (index === undefined) {
      const matches = original
        .map((item, i) => (item.expected_date === occurrence.expected_date ? i : -1))
        .filter((i) => i >= 0);
      if (
        original.length === 1 &&
        instance.occurrences.filter((item) => !item.is_adhoc).length === 1
      )
        index = 0;
      else if (
        matches.length === 1 &&
        instance.occurrences.filter(
          (item) => !item.is_adhoc && item.expected_date === occurrence.expected_date
        ).length === 1
      )
        index = matches[0];
      else if (
        instance.is_default &&
        instance.occurrences.length === original.length &&
        instance.occurrences.every((item) => !item.is_adhoc)
      )
        index = occurrence.sequence - 1;
    }
    const baselineAmount = occurrence.recurring_origin?.amount ?? snapshot.amount;
    const baselineDate =
      occurrence.recurring_origin?.date ??
      (index === undefined ? undefined : original[index]?.expected_date);
    const proposedDate =
      sameSlots && index !== undefined
        ? latest[index]?.expected_date
        : snapshot.billing_period === source.billing_period &&
            latest.some((item) => item.expected_date === baselineDate)
          ? baselineDate
          : undefined;
    if (scheduleChanged && !proposedDate)
      notices.add(
        'The changed schedule cannot be matched safely to every monthly occurrence. Keep this month’s dates and adjust its plan in Budget.'
      );
    for (const field of ['expected_amount', 'expected_date'] as const) {
      const baseline = field === 'expected_amount' ? baselineAmount : baselineDate;
      const proposed = field === 'expected_amount' ? source.amount : proposedDate;
      if (baseline === undefined || proposed === undefined) continue;
      // A source no longer applicable in this month cannot update its amounts.
      if (!latest.length || snapshot.billing_period !== source.billing_period) continue;
      const fieldVersion = digest(
        field === 'expected_amount'
          ? { amount: source.amount, revision: source.recurring_revisions?.amount }
          : {
              schedule,
              period: source.billing_period,
              revision: source.recurring_revisions?.schedule,
            }
      );
      const previous = occurrence.recurring_review?.[field];
      const changed = previous ? previous.version !== fieldVersion : baseline !== proposed;
      if (!changed || occurrence[field] === proposed) continue;
      const change: BudgetFieldChange = {
        key: `${key}:${occurrence.id}:${field}`,
        occurrence_id: occurrence.id,
        field,
        date: occurrence.expected_date,
        original: previous?.value ?? baseline,
        current: occurrence[field],
        proposed,
        is_override: occurrence[field] !== (previous?.value ?? baseline),
        impact:
          field === 'expected_amount'
            ? (kind === 'bill' ? -1 : 1) * (Number(proposed) - occurrence.expected_amount)
            : 0,
      };
      targets.push({
        occurrence,
        change,
        version: fieldVersion,
        origin:
          index !== undefined && baselineDate !== undefined
            ? { index, amount: baselineAmount, date: baselineDate }
            : undefined,
      });
    }
  }
  if (!targets.length && !notices.size) return null;
  return {
    version,
    targets,
    item: {
      key,
      kind,
      operation: 'update',
      excluded: false,
      group: instance.savings_account_id ? 'savings' : kind === 'bill' ? 'expenses' : 'income',
      savings_account_id: instance.savings_account_id,
      name: instance.name ?? snapshot.name,
      amount: instance.expected_amount,
      dates: instance.occurrences
        .filter((occurrence) => !occurrence.is_closed)
        .map((occurrence) => occurrence.expected_date),
      impact: 0,
      reason: 'Recurring amounts or dates changed. Choose which unpaid entries to update.',
      changes: targets.map((target) => target.change),
      preserved,
      notices: [...notices],
    },
  };
}
