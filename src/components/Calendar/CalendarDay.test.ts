// CalendarDay Component Tests
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CalendarDay from './CalendarDay.svelte';

describe('CalendarDay Component', () => {
  const defaultProps = {
    day: 15,
    date: '2026-02-15',
    events: [],
    isCurrentMonth: true,
    isToday: false,
    size: 'small' as const,
  };

  describe('basic rendering', () => {
    it('renders day number', () => {
      const { container } = render(CalendarDay, { props: defaultProps });

      const dayNumber = container.querySelector('.day-number');
      expect(dayNumber?.textContent).toBe('15');
    });

    it('has calendar-day class', () => {
      const { container } = render(CalendarDay, { props: defaultProps });

      const dayCell = container.querySelector('.calendar-day');
      expect(dayCell).not.toBeNull();
    });

    it('has day-events container', () => {
      const { container } = render(CalendarDay, { props: defaultProps });

      const eventsContainer = container.querySelector('.day-events');
      expect(eventsContainer).not.toBeNull();
    });
  });

  describe('size classes', () => {
    it('applies size-small class', () => {
      const { container } = render(CalendarDay, {
        props: { ...defaultProps, size: 'small' },
      });

      const dayCell = container.querySelector('.calendar-day');
      expect(dayCell?.classList.contains('size-small')).toBe(true);
    });

    it('applies size-medium class', () => {
      const { container } = render(CalendarDay, {
        props: { ...defaultProps, size: 'medium' },
      });

      const dayCell = container.querySelector('.calendar-day');
      expect(dayCell?.classList.contains('size-medium')).toBe(true);
    });

    it('applies size-large class', () => {
      const { container } = render(CalendarDay, {
        props: { ...defaultProps, size: 'large' },
      });

      const dayCell = container.querySelector('.calendar-day');
      expect(dayCell?.classList.contains('size-large')).toBe(true);
    });
  });

  describe('state classes', () => {
    it('applies other-month class when not current month', () => {
      const { container } = render(CalendarDay, {
        props: { ...defaultProps, isCurrentMonth: false },
      });

      const dayCell = container.querySelector('.calendar-day');
      expect(dayCell?.classList.contains('other-month')).toBe(true);
    });

    it('applies today class when isToday', () => {
      const { container } = render(CalendarDay, {
        props: { ...defaultProps, isToday: true },
      });

      const dayCell = container.querySelector('.calendar-day');
      expect(dayCell?.classList.contains('today')).toBe(true);

      const dayNumber = container.querySelector('.day-number');
      expect(dayNumber?.classList.contains('today-number')).toBe(true);
    });

    it('applies has-events class when events exist', () => {
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
      ];

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, events },
      });

      const dayCell = container.querySelector('.calendar-day');
      expect(dayCell?.classList.contains('has-events')).toBe(true);
    });

    it('applies has-overdue class when any event is overdue', () => {
      const events = [
        {
          id: 'event-1',
          date: '2026-02-15',
          title: 'Overdue Event',
          type: 'bill' as const,
          is_closed: false,
          is_overdue: true,
          source_id: 'bill-1',
          instance_id: 'instance-1',
        },
      ];

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, events },
      });

      const dayCell = container.querySelector('.calendar-day');
      expect(dayCell?.classList.contains('has-overdue')).toBe(true);
    });
  });

  describe('event count badge', () => {
    it('shows event count when events exist', () => {
      const events = [
        {
          id: 'event-1',
          date: '2026-02-15',
          title: 'Event 1',
          type: 'bill' as const,
          is_closed: false,
          is_overdue: false,
          source_id: 'bill-1',
          instance_id: 'instance-1',
        },
        {
          id: 'event-2',
          date: '2026-02-15',
          title: 'Event 2',
          type: 'income' as const,
          is_closed: false,
          is_overdue: false,
          source_id: 'income-1',
          instance_id: 'instance-2',
        },
      ];

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, events },
      });

      const eventCount = container.querySelector('.event-count');
      expect(eventCount?.textContent).toBe('2');
    });

    it('hides event count when no events', () => {
      const { container } = render(CalendarDay, { props: defaultProps });

      const eventCount = container.querySelector('.event-count');
      expect(eventCount).toBeNull();
    });
  });

  describe('events display', () => {
    it('renders event items', () => {
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
      ];

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, events },
      });

      const eventItems = container.querySelectorAll('.calendar-event');
      expect(eventItems.length).toBe(1);
    });

    it('limits visible events based on size (small = 3 max)', () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        id: `event-${i}`,
        date: '2026-02-15',
        title: `Event ${i + 1}`,
        type: 'bill' as const,
        is_closed: false,
        is_overdue: false,
        source_id: `bill-${i}`,
        instance_id: `instance-${i}`,
      }));

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, size: 'small', events },
      });

      const eventItems = container.querySelectorAll('.calendar-event');
      expect(eventItems.length).toBe(3); // max 3 for small size

      // Should show "+2 more" button
      const moreButton = container.querySelector('.more-events');
      expect(moreButton?.textContent).toBe('+2 more');
    });

    it('limits visible events based on size (medium = 5 max)', () => {
      const events = Array.from({ length: 7 }, (_, i) => ({
        id: `event-${i}`,
        date: '2026-02-15',
        title: `Event ${i + 1}`,
        type: 'bill' as const,
        is_closed: false,
        is_overdue: false,
        source_id: `bill-${i}`,
        instance_id: `instance-${i}`,
      }));

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, size: 'medium', events },
      });

      const eventItems = container.querySelectorAll('.calendar-event');
      expect(eventItems.length).toBe(5); // max 5 for medium size

      const moreButton = container.querySelector('.more-events');
      expect(moreButton?.textContent).toBe('+2 more');
    });

    it('limits visible events based on size (large = 7 max)', () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        id: `event-${i}`,
        date: '2026-02-15',
        title: `Event ${i + 1}`,
        type: 'bill' as const,
        is_closed: false,
        is_overdue: false,
        source_id: `bill-${i}`,
        instance_id: `instance-${i}`,
      }));

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, size: 'large', events },
      });

      const eventItems = container.querySelectorAll('.calendar-event');
      expect(eventItems.length).toBe(7); // max 7 for large size

      const moreButton = container.querySelector('.more-events');
      expect(moreButton?.textContent).toBe('+3 more');
    });
  });

  describe('compact mode', () => {
    it('applies compact class to events when exceeding threshold (small: >2)', () => {
      const events = Array.from({ length: 3 }, (_, i) => ({
        id: `event-${i}`,
        date: '2026-02-15',
        title: `Event ${i + 1}`,
        type: 'bill' as const,
        is_closed: false,
        is_overdue: false,
        source_id: `bill-${i}`,
        instance_id: `instance-${i}`,
      }));

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, size: 'small', events },
      });

      const eventItems = container.querySelectorAll('.calendar-event.compact');
      expect(eventItems.length).toBe(3); // All should be compact
    });

    it('does not apply compact class when below threshold', () => {
      const events = [
        {
          id: 'event-1',
          date: '2026-02-15',
          title: 'Single Event',
          type: 'bill' as const,
          is_closed: false,
          is_overdue: false,
          source_id: 'bill-1',
          instance_id: 'instance-1',
        },
      ];

      const { container } = render(CalendarDay, {
        props: { ...defaultProps, size: 'small', events },
      });

      const compactItems = container.querySelectorAll('.calendar-event.compact');
      expect(compactItems.length).toBe(0);
    });
  });
});
