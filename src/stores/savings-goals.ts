// Savings Goals Store
// Manages savings goals state with CRUD operations and status transitions

import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

// ============================================================================
// Types
// ============================================================================

export type SavingsGoalStatus = 'saving' | 'paused' | 'bought' | 'abandoned' | 'archived';
export type GoalTemperature = 'green' | 'yellow' | 'red';

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number; // Cents
  current_amount: number; // Cents (legacy, use saved_amount instead)
  saved_amount: number; // Cents - calculated from closed bill occurrences
  target_date?: string; // YYYY-MM-DD (optional for open-ended goals)
  linked_account_id: string; // Reference to PaymentSource
  status: SavingsGoalStatus;
  paused_at?: string; // ISO timestamp when goal was paused
  completed_at?: string; // ISO timestamp when goal was bought/abandoned
  previous_status?: 'bought' | 'abandoned'; // Status before archiving
  archived_at?: string; // ISO timestamp when goal was archived
  notes?: string;
  temperature: GoalTemperature; // Calculated: green/yellow/red
  expected_amount: number; // Calculated: expected based on linear progress
  progress_percentage: number; // Calculated: percentage of target reached
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalData {
  name: string;
  target_amount: number;
  target_date?: string; // Optional for open-ended goals
  linked_account_id: string;
  status?: SavingsGoalStatus;
  notes?: string;
}

export interface SavingsGoalUpdate {
  name?: string;
  target_amount?: number;
  target_date?: string | null; // null to clear the target date
  linked_account_id?: string;
  notes?: string;
}

// ============================================================================
// Store State
// ============================================================================

type SavingsGoalsState = {
  goals: SavingsGoal[];
  loading: boolean;
  error: string | null;
};

const initialState: SavingsGoalsState = {
  goals: [],
  loading: false,
  error: null,
};

const store = writable<SavingsGoalsState>(initialState);

// ============================================================================
// Base Stores
// ============================================================================

export const savingsGoals = derived(store, (s) => s.goals);
export const savingsGoalsLoading = derived(store, (s) => s.loading);
export const savingsGoalsError = derived(store, (s) => s.error);

// ============================================================================
// Derived Stores - Filtered by Status
// ============================================================================

/** Goals that are actively being saved for */
export const activeGoals = derived(savingsGoals, (goals) =>
  goals.filter((g) => g.status === 'saving')
);

/** Goals that are paused */
export const pausedGoals = derived(savingsGoals, (goals) =>
  goals.filter((g) => g.status === 'paused')
);

/** Goals that have been completed (bought) */
export const completedGoals = derived(savingsGoals, (goals) =>
  goals.filter((g) => g.status === 'bought')
);

/** Goals that have been abandoned */
export const abandonedGoals = derived(savingsGoals, (goals) =>
  goals.filter((g) => g.status === 'abandoned')
);

/** All open goals (saving or paused) */
export const openGoals = derived(savingsGoals, (goals) =>
  goals.filter((g) => g.status === 'saving' || g.status === 'paused')
);

/** All closed goals (bought or abandoned) */
export const closedGoals = derived(savingsGoals, (goals) =>
  goals.filter((g) => g.status === 'bought' || g.status === 'abandoned')
);

/** All archived goals */
export const archivedGoals = derived(savingsGoals, (goals) =>
  goals.filter((g) => g.status === 'archived')
);

// ============================================================================
// Derived Stores - Aggregates
// ============================================================================

/** Total amount saved across all active goals */
export const totalSavedAmount = derived(activeGoals, (goals) =>
  goals.reduce((sum, g) => sum + g.saved_amount, 0)
);

/** Total target amount across all active goals */
export const totalTargetAmount = derived(activeGoals, (goals) =>
  goals.reduce((sum, g) => sum + g.target_amount, 0)
);

/** Count of goals that need attention (yellow or red temperature) */
export const goalsNeedingAttention = derived(activeGoals, (goals) =>
  goals.filter((g) => g.temperature === 'yellow' || g.temperature === 'red')
);

// ============================================================================
// CRUD Actions
// ============================================================================

/**
 * Load all savings goals from the API
 */
