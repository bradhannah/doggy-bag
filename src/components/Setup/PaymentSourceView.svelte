<script lang="ts">
  /**
   * PaymentSourceView - Read-only view of a payment source
   *
   * @prop item - The payment source to display
   * @prop onEdit - Callback to switch to edit mode
   * @prop onClose - Callback to close the drawer
   */
  import type { PaymentSource } from '../../stores/payment-sources';
  import { getTypeDisplayName, getTypeIcon } from '../../stores/payment-sources';

  export let item: PaymentSource;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<div class="entity-view">
  <div class="view-field">
    <span class="field-label">Name</span>
    <div class="view-value">{item.name}</div>
  </div>

  <div class="view-field">
    <span class="field-label">Type</span>
    <div class="view-value type-with-icon">
      <span class="type-icon">{getTypeIcon(item.type)}</span>
      {getTypeDisplayName(item.type)}
    </div>
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

  .view-value.muted {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .view-value.type-with-icon {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .type-icon {
    font-size: 1.25rem;
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
