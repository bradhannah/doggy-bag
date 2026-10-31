// Wire contracts shared by the API and Svelte for the Savings page.
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

/** Why a recurring item was not added to an existing month. */
export type AddToMonthReason =
  | 'month_missing'
  | 'locked'
  | 'already_present'
  | 'excluded'
  | 'no_occurrences'
  | 'not_found';

export interface AddToMonthResult {
  added: boolean;
  reason?: AddToMonthReason;
}

export interface SavingsPlanResult extends Partial<AddToMonthResult> {
  month: string;
  recurring: boolean;
}
