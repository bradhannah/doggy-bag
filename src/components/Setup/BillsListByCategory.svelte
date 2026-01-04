<script lang="ts">
  import type { BillCategoryGroup, BillWithContribution } from '../../stores/bills';

  export let billsByCategory: BillCategoryGroup[];
  export let totalFixedCosts: number;
  export let onView: (bill: BillWithContribution) => void;
  export let onEdit: (bill: BillWithContribution) => void;
  export let onDelete: (bill: BillWithContribution) => void;
  export let getPaymentSourceName: (id: string) => string;

  // Track collapsed state for each category
  let collapsed: Record<string, boolean> = {};

  function toggleCategory(categoryId: string | null) {
    const key = categoryId || 'uncategorized';
    collapsed[key] = !collapsed[key];
  }

  function isCollapsed(categoryId: string | null): boolean {
    const key = categoryId || 'uncategorized';
    return collapsed[key] || false;
  }

  function formatAmount(bill: BillWithContribution): string {
    const amount = bill.amount / 100;
    const monthly = bill.monthlyContribution / 100;

    if (bill.billing_period === 'monthly') {
      return `$${amount.toFixed(2)}/mo`;
    } else {
      return `$${amount.toFixed(2)} ($${monthly.toFixed(2)}/mo)`;
    }
  }

  function formatPeriod(period: string): string {
    const map: Record<string, string> = {
      monthly: 'monthly',
      bi_weekly: 'bi-weekly',
      weekly: 'weekly',
      semi_annually: 'semi-annual',
    };
    return map[period] || period;
  }

  function formatCurrency(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  function getCategoryName(group: BillCategoryGroup): string {
    return group.category?.name || 'Uncategorized';
  }

  function getCategoryColor(group: BillCategoryGroup): string {
    return group.category?.color || '#888888';
  }

  // Total bill count (used for display but currently commented out)
  $: _totalBills = billsByCategory.reduce((sum, group) => sum + group.bills.length, 0);
</script>

<div class="bills-by-category">
  <div class="list-container">
    <!-- Column Header -->
    <div class="column-header">
      <span class="col-name">Name</span>
      <span class="col-period">Period</span>
      <span class="col-source">Source</span>
      <span class="col-amount">Amount</span>
      <span class="col-actions">Actions</span>
    </div>

    <!-- Category Groups -->
    {#each billsByCategory as group (group.category?.id || 'uncategorized')}
      {@const categoryId = group.category?.id || null}
      {@const isGroupCollapsed = isCollapsed(categoryId)}

      <!-- Category Header -->
      <button
        class="category-header"
        on:click={() => toggleCategory(categoryId)}
        style="--cat-color: {getCategoryColor(group)};"
      >
        <span class="collapse-icon">{isGroupCollapsed ? '>' : 'v'}</span>
        <span class="category-name">{getCategoryName(group).toUpperCase()}</span>
        <span class="category-count">({group.bills.length})</span>
        <span class="category-line"></span>
      </button>

      <!-- Bills in Category -->
      {#if !isGroupCollapsed}
        {#if group.bills.length === 0}
          <div class="empty-category">No bills in this category</div>
        {:else}
          {#each group.bills as bill (bill.id)}
            <div class="bill-row" on:click={() => onView(bill)}>
              <span class="col-name">{bill.name}</span>
              <span class="col-period">{formatPeriod(bill.billing_period)}</span>
              <span class="col-source">{getPaymentSourceName(bill.payment_source_id)}</span>
              <span class="col-amount" class:zero={bill.amount === 0}>
                {formatAmount(bill)}
              </span>
              <span class="col-actions" on:click|stopPropagation>
                <button class="btn-icon" on:click={() => onEdit(bill)} title="Edit">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button class="btn-icon btn-danger" on:click={() => onDelete(bill)} title="Delete">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    />
                  </svg>
                </button>
              </span>
            </div>
          {/each}

          <!-- Category Subtotal -->
          {#if group.bills.length > 0}
            <div class="category-subtotal">
              <span>Subtotal: {formatCurrency(group.subtotal)}/mo</span>
            </div>
          {/if}
        {/if}
      {/if}
    {/each}
  </div>

  <!-- Total Fixed Costs -->
  <div class="total-row">
    <span class="total-label">TOTAL FIXED COSTS</span>
    <span class="total-value">{formatCurrency(totalFixedCosts)}/mo</span>
  </div>
</div>

<style>
  .bills-by-category {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Container with border and rounded edges */
  .list-container {
    background: #1a1a2e;
    border-radius: 16px;
    border: 2px solid #333355;
    overflow: hidden;
  }

  /* Column Header */
  .column-header {
    display: grid;
    grid-template-columns: 1fr 90px 130px 150px 80px;
    gap: 12px;
    padding: 12px 16px;
    background: #16213e;
    border-bottom: 2px solid #333355;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #888;
    letter-spacing: 0.5px;
  }

  /* Category Header */
  .category-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.02);
    border: none;
    border-left: 3px solid var(--cat-color);
    cursor: pointer;
    text-align: left;
    color: #e4e4e7;
    margin-top: 8px;
    transition: background 0.15s ease;
  }

  .category-header:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .category-header:first-of-type {
    margin-top: 0;
  }

  .collapse-icon {
    font-family: monospace;
    font-size: 0.75rem;
    width: 12px;
    color: #888;
  }

  .category-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--cat-color);
    letter-spacing: 0.5px;
  }

  .category-count {
    font-size: 0.6875rem;
    color: #666;
  }

  .category-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, var(--cat-color) 0%, transparent 100%);
    opacity: 0.3;
    margin-left: 8px;
  }

  /* Empty Category */
  .empty-category {
    padding: 16px 16px 16px 44px;
    color: #666;
    font-size: 0.8125rem;
    font-style: italic;
  }

  /* Bill Row */
  .bill-row {
    display: grid;
    grid-template-columns: 1fr 90px 130px 150px 80px;
    gap: 12px;
    padding: 12px 16px;
    padding-left: 32px;
    align-items: center;
    border-bottom: 1px solid #2a2a4a;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .bill-row:hover {
    background: rgba(36, 200, 219, 0.05);
  }

  .bill-row .col-name {
    font-weight: 500;
    color: #e4e4e7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bill-row .col-period {
    font-size: 0.8125rem;
    color: #888;
  }

  .bill-row .col-source {
    font-size: 0.8125rem;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bill-row .col-amount {
    font-size: 0.875rem;
    font-weight: 600;
    color: #ff6b6b;
    text-align: right;
  }

  .bill-row .col-amount.zero {
    color: #666;
    font-style: italic;
  }

  .bill-row .col-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  /* Icon Buttons */
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: #333355;
    color: #888;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-icon:hover {
    background: #444466;
    color: #e4e4e7;
  }

  .btn-icon.btn-danger:hover {
    background: #ff4444;
    color: #fff;
  }

  /* Category Subtotal */
  .category-subtotal {
    padding: 8px 16px;
    text-align: right;
    font-size: 0.8125rem;
    color: #888;
    border-bottom: 1px solid #2a2a4a;
  }

  /* Total Row */
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #16213e;
    border-top: 2px solid #333355;
    margin-top: 16px;
    border-radius: 8px;
  }

  .total-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #e4e4e7;
    letter-spacing: 0.5px;
  }

  .total-value {
    font-size: 1.25rem;
    font-weight: bold;
    color: #ff6b6b;
  }

  /* Responsive - hide source column on narrow screens */
  @media (max-width: 768px) {
    .column-header,
    .bill-row {
      grid-template-columns: 1fr 80px 130px 70px;
    }

    .col-source {
      display: none;
    }

    .column-header .col-source {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .column-header,
    .bill-row {
      grid-template-columns: 1fr 100px 70px;
    }

    .col-period {
      display: none;
    }

    .column-header .col-period {
      display: none;
    }
  }
</style>