export async function loadSavingsGoals(): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.get('/api/savings-goals');
    const goals = (data || []) as SavingsGoal[];
    store.update((s) => ({ ...s, goals, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load savings goals');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Get a single savings goal by ID
 */
export async function getSavingsGoal(id: string): Promise<SavingsGoal> {
  const data = await apiClient.get(`/api/savings-goals/${id}`);
  return data as SavingsGoal;
}

/**
 * Create a new savings goal
 */
export async function createSavingsGoal(data: SavingsGoalData): Promise<SavingsGoal> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const goal = await apiClient.post('/api/savings-goals', {
      ...data,
      status: data.status || 'saving',
    });
    await loadSavingsGoals();
    return goal as SavingsGoal;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create savings goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Update an existing savings goal
 */
export async function updateSavingsGoal(
  id: string,
  updates: SavingsGoalUpdate
): Promise<SavingsGoal> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const goal = await apiClient.put('/api/savings-goals', id, updates);
    await loadSavingsGoals();
    return goal as SavingsGoal;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update savings goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Delete a savings goal
 */
export async function deleteSavingsGoal(id: string): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.delete('/api/savings-goals', id);
    await loadSavingsGoals();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete savings goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Status Transition Actions
// ============================================================================

/**
 * Pause a saving goal
 * @throws Error if goal is not in 'saving' status
 */
export async function pauseGoal(id: string): Promise<SavingsGoal> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`${apiClient.getBaseUrl()}/api/savings-goals/${id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to pause goal');
    }

    const goal = await response.json();
    await loadSavingsGoals();
    return goal as SavingsGoal;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to pause goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Resume a paused goal
 * @throws Error if goal is not in 'paused' status
 */
export async function resumeGoal(id: string): Promise<SavingsGoal> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`${apiClient.getBaseUrl()}/api/savings-goals/${id}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to resume goal');
    }

    const goal = await response.json();
    await loadSavingsGoals();
    return goal as SavingsGoal;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to resume goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Complete a goal (Buy That Thing!)
 * @param id - Goal ID
 * @param completedAt - Optional completion date (defaults to now)
 * @throws Error if goal is already closed
 */
export async function completeGoal(id: string, completedAt?: string): Promise<SavingsGoal> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`${apiClient.getBaseUrl()}/api/savings-goals/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: completedAt ? JSON.stringify({ completed_at: completedAt }) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete goal');
    }

    const goal = await response.json();
    await loadSavingsGoals();
    return goal as SavingsGoal;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to complete goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Abandon a goal
 * @throws Error if goal is already closed
 */
export async function abandonGoal(id: string): Promise<SavingsGoal> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`${apiClient.getBaseUrl()}/api/savings-goals/${id}/abandon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to abandon goal');
    }

    const goal = await response.json();
    await loadSavingsGoals();
    return goal as SavingsGoal;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to abandon goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Archive a goal (move to archived status)
 * @throws Error if goal is not in 'bought' or 'abandoned' status
 */
export async function archiveGoal(id: string): Promise<SavingsGoal> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`${apiClient.getBaseUrl()}/api/savings-goals/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to archive goal');
    }

    const goal = await response.json();
    await loadSavingsGoals();
    return goal as SavingsGoal;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to archive goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Unarchive a goal (restore from archived status)
 * @param id - Goal ID
 * @param restoreToStatus - Status to restore the goal to ('bought' or 'abandoned')
 * @throws Error if goal is not in 'archived' status
 */
export async function unarchiveGoal(
  id: string,
  restoreToStatus: 'bought' | 'abandoned'
): Promise<SavingsGoal> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`${apiClient.getBaseUrl()}/api/savings-goals/${id}/unarchive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restore_to_status: restoreToStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unarchive goal');
    }

    const goal = await response.json();
    await loadSavingsGoals();
    return goal as SavingsGoal;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to unarchive goal');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Helper Actions
// ============================================================================

/**
 * Get bills linked to a savings goal
 */
export async function getGoalBills(goalId: string): Promise<unknown[]> {
  const data = await apiClient.get(`/api/savings-goals/${goalId}/bills`);
  return data as unknown[];
}

/**
 * Clear the error state
 */
export function clearSavingsGoalsError(): void {
  store.update((s) => ({ ...s, error: null }));
}

/**
 * Reset the store to initial state
 */
export function resetSavingsGoalsStore(): void {
  store.set(initialState);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the display color for a temperature indicator
 */
export function getTemperatureColor(temperature: GoalTemperature): string {
  switch (temperature) {
    case 'green':
      return 'var(--success)';
    case 'yellow':
      return 'var(--warning)';
    case 'red':
      return 'var(--error)';
    default:
      return 'var(--text-secondary)';
  }
}

/**
 * Get the display label for a goal status
 */
export function getStatusLabel(status: SavingsGoalStatus): string {
  switch (status) {
    case 'saving':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'bought':
      return 'Completed';
    case 'abandoned':
      return 'Abandoned';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
}

/**
 * Format a goal's progress as a human-readable string
 */
export function formatGoalProgress(goal: SavingsGoal): string {
  const saved = (goal.saved_amount / 100).toFixed(2);
  const target = (goal.target_amount / 100).toFixed(2);
  return `$${saved} / $${target} (${goal.progress_percentage}%)`;
}

// Export the raw store for testing
export const savingsGoalsStore = store;
