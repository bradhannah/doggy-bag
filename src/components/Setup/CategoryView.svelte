<script lang="ts">
  /**
   * CategoryView - Read-only view of a category
   *
   * @prop item - The category to display
   * @prop onEdit - Callback to switch to edit mode
   * @prop onClose - Callback to close the drawer
   */
  import type { Category } from '../../stores/categories';
  import { formatDate } from '$lib/utils/format';

  export let item: Category;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};
</script>

<div class="entity-view">
  <div class="view-field">
    <span class="field-label">Category Name</span>
    <div class="view-value">{item.name}</div>
  </div>

  <div class="view-field">
    <span class="field-label">Type</span>
    <div class="view-value">
      {#if item.is_predefined}
        <span class="badge predefined">Predefined</span>
      {:else}
        <span class="badge custom">Custom</span>
      {/if}
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
    {#if !item.is_predefined}
      <button class="btn btn-primary" on:click={onEdit}> Edit </button>
    {/if}
  </div>

  {#if item.is_predefined}
    <div class="info-message">Predefined categories cannot be edited.</div>
  {/if}
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

  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .badge.predefined {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .badge.custom {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .info-message {
    background: var(--bg-hover);
    color: var(--text-secondary);
    padding: 12px;
    border-radius: 6px;
    font-size: 0.8125rem;
    text-align: center;
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
