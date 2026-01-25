<script lang="ts">
  /**
   * EditCloseModal - Unified modal for editing and closing occurrences
   *
   * Combines editing fields with close options, replacing the complex TransactionsDrawer.
   * Users can edit amount/date, then choose how to close - or save changes without closing.
   */
  import { createEventDispatcher } from 'svelte';
  import Modal from '../shared/Modal.svelte';
  import { paymentSources } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';
  import { apiClient } from '../../lib/api/client';
  import SplitConfirmModal from './SplitConfirmModal.svelte';

  export let open = false;
  export let type: 'bill' | 'income' = 'bill';
  export let month = '';
  export let instanceId = '';
  export let occurrenceId = '';
  export let itemName = '';
  export let expectedAmount = 0; // cents
  export let expectedDate = ''; // YYYY-MM-DD
  export let existingNotes = '';
  export let existingPaymentSourceId: string | undefined = undefined;

  const dispatch = createEventDispatcher<{
    close: void;
    saved: void;
    closed: void;
  }>();

  // Form state
  let amount = '';
  let day = '';
  let notes = '';
  let paymentSourceId = '';
  let paymentDay = '';

  // Close options
  type CloseOption = 'paid_full' | 'paid_nothing' | 'partial';
  let closeOption: CloseOption = 'paid_full';
  let partialAmount = '';

  // UI state
  let saving = false;
  let formError = '';
  let daySelectEl: HTMLSelectElement | null = null;

  // Split confirmation modal
  let showSplitConfirm = false;
  let splitPaidAmount = 0;
  let splitRemainingAmount = 0;

  // Date helpers
  const today = new Date();
  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Computed values
  $: resolvedMonth = month === todayMonth ? month : todayMonth;
  $: [resolvedYear, resolvedMonthNum] = resolvedMonth.split('-').map(Number);
  $: lastDay =
    resolvedYear && resolvedMonthNum
      ? new Date(resolvedYear, resolvedMonthNum, 0).getDate()
      : today.getDate();
  $: maxDay = Math.min(today.getDate(), lastDay);
  $: dayOptions = Array.from({ length: lastDay }, (_, index) => String(index + 1));
  $: paymentDayOptions = Array.from({ length: maxDay }, (_, index) => String(index + 1));

  // Parse amount from cents to display
  $: displayAmount = expectedAmount / 100;

  // Calculate partial remaining
  $: partialCents = parseDollarsToCents(partialAmount);
  $: remainingCents = expectedAmount - partialCents;
  $: remainingDisplay = remainingCents > 0 ? formatCurrency(remainingCents) : '$0.00';

  // Initialize form when modal opens
  $: if (open) {
    initializeForm();
  }

  function initializeForm() {
    // Amount
    amount = (expectedAmount / 100).toFixed(2);

    // Day from expected date
    const initialDay = parseInt(expectedDate.split('-')[2] ?? '', 10) || today.getDate();
    day = String(Math.min(initialDay, lastDay));

    // Payment day defaults to today
    paymentDay = String(Math.min(today.getDate(), maxDay));

    // Notes
    notes = existingNotes || '';

    // Payment source
    paymentSourceId = existingPaymentSourceId || '';

    // Reset close option
    closeOption = 'paid_full';
    partialAmount = '';
    formError = '';

    requestAnimationFrame(() => {
      daySelectEl?.focus();
    });
  }

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  }

  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }

  function handleClose() {
    dispatch('close');
  }

  // Build the expected_date from month + day
  function buildDate(m: string, d: string): string {
    const paddedDay = String(parseInt(d, 10)).padStart(2, '0');
    return `${m}-${paddedDay}`;
  }

  // Save without closing - just update the occurrence
  async function handleSaveWithoutClosing() {
    formError = '';
    const amountCents = parseDollarsToCents(amount);

    if (amountCents <= 0) {
      formError = 'Amount must be greater than zero';
      return;
    }

    saving = true;

    try {
      const endpoint =
        type === 'bill'
          ? `/api/months/${month}/bills/${instanceId}/occurrences/${occurrenceId}`
          : `/api/months/${month}/incomes/${instanceId}/occurrences/${occurrenceId}`;

      await apiClient.put(endpoint, '', {
        expected_date: buildDate(month, day),
        expected_amount: amountCents,
        notes: notes || null,
      });

      success(`${type === 'bill' ? 'Bill' : 'Income'} updated`);
      dispatch('saved');
      handleClose();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Failed to save';
      showError(formError);
    } finally {
      saving = false;
    }
  }

  // Close the occurrence based on selected option
  async function handleCloseAction() {
    formError = '';

    if (closeOption === 'partial') {
      // Validate partial amount
      const paidCents = parseDollarsToCents(partialAmount);
      if (paidCents <= 0) {
        formError = 'Partial payment amount must be greater than zero';
        return;
      }

      const currentAmount = parseDollarsToCents(amount);
      if (paidCents >= currentAmount) {
        formError = 'Partial amount must be less than the full amount';
        return;
      }

      // Show split confirmation modal
      splitPaidAmount = paidCents;
      splitRemainingAmount = currentAmount - paidCents;
      showSplitConfirm = true;
      return;
    }

    // Paid in Full or Paid Nothing - close directly
    await performClose();
  }

  async function performClose() {
    saving = true;

    try {
      const closedDate = buildDate(resolvedMonth, paymentDay);
      const endpoint =
        type === 'bill'
          ? `/api/months/${month}/bills/${instanceId}/occurrences/${occurrenceId}/close`
          : `/api/months/${month}/incomes/${instanceId}/occurrences/${occurrenceId}/close`;

      // For "Paid Nothing", we need to first update the amount to 0, then close
      if (closeOption === 'paid_nothing') {
        // Update amount to 0 first
        const updateEndpoint =
          type === 'bill'
            ? `/api/months/${month}/bills/${instanceId}/occurrences/${occurrenceId}`
            : `/api/months/${month}/incomes/${instanceId}/occurrences/${occurrenceId}`;

        await apiClient.put(updateEndpoint, '', {
          expected_amount: 0,
          notes: notes || null,
        });
      }

      await apiClient.post(endpoint, {
        closed_date: closedDate,
        notes: notes || null,
        payment_source_id: paymentSourceId || undefined,
      });

      const message =
        closeOption === 'paid_nothing'
          ? `${type === 'bill' ? 'Bill' : 'Income'} closed ($0)`
          : `${type === 'bill' ? 'Bill' : 'Income'} closed`;
      success(message);
      dispatch('closed');
      handleClose();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Failed to close';
      showError(formError);
    } finally {
      saving = false;
    }
  }

  // Handle split confirmation
  async function handleSplitConfirm() {
    saving = true;
    showSplitConfirm = false;

    try {
      const closedDate = buildDate(resolvedMonth, paymentDay);
      const endpoint =
        type === 'bill'
          ? `/api/months/${month}/bills/${instanceId}/occurrences/${occurrenceId}/split`
          : `/api/months/${month}/incomes/${instanceId}/occurrences/${occurrenceId}/split`;

      await apiClient.post(endpoint, {
        paid_amount: splitPaidAmount,
        closed_date: closedDate,
        notes: notes || null,
        payment_source_id: paymentSourceId || undefined,
      });

      success(`Partial payment recorded - ${formatCurrency(splitPaidAmount)}`);
      dispatch('closed');
      handleClose();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Failed to split occurrence';
      showError(formError);
    } finally {
      saving = false;
    }
  }

  function handleSplitCancel() {
    showSplitConfirm = false;
  }

  // Close button label based on option
  $: closeButtonLabel = (() => {
    switch (closeOption) {
      case 'paid_full':
        return `Close - Paid ${formatCurrency(parseDollarsToCents(amount))}`;
      case 'paid_nothing':
        return 'Close - $0 Paid';
      case 'partial':
        return `Pay ${formatCurrency(partialCents)} & Keep Open`;
    }
  })();
