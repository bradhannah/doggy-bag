<script lang="ts">
  /**
   * ItemDetailsDrawer - READ-ONLY drawer showing bill/income details
   *
   * This component is purely informational - no editing capabilities.
   * For editing/closing occurrences, use EditCloseModal via the Edit button.
   *
   * Features:
   * - Shows all occurrences for the bill/income (not filtered by occurrenceId)
   * - Summary section with totals
   * - Card-based layout for each occurrence
   * - Read-only notes display
   *
   * @prop open - Controls drawer visibility
   * @prop type - 'bill' or 'income' (determines labels)
   * @prop item - The bill or income instance to display
   * @prop categoryName - The category name for this item
   * @prop month - The month string (YYYY-MM)
   */
  import { createEventDispatcher } from 'svelte';
  import {
    type BillInstanceDetailed,
    type IncomeInstanceDetailed,
    type Occurrence,
  } from '../../stores/detailed-month';
  import { formatCurrency, formatDate } from '$lib/utils/format';

  export let open = false;
  export let type: 'bill' | 'income' = 'bill';
  export let item: BillInstanceDetailed | IncomeInstanceDetailed | null = null;
  export let categoryName: string = '';
  export let month = '';
  // Note: occurrenceId prop kept for backwards compatibility but no longer used for filtering
  export let occurrenceId: string | null = null;

  const dispatch = createEventDispatcher();

  // Helper to check if item is a bill
  function isBill(i: BillInstanceDetailed | IncomeInstanceDetailed): i is BillInstanceDetailed {
    return 'total_paid' in i;
  }

  // Computed values for item details
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

  // Show ALL occurrences (not filtered by occurrenceId)
  $: occurrences = item?.occurrences ?? [];
  $: closedCount = occurrences.filter((occ) => occ.is_closed).length;
  $: totalOccurrences = occurrences.length;

  // Summary calculations across all occurrences
  // In the new model, closed occurrences represent payments - use expected_amount when closed
  $: totalExpected = occurrences.reduce((sum, occ) => sum + (occ.expected_amount ?? 0), 0);
  $: totalPaid = occurrences.reduce((sum, occ) => {
    // If occurrence is closed, it counts as paid with expected_amount
    if (occ.is_closed) {
      return sum + (occ.expected_amount ?? 0);
    }
    return sum;
  }, 0);
  $: totalRemaining = Math.max(0, totalExpected - totalPaid);

  function formatShortDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Get occurrence notes (read-only)
  function getOccurrenceNotes(occurrence: Occurrence): string | null {
    return (occurrence as Occurrence & { notes?: string | null }).notes ?? null;
  }

  // Get occurrence paid amount - in the new model, closing = payment at expected_amount
  function getOccurrencePaid(occurrence: Occurrence): number {
    // If occurrence is closed, it's paid at expected_amount
    if (occurrence.is_closed) {
      return occurrence.expected_amount ?? 0;
    }
    return 0;
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
                <span class="detail-value">{formatDate(dueDate ?? '')}</span>
              </div>
            {/if}
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span class="detail-value status" class:closed={isClosed} class:open={!isClosed}>
                {#if totalOccurrences > 1}
                  {isClosed ? 'Closed' : 'Open'} ({closedCount} of {totalOccurrences} closed)
                {:else if isClosed}
                  Closed {closedDate ? `on ${formatDate(closedDate ?? '')}` : ''}
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

        <!-- Summary Section (for multi-occurrence) -->
        {#if totalOccurrences > 1}
          <section class="section">
            <h4 class="section-title">Summary</h4>
            <div class="details-grid summary-grid">
              <div class="detail-row">
                <span class="detail-label">Total Expected</span>
                <span class="detail-value amount">
                  {formatCurrency(totalExpected)}
                  <span class="amount-detail"
                    >({totalOccurrences} × {formatCurrency(expectedAmount)})</span
                  >
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total {actualLabel}</span>
                <span class="detail-value amount" class:positive={totalPaid > 0}>
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Remaining</span>
                <span
                  class="detail-value amount"
                  class:zero={totalRemaining === 0}
                  class:warning={totalRemaining > 0}
                >
                  {formatCurrency(totalRemaining)}
                </span>
              </div>
            </div>
          </section>
        {:else}
          <!-- Single occurrence: show simple amounts -->
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
        {/if}

        <!-- Occurrences Section -->
        {#if occurrences.length > 0}
          <section class="section">
            <h4 class="section-title">Occurrences ({occurrences.length})</h4>
            <div class="occurrences-list">
              {#each occurrences as occurrence, index (occurrence.id)}
                {@const occPaid = getOccurrencePaid(occurrence)}
                {@const occExpected = occurrence.expected_amount ?? expectedAmount}
                {@const occRemaining = Math.max(0, occExpected - occPaid)}
                {@const occNotes = getOccurrenceNotes(occurrence)}
                <div class="occurrence-card" class:closed={occurrence.is_closed}>
                  <div class="occurrence-header">
                    <span class="occurrence-label">Occurrence {index + 1}</span>
                    <span class="occurrence-status" class:closed={occurrence.is_closed}>
                      {occurrence.is_closed ? 'Closed' : 'Open'}
                    </span>
                  </div>
                  <div class="occurrence-details">
                    <div class="occurrence-row">
                      <span class="occ-label">Expected Date</span>
                      <span class="occ-value">{formatShortDate(occurrence.expected_date)}</span>
                    </div>
                    <div class="occurrence-row">
                      <span class="occ-label">Expected</span>
                      <span class="occ-value">{formatCurrency(occExpected)}</span>
                    </div>
                    <div class="occurrence-row">
                      <span class="occ-label">{actualLabel}</span>
                      <span class="occ-value" class:positive={occPaid > 0}
                        >{formatCurrency(occPaid)}</span
                      >
                    </div>
                    {#if !occurrence.is_closed}
                      <div class="occurrence-row">
                        <span class="occ-label">Remaining</span>
                        <span
                          class="occ-value"
                          class:warning={occRemaining > 0}
                          class:zero={occRemaining === 0}
                        >
                          {formatCurrency(occRemaining)}
                        </span>
                      </div>
                    {:else if occurrence.closed_date}
                      <div class="occurrence-row">
                        <span class="occ-label">Closed Date</span>
                        <span class="occ-value">{formatShortDate(occurrence.closed_date)}</span>
                      </div>
                    {/if}
                    {#if occNotes}
                      <div class="occurrence-notes-display">
                        <span class="occ-label">Notes</span>
                        <p class="occ-notes">{occNotes}</p>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/if}

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
    background: var(--overlay-bg);
    display: flex;
    justify-content: flex-end;
    z-index: 1000;
  }

  .drawer {
    width: 100%;
    max-width: 400px;
    height: 100%;
    background: var(--bg-surface);
    border-left: 1px solid var(--border-default);
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
    border-bottom: 1px solid var(--border-default);
  }

  .drawer-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--text-primary);
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
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .details-grid {
    background: var(--bg-elevated);
    border-radius: 8px;
    overflow: hidden;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-default);
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .detail-value {
    font-size: 0.875rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .detail-value.amount {
    font-family: 'SF Mono', 'Menlo', monospace;
  }

  .detail-value.positive {
    color: var(--success);
  }

  .detail-value.zero {
    color: var(--success);
  }

  .detail-value.warning {
    color: var(--warning);
  }

  .detail-value.status.closed {
    color: var(--success);
  }

  .detail-value.status.open {
    color: var(--warning);
  }

  .detail-value.adhoc {
    color: var(--purple);
  }

  /* Metadata styles */
  .metadata-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Summary grid with detail text */
  .summary-grid .detail-value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .amount-detail {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-weight: 400;
  }

  /* Occurrences list */
  .occurrences-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .occurrence-card {
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    overflow: hidden;
  }

  .occurrence-card.closed {
    opacity: 0.8;
  }

  .occurrence-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    background: var(--bg-base);
    border-bottom: 1px solid var(--border-default);
  }

  .occurrence-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .occurrence-status {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--warning-bg);
    color: var(--warning);
  }

  .occurrence-status.closed {
    background: var(--success-bg);
    color: var(--success);
  }

  .occurrence-details {
    padding: var(--space-3) var(--space-4);
  }

  .occurrence-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--border-subtle, var(--border-default));
  }

  .occurrence-row:last-child {
    border-bottom: none;
  }

  .occ-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .occ-value {
    font-size: 0.8rem;
    color: var(--text-primary);
    font-weight: 500;
    font-family: 'SF Mono', 'Menlo', monospace;
  }

  .occ-value.positive {
    color: var(--success);
  }

  .occ-value.zero {
    color: var(--success);
  }

  .occ-value.warning {
    color: var(--warning);
  }

  .occurrence-notes-display {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border-default);
  }

  .occurrence-notes-display .occ-label {
    display: block;
    margin-bottom: var(--space-2);
  }

  .occ-notes {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .metadata-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metadata-label {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .metadata-value {
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .metadata-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: var(--accent);
    text-decoration: none;
    transition: color 0.15s;
  }

  .metadata-link:hover {
    color: var(--accent-hover);
    text-decoration: underline;
  }

  .metadata-link svg {
    flex-shrink: 0;
  }

  .metadata-notes {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
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
