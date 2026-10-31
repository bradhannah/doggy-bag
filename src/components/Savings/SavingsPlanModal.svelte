<script lang="ts">
  import Modal from '../shared/Modal.svelte';
  import { apiClient } from '$lib/api/client';
  import { formatCurrency, getTodayDateString } from '$lib/utils/format';
  import { formatMonthDisplay } from '../../stores/ui';
  import type {
    SavingsMonthSummary,
    SavingsPlanRequest,
    SavingsPlanResult,
  } from '$lib/types/budget-workflow';

  export let summary: SavingsMonthSummary;
  export let initialAccount = '';
  export let onClose: () => void;
  export let onSaved: (result: SavingsPlanResult) => void;

  let accountId = initialAccount || summary.accounts.find((account) => account.is_active)?.id || '';
  let spendingId = summary.spending_accounts.length === 1 ? summary.spending_accounts[0].id : '';
  let direction: SavingsPlanRequest['direction'] = 'contribution';
  let frequency = 'monthly';
  let amount: number | undefined = undefined;
  let date = getTodayDateString().startsWith(summary.month)
    ? getTodayDateString()
    : `${summary.month}-01`;
  let name = '';
  let saving = false;
  let error = '';
  $: account = summary.accounts.find((account) => account.id === accountId);
  $: cents = amount === undefined ? 0 : Math.round(amount * 100);

  async function submit() {
    if (saving) return;
    error = '';
    if (!Number.isSafeInteger(cents) || cents <= 0) {
      error = 'Enter an amount greater than zero.';
      return;
    }
    saving = true;
    try {
      const result = (await apiClient.post('/api/savings-plans', {
        month: summary.month,
        savings_account_id: accountId,
        spending_account_id: spendingId,
        direction,
        recurring: frequency === 'monthly',
        amount: cents,
        date,
        name,
      } satisfies SavingsPlanRequest)) as SavingsPlanResult;
      onSaved(result);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not save the savings plan';
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  open={true}
  title="Plan a savings transfer"
  subtitle={formatMonthDisplay(summary.month)}
  size="md"
  onClose={() => !saving && onClose()}
>
  <form id="savings-plan-form" on:submit|preventDefault={submit}>
    <label
      >Savings or investment account
      <select bind:value={accountId} required disabled={saving}>
        {#each summary.accounts.filter((account) => account.is_active) as option (option.id)}<option
            value={option.id}>{option.name}</option
          >{/each}
      </select>
    </label>
    <label
      >Transfer
      <select bind:value={direction} disabled={saving}>
        <option value="contribution">Contribution into savings</option>
        <option value="withdrawal">Withdrawal into the budget</option>
      </select>
    </label>
    <label
      >{direction === 'contribution' ? 'From spending account' : 'To spending account'}
      <select bind:value={spendingId} required disabled={saving}>
        <option value="">Choose an account</option>
        {#each summary.spending_accounts as option (option.id)}<option value={option.id}
            >{option.name}</option
          >{/each}
      </select>
    </label>
    {#if summary.spending_accounts.length === 0}
      <p>
        Add a bank or cash account included in Budget in <a href="/setup?tab=payment-sources"
          >Manage</a
        > first.
      </p>
    {/if}
    <div class="row">
      <label
        >Amount ($)<input
          type="number"
          min="0.01"
          step="0.01"
          bind:value={amount}
          required
          disabled={saving}
        /></label
      >
      <label
        >Frequency
        <select bind:value={frequency} disabled={saving}>
          <option value="monthly">Every month</option>
          <option value="once" disabled={!summary.exists || summary.is_read_only}
            >This month only</option
          >
        </select>
      </label>
    </div>
    <label
      >{frequency === 'monthly' ? 'First transfer date' : 'Planned date'}
      <input
        type="date"
        bind:value={date}
        required
        disabled={saving}
        min={frequency === 'once' ? `${summary.month}-01` : undefined}
        max={frequency === 'once'
          ? `${summary.month}-${new Date(Number(summary.month.slice(0, 4)), Number(summary.month.slice(5)), 0).getDate()}`
          : undefined}
      />
    </label>
    <label
      >Name (optional)<input
        type="text"
        bind:value={name}
        maxlength="100"
        placeholder={`${direction === 'contribution' ? 'Savings' : 'Withdrawal'}: ${account?.name ?? ''}`}
        disabled={saving}
      /></label
    >
    {#if account && summary.exists}
      <p class="hint">
        Already planned in this budget: {formatCurrency(account.planned)}, including goal
        contributions. This form adds a plan; use Budget to change an existing entry.
      </p>
    {/if}
    <p class="hint">
      {frequency === 'monthly'
        ? 'Added to this month’s budget now (if it exists and is unlocked) and to every new budget from its start date.'
        : 'This creates a planned budget entry. Record the transfer in Budget when it happens.'}
    </p>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </form>
  <svelte:fragment slot="footer">
    <button class="secondary" on:click={onClose} disabled={saving}>Cancel</button>
    <button
      class="primary"
      type="submit"
      form="savings-plan-form"
      disabled={saving || !accountId || !spendingId}
    >
      {saving ? 'Saving…' : frequency === 'monthly' ? 'Save recurring plan' : 'Add to this budget'}
    </button>
  </svelte:fragment>
</Modal>

<style>
  form {
    display: grid;
    gap: var(--space-4);
  }
  label {
    display: grid;
    gap: var(--space-2);
    color: var(--text-secondary);
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    border: thin solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-base);
    color: var(--text-primary);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }
  .hint {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  .error {
    color: var(--error);
  }
  a {
    color: var(--accent);
  }
  button {
    min-height: var(--button-height);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .primary {
    background: var(--accent);
    color: var(--text-inverse);
    border: none;
  }
  .secondary {
    background: var(--bg-surface);
    color: var(--text-primary);
    border: thin solid var(--border-default);
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
