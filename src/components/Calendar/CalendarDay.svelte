<script lang="ts">
  import type { CalendarEvent } from '../../stores/calendar';
  import type { CalendarSize } from '../../stores/ui';
  import CalendarEventItem from './CalendarEventItem.svelte';
  import CalendarDayDrawer from './CalendarDayDrawer.svelte';

  export let day: number;
  export let date: string; // YYYY-MM-DD
  export let events: CalendarEvent[] = [];
  export let isCurrentMonth: boolean = true;
  export let isToday: boolean = false;
  export let size: CalendarSize = 'small';

  // Drawer state
  let drawerOpen = false;

  // Max events to show before "+N more" - varies by size
  const MAX_EVENTS_BY_SIZE: Record<CalendarSize, number> = {
    small: 3,
    medium: 5,
    large: 7,
  };

  $: maxVisibleEvents = MAX_EVENTS_BY_SIZE[size];
  $: visibleEvents = events.slice(0, maxVisibleEvents);
  $: hiddenCount = events.length - maxVisibleEvents;
  $: hasOverdue = events.some((e) => e.is_overdue);

  // Compact mode: more aggressive in small size
  $: compactThreshold = size === 'small' ? 2 : size === 'medium' ? 3 : 4;

  function openDrawer() {
    drawerOpen = true;
  }

  function closeDrawer() {
    drawerOpen = false;
  }
</script>

<div
  class="calendar-day"
  class:other-month={!isCurrentMonth}
  class:today={isToday}
  class:has-events={events.length > 0}
  class:has-overdue={hasOverdue}
  class:size-small={size === 'small'}
  class:size-medium={size === 'medium'}
  class:size-large={size === 'large'}
>
  <div class="day-header">
    <span class="day-number" class:today-number={isToday}>{day}</span>
    {#if events.length > 0}
      <span class="event-count">{events.length}</span>
    {/if}
  </div>

  <div class="day-events">
    {#each visibleEvents as event (event.id)}
      <CalendarEventItem {event} compact={events.length > compactThreshold} />
    {/each}

    {#if hiddenCount > 0}
      <button class="more-events" onclick={openDrawer}>+{hiddenCount} more</button>
    {/if}
  </div>
</div>

<CalendarDayDrawer isOpen={drawerOpen} {date} {events} onClose={closeDrawer} />

<style>
  .calendar-day {
    display: flex;
    flex-direction: column;
    min-height: 100px;
    min-width: 0; /* Allow shrinking below content width in grid */
    padding: var(--space-1);
    background: var(--bg-surface);
    /* Grid gaps draw the cell lines; states use inset outlines so lines never double */
    transition: all 0.15s ease;
    overflow: hidden; /* Clip content that exceeds cell bounds */
  }

  /* Size-based min-heights */
  .calendar-day.size-small {
    min-height: 100px;
  }

  .calendar-day.size-medium {
    min-height: 130px;
  }

  .calendar-day.size-large {
    min-height: 160px;
  }

  .calendar-day:hover {
    background: var(--bg-hover);
  }

  .calendar-day.other-month {
    background: var(--bg-base);
    opacity: 0.5;
  }

  .calendar-day.has-overdue {
    box-shadow: inset 0 0 0 1px var(--error);
  }

  .calendar-day.today {
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  .day-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-1);
  }

  /* Fixed square so the "today" highlight is a true circle */
  .day-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--space-6);
    height: var(--space-6);
    font-size: var(--font-size-md);
    font-weight: 500;
    color: var(--text-secondary);
    line-height: 1;
  }

  .day-number.today-number {
    background: var(--accent);
    color: var(--text-inverse);
    border-radius: 50%;
    font-weight: 600;
  }

  .other-month .day-number {
    color: var(--text-tertiary);
  }

  .event-count {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-tertiary);
    background: var(--bg-hover);
    padding: 2px var(--space-1);
    border-radius: var(--radius-sm);
  }

  .day-events {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    overflow: hidden;
  }

  .more-events {
    font-size: 0.65rem;
    color: var(--text-tertiary);
    background: transparent;
    border: none;
    padding: 2px var(--space-1);
    cursor: pointer;
    text-align: left;
    transition: color 0.15s;
  }

  .more-events:hover {
    color: var(--accent);
  }

  @media (max-width: 768px) {
    .calendar-day {
      min-height: 70px;
      padding: 2px;
    }

    .day-number {
      width: var(--space-5);
      height: var(--space-5);
      font-size: var(--font-size-xs);
    }

    .event-count {
      display: none;
    }
  }
</style>
