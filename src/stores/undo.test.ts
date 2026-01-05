// Undo Store Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the API client
vi.mock('$lib/api/client', () => ({
  apiUrl: (path: string) => `http://localhost:3000${path}`,
}));

import { undoStore, undoStack, canUndo, undoLoading, undoError, type UndoEntry } from './undo';

// Sample undo entry
const sampleUndoEntry: UndoEntry = {
  id: 'undo-1',
  entity_type: 'bill',
  entity_id: 'bill-1',
  old_value: { amount: 100 },
  new_value: { amount: 150 },
  timestamp: '2025-01-01T00:00:00Z',
};

describe('Undo Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    undoStore.reset();
  });

  describe('load', () => {
    it('loads undo stack from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stack: [sampleUndoEntry], canUndo: true }),
      });

      await undoStore.load();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/undo');
      expect(get(undoStack)).toEqual([sampleUndoEntry]);
      expect(get(canUndo)).toBe(true);
      expect(get(undoLoading)).toBe(false);
    });

    it('handles empty stack', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stack: [], canUndo: false }),
      });

      await undoStore.load();

      expect(get(undoStack)).toEqual([]);
      expect(get(canUndo)).toBe(false);
    });

    it('sets error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await undoStore.load();

      expect(get(undoError)).toBe('Failed to load undo stack');
      expect(get(undoLoading)).toBe(false);
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockFetch.mockImplementation(() => {
        loadingDuringFetch = get(undoLoading);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ stack: [], canUndo: false }),
        });
      });

      await undoStore.load();

      expect(loadingDuringFetch).toBe(true);
    });
  });

  describe('undo', () => {
    it('performs undo and returns undone entry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            stack: [],
            canUndo: false,
            undone: sampleUndoEntry,
          }),
      });

      const result = await undoStore.undo();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/undo', {
        method: 'POST',
      });
      expect(result.success).toBe(true);
      expect(result.entry).toEqual(sampleUndoEntry);
      expect(get(undoStack)).toEqual([]);
      expect(get(canUndo)).toBe(false);
    });

    it('returns failure on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Nothing to undo' }),
      });

      const result = await undoStore.undo();

      expect(result.success).toBe(false);
      expect(get(undoError)).toBe('Nothing to undo');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await undoStore.undo();

      expect(result.success).toBe(false);
      expect(get(undoError)).toBe('Network error');
    });
  });

  describe('clear', () => {
    it('clears the undo stack', async () => {
      // First load some entries
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stack: [sampleUndoEntry], canUndo: true }),
      });
      await undoStore.load();

      // Then clear
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await undoStore.clear();

      expect(mockFetch).toHaveBeenLastCalledWith('http://localhost:3000/api/undo', {
        method: 'DELETE',
      });
      expect(get(undoStack)).toEqual([]);
      expect(get(canUndo)).toBe(false);
    });

    it('sets error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await undoStore.clear();

      expect(get(undoError)).toBe('Failed to clear undo stack');
    });
  });

  describe('reset', () => {
    it('resets store to initial state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stack: [sampleUndoEntry], canUndo: true }),
      });
      await undoStore.load();

      undoStore.reset();

      expect(get(undoStack)).toEqual([]);
      expect(get(canUndo)).toBe(false);
      expect(get(undoLoading)).toBe(false);
      expect(get(undoError)).toBeNull();
    });
  });
});
