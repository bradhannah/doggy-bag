<script lang="ts">
  /**
   * BillView - Read-only view of a bill
   *
   * @prop item - The bill to display
   * @prop onEdit - Callback to switch to edit mode
   * @prop onClose - Callback to close the drawer
   */
  import { paymentSourcesStore } from '../../stores/payment-sources';
  import { savingsGoals } from '../../stores/savings-goals';
  import type { Bill } from '../../stores/bills';
  import { formatDate } from '$lib/utils/format';

  export let item: Bill;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};

  // Find the linked savings goal if this bill has a goal_id
  $: linkedGoal = item.goal_id ? $savingsGoals.find((g) => g.id === item.goal_id) : null;

  function formatAmount(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  function formatPeriod(period: string): string {
    switch (period) {
      case 'monthly':
        return 'Monthly';
      case 'bi_weekly':
        return 'Bi-Weekly';
      case 'weekly':
        return 'Weekly';
      case 'semi_annually':
        return 'Semi-Annually';
      default:
        return period;
    }
  }

  function getPaymentSourceName(id: string): string {
    const ps = $paymentSourcesStore.paymentSources.find((p) => p.id === id);
    return ps?.name || 'Unknown';
  }
</script>

<div class="entity-view">
  <div class="view-field">
    <span class="field-label">Bill Name</span>
    <div class="view-value">{item.name}</div>
  </div>

  <div class="view-field">
    <span class="field-label">Amount</span>
    <div class="view-value amount expense-amount">
      {formatAmount(item.amount)}
    </div>
  </div>

  <div class="view-field">
    <span class="field-label">Billing Period</span>
    <div class="view-value">{formatPeriod(item.billing_period)}</div>
  </div>

  {#if item.start_date && item.billing_period !== 'monthly'}
    <div class="view-field">
      <span class="field-label">First Payment Date</span>
      <div class="view-value">{item.start_date}</div>
    </div>
  {/if}

  <div class="view-field">
    <span class="field-label">Payment Source</span>
    <div class="view-value">{getPaymentSourceName(item.payment_source_id)}</div>
  </div>

  {#if linkedGoal}
    <div class="view-field savings-goal-link">
      <span class="field-label">Linked Savings Goal</span>
      <a href="/goals/edit/{linkedGoal.id}" class="goal-link">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        {linkedGoal.name}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="arrow"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>
      <span class="goal-hint">This bill is auto-managed by the savings goal</span>
    </div>
  {/if}

  <div class="view-field">
    <span class="field-label">Created</span>
    <div class="view-value muted">{formatDate(item.created_at)}</div>
  </div>

  <div class="view-field">
    <span class="field-label">Last Updated</span>
    <div class="view-value muted">{formatDate(item.updated_at)}</div>
  </div>

  <div class="view-actions">
    <button class="btn btn-secondary" on:click={onClose}> Close </button>
    <button class="btn btn-primary" on:click={onEdit}> Edit </button>
  </div>
</div>

<style>
  .entity-view {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .view-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .view-value {
    font-size: 1rem;
    color: var(--text-primary);
  }

  .view-value.amount {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .view-value.expense-amount {
    color: var(--expense-color);
  }

  .view-value.muted {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .view-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border-default);
  }

  .btn {
    flex: 1;
    padding: 12px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
  }

  .savings-goal-link {
    background: var(--accent-muted);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }

  .goal-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
    padding: 6px 0;
  }

  .goal-link:hover {
    color: var(--accent-hover);
    text-decoration: underline;
  }

  .goal-link .arrow {
    opacity: 0.6;
  }

  .goal-link:hover .arrow {
    opacity: 1;
  }

  .goal-hint {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 4px;
  }
</style>
