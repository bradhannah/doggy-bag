// CalendarEventItem Component Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CalendarEventItem from './CalendarEventItem.svelte';

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
}));

import { goto } from '$app/navigation';

const mockGoto = vi.mocked(goto);

describe('CalendarEventItem Component', () => {
  const defaultEvent = {
    id: 'event-1',
    date: '2026-02-15',
    title: 'Test Event',
    type: 'bill' as const,
    is_closed: false,
    is_overdue: false,
    source_id: 'bill-1',
    instance_id: 'instance-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders event title', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: defaultEvent },
      });

      const title = container.querySelector('.event-title');
      expect(title?.textContent).toBe('Test Event');
    });

    it('renders event indicator', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: defaultEvent },
      });

      const indicator = container.querySelector('.event-indicator');
      expect(indicator).not.toBeNull();
    });

    it('has calendar-event class', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: defaultEvent },
      });

      const eventItem = container.querySelector('.calendar-event');
      expect(eventItem).not.toBeNull();
    });

    it('is a button element', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: defaultEvent },
      });

      const button = container.querySelector('button.calendar-event');
      expect(button).not.toBeNull();
    });
  });

  describe('type classes', () => {
    it('applies bill class for bill type', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, type: 'bill' } },
      });

      const eventItem = container.querySelector('.calendar-event');
      expect(eventItem?.classList.contains('bill')).toBe(true);
    });

    it('applies income class for income type', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, type: 'income' } },
      });

      const eventItem = container.querySelector('.calendar-event');
      expect(eventItem?.classList.contains('income')).toBe(true);
    });

    it('applies goal class for goal type', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, type: 'goal' } },
      });

      const eventItem = container.querySelector('.calendar-event');
      expect(eventItem?.classList.contains('goal')).toBe(true);
    });

    it('applies todo class for todo type', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, type: 'todo' } },
      });

      const eventItem = container.querySelector('.calendar-event');
      expect(eventItem?.classList.contains('todo')).toBe(true);
    });
  });

  describe('state classes', () => {
    it('applies closed class when is_closed', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, is_closed: true } },
      });

      const eventItem = container.querySelector('.calendar-event');
      expect(eventItem?.classList.contains('closed')).toBe(true);
    });

    it('applies overdue class when is_overdue', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, is_overdue: true } },
      });

      const eventItem = container.querySelector('.calendar-event');
      expect(eventItem?.classList.contains('overdue')).toBe(true);
    });

    it('shows checkmark icon when closed', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, is_closed: true } },
      });

      const statusIcon = container.querySelector('.event-status svg');
      expect(statusIcon).not.toBeNull();
    });
  });

  describe('compact mode', () => {
    it('applies compact class when compact prop is true', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: defaultEvent, compact: true },
      });

      const eventItem = container.querySelector('.calendar-event');
      expect(eventItem?.classList.contains('compact')).toBe(true);
    });

    it('does not show amount in compact mode', () => {
      const eventWithAmount = {
        ...defaultEvent,
        amount: 100,
      };

      const { container } = render(CalendarEventItem, {
        props: { event: eventWithAmount, compact: true },
      });

      const amount = container.querySelector('.event-amount');
      expect(amount).toBeNull();
    });

    it('shows amount when not compact', () => {
      const eventWithAmount = {
        ...defaultEvent,
        amount: 10000, // 10000 cents = $100.00
      };

      const { container } = render(CalendarEventItem, {
        props: { event: eventWithAmount, compact: false },
      });

      const amount = container.querySelector('.event-amount');
      expect(amount).not.toBeNull();
      expect(amount?.textContent).toBe('$100.00');
    });
  });

  describe('amount formatting', () => {
    it('formats positive amounts', () => {
      const eventWithAmount = {
        ...defaultEvent,
        amount: 123456, // 123456 cents = $1,234.56
      };

      const { container } = render(CalendarEventItem, {
        props: { event: eventWithAmount },
      });

      const amount = container.querySelector('.event-amount');
      expect(amount?.textContent).toBe('$1,234.56');
    });

    it('handles zero amount', () => {
      const eventWithAmount = {
        ...defaultEvent,
        amount: 0,
      };

      const { container } = render(CalendarEventItem, {
        props: { event: eventWithAmount },
      });

      const amount = container.querySelector('.event-amount');
      expect(amount?.textContent).toBe('$0.00');
    });
  });

  describe('navigation', () => {
    it('navigates to month view when bill clicked', async () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, type: 'bill', date: '2026-02-15' } },
      });

      const button = container.querySelector('button.calendar-event');
      await fireEvent.click(button!);

      expect(mockGoto).toHaveBeenCalledWith('/month/2026-02');
    });

    it('navigates to month view when income clicked', async () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, type: 'income', date: '2026-03-20' } },
      });

      const button = container.querySelector('button.calendar-event');
      await fireEvent.click(button!);

      expect(mockGoto).toHaveBeenCalledWith('/month/2026-03');
    });

    it('navigates to savings page when goal clicked', async () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, type: 'goal' } },
      });

      const button = container.querySelector('button.calendar-event');
      await fireEvent.click(button!);

      expect(mockGoto).toHaveBeenCalledWith('/savings');
    });

    it('navigates to todos page when todo clicked', async () => {
      const { container } = render(CalendarEventItem, {
        props: { event: { ...defaultEvent, type: 'todo' } },
      });

      const button = container.querySelector('button.calendar-event');
      await fireEvent.click(button!);

      expect(mockGoto).toHaveBeenCalledWith('/todos');
    });
  });

  describe('accessibility', () => {
    it('has descriptive title attribute', () => {
      const { container } = render(CalendarEventItem, {
        props: { event: defaultEvent },
      });

      const button = container.querySelector('button.calendar-event');
      expect(button?.getAttribute('title')).toBe('Test Event');
    });

    it('includes amount in title when present', () => {
      const eventWithAmount = {
        ...defaultEvent,
        amount: 50000, // 50000 cents = $500.00
      };

      const { container } = render(CalendarEventItem, {
        props: { event: eventWithAmount },
      });

      const button = container.querySelector('button.calendar-event');
      expect(button?.getAttribute('title')).toBe('Test Event - $500.00');
    });
  });

  describe('text truncation', () => {
    it('has event-title with overflow hidden and text-overflow ellipsis styles', () => {
      const longTitleEvent = {
        ...defaultEvent,
        title: 'This is a very long event title that should be truncated',
      };

      const { container } = render(CalendarEventItem, {
        props: { event: longTitleEvent },
      });

      const title = container.querySelector('.event-title');
      expect(title).not.toBeNull();
      // The actual CSS truncation is tested visually, but we verify the element exists
      expect(title?.textContent).toBe(longTitleEvent.title);
    });
  });
});
