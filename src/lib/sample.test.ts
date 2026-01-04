import { describe, it, expect } from 'vitest';

describe('Sample Test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify test environment is working', () => {
    expect(true).toBe(true);
  });
});
