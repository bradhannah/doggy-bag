import { describe, expect, it } from 'vitest';
import { filterSectionsByQuery } from './filter-sections';

describe('filterSectionsByQuery', () => {
  it('returns all items when query is empty', () => {
    const sections = [
      { name: 'Housing', items: [{ name: 'Rent' }, { name: 'Power' }] },
      { name: 'Income', items: [{ name: 'Paycheck' }] },
    ];

    const result = filterSectionsByQuery(
      sections,
      '',
      { categories: true, items: true },
      (section) => section.name
    );

    expect(result).toHaveLength(2);
    expect(result[0].items).toHaveLength(2);
  });

  it('filters items using fuzzy matching', () => {
    const sections = [
      { name: 'Kids', items: [{ name: 'Karate - Tallacks' }, { name: 'Rent' }] },
      { name: 'Gym', items: [{ name: 'Gym' }] },
    ];

    const result = filterSectionsByQuery(
      sections,
      'kar tal',
      { categories: false, items: true },
      (section) => section.name
    );

    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([{ name: 'Karate - Tallacks' }]);
  });

  it('returns empty when items are disabled and category does not match', () => {
    const sections = [{ name: 'Housing', items: [{ name: 'Rent' }] }];

    const result = filterSectionsByQuery(
      sections,
      'rent',
      { categories: false, items: false },
      (section) => section.name
    );

    expect(result).toEqual([]);
  });

  it('includes full section when category matches', () => {
    const sections = [
      { name: 'Utilities', items: [{ name: 'Power' }, { name: 'Water' }] },
      { name: 'Housing', items: [{ name: 'Rent' }] },
    ];

    const result = filterSectionsByQuery(
      sections,
      'util',
      { categories: true, items: true },
      (section) => section.name
    );

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
  });

  it('returns no sections when nothing matches', () => {
    const sections = [{ name: 'Housing', items: [{ name: 'Rent' }] }];

    const result = filterSectionsByQuery(
      sections,
      'zzz',
      { categories: true, items: true },
      (section) => section.name
    );

    expect(result).toEqual([]);
  });

  it('returns a new array reference when query is empty (reactivity)', () => {
    const sections = [{ name: 'Housing', items: [{ name: 'Rent' }, { name: 'Power' }] }];

    const result = filterSectionsByQuery(
      sections,
      '',
      { categories: true, items: true },
      (section) => section.name
    );

    // Must be a different reference so Svelte detects reactivity changes
    expect(result).not.toBe(sections);
    expect(result).toEqual(sections);
  });

  it('returns a new array reference when query is only whitespace', () => {
    const sections = [{ name: 'Housing', items: [{ name: 'Rent' }] }];

    const result = filterSectionsByQuery(
      sections,
      '   ',
      { categories: true, items: true },
      (section) => section.name
    );

    expect(result).not.toBe(sections);
    expect(result).toEqual(sections);
  });

  it('filters a single wrapped section (insurance pattern)', () => {
    const insuranceSection = {
      name: 'Insurance Expenses',
      items: [{ name: 'Dental Claim' }, { name: 'Vision Claim' }, { name: 'Rent' }],
    };

    const result = filterSectionsByQuery(
      [insuranceSection],
      'dental',
      { categories: false, items: true },
      () => 'Insurance Expenses'
    );

    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([{ name: 'Dental Claim' }]);
  });

  it('returns empty array for single wrapped section when no items match', () => {
    const insuranceSection = {
      name: 'Insurance Expenses',
      items: [{ name: 'Dental Claim' }],
    };

    const result = filterSectionsByQuery(
      [insuranceSection],
      'zzz',
      { categories: false, items: true },
      () => 'Insurance Expenses'
    );

    expect(result).toEqual([]);
  });

  it('returns all items for single section when category name matches', () => {
    const insuranceSection = {
      name: 'Insurance Expenses',
      items: [{ name: 'Dental Claim' }, { name: 'Vision Claim' }],
    };

    const result = filterSectionsByQuery(
      [insuranceSection],
      'insurance',
      { categories: true, items: true },
      () => 'Insurance Expenses'
    );

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
  });
});
