// Validation Service - Data integrity checks for all entities

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { 
  Bill, 
  Income, 
  PaymentSource, 
  Category,
  CategoryType,
  Payment,
  BillInstance, 
  IncomeInstance, 
  VariableExpense, 
  FreeFlowingExpense 
} from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationService {
  validateBill(bill: Partial<Bill>): ValidationResult;
  validateIncome(income: Partial<Income>): ValidationResult;
  validatePaymentSource(source: Partial<PaymentSource>): ValidationResult;
  validateCategory(category: Partial<Category>): ValidationResult;
  validateID(id: string): boolean;
  validateName(name: string): boolean;
  validateAmount(amount: number): boolean;
  validateBillingPeriod(period: string): boolean;
  validatePaymentSourceType(type: string): boolean;
  validateDate(dateStr: string): boolean;
  validateDueDay(dueDay: number | undefined): boolean;
  validateHexColor(color: string): boolean;
  validateCategoryType(type: string): boolean;
}

export class ValidationServiceImpl implements ValidationService {
  private static instance: ValidationServiceImpl | null = null;
  private storage: StorageService;
  
  public static getInstance(): ValidationService {
    if (!ValidationServiceImpl.instance) {
      ValidationServiceImpl.instance = new ValidationServiceImpl();
    }
    return ValidationServiceImpl.instance;
  }
  
  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }
  
  validateBill(bill: Partial<Bill>): ValidationResult {
    const errors: string[] = [];
    
    if (!bill.name?.trim()) {
      errors.push('Name cannot be blank or whitespace only');
    }
    
    if (bill.name && bill.name.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }
    
    if (bill.amount === undefined || bill.amount === null || bill.amount < 0) {
      errors.push('Amount must be zero or a positive number in cents');
    }
    
    if (!bill.billing_period) {
      errors.push('Billing period is required');
    } else if (
!['monthly', 'bi_weekly', 'weekly', 'semi_annually'].includes(bill.billing_period)
    ) {
      errors.push('Billing period must be: monthly, bi_weekly, weekly, or semi_annually');
    }
    
    // Require start_date for non-monthly billing periods
    if (bill.billing_period && bill.billing_period !== 'monthly') {
      if (!bill.start_date) {
        errors.push('Start date is required for bi-weekly, weekly, and semi-annual billing periods');
      } else if (!this.validateDate(bill.start_date)) {
        errors.push('Start date must be a valid date in YYYY-MM-DD format');
      }
    }
    
    // For monthly billing, require either day_of_month OR (recurrence_week + recurrence_day)
    if (bill.billing_period === 'monthly') {
      const hasDayOfMonth = bill.day_of_month !== undefined && bill.day_of_month !== null;
      const hasWeekdayRecurrence = bill.recurrence_week !== undefined && bill.recurrence_day !== undefined;
      
      if (!hasDayOfMonth && !hasWeekdayRecurrence) {
        errors.push('Monthly bills require either day_of_month OR recurrence_week + recurrence_day');
      }
      
      if (hasDayOfMonth && hasWeekdayRecurrence) {
        errors.push('Specify either day_of_month OR recurrence_week + recurrence_day, not both');
      }
      
      if (hasDayOfMonth) {
        if (bill.day_of_month! < 1 || bill.day_of_month! > 31) {
          errors.push('day_of_month must be between 1 and 31');
        }
      }
      
      if (hasWeekdayRecurrence) {
        if (bill.recurrence_week! < 1 || bill.recurrence_week! > 5) {
          errors.push('recurrence_week must be between 1 and 5 (1st through 5th/last)');
        }
        if (bill.recurrence_day! < 0 || bill.recurrence_day! > 6) {
          errors.push('recurrence_day must be between 0 (Sunday) and 6 (Saturday)');
        }
      }
    }
    
    if (!bill.payment_source_id) {
      errors.push('Payment source ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  validateIncome(income: Partial<Income>): ValidationResult {
    const errors: string[] = [];
    
    if (!income.name?.trim()) {
      errors.push('Name cannot be blank or whitespace only');
    }
    
    if (income.name && income.name.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }
    
    if (!income.amount || income.amount <= 0) {
      errors.push('Amount must be a positive number in cents');
    }
    
    if (!income.billing_period) {
      errors.push('Billing period is required');
    } else if (
!['monthly', 'bi_weekly', 'weekly', 'semi_annually'].includes(income.billing_period)
    ) {
      errors.push('Billing period must be: monthly, bi_weekly, weekly, or semi_annually');
    }
    
    // Require start_date for non-monthly billing periods
    if (income.billing_period && income.billing_period !== 'monthly') {
      if (!income.start_date) {
        errors.push('Start date is required for bi-weekly, weekly, and semi-annual billing periods');
      } else if (!this.validateDate(income.start_date)) {
        errors.push('Start date must be a valid date in YYYY-MM-DD format');
      }
    }
    
    // For monthly billing, require either day_of_month OR (recurrence_week + recurrence_day)
    if (income.billing_period === 'monthly') {
      const hasDayOfMonth = income.day_of_month !== undefined && income.day_of_month !== null;
      const hasWeekdayRecurrence = income.recurrence_week !== undefined && income.recurrence_day !== undefined;
      
      if (!hasDayOfMonth && !hasWeekdayRecurrence) {
        errors.push('Monthly incomes require either day_of_month OR recurrence_week + recurrence_day');
      }
      
      if (hasDayOfMonth && hasWeekdayRecurrence) {
        errors.push('Specify either day_of_month OR recurrence_week + recurrence_day, not both');
      }
      
      if (hasDayOfMonth) {
        if (income.day_of_month! < 1 || income.day_of_month! > 31) {
          errors.push('day_of_month must be between 1 and 31');
        }
      }
      
      if (hasWeekdayRecurrence) {
        if (income.recurrence_week! < 1 || income.recurrence_week! > 5) {
          errors.push('recurrence_week must be between 1 and 5 (1st through 5th/last)');
        }
        if (income.recurrence_day! < 0 || income.recurrence_day! > 6) {
          errors.push('recurrence_day must be between 0 (Sunday) and 6 (Saturday)');
        }
      }
    }
    
    if (!income.payment_source_id) {
      errors.push('Payment source ID is required');
    } else if (income.payment_source_id && !this.validateID(income.payment_source_id)) {
      errors.push('Payment source ID must be a valid UUID');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  validatePaymentSource(source: Partial<PaymentSource>): ValidationResult {
    const errors: string[] = [];
    
    if (!source.name?.trim()) {
      errors.push('Name cannot be blank or whitespace only');
    }
    
    if (source.name && source.name.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }
    
    if (!source.type || !['bank_account', 'credit_card', 'line_of_credit', 'cash'].includes(source.type)) {
      errors.push('Payment source type must be: bank_account, credit_card, line_of_credit, or cash');
    }
    
    // pay_off_monthly is only valid for debt accounts (credit_card, line_of_credit)
    if (source.pay_off_monthly === true) {
      const debtTypes = ['credit_card', 'line_of_credit'];
      if (source.type && !debtTypes.includes(source.type)) {
        errors.push('pay_off_monthly can only be enabled for credit cards and lines of credit');
      }
    }
    
    // exclude_from_leftover is only valid for debt accounts
    if (source.exclude_from_leftover === true) {
      const debtTypes = ['credit_card', 'line_of_credit'];
      if (source.type && !debtTypes.includes(source.type)) {
        errors.push('exclude_from_leftover can only be enabled for credit cards and lines of credit');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  validateCategory(category: Partial<Category>): ValidationResult {
    const errors: string[] = [];
    
    if (!category.name?.trim()) {
      errors.push('Name cannot be blank or whitespace only');
    }
    
    if (category.name && category.name.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }
    
    // Validate sort_order (NEW for 002-detailed-monthly-view)
    if (category.sort_order !== undefined && category.sort_order < 0) {
      errors.push('sort_order must be >= 0');
    }
    
    // Validate color - must be valid hex format (#RGB or #RRGGBB)
    if (category.color !== undefined) {
      const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
      if (!hexColorRegex.test(category.color)) {
        errors.push('color must be valid hex format (#RGB or #RRGGBB)');
      }
    }
    
    // Validate type - must be 'bill', 'income', or 'variable'
    if (category.type !== undefined) {
      if (!['bill', 'income', 'variable'].includes(category.type)) {
        errors.push("type must be 'bill', 'income', or 'variable'");
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate due_day field for Bill/Income (1-31)
   * @param dueDay - Day of month when bill/income is due
   * @returns true if valid or undefined, false if invalid
   */
  validateDueDay(dueDay: number | undefined): boolean {
    if (dueDay === undefined) return true;
    return Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31;
  }
  
  /**
   * Validate hex color string
   * @param color - Hex color string (#RGB or #RRGGBB)
   * @returns true if valid
   */
  validateHexColor(color: string): boolean {
    const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    return hexColorRegex.test(color);
  }
  
  /**
   * Validate category type
   * @param type - Category type
   * @returns true if valid
   */
  validateCategoryType(type: string): boolean {
    return ['bill', 'income', 'variable'].includes(type);
  }
  
  validateID(id: string): boolean {
    if (id.length < 10) return false;
    return true;
  }
  
  validateName(name: string): boolean {
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= 100;
  }
  
  validateAmount(amount: number): boolean {
    return typeof amount === 'number' && Number.isInteger(amount) && amount > 0 && amount < Number.MAX_SAFE_INTEGER;
  }
  
  validateBillingPeriod(period: string): boolean {
    return ['monthly', 'bi_weekly', 'weekly', 'semi_annually'].includes(period);
  }
  
  validatePaymentSourceType(type: string): boolean {
    return ['bank_account', 'credit_card', 'line_of_credit', 'cash'].includes(type);
  }
  
  validateDate(dateStr: string): boolean {
    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return false;
    }
    
    // Check if it's a valid date
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }
}
