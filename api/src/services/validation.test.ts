// Validation Service Tests
import { describe, test, expect, beforeAll } from 'bun:test';
import { ValidationServiceImpl } from './validation';
import type { ValidationService } from './validation';

describe('ValidationService', () => {
  let validation: ValidationService;

  beforeAll(() => {
    validation = ValidationServiceImpl.getInstance();
  });

  describe('getInstance', () => {
    test('returns singleton instance', () => {
      const instance1 = ValidationServiceImpl.getInstance();
      const instance2 = ValidationServiceImpl.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateBill', () => {
    test('validates valid monthly bill with day_of_month', () => {
      const result = validation.validateBill({
        name: 'Electric Bill',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates valid monthly bill with recurrence pattern', () => {
      const result = validation.validateBill({
        name: 'Rent',
        amount: 100000,
        billing_period: 'monthly',
        recurrence_week: 1,
        recurrence_day: 1, // First Monday
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects empty name', () => {
      const result = validation.validateBill({
        name: '',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be blank or whitespace only');
    });

    test('rejects whitespace-only name', () => {
      const result = validation.validateBill({
        name: '   ',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be blank or whitespace only');
    });

    test('rejects name over 100 characters', () => {
      const result = validation.validateBill({
        name: 'A'.repeat(101),
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot exceed 100 characters');
    });

    test('rejects negative amount', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: -100,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be zero or a positive number in cents');
    });

    test('allows zero amount for bills', () => {
      const result = validation.validateBill({
        name: 'Free Service',
        amount: 0,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects undefined amount', () => {
      const result = validation.validateBill({
        name: 'Test',
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be zero or a positive number in cents');
    });

    test('rejects invalid billing period', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'yearly' as 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Billing period must be: monthly, bi_weekly, weekly, or semi_annually'
      );
    });

    test('rejects missing billing period', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Billing period is required');
    });

    test('requires start_date for bi_weekly', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'bi_weekly',
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Start date is required for bi-weekly, weekly, and semi-annual billing periods'
      );
    });

    test('validates bi_weekly with valid start_date', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'bi_weekly',
        start_date: '2025-01-15',
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects invalid start_date format', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'bi_weekly',
        start_date: 'January 15, 2025',
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be a valid date in YYYY-MM-DD format');
    });

    test('rejects monthly bill without day_of_month or recurrence', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Monthly bills require either day_of_month OR recurrence_week + recurrence_day'
      );
    });

    test('rejects monthly bill with both day_of_month and recurrence', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
        recurrence_week: 2,
        recurrence_day: 3,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Specify either day_of_month OR recurrence_week + recurrence_day, not both'
      );
    });

    test('rejects invalid day_of_month (0)', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 0,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('day_of_month must be between 1 and 31');
    });

    test('rejects invalid day_of_month (32)', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 32,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('day_of_month must be between 1 and 31');
    });

    test('rejects invalid recurrence_week (0)', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        recurrence_week: 0,
        recurrence_day: 1,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'recurrence_week must be between 1 and 5 (1st through 5th/last)'
      );
    });

    test('rejects invalid recurrence_week (6)', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        recurrence_week: 6,
        recurrence_day: 1,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'recurrence_week must be between 1 and 5 (1st through 5th/last)'
      );
    });

    test('rejects invalid recurrence_day (-1)', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        recurrence_week: 1,
        recurrence_day: -1,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recurrence_day must be between 0 (Sunday) and 6 (Saturday)');
    });

    test('rejects invalid recurrence_day (7)', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        recurrence_week: 1,
        recurrence_day: 7,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recurrence_day must be between 0 (Sunday) and 6 (Saturday)');
    });

    test('rejects missing payment_source_id', () => {
      const result = validation.validateBill({
        name: 'Test',
        amount: 10000,
        billing_period: 'monthly',
        day_of_month: 15,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment source ID is required');
    });
  });

  describe('validateIncome', () => {
    test('validates valid monthly income', () => {
      const result = validation.validateIncome({
        name: 'Salary',
        amount: 500000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects empty name', () => {
      const result = validation.validateIncome({
        name: '',
        amount: 500000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be blank or whitespace only');
    });

    test('rejects name over 100 characters', () => {
      const result = validation.validateIncome({
        name: 'B'.repeat(101),
        amount: 500000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot exceed 100 characters');
    });

    test('rejects zero amount for income', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 0,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be a positive number in cents');
    });

    test('rejects negative amount', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: -100,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be a positive number in cents');
    });

    test('rejects invalid billing period', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'daily' as 'monthly',
        day_of_month: 15,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Billing period must be: monthly, bi_weekly, weekly, or semi_annually'
      );
    });

    test('requires start_date for weekly', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'weekly',
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Start date is required for bi-weekly, weekly, and semi-annual billing periods'
      );
    });

    test('validates weekly with valid start_date', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'weekly',
        start_date: '2025-01-06',
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects invalid start_date', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'weekly',
        start_date: 'not-a-date',
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be a valid date in YYYY-MM-DD format');
    });

    test('rejects monthly income without day_of_month or recurrence', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'monthly',
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Monthly incomes require either day_of_month OR recurrence_week + recurrence_day'
      );
    });

    test('rejects both day_of_month and recurrence', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'monthly',
        day_of_month: 15,
        recurrence_week: 1,
        recurrence_day: 5,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Specify either day_of_month OR recurrence_week + recurrence_day, not both'
      );
    });

    test('rejects invalid day_of_month', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'monthly',
        day_of_month: 32,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('day_of_month must be between 1 and 31');
    });

    test('rejects invalid recurrence_week', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'monthly',
        recurrence_week: 6,
        recurrence_day: 3,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'recurrence_week must be between 1 and 5 (1st through 5th/last)'
      );
    });

    test('rejects invalid recurrence_day', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'monthly',
        recurrence_week: 1,
        recurrence_day: 7,
        payment_source_id: '12345678901234567890',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recurrence_day must be between 0 (Sunday) and 6 (Saturday)');
    });

    test('rejects missing payment_source_id', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'monthly',
        day_of_month: 15,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment source ID is required');
    });

    test('rejects invalid payment_source_id format', () => {
      const result = validation.validateIncome({
        name: 'Test',
        amount: 50000,
        billing_period: 'monthly',
        day_of_month: 15,
        payment_source_id: 'short',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment source ID must be a valid UUID');
    });
  });

  describe('validatePaymentSource', () => {
    test('validates valid bank account', () => {
      const result = validation.validatePaymentSource({
        name: 'Checking Account',
        type: 'bank_account',
      });
      expect(result.isValid).toBe(true);
    });

    test('validates valid credit card', () => {
      const result = validation.validatePaymentSource({
        name: 'Visa',
        type: 'credit_card',
        pay_off_monthly: true,
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects empty name', () => {
      const result = validation.validatePaymentSource({
        name: '',
        type: 'bank_account',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be blank or whitespace only');
    });

    test('rejects name over 100 characters', () => {
      const result = validation.validatePaymentSource({
        name: 'C'.repeat(101),
        type: 'bank_account',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot exceed 100 characters');
    });

    test('rejects invalid type', () => {
      const result = validation.validatePaymentSource({
        name: 'Test',
        type: 'bitcoin' as 'bank_account',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Payment source type must be: bank_account, credit_card, line_of_credit, or cash'
      );
    });

    test('rejects pay_off_monthly for bank accounts', () => {
      const result = validation.validatePaymentSource({
        name: 'Checking',
        type: 'bank_account',
        pay_off_monthly: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'pay_off_monthly can only be enabled for credit cards and lines of credit'
      );
    });

    test('allows pay_off_monthly for line_of_credit', () => {
      const result = validation.validatePaymentSource({
        name: 'LOC',
        type: 'line_of_credit',
        pay_off_monthly: true,
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects exclude_from_leftover for cash', () => {
      const result = validation.validatePaymentSource({
        name: 'Cash',
        type: 'cash',
        exclude_from_leftover: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'exclude_from_leftover can only be enabled for credit cards and lines of credit'
      );
    });

    test('allows exclude_from_leftover for credit_card', () => {
      const result = validation.validatePaymentSource({
        name: 'Visa',
        type: 'credit_card',
        exclude_from_leftover: true,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCategory', () => {
    test('validates valid category', () => {
      const result = validation.validateCategory({
        name: 'Utilities',
        color: '#FF5733',
        type: 'bill',
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects empty name', () => {
      const result = validation.validateCategory({
        name: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be blank or whitespace only');
    });

    test('rejects name over 100 characters', () => {
      const result = validation.validateCategory({
        name: 'D'.repeat(101),
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot exceed 100 characters');
    });

    test('rejects negative sort_order', () => {
      const result = validation.validateCategory({
        name: 'Test',
        sort_order: -1,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('sort_order must be >= 0');
    });

    test('allows zero sort_order', () => {
      const result = validation.validateCategory({
        name: 'Test',
        sort_order: 0,
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects invalid hex color', () => {
      const result = validation.validateCategory({
        name: 'Test',
        color: 'red',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('color must be valid hex format (#RGB or #RRGGBB)');
    });

    test('accepts 3-digit hex color', () => {
      const result = validation.validateCategory({
        name: 'Test',
        color: '#F00',
      });
      expect(result.isValid).toBe(true);
    });

    test('accepts 6-digit hex color', () => {
      const result = validation.validateCategory({
        name: 'Test',
        color: '#FF0000',
      });
      expect(result.isValid).toBe(true);
    });

    test('rejects invalid type', () => {
      const result = validation.validateCategory({
        name: 'Test',
        type: 'expense' as 'bill',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("type must be 'bill', 'income', or 'variable'");
    });

    test('accepts variable type', () => {
      const result = validation.validateCategory({
        name: 'Groceries',
        type: 'variable',
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDueDay', () => {
    test('returns true for undefined', () => {
      expect(validation.validateDueDay(undefined)).toBe(true);
    });

    test('returns true for valid days 1-31', () => {
      expect(validation.validateDueDay(1)).toBe(true);
      expect(validation.validateDueDay(15)).toBe(true);
      expect(validation.validateDueDay(31)).toBe(true);
    });

    test('returns false for 0', () => {
      expect(validation.validateDueDay(0)).toBe(false);
    });

    test('returns false for 32', () => {
      expect(validation.validateDueDay(32)).toBe(false);
    });

    test('returns false for decimal', () => {
      expect(validation.validateDueDay(15.5)).toBe(false);
    });
  });

  describe('validateHexColor', () => {
    test('validates 3-digit hex', () => {
      expect(validation.validateHexColor('#FFF')).toBe(true);
      expect(validation.validateHexColor('#abc')).toBe(true);
    });

    test('validates 6-digit hex', () => {
      expect(validation.validateHexColor('#FFFFFF')).toBe(true);
      expect(validation.validateHexColor('#abcdef')).toBe(true);
    });

    test('rejects invalid formats', () => {
      expect(validation.validateHexColor('red')).toBe(false);
      expect(validation.validateHexColor('#GGGGGG')).toBe(false);
      expect(validation.validateHexColor('FFF')).toBe(false);
      expect(validation.validateHexColor('#FFFF')).toBe(false);
    });
  });

  describe('validateCategoryType', () => {
    test('accepts valid types', () => {
      expect(validation.validateCategoryType('bill')).toBe(true);
      expect(validation.validateCategoryType('income')).toBe(true);
      expect(validation.validateCategoryType('variable')).toBe(true);
    });

    test('rejects invalid types', () => {
      expect(validation.validateCategoryType('expense')).toBe(false);
      expect(validation.validateCategoryType('')).toBe(false);
    });
  });

  describe('validateID', () => {
    test('accepts long IDs', () => {
      expect(validation.validateID('12345678901234567890')).toBe(true);
      expect(validation.validateID('1234567890')).toBe(true);
    });

    test('rejects short IDs', () => {
      expect(validation.validateID('123456789')).toBe(false);
      expect(validation.validateID('')).toBe(false);
    });
  });

  describe('validateName', () => {
    test('accepts valid names', () => {
      expect(validation.validateName('Test')).toBe(true);
      expect(validation.validateName('A'.repeat(100))).toBe(true);
    });

    test('rejects empty or too long names', () => {
      expect(validation.validateName('')).toBe(false);
      expect(validation.validateName('   ')).toBe(false);
      expect(validation.validateName('A'.repeat(101))).toBe(false);
    });
  });

  describe('validateAmount', () => {
    test('accepts valid positive integers', () => {
      expect(validation.validateAmount(1)).toBe(true);
      expect(validation.validateAmount(10000)).toBe(true);
    });

    test('rejects invalid amounts', () => {
      expect(validation.validateAmount(0)).toBe(false);
      expect(validation.validateAmount(-100)).toBe(false);
      expect(validation.validateAmount(99.99)).toBe(false);
      expect(validation.validateAmount(Number.MAX_SAFE_INTEGER)).toBe(false);
    });
  });

  describe('validateBillingPeriod', () => {
    test('accepts valid periods', () => {
      expect(validation.validateBillingPeriod('monthly')).toBe(true);
      expect(validation.validateBillingPeriod('bi_weekly')).toBe(true);
      expect(validation.validateBillingPeriod('weekly')).toBe(true);
      expect(validation.validateBillingPeriod('semi_annually')).toBe(true);
    });

    test('rejects invalid periods', () => {
      expect(validation.validateBillingPeriod('yearly')).toBe(false);
      expect(validation.validateBillingPeriod('daily')).toBe(false);
    });
  });

  describe('validatePaymentSourceType', () => {
    test('accepts valid types', () => {
      expect(validation.validatePaymentSourceType('bank_account')).toBe(true);
      expect(validation.validatePaymentSourceType('credit_card')).toBe(true);
      expect(validation.validatePaymentSourceType('line_of_credit')).toBe(true);
      expect(validation.validatePaymentSourceType('cash')).toBe(true);
    });

    test('rejects invalid types', () => {
      expect(validation.validatePaymentSourceType('bitcoin')).toBe(false);
      expect(validation.validatePaymentSourceType('paypal')).toBe(false);
    });
  });

  describe('validateDate', () => {
    test('accepts valid YYYY-MM-DD format', () => {
      expect(validation.validateDate('2025-01-15')).toBe(true);
      expect(validation.validateDate('2024-02-29')).toBe(true); // Leap year
    });

    test('rejects invalid formats', () => {
      expect(validation.validateDate('01-15-2025')).toBe(false);
      expect(validation.validateDate('2025/01/15')).toBe(false);
      expect(validation.validateDate('January 15, 2025')).toBe(false);
    });

    test('rejects invalid formats', () => {
      expect(validation.validateDate('2025-1-1')).toBe(false); // Not padded
      expect(validation.validateDate('not-a-date')).toBe(false);
    });
  });
});
