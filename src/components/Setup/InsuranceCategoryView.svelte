<script lang="ts">
  /**
   * InsuranceCategoryView - Read-only view of an insurance category
   *
   * @prop item - The insurance category to display
   * @prop onEdit - Callback to switch to edit mode
   * @prop onClose - Callback to close the drawer
   */
  import type { InsuranceCategory } from '../../types/insurance';

  export let item: InsuranceCategory;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<div class="entity-view">
  <div class="view-field">
    <span class="field-label">Icon</span>
    <div class="view-value icon-display">{item.icon}</div>
  </div>

  <div class="view-field">
    <span class="field-label">Category Name</span>
    <div class="view-value">{item.name}</div>
  </div>

  <div class="view-row">
    <div class="view-field">
      <span class="field-label">Type</span>
      <div class="view-value">
        <span class="type-badge" class:predefined={item.is_predefined}>
          {item.is_predefined ? 'Predefined' : 'Custom'}
        </span>
      </div>
    </div>

    <div class="view-field">
      <span class="field-label">Status</span>
      <div class="view-value">
        <span class="status-badge" class:active={item.is_active} class:inactive={!item.is_active}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  </div>

  <div class="view-field">
    <span class="field-label">Sort Order</span>
    <div class="view-value muted">{item.sort_order}</div>
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

  .view-row {
    display: flex;
    gap: 24px;
  }

  .view-row .view-field {
    flex: 1;
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

  .view-value.icon-display {
    font-size: 2rem;
  }

  .type-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .type-badge.predefined {
    background: var(--purple-muted, rgba(147, 51, 234, 0.1));
    color: var(--purple, #9333ea);
  }

  .status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-badge.active {
    background: var(--success-muted);
    color: var(--success);
  }

  .status-badge.inactive {
    background: var(--bg-hover);
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
