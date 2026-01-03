// BudgetForFun Type Definitions
// All entity interfaces, enums, and union types for the application

// ============================================================================
// Enums
// ============================================================================

type BillingPeriod = 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';

type PaymentSourceType = 'bank_account' | 'credit_card' | 'line_of_credit' | 'cash';

// Helper to determine if a payment source type is a debt account
// Debt accounts have their balance displayed as negative (money owed)
const DEBT_ACCOUNT_TYPES: PaymentSourceType[] = ['credit_card', 'line_of_credit'];

type CategoryType = 'bill' | 'income' | 'variable';

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
  due_day?: number;           // NEW: Day of month when due (1-31)
  is_active: boolean;
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
  category_id?: string;       // NEW: Reference to income category
  due_day?: number;           // NEW: Day of month when expected (1-31)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Payment (for partial payment tracking)
// ============================================================================

interface Payment {
  id: string;
  amount: number;
  date: string;          // ISO date (YYYY-MM-DD)
  payment_source_id?: string; // Which account the payment came from
  created_at: string;
}

// ============================================================================
// Occurrence (individual payment instance within a billing period)
// ============================================================================

interface Occurrence {
  id: string;
  sequence: number;           // 1, 2, 3... for ordering within the month
  expected_date: string;      // YYYY-MM-DD - calculated from due_day/start_date, overridable
  expected_amount: number;    // Cents - can be edited independently per occurrence
  is_closed: boolean;         // Close/Open status for this occurrence
  closed_date?: string;       // When closed (YYYY-MM-DD)
  payments: Payment[];        // Payments toward this specific occurrence
  is_adhoc: boolean;          // True if manually added by user
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Instance Interfaces (Extended for Detailed Monthly View)
// ============================================================================

interface BillInstance {
  id: string;
  bill_id: string | null;     // null for ad-hoc bills
  month: string;
  billing_period: string;     // Copied from Bill for display
  amount: number;             // DEPRECATED: use expected_amount
  expected_amount: number;    // Sum of all occurrence expected_amounts
  actual_amount?: number;     // DEPRECATED: computed from occurrence payments
  payments: Payment[];        // DEPRECATED: payments now on occurrences
  occurrences: Occurrence[];  // NEW: Individual occurrences for this instance
  is_default: boolean;
  is_paid: boolean;           // DEPRECATED: use is_closed instead
  is_closed: boolean;         // True when ALL occurrences are closed
  is_adhoc: boolean;          // True for one-time ad-hoc items
  is_payoff_bill?: boolean;   // True if auto-generated from pay_off_monthly payment source
  payoff_source_id?: string;  // Reference to the payment source this payoff bill is for
  due_date?: string;          // DEPRECATED: use occurrence expected_date
  closed_date?: string;       // ISO date when fully closed (YYYY-MM-DD)
  name?: string;              // For ad-hoc items (bill_id is null)
  category_id?: string;       // For ad-hoc items (no bill reference)
  payment_source_id?: string; // For ad-hoc items (no bill reference)
  created_at: string;
  updated_at: string;
}

interface IncomeInstance {
  id: string;
  income_id: string | null;   // null for ad-hoc income
  month: string;
  billing_period: string;     // Copied from Income for display
  amount: number;             // DEPRECATED: use expected_amount
  expected_amount: number;    // Sum of all occurrence expected_amounts
  actual_amount?: number;     // DEPRECATED: computed from occurrence payments
  payments: Payment[];        // DEPRECATED: payments now on occurrences
  occurrences: Occurrence[];  // NEW: Individual occurrences for this instance
  is_default: boolean;
  is_paid: boolean;           // DEPRECATED: use is_closed instead
  is_closed: boolean;         // True when ALL occurrences are closed
  is_adhoc: boolean;          // True for one-time ad-hoc items
  due_date?: string;          // DEPRECATED: use occurrence expected_date
  closed_date?: string;       // ISO date when fully closed (YYYY-MM-DD)
  name?: string;              // For ad-hoc items (income_id is null)
  category_id?: string;       // For ad-hoc items (no income reference)
  payment_source_id?: string; // For ad-hoc items (no income reference)
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Other Entity Interfaces
// ============================================================================

interface VariableExpense {
  id: string;
  name: string;
  amount: number;
  payment_source_id: string;
  month: string;
  created_at: string;
  updated_at: string;
}

type VariableExpenseFrequency = 'weekly' | 'biweekly' | 'monthly' | 'as_needed';

interface VariableExpenseTemplate {
  id: string;
  name: string;
  category_id?: string;           // Optional category for grouping
  payment_source_id?: string;     // Default payment source
  estimated_amount?: number;      // Hint for budgeting (cents)
  frequency: VariableExpenseFrequency;
  notes?: string;                 // User reminder
  is_active: boolean;
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
  exclude_from_leftover?: boolean;  // If true, balance not included in leftover calculation
  pay_off_monthly?: boolean;        // If true, auto-generate payoff bill (implies exclude_from_leftover)
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  is_predefined: boolean;
  sort_order: number;         // NEW: Display order (0 = first)
  color: string;              // NEW: Hex color for header accent (e.g., "#3b82f6")
  type: CategoryType;         // NEW: 'bill' | 'income'
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
  is_read_only: boolean;        // Lock month from edits
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
// Detailed View Types (for API responses)
// ============================================================================

interface SectionTally {
  expected: number;
  actual: number;
  remaining: number;
}

interface CategorySection {
  category: {
    id: string;
    name: string;
    color: string;
    sort_order: number;
    type?: CategoryType;
  };
  items: BillInstanceDetailed[] | IncomeInstanceDetailed[];
  subtotal: {
    expected: number;
    actual: number;
  };
}

interface BillInstanceDetailed {
  id: string;
  bill_id: string | null;
  name: string;
  billing_period: string;
  expected_amount: number;
  actual_amount: number | null;
  payments: Payment[];        // DEPRECATED: use occurrences
  occurrences: Occurrence[];  // NEW: Individual occurrences
  occurrence_count: number;   // NEW: How many occurrences in this month
  is_extra_occurrence_month: boolean; // NEW: True if more occurrences than usual
  total_paid: number;
  remaining: number;
  is_paid: boolean;           // DEPRECATED: use is_closed instead
  is_closed: boolean;         // True = no more transactions expected
  is_adhoc: boolean;
  is_payoff_bill: boolean;    // True if auto-generated from pay_off_monthly payment source
  payoff_source_id?: string;  // Reference to the payment source this payoff bill is for
  due_date: string | null;    // DEPRECATED: use occurrence expected_date
  closed_date: string | null; // ISO date when closed
  is_overdue: boolean;
  days_overdue: number | null;
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
}

interface IncomeInstanceDetailed {
  id: string;
  income_id: string | null;
  name: string;
  billing_period: string;
  expected_amount: number;
  actual_amount: number | null;
  payments: Payment[];        // DEPRECATED: use occurrences
  occurrences: Occurrence[];  // NEW: Individual occurrences
  occurrence_count: number;   // NEW: How many occurrences in this month
  is_extra_occurrence_month: boolean; // NEW: True if more occurrences than usual (3-paycheck month!)
  total_received: number;     // Sum of all payments
  remaining: number;          // expected - total_received
  is_paid: boolean;           // DEPRECATED: use is_closed instead
  is_closed: boolean;         // True = no more transactions expected
  is_adhoc: boolean;
  due_date: string | null;    // DEPRECATED: use occurrence expected_date
  closed_date: string | null; // ISO date when closed
  is_overdue: boolean;
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
}

interface LeftoverBreakdown {
  bankBalances: number;        // Current cash position (snapshot from bank_balances)
  remainingIncome: number;     // Income still expected to receive
  remainingExpenses: number;   // Expenses still need to pay (including payoff bills)
  leftover: number;            // bank + remainingIncome - remainingExpenses
  isValid: boolean;            // False if required bank balances are missing
  hasActuals?: boolean;        // True if any actuals have been entered
  missingBalances?: string[];  // IDs of payment sources missing balances
  errorMessage?: string;       // Human-readable error message
}

/**
 * Unified leftover calculation result
 * Used by calculateUnifiedLeftover() utility
 */
interface UnifiedLeftoverResult {
  bankBalances: number;        // Current cash position (snapshot)
  remainingIncome: number;     // Income still expected to receive
  remainingExpenses: number;   // Expenses still need to pay
  leftover: number;            // Final: bank + income - expenses
  isValid: boolean;            // True if calculation is valid
  missingBalances: string[];   // IDs of payment sources missing balances
  errorMessage?: string;       // Human-readable error if not valid
}

interface PayoffSummary {
  paymentSourceId: string;
  paymentSourceName: string;
  balance: number;         // Current CC balance (expected payoff)
  paid: number;            // Sum of payments made this month toward payoff
  remaining: number;       // balance - paid
}

interface DetailedMonthResponse {
  month: string;
  billSections: CategorySection[];
  incomeSections: CategorySection[];
  tallies: {
    bills: SectionTally;           // Regular bills (with expected amounts)
    adhocBills: SectionTally;      // Ad-hoc bills (actual only)
    ccPayoffs: SectionTally;       // Credit card payoff bills
    totalExpenses: SectionTally;   // Combined total
    income: SectionTally;          // Regular income
    adhocIncome: SectionTally;     // Ad-hoc income
    totalIncome: SectionTally;     // Combined total
  };
  leftover: number;
  leftoverBreakdown: LeftoverBreakdown;
  payoffSummaries: PayoffSummary[];  // Summary of each CC payoff status
  bankBalances: Record<string, number>;
  lastUpdated: string;
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
  CategoryType,
  UndoEntityType,
  VariableExpenseFrequency,
  Bill,
  Income,
  Payment,
  Occurrence,
  BillInstance,
  IncomeInstance,
  VariableExpense,
  VariableExpenseTemplate,
  FreeFlowingExpense,
  PaymentSource,
  Category,
  MonthlyData,
  UndoEntry,
  BackupFileData,
  SectionTally,
  CategorySection,
  BillInstanceDetailed,
  IncomeInstanceDetailed,
  LeftoverBreakdown,
  UnifiedLeftoverResult,
  PayoffSummary,
  DetailedMonthResponse,
  Expense,
  Entity,
  DefaultEntity,
  InstanceEntity,
  ValidationResult
};

export { DEBT_ACCOUNT_TYPES };
