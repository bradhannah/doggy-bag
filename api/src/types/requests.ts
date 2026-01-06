// API Request/Response Types
// These types define the API contract for OpenAPI generation

import type { BillingPeriod, PaymentSourceType, CategoryType } from './index';

// ============================================================================
// Common Response Types
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
  details?: string[];
}

export interface SuccessResponse<T> {
  data: T;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Payment Sources
// ============================================================================

export interface CreatePaymentSourceRequest {
  name: string;
  type: PaymentSourceType;
  balance: number;
  is_active?: boolean;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
}

export interface UpdatePaymentSourceRequest {
  name?: string;
  type?: PaymentSourceType;
  balance?: number;
  is_active?: boolean;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
}

// ============================================================================
// Bills
// ============================================================================

export interface CreateBillRequest {
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id?: string;
  is_active?: boolean;
}

export interface UpdateBillRequest {
  name?: string;
  amount?: number;
  billing_period?: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id?: string;
  category_id?: string;
  is_active?: boolean;
}

// ============================================================================
// Incomes
// ============================================================================

export interface CreateIncomeRequest {
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id?: string;
  is_active?: boolean;
}

export interface UpdateIncomeRequest {
  name?: string;
  amount?: number;
  billing_period?: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id?: string;
  category_id?: string;
  is_active?: boolean;
}

// ============================================================================
// Categories
// ============================================================================

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
  color?: string;
  sort_order?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: CategoryType;
  color?: string;
  sort_order?: number;
}

export interface ReorderCategoriesRequest {
  /** Array of category IDs in desired order */
  order: string[];
}

// ============================================================================
// Bank Balances
// ============================================================================

export interface UpdateBankBalancesRequest {
  /** Map of payment source ID to balance in cents */
  balances: Record<string, number>;
}

// ============================================================================
// Payments (for occurrences)
// ============================================================================

export interface AddPaymentRequest {
  amount: number;
  date: string;
  payment_source_id?: string;
}

export interface UpdatePaymentRequest {
  amount?: number;
  date?: string;
  payment_source_id?: string;
}

// ============================================================================
// Ad-hoc Items
// ============================================================================

export interface CreateAdhocBillRequest {
  name: string;
  amount: number;
  category_id?: string;
  payment_source_id?: string;
}

export interface UpdateAdhocBillRequest {
  name?: string;
  expected_amount?: number;
  actual_amount?: number;
  category_id?: string;
  payment_source_id?: string;
}

export interface CreateAdhocIncomeRequest {
  name: string;
  amount: number;
  category_id?: string;
  payment_source_id?: string;
}

export interface UpdateAdhocIncomeRequest {
  name?: string;
  expected_amount?: number;
  actual_amount?: number;
  category_id?: string;
  payment_source_id?: string;
}

// ============================================================================
// Occurrence Updates
// ============================================================================

export interface UpdateOccurrenceRequest {
  expected_amount?: number;
  expected_date?: string;
}

export interface AddAdhocOccurrenceRequest {
  expected_amount: number;
  expected_date: string;
}

// ============================================================================
// Instance Updates
// ============================================================================

export interface UpdateBillInstanceRequest {
  expected_amount?: number;
  payment_source_id?: string;
  category_id?: string;
}

export interface UpdateIncomeInstanceRequest {
  expected_amount?: number;
  payment_source_id?: string;
  category_id?: string;
}

// ============================================================================
// Backup
// ============================================================================

export interface RestoreBackupRequest {
  /** Base64 encoded backup file content or JSON object */
  data: unknown;
}

export interface ValidateBackupRequest {
  /** Backup data to validate */
  data: unknown;
}

export interface ValidateBackupResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary?: {
    bills: number;
    incomes: number;
    paymentSources: number;
    categories: number;
    months: number;
  };
}

// ============================================================================
// Settings
// ============================================================================

export interface MigrateDataRequest {
  sourceDir: string;
  destDir: string;
  mode: 'copy' | 'fresh' | 'use_existing';
}

export interface SwitchDirectoryRequest {
  newDirectory: string;
}

export interface ValidateDirectoryRequest {
  path: string;
}

// ============================================================================
// Month Operations
// ============================================================================

export interface GenerateMonthRequest {
  /** Force regeneration even if month exists */
  force?: boolean;
}

export interface LockMonthRequest {
  /** Lock (true) or unlock (false) the month */
  lock: boolean;
}
