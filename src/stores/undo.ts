// Undo Store - Manages undo stack state

import { writable, derived } from 'svelte/store';
import { apiUrl } from '$lib/api/client';

export interface UndoEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  old_value: unknown;
  new_value: unknown;
  timestamp: string;
}

interface UndoState {
  stack: UndoEntry[];
  loading: boolean;
  error: string | null;
  canUndo: boolean;
}

const initialState: UndoState = {
  stack: [],
  loading: false,
  error: null,
  canUndo: false,
};

function createUndoStore() {
  const { subscribe, set, update } = writable<UndoState>(initialState);

  return {
    subscribe,

    async load(): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch(apiUrl('/api/undo'));
        if (!response.ok) {
          throw new Error('Failed to load undo stack');
        }

        const data = await response.json();
        update((state) => ({
          ...state,
          stack: data.stack || [],
          canUndo: data.canUndo || false,
          loading: false,
        }));
      } catch (error) {
        update((state) => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },

    async undo(): Promise<{ success: boolean; entry?: UndoEntry }> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch(apiUrl('/api/undo'), {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to undo');
        }

        const data = await response.json();
        update((state) => ({
          ...state,
          stack: data.stack || [],
          canUndo: data.canUndo || false,
          loading: false,
        }));

        return { success: true, entry: data.undone };
      } catch (error) {
        update((state) => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        return { success: false };
      }
    },

    async clear(): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch(apiUrl('/api/undo'), {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to clear undo stack');
        }

        update((state) => ({
          ...state,
          stack: [],
          canUndo: false,
          loading: false,
        }));
      } catch (error) {
        update((state) => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },

    reset() {
      set(initialState);
    },
  };
}

export const undoStore = createUndoStore();

// Derived stores for convenience
export const undoStack = derived(undoStore, ($store) => $store.stack);
export const canUndo = derived(undoStore, ($store) => $store.canUndo);
export const undoLoading = derived(undoStore, ($store) => $store.loading);
export const undoError = derived(undoStore, ($store) => $store.error);
