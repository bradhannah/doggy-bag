// Projections Store
import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';
import type { ProjectionResponse } from '../types/projections';

interface ProjectionsState {
  data: ProjectionResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectionsState = {
  data: null,
  loading: false,
  error: null,
};

function createProjectionsStore() {
  const { subscribe, set, update } = writable<ProjectionsState>(initialState);

  return {
    subscribe,

    async loadProjection(month: string) {
      update((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await apiClient.get(`/api/projections?month=${month}`);
        update((s) => ({ ...s, data: data as ProjectionResponse, loading: false }));
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Failed to load projections');
        update((s) => ({ ...s, loading: false, error: err.message }));
        throw err;
      }
    },

    reset() {
      set(initialState);
    },
  };
}

export const projectionsStore = createProjectionsStore();

export const projectionData = derived(projectionsStore, ($s) => $s.data);
export const projectionLoading = derived(projectionsStore, ($s) => $s.loading);
export const projectionError = derived(projectionsStore, ($s) => $s.error);
