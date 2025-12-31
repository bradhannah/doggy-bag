// BudgetForFun Type Definitions
// All entity interfaces, enums, and union types for the application

// ============================================================================
// Enums
// ============================================================================

type BillingPeriod = 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';

type PaymentSourceType = 'bank_account' | 'credit_card' | 'cash';

type UndoEntityType = 
  | 'bill' 
  | 'income' 
  | 'variable_expense' 
  | 'free_flowing_expense' 
  | 'payment_source' 
  | 'bill_instance' 
  | 'income_instance';

// ============================================================================
// Entity Interfaces
// ============================================================================

interface Bill {
  id: string;
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string; // ISO date string (YYYY-MM-DD), required for bi_weekly/weekly/semi_annually
  // For monthly billing: specify EITHER day_of_month OR (recurrence_week + recurrence_day)
  day_of_month?: number;      // 1-31 (use 31 for "last day of month")
  recurrence_week?: number;   // 1-5 (1st, 2nd, 3rd, 4th, 5th/last weekday of month)
  recurrence_day?: number;    // 0=Sunday, 1=Monday, ..., 6=Saturday
  payment_source_id: string;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BillInstance {
  id: string;
  bill_id: string;
  month: string;
  amount: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface Income {
  id: string;
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string; // ISO date string (YYYY-MM-DD), required for bi_weekly/weekly/semi_annually
  // For monthly billing: specify EITHER day_of_month OR (recurrence_week + recurrence_day)
  day_of_month?: number;      // 1-31 (use 31 for "last day of month")
  recurrence_week?: number;   // 1-5 (1st, 2nd, 3rd, 4th, 5th/last weekday of month)
  recurrence_day?: number;    // 0=Sunday, 1=Monday, ..., 6=Saturday
  payment_source_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface IncomeInstance {
  id: string;
  income_id: string;
  month: string;
  amount: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface VariableExpense {
  id: string;
  name: string;
  amount: number;
  payment_source_id: string;
  month: string;
  created_at: string;
  updated_at: string;
}

interface FreeFlowingExpense {
  id: string;
  name: string;
  amount: number;
  payment_source_id: string;
  month: string;
  created_at: string;
  updated_at: string;
}

interface PaymentSource {
  id: string;
  name: string;
  type: PaymentSourceType;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  is_predefined: boolean;
  created_at: string;
  updated_at: string;
}

interface MonthlyData {
  month: string;
  bill_instances: BillInstance[];
  income_instances: IncomeInstance[];
  variable_expenses: VariableExpense[];
  free_flowing_expenses: FreeFlowingExpense[];
  bank_balances: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface UndoEntry {
  id: string;
  entity_type: UndoEntityType;
  entity_id: string;
  old_value: any;
  new_value: any;
  timestamp: string;
}

interface BackupFileData {
  export_date: string;
  bills: Bill[];
  incomes: Income[];
  payment_sources: PaymentSource[];
  categories: Category[];
  months: MonthlyData[];
}

// ============================================================================
// Union Types (for convenience)
// ============================================================================

type Expense = VariableExpense | FreeFlowingExpense;

type Entity = 
  | Bill 
  | BillInstance 
  | Income 
  | IncomeInstance 
  | VariableExpense 
  | FreeFlowingExpense 
  | PaymentSource 
  | Category;

type DefaultEntity = Bill | Income | PaymentSource | Category;

type InstanceEntity = BillInstance | IncomeInstance;

// ============================================================================
// Validation Types
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// Exports
// ============================================================================

export type {
  BillingPeriod,
  PaymentSourceType,
  UndoEntityType,
  Bill,
  BillInstance,
  Income,
  IncomeInstance,
  VariableExpense,
  FreeFlowingExpense,
  PaymentSource,
  Category,
  MonthlyData,
  UndoEntry,
  BackupFileData,
  Expense,
  Entity,
  DefaultEntity,
  InstanceEntity,
  ValidationResult
};