</script>

<Modal {open} title="Edit & Close" onClose={handleClose} size="md">
  <svelte:fragment slot="eyebrow">{type === 'bill' ? 'Bill' : 'Income'}</svelte:fragment>

  <div class="modal-content">
    <p class="item-name">{itemName}</p>

    <!-- Edit Fields -->
    <div class="field-row">
      <label class="field">
        <span>Amount</span>
        <div class="amount-input-group">
          <span class="prefix">$</span>
          <input
            type="text"
            bind:value={amount}
            placeholder="0.00"
            disabled={saving}
            class:error={formError && parseDollarsToCents(amount) <= 0}
          />
        </div>
      </label>

      <label class="field">
        <span>Due Date</span>
        <select bind:value={day} bind:this={daySelectEl} disabled={saving}>
          {#each dayOptions as opt (opt)}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="divider"></div>

    <!-- Close Options -->
    <p class="section-label">How would you like to handle this?</p>

    <div class="radio-group">
      <label class="radio-option" class:selected={closeOption === 'paid_full'}>
        <input type="radio" bind:group={closeOption} value="paid_full" disabled={saving} />
        <div class="radio-content">
          <span class="radio-title"
            >Close - Paid in Full ({formatCurrency(parseDollarsToCents(amount))})</span
          >
          <span class="radio-desc">Mark as complete. No remaining balance.</span>
        </div>
      </label>

      <label class="radio-option" class:selected={closeOption === 'paid_nothing'}>
        <input type="radio" bind:group={closeOption} value="paid_nothing" disabled={saving} />
        <div class="radio-content">
          <span class="radio-title">Close - Paid Nothing ($0)</span>
          <span class="radio-desc">Mark as complete. Waived or skipped this period.</span>
        </div>
      </label>

      <label class="radio-option" class:selected={closeOption === 'partial'}>
        <input type="radio" bind:group={closeOption} value="partial" disabled={saving} />
        <div class="radio-content">
          <span class="radio-title">Partial Payment - Keep Open</span>
          <span class="radio-desc">Pay part now, remainder stays due.</span>
          {#if closeOption === 'partial'}
            <div class="partial-input">
              <label>
                <span>Amount paid:</span>
                <div class="amount-input-group small">
                  <span class="prefix">$</span>
                  <input
                    type="text"
                    bind:value={partialAmount}
                    placeholder="0.00"
                    disabled={saving}
                  />
                </div>
              </label>
              {#if partialCents > 0 && remainingCents > 0}
                <p class="remaining-note">
                  Remaining {remainingDisplay} will become new occurrence
                </p>
              {/if}
            </div>
          {/if}
        </div>
      </label>
    </div>

    <div class="divider"></div>

    <!-- Payment Details -->
    <div class="field-row">
      <label class="field">
        <span>Payment Date</span>
        <select bind:value={paymentDay} disabled={saving}>
          {#each paymentDayOptions as opt (opt)}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span>Payment Source</span>
        <select bind:value={paymentSourceId} disabled={saving}>
          <option value="">None</option>
          {#each $paymentSources as source (source.id)}
            <option value={source.id}>
              {source.name}
              {#if source.metadata?.last_four_digits}
                ****{source.metadata.last_four_digits}
              {/if}
            </option>
          {/each}
        </select>
      </label>
    </div>

    <label class="field">
      <span>Notes (optional)</span>
      <textarea rows="3" bind:value={notes} placeholder="Add a note..." disabled={saving}
      ></textarea>
    </label>

    {#if formError}
      <p class="error-message">{formError}</p>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <button
      class="button-secondary"
      type="button"
      on:click={handleSaveWithoutClosing}
      disabled={saving}
    >
      Save Without Closing
    </button>
    <div class="footer-right">
      <button class="button-ghost" type="button" on:click={handleClose} disabled={saving}>
        Cancel
      </button>
      <button class="button-primary" type="button" on:click={handleCloseAction} disabled={saving}>
        {saving ? 'Saving...' : closeButtonLabel}
      </button>
    </div>
  </svelte:fragment>
</Modal>

<!-- Split Confirmation Modal -->
<SplitConfirmModal
  open={showSplitConfirm}
  paidAmount={splitPaidAmount}
  remainingAmount={splitRemainingAmount}
  on:confirm={handleSplitConfirm}
  on:cancel={handleSplitCancel}
/>

<style>
  .modal-content {
    display: grid;
    gap: var(--space-4);
  }

  .item-name {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .field {
    display: grid;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .field span {
    font-weight: 500;
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
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 1rem;
  }

  .amount-input-group.small input {
    font-size: 0.9rem;
    padding: var(--space-1) var(--space-2);
  }

  .amount-input-group input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .amount-input-group input.error {
    border-color: var(--error);
  }

  select,
  textarea {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-primary);
    box-sizing: border-box;
  }

  select:focus,
  textarea:focus {
    outline: 2px solid var(--border-focus);
    outline-offset: 1px;
  }

  textarea {
    min-height: calc(var(--input-height, 40px) * 2);
    resize: vertical;
  }

  .divider {
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-2) 0;
  }

  .section-label {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .radio-group {
    display: grid;
    gap: var(--space-3);
  }

  .radio-option {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-base);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .radio-option:hover {
    border-color: var(--border-hover);
    background: var(--bg-hover);
  }

  .radio-option.selected {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .radio-option input[type='radio'] {
    margin-top: var(--space-1);
    accent-color: var(--accent);
  }

  .radio-content {
    flex: 1;
    display: grid;
    gap: var(--space-1);
  }

  .radio-title {
    font-weight: 500;
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .radio-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .partial-input {
    margin-top: var(--space-3);
    display: grid;
    gap: var(--space-2);
  }

  .partial-input label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.9rem;
  }

  .remaining-note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  .error-message {
    margin: 0;
    color: var(--error);
    font-size: 0.875rem;
  }

  .footer-right {
    display: flex;
    gap: var(--space-3);
    margin-left: auto;
  }

  .button-secondary,
  .button-ghost,
  .button-primary {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .button-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
  }

  .button-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .button-ghost {
    background: transparent;
    color: var(--text-secondary);
    border: none;
  }

  .button-ghost:hover:not(:disabled) {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .button-primary {
    background: var(--accent);
    color: var(--text-inverse);
    border: none;
  }

  .button-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .button-secondary:disabled,
  .button-ghost:disabled,
  .button-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    .field-row {
      grid-template-columns: 1fr;
    }

    .footer-right {
      margin-left: 0;
    }
  }
</style>
