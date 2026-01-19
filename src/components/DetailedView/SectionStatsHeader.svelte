<script lang="ts">
  /**
   * SectionStatsHeader - Summary stats header for Bills/Income sections
   *
   * Shows: "X/Y left" or "X/Y received", $paid/received, $remaining, progress bar
   */
  import type { CategorySection } from '../../stores/detailed-month';
  import type { SectionTally } from '../../stores/detailed-month';

  export let sections: CategorySection[];
  export let tally: SectionTally;
  export let type: 'bills' | 'income' = 'bills';

  // Calculate item stats from sections
  $: totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
  $: closedItems = sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.is_closed).length,
    0
  );
  $: openItems = totalItems - closedItems;

  // Progress percentage (based on amount paid/received)
  $: progressPercent =
    tally.expected > 0 ? Math.min(100, Math.round((tally.actual / tally.expected) * 100)) : 0;

  // For bills: we show "X left to pay" and "Y paid"
  // For income: we show "X received" and "Y pending"
  $: statusText =
    type === 'bills' ? `${openItems}/${totalItems} left` : `${closedItems}/${totalItems} received`;

  function _formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(dollars);
  }

  // Shorter format for compact display
  function formatShort(cents: number): string {
    const dollars = cents / 100;
    if (dollars >= 1000) {
      return `$${(dollars / 1000).toFixed(1)}k`;
    }
    return `$${dollars.toFixed(0)}`;
  }
</script>

<div class="stats-header" class:bills={type === 'bills'} class:income={type === 'income'}>
  <div class="stats-left">
    <span class="item-count">{statusText}</span>
    <span class="stats-divider">|</span>
    <span class="stat-item">
      <span class="stat-label">{type === 'bills' ? 'Paid' : 'Rcvd'}:</span>
      <span class="stat-value actual">{formatShort(tally.actual)}</span>
    </span>
    <span class="stat-item">
      <span class="stat-label">{type === 'bills' ? 'Left' : 'Pend'}:</span>
      <span class="stat-value remaining">{formatShort(tally.remaining)}</span>
    </span>
  </div>

  <div class="progress-container">
    <div class="progress-bar">
      <div
        class="progress-fill"
        class:complete={progressPercent >= 100}
        style="width: {progressPercent}%"
      ></div>
    </div>
    <span class="progress-text">{progressPercent}%</span>
  </div>
</div>

<style>
  .stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 8px 12px;
    background: var(--bg-elevated);
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .stats-header.bills {
    border-left: 3px solid var(--error);
  }

  .stats-header.income {
    border-left: 3px solid var(--success);
  }

  .stats-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .item-count {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .stats-divider {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
  }

  .stat-label {
    color: var(--text-tertiary);
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .stat-value.actual {
    color: var(--text-secondary);
  }

  .stats-header.bills .stat-value.actual {
    color: var(--error);
  }

  .stats-header.income .stat-value.actual {
    color: var(--success);
  }

  .stat-value.remaining {
    color: var(--text-secondary);
  }

  .progress-container {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .progress-bar {
    width: 80px;
    height: 6px;
    background: var(--border-default);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .stats-header.bills .progress-fill {
    background: var(--error);
  }

  .stats-header.income .progress-fill {
    background: var(--success);
  }

  .progress-fill.complete {
    background: var(--text-secondary);
  }

  .progress-text {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-tertiary);
    min-width: 28px;
    text-align: right;
  }

  /* Compact mode adjustments (inherited from parent .compact class) */
  :global(.detailed-view.compact) .stats-header {
    padding: 6px 10px;
    gap: 10px;
  }

  :global(.detailed-view.compact) .stats-left {
    gap: 8px;
  }

  :global(.detailed-view.compact) .item-count {
    font-size: 0.75rem;
  }

  :global(.detailed-view.compact) .stat-item {
    font-size: 0.6875rem;
  }

  :global(.detailed-view.compact) .progress-bar {
    width: 60px;
    height: 5px;
  }
</style>
