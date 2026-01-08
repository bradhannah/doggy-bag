<script lang="ts">
  /**
   * CollapsibleSummarySection - Read-only collapsible section for Dashboard
   * Shows summary when collapsed, item list when expanded
   *
   * @prop title - Section title (e.g., "Income", "Bills", "Variable Expenses")
   * @prop items - Array of items with name, amount, isPaid, expected, actual
   * @prop type - 'income' | 'bills' | 'expenses' for styling
   * @prop expanded - Whether section is expanded (default: false)
   */

  export let title: string = '';
  export let items: Array<{
    id: string;
    name: string;
    expected: number;
    actual: number;
    isPaid: boolean;
  }> = [];
  export let type: 'income' | 'bills' | 'expenses' = 'bills';
  export let expanded: boolean = false;

  // Toggle expanded state
  function toggle() {
    expanded = !expanded;
  }

  // Calculate totals
  $: itemCount = items.length;
  $: totalExpected = items.reduce((sum, item) => sum + item.expected, 0);
  $: totalActual = items.reduce((sum, item) => sum + item.actual, 0);
  $: totalRemaining = totalExpected - totalActual;

  // For display in collapsed header
  $: displayTotal = type === 'expenses' ? totalActual : totalExpected;

  // Format currency
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  // Get type-specific colors
  $: valueClass = type === 'income' ? 'income' : 'expense';
</script>

<div class="collapsible-section" class:expanded>
  <!-- Header - always visible -->
  <button class="section-header" on:click={toggle}>
    <div class="header-left">
      <span class="toggle-icon">
        {#if expanded}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6L15 12L9 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}
      </span>
      <span class="section-title">{title}</span>
      <span class="item-count">({itemCount} items - {formatCurrency(displayTotal)})</span>
    </div>

    <div class="header-totals">
      <div class="total-column">
        <span class="total-label">Expected</span>
        <span class="total-value">{formatCurrency(totalExpected)}</span>
      </div>
      <div class="total-column">
        <span class="total-label">Actual</span>
        <span class="total-value {valueClass}">{formatCurrency(totalActual)}</span>
      </div>
      <div class="total-column">
        <span class="total-label">Remaining</span>
        <span
          class="total-value"
          class:positive={totalRemaining > 0}
          class:zero={totalRemaining === 0}
        >
          {formatCurrency(totalRemaining)}
        </span>
      </div>
    </div>
  </button>

  <!-- Expanded content - item list -->
  {#if expanded}
    <div class="section-content">
      {#if items.length === 0}
        <p class="empty-message">No {title.toLowerCase()} for this month.</p>
      {:else}
        <div class="items-list">
          <!-- Column headers -->
          <div class="list-header">
            <span class="col-name">Name</span>
            <span class="col-expected">Expected</span>
            <span class="col-actual">Actual</span>
            <span class="col-remaining">Remaining</span>
          </div>

          {#each items as item (item.id)}
            <div class="item-row" class:paid={item.isPaid}>
              <div class="col-name">
                {#if item.isPaid}
                  <span class="paid-indicator">✓</span>
                {:else}
                  <span class="unpaid-indicator"></span>
                {/if}
                <span class="item-name" class:paid-text={item.isPaid}>{item.name}</span>
              </div>
              <span class="col-expected">{formatCurrency(item.expected)}</span>
              <span class="col-actual {valueClass}" class:paid-text={item.isPaid}>
                {item.actual > 0 ? formatCurrency(item.actual) : '-'}
              </span>
              <span class="col-remaining" class:zero={item.expected - item.actual === 0}>
                {formatCurrency(item.expected - item.actual)}
              </span>
            </div>
          {/each}

          <!-- Total row -->
          <div class="total-row">
            <span class="col-name">Total</span>
            <span class="col-expected">{formatCurrency(totalExpected)}</span>
            <span class="col-actual {valueClass}">{formatCurrency(totalActual)}</span>
            <span
              class="col-remaining"
              class:positive={totalRemaining > 0}
              class:zero={totalRemaining === 0}
            >
              {formatCurrency(totalRemaining)}
            </span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .collapsible-section {
    background: var(--bg-surface);
    border-radius: 12px;
    border: 1px solid var(--border-default);
    overflow: hidden;
  }

  .section-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s;
    font-family: inherit;
    text-align: left;
  }

  .section-header:hover {
    background: var(--bg-elevated);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: transform 0.2s;
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .item-count {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: normal;
  }

  .header-totals {
    display: flex;
    gap: 24px;
  }

  .total-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 80px;
  }

  .total-label {
    font-size: 0.65rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .total-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .total-value.income {
    color: var(--success);
  }

  .total-value.expense {
    color: var(--error);
  }

  .total-value.positive {
    color: var(--success);
  }

  .total-value.zero {
    color: var(--text-secondary);
  }

  /* Expanded content */
  .section-content {
    border-top: 1px solid var(--border-default);
    padding: 16px 20px;
  }

  .empty-message {
    color: var(--text-tertiary);
    font-size: 0.875rem;
    text-align: center;
    padding: 20px;
    margin: 0;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .list-header {
    display: grid;
    grid-template-columns: 1fr 100px 100px 100px;
    gap: 12px;
    padding: 8px 12px;
    font-size: 0.7rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-default);
  }

  .item-row {
    display: grid;
    grid-template-columns: 1fr 100px 100px 100px;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    transition: background-color 0.15s;
  }

  .item-row:hover {
    background: var(--bg-elevated);
  }

  .item-row.paid {
    background: var(--success-bg);
  }

  .col-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .paid-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: var(--success);
    color: var(--text-inverse);
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .unpaid-indicator {
    display: flex;
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-default);
    border-radius: 4px;
  }

  .item-name {
    font-weight: 500;
  }

  .item-name.paid-text {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .col-expected,
  .col-actual,
  .col-remaining {
    font-size: 0.875rem;
    text-align: right;
    color: var(--text-primary);
  }

  .col-actual.income {
    color: var(--success);
  }

  .col-actual.expense {
    color: var(--error);
  }

  .col-actual.paid-text {
    opacity: 0.6;
  }

  .col-remaining.positive {
    color: var(--success);
  }

  .col-remaining.zero {
    color: var(--text-secondary);
  }

  .total-row {
    display: grid;
    grid-template-columns: 1fr 100px 100px 100px;
    gap: 12px;
    padding: 12px;
    margin-top: 8px;
    border-top: 1px solid var(--border-default);
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .total-row .col-name {
    font-weight: 600;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .header-totals {
      width: 100%;
      justify-content: space-between;
    }

    .list-header,
    .item-row,
    .total-row {
      grid-template-columns: 1fr 80px 80px 80px;
      gap: 8px;
    }

    .total-column {
      min-width: 60px;
    }
  }
</style>
