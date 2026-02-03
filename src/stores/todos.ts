// Todos Store
// Manages todo definitions (templates) with CRUD operations

import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

// ============================================================================
// Types
// ============================================================================

export type TodoStatus = 'pending' | 'completed';
export type TodoRecurrence = 'none' | 'weekly' | 'bi_weekly' | 'monthly';

export interface Todo {
  id: string;
  title: string;
  notes?: string;
  due_date?: string; // YYYY-MM-DD (required for one-time, optional for recurring)
  status: TodoStatus;
  completed_at?: string; // ISO timestamp
  recurrence: TodoRecurrence;
  start_date?: string; // For recurring: anchor date
  day_of_month?: number; // For monthly: 1-31
  is_active: boolean; // For recurring: master toggle
  created_at: string;
  updated_at: string;
}

export interface TodoData {
  title: string;
  notes?: string;
  due_date?: string; // Required for one-time, optional for recurring
  recurrence?: TodoRecurrence;
  start_date?: string;
  day_of_month?: number;
}

export interface TodoUpdate {
  title?: string;
  notes?: string | null;
  due_date?: string;
  recurrence?: TodoRecurrence;
  start_date?: string | null;
  day_of_month?: number | null;
  is_active?: boolean;
}

// ============================================================================
// Store State
// ============================================================================

type TodosState = {
  todos: Todo[];
  loading: boolean;
  error: string | null;
};

const initialState: TodosState = {
  todos: [],
  loading: false,
  error: null,
};

const store = writable<TodosState>(initialState);

// ============================================================================
// Base Stores
// ============================================================================

export const todos = derived(store, (s) => s.todos);
export const todosLoading = derived(store, (s) => s.loading);
export const todosError = derived(store, (s) => s.error);

// ============================================================================
// Derived Stores - Filtered by Status/Activity
// ============================================================================

/** Active todos (master toggle is on) */
export const activeTodos = derived(todos, (t) => t.filter((todo) => todo.is_active));

/** Inactive todos (master toggle is off) */
export const inactiveTodos = derived(todos, (t) => t.filter((todo) => !todo.is_active));

/** One-time todos (no recurrence) */
export const oneTimeTodos = derived(todos, (t) => t.filter((todo) => todo.recurrence === 'none'));

/** Recurring todos (any recurrence type) */
export const recurringTodos = derived(todos, (t) => t.filter((todo) => todo.recurrence !== 'none'));

/** Pending todos (not completed) */
export const pendingTodos = derived(todos, (t) => t.filter((todo) => todo.status === 'pending'));

/** Completed todos */
export const completedTodos = derived(todos, (t) =>
  t.filter((todo) => todo.status === 'completed')
);

// ============================================================================
// CRUD Actions
// ============================================================================

/**
 * Load all todos from the API
 */
export async function loadTodos(): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.get('/api/todos');
    const todoList = (data || []) as Todo[];
    store.update((s) => ({ ...s, todos: todoList, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load todos');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Create a new todo
 */
export async function createTodo(data: TodoData): Promise<Todo> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const todo = (await apiClient.post('/api/todos', data)) as Todo;
    store.update((s) => ({
      ...s,
      todos: [...s.todos, todo],
      loading: false,
    }));
    return todo;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create todo');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Update an existing todo
 */
export async function updateTodo(id: string, updates: TodoUpdate): Promise<Todo> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const todo = (await apiClient.putPath(`/api/todos/${id}`, updates)) as Todo;
    store.update((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? todo : t)),
      loading: false,
    }));
    return todo;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update todo');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export type DeleteTodoOption = 'template_only' | 'current_month' | 'future_months';

/**
 * Delete a todo
 * @param id - Todo ID
 * @param option - What to delete:
 *   - 'template_only': Just delete the template, keep all instances
 *   - 'current_month': Delete template + instances from current month
 *   - 'future_months': Delete template + instances from current and future months
 */
export async function deleteTodo(
  id: string,
  option: DeleteTodoOption = 'template_only'
): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    let deleteInstances: string | undefined;
    if (option === 'current_month') {
      deleteInstances = 'current';
    } else if (option === 'future_months') {
      deleteInstances = 'future';
    }

    const queryParams = deleteInstances ? `?deleteInstances=${deleteInstances}` : '';
    await apiClient.deletePath(`/api/todos/${id}${queryParams}`);
    store.update((s) => ({
      ...s,
      todos: s.todos.filter((t) => t.id !== id),
      loading: false,
    }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete todo');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Status Actions
// ============================================================================

/**
 * Complete a todo (mark as completed)
 */
export async function completeTodo(id: string): Promise<Todo> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const todo = (await apiClient.post(`/api/todos/complete/${id}`, {})) as Todo;
    store.update((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? todo : t)),
      loading: false,
    }));
    return todo;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to complete todo');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Reopen a completed todo (mark as pending)
 */
export async function reopenTodo(id: string): Promise<Todo> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const todo = (await apiClient.post(`/api/todos/reopen/${id}`, {})) as Todo;
    store.update((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? todo : t)),
      loading: false,
    }));
    return todo;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to reopen todo');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Activate a todo (enable instance generation for recurring todos)
 */
export async function activateTodo(id: string): Promise<Todo> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const todo = (await apiClient.post(`/api/todos/activate/${id}`, {})) as Todo;
    store.update((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? todo : t)),
      loading: false,
    }));
    return todo;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to activate todo');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Deactivate a todo (disable instance generation for recurring todos)
 */
export async function deactivateTodo(id: string): Promise<Todo> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const todo = (await apiClient.post(`/api/todos/deactivate/${id}`, {})) as Todo;
    store.update((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? todo : t)),
      loading: false,
    }));
    return todo;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to deactivate todo');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a todo by ID from the current store state
 */
export function getTodoById(id: string): Todo | undefined {
  let found: Todo | undefined;
  store.subscribe((s) => {
    found = s.todos.find((t) => t.id === id);
  })();
  return found;
}

/**
 * Get human-readable recurrence label
 */
export function getRecurrenceLabel(recurrence: TodoRecurrence): string {
  switch (recurrence) {
    case 'none':
      return 'One-time';
    case 'weekly':
      return 'Weekly';
    case 'bi_weekly':
      return 'Bi-weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return 'Unknown';
  }
}

/**
 * Reset the store to initial state
 */
export function resetTodosStore(): void {
  store.set(initialState);
}
