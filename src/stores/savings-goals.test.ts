// Savings Goals Store Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock the API client before importing the store
vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getBaseUrl: vi.fn(() => 'http://localhost:3000'),
  },
}));

// Mock fetch for status transition endpoints
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import {
  savingsGoals,
  savingsGoalsLoading,
  savingsGoalsError,
  activeGoals,
  pausedGoals,
  completedGoals,
  abandonedGoals,
  openGoals,
  closedGoals,
  totalSavedAmount,
  totalTargetAmount,
  goalsNeedingAttention,
  loadSavingsGoals,
  getSavingsGoal,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  pauseGoal,
  resumeGoal,
  completeGoal,
  abandonGoal,
  getGoalBills,
  clearSavingsGoalsError,
  resetSavingsGoalsStore,
  getTemperatureColor,
  getStatusLabel,
  formatGoalProgress,
  savingsGoalsStore,
  type SavingsGoal,
  type SavingsGoalData,
} from './savings-goals';
import { apiClient } from '$lib/api/client';

// Get typed mock functions
const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockDelete = vi.mocked(apiClient.delete);

// Sample savings goal data
const sampleGoals: SavingsGoal[] = [
  {
    id: 'goal-1',
    name: 'New Laptop',
    target_amount: 150000, // $1500
    current_amount: 50000,
    saved_amount: 50000, // $500
    target_date: '2025-06-01',
    linked_account_id: 'acc-1',
    linked_bill_ids: [],
    status: 'saving',
    temperature: 'green',
    expected_amount: 45000,
    progress_percentage: 33,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'goal-2',
    name: 'Vacation Fund',
    target_amount: 300000, // $3000
    current_amount: 100000,
    saved_amount: 100000, // $1000
    target_date: '2025-12-01',
    linked_account_id: 'acc-1',
    linked_bill_ids: [],
    status: 'saving',
    temperature: 'yellow',
    expected_amount: 120000,
    progress_percentage: 33,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'goal-3',
    name: 'Emergency Fund',
    target_amount: 500000, // $5000
    current_amount: 200000,
    saved_amount: 200000, // $2000
    target_date: '2025-03-01',
    linked_account_id: 'acc-2',
    linked_bill_ids: [],
    status: 'paused',
    paused_at: '2025-01-10T00:00:00Z',
    temperature: 'red',
    expected_amount: 350000,
    progress_percentage: 40,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
  },
  {
    id: 'goal-4',
    name: 'New Phone',
    target_amount: 100000, // $1000
    current_amount: 100000,
    saved_amount: 100000, // $1000
    target_date: '2024-12-01',
    linked_account_id: 'acc-1',
    linked_bill_ids: [],
    status: 'bought',
    completed_at: '2024-12-15T00:00:00Z',
    temperature: 'green',
    expected_amount: 100000,
    progress_percentage: 100,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-12-15T00:00:00Z',
  },
  {
    id: 'goal-5',
    name: 'Gaming Console',
    target_amount: 50000, // $500
    current_amount: 15000,
    saved_amount: 15000, // $150
    target_date: '2024-11-01',
    linked_account_id: 'acc-1',
    linked_bill_ids: [],
    status: 'abandoned',
    completed_at: '2024-10-01T00:00:00Z',
    temperature: 'red',
    expected_amount: 50000,
    progress_percentage: 30,
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-10-01T00:00:00Z',
  },
];

