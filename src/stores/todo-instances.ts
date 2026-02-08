// Todo Instances Store
// Manages todo instances for specific months with CRUD operations

import { writable, derived, get } from 'svelte/store';
import { apiClient } from '$lib/api/client';
import { getTodayDateString } from '$lib/utils/format';
import type { TodoStatus } from './todos';

// ============================================================================
// Types
// ============================================================================

export interface TodoInstance {
  id: string;
  todo_id: string | null; // null for ad-hoc todos
  month: string; // YYYY-MM
  title: string;
  notes?: string;
  due_date: string; // YYYY-MM-DD
  status: TodoStatus;
  completed_at?: string; // ISO timestamp
  is_adhoc: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodoInstanceData {
  title: string;
  notes?: string;
  due_date: string;
}

export interface TodoInstanceUpdate {
  title?: string;
  notes?: string | null;
  due_date?: string;
}

// ============================================================================
// Store State
// ============================================================================

type TodoInstancesState = {
  instances: TodoInstance[];
  currentMonth: string | null;
  loading: boolean;
  error: string | null;
};

const initialState: TodoInstancesState = {
  instances: [],
  currentMonth: null,
  loading: false,
  error: null,
};

const store = writable<TodoInstancesState>(initialState);

// ============================================================================
// Base Stores
// ============================================================================

export const todoInstances = derived(store, (s) => s.instances);
export const todoInstancesLoading = derived(store, (s) => s.loading);
export const todoInstancesError = derived(store, (s) => s.error);
export const todoInstancesMonth = derived(store, (s) => s.currentMonth);

// ============================================================================
// Derived Stores - Filtered by Status
// ============================================================================

/** Pending instances (sorted by due date, earliest first) */
export const pendingInstances = derived(todoInstances, (instances) =>
  instances
    .filter((i) => i.status === 'pending')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
);

/** Completed instances (sorted by completed_at, most recent first) */
export const completedInstances = derived(todoInstances, (instances) =>
  instances
    .filter((i) => i.status === 'completed')
    .sort((a, b) => {
      if (a.completed_at && b.completed_at) {
        return b.completed_at.localeCompare(a.completed_at);
      }
      return 0;
    })
);

/** Overdue instances (pending with due_date < today) */
export const overdueInstances = derived(todoInstances, (instances) => {
  const today = getTodayDateString();
  return instances
    .filter((i) => i.status === 'pending' && i.due_date < today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
});

/** Ad-hoc instances (created directly, not from a todo template) */
export const adhocInstances = derived(todoInstances, (instances) =>
  instances.filter((i) => i.is_adhoc)
);

// ============================================================================
// CRUD Actions
// ============================================================================

/**
 * Load todo instances for a specific month
 */
export async function loadTodoInstancesForMonth(month: string): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null, currentMonth: month }));

  try {
    const data = await apiClient.get(`/api/months/${month}/todos`);
    const instances = (data || []) as TodoInstance[];
    store.update((s) => ({ ...s, instances, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load todo instances');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Sync todo instances for a month (adds missing instances from recurring todos)
 */
export async function syncTodoInstances(month: string): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.post(`/api/months/${month}/todos/sync`, {});
    const instances = (data || []) as TodoInstance[];
    store.update((s) => ({ ...s, instances, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to sync todo instances');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Create an ad-hoc todo instance for a month
 */
export async function createAdhocInstance(
  month: string,
  data: TodoInstanceData
): Promise<TodoInstance> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const instance = (await apiClient.post(`/api/months/${month}/todos`, data)) as TodoInstance;
    store.update((s) => ({
      ...s,
      instances: [...s.instances, instance],
      loading: false,
    }));
    return instance;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create todo instance');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Update a todo instance
 */
export async function updateTodoInstance(
  month: string,
  instanceId: string,
  updates: TodoInstanceUpdate
): Promise<TodoInstance> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const instance = (await apiClient.putPath(
      `/api/months/${month}/todos/${instanceId}`,
      updates
    )) as TodoInstance;
    store.update((s) => ({
      ...s,
      instances: s.instances.map((i) => (i.id === instanceId ? instance : i)),
      loading: false,
    }));
    return instance;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update todo instance');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Delete a todo instance
 */
export async function deleteTodoInstance(month: string, instanceId: string): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.deletePath(`/api/months/${month}/todos/${instanceId}`);
    store.update((s) => ({
      ...s,
      instances: s.instances.filter((i) => i.id !== instanceId),
      loading: false,
    }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete todo instance');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Status Actions
// ============================================================================

/**
 * Complete a todo instance
 */
export async function completeTodoInstance(
  month: string,
  instanceId: string
): Promise<TodoInstance> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const instance = (await apiClient.post(
      `/api/months/${month}/todos/${instanceId}/complete`,
      {}
    )) as TodoInstance;
    store.update((s) => ({
      ...s,
      instances: s.instances.map((i) => (i.id === instanceId ? instance : i)),
      loading: false,
    }));
    return instance;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to complete todo instance');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Reopen a completed todo instance
 */
export async function reopenTodoInstance(month: string, instanceId: string): Promise<TodoInstance> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const instance = (await apiClient.post(
      `/api/months/${month}/todos/${instanceId}/reopen`,
      {}
    )) as TodoInstance;
    store.update((s) => ({
      ...s,
      instances: s.instances.map((i) => (i.id === instanceId ? instance : i)),
      loading: false,
    }));
    return instance;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to reopen todo instance');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get an instance by ID from the current store state
 */
export function getTodoInstanceById(instanceId: string): TodoInstance | undefined {
  const state = get(store);
  return state.instances.find((i) => i.id === instanceId);
}

/**
 * Check if a todo instance is overdue
 */
export function isOverdue(instance: TodoInstance): boolean {
  if (instance.status === 'completed') return false;
  const today = getTodayDateString();
  return instance.due_date < today;
}

/**
 * Get instances for a specific date
 */
export function getInstancesForDate(date: string): TodoInstance[] {
  const state = get(store);
  return state.instances.filter((i) => i.due_date === date);
}

/**
 * Reset the store to initial state
 */
export function resetTodoInstancesStore(): void {
  store.set(initialState);
}
