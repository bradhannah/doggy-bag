<script lang="ts">
  import MonthPickerHeader from '../MonthPickerHeader.svelte';
  import CalendarGrid from './CalendarGrid.svelte';
  import CalendarLegend from './CalendarLegend.svelte';
  import { currentMonth, calendarSize, type CalendarSize } from '../../stores/ui';
  import {
    calendarEvents,
    calendarSummary,
    calendarLoading,
    calendarError,
    loadCalendarMonth,
  } from '../../stores/calendar';

  // Load calendar events when month changes
  $: if ($currentMonth) {
    loadCalendarMonth($currentMonth);
  }

  function handleRefresh() {
    loadCalendarMonth($currentMonth);
  }

  function handleSizeToggle() {
    calendarSize.cycle();
  }

  // Size labels for tooltip
  const sizeLabels: Record<CalendarSize, string> = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
  };
</script>

<div class="calendar-page">
  <MonthPickerHeader showRefresh onRefresh={handleRefresh} />

  <div
    class="calendar-content"
    class:size-small={$calendarSize === 'small'}
    class:size-medium={$calendarSize === 'medium'}
    class:size-large={$calendarSize === 'large'}
  >
    <!-- Calendar toolbar with size toggle -->
    <div class="calendar-toolbar">
      <button
        type="button"
        class="size-toggle"
        onclick={handleSizeToggle}
        title="Calendar size: {sizeLabels[$calendarSize]} (click to change)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span class="size-label">{sizeLabels[$calendarSize]}</span>
      </button>
    </div>

    {#if $calendarLoading}
      <div class="loading-state">
        <span class="spinner"></span>
        <p>Loading calendar...</p>
      </div>
    {:else if $calendarError}
      <div class="error-state">
        <p>Error: {$calendarError}</p>
        <button onclick={() => loadCalendarMonth($currentMonth)}>Retry</button>
      </div>
    {:else}
      <CalendarGrid month={$currentMonth} events={$calendarEvents} size={$calendarSize} />

      <div class="calendar-footer">
        <CalendarLegend summary={$calendarSummary} />
      </div>
    {/if}
  </div>
</div>

<style>
  .calendar-page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg-base);
  }

  .calendar-content {
    flex: 1;
    padding: var(--section-gap);
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    transition: max-width 0.2s ease;
  }

  /* Size modes */
  .calendar-content.size-small {
    max-width: 900px;
  }

  .calendar-content.size-medium {
    max-width: 1100px;
  }

  .calendar-content.size-large {
    max-width: 1400px;
  }

  /* Calendar toolbar */
  .calendar-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--space-3);
  }

  .size-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .size-toggle:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .size-toggle svg {
    flex-shrink: 0;
  }

  .size-label {
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Loading and error states */
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    color: var(--text-secondary);
    min-height: 400px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-default);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--space-3);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    color: var(--error);
  }

  .error-state button {
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: var(--error);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  .calendar-footer {
    margin-top: var(--space-4);
  }

  @media (max-width: 768px) {
    .calendar-content {
      padding: var(--space-3);
    }
  }
</style>
