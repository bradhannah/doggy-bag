// CalendarGrid Component Tests
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CalendarGrid from './CalendarGrid.svelte';

describe('CalendarGrid Component', () => {
  const defaultProps = {
    month: '2026-02',
    events: [],
    size: 'small' as const,
  };

  describe('grid structure', () => {
    it('renders 7 day headers (Mon-Sun) in the header row', () => {
      const { container } = render(CalendarGrid, { props: defaultProps });

      // Select only headers within the .day-headers container (not .day-header in CalendarDay)
      const headerRow = container.querySelector('.day-headers');
      const headers = headerRow?.querySelectorAll('.day-header');
      expect(headers?.length).toBe(7);

      const headerTexts = Array.from(headers || []).map((h) => h.textContent);
      expect(headerTexts).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    });

    it('renders 42 calendar day cells (6 rows x 7 columns)', () => {
      const { container } = render(CalendarGrid, { props: defaultProps });

      const dayCells = container.querySelectorAll('.calendar-day');
      expect(dayCells.length).toBe(42);
    });

    it('has days-grid with grid display', () => {
      const { container } = render(CalendarGrid, { props: defaultProps });

      const daysGrid = container.querySelector('.days-grid');
      expect(daysGrid).toBeDefined();
      expect(daysGrid).not.toBeNull();
    });

    it('has day-headers with grid display', () => {
      const { container } = render(CalendarGrid, { props: defaultProps });

      const dayHeaders = container.querySelector('.day-headers');
      expect(dayHeaders).toBeDefined();
      expect(dayHeaders).not.toBeNull();
    });
  });

  describe('size classes', () => {
    it('applies size-small class when size is small', () => {
      const { container } = render(CalendarGrid, {
        props: { ...defaultProps, size: 'small' },
      });

      const daysGrid = container.querySelector('.days-grid');
      expect(daysGrid?.classList.contains('size-small')).toBe(true);
    });

    it('applies size-medium class when size is medium', () => {
      const { container } = render(CalendarGrid, {
        props: { ...defaultProps, size: 'medium' },
      });

      const daysGrid = container.querySelector('.days-grid');
      expect(daysGrid?.classList.contains('size-medium')).toBe(true);
    });

    it('applies size-large class when size is large', () => {
      const { container } = render(CalendarGrid, {
        props: { ...defaultProps, size: 'large' },
      });

      const daysGrid = container.querySelector('.days-grid');
      expect(daysGrid?.classList.contains('size-large')).toBe(true);
    });
  });

  describe('current month days', () => {
    it('marks days in current month correctly', () => {
      const { container } = render(CalendarGrid, {
        props: { ...defaultProps, month: '2026-02' },
      });

      // February 2026 has 28 days
      const currentMonthDays = container.querySelectorAll('.calendar-day:not(.other-month)');
      expect(currentMonthDays.length).toBe(28);
    });

    it('marks days outside current month as other-month', () => {
      const { container } = render(CalendarGrid, {
        props: { ...defaultProps, month: '2026-02' },
      });

      const otherMonthDays = container.querySelectorAll('.calendar-day.other-month');
      // 42 total cells - 28 February days = 14 other month days
      expect(otherMonthDays.length).toBe(14);
    });
  });

  describe('events distribution', () => {
    it('passes events to correct calendar day cells', () => {
      const events = [
        {
          id: 'event-1',
          date: '2026-02-15',
          title: 'Test Event',
          type: 'bill' as const,
          is_closed: false,
          is_overdue: false,
          source_id: 'bill-1',
          instance_id: 'instance-1',
        },
        {
          id: 'event-2',
          date: '2026-02-15',
          title: 'Another Event',
          type: 'income' as const,
          is_closed: false,
          is_overdue: false,
          source_id: 'income-1',
          instance_id: 'instance-2',
        },
      ];

      const { container } = render(CalendarGrid, {
        props: { ...defaultProps, events },
      });

      // Find the day with events (should have event items)
      const eventItems = container.querySelectorAll('.calendar-event');
      expect(eventItems.length).toBe(2);
    });

    it('shows event count badge for days with events', () => {
      const events = [
        {
          id: 'event-1',
          date: '2026-02-20',
          title: 'Event 1',
          type: 'bill' as const,
          is_closed: false,
          is_overdue: false,
          source_id: 'bill-1',
          instance_id: 'instance-1',
        },
        {
          id: 'event-2',
          date: '2026-02-20',
          title: 'Event 2',
          type: 'bill' as const,
          is_closed: false,
          is_overdue: false,
          source_id: 'bill-2',
          instance_id: 'instance-2',
        },
        {
          id: 'event-3',
          date: '2026-02-20',
          title: 'Event 3',
          type: 'bill' as const,
          is_closed: false,
          is_overdue: false,
          source_id: 'bill-3',
          instance_id: 'instance-3',
        },
      ];

      const { container } = render(CalendarGrid, {
        props: { ...defaultProps, events },
      });

      const eventCounts = container.querySelectorAll('.event-count');
      // Should have at least one day with event count
      expect(eventCounts.length).toBeGreaterThan(0);

      // Find the count badge showing "3"
      const countBadge = Array.from(eventCounts).find((el) => el.textContent === '3');
      expect(countBadge).toBeDefined();
    });
  });
});
