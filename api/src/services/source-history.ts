import type { Bill, Income, MonthlyData } from '../types';
import type { StorageService } from './storage';

// Field-specific generations distinguish A→B→A from an unchanged source, while
// unrelated metadata edits do not invalidate a monthly keep decision.
export function recurringRevisions(before: Bill | Income, after: Bill | Income) {
  const revisions: NonNullable<Bill['recurring_revisions']> = { ...before.recurring_revisions };
  if (before.amount !== after.amount) revisions.amount = crypto.randomUUID();
  const schedule = (source: Bill | Income) => [
    source.billing_period,
    source.start_date,
    source.day_of_month,
    source.recurrence_week,
    source.recurrence_day,
    source.effective_from,
  ];
  if (JSON.stringify(schedule(before)) !== JSON.stringify(schedule(after)))
    revisions.schedule = crypto.randomUUID();
  return revisions;
}

export function sourceSnapshot(source: Bill | Income) {
  return {
    name: source.name,
    category_id: source.category_id,
    payment_source_id: source.payment_source_id,
    goal_id: source.goal_id,
    savings_account_id:
      source.savings_account_id ?? (source.goal_id ? source.payment_source_id : undefined),
    metadata: structuredClone(source.metadata),
    source_snapshot: structuredClone(source),
  };
}

/** Backfill old records while the source still exists, before editing/deleting it. */
export async function preserveSourceHistory(
  storage: StorageService,
  kind: 'bill' | 'income',
  source: Bill | Income
): Promise<void> {
  for (const file of await storage.listFiles('data/months')) {
    if (!file.endsWith('.json')) continue;
    const path = `data/months/${file}`;
    const month = await storage.readJSON<MonthlyData>(path);
    if (!month) continue;
    let changed = false;
    const instances =
      kind === 'bill'
        ? [
            ...month.bill_instances,
            ...(month.paused_goal_contributions ?? []).map(({ instance }) => instance),
          ]
        : month.income_instances;
    for (const instance of instances) {
      const sourceId = 'bill_id' in instance ? instance.bill_id : instance.income_id;
      if (sourceId !== source.id || instance.source_snapshot) continue;
      instance.name ??= source.name;
      instance.category_id ??= source.category_id;
      instance.payment_source_id ??= source.payment_source_id;
      instance.goal_id ??= source.goal_id;
      instance.savings_account_id ??=
        source.savings_account_id ??
        (source.goal_id ? (instance.payment_source_id ?? source.payment_source_id) : undefined);
      instance.metadata ??= structuredClone(source.metadata);
      instance.source_snapshot = structuredClone(source);
      changed = true;
    }
    // This adds historical identity only, including for locked records. Amounts,
    // occurrences, monthly overrides and timestamps are preserved.
    if (changed) await storage.writeJSON(path, month);
  }
}
