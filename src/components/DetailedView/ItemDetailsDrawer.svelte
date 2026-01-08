<script lang="ts">
  /**
   * ItemDetailsDrawer - Right-side readonly drawer showing bill/income details
   *
   * @prop open - Controls drawer visibility
   * @prop type - 'bill' or 'income' (determines labels)
   * @prop item - The bill or income instance to display
   * @prop categoryName - The category name for this item
   */
  import { createEventDispatcher } from 'svelte';
  import type { BillInstanceDetailed, IncomeInstanceDetailed } from '../../stores/detailed-month';

  export let open = false;
  export let type: 'bill' | 'income' = 'bill';
  export let item: BillInstanceDetailed | IncomeInstanceDetailed | null = null;
  export let categoryName: string = '';

  const dispatch = createEventDispatcher();

  // Helper to check if item is a bill
  function isBill(i: BillInstanceDetailed | IncomeInstanceDetailed): i is BillInstanceDetailed {
    return 'total_paid' in i;
  }

  // Computed values
  $: actualLabel = type === 'bill' ? 'Paid' : 'Received';
  $: actualAmount = item ? (isBill(item) ? item.total_paid : item.total_received) : 0;
  $: remainingAmount = item?.remaining ?? 0;
  $: expectedAmount = item?.expected_amount ?? 0;
  $: isClosed = item?.is_closed ?? false;
  $: closedDate = item?.closed_date ?? null;
  $: dueDate = item?.due_date ?? null;
  $: paymentSourceName = item?.payment_source?.name ?? 'Not set';
  $: billingPeriod = item?.billing_period ?? 'monthly';
  $: isAdhoc = item?.is_adhoc ?? false;
  $: metadata = item?.metadata ?? null;
  $: hasMetadata = !!(
    metadata?.bank_transaction_name ||
    metadata?.account_number ||
    metadata?.account_url ||
    metadata?.notes
  );

  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatBillingPeriod(period: string): string {
    switch (period) {
      case 'monthly':
        return 'Monthly';
      case 'bi_weekly':
        return 'Bi-weekly';
      case 'weekly':
        return 'Weekly';
      case 'semi_annually':
        return 'Semi-annually';
      default:
        return period;
    }
  }

  // Shorten URL for display
  function shortenUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url.substring(0, 30) + (url.length > 30 ? '...' : '');
    }
  }

  function handleClose() {
    open = false;
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open && item}
  <div
    class="drawer-backdrop"
    role="presentation"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
  >
    <div
      class="drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-title"
      tabindex="-1"
    >
      <header class="drawer-header">
        <h3 id="details-title">{item.name}</h3>
        <button class="close-btn" on:click={handleClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <div class="drawer-content">
        <!-- Details Section -->
        <section class="section">
          <h4 class="section-title">Details</h4>
          <div class="details-grid">
            <div class="detail-row">
              <span class="detail-label">Category</span>
              <span class="detail-value">{categoryName || 'Uncategorized'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Source</span>
              <span class="detail-value">{paymentSourceName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Billing Period</span>
              <span class="detail-value">{formatBillingPeriod(billingPeriod)}</span>
            </div>
            {#if dueDate}
              <div class="detail-row">
                <span class="detail-label">Due Date</span>
                <span class="detail-value">{formatDate(dueDate)}</span>
              </div>
            {/if}
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span class="detail-value status" class:closed={isClosed} class:open={!isClosed}>
                {#if isClosed}
                  Closed {closedDate ? `on ${formatDate(closedDate)}` : ''}
                {:else}
                  Open
                {/if}
              </span>
            </div>
            {#if isAdhoc}
              <div class="detail-row">
                <span class="detail-label">Type</span>
                <span class="detail-value adhoc">Ad-hoc</span>
              </div>
            {/if}
          </div>
        </section>

        <!-- Amounts Section -->
        <section class="section">
          <h4 class="section-title">Amounts</h4>
          <div class="details-grid">
            <div class="detail-row">
              <span class="detail-label">Expected</span>
              <span class="detail-value amount">{formatCurrency(expectedAmount)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{actualLabel}</span>
              <span class="detail-value amount" class:positive={actualAmount > 0}>
                {formatCurrency(actualAmount)}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Remaining</span>
              <span
                class="detail-value amount"
                class:zero={remainingAmount === 0}
                class:warning={remainingAmount > 0}
              >
                {formatCurrency(remainingAmount)}
              </span>
            </div>
          </div>
        </section>

        <!-- Metadata Section (only if metadata exists) -->
        {#if hasMetadata}
          <section class="section">
            <h4 class="section-title">Metadata</h4>
            <div class="metadata-content">
              {#if metadata?.bank_transaction_name}
                <div class="metadata-field">
                  <span class="metadata-label">Bank Transaction Name</span>
                  <span class="metadata-value">{metadata.bank_transaction_name}</span>
                </div>
              {/if}
              {#if metadata?.account_number}
                <div class="metadata-field">
                  <span class="metadata-label">Account Number</span>
                  <span class="metadata-value">{metadata.account_number}</span>
                </div>
              {/if}
              {#if metadata?.account_url}
                <div class="metadata-field">
                  <span class="metadata-label">Account URL</span>
                  <a
                    href={metadata.account_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="metadata-link"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    {shortenUrl(metadata.account_url)}
                  </a>
                </div>
              {/if}
              {#if metadata?.notes}
                <div class="metadata-field">
                  <span class="metadata-label">Notes</span>
                  <p class="metadata-notes">{metadata.notes}</p>
                </div>
              {/if}
            </div>
          </section>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: flex-end;
    z-index: 1000;
  }

  .drawer {
    width: 100%;
    max-width: 400px;
    height: 100%;
    background: #1a1a2e;
    border-left: 1px solid #333355;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #333355;
  }

  .drawer-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #e4e4e7;
  }

  .close-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: #e4e4e7;
  }

  .drawer-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .section {
    margin-bottom: 24px;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    margin: 0 0 12px 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .details-grid {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    overflow: hidden;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-size: 0.875rem;
    color: #888;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #e4e4e7;
    font-weight: 500;
  }

  .detail-value.amount {
    font-family: 'SF Mono', 'Menlo', monospace;
  }

  .detail-value.positive {
    color: #4ade80;
  }

  .detail-value.zero {
    color: #4ade80;
  }

  .detail-value.warning {
    color: #f59e0b;
  }

  .detail-value.status.closed {
    color: #4ade80;
  }

  .detail-value.status.open {
    color: #f59e0b;
  }

  .detail-value.adhoc {
    color: #a78bfa;
  }

  /* Metadata styles */
  .metadata-content {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .metadata-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metadata-label {
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .metadata-value {
    font-size: 0.9rem;
    color: #e4e4e7;
  }

  .metadata-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: #24c8db;
    text-decoration: none;
    transition: color 0.15s;
  }

  .metadata-link:hover {
    color: #3dd8eb;
    text-decoration: underline;
  }

  .metadata-link svg {
    flex-shrink: 0;
  }

  .metadata-notes {
    margin: 0;
    font-size: 0.875rem;
    color: #a1a1aa;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .drawer {
      max-width: 100%;
    }
  }
</style>
