<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import Drawer from '../shared/Drawer.svelte';

  export let open = false;
  export let month: string;
  export let billInstanceId: string;
  export let billName: string = '';
  export let expectedAmount: number = 0;
  export let totalPaid: number = 0;
  export let occurrenceId: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  let amount = '';
  let date = new Date().toISOString().split('T')[0];
  let saving = false;
  let error = '';

  $: remaining = expectedAmount - totalPaid;
  $: suggestedAmount = remaining > 0 ? (remaining / 100).toFixed(2) : '';

  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
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

  async function handleSubmit() {
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
      if (!occurrenceId) {
        throw new Error('Missing occurrence for payment. Refresh and try again.');
      }

      await apiClient.post(
        `/api/months/${month}/bills/${billInstanceId}/occurrences/${occurrenceId}/payments`,
        {
          amount: amountCents,
          date,
        }
      );
      success('Payment added');
      dispatch('added');
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add payment';
      showError(error);
    } finally {
      saving = false;
    }
  }
</script>

<Drawer isOpen={open} title="Add Payment" onClose={handleClose}>
  <div class="drawer-content-inner">
    <div class="bill-info">
      <span class="bill-name">{billName}</span>
      <div class="bill-details">
        <span>Expected: {formatCurrency(expectedAmount)}</span>
        <span>Paid: {formatCurrency(totalPaid)}</span>
        <span class="remaining">Remaining: {formatCurrency(remaining)}</span>
      </div>
    </div>

    <form on:submit|preventDefault={handleSubmit}>
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
              Pay remaining
            </button>
          {/if}
        </div>
      </div>

      <div class="form-group">
        <label for="date">Date</label>
        <input id="date" type="date" bind:value={date} disabled={saving} />
      </div>

      {#if error}
        <p class="error-message">{error}</p>
      {/if}

      <div class="form-actions">
        <button type="button" class="cancel-btn" on:click={handleClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" class="submit-btn" disabled={saving}>
          {saving ? 'Adding...' : 'Add Payment'}
        </button>
      </div>
    </form>
  </div>
</Drawer>

<style>
  .drawer-content-inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .bill-info {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .bill-name {
    display: block;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-2);
  }

  .bill-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .bill-details .remaining {
    color: var(--warning);
    font-weight: 500;
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
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
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
    border-radius: var(--radius-md);
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

  input[type='date'] {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 1rem;
  }

  input[type='date']:focus {
    outline: none;
    border-color: var(--accent);
  }

  .error-message {
    color: var(--error);
    font-size: 0.875rem;
    margin: 0 0 var(--space-4) 0;
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }

  .cancel-btn,
  .submit-btn {
    flex: 1;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .cancel-btn:hover:not(:disabled) {
    border-color: var(--text-primary);
    color: var(--text-primary);
  }

  .submit-btn {
    background: var(--accent);
    border: none;
    color: var(--text-inverse);
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .cancel-btn:disabled,
  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
