<script lang="ts">
  import MonthPickerHeader from '../MonthPickerHeader.svelte';
  import PageHeader from '../shared/PageHeader.svelte';
  import CalendarGrid from './CalendarGrid.svelte';
  import CalendarLegend from './CalendarLegend.svelte';
  import Spinner from '../shared/Spinner.svelte';
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
    <PageHeader title="Calendar" subtitle="Bills, income, goals and todos by day.">
      <button
        slot="actions"
        type="button"
        class="btn btn-sm btn-secondary"
        onclick={handleSizeToggle}
        title="Calendar size: {sizeLabels[$calendarSize]} (click to change)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Size: {sizeLabels[$calendarSize]}
      </button>
    </PageHeader>

    {#if $calendarLoading}
      <div class="loading-state">
        <Spinner label="Loading calendar..." />
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
