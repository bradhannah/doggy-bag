<script lang="ts">
  /**
   * BillView - Read-only view of a bill
   *
   * @prop item - The bill to display
   * @prop onEdit - Callback to switch to edit mode
   * @prop onClose - Callback to close the drawer
   */
  import { paymentSourcesStore } from '../../stores/payment-sources';
  import type { Bill } from '../../stores/bills';

  export let item: Bill;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};

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

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
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
    <div class="view-value amount" style="color: #ff6b6b;">
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
</style>
