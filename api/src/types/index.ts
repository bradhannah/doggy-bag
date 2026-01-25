// Doggy Bag Type Definitions
// All entity interfaces, enums, and union types for the application

// ============================================================================
// Common Type Aliases
// ============================================================================

/** ISO date string in YYYY-MM-DD format */
type DateString = string;

/** ISO datetime string in full ISO 8601 format (e.g., 2024-01-15T10:30:00.000Z) */
type ISODateTimeString = string;

// ============================================================================
// Enums
// ============================================================================

type BillingPeriod = 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';

type PaymentSourceType = 'bank_account' | 'credit_card' | 'line_of_credit' | 'cash' | 'investment';

// Helper to determine if a payment source type is a debt account
// Debt accounts have their balance displayed as negative (money owed)
const DEBT_ACCOUNT_TYPES: PaymentSourceType[] = ['credit_card', 'line_of_credit'];

// Helper to determine if a payment source type is an investment account
const INVESTMENT_ACCOUNT_TYPES: PaymentSourceType[] = ['investment'];

type CategoryType = 'bill' | 'income' | 'variable' | 'savings_goal';

type PaymentMethod = 'auto' | 'manual';

// ============================================================================
// Shared Metadata Interface
// ============================================================================

/**
 * EntityMetadata - Common metadata fields for Bills and Incomes
 * This is copied to monthly instances as a point-in-time snapshot
 */
interface EntityMetadata {
  bank_transaction_name?: string; // Name as it appears on bank statement
  account_number?: string; // Account/reference number
  account_url?: string; // URL to manage/pay the bill or view income source
  notes?: string; // Freeform notes
}

/**
 * PaymentSourceMetadata - Metadata fields for Payment Sources
 * Fields are conditional based on payment source type:
 * - last_four_digits: All types
 * - credit_limit: credit_card, line_of_credit
 * - interest_rate: All types
 * - interest_rate_cash_advance: credit_card only
 * - is_variable_rate: line_of_credit, savings, investment
 * - statement_day: credit_card, line_of_credit
 * - account_url: All types
 * - notes: All types
 */
interface PaymentSourceMetadata {
  last_four_digits?: string; // Last 4 digits of account/card number
  credit_limit?: number; // Credit limit in cents (credit_card, line_of_credit)
  interest_rate?: number; // Interest rate as decimal (e.g., 0.1999 for 19.99%)
  interest_rate_cash_advance?: number; // Cash advance rate (credit_card only)
  is_variable_rate?: boolean; // True if rate is variable (line_of_credit, savings, investment)
  statement_day?: number; // Day of month statement closes (1-31)
  account_url?: string; // URL to manage account
  notes?: string; // Freeform notes
}

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
  day_of_month?: number; // 1-31 (use 31 for "last day of month")
  recurrence_week?: number; // 1-5 (1st, 2nd, 3rd, 4th, 5th/last weekday of month)
  recurrence_day?: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  payment_source_id: string;
  category_id: string; // Required - reference to bill category
  payment_method?: PaymentMethod; // 'auto' for autopay, 'manual' for manual payment
  metadata?: EntityMetadata; // Optional metadata (bank name, account number, URL, notes)
  goal_id?: string; // Optional link to SavingsGoal (for goal contributions)
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
  day_of_month?: number; // 1-31 (use 31 for "last day of month")
  recurrence_week?: number; // 1-5 (1st, 2nd, 3rd, 4th, 5th/last weekday of month)
  recurrence_day?: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  payment_source_id: string;
  category_id: string; // Required - reference to income category
  payment_method?: PaymentMethod; // 'auto' for autopay, 'manual' for manual payment (default: 'auto')
  metadata?: EntityMetadata; // Optional metadata (bank name, account number, URL, notes)
  goal_id?: string; // Optional link to SavingsGoal (for goal completion incomes)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Occurrence (individual payment instance within a billing period)
// ============================================================================