describe('Savings Goals Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSavingsGoalsStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Utility Functions Tests
  // ============================================================================

  describe('utility functions', () => {
    describe('getTemperatureColor', () => {
      it('returns success color for green temperature', () => {
        expect(getTemperatureColor('green')).toBe('var(--success)');
      });

      it('returns warning color for yellow temperature', () => {
        expect(getTemperatureColor('yellow')).toBe('var(--warning)');
      });

      it('returns error color for red temperature', () => {
        expect(getTemperatureColor('red')).toBe('var(--error)');
      });

      it('returns secondary text color for unknown temperature', () => {
        // @ts-expect-error testing unknown value
        expect(getTemperatureColor('unknown')).toBe('var(--text-secondary)');
      });
    });

    describe('getStatusLabel', () => {
      it('returns "Active" for saving status', () => {
        expect(getStatusLabel('saving')).toBe('Active');
      });

      it('returns "Paused" for paused status', () => {
        expect(getStatusLabel('paused')).toBe('Paused');
      });

      it('returns "Completed" for bought status', () => {
        expect(getStatusLabel('bought')).toBe('Completed');
      });

      it('returns "Abandoned" for abandoned status', () => {
        expect(getStatusLabel('abandoned')).toBe('Abandoned');
      });

      it('returns raw status for unknown status', () => {
        // @ts-expect-error testing unknown value
        expect(getStatusLabel('unknown')).toBe('unknown');
      });
    });

    describe('formatGoalProgress', () => {
      it('formats progress correctly', () => {
        const goal = sampleGoals[0];
        expect(formatGoalProgress(goal)).toBe('$500.00 / $1500.00 (33%)');
      });

      it('formats zero progress correctly', () => {
        const goal: SavingsGoal = {
          ...sampleGoals[0],
          saved_amount: 0,
          progress_percentage: 0,
        };
        expect(formatGoalProgress(goal)).toBe('$0.00 / $1500.00 (0%)');
      });

      it('formats completed goal progress correctly', () => {
        const goal = sampleGoals[3]; // bought goal at 100%
        expect(formatGoalProgress(goal)).toBe('$1000.00 / $1000.00 (100%)');
      });
    });
  });

  // ============================================================================
  // Load Savings Goals Tests
  // ============================================================================

  describe('loadSavingsGoals', () => {
    it('fetches goals from API and updates store', async () => {
      mockGet.mockResolvedValue(sampleGoals);

      await loadSavingsGoals();

      expect(mockGet).toHaveBeenCalledWith('/api/savings-goals');
      expect(get(savingsGoals)).toEqual(sampleGoals);
      expect(get(savingsGoalsLoading)).toBe(false);
      expect(get(savingsGoalsError)).toBeNull();
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockGet.mockImplementation(() => {
        loadingDuringFetch = get(savingsGoalsLoading);
        return Promise.resolve([]);
      });

      await loadSavingsGoals();

      expect(loadingDuringFetch).toBe(true);
      expect(get(savingsGoalsLoading)).toBe(false);
    });

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null);

      await loadSavingsGoals();

      expect(get(savingsGoals)).toEqual([]);
    });

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(loadSavingsGoals()).rejects.toThrow('Network error');
      expect(get(savingsGoalsError)).toBe('Network error');
      expect(get(savingsGoalsLoading)).toBe(false);
    });

    it('handles non-Error exceptions', async () => {
      mockGet.mockRejectedValue('String error');

      await expect(loadSavingsGoals()).rejects.toThrow('Failed to load savings goals');
      expect(get(savingsGoalsError)).toBe('Failed to load savings goals');
    });
  });

  // ============================================================================
  // Get Single Savings Goal Tests
  // ============================================================================

  describe('getSavingsGoal', () => {
    it('fetches a single goal by ID', async () => {
      const goal = sampleGoals[0];
      mockGet.mockResolvedValue(goal);

      const result = await getSavingsGoal('goal-1');

      expect(mockGet).toHaveBeenCalledWith('/api/savings-goals/goal-1');
      expect(result).toEqual(goal);
    });

    it('throws error if goal not found', async () => {
      mockGet.mockRejectedValue(new Error('Goal not found'));

      await expect(getSavingsGoal('nonexistent')).rejects.toThrow('Goal not found');
    });
  });

  // ============================================================================
  // Create Savings Goal Tests
  // ============================================================================

  describe('createSavingsGoal', () => {
    it('calls API and reloads goals on success', async () => {
      const newGoalData: SavingsGoalData = {
        name: 'New Car',
        target_amount: 2000000,
        target_date: '2026-01-01',
        linked_account_id: 'acc-1',
      };

      const createdGoal = {
        id: 'goal-new',
        ...newGoalData,
        status: 'saving',
        saved_amount: 0,
        temperature: 'green',
        progress_percentage: 0,
      };

      mockPost.mockResolvedValue(createdGoal);
      mockGet.mockResolvedValue([...sampleGoals, createdGoal]);

      const result = await createSavingsGoal(newGoalData);

      expect(mockPost).toHaveBeenCalledWith('/api/savings-goals', {
        ...newGoalData,
        status: 'saving',
      });
      expect(mockGet).toHaveBeenCalledWith('/api/savings-goals');
      expect(result).toEqual(createdGoal);
    });

    it('uses provided status if specified', async () => {
      const newGoalData: SavingsGoalData = {
        name: 'Paused Goal',
        target_amount: 100000,
        target_date: '2026-01-01',
        linked_account_id: 'acc-1',
        status: 'paused',
      };

      mockPost.mockResolvedValue({ id: 'goal-new', ...newGoalData });
      mockGet.mockResolvedValue([]);

      await createSavingsGoal(newGoalData);

      expect(mockPost).toHaveBeenCalledWith('/api/savings-goals', {
        ...newGoalData,
        status: 'paused',
      });
    });

    it('sets error on API failure', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'));

      await expect(
        createSavingsGoal({
          name: '',
          target_amount: 0,
          target_date: '',
          linked_account_id: '',
        })
      ).rejects.toThrow('Validation failed');
      expect(get(savingsGoalsError)).toBe('Validation failed');
    });

    it('handles non-Error exceptions', async () => {
      mockPost.mockRejectedValue('String error');

      await expect(
        createSavingsGoal({
          name: 'Test',
          target_amount: 1000,
          target_date: '2025-01-01',
          linked_account_id: 'acc-1',
        })
      ).rejects.toThrow('Failed to create savings goal');
    });
  });

  // ============================================================================
  // Update Savings Goal Tests
  // ============================================================================

  describe('updateSavingsGoal', () => {
    it('calls API with ID and updates, then reloads', async () => {
      const updates = { name: 'Updated Laptop Fund' };
      mockPut.mockResolvedValue({ ...sampleGoals[0], ...updates });
      mockGet.mockResolvedValue(sampleGoals);

      await updateSavingsGoal('goal-1', updates);

      expect(mockPut).toHaveBeenCalledWith('/api/savings-goals', 'goal-1', updates);
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockPut.mockRejectedValue(new Error('Not found'));

      await expect(updateSavingsGoal('goal-999', { name: 'Missing' })).rejects.toThrow('Not found');
      expect(get(savingsGoalsError)).toBe('Not found');
    });

    it('handles non-Error exceptions', async () => {
      mockPut.mockRejectedValue('String error');

      await expect(updateSavingsGoal('goal-1', { name: 'Test' })).rejects.toThrow(
        'Failed to update savings goal'
      );
    });
  });

  // ============================================================================
  // Delete Savings Goal Tests
  // ============================================================================

  describe('deleteSavingsGoal', () => {
    it('calls API and reloads on success', async () => {
      mockDelete.mockResolvedValue(null);
      mockGet.mockResolvedValue([]);

      await deleteSavingsGoal('goal-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/savings-goals', 'goal-1');
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets error on API failure', async () => {
      mockDelete.mockRejectedValue(new Error('Cannot delete'));

      await expect(deleteSavingsGoal('goal-1')).rejects.toThrow('Cannot delete');
      expect(get(savingsGoalsError)).toBe('Cannot delete');
    });

    it('handles non-Error exceptions', async () => {
      mockDelete.mockRejectedValue('String error');

      await expect(deleteSavingsGoal('goal-1')).rejects.toThrow('Failed to delete savings goal');
    });
  });

  // ============================================================================
  // Status Transition Tests
  // ============================================================================

  describe('pauseGoal', () => {
    it('pauses a goal successfully', async () => {
      const pausedGoal = { ...sampleGoals[0], status: 'paused', paused_at: '2025-01-20T00:00:00Z' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(pausedGoal),
      });
      mockGet.mockResolvedValue(sampleGoals);

      const result = await pauseGoal('goal-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/savings-goals/goal-1/pause',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      expect(result.status).toBe('paused');
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Goal is not in saving status' }),
      });

      await expect(pauseGoal('goal-3')).rejects.toThrow('Goal is not in saving status');
      expect(get(savingsGoalsError)).toBe('Goal is not in saving status');
    });

    it('handles non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('Network failure');

      await expect(pauseGoal('goal-1')).rejects.toThrow('Failed to pause goal');
    });
  });

  describe('resumeGoal', () => {
    it('resumes a paused goal successfully', async () => {
      const resumedGoal = { ...sampleGoals[2], status: 'saving', paused_at: undefined };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(resumedGoal),
      });
      mockGet.mockResolvedValue(sampleGoals);

      const result = await resumeGoal('goal-3');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/savings-goals/goal-3/resume',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      expect(result.status).toBe('saving');
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Goal is not paused' }),
      });

      await expect(resumeGoal('goal-1')).rejects.toThrow('Goal is not paused');
      expect(get(savingsGoalsError)).toBe('Goal is not paused');
    });

    it('handles non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('Network failure');

      await expect(resumeGoal('goal-3')).rejects.toThrow('Failed to resume goal');
    });
  });

  describe('completeGoal', () => {
    it('completes a goal successfully', async () => {
      const completedGoal = {
        ...sampleGoals[0],
        status: 'bought',
        completed_at: '2025-01-20T00:00:00Z',
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(completedGoal),
      });
      mockGet.mockResolvedValue(sampleGoals);

      const result = await completeGoal('goal-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/savings-goals/goal-1/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
        }
      );
      expect(result.status).toBe('bought');
    });

    it('completes a goal with custom date', async () => {
      const completedGoal = {
        ...sampleGoals[0],
        status: 'bought',
        completed_at: '2025-01-15T00:00:00Z',
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(completedGoal),
      });
      mockGet.mockResolvedValue(sampleGoals);

      await completeGoal('goal-1', '2025-01-15T00:00:00Z');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/savings-goals/goal-1/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed_at: '2025-01-15T00:00:00Z' }),
        }
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Goal is already completed' }),
      });

      await expect(completeGoal('goal-4')).rejects.toThrow('Goal is already completed');
      expect(get(savingsGoalsError)).toBe('Goal is already completed');
    });

    it('handles non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('Network failure');

      await expect(completeGoal('goal-1')).rejects.toThrow('Failed to complete goal');
    });
  });

  describe('abandonGoal', () => {
    it('abandons a goal successfully', async () => {
      const abandonedGoal = {
        ...sampleGoals[0],
        status: 'abandoned',
        completed_at: '2025-01-20T00:00:00Z',
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(abandonedGoal),
      });
      mockGet.mockResolvedValue(sampleGoals);

      const result = await abandonGoal('goal-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/savings-goals/goal-1/abandon',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      expect(result.status).toBe('abandoned');
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Goal is already closed' }),
      });

      await expect(abandonGoal('goal-4')).rejects.toThrow('Goal is already closed');
      expect(get(savingsGoalsError)).toBe('Goal is already closed');
    });

    it('handles non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('Network failure');

      await expect(abandonGoal('goal-1')).rejects.toThrow('Failed to abandon goal');
    });
  });

  // ============================================================================
  // Helper Actions Tests
  // ============================================================================

  describe('getGoalBills', () => {
    it('fetches bills for a goal', async () => {
      const bills = [
        { id: 'bill-1', name: 'Laptop Payment 1' },
        { id: 'bill-2', name: 'Laptop Payment 2' },
      ];
      mockGet.mockResolvedValue(bills);

      const result = await getGoalBills('goal-1');

      expect(mockGet).toHaveBeenCalledWith('/api/savings-goals/goal-1/bills');
      expect(result).toEqual(bills);
    });
  });

  describe('clearSavingsGoalsError', () => {
    it('clears the error state', () => {
      savingsGoalsStore.set({ goals: [], loading: false, error: 'Some error' });

      clearSavingsGoalsError();

      expect(get(savingsGoalsError)).toBeNull();
    });
  });

  describe('resetSavingsGoalsStore', () => {
    it('resets store to initial state', () => {
      savingsGoalsStore.set({ goals: sampleGoals, loading: true, error: 'Some error' });

      resetSavingsGoalsStore();

      expect(get(savingsGoals)).toEqual([]);
      expect(get(savingsGoalsLoading)).toBe(false);
      expect(get(savingsGoalsError)).toBeNull();
    });
  });

  // ============================================================================
  // Derived Stores Tests
  // ============================================================================

  describe('derived stores', () => {
    beforeEach(() => {
      savingsGoalsStore.set({
        goals: sampleGoals,
        loading: false,
        error: null,
      });
    });

    describe('activeGoals', () => {
      it('filters to only saving goals', () => {
        const active = get(activeGoals);
        expect(active).toHaveLength(2);
        expect(active.every((g) => g.status === 'saving')).toBe(true);
        expect(active.map((g) => g.name)).toEqual(['New Laptop', 'Vacation Fund']);
      });
    });

    describe('pausedGoals', () => {
      it('filters to only paused goals', () => {
        const paused = get(pausedGoals);
        expect(paused).toHaveLength(1);
        expect(paused[0].name).toBe('Emergency Fund');
      });
    });

    describe('completedGoals', () => {
      it('filters to only bought goals', () => {
        const completed = get(completedGoals);
        expect(completed).toHaveLength(1);
        expect(completed[0].name).toBe('New Phone');
      });
    });

    describe('abandonedGoals', () => {
      it('filters to only abandoned goals', () => {
        const abandoned = get(abandonedGoals);
        expect(abandoned).toHaveLength(1);
        expect(abandoned[0].name).toBe('Gaming Console');
      });
    });

    describe('openGoals', () => {
      it('includes saving and paused goals', () => {
        const open = get(openGoals);
        expect(open).toHaveLength(3);
        expect(open.every((g) => g.status === 'saving' || g.status === 'paused')).toBe(true);
      });
    });

    describe('closedGoals', () => {
      it('includes bought and abandoned goals', () => {
        const closed = get(closedGoals);
        expect(closed).toHaveLength(2);
        expect(closed.every((g) => g.status === 'bought' || g.status === 'abandoned')).toBe(true);
      });
    });

    describe('totalSavedAmount', () => {
      it('sums saved amounts of active goals only', () => {
        const total = get(totalSavedAmount);
        // goal-1: 50000 + goal-2: 100000 = 150000 (active goals only)
        expect(total).toBe(150000);
      });

      it('returns 0 when no active goals', () => {
        savingsGoalsStore.set({ goals: [], loading: false, error: null });
        expect(get(totalSavedAmount)).toBe(0);
      });
    });

    describe('totalTargetAmount', () => {
      it('sums target amounts of active goals only', () => {
        const total = get(totalTargetAmount);
        // goal-1: 150000 + goal-2: 300000 = 450000 (active goals only)
        expect(total).toBe(450000);
      });

      it('returns 0 when no active goals', () => {
        savingsGoalsStore.set({ goals: [], loading: false, error: null });
        expect(get(totalTargetAmount)).toBe(0);
      });
    });

    describe('goalsNeedingAttention', () => {
      it('returns active goals with yellow or red temperature', () => {
        const attention = get(goalsNeedingAttention);
        // Only goal-2 (yellow) is active and needs attention
        // goal-3 (red) is paused, not active
        expect(attention).toHaveLength(1);
        expect(attention[0].name).toBe('Vacation Fund');
        expect(attention[0].temperature).toBe('yellow');
      });

      it('returns empty array when all active goals are green', () => {
        savingsGoalsStore.set({
          goals: [sampleGoals[0]], // Only New Laptop (green, saving)
          loading: false,
          error: null,
        });
        expect(get(goalsNeedingAttention)).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles concurrent load calls', async () => {
      mockGet.mockResolvedValue(sampleGoals);

      // Start multiple loads simultaneously
      const [result1, result2] = await Promise.all([loadSavingsGoals(), loadSavingsGoals()]);

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(get(savingsGoals)).toEqual(sampleGoals);
    });

    it('handles empty goals array correctly in derived stores', () => {
      savingsGoalsStore.set({ goals: [], loading: false, error: null });

      expect(get(activeGoals)).toEqual([]);
      expect(get(pausedGoals)).toEqual([]);
      expect(get(completedGoals)).toEqual([]);
      expect(get(abandonedGoals)).toEqual([]);
      expect(get(openGoals)).toEqual([]);
      expect(get(closedGoals)).toEqual([]);
      expect(get(totalSavedAmount)).toBe(0);
      expect(get(totalTargetAmount)).toBe(0);
      expect(get(goalsNeedingAttention)).toEqual([]);
    });

    it('maintains loading state correctly after errors', async () => {
      mockGet.mockRejectedValue(new Error('Error'));

      await expect(loadSavingsGoals()).rejects.toThrow();

      expect(get(savingsGoalsLoading)).toBe(false);
    });
  });
});
