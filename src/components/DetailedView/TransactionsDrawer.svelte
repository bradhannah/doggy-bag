<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import { detailedMonth, type Payment } from '../../stores/detailed-month';

  export let open = false;
  export let month: string;
  export let instanceId: string;
  export let instanceName: string = '';
  export let expectedAmount: number = 0;
  export let transactionList: Payment[] = [];
  export let isClosed: boolean = false;
  export let type: 'bill' | 'income' = 'bill';
  export let occurrenceId: string | undefined = undefined;
  export let occurrenceNotes: string | null = null;
  export let refreshNotes = 0;

  export let isPayoffBill: boolean = false;

  const dispatch = createEventDispatcher();

  let isDestroyed = false;
  onDestroy(() => {
    isDestroyed = true;
  });

  // Form state
  let amount = '';
  let saving = false;
  let error = '';
  let notes = '';
  let savingNotes = false;
  let notesDirty = false;
  let showDiscardConfirm = false;

  // Day-of-month dropdown state
  let selectedDay = '';
  const today = new Date();
  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  $: resolvedMonth = month === todayMonth ? month : todayMonth;
  $: [resolvedYear, resolvedMonthNum] = resolvedMonth.split('-').map(Number);
  $: lastDay =
    resolvedYear && resolvedMonthNum
      ? new Date(resolvedYear, resolvedMonthNum, 0).getDate()
      : today.getDate();
  $: maxDay = Math.min(today.getDate(), lastDay);
  $: dayOptions = Array.from({ length: maxDay }, (_, index) => String(index + 1));

  // Compute full date from selected day
  $: date = selectedDay ? `${resolvedMonth}-${selectedDay.padStart(2, '0')}` : '';

  $: if (open) {
    notes = occurrenceNotes ?? '';
    notesDirty = false;
    // Default to today's day (clamped to maxDay)
    selectedDay = String(Math.min(today.getDate(), maxDay));
  }

  $: if (open && !notesDirty) {
    notes = occurrenceNotes ?? '';
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
    // If there are unsaved notes, show confirmation dialog
    if (notesDirty) {
      showDiscardConfirm = true;
      return;
    }
    doClose();
  }

  function doClose() {
    open = false;
    showDiscardConfirm = false;
    resetForm();
    dispatch('close');
  }

  function handleDiscardConfirm() {
    notesDirty = false;
    doClose();
  }

  function handleCancelDiscard() {
    showDiscardConfirm = false;
  }

  async function handleSaveAndClose() {
    await saveNotes();
    if (!notesDirty) {
      // Save succeeded
      doClose();
    }
    showDiscardConfirm = false;
  }

  function resetForm() {
    amount = '';
    selectedDay = String(Math.min(today.getDate(), maxDay));
    error = '';
  }

  function useSuggested() {
    amount = suggestedAmount;
  }

  async function addTransactionAndClose() {
    // First add the payment, then dispatch event for parent to open CloseTransactionModal
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

      if (occurrenceId) {
        // Occurrence-level endpoints
        endpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/payments`;
      } else {
        throw new Error('Missing occurrence for payment updates. Refresh and try again.');
      }

      await apiClient.post(endpoint, { amount: amountCents, date });

      success(`${typeLabel} added`);
      dispatch('updated', { paymentAmount: amountCents });

      // Close the drawer and dispatch event for parent to handle closing via CloseTransactionModal
      resetForm();
      open = false;
      dispatch('requestClose', { paymentDate: date, notes });
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to add ${typeLabel.toLowerCase()}`;
      showError(error);
    } finally {
      saving = false;
    }
  }

  async function addTransactionAndKeepOpen() {
    await addTransaction();
  }

  async function addTransaction() {
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

      if (occurrenceId) {
        // Occurrence-level endpoints
        endpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/payments`;
      } else {
        throw new Error('Missing occurrence for payment updates. Refresh and try again.');
      }

      await apiClient.post(endpoint, { amount: amountCents, date });

      success(`${typeLabel} added`);
      dispatch('updated', { paymentAmount: amountCents });
      resetForm();
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to add ${typeLabel.toLowerCase()}`;
      showError(error);
    } finally {
      saving = false;
    }
  }

  async function closeWithoutAdding() {
    // Dispatch event for parent to open CloseTransactionModal
    open = false;
    dispatch('requestClose', { paymentDate: date, notes });
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
    // Guard: Don't save if component is destroyed or drawer is closed
    if (isDestroyed || !open) {
      return;
    }
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
      // Use optimistic update instead of dispatch('notesUpdated') to prevent full refresh
      detailedMonth.updateOccurrenceNotes(instanceId, occurrenceId, notes || null, type);
      success('Notes saved');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      savingNotes = false;
    }
  }

  function handleNotesInput() {
    // Mark notes as dirty when user types (no auto-save)
    notesDirty = true;
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
            <div class="section-header">
              <h4>Occurrence Notes</h4>
              <button
                class="save-notes-btn"
                on:click={saveNotes}
                disabled={savingNotes || saving || !notesDirty}
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
            <div class="form-group">
              <textarea
                id="notes"
                rows="4"
                placeholder="Add a note for this occurrence"
                bind:value={notes}
                disabled={savingNotes || saving}
                on:input={handleNotesInput}
              ></textarea>
              {#if notesDirty}
                <p class="notes-hint unsaved">You have unsaved changes</p>
              {/if}
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
              <label for="date">Payment day</label>
              <select id="date" bind:value={selectedDay} disabled={saving}>
                {#each dayOptions as option (option)}
                  <option value={option}>{option}</option>
                {/each}
              </select>
              <p class="hint">Defaults to today. Only days from 1st to today are available.</p>
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

<!-- Unsaved Changes Confirmation Dialog -->
{#if showDiscardConfirm}
  <div
    class="confirm-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    on:click={handleCancelDiscard}
    on:keydown={(e) => e.key === 'Escape' && handleCancelDiscard()}
  >
    <div class="confirm-dialog" on:click|stopPropagation>
      <h3>Unsaved Changes</h3>
      <p>You have unsaved notes. What would you like to do?</p>
      <div class="confirm-actions">
        <button class="confirm-btn cancel" on:click={handleCancelDiscard}>Cancel</button>
        <button class="confirm-btn discard" on:click={handleDiscardConfirm}>Discard</button>
        <button class="confirm-btn save" on:click={handleSaveAndClose} disabled={savingNotes}>
          {savingNotes ? 'Saving...' : 'Save & Close'}
        </button>
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

  select {
    width: 100%;
    height: var(--input-height);
    padding: 0 var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 1rem;
  }

  select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .hint {
    margin: var(--space-1) 0 0 0;
    font-size: 0.75rem;
    color: var(--text-tertiary);
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

  /* Section header with title and button */
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .section-header h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .save-notes-btn {
    padding: var(--space-2) var(--space-3);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-inverse);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-notes-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .save-notes-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .notes-hint.unsaved {
    color: var(--warning);
    font-weight: 500;
  }

  /* Confirmation overlay and dialog */
  .confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .confirm-dialog {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 400px;
    width: 90%;
    box-shadow: var(--shadow-heavy);
  }

  .confirm-dialog h3 {
    margin: 0 0 var(--space-3) 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .confirm-dialog p {
    margin: 0 0 var(--space-4) 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .confirm-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .confirm-btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .confirm-btn.cancel {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .confirm-btn.cancel:hover {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .confirm-btn.discard {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    color: var(--error);
  }

  .confirm-btn.discard:hover {
    background: var(--error);
    color: var(--text-inverse);
  }

  .confirm-btn.save {
    background: var(--accent);
    border: none;
    color: var(--text-inverse);
  }

  .confirm-btn.save:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .confirm-btn.save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