interface Occurrence {
  id: string;
  sequence: number; // 1, 2, 3... for ordering within the month
  expected_date: string; // YYYY-MM-DD - calculated from day_of_month/start_date, overridable
  expected_amount: number; // Cents - can be edited independently per occurrence
  is_closed: boolean; // Close/Open status for this occurrence (true = paid)
  closed_date?: string; // When closed/paid (YYYY-MM-DD)
  payment_source_id?: string; // Which account was used for payment
  notes?: string; // Optional close notes
  is_adhoc: boolean; // True if manually added by user
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Instance Interfaces (Extended for Detailed Monthly View)
// ============================================================================

interface BillInstance {
  id: string;
  bill_id: string | null; // null for ad-hoc bills
  month: string;
  billing_period: string; // Copied from Bill for display
  expected_amount: number; // Sum of all occurrence expected_amounts
  occurrences: Occurrence[]; // Individual occurrences for this instance
  is_default: boolean;
  is_closed: boolean; // True when ALL occurrences are closed
  is_adhoc: boolean; // True for one-time ad-hoc items
  is_payoff_bill?: boolean; // True if auto-generated from pay_off_monthly payment source
  payoff_source_id?: string; // Reference to the payment source this payoff bill is for
  goal_id?: string; // Link to SavingsGoal for ad-hoc contributions
  closed_date?: string; // ISO date when fully closed (YYYY-MM-DD)
  name?: string; // For ad-hoc items (bill_id is null)
  category_id?: string; // For ad-hoc items (no bill reference)
  payment_source_id?: string; // For ad-hoc items (no bill reference)
  metadata?: EntityMetadata; // Copied from Bill at month generation (point-in-time snapshot)
  created_at: string;
  updated_at: string;
}

interface IncomeInstance {
  id: string;
  income_id: string | null; // null for ad-hoc income
  month: string;
  billing_period: string; // Copied from Income for display
  expected_amount: number; // Sum of all occurrence expected_amounts
  occurrences: Occurrence[]; // Individual occurrences for this instance
  is_default: boolean;
  is_closed: boolean; // True when ALL occurrences are closed
  is_adhoc: boolean; // True for one-time ad-hoc items
  closed_date?: string; // ISO date when fully closed (YYYY-MM-DD)
  name?: string; // For ad-hoc items (income_id is null)
  category_id?: string; // For ad-hoc items (no income reference)
  payment_source_id?: string; // For ad-hoc items (no income reference)
  metadata?: EntityMetadata; // Copied from Income at month generation (point-in-time snapshot)
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
  category_id?: string; // Optional category for grouping
  payment_source_id?: string; // Default payment source
  estimated_amount?: number; // Hint for budgeting (cents)
  frequency: VariableExpenseFrequency;
  notes?: string; // User reminder
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
  is_active: boolean;
  exclude_from_leftover?: boolean; // If true, balance not included in leftover calculation
  pay_off_monthly?: boolean; // If true, auto-generate payoff bill (implies exclude_from_leftover)
  track_payments_manually?: boolean; // If true, show payoff bill for manual payment tracking (no auto-populate)
  is_savings?: boolean; // If true, this is a savings account (mutually exclusive with is_investment and pay_off_monthly)
  is_investment?: boolean; // If true, this is an investment account (mutually exclusive with is_savings and pay_off_monthly)
  metadata?: PaymentSourceMetadata; // Optional metadata (last 4, limits, rates, etc.)
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  is_predefined: boolean;
  sort_order: number; // NEW: Display order (0 = first)
  color: string; // NEW: Hex color for header accent (e.g., "#3b82f6")
  type: CategoryType; // NEW: 'bill' | 'income'
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Savings Goal Interface
// ============================================================================

type SavingsGoalStatus = 'saving' | 'paused' | 'bought' | 'abandoned' | 'archived';

// Temperature indicator for goal progress tracking
type GoalTemperature = 'green' | 'yellow' | 'red';

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number; // Cents
  current_amount: number; // Cents (calculated dynamically from closed occurrences)
  target_date?: string; // YYYY-MM-DD (optional for open-ended goals)
  linked_account_id: string; // Reference to PaymentSource (savings account)
  status: SavingsGoalStatus;
  previous_status?: 'bought' | 'abandoned'; // Status before archiving (for unarchive)
  paused_at?: string; // ISO timestamp when goal was paused
  completed_at?: string; // ISO timestamp when goal was bought/abandoned
  archived_at?: string; // ISO timestamp when goal was archived
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Family Member Interface
// ============================================================================

interface FamilyMember {
  id: string;
  name: string; // Full name of the family member
  plans: string[]; // Ordered list of Insurance Plan IDs
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Insurance Entity Interfaces
// ============================================================================

type ClaimStatus = 'draft' | 'in_progress' | 'closed';
type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'denied' | 'awaiting_previous';
type DocumentType = 'receipt' | 'eob' | 'other';

interface InsurancePlan {
  id: string;
  name: string; // Display name (e.g., "Sun Life - Brad")
  provider_name?: string; // Provider company name
  policy_number?: string; // Policy/group number
  member_id?: string; // User's member ID on this plan
  owner?: string; // Who this plan belongs to (e.g., "Brad", "Partner")
  // priority: number; // REMOVED - replaced by per-member ordering
  portal_url?: string; // URL to submit claims online
  notes?: string; // Freeform notes
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface InsuranceCategory {
  id: string;
  name: string; // Category name (e.g., "Dental")
  icon: string; // Emoji icon
  sort_order: number; // Display order
  is_predefined: boolean; // True for built-in categories
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClaimDocument {
  id: string;
  filename: string; // Stored filename (sortable format: {claim_number}_{date}_{category}_{type}.{ext})
  original_filename: string; // Original uploaded filename
  document_type: DocumentType; // Type: receipt / eob / other
  related_plan_id?: string; // For EOBs, which plan issued it
  mime_type: string; // File MIME type
  size_bytes: number; // File size in bytes
  uploaded_at: string; // Upload timestamp
  notes?: string; // Optional notes about this document
}

interface PlanSnapshot {
  name: string;
  provider_name?: string;
  policy_number?: string;
  member_id?: string;
  owner?: string;
  // priority: number; // REMOVED
  portal_url?: string;
}

interface ClaimSubmission {
  id: string;
  plan_id: string; // Reference to InsurancePlan (for filtering)
  plan_snapshot: PlanSnapshot; // Deep copy of plan details at submission time
  status: SubmissionStatus; // Status: draft / pending / approved / denied
  amount_claimed: number; // Amount claimed in cents
  amount_reimbursed?: number; // Amount received in cents (when resolved)
  date_submitted?: string; // When submitted to insurer (ISO date)
  date_resolved?: string; // When response received (ISO date)
  documents_sent: string[]; // Array of document IDs sent with this submission
  eob_document_id?: string; // Document ID of EOB received for this submission
  notes?: string; // Freeform notes
}

interface InsuranceClaim {
  id: string;
  claim_number: number; // Human-readable ID (auto-increment: 1, 2, 3...)
  family_member_id: string; // Reference to FamilyMember - who this claim is for
  family_member_name: string; // Denormalized family member name for display
  category_id: string; // Reference to InsuranceCategory
  category_name: string; // Denormalized category name for display
  description?: string; // Optional notes (auto-generated if empty)
  provider_name?: string; // Service provider (e.g., "Dr. Smith Dental")
  service_date: string; // When the service occurred (ISO date)
  total_amount: number; // Original invoice amount in cents
  status: ClaimStatus; // Auto-calculated: draft / in_progress / closed
  documents: ClaimDocument[]; // Array of attached documents
  submissions: ClaimSubmission[]; // Array of plan submissions
  created_at: string;
  updated_at: string;
}

interface InsuranceClaimsSummary {
  pending_count: number;
  pending_amount: number;
  closed_count: number;
  reimbursed_amount: number;
}

// ============================================================================
// Backup Types
// ============================================================================

interface BackupMetadata {
  filename: string;
  fromVersion: string;
  toVersion: string;
  timestamp: string;
  size: number;
  backupType: 'manual' | 'auto' | 'migration';
  note?: string; // User-provided note (max 100 chars)
}

interface MonthlyData {
  month: string;
  bill_instances: BillInstance[];
  income_instances: IncomeInstance[];
  variable_expenses: VariableExpense[];
  free_flowing_expenses: FreeFlowingExpense[];
  bank_balances: Record<string, number>;
  savings_balances_start?: Record<string, number>; // Start-of-month balances for savings/investment accounts
  savings_balances_end?: Record<string, number>; // End-of-month balances for savings/investment accounts
  savings_contributions?: Record<string, number>; // Expected contribution per account (cents)
  is_read_only: boolean; // Lock month from edits
  created_at: string;
  updated_at: string;
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
  actual_amount: number; // Computed from occurrences[].payments
  occurrences: Occurrence[]; // Individual occurrences
  occurrence_count: number; // How many occurrences in this month
  is_extra_occurrence_month: boolean; // True if more occurrences than usual
  total_paid: number;
  remaining: number;
  is_closed: boolean; // True = no more transactions expected
  is_adhoc: boolean;
  is_payoff_bill: boolean; // True if auto-generated from pay_off_monthly payment source
  payoff_source_id?: string; // Reference to the payment source this payoff bill is for
  closed_date: string | null; // ISO date when closed
  is_overdue: boolean;
  days_overdue: number | null;
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
  payment_method?: PaymentMethod; // 'auto' for autopay, 'manual' for manual payment
  metadata?: EntityMetadata; // Point-in-time snapshot from Bill
}

interface IncomeInstanceDetailed {
  id: string;
  income_id: string | null;
  name: string;
  billing_period: string;
  expected_amount: number;
  actual_amount: number; // Computed from occurrences[].payments
  occurrences: Occurrence[]; // Individual occurrences
  occurrence_count: number; // How many occurrences in this month
  is_extra_occurrence_month: boolean; // True if more occurrences than usual (3-paycheck month!)
  total_received: number; // Sum of all payments
  remaining: number; // expected - total_received
  is_closed: boolean; // True = no more transactions expected
  is_adhoc: boolean;
  closed_date: string | null; // ISO date when closed
  is_overdue: boolean;
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
  metadata?: EntityMetadata; // Point-in-time snapshot from Income
}

interface LeftoverBreakdown {
  bankBalances: number; // Current cash position (snapshot from bank_balances)
  remainingIncome: number; // Income still expected to receive
  remainingExpenses: number; // Expenses still need to pay (including payoff bills)
  leftover: number; // bank + remainingIncome - remainingExpenses
  isValid: boolean; // False if required bank balances are missing
  hasActuals?: boolean; // True if any actuals have been entered
  missingBalances?: string[]; // IDs of payment sources missing balances
  errorMessage?: string; // Human-readable error message
}

/**
 * Unified leftover calculation result
 * Used by calculateUnifiedLeftover() utility
 */
interface UnifiedLeftoverResult {
  bankBalances: number; // Current cash position (snapshot)
  remainingIncome: number; // Income still expected to receive
  remainingExpenses: number; // Expenses still need to pay
  leftover: number; // Final: bank + income - expenses
  isValid: boolean; // True if calculation is valid
  missingBalances: string[]; // IDs of payment sources missing balances
  errorMessage?: string; // Human-readable error if not valid
}

interface PayoffSummary {
  paymentSourceId: string;
  paymentSourceName: string;
  balance: number; // Current CC balance (expected payoff)
  paid: number; // Sum of payments made this month toward payoff
  remaining: number; // balance - paid
}

interface DetailedMonthResponse {
  month: string;
  billSections: CategorySection[];
  incomeSections: CategorySection[];
  overdue_bills: { name: string; amount: number; due_date: string }[];
  tallies: {
    bills: SectionTally; // Regular bills (with expected amounts)
    adhocBills: SectionTally; // Ad-hoc bills (actual only)
    ccPayoffs: SectionTally; // Credit card payoff bills
    totalExpenses: SectionTally; // Combined total
    income: SectionTally; // Regular income
    adhocIncome: SectionTally; // Ad-hoc income
    totalIncome: SectionTally; // Combined total
  };
  leftover: number;
  leftoverBreakdown: LeftoverBreakdown;
  payoffSummaries: PayoffSummary[]; // Summary of each CC payoff status
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
// Projections
// ============================================================================

interface ProjectionResponse {
  start_date: string; // YYYY-MM-DD (Today or 1st of month)
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

// ============================================================================
// Exports
// ============================================================================

export type {
  // Common Type Aliases
  DateString,
  ISODateTimeString,
  // Enums
  BillingPeriod,
  PaymentSourceType,
  CategoryType,
  PaymentMethod,
  VariableExpenseFrequency,
  ClaimStatus,
  SubmissionStatus,
  DocumentType,
  SavingsGoalStatus,
  GoalTemperature,
  EntityMetadata,
  PaymentSourceMetadata,
  Bill,
  Income,
  Occurrence,
  BillInstance,
  IncomeInstance,
  VariableExpense,
  VariableExpenseTemplate,
  FreeFlowingExpense,
  PaymentSource,
  Category,
  SavingsGoal,
  FamilyMember,
  InsurancePlan,
  InsuranceCategory,
  ClaimDocument,
  PlanSnapshot,
  ClaimSubmission,
  InsuranceClaim,
  InsuranceClaimsSummary,
  BackupMetadata,
  MonthlyData,
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
  ValidationResult,
  ProjectionResponse,
};

export { DEBT_ACCOUNT_TYPES, INVESTMENT_ACCOUNT_TYPES };
