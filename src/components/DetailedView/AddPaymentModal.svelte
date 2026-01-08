<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { payments } from '../../stores/payments';
  import { success, error as showError } from '../../stores/toast';

  export let open = false;
  export let month: string;
  export let billInstanceId: string;
  export let billName: string = '';
  export let expectedAmount: number = 0;
  export let totalPaid: number = 0;

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
      await payments.addPayment(month, billInstanceId, amountCents, date);
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
      aria-labelledby="add-payment-title"
      tabindex="-1"
    >
      <header class="drawer-header">
        <h3 id="add-payment-title">Add Payment</h3>
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
    padding: 20px;
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

  .bill-info {
    background: var(--bg-elevated);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
  }

  .bill-name {
    display: block;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .bill-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .bill-details .remaining {
    color: var(--warning);
    font-weight: 500;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .amount-input-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .amount-input-group .prefix {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .amount-input-group input {
    flex: 1;
    padding: 10px 12px;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: 6px;
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
    padding: 8px 12px;
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: 6px;
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
    padding: 10px 12px;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: 6px;
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
    margin: 0 0 16px 0;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  .cancel-btn,
  .submit-btn {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
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
