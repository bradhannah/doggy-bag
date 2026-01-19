<script lang="ts">
  import {
    projectionsStore,
    projectionData,
    projectionLoading,
    projectionError,
  } from '../../stores/projections';
  import type { ProjectionResponse } from '../../types/projections';
  import HistogramChart from './HistogramChart.svelte';

  let currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  let dailyRunRate = 0;
  let selectedDate: string | null = null;

  // Load data when month changes
  $: {
    projectionsStore.loadProjection(currentMonth);
  }

  function changeMonth(offset: number) {
    const currentDate = new Date(currentMonth + '-01');
    const offsetDate = new Date(currentDate);
    offsetDate.setMonth(offsetDate.getMonth() + offset);
    currentMonth = offsetDate.toISOString().slice(0, 7);
    selectedDate = null;
  }

  function resetToCurrentMonth() {
    currentMonth = new Date().toISOString().slice(0, 7);
    selectedDate = null;
  }

  function formatMonth(monthStr: string) {
    const d = new Date(monthStr + '-01');
    // Adjust for timezone offset to avoid previous day
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(d.getTime() + userTimezoneOffset);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
      adjustedDate
    );
  }

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Reactive data with Run Rate application
  const emptyChartData: ProjectionResponse = {
    start_date: '',
    end_date: '',
    starting_balance: 0,
    days: [],
    overdue_bills: [],
  };

  type ProjectionDay = ProjectionResponse['days'][number];
  type ProjectionEvent = ProjectionDay['events'][number];

  function applyRunRate(data: ProjectionResponse, rate: number): ProjectionResponse {
    // Clone data to avoid mutating store
    const days = data.days.map((day) => ({ ...day })) as ProjectionDay[];
    const rateCents = Math.round(rate * 100);

    // Apply run rate cumulatively
    let cumulative = 0;
    for (const day of days) {
      if (!(day as ProjectionDay & { has_balance: boolean }).has_balance || day.balance === null) {
        continue;
      }
      cumulative += rateCents;
      day.balance -= cumulative;
      day.expense += rateCents; // Visual bar
      // Add fake event for tooltip
      if (rateCents > 0) {
        day.events = [
          ...day.events,
          { name: 'Daily Run Rate', amount: rateCents, type: 'expense' },
        ];
      }
      day.is_deficit = day.balance < 0;
    }
    return { ...data, days };
  }

  $: chartData = $projectionData ? applyRunRate($projectionData, dailyRunRate) : null;

  $: if (chartData) {
    if (!selectedDate || !selectedDate.startsWith(currentMonth)) {
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

<div class="projections-page">
  <header>
    <div class="title-block">
      <h1>Monthly Projections</h1>
      <p>Forecast daily balances with upcoming income and bills.</p>
    </div>
    <div class="controls">
      <button
        on:click={() => changeMonth(-1)}
        aria-label="Previous month"
        disabled={$projectionLoading}
      >
        &larr;
      </button>
      <span class="month-label">{formatMonth(currentMonth)}</span>
      <button on:click={() => changeMonth(1)} aria-label="Next month" disabled={$projectionLoading}>
        &rarr;
      </button>
      <button class="today-button" on:click={resetToCurrentMonth} disabled={$projectionLoading}>
        Today
      </button>
    </div>
  </header>

  {#if $projectionLoading}
    <div class="loading">Loading projection...</div>
  {:else if $projectionError}
    <div class="error">{$projectionError}</div>
  {:else if chartData}
    <div class="content">
      {#if chartData.overdue_bills.length > 0}
        <div class="warning-banner">
          <h3>Overdue Bills</h3>
          <p>These items are past due and deducted from today's starting balance:</p>
          <ul>
            {#each chartData.overdue_bills as bill}
              <li>
                <strong>{bill.name}</strong>: {formatCurrency(bill.amount)}
                (Due: {bill.due_date})
              </li>
            {/each}
          </ul>
        </div>
      {/if}

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
                {new Date(selectedDay.date).toLocaleDateString(undefined, {
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
              {#each selectedEvents as event}
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

      <div class="simulator">
        <label>
          Daily Run Rate Simulator (Not Saved)
          <div class="input-group">
            <span class="currency-symbol">$</span>
            <input type="number" min="0" step="5" bind:value={dailyRunRate} placeholder="0.00" />
          </div>
          <span class="help-text">Estimate daily spending (food, gas) to see impact.</span>
        </label>
      </div>
    </div>
  {/if}
</div>

<style>
  .projections-page {
    padding: var(--content-padding);
    max-width: var(--content-max-md);
    margin: 0 auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-5);
  }

  .title-block h1 {
    margin: 0 0 var(--space-1) 0;
  }

  .title-block p {
    margin: 0;
    color: var(--text-secondary);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .today-button {
    padding: 0 var(--space-3);
    height: var(--button-height-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: 500;
    cursor: pointer;
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;
  }

  .today-button:hover {
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .controls button {
    min-width: var(--button-height-sm);
    height: var(--button-height-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-primary);
    cursor: pointer;
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;
  }

  .controls button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .controls button:hover {
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .month-label {
    font-weight: 600;
    text-align: center;
    padding: 0 var(--space-4);
  }

  .warning-banner {
    background: var(--warning-muted);
    color: var(--warning);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-5);
    border: 1px solid var(--warning-border);
  }

  .warning-banner h3 {
    margin: 0 0 var(--space-2) 0;
  }

  .warning-banner p {
    margin: 0 0 var(--space-3) 0;
    color: var(--text-secondary);
  }

  .warning-banner ul {
    margin: 0;
    padding-left: var(--space-4);
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
    box-shadow: var(--shadow-light);
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

  .simulator {
    background: var(--bg-surface);
    padding: var(--space-5);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    max-width: var(--content-max-sm);
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  input {
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-primary);
  }

  .help-text {
    display: inline-block;
    margin-top: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
</style>
