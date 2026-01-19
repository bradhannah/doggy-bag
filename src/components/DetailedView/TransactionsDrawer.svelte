<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import type { Payment } from '../../stores/detailed-month';

  export let open = false;
  export let month: string;
  export let instanceId: string;
  export let instanceName: string = '';
  export let expectedAmount: number = 0;
  export let transactionList: Payment[] = [];
  export let isClosed: boolean = false;
  export let type: 'bill' | 'income' = 'bill';
  export let occurrenceId: string | undefined = undefined; // NEW: For occurrence-level payments
  export let occurrenceNotes: string | null = null;
  export let refreshNotes = 0;

  export let isPayoffBill: boolean = false; // NEW: Disable close actions for payoff bills

  const dispatch = createEventDispatcher();

  // Form state
  let amount = '';
  let date = new Date().toISOString().split('T')[0];
  let saving = false;
  let error = '';
  let notes = '';
  let savingNotes = false;
  let notesDirty = false;
  let notesSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let closeDate = new Date().toISOString().split('T')[0];
  let closeDateTouched = false;

  $: if (open) {
    notes = occurrenceNotes ?? '';
    notesDirty = false;
    closeDate = date;
    closeDateTouched = false;
  }

  $: if (open && !notesDirty) {
    notes = occurrenceNotes ?? '';
  }

  $: if (!closeDateTouched && date) {
    closeDate = date;
  }

  $: if (open && !notesDirty && refreshNotes !== undefined) {
    notes = occurrenceNotes ?? '';
  }

  // Computed values
  $: totalTransactions = transactionList.reduce((sum, p) => sum + p.amount, 0);
  $: remaining = Math.max(0, expectedAmount - totalTransactions);
  $: suggestedAmount = remaining > 0 ? (remaining / 100).toFixed(2) : '';
  $: typeLabel = type === 'bill' ? 'Payment' : 'Receipt';
  $: typeLabelPlural = type === 'bill' ? 'Payments' : 'Receipts';
  $: actionLabel = type === 'bill' ? 'Pay' : 'Receive';

  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }

  function handleClose() {
    open = false;
    resetForm();
    dispatch('close');
  }

  function resetForm() {
    amount = '';
    date = new Date().toISOString().split('T')[0];
    error = '';
  }

  function useSuggested() {
    amount = suggestedAmount;
  }

  async function addTransactionAndClose() {
    closeDateTouched = true;
    closeDate = date;
    await addTransaction(true);
  }

  async function addTransactionAndKeepOpen() {
    await addTransaction(false);
  }

  async function addTransaction(closeAfter: boolean) {
    const amountCents = parseDollarsToCents(amount);

    if (amountCents <= 0) {
      error = 'Please enter a valid amount';
      return;
    }

    if (!date) {
      error = 'Please select a date';
      return;
    }

    saving = true;
    error = '';

    try {
      // Build the endpoint - use occurrence endpoint if occurrenceId provided
      let endpoint: string;
      let closeEndpoint: string;

      if (occurrenceId) {
        // Occurrence-level endpoints
        endpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/payments`;
        closeEndpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/close`;
      } else {
        throw new Error('Missing occurrence for payment updates. Refresh and try again.');
      }

      await apiClient.post(endpoint, { amount: amountCents, date });

      // Close the instance/occurrence if requested
      if (closeAfter) {
        if (!closeDate) {
          error = 'Please select a close date';
          return;
        }
        await apiClient.post(closeEndpoint, {
          closed_date: closeDate,
          notes,
        });
        success(`${typeLabel} added and closed`);
      } else {
        success(`${typeLabel} added`);
      }

      dispatch('updated', { paymentAmount: amountCents });

      if (closeAfter) {
        handleClose();
      } else {
        resetForm();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to add ${typeLabel.toLowerCase()}`;
      showError(error);
    } finally {
      saving = false;
    }
  }

  async function closeWithoutAdding() {
    saving = true;
    error = '';

    try {
      // Build the close endpoint - use occurrence endpoint if occurrenceId provided
      let closeEndpoint: string;

      if (occurrenceId) {
        closeEndpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/close`;
      } else {
        throw new Error('Missing occurrence for close action. Refresh and try again.');
      }

      if (!closeDate) {
        error = 'Please select a close date';
        return;
      }

      await apiClient.post(closeEndpoint, {
        closed_date: closeDate,
        notes,
      });
      success(`${occurrenceId ? 'Occurrence' : type === 'bill' ? 'Bill' : 'Income'} closed`);
      dispatch('updated');
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to close';
      showError(error);
    } finally {
      saving = false;
    }
  }

  async function deleteTransaction(paymentId: string) {
    try {
      // Build the endpoint - use occurrence endpoint if occurrenceId provided
      let endpoint: string;

      if (occurrenceId) {
        // Occurrence-level delete endpoint
        endpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/payments/${paymentId}`;
      } else {
        throw new Error('Missing occurrence for deletion. Refresh and try again.');
      }

      await apiClient.deletePath(endpoint);
      success(`${typeLabel} deleted`);
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : `Failed to delete ${typeLabel.toLowerCase()}`);
    }
  }

  async function saveNotes() {
    if (!occurrenceId) {
      showError('Missing occurrence for notes');
      return;
    }

    savingNotes = true;
    try {
      await apiClient.putPath(
        `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}`,
        {
          notes,
        }
      );
      notesDirty = false;
      success('Notes saved');
      dispatch('notesUpdated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      savingNotes = false;
    }
  }

  function scheduleNotesSave() {
    notesDirty = true;
    if (notesSaveTimeout) {
      clearTimeout(notesSaveTimeout);
    }
    notesSaveTimeout = setTimeout(() => {
      if (notesDirty) {
        saveNotes();
      }
    }, 600);
  }

  function handleNotesBlur() {
    if (notesDirty) {
      saveNotes();
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

{#if open}
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
      aria-labelledby="transactions-title"
      tabindex="-1"
    >
      <header class="drawer-header">
        <h3 id="transactions-title">{typeLabelPlural}</h3>
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
        <!-- Item info -->
        <div class="item-info">
          <span class="item-name">{instanceName}</span>
          <div class="item-details">
            <span>Expected: {formatCurrency(expectedAmount)}</span>
            <span
              >Total {type === 'bill' ? 'Paid' : 'Received'}: {formatCurrency(
                totalTransactions
              )}</span
            >
            <span class="remaining" class:zero={remaining === 0}>
              Remaining: {formatCurrency(remaining)}
            </span>
          </div>
        </div>

        <!-- Transactions list -->
        {#if transactionList.length > 0}
          <div class="transactions-section">
            <h4>{typeLabelPlural} ({transactionList.length})</h4>
            <div class="transactions-list">
              {#each transactionList as transaction (transaction.id)}
                <div class="transaction-item">
                  <span class="transaction-date">{formatDate(transaction.date)}</span>
                  <span class="transaction-amount">{formatCurrency(transaction.amount)}</span>
                  {#if !isClosed}
                    <button
                      class="delete-btn"
                      on:click={() => deleteTransaction(transaction.id)}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M18 6L6 18M6 6L18 18"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="no-transactions">No {typeLabelPlural.toLowerCase()} yet</p>
        {/if}

        {#if !isClosed}
          <div class="add-section">
            <h4>Occurrence Notes</h4>
            <div class="form-group">
              <label for="notes">Notes</label>
              <textarea
                id="notes"
                rows="6"
                placeholder="Add a note for this occurrence"
                bind:value={notes}
                disabled={savingNotes || saving}
                on:input={scheduleNotesSave}
                on:blur={handleNotesBlur}
              ></textarea>
              <p class="notes-hint">Auto-saves as you type.</p>
            </div>
          </div>

          <div class="add-section">
            <h4>Add {typeLabel}</h4>

            <div class="form-group">
              <label for="amount">Amount</label>
              <div class="amount-input-group">
                <span class="prefix">$</span>
                <input
                  id="amount"
                  type="text"
                  bind:value={amount}
                  placeholder="0.00"
                  disabled={saving}
                  class:error={!!error}
                />
                {#if remaining > 0}
                  <button type="button" class="suggest-btn" on:click={useSuggested}>
                    {actionLabel} remaining
                  </button>
                {/if}
              </div>
            </div>

            <div class="form-group">
              <label for="date">Payment date</label>
              <input id="date" type="date" bind:value={date} disabled={saving} />
            </div>

            <div class="form-group">
              <label for="close-date">Close date</label>
              <input
                id="close-date"
                type="date"
                bind:value={closeDate}
                on:input={() => (closeDateTouched = true)}
                disabled={saving}
              />
            </div>

            {#if error}
              <p class="error-message">{error}</p>
            {/if}

            <div class="form-actions">
              <button
                class="action-btn secondary"
                on:click={addTransactionAndKeepOpen}
                disabled={saving}
              >
                Add & Keep Open
              </button>
              {#if !isPayoffBill}
                <button
                  class="action-btn primary"
                  on:click={addTransactionAndClose}
                  disabled={saving}
                >
                  Add & Close
                </button>
              {/if}
            </div>

            {#if !isPayoffBill}
              <button class="close-without-btn" on:click={closeWithoutAdding} disabled={saving}>
                Close Without Adding
              </button>
            {/if}
          </div>
        {:else}
          <div class="closed-notice">
            <span class="checkmark">&#10003;</span>
            This {type} is closed
          </div>
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
    max-width: var(--drawer-width);
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
    padding: var(--space-4);
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
    padding: var(--space-1);
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
    padding: var(--space-4);
    overflow-y: auto;
  }

  .item-info {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--section-gap);
  }

  .item-name {
    display: block;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-2);
  }

  .item-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .item-details .remaining {
    color: var(--warning);
    font-weight: 500;
  }

  .item-details .remaining.zero {
    color: var(--success);
  }

  .notes-hint {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .transactions-section {
    margin-bottom: var(--space-6);
  }

  .transactions-section h4,
  .add-section h4 {
    margin: 0 0 var(--space-3) 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .transactions-list {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .transaction-item {
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-default);
  }

  .transaction-item:last-child {
    border-bottom: none;
  }

  .transaction-date {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .transaction-amount {
    font-weight: 500;
    color: var(--text-primary);
    margin-right: var(--space-3);
  }

  .delete-btn {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: var(--space-1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .delete-btn:hover {
    color: var(--error);
  }

  .no-transactions {
    color: var(--text-tertiary);
    font-size: 0.875rem;
    text-align: center;
    padding: var(--section-gap);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
  }

  .add-section {
    border-top: 1px solid var(--border-default);
    padding-top: var(--section-gap);
  }

  .form-group {
    margin-bottom: var(--space-4);
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
  }

  .amount-input-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .amount-input-group .prefix {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .amount-input-group input {
    flex: 1;
    height: var(--input-height);
    padding: 0 var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 1rem;
  }

  .amount-input-group input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .amount-input-group input.error {
    border-color: var(--error);
  }

  .suggest-btn {
    padding: var(--space-2) var(--space-3);
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: var(--radius-sm);
    color: var(--warning);
    font-size: 0.75rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .suggest-btn:hover {
    background: var(--warning-bg);
    border-color: var(--warning);
  }

  textarea {
    width: 100%;
    min-height: calc(var(--input-height) * 4);
    padding: var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.95rem;
    line-height: 1.4;
    resize: vertical;
  }

  textarea:focus {
    outline: 2px solid var(--border-focus);
    outline-offset: 1px;
  }

  input[type='date'] {
    width: 100%;
    height: var(--input-height);
    padding: 0 var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 1rem;
  }

  input[type='date']:focus {
    outline: none;
    border-color: var(--accent);
  }

  textarea::placeholder {
    color: var(--text-tertiary);
  }

  .error-message {
    color: var(--error);
    font-size: 0.875rem;
    margin: 0 0 var(--space-4) 0;
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .action-btn {
    flex: 1;
    height: var(--button-height);
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn.secondary {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-primary);
  }

  .action-btn.secondary:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .action-btn.primary {
    background: var(--accent);
    border: none;
    color: var(--text-inverse);
  }

  .action-btn.primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .close-without-btn {
    width: 100%;
    height: var(--button-height-sm);
    padding: 0 var(--space-3);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-without-btn:hover:not(:disabled) {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .close-without-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .closed-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--section-gap);
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    border-radius: var(--radius-md);
    color: var(--success);
    font-weight: 500;
  }

  .checkmark {
    font-size: 1.25rem;
  }
</style>
