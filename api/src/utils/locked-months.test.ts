import { describe, expect, test } from 'bun:test';
import { loadMonthLedger } from './locked-months';

describe('loadMonthLedger', () => {
  test('answers from the saved month files, ignoring anything else in the folder', async () => {
    const files: Record<string, unknown> = {
      'data/months/2026-09.json': { month: '2026-09', is_read_only: true },
      'data/months/2026-10.json': { month: '2026-10', is_read_only: false },
      'data/months/2026-11.json': { month: '2026-11' },
    };
    const storage = {
      listFiles: async () => ['2026-11.json', '2026-09.json', 'notes.txt', '2026-10.json'],
      readJSON: async <T>(path: string) => (files[path] ?? null) as T | null,
    };
    const ledger = await loadMonthLedger(storage);
    expect(ledger.isLocked('2026-09')).toBe(true);
    expect(ledger.isLocked('2026-10')).toBe(false);
    expect(ledger.isLocked('2026-11')).toBe(false);
    expect(ledger.isLocked('2027-01')).toBe(false);
    expect(ledger.newest).toBe('2026-11');
  });

  test('an empty data folder locks nothing and has no newest month', async () => {
    const ledger = await loadMonthLedger({
      listFiles: async () => [],
      readJSON: async () => null,
    });
    expect(ledger.isLocked('2026-09')).toBe(false);
    expect(ledger.newest).toBeUndefined();
  });
});
