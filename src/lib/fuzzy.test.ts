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

  describe('edge cases', () => {
    it('empty query returns 0 (matches everything)', () => {
      expect(fuzzyScore('', 'anything')).toBe(0);
      expect(fuzzyScore('   ', 'anything')).toBe(0);
    });

    it('empty target returns null (no match possible)', () => {
      expect(fuzzyScore('abc', '')).toBeNull();
      expect(fuzzyScore('abc', '   ')).toBeNull();
    });

    it('case insensitive matching', () => {
      expect(fuzzyScore('ABC', 'abc')).not.toBeNull();
      expect(fuzzyScore('abc', 'ABC')).not.toBeNull();
      expect(fuzzyScore('AbC', 'aBc')).not.toBeNull();
    });

    it('query longer than target returns null', () => {
      expect(fuzzyScore('abcdef', 'abc')).toBeNull();
    });

    it('handles symbols and punctuation', () => {
      expect(fuzzyScore('a-b', 'a-b-c')).not.toBeNull();
      expect(fuzzyScore('test.ts', 'mytest.ts')).not.toBeNull();
    });

    it('whitespace in query is matched', () => {
      expect(fuzzyScore('hello world', 'hello world test')).not.toBeNull();
    });

    it('scores word boundary matches higher', () => {
      const wordBoundary = fuzzyScore('r', 'Rent');
      const midWord = fuzzyScore('e', 'Rent');

      expect(wordBoundary).not.toBeNull();
      expect(midWord).not.toBeNull();
      // 'r' matches at word boundary (start), 'e' matches mid-word
      expect(wordBoundary ?? 0).toBeGreaterThan(midWord ?? 0);
    });

    it('scores consecutive matches higher', () => {
      const consecutive = fuzzyScore('re', 'Rent');
      const separated = fuzzyScore('rt', 'Rent');

      expect(consecutive).not.toBeNull();
      expect(separated).not.toBeNull();
      expect(consecutive ?? 0).toBeGreaterThan(separated ?? 0);
    });
  });
});
