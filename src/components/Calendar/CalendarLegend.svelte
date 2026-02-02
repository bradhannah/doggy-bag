<script lang="ts">
  import type { CalendarSummary } from '../../stores/calendar';

  export let summary: CalendarSummary;
</script>

<div class="calendar-legend">
  <div class="legend-items">
    <div class="legend-item bill">
      <span class="legend-dot"></span>
      <span class="legend-label">Bills</span>
      <span class="legend-count">{summary.bills}</span>
    </div>

    <div class="legend-item income">
      <span class="legend-dot"></span>
      <span class="legend-label">Income</span>
      <span class="legend-count">{summary.incomes}</span>
    </div>

    <div class="legend-item goal">
      <span class="legend-dot"></span>
      <span class="legend-label">Goals</span>
      <span class="legend-count">{summary.goals}</span>
    </div>

    <div class="legend-item todo">
      <span class="legend-dot"></span>
      <span class="legend-label">Todos</span>
      <span class="legend-count">{summary.todos}</span>
    </div>
  </div>

  <div class="legend-total">
    <span class="total-label">Total Events</span>
    <span class="total-count">{summary.total}</span>
  </div>
</div>

<style>
  .calendar-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
  }

  .legend-items {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .legend-item.bill .legend-dot {
    background: var(--error);
  }

  .legend-item.income .legend-dot {
    background: var(--success);
  }

  .legend-item.goal .legend-dot {
    background: var(--accent);
  }

  .legend-item.todo .legend-dot {
    background: var(--purple);
  }

  .legend-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .legend-count {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    background: var(--bg-hover);
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    min-width: 24px;
    text-align: center;
  }

  .legend-total {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding-left: var(--space-4);
    border-left: 1px solid var(--border-default);
  }

  .total-label {
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  .total-count {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  @media (max-width: 640px) {
    .calendar-legend {
      flex-direction: column;
      gap: var(--space-3);
      align-items: flex-start;
    }

    .legend-items {
      gap: var(--space-3);
    }

    .legend-total {
      padding-left: 0;
      border-left: none;
      padding-top: var(--space-2);
      border-top: 1px solid var(--border-subtle);
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
