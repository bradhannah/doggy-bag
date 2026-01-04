// Errors Tests
import { describe, test, expect } from 'bun:test';
import {
  ValidationError,
  NotFoundError,
  StorageError,
  ConflictError,
  ReadOnlyError,
  formatErrorForUser,
  formatErrorForDev,
} from './errors';

describe('ValidationError', () => {
  test('creates error with message only', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.name).toBe('ValidationError');
    expect(error.field).toBeUndefined();
  });

  test('creates error with message and field', () => {
    const error = new ValidationError('Must be positive', 'amount');
    expect(error.message).toBe('Must be positive');
    expect(error.field).toBe('amount');
  });

  test('is instance of Error', () => {
    const error = new ValidationError('test');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ValidationError).toBe(true);
  });
});

describe('NotFoundError', () => {
  test('creates error with resource only', () => {
    const error = new NotFoundError('Bill');
    expect(error.message).toBe('Bill not found');
    expect(error.name).toBe('NotFoundError');
  });

  test('creates error with resource and id', () => {
    const error = new NotFoundError('Bill', '123');
    expect(error.message).toBe('Bill with id 123 not found');
  });
});

describe('StorageError', () => {
  test('creates error with message only', () => {
    const error = new StorageError('Failed to write');
    expect(error.message).toBe('Failed to write');
    expect(error.name).toBe('StorageError');
    expect(error.path).toBeUndefined();
  });

  test('creates error with message and path', () => {
    const error = new StorageError('Failed to write', '/data/bills.json');
    expect(error.message).toBe('Failed to write');
    expect(error.path).toBe('/data/bills.json');
  });
});

describe('ConflictError', () => {
  test('creates error with message', () => {
    const error = new ConflictError('Duplicate entry');
    expect(error.message).toBe('Duplicate entry');
    expect(error.name).toBe('ConflictError');
  });
});

describe('ReadOnlyError', () => {
  test('creates error with month', () => {
    const error = new ReadOnlyError('2025-01');
    expect(error.message).toBe('Month 2025-01 is read-only. Unlock it to make changes.');
    expect(error.name).toBe('ReadOnlyError');
  });
});

describe('formatErrorForUser', () => {
  test('returns message for ValidationError', () => {
    const error = new ValidationError('Amount must be positive');
    expect(formatErrorForUser(error)).toBe('Amount must be positive');
  });

  test('returns message for NotFoundError', () => {
    const error = new NotFoundError('Bill', '123');
    expect(formatErrorForUser(error)).toBe('Bill with id 123 not found');
  });

  test('returns generic message for StorageError', () => {
    const error = new StorageError('ENOENT: file not found');
    expect(formatErrorForUser(error)).toBe('Failed to save data. Please try again.');
  });

  test('returns message for ConflictError', () => {
    const error = new ConflictError('Name already exists');
    expect(formatErrorForUser(error)).toBe('Name already exists');
  });

  test('returns message for ReadOnlyError', () => {
    const error = new ReadOnlyError('2025-01');
    expect(formatErrorForUser(error)).toBe(
      'Month 2025-01 is read-only. Unlock it to make changes.'
    );
  });

  test('returns generic message for unknown Error', () => {
    const error = new Error('Something broke');
    expect(formatErrorForUser(error)).toBe('An error occurred. Please try again.');
  });

  test('returns message for non-Error objects', () => {
    expect(formatErrorForUser('string error')).toBe('An unknown error occurred');
    expect(formatErrorForUser(null)).toBe('An unknown error occurred');
    expect(formatErrorForUser(undefined)).toBe('An unknown error occurred');
    expect(formatErrorForUser({ custom: 'error' })).toBe('An unknown error occurred');
  });
});

describe('formatErrorForDev', () => {
  test('formats ValidationError with field', () => {
    const error = new ValidationError('Must be positive', 'amount');
    const result = formatErrorForDev(error);
    expect(result).toEqual({
      message: 'Must be positive',
      type: 'ValidationError',
      field: 'amount',
    });
  });

  test('formats NotFoundError', () => {
    const error = new NotFoundError('Bill', '123');
    const result = formatErrorForDev(error);
    expect(result).toEqual({
      message: 'Bill with id 123 not found',
      type: 'NotFoundError',
    });
  });

  test('formats StorageError with path', () => {
    const error = new StorageError('Write failed', '/data/file.json');
    const result = formatErrorForDev(error);
    expect(result).toEqual({
      message: 'Write failed',
      type: 'StorageError',
      path: '/data/file.json',
    });
  });

  test('formats ConflictError', () => {
    const error = new ConflictError('Duplicate');
    const result = formatErrorForDev(error);
    expect(result).toEqual({
      message: 'Duplicate',
      type: 'ConflictError',
    });
  });

  test('formats ReadOnlyError', () => {
    const error = new ReadOnlyError('2025-01');
    const result = formatErrorForDev(error);
    expect(result).toEqual({
      message: 'Month 2025-01 is read-only. Unlock it to make changes.',
      type: 'ReadOnlyError',
    });
  });

  test('formats generic Error', () => {
    const error = new Error('Something broke');
    const result = formatErrorForDev(error);
    expect(result).toEqual({
      message: 'Something broke',
      type: 'Error',
    });
  });

  test('formats non-Error objects', () => {
    expect(formatErrorForDev('string')).toEqual({
      message: 'Unknown error',
      type: 'Unknown',
    });
    expect(formatErrorForDev(null)).toEqual({
      message: 'Unknown error',
      type: 'Unknown',
    });
  });
});
