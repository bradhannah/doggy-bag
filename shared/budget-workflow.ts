// Wire contracts and pure selection calculations shared by the API and Svelte.
export interface BudgetUpdateItem {
  key: string;
  kind: 'bill' | 'income';
  group: 'expenses' | 'income' | 'savings';
  name: string;
  amount: number;
  dates: string[];
  impact: number; // Change in available budget, in cents
  excluded: boolean;
  operation: 'add' | 'link' | 'update';
  reason: string;
  savings_account_id?: string;
  legacy?: { target: number; planned: number };
  changes?: BudgetFieldChange[];
  preserved?: { date: string; amount: number; reason: string }[];
  notices?: string[];
}

export interface BudgetFieldChange {
  key: string;
  occurrence_id: string;
  field: 'expected_amount' | 'expected_date';
  date: string;
  original: number | string;
  current: number | string;
  proposed: number | string;
  is_override: boolean;
  impact: number;
}

// A legacy account total overlaps linked plans. Compute its remaining addition
// from the actual selection, including any previously skipped plans being restored.
export function effectiveBudgetUpdates(
  items: BudgetUpdateItem[],
  selectedKeys: string[]
): BudgetUpdateItem[] {
  const selected = new Set(selectedKeys);
  const resolved = items.map((item) =>
    item.operation === 'update'
      ? {
          ...item,
          impact: (item.changes ?? [])
            .filter((change) => selected.has(change.key))
            .reduce((sum, change) => sum + change.impact, 0),
        }
      : item
  );
  return resolved.map((item) => {
    if (!item.legacy) return item;
    const covered =
      item.legacy.planned +
      resolved
        .filter(
          (other) =>
            !other.legacy &&
            other.savings_account_id === item.savings_account_id &&
            (other.operation === 'update' || selected.has(other.key))
        )
        .reduce((sum, other) => sum - other.impact, 0);
    const remaining =
      item.legacy.target >= 0
        ? Math.max(0, item.legacy.target - covered)
        : Math.min(0, item.legacy.target - covered);
    return { ...item, amount: Math.abs(remaining), impact: -remaining };
  });
}

export interface BudgetUpdatePreview {
  month: string;
  revision: string;
  is_read_only: boolean;
  available: number | null;
  items: BudgetUpdateItem[];
}

export interface BudgetUpdateResult {
  month: string;
  added: number;
  linked: number;
  skipped: number;
  updated?: number;
  kept?: number;
  already_applied?: boolean;
}

export interface SavingsAccountSummary {
  id: string;
  name: string;
  is_active: boolean;
  is_investment: boolean;
  start?: number;
  end?: number;
  planned: number;
  recorded: number;
  unbudgeted_legacy: number;
  entries: {
    id: string;
    kind: 'bill' | 'income';
    name: string;
    planned: number;
    recorded: number;
    goal_id?: string;
  }[];
}

export interface SavingsMonthSummary {
  month: string;
  exists: boolean;
  is_read_only: boolean;
  accounts: SavingsAccountSummary[];
  spending_accounts: { id: string; name: string }[];
}

export interface SavingsPlanRequest {
  month: string;
  savings_account_id: string;
  spending_account_id: string;
  direction: 'contribution' | 'withdrawal';
  recurring: boolean;
  amount: number;
  date: string;
  name?: string;
}
