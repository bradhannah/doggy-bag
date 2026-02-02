// Calendar Store Tests
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

import {
  calendarMonth,
  calendarEvents,
  calendarSummary,
  calendarLoading,
  calendarError,
  billEvents,
  incomeEvents,
  goalEvents,
  todoEvents,
  overdueEvents,
  openEvents,
  eventsByDate,
  loadCalendarMonth,
  getEventsForDate,
  getEventTypeColor,
  getEventTypeLabel,
  formatAmount,
  resetCalendarStore,
  getDayOfMonth,
  isInCurrentMonth,
  type CalendarEvent,
  type CalendarSummary,
} from './calendar';
import { apiClient } from '$lib/api/client';

// Get typed mock functions
const mockGet = vi.mocked(apiClient.get);

// Sample calendar events
const sampleEvents: CalendarEvent[] = [
  {
    id: 'bill-rent-001',
    type: 'bill',
    date: '2026-02-01',
    title: 'Rent',
    amount: 150000,
    is_closed: false,
    is_overdue: true,
    source_id: 'bill-1',
    instance_id: 'bi-1',
    occurrence_id: 'occ-1',
  },
  {
    id: 'income-salary-001',
    type: 'income',
    date: '2026-02-05',
    title: 'Salary',
    amount: 500000,
    is_closed: true,
    is_overdue: false,
    source_id: 'income-1',
    instance_id: 'ii-1',
    occurrence_id: 'occ-2',
  },
  {
    id: 'goal-vacation-001',
    type: 'goal',
    date: '2026-02-15',
    title: 'Vacation Fund',
    amount: 10000,
    is_closed: false,
    is_overdue: false,
    source_id: 'goal-1',
    instance_id: 'bi-2',
    occurrence_id: 'occ-3',
  },
  {
    id: 'todo-taxes-001',
    type: 'todo',
    date: '2026-02-15',
    title: 'Pay Taxes',
    amount: undefined,
    is_closed: false,
    is_overdue: false,
    source_id: 'todo-1',
    instance_id: 'ti-1',
  },
  {
    id: 'bill-internet-001',
    type: 'bill',
    date: '2026-02-20',
    title: 'Internet',
    amount: 7999,
    is_closed: true,
    is_overdue: false,
    source_id: 'bill-2',
    instance_id: 'bi-3',
    occurrence_id: 'occ-4',
  },
];

const sampleSummary: CalendarSummary = {
  bills: 2,
  incomes: 1,
  goals: 1,
  todos: 1,
  total: 5,
};

const sampleResponse = {
  month: '2026-02',
  events: sampleEvents,
  summary: sampleSummary,
};

