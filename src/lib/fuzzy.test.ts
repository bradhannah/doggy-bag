import { describe, expect, it } from 'vitest';
import { fuzzyScore } from './fuzzy';

describe('fuzzyScore', () => {
  it('scores exact matches higher than loose matches', () => {
    const exact = fuzzyScore('rent', 'Rent');
    const loose = fuzzyScore('rt', 'Rent');

    expect(exact).not.toBeNull();
    expect(loose).not.toBeNull();
    expect(exact ?? 0).toBeGreaterThan(loose ?? 0);
  });

  it('matches subsequences in order', () => {
    const match = fuzzyScore('kar tal', 'Karate - Tallacks');

    expect(match).not.toBeNull();
  });

  it('returns null when there is no match', () => {
    const match = fuzzyScore('xyz', 'Karate - Tallacks');

    expect(match).toBeNull();
  });
});
