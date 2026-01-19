// Projections Types

export interface ProjectionResponse {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  starting_balance: number;
  days: {
    date: string;
    balance: number | null;
    has_balance: boolean;
    income: number;
    expense: number;
    events: {
      name: string;
      amount: number;
      type: 'income' | 'expense';
      kind?: 'actual' | 'scheduled';
    }[];
    is_deficit: boolean;
  }[];
  overdue_bills: { name: string; amount: number; due_date: string }[];
}
