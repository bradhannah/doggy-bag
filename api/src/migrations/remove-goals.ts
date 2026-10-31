// One-time migration: fold savings goals into ordinary savings plans.
//
// Goals were a layer on top of recurring bills: a goal's contribution schedule was a bill
// carrying goal_id, and the goal record named the account it saved into. Savings now works
// from savings_account_id alone, so this migration:
//   - links each goal bill/income and their monthly instances to the goal's account, but only
//     when that account is a savings or investment account; a goal "linked" to a chequing
//     account becomes an ordinary bill in the Savings category,
//   - keeps a monthly goal bill's start date as its effective date (goal bills were never
//     backdated into earlier months),
//   - deactivates schedules whose goal is no longer saving (the goal status used to hide them),
//   - turns the "savings_goal" category type into a plain bill category,
//   - drops goal_id, paused_by_goal_id and paused_goal_contributions everywhere.
// savings-goals.json is left on disk, unread. A backup is taken first, into <data>/backups.

import { join } from 'node:path';
import type { StorageService } from '../services/storage';
import type {
  Bill,
  BillInstance,
  Category,
  Income,
  IncomeInstance,
  MonthlyData,
  PaymentSource,
} from '../types';
import { isSavingsAccount } from '../utils/savings';
import { createBackup } from './backup';

type GoalStatus = 'saving' | 'paused' | 'bought' | 'abandoned' | 'archived';
interface LegacyGoal {
  id: string;
  status: GoalStatus;
  linked_account_id?: string;
}
/** Where a goal's money went, when that is a real savings account; undefined otherwise. */
type Destinations = Map<string, string | undefined>;
type LegacySource = (Bill | Income) & { goal_id?: string; paused_by_goal_id?: string };
type LegacyInstance = (BillInstance | IncomeInstance) & {
  goal_id?: string;
  source_snapshot?: LegacySource;
};
type LegacyMonth = MonthlyData & { paused_goal_contributions?: unknown };
type LegacyCategory = Omit<Category, 'type'> & { type: Category['type'] | 'savings_goal' };

export interface RemoveGoalsResult {
  changed: boolean;
  backupPath?: string;
  sources: number;
  months: number;
  categories: number;
}

const hasGoalFields = (record: object) => 'goal_id' in record || 'paused_by_goal_id' in record;

/** Apply the goal's destination: a savings account links the record, anything else unlinks it. */
function linkToGoalAccount(
  record: { goal_id?: string; savings_account_id?: string },
  destinations: Destinations
): void {
  if (!record.goal_id) return;
  const destination = destinations.get(record.goal_id);
  if (destination) record.savings_account_id = destination;
  else delete record.savings_account_id;
}

function convertSource(
  source: LegacySource,
  statuses: Map<string, GoalStatus>,
  destinations: Destinations
): boolean {
  if (!hasGoalFields(source)) return false;
  linkToGoalAccount(source, destinations);
  if ('day_of_month' in source && source.billing_period === 'monthly' && source.start_date) {
    source.effective_from ??= source.start_date;
  }
  const status = source.goal_id ? statuses.get(source.goal_id) : undefined;
  if (source.goal_id && status !== 'saving') source.is_active = false;
  delete source.goal_id;
  delete source.paused_by_goal_id;
  return true;
}

function convertInstance(instance: LegacyInstance, destinations: Destinations): boolean {
  let changed = false;
  if ('goal_id' in instance) {
    linkToGoalAccount(instance, destinations);
    delete instance.goal_id;
    changed = true;
  }
  const snapshot = instance.source_snapshot;
  if (snapshot && hasGoalFields(snapshot)) {
    linkToGoalAccount(snapshot, destinations);
    delete snapshot.goal_id;
    delete snapshot.paused_by_goal_id;
    changed = true;
  }
  return changed;
}

export async function migrateGoalsToSavings(
  storage: StorageService,
  dataDir: string
): Promise<RemoveGoalsResult> {
  const goals = (await storage.readJSON<LegacyGoal[]>('data/entities/savings-goals.json')) ?? [];
  const statuses = new Map(goals.map((goal) => [goal.id, goal.status]));
  const accounts =
    (await storage.readJSON<PaymentSource[]>('data/entities/payment-sources.json')) ?? [];
  const destinations: Destinations = new Map(
    goals.map((goal) => {
      const account = accounts.find((candidate) => candidate.id === goal.linked_account_id);
      return [goal.id, account && isSavingsAccount(account) ? account.id : undefined];
    })
  );

  const bills = (await storage.readJSON<LegacySource[]>('data/entities/bills.json')) ?? [];
  const incomes = (await storage.readJSON<LegacySource[]>('data/entities/incomes.json')) ?? [];
  const categories =
    (await storage.readJSON<LegacyCategory[]>('data/entities/categories.json')) ?? [];

  let sources = 0;
  for (const source of [...bills, ...incomes]) {
    if (convertSource(source, statuses, destinations)) sources++;
  }

  let categoriesChanged = 0;
  for (const category of categories) {
    if (category.type !== 'savings_goal') continue;
    category.type = 'bill';
    if (category.name === 'Savings Goals' || category.name === 'Goals') category.name = 'Savings';
    categoriesChanged++;
  }

  const changedMonths: { path: string; data: LegacyMonth }[] = [];
  for (const file of await storage.listFiles('data/months')) {
    if (!/^\d{4}-\d{2}\.json$/.test(file)) continue;
    const path = `data/months/${file}`;
    const data = await storage.readJSON<LegacyMonth>(path);
    if (!data) continue;
    let changed = false;
    for (const instance of [...data.bill_instances, ...data.income_instances]) {
      if (convertInstance(instance as LegacyInstance, destinations)) changed = true;
    }
    if ('paused_goal_contributions' in data) {
      delete data.paused_goal_contributions;
      changed = true;
    }
    if (changed) changedMonths.push({ path, data });
  }

  const result: RemoveGoalsResult = {
    changed: sources > 0 || categoriesChanged > 0 || changedMonths.length > 0,
    sources,
    months: changedMonths.length,
    categories: categoriesChanged,
  };
  if (!result.changed) return result;

  const backup = createBackup(dataDir, join(dataDir, 'backups'), 'pre-remove-goals');
  if (!backup.success) throw new Error(`Backup before removing goals failed: ${backup.error}`);
  result.backupPath = backup.backupPath;

  if (sources > 0) {
    await storage.writeJSON('data/entities/bills.json', bills);
    await storage.writeJSON('data/entities/incomes.json', incomes);
  }
  if (categoriesChanged > 0) await storage.writeJSON('data/entities/categories.json', categories);
  for (const month of changedMonths) await storage.writeJSON(month.path, month.data);
  return result;
}
