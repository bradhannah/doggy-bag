<script lang="ts">
  import type { CalendarEvent } from '../../stores/calendar';
  import type { CalendarSize } from '../../stores/ui';
  import CalendarDay from './CalendarDay.svelte';

  export let month: string; // YYYY-MM
  export let events: CalendarEvent[] = [];
  export let size: CalendarSize = 'small';

  // Days of week (Monday first)
  const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get today's date string for comparison
  const today = new Date().toISOString().split('T')[0];

  // Generate calendar grid data
  $: calendarDays = generateCalendarDays(month, events);

  interface CalendarDayData {
    day: number;
    date: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
  }

  function generateCalendarDays(month: string, events: CalendarEvent[]): CalendarDayData[] {
    const [year, monthNum] = month.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay = new Date(year, monthNum, 0);

    // Get day of week (0 = Sunday, adjust for Monday start)
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Convert to Monday = 0

    const daysInMonth = lastDay.getDate();
    const days: CalendarDayData[] = [];

    // Group events by date for quick lookup
    const eventsByDate = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const dateEvents = eventsByDate.get(event.date) || [];
      dateEvents.push(event);
      eventsByDate.set(event.date, dateEvents);
    }

    // Previous month padding
    const prevMonth = new Date(year, monthNum - 2, 1);
    const daysInPrevMonth = new Date(year, monthNum - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = formatDate(prevMonth.getFullYear(), prevMonth.getMonth() + 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: date === today,
        events: eventsByDate.get(date) || [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDate(year, monthNum, day);
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday: date === today,
        events: eventsByDate.get(date) || [],
      });
    }

    // Next month padding (fill to complete 6 rows = 42 cells)
    const nextMonth = new Date(year, monthNum, 1);
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = formatDate(nextMonth.getFullYear(), nextMonth.getMonth() + 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: date === today,
        events: eventsByDate.get(date) || [],
      });
    }

    return days;
  }

  function formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
</script>

<div class="calendar-grid">
  <!-- Day of week headers -->
  <div class="day-headers">
    {#each DAYS_OF_WEEK as dayName}
      <div class="day-header">{dayName}</div>
    {/each}
  </div>

  <!-- Calendar days -->
  <div
    class="days-grid"
    class:size-small={size === 'small'}
    class:size-medium={size === 'medium'}
    class:size-large={size === 'large'}
  >
    {#each calendarDays as dayData (dayData.date)}
      <CalendarDay
        day={dayData.day}
        date={dayData.date}
        events={dayData.events}
        isCurrentMonth={dayData.isCurrentMonth}
        isToday={dayData.isToday}
        {size}
      />
    {/each}
  </div>
</div>

<style>
  .calendar-grid {
    display: flex;
    flex-direction: column;
    background: var(--bg-base);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border-default);
  }

  .day-headers {
    display: grid;
    /* minmax(0, 1fr) forces equal columns by ignoring content minimum widths */
    grid-template-columns: repeat(7, minmax(0, 1fr));
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
  }

  .day-header {
    padding: var(--space-2) var(--space-1);
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Weekend headers slightly different color */
  .day-header:nth-child(6),
  .day-header:nth-child(7) {
    color: var(--text-tertiary);
  }

  .days-grid {
    display: grid;
    /* minmax(0, 1fr) forces equal columns by ignoring content minimum widths */
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 1px;
    background: var(--border-subtle);
  }

  @media (max-width: 768px) {
    .day-header {
      padding: var(--space-1);
      font-size: 0.65rem;
    }
  }
</style>
