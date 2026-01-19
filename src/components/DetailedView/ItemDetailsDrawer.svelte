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
  import type {
    BillInstanceDetailed,
    IncomeInstanceDetailed,
    Occurrence,
  } from '../../stores/detailed-month';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';

  export let open = false;
  export let type: 'bill' | 'income' = 'bill';
  export let item: BillInstanceDetailed | IncomeInstanceDetailed | null = null;
  export let categoryName: string = '';
  export let month = '';
  export let occurrenceId: string | null = null;

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

  $: occurrences = item?.occurrences ?? [];
  $: activeOccurrences = occurrenceId
    ? occurrences.filter((occ) => occ.id === occurrenceId)
    : occurrences;

  let savingNotes = false;
  let notesDrafts: Record<string, string> = {};

  $: if (open) {
    notesDrafts = activeOccurrences.reduce(
      (acc, occ) => {
        acc[occ.id] = (occ as Occurrence & { notes?: string | null }).notes ?? '';
        return acc;
      },
      {} as Record<string, string>
    );
  }

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

  async function saveOccurrenceNotes(occurrence: Occurrence) {
    if (!item || savingNotes) return;
    const notes = (notesDrafts[occurrence.id] ?? '').trim();
    const apiBase = `/api/months/${month}/${type}s/${item.id}/occurrences/${occurrence.id}`;

    savingNotes = true;
    try {
      await apiClient.putPath(apiBase, {
        notes: notes.length > 0 ? notes : null,
      });
      success('Notes saved');
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      savingNotes = false;
    }
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

        <!-- Occurrence Notes Section -->
        {#if activeOccurrences.length > 0}
          <section class="section">
            <h4 class="section-title">Notes</h4>
            <div class="occurrence-notes">
              {#each activeOccurrences as occurrence (occurrence.id)}
                <div class="occurrence-note-card">
                  <div class="note-header">
                    <div class="note-title">
                      <span class="note-date">{formatDate(occurrence.expected_date)}</span>
                      {#if occurrence.is_closed}
                        <span class="note-status">Closed</span>
                      {:else}
                        <span class="note-status open">Open</span>
                      {/if}
                    </div>
                    <button
                      class="note-save"
                      on:click={() => saveOccurrenceNotes(occurrence)}
                      disabled={savingNotes}
                    >
                      {savingNotes ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <textarea
                    rows="4"
                    placeholder="Add a note for this occurrence"
                    bind:value={notesDrafts[occurrence.id]}
                  ></textarea>
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

  .occurrence-notes {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .occurrence-note-card {
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    padding: var(--space-3);
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .note-title {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .note-date {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .note-status {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .note-status.open {
    color: var(--warning);
  }

  .note-save {
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .note-save:hover:not(:disabled) {
    background: var(--accent-muted);
    color: var(--accent);
    border-color: var(--accent-border);
  }

  .occurrence-note-card textarea::placeholder {
    color: var(--text-tertiary);
  }

  .note-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .occurrence-note-card textarea {
    width: 100%;
    min-height: calc(var(--input-height) * 2.5);
    border: 1px solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    line-height: 1.4;
    resize: vertical;
  }

  .occurrence-note-card textarea:focus {
    outline: 2px solid var(--border-focus);
    outline-offset: 1px;
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