describe('Calendar Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalendarStore();
  });

  afterEach(() => {
    resetCalendarStore();
  });

  // ============================================================================
  // loadCalendarMonth Tests
  // ============================================================================

  describe('loadCalendarMonth', () => {
    it('should load calendar events for a month', async () => {
      mockGet.mockResolvedValueOnce(sampleResponse);

      await loadCalendarMonth('2026-02');

      expect(mockGet).toHaveBeenCalledWith('/api/calendar/2026-02');
      expect(get(calendarMonth)).toBe('2026-02');
      expect(get(calendarEvents)).toHaveLength(5);
      expect(get(calendarSummary)).toEqual(sampleSummary);
    });

    it('should set loading state while fetching', async () => {
      // Create a promise we can control
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGet.mockReturnValueOnce(promise as Promise<unknown>);

      const loadPromise = loadCalendarMonth('2026-02');

      // Check loading is true
      expect(get(calendarLoading)).toBe(true);

      // Resolve the API call
      resolvePromise!(sampleResponse);
      await loadPromise;

      // Check loading is false
      expect(get(calendarLoading)).toBe(false);
    });

    it('should handle API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      await expect(loadCalendarMonth('2026-02')).rejects.toThrow('Network error');
      expect(get(calendarError)).toBe('Network error');
      expect(get(calendarLoading)).toBe(false);
    });

    it('should clear previous error on new load', async () => {
      // First, set an error state
      mockGet.mockRejectedValueOnce(new Error('First error'));
      try {
        await loadCalendarMonth('2026-02');
      } catch {
        // expected
      }
      expect(get(calendarError)).toBe('First error');

      // Now load successfully
      mockGet.mockResolvedValueOnce(sampleResponse);
      await loadCalendarMonth('2026-02');

      expect(get(calendarError)).toBeNull();
    });
  });

  // ============================================================================
  // Derived Stores Tests
  // ============================================================================

  describe('Derived Stores', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValueOnce(sampleResponse);
      await loadCalendarMonth('2026-02');
    });

    it('should filter bill events', () => {
      const bills = get(billEvents);
      expect(bills).toHaveLength(2);
      expect(bills.every((e) => e.type === 'bill')).toBe(true);
    });

    it('should filter income events', () => {
      const incomes = get(incomeEvents);
      expect(incomes).toHaveLength(1);
      expect(incomes[0].title).toBe('Salary');
    });

    it('should filter goal events', () => {
      const goals = get(goalEvents);
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toBe('Vacation Fund');
    });

    it('should filter todo events', () => {
      const todos = get(todoEvents);
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('Pay Taxes');
    });

    it('should filter overdue events', () => {
      const overdue = get(overdueEvents);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].title).toBe('Rent');
    });

    it('should filter open (not closed) events', () => {
      const open = get(openEvents);
      expect(open).toHaveLength(3); // Rent, Vacation Fund, Pay Taxes
      expect(open.every((e) => !e.is_closed)).toBe(true);
    });

    it('should group events by date', () => {
      const byDate = get(eventsByDate);
      expect(byDate.size).toBe(4); // 4 unique dates

      // Check Feb 15 has 2 events
      const feb15Events = byDate.get('2026-02-15');
      expect(feb15Events).toHaveLength(2);
    });
  });

  // ============================================================================
  // getEventsForDate Tests
  // ============================================================================

  describe('getEventsForDate', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValueOnce(sampleResponse);
      await loadCalendarMonth('2026-02');
    });

    it('should return events for a specific date', () => {
      const events = getEventsForDate('2026-02-01');
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Rent');
    });

    it('should return multiple events for dates with multiple events', () => {
      const events = getEventsForDate('2026-02-15');
      expect(events).toHaveLength(2);
    });

    it('should return empty array for dates with no events', () => {
      const events = getEventsForDate('2026-02-10');
      expect(events).toHaveLength(0);
    });
  });

  // ============================================================================
  // Utility Functions Tests
  // ============================================================================

  describe('Utility Functions', () => {
    describe('getEventTypeColor', () => {
      it('should return correct color for bill type', () => {
        expect(getEventTypeColor('bill')).toBe('error');
      });

      it('should return correct color for income type', () => {
        expect(getEventTypeColor('income')).toBe('success');
      });

      it('should return correct color for goal type', () => {
        expect(getEventTypeColor('goal')).toBe('accent');
      });

      it('should return correct color for todo type', () => {
        expect(getEventTypeColor('todo')).toBe('purple');
      });
    });

    describe('getEventTypeLabel', () => {
      it('should return correct label for bill type', () => {
        expect(getEventTypeLabel('bill')).toBe('Bill');
      });

      it('should return correct label for income type', () => {
        expect(getEventTypeLabel('income')).toBe('Income');
      });

      it('should return correct label for goal type', () => {
        expect(getEventTypeLabel('goal')).toBe('Goal');
      });

      it('should return correct label for todo type', () => {
        expect(getEventTypeLabel('todo')).toBe('Todo');
      });
    });

    describe('formatAmount', () => {
      it('should format cents to currency string', () => {
        expect(formatAmount(150000)).toBe('$1,500.00');
      });

      it('should handle small amounts', () => {
        expect(formatAmount(99)).toBe('$0.99');
      });

      it('should return empty string for undefined', () => {
        expect(formatAmount(undefined)).toBe('');
      });
    });

    describe('getDayOfMonth', () => {
      it('should extract day from date string', () => {
        expect(getDayOfMonth('2026-02-15')).toBe(15);
      });

      it('should handle single digit days', () => {
        expect(getDayOfMonth('2026-02-01')).toBe(1);
      });
    });

    describe('isInCurrentMonth', () => {
      it('should return true for dates in the month', () => {
        expect(isInCurrentMonth('2026-02-15', '2026-02')).toBe(true);
      });

      it('should return false for dates outside the month', () => {
        expect(isInCurrentMonth('2026-03-01', '2026-02')).toBe(false);
      });
    });
  });

  // ============================================================================
  // resetCalendarStore Tests
  // ============================================================================

  describe('resetCalendarStore', () => {
    it('should reset all store values to initial state', async () => {
      mockGet.mockResolvedValueOnce(sampleResponse);
      await loadCalendarMonth('2026-02');

      // Verify data was loaded
      expect(get(calendarEvents).length).toBeGreaterThan(0);

      // Reset
      resetCalendarStore();

      // Verify reset
      expect(get(calendarMonth)).toBe('');
      expect(get(calendarEvents)).toHaveLength(0);
      expect(get(calendarSummary).total).toBe(0);
      expect(get(calendarLoading)).toBe(false);
      expect(get(calendarError)).toBeNull();
    });
  });
});
