<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import { formatCurrency, parseDollarsToCents, getTodayDateString } from '$lib/utils/format';
  import Modal from '../shared/Modal.svelte';
  import AmountInput from '../shared/AmountInput.svelte';

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

  // Today when paying in the current month, otherwise the 1st of the viewed month
  function defaultPaymentDay(): string {
    const today = getTodayDateString();
    return today.startsWith(month) ? String(Number(today.slice(8))) : '1';
  }

  // Reset state each time the modal opens
  $: if (open) {
    paymentAmountInput = '';
    newBalanceOverride = '';
    isNewBalanceManual = false;
    paymentDay = defaultPaymentDay();
  }

  function formatDayOption(day: number): string {
    const [year, monthNum] = month.split('-').map(Number);
    return new Date(year, monthNum - 1, day).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  // Parse payment amount from input
  $: paymentAmountCents = parseDollarsToCents(paymentAmountInput);

  // Calculate new balance after payment (auto-calculated unless overridden)
  $: calculatedNewBalance = currentBalance - paymentAmountCents;

  // Validate form
  $: isValid = paymentAmountCents > 0 && paymentDay !== '';

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

      // Only include newBalance if user manually overrode it (and left a value)
      if (isNewBalanceManual && newBalanceOverride.trim() !== '') {
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
    if (saving) return;
    dispatch('cancel');
    open = false;
  }

  function handleNewBalanceInput() {
    isNewBalanceManual = true;
  }
</script>

<Modal {open} title="Record payment to {cardName}" onClose={handleCancel}>
  <div class="balance-summary">
    <div class="summary-row">
      <span class="label">Current balance</span>
      <span class="value debt">{formatDebtCurrency(currentBalance)}</span>
    </div>
    <div class="summary-row">
      <span class="label">Paid so far</span>
      <span class="value positive">{formatCurrency(paidSoFar)}</span>
    </div>
    <div class="summary-row highlight">
      <span class="label">Remaining</span>
      <span class="value" class:zero={remaining === 0}>{formatCurrency(remaining)}</span>
    </div>
  </div>

  <div class="form-group">
    <label for="payment-amount">Payment amount</label>
    <AmountInput id="payment-amount" bind:value={paymentAmountInput} disabled={saving} />
  </div>

  <div class="form-group">
    <label for="payment-day">Payment date</label>
    <select id="payment-day" bind:value={paymentDay} disabled={saving}>
      <option value="">Select day...</option>
      {#each daysInMonth as day (day)}
        <option value={String(day)}>{formatDayOption(day)}</option>
      {/each}
    </select>
  </div>

  <div class="form-group">
    <label for="new-balance">
      New balance
      <span class="hint">(auto-calculated, or override)</span>
    </label>
    <AmountInput
      id="new-balance"
      placeholder={(Math.abs(calculatedNewBalance) / 100).toFixed(2)}
      bind:value={newBalanceOverride}
      on:input={handleNewBalanceInput}
      disabled={saving}
    />
    {#if !isNewBalanceManual && paymentAmountCents > 0}
      <span class="calculated-hint">
        Will be: {formatDebtCurrency(calculatedNewBalance)}
      </span>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <button class="btn btn-secondary" on:click={handleCancel} disabled={saving}>Cancel</button>
    <button class="btn btn-primary" on:click={handleConfirm} disabled={saving || !isValid}>
      {saving ? 'Recording...' : 'Record payment'}
    </button>
  </svelte:fragment>
</Modal>

<style>
  .balance-summary {
    background: var(--bg-base);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-5);
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-1) 0;
  }

  .summary-row.highlight {
    border-top: 1px solid var(--border-default);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
  }

  .label {
    color: var(--text-secondary);
    font-size: var(--font-size-md);
  }

  .summary-row.highlight .label {
    color: var(--text-primary);
    font-weight: 600;
  }

  .value {
    font-size: var(--font-size-lg);
    font-weight: 600;
  }

  .value.debt {
    color: var(--error);
  }

  .value.positive,
  .value.zero {
    color: var(--success);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .form-group label {
    font-size: var(--font-size-md);
    color: var(--text-primary);
    font-weight: 500;
  }

  .form-group .hint {
    font-weight: 400;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  select {
    width: 100%;
    padding: 0 var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    cursor: pointer;
  }

  select:focus {
    border-color: var(--accent);
    outline: none;
  }

  .calculated-hint {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
</style>
