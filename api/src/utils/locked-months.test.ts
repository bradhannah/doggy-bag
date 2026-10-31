import { describe, expect, test } from 'bun:test';
import { loadLockedMonths } from './locked-months';

describe('loadLockedMonths', () => {
  test('answers from the saved month files, ignoring anything else in the folder', async () => {
    const files: Record<string, unknown> = {
      'data/months/2026-09.json': { month: '2026-09', is_read_only: true },
      'data/months/2026-10.json': { month: '2026-10', is_read_only: false },
      'data/months/2026-11.json': { month: '2026-11' },
    };
    const storage = {
      listFiles: async () => ['2026-09.json', '2026-10.json', '2026-11.json', 'notes.txt'],
      readJSON: async <T>(path: string) => (files[path] ?? null) as T | null,
    };
    const isLocked = await loadLockedMonths(storage);
    expect(isLocked('2026-09')).toBe(true);
    expect(isLocked('2026-10')).toBe(false);
    expect(isLocked('2026-11')).toBe(false);
    expect(isLocked('2027-01')).toBe(false);
  });

  test('an empty data folder locks nothing', async () => {
    const isLocked = await loadLockedMonths({
      listFiles: async () => [],
      readJSON: async () => null,
    });
    expect(isLocked('2026-09')).toBe(false);
  });
});
