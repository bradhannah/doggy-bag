// Validators Tests
import { describe, test, expect } from 'bun:test';
import {
  validateRequired,
  validateLength,
  validateAmount,
  validateEnum,
  validateUUID,
  validateDate,
  validateMonth,
} from './validators';

describe('validateRequired', () => {
  test('returns null for valid non-empty string', () => {
    expect(validateRequired('hello', 'Name')).toBeNull();
  });

  test('returns error for null value', () => {
    expect(validateRequired(null, 'Name')).toBe('Name is required');
  });

  test('returns error for undefined value', () => {
    expect(validateRequired(undefined, 'Name')).toBe('Name is required');
  });

  test('returns error for empty string', () => {
    expect(validateRequired('', 'Name')).toBe('Name is required');
  });

  test('returns error for whitespace-only string', () => {
    expect(validateRequired('   ', 'Name')).toBe('Name cannot be blank');
  });

  test('returns null for valid number', () => {
    expect(validateRequired(42, 'Amount')).toBeNull();
  });

  test('returns null for zero (valid number)', () => {
    expect(validateRequired(0, 'Amount')).toBeNull();
  });
});

describe('validateLength', () => {
  test('returns null for string within bounds', () => {
    expect(validateLength('hello', 1, 10, 'Name')).toBeNull();
  });

  test('returns error for string too short', () => {
    expect(validateLength('ab', 3, 10, 'Name')).toBe('Name must be at least 3 characters');
  });

  test('returns error for string too long', () => {
    expect(validateLength('hello world', 1, 5, 'Name')).toBe('Name must not exceed 5 characters');
  });

  test('trims whitespace before checking', () => {
    expect(validateLength('  hi  ', 1, 5, 'Name')).toBeNull();
  });

  test('returns error if trimmed string is too short', () => {
    expect(validateLength('  a  ', 3, 10, 'Name')).toBe('Name must be at least 3 characters');
  });
});

describe('validateAmount', () => {
  test('returns null for valid positive integer', () => {
    expect(validateAmount(100, 'Price')).toBeNull();
  });

  test('returns error for non-number', () => {
    expect(validateAmount('100' as unknown as number, 'Price')).toBe('Price must be a number');
  });

  test('returns error for NaN', () => {
    expect(validateAmount(NaN, 'Price')).toBe('Price must be a valid number');
  });

  test('returns error for zero', () => {
    expect(validateAmount(0, 'Price')).toBe('Price must be greater than 0');
  });

  test('returns error for negative number', () => {
    expect(validateAmount(-50, 'Price')).toBe('Price must be greater than 0');
  });

  test('returns error for decimal (non-integer)', () => {
    expect(validateAmount(99.99, 'Price')).toBe('Price must be an integer');
  });

  test('returns error for number too large', () => {
    expect(validateAmount(Number.MAX_SAFE_INTEGER, 'Price')).toBe('Price is too large');
  });

  test('uses default field name', () => {
    expect(validateAmount(-1)).toBe('Amount must be greater than 0');
  });
});

describe('validateEnum', () => {
  const validStatuses = ['active', 'inactive', 'pending'] as const;

  test('returns null for valid enum value', () => {
    expect(validateEnum('active', validStatuses, 'Status')).toBeNull();
  });

  test('returns error for invalid enum value', () => {
    expect(validateEnum('unknown' as 'active', validStatuses, 'Status')).toBe(
      'Status must be one of: active, inactive, pending'
    );
  });
});

describe('validateUUID', () => {
  test('returns null for valid UUID', () => {
    expect(validateUUID('123e4567-e89b-12d3-a456-426614174000', 'ID')).toBeNull();
  });

  test('returns null for uppercase UUID', () => {
    expect(validateUUID('123E4567-E89B-12D3-A456-426614174000', 'ID')).toBeNull();
  });

  test('returns error for invalid UUID format', () => {
    expect(validateUUID('not-a-uuid', 'ID')).toBe('ID must be a valid UUID');
  });

  test('returns error for UUID with wrong length', () => {
    expect(validateUUID('123e4567-e89b-12d3-a456', 'ID')).toBe('ID must be a valid UUID');
  });

  test('uses default field name', () => {
    expect(validateUUID('invalid')).toBe('ID must be a valid UUID');
  });
});

describe('validateDate', () => {
  test('returns null for valid ISO date string', () => {
    expect(validateDate('2025-01-15', 'Date')).toBeNull();
  });

  test('returns null for valid Date object', () => {
    expect(validateDate(new Date('2025-01-15'), 'Date')).toBeNull();
  });

  test('returns error for invalid date string', () => {
    expect(validateDate('not-a-date', 'Date')).toBe('Date must be a valid date');
  });

  test('returns error for invalid Date object', () => {
    expect(validateDate(new Date('invalid'), 'Date')).toBe('Date must be a valid date');
  });

  test('uses default field name', () => {
    expect(validateDate('invalid')).toBe('Date must be a valid date');
  });
});

describe('validateMonth', () => {
  test('returns null for valid month format', () => {
    expect(validateMonth('2025-01', 'Month')).toBeNull();
  });

  test('returns null for December', () => {
    expect(validateMonth('2025-12', 'Month')).toBeNull();
  });

  test('returns error for wrong format (missing dash)', () => {
    expect(validateMonth('202501', 'Month')).toBe('Month must be in YYYY-MM format');
  });

  test('returns error for full date instead of month', () => {
    expect(validateMonth('2025-01-15', 'Month')).toBe('Month must be in YYYY-MM format');
  });

  test('returns error for year too low', () => {
    expect(validateMonth('1800-01', 'Month')).toBe('Month year must be between 1900 and 2100');
  });

  test('returns error for year too high', () => {
    expect(validateMonth('2200-01', 'Month')).toBe('Month year must be between 1900 and 2100');
  });

  test('returns error for month 0', () => {
    expect(validateMonth('2025-00', 'Month')).toBe('Month month must be between 1 and 12');
  });

  test('returns error for month 13', () => {
    expect(validateMonth('2025-13', 'Month')).toBe('Month month must be between 1 and 12');
  });

  test('uses default field name', () => {
    expect(validateMonth('invalid')).toBe('Month must be in YYYY-MM format');
  });
});
