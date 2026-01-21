<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import type { SavingsGoal } from '../../stores/savings-goals';
  import Modal from '../shared/Modal.svelte';

  export let goal: SavingsGoal;
  export let onClose: () => void;
  export let open = true;

  const dispatch = createEventDispatcher();

  let amountDollars = '';
  let paymentDate = new Date().toISOString().split('T')[0];
  let submitting = false;

  // Calculate max date (today)
  $: maxDate = new Date().toISOString().split('T')[0];

  // Calculate min date (first of current month)
  $: minDate = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  })();

  // Form validation
  $: amountCents = Math.round(parseFloat(amountDollars || '0') * 100);
  $: isValid = amountCents > 0 && paymentDate !== '';

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!isValid || submitting) return;

    submitting = true;
    try {
      await apiClient.post(`/api/savings-goals/${goal.id}/contribute`, {
        amount: amountCents,
        date: paymentDate,
      });

      success(`Added ${formatCurrency(amountCents)} to "${goal.name}"`);
      dispatch('payment', { amount: amountCents, date: paymentDate });
      onClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to make payment');
    } finally {
      submitting = false;
    }
  }

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  }
</script>

<Modal
  {open}
  title="Make a Payment"
  subtitle={`Add a one-time contribution to "${goal.name}"`}
  {onClose}
>
  <form on:submit={handleSubmit}>
    <div class="form-field">
      <label for="amount">Amount</label>
      <div class="input-with-prefix">
        <span class="prefix">$</span>
        <input
          type="number"
          id="amount"
          bind:value={amountDollars}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          required
          autofocus
        />
      </div>
    </div>

    <div class="form-field">
      <label for="paymentDate">Payment Date</label>
      <input
        type="date"
        id="paymentDate"
        bind:value={paymentDate}
        min={minDate}
        max={maxDate}
        required
      />
      <span class="field-hint">Payments can only be dated within the current month</span>
    </div>

    <div class="progress-preview">
      <span class="preview-label">After this payment:</span>
      <span class="preview-value">
        {formatCurrency(goal.saved_amount + amountCents)} of {formatCurrency(goal.target_amount)}
      </span>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-secondary" on:click={onClose} disabled={submitting}>
        Cancel
      </button>
      <button type="submit" class="btn-primary" disabled={!isValid || submitting}>
        {submitting ? 'Adding...' : 'Add Payment'}
      </button>
    </div>
  </form>
</Modal>

<style>
  .form-field {
    margin-bottom: var(--space-4);
  }

  .form-field label {
    display: block;
    margin-bottom: var(--space-2);
    font-weight: 500;
    color: var(--text-primary);
  }

  .form-field input {
    width: 100%;
    padding: var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 1rem;
  }

  .form-field input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .input-with-prefix {
    display: flex;
    align-items: center;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .input-with-prefix:focus-within {
    border-color: var(--accent);
  }

  .input-with-prefix .prefix {
    padding: var(--space-3);
    color: var(--text-secondary);
    background: var(--bg-elevated);
    border-right: 1px solid var(--border-default);
  }

  .input-with-prefix input {
    border: none;
    background: transparent;
  }

  .input-with-prefix input:focus {
    outline: none;
    border: none;
  }

  .field-hint {
    display: block;
    margin-top: var(--space-1);
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .progress-preview {
    display: flex;
    justify-content: space-between;
    padding: var(--space-3);
    background: var(--accent-muted);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
  }

  .preview-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .preview-value {
    color: var(--accent);
    font-weight: 600;
    font-size: 0.875rem;
  }

  .modal-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .btn-primary,
  .btn-secondary {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
