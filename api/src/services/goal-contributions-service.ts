import type { BillInstance, SavingsGoal, SavingsGoalStatus } from '../types';
import { BillsServiceImpl } from './bills-service';
import { MonthsServiceImpl } from './months-service';
import { getTodayLocalDateString } from '../utils/due-date';
import { sumOccurrenceExpectedAmounts } from '../utils/occurrences';
import { budgetSourceKey, retireCoveredLegacySavings, savingsAccountId } from '../utils/savings';

export interface GoalContributionScope {
  keep_current_month?: boolean;
}

function withOccurrences(
  instance: BillInstance,
  occurrences: BillInstance['occurrences']
): BillInstance {
  return {
    ...instance,
    occurrences,
    expected_amount: sumOccurrenceExpectedAmounts(occurrences),
    is_closed: occurrences.length > 0 && occurrences.every((occurrence) => occurrence.is_closed),
    updated_at: new Date().toISOString(),
  };
}

/** Called inside the goal update's data-access operation, before committing its status. */
export async function updateGoalContributions(
  goal: SavingsGoal,
  status: SavingsGoalStatus,
  scope: GoalContributionScope = {},
  today = getTodayLocalDateString()
): Promise<void> {
  const bills = new BillsServiceImpl();
  const months = new MonthsServiceImpl();
  const sources = await bills.getAll();
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const linked = sources.filter((source) => source.goal_id === goal.id);
  const resuming = status === 'saving';
  const pausing = status === 'paused';
  const resumable = new Set(
    linked
      .filter(
        (source) =>
          source.paused_by_goal_id === goal.id || (goal.status === 'paused' && source.is_active)
      )
      .map((source) => source.id)
  );
  const belongs = (instance: BillInstance) =>
    (instance.goal_id ??
      (instance.source_snapshot
        ? instance.source_snapshot.goal_id
        : sourceMap.get(instance.bill_id ?? '')?.goal_id)) === goal.id;

  // Read/migrate every record before changing the schedule. Recorded occurrences
  // stay in bill_instances; paused plans are separate and never count as payments.
  const records = await months.getAllMonthlyData();
  for (const data of records) {
    if (data.is_read_only || data.month < today.slice(0, 7)) continue;
    if (!resuming && scope.keep_current_month && data.month === today.slice(0, 7)) continue;
    let changed = false;
    const paused = data.paused_goal_contributions ?? [];
    retireCoveredLegacySavings(data);

    if (resuming) {
      for (const saved of paused.filter(({ instance }) => belongs(instance))) {
        const key = budgetSourceKey(saved.instance);
        if (key && data.excluded_budget_sources?.includes(key)) continue;
        if (saved.instance.bill_id && !resumable.has(saved.instance.bill_id)) continue;
        const upcoming = saved.instance.occurrences.filter(
          (occurrence) => occurrence.expected_date >= today
        );
        if (!upcoming.length) continue;
        const existing = data.bill_instances.find(
          (instance) =>
            instance.id === saved.instance.id ||
            (saved.instance.bill_id && instance.bill_id === saved.instance.bill_id)
        );
        const ids = new Set(existing?.occurrences.map((occurrence) => occurrence.id));
        const restored = upcoming.filter((occurrence) => !ids.has(occurrence.id));
        if (existing) {
          Object.assign(
            existing,
            withOccurrences(
              existing,
              [...existing.occurrences, ...restored].sort((a, b) =>
                a.expected_date.localeCompare(b.expected_date)
              )
            )
          );
        } else {
          data.bill_instances.push(withOccurrences(saved.instance, restored));
        }
        const account = savingsAccountId(saved.instance);
        if (saved.legacy_hint_adjusted && account && data.savings_contributions?.[account]) {
          data.savings_contributions[account] += sumOccurrenceExpectedAmounts(restored);
        }
        changed = true;
      }
      // Missed dates and explicitly stopped/excluded plans are not backfilled.
      data.paused_goal_contributions = paused.filter(({ instance }) => !belongs(instance));
      changed ||= paused.length !== data.paused_goal_contributions.length;
    } else {
      const retained: BillInstance[] = [];
      for (const instance of data.bill_instances) {
        if (!belongs(instance)) {
          retained.push(instance);
          continue;
        }
        const unpaid = instance.occurrences.filter((occurrence) => !occurrence.is_closed);
        if (!unpaid.length) {
          retained.push(instance);
          continue;
        }
        const paid = instance.occurrences.filter((occurrence) => occurrence.is_closed);
        if (paid.length) retained.push(withOccurrences(instance, paid));
        const account = savingsAccountId(instance);
        const adjusted = !!(account && (data.savings_contributions?.[account] ?? 0) > 0);
        // Keep the unapplied part of an inclusive legacy account plan constant.
        if (adjusted && account)
          data.savings_contributions![account] -= sumOccurrenceExpectedAmounts(unpaid);
        if (pausing)
          paused.push({
            instance: { ...withOccurrences(instance, unpaid), goal_id: goal.id },
            legacy_hint_adjusted: adjusted,
          });
        changed = true;
      }
      data.bill_instances = retained;
      data.paused_goal_contributions = pausing
        ? paused
        : paused.filter(({ instance }) => !belongs(instance));
      changed ||= paused.length !== data.paused_goal_contributions.length;
    }
    if (changed) await months.saveMonthlyData(data.month, data);
  }

  for (const source of linked) {
    if (resuming) {
      if (!resumable.has(source.id)) continue;
      await bills.update(source.id, {
        is_active: true,
        paused_by_goal_id: undefined,
        // Keep the recurrence anchor; only advance its effective lower bound.
        effective_from:
          source.effective_from && source.effective_from > today ? source.effective_from : today,
      });
    } else if (source.is_active || source.paused_by_goal_id) {
      await bills.update(source.id, {
        is_active: false,
        paused_by_goal_id: pausing ? goal.id : undefined,
      });
    }
  }
}
