<script lang="ts">
  import {
    projectionsStore,
    projectionData,
    projectionLoading,
    projectionError,
  } from '../../stores/projections';
  import type { ProjectionResponse } from '../../types/projections';
  import HistogramChart from './HistogramChart.svelte';
  import OverdueBillsBanner from '../OverdueBillsBanner.svelte';
  import { formatCurrency, getTodayDateString, parseLocalDate } from '$lib/utils/format';
  import MonthPickerHeader from '../MonthPickerHeader.svelte';
  import PageHeader from '../shared/PageHeader.svelte';
  import { currentMonth } from '../../stores/ui';

  let selectedDate: string | null = null;

  // Follows the month chosen in the shared month bar, like Budget and Savings
  $: projectionsStore.loadProjection($currentMonth);

  const todayStr = getTodayDateString();

  type ProjectionDay = ProjectionResponse['days'][number];
  type ProjectionEvent = ProjectionDay['events'][number];

  $: chartData = $projectionData || null;

  $: if (chartData) {
    if (!selectedDate || !selectedDate.startsWith($currentMonth)) {
      const todayMatch = chartData.days.find((day) => day.date === todayStr);
      selectedDate = todayMatch ? todayMatch.date : (chartData.days[0]?.date ?? null);
    }
  }

  $: selectedDay = chartData?.days.find((day) => day.date === selectedDate) ?? null;
  $: isSelectedPast = selectedDay ? selectedDay.date < todayStr : false;
  $: selectedEvents = selectedDay
    ? selectedDay.events.filter((event: ProjectionEvent) => {
        if (!('kind' in event)) return true;
        return isSelectedPast ? event.kind === 'actual' : event.kind === 'scheduled';
      })
    : [];
</script>

<MonthPickerHeader
  showRefresh={true}
  onRefresh={() => projectionsStore.loadProjection($currentMonth)}
/>

<div class="projections-page">
  <PageHeader
    title="Projections"
    subtitle="Forecast daily balances with upcoming income and bills."
  />

  {#if $projectionLoading}
    <div class="loading">Loading projection...</div>
  {:else if $projectionError}
    <div class="error" role="status">
      <p>{$projectionError}</p>
      <a class="btn btn-sm btn-secondary" href="/month/{$currentMonth}">Open Budget</a>
    </div>
  {:else if chartData}
    {#if chartData.no_data}
      <div class="no-data">
        <p>No data for this month yet.</p>
        <p class="hint">Create a month from the main page to see projections here.</p>
      </div>
    {:else}
      <div class="content">
        <OverdueBillsBanner
          overdueBills={chartData.overdue_bills}
          description="These unpaid bills are scheduled at the start of the projection."
        />

        <div class="chart-section">
          <HistogramChart
            data={chartData}
            {selectedDate}
            on:select={(event) => (selectedDate = event.detail.day.date)}
          />
        </div>

        {#if selectedDay}
          <section class="day-details">
            <header>
              <div>
                <h2>
                  {parseLocalDate(selectedDay.date).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>
                <p>{isSelectedPast ? 'Actuals' : 'Estimated'} for the day</p>
              </div>
              <div class="day-totals">
                {#if selectedDay.income > 0}
                  <div class="income">Income: +{formatCurrency(selectedDay.income)}</div>
                {/if}
                {#if selectedDay.expense > 0}
                  <div class="expense">Expense: -{formatCurrency(selectedDay.expense)}</div>
                {/if}
                {#if selectedDay.balance !== null}
                  <div class="balance">Balance: {formatCurrency(selectedDay.balance)}</div>
                {/if}
              </div>
            </header>
            {#if selectedEvents.length > 0}
              <ul>
                {#each selectedEvents as event (event.name + String(event.amount) + event.type)}
                  <li>
                    <span>{event.name}</span>
                    <span class={event.type}>{formatCurrency(event.amount)}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="empty">No {isSelectedPast ? 'actuals' : 'estimates'} for this day.</p>
            {/if}
          </section>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .projections-page {
    padding: var(--content-padding);
    max-width: var(--content-max-md);
    margin: 0 auto;
  }

  .loading {
    padding: var(--space-8) 0;
    text-align: center;
    color: var(--text-secondary);
  }

  /* Usually "enter bank balances": a fixable state, so point to where to fix it */
  .error {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: var(--radius-lg);
    color: var(--warning);
  }

  .error p {
    flex: 1;
    margin: 0;
    font-size: var(--font-size-md);
  }

  .chart-section {
    margin-bottom: var(--space-5);
  }

  .day-details {
    margin-bottom: var(--space-5);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-sm);
  }

  .day-details header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .day-details h2 {
    margin: 0 0 var(--space-1) 0;
  }

  .day-details p {
    margin: 0;
    color: var(--text-secondary);
  }

  .day-totals {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-weight: 600;
  }

  .day-totals .income {
    color: var(--success);
  }

  .day-totals .expense {
    color: var(--error);
  }

  .day-totals .balance {
    color: var(--text-primary);
  }

  .day-details ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--space-2);
  }

  .day-details li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .day-details li:last-child {
    border-bottom: none;
  }

  .day-details li span:last-child {
    font-weight: 600;
  }

  .day-details li .income {
    color: var(--success);
  }

  .day-details li .expense {
    color: var(--error);
  }

  .day-details .empty {
    margin: 0;
    color: var(--text-secondary);
  }

  .no-data {
    text-align: center;
    padding: var(--space-8) var(--space-4);
    color: var(--text-secondary);
  }

  .no-data p {
    margin: 0 0 var(--space-2) 0;
  }

  .no-data .hint {
    font-size: 0.85em;
    color: var(--text-tertiary);
  }
</style>
