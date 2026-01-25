<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';

  export let open = false;
  export let month: string;
  export let instanceId: string;
  export let cardName: string;
  export let currentBalance: number; // in cents (positive = debt owed)
  export let paidSoFar: number; // sum of closed chunks in cents
  export let remaining: number; // currentBalance - paidSoFar in cents

  const dispatch = createEventDispatcher();

  let saving = false;
  let paymentAmountInput = '';
  let paymentDay = '';
  let newBalanceOverride = '';
  let isNewBalanceManual = false;

  // Initialize payment day to today
  $: if (open && !paymentDay) {
    const today = new Date();
    paymentDay = String(today.getDate());
  }

  // Reset state when modal opens
  $: if (open) {
    paymentAmountInput = '';
    newBalanceOverride = '';
    isNewBalanceManual = false;
  }

  // Parse payment amount from input
  $: paymentAmountCents = parseDollarsToCents(paymentAmountInput);

  // Calculate new balance after payment (auto-calculated unless overridden)
  $: calculatedNewBalance = currentBalance - paymentAmountCents;
  $: displayNewBalance = isNewBalanceManual
    ? parseDollarsToCents(newBalanceOverride)
    : calculatedNewBalance;

  // Validate form
  $: isValid = paymentAmountCents > 0 && paymentDay !== '';

  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }

  function formatCurrency(cents: number): string {
    const dollars = Math.abs(cents) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  function formatDebtCurrency(cents: number): string {
    const dollars = Math.abs(cents) / 100;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);

    if (cents > 0) return `-${formatted}`; // Debt owed
    if (cents < 0) return `+${formatted}`; // Credit/overpayment
    return formatted;
  }

  // Generate day options for dropdown
  function getDaysInMonth(monthStr: string): number[] {
    const [year, monthNum] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }

  $: daysInMonth = getDaysInMonth(month);

  async function handleConfirm() {
    if (saving || !isValid) return;
    saving = true;

    try {
      const paymentDate = `${month}-${String(paymentDay).padStart(2, '0')}`;

      const payload: { amount: number; date: string; newBalance?: number } = {
        amount: paymentAmountCents,
        date: paymentDate,
      };

      // Only include newBalance if user manually overrode it
      if (isNewBalanceManual) {
        payload.newBalance = parseDollarsToCents(newBalanceOverride);
      }

      const result = await apiClient.post(
        `/api/months/${month}/payoff-bills/${instanceId}/pay`,
        payload
      );

      success('Payment recorded');
      dispatch('updated', {
        instance: result.instance,
        newBalance: result.newBalance,
        remaining: result.remaining,
      });
      open = false;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      saving = false;
    }
  }

  function handleCancel() {
    dispatch('cancel');
    open = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }

  function handleNewBalanceInput() {
    isNewBalanceManual = true;
  }
</script>

{#if open}
  <div
    class="modal-overlay"
    on:click={handleCancel}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-content" on:click|stopPropagation on:keydown|stopPropagation role="none">
      <h3>Pay {cardName}</h3>

      <div class="balance-summary">
        <div class="summary-row">
          <span class="label">Current Balance</span>
          <span class="value debt">{formatDebtCurrency(currentBalance)}</span>
        </div>
        <div class="summary-row">
          <span class="label">Paid So Far</span>
          <span class="value positive">{formatCurrency(paidSoFar)}</span>
        </div>
        <div class="summary-row highlight">
          <span class="label">Remaining</span>
          <span class="value" class:zero={remaining === 0}>{formatCurrency(remaining)}</span>
        </div>
      </div>

      <div class="form-group">
        <label for="payment-amount">Payment Amount</label>
        <div class="input-with-prefix">
          <span class="prefix">$</span>
          <input
            id="payment-amount"
            type="text"
            inputmode="decimal"
            placeholder="0.00"
            bind:value={paymentAmountInput}
            disabled={saving}
          />
        </div>
      </div>

      <div class="form-group">
        <label for="payment-day">Payment Date</label>
        <select id="payment-day" bind:value={paymentDay} disabled={saving}>
          <option value="">Select day...</option>
          {#each daysInMonth as day}
            <option value={String(day)}>{month}-{String(day).padStart(2, '0')}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="new-balance">
          New Balance
          <span class="hint">(auto-calculated, or override)</span>
        </label>
        <div class="input-with-prefix">
          <span class="prefix">$</span>
          <input
            id="new-balance"
            type="text"
            inputmode="decimal"
            placeholder={(Math.abs(calculatedNewBalance) / 100).toFixed(2)}
            bind:value={newBalanceOverride}
            on:input={handleNewBalanceInput}
            disabled={saving}
          />
        </div>
        {#if !isNewBalanceManual && paymentAmountCents > 0}
          <span class="calculated-hint">
            Will be: {formatDebtCurrency(calculatedNewBalance)}
          </span>
        {/if}
      </div>

      <div class="actions">
        <button class="btn cancel" on:click={handleCancel} disabled={saving}>Cancel</button>
        <button class="btn confirm" on:click={handleConfirm} disabled={saving || !isValid}>
          {saving ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 420px;
    width: 90%;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  h3 {
    margin: 0 0 var(--space-4);
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .balance-summary {
    background: var(--bg-base);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-5);
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
  }

  .summary-row.highlight {
    border-top: 1px solid var(--border-default);
    margin-top: var(--space-2);
    padding-top: var(--space-3);
  }

  .label {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .summary-row.highlight .label {
    color: var(--text-primary);
    font-weight: 600;
  }

  .value {
    font-size: 1rem;
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  }

  .value.debt {
    color: var(--error);
  }

  .value.positive {
    color: var(--success);
  }

  .value.zero {
    color: var(--success);
  }

  .form-group {
    margin-bottom: var(--space-4);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .form-group .hint {
    font-weight: 400;
    color: var(--text-tertiary);
    font-size: 0.8rem;
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
    border-color: var(--purple);
  }

  .input-with-prefix .prefix {
    padding: var(--space-2) var(--space-3);
    color: var(--text-tertiary);
    font-size: 0.95rem;
    background: var(--bg-elevated);
    border-right: 1px solid var(--border-default);
  }

  .input-with-prefix input {
    flex: 1;
    border: none;
    background: transparent;
    padding: var(--space-2) var(--space-3);
    font-size: 1rem;
    color: var(--text-primary);
    outline: none;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  }

  select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.95rem;
    cursor: pointer;
  }

  select:focus {
    border-color: var(--purple);
    outline: none;
  }

  .calculated-hint {
    display: block;
    margin-top: var(--space-1);
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    margin-top: var(--space-5);
  }

  .btn {
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn.cancel {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .btn.cancel:hover:not(:disabled) {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .btn.confirm {
    background: var(--purple);
    border: none;
    color: var(--text-inverse);
  }

  .btn.confirm:hover:not(:disabled) {
    background: var(--purple-hover);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
