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
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #333355;
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
    background: rgba(255, 255, 255, 0.02);
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
    color: #888;
    transition: transform 0.2s;
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e4e4e7;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .item-count {
    font-size: 0.8rem;
    color: #888;
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
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .total-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e4e4e7;
  }

  .total-value.income {
    color: #4ade80;
  }

  .total-value.expense {
    color: #f87171;
  }

  .total-value.positive {
    color: #4ade80;
  }

  .total-value.zero {
    color: #888;
  }

  /* Expanded content */
  .section-content {
    border-top: 1px solid #333355;
    padding: 16px 20px;
  }

  .empty-message {
    color: #666;
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
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #333355;
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
    background: rgba(255, 255, 255, 0.02);
  }

  .item-row.paid {
    background: rgba(74, 222, 128, 0.05);
  }

  .col-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: #e4e4e7;
  }

  .paid-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: #4ade80;
    color: #000;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .unpaid-indicator {
    display: flex;
    width: 18px;
    height: 18px;
    border: 2px solid #555;
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
    color: #e4e4e7;
  }

  .col-actual.income {
    color: #4ade80;
  }

  .col-actual.expense {
    color: #f87171;
  }

  .col-actual.paid-text {
    opacity: 0.6;
  }

  .col-remaining.positive {
    color: #4ade80;
  }

  .col-remaining.zero {
    color: #888;
  }

  .total-row {
    display: grid;
    grid-template-columns: 1fr 100px 100px 100px;
    gap: 12px;
    padding: 12px;
    margin-top: 8px;
    border-top: 1px solid #333355;
    font-weight: 600;
    font-size: 0.875rem;
    color: #e4e4e7;
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
