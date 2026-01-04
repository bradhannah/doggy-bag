<script lang="ts">
  import type { PaymentSource } from '../../stores/payment-sources';
  import {
    isDebtAccount,
    formatBalanceForDisplay,
    getTypeDisplayName,
    getTypeIcon,
  } from '../../stores/payment-sources';

  export let paymentSources: PaymentSource[];
  export let onView: (ps: PaymentSource) => void;
  export let onEdit: (ps: PaymentSource) => void;
  export let onDelete: (ps: PaymentSource) => void;

  function formatCurrency(cents: number): string {
    const abs = Math.abs(cents);
    const formatted = '$' + (abs / 100).toFixed(2);
    return cents < 0 ? '-' + formatted : formatted;
  }

  // Calculate totals
  $: totalAssets = paymentSources
    .filter((ps) => !isDebtAccount(ps.type))
    .reduce((sum, ps) => sum + ps.balance, 0);

  $: totalDebt = paymentSources
    .filter((ps) => isDebtAccount(ps.type))
    .reduce((sum, ps) => sum + ps.balance, 0);

  $: netWorth = totalAssets - totalDebt;
</script>

<div class="payment-sources-list">
  <div class="list-container">
    <!-- Column Header -->
    <div class="column-header">
      <span class="col-name">Name</span>
      <span class="col-type">Type</span>
      <span class="col-balance">Balance</span>
      <span class="col-actions">Actions</span>
    </div>

    <!-- Payment Source Rows -->
    {#if paymentSources.length === 0}
      <div class="empty-state">No payment sources yet. Add your first account to get started.</div>
    {:else}
      {#each paymentSources as ps}
        {@const isDebt = isDebtAccount(ps.type)}
        {@const displayBalance = formatBalanceForDisplay(ps.balance, ps.type)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="source-row" class:debt={isDebt} on:click={() => onView(ps)}>
          <span class="col-name">
            <span class="type-icon">{getTypeIcon(ps.type)}</span>
            {ps.name}
          </span>
          <span class="col-type">
            <span class="type-badge" class:debt={isDebt}>
              {getTypeDisplayName(ps.type)}
            </span>
          </span>
          <span
            class="col-balance"
            class:negative={displayBalance < 0}
            class:positive={displayBalance >= 0 && !isDebt}
          >
            {formatCurrency(displayBalance)}
          </span>
          <span class="col-actions" on:click|stopPropagation>
            <button class="btn-icon" on:click={() => onEdit(ps)} title="Edit">
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
            <button class="btn-icon btn-danger" on:click={() => onDelete(ps)} title="Delete">
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
    {/if}
  </div>

  <!-- Totals Row -->
  <div class="totals-row">
    <div class="total-item">
      <span class="total-label">Total Assets</span>
      <span class="total-value positive">{formatCurrency(totalAssets)}</span>
    </div>
    <div class="total-divider"></div>
    <div class="total-item">
      <span class="total-label">Total Debt</span>
      <span class="total-value negative">-{formatCurrency(totalDebt)}</span>
    </div>
    <div class="total-divider"></div>
    <div class="total-item">
      <span class="total-label">Net Worth</span>
      <span class="total-value" class:positive={netWorth >= 0} class:negative={netWorth < 0}>
        {formatCurrency(netWorth)}
      </span>
    </div>
  </div>
</div>

<style>
  .payment-sources-list {
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
    grid-template-columns: 1fr 140px 140px 80px;
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

  /* Source Row */
  .source-row {
    display: grid;
    grid-template-columns: 1fr 140px 140px 80px;
    gap: 12px;
    padding: 14px 16px;
    align-items: center;
    border-bottom: 1px solid #2a2a4a;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .source-row:last-child {
    border-bottom: none;
  }

  .source-row:hover {
    background: rgba(36, 200, 219, 0.05);
  }

  .source-row.debt:hover {
    background: rgba(255, 107, 107, 0.05);
  }

  .source-row .col-name {
    font-weight: 500;
    color: #e4e4e7;
    display: flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .type-icon {
    font-size: 1.125rem;
    flex-shrink: 0;
  }

  .source-row .col-type {
    font-size: 0.8125rem;
  }

  .type-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    background: rgba(36, 200, 219, 0.1);
    color: #24c8db;
  }

  .type-badge.debt {
    background: rgba(255, 107, 107, 0.1);
    color: #ff6b6b;
  }

  .source-row .col-balance {
    font-size: 0.9375rem;
    font-weight: 600;
    text-align: right;
    color: #e4e4e7;
  }

  .source-row .col-balance.positive {
    color: #22c55e;
  }

  .source-row .col-balance.negative {
    color: #ff6b6b;
  }

  .source-row .col-actions {
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

  /* Empty State */
  .empty-state {
    padding: 40px 20px;
    text-align: center;
    color: #666;
    font-size: 0.875rem;
  }

  /* Totals Row */
  .totals-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 16px 20px;
    background: #16213e;
    border-radius: 8px;
    border: 2px solid #333355;
    margin-top: 16px;
  }

  .total-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .total-label {
    font-size: 0.6875rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .total-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #e4e4e7;
  }

  .total-value.positive {
    color: #22c55e;
  }

  .total-value.negative {
    color: #ff6b6b;
  }

  .total-divider {
    width: 1px;
    height: 36px;
    background: #333355;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .column-header,
    .source-row {
      grid-template-columns: 1fr 100px 80px;
    }

    .col-type {
      display: none;
    }

    .column-header .col-type {
      display: none;
    }

    .totals-row {
      flex-wrap: wrap;
      gap: 16px;
    }

    .total-divider {
      display: none;
    }
  }
</style>
