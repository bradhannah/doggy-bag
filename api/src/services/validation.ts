// Validation Service - Data integrity checks for all entities

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { 
  Bill, 
  Income, 
  PaymentSource, 
  Category, 
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
    
    if (!bill.amount || bill.amount <= 0) {
      errors.push('Amount must be a positive number in cents');
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
    
    if (!source.type || !['bank_account', 'credit_card', 'cash'].includes(source.type)) {
      errors.push('Payment source type must be: bank_account, credit_card, or cash');
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
    
    return {
      isValid: errors.length === 0,
      errors
    };
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
    return ['bank_account', 'credit_card', 'cash'].includes(type);
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
