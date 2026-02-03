// Calendar Store
// Manages calendar events aggregated from bills, incomes, goals, and todos

import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

// ============================================================================
// Types
// ============================================================================

export type CalendarEventType = 'bill' | 'income' | 'goal' | 'todo';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  title: string;
  amount?: number; // In cents (undefined for todos)
  is_closed: boolean;
  is_overdue: boolean;
  source_id: string;
  instance_id: string;
  occurrence_id?: string;
}

export interface CalendarSummary {
  bills: number;
  incomes: number;
  goals: number;
  todos: number;
  total: number;
}

export interface CalendarResponse {
  month: string;
  events: CalendarEvent[];
  summary: CalendarSummary;
}

// ============================================================================
// Store State
// ============================================================================

type CalendarState = {
  month: string; // Current month being viewed (YYYY-MM)
  events: CalendarEvent[];
  summary: CalendarSummary;
  loading: boolean;
  error: string | null;
};

const initialState: CalendarState = {
  month: '',
  events: [],
  summary: { bills: 0, incomes: 0, goals: 0, todos: 0, total: 0 },
  loading: false,
  error: null,
};

const store = writable<CalendarState>(initialState);

// ============================================================================
// Base Stores
// ============================================================================

export const calendarMonth = derived(store, (s) => s.month);
export const calendarEvents = derived(store, (s) => s.events);
export const calendarSummary = derived(store, (s) => s.summary);
export const calendarLoading = derived(store, (s) => s.loading);
export const calendarError = derived(store, (s) => s.error);

// ============================================================================
// Derived Stores - Events by Type
// ============================================================================

/** Bill events */
export const billEvents = derived(calendarEvents, (events) =>
  events.filter((e) => e.type === 'bill')
);

/** Income events */
export const incomeEvents = derived(calendarEvents, (events) =>
  events.filter((e) => e.type === 'income')
);

/** Goal events */
export const goalEvents = derived(calendarEvents, (events) =>
  events.filter((e) => e.type === 'goal')
);

/** Todo events */
export const todoEvents = derived(calendarEvents, (events) =>
  events.filter((e) => e.type === 'todo')
);

/** Overdue events */
export const overdueEvents = derived(calendarEvents, (events) =>
  events.filter((e) => e.is_overdue)
);

/** Open (not closed) events */
export const openEvents = derived(calendarEvents, (events) => events.filter((e) => !e.is_closed));

// ============================================================================
// Derived Stores - Events by Date
// ============================================================================

/**
 * Events grouped by date for calendar display
 * Returns a Map where key is date (YYYY-MM-DD) and value is array of events
 */
export const eventsByDate = derived(calendarEvents, (events) => {
  const grouped = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const dateEvents = grouped.get(event.date) || [];
    dateEvents.push(event);
    grouped.set(event.date, dateEvents);
  }

  return grouped;
});

// ============================================================================
// Actions
// ============================================================================

/**
 * Load calendar events for a specific month
 */
export async function loadCalendarMonth(month: string): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null, month }));

  try {
    const response = (await apiClient.get(`/api/calendar/${month}`)) as CalendarResponse;
    store.update((s) => ({
      ...s,
      events: response.events,
      summary: response.summary,
      loading: false,
    }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load calendar events');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Get events for a specific date from the currently loaded month
 */
export function getEventsForDate(date: string): CalendarEvent[] {
  let events: CalendarEvent[] = [];
  store.subscribe((s) => {
    events = s.events.filter((e) => e.date === date);
  })();
  return events;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display color class for event type
 */
export function getEventTypeColor(type: CalendarEventType): string {
  switch (type) {
    case 'bill':
      return 'error';
    case 'income':
      return 'success';
    case 'goal':
      return 'accent';
    case 'todo':
      return 'purple';
    default:
      return 'default';
  }
}

/**
 * Get human-readable event type label
 */
export function getEventTypeLabel(type: CalendarEventType): string {
  switch (type) {
    case 'bill':
      return 'Bill';
    case 'income':
      return 'Income';
    case 'goal':
      return 'Goal';
    case 'todo':
      return 'Todo';
    default:
      return 'Event';
  }
}

/**
 * Format amount in cents to display string
 */
export function formatAmount(cents?: number): string {
  if (cents === undefined) return '';
  const dollars = cents / 100;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

/**
 * Reset the calendar store to initial state
 */
export function resetCalendarStore(): void {
  store.set(initialState);
}

/**
 * Get the day of month from a date string
 */
export function getDayOfMonth(dateString: string): number {
  return parseInt(dateString.split('-')[2], 10);
}

/**
 * Check if a date is in the current month being viewed
 */
export function isInCurrentMonth(dateString: string, month: string): boolean {
  return dateString.startsWith(month);
}
