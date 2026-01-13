<script lang="ts">
  /**
   * InsurancePlanView - Read-only view of an insurance plan
   *
   * @prop item - The insurance plan to display
   * @prop onEdit - Callback to switch to edit mode
   * @prop onClose - Callback to close the drawer
   */
  import type { InsurancePlan } from '../../types/insurance';

  export let item: InsurancePlan;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  function getPriorityLabel(priority: number): string {
    if (priority === 1) return 'Primary (#1)';
    if (priority === 2) return 'Secondary (#2)';
    if (priority === 3) return 'Tertiary (#3)';
    return `#${priority}`;
  }
</script>

<div class="entity-view">
  <div class="view-field">
    <span class="field-label">Plan Name</span>
    <div class="view-value">{item.name}</div>
  </div>

  {#if item.provider_name}
    <div class="view-field">
      <span class="field-label">Provider</span>
      <div class="view-value">{item.provider_name}</div>
    </div>
  {/if}

  <div class="view-row">
    {#if item.policy_number}
      <div class="view-field">
        <span class="field-label">Policy Number</span>
        <div class="view-value">{item.policy_number}</div>
      </div>
    {/if}

    {#if item.member_id}
      <div class="view-field">
        <span class="field-label">Member ID</span>
        <div class="view-value">{item.member_id}</div>
      </div>
    {/if}
  </div>

  <div class="view-row">
    {#if item.owner}
      <div class="view-field">
        <span class="field-label">Owner</span>
        <div class="view-value">{item.owner}</div>
      </div>
    {/if}

    <div class="view-field">
      <span class="field-label">Priority</span>
      <div class="view-value priority-badge" class:primary={item.priority === 1}>
        {getPriorityLabel(item.priority)}
      </div>
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

  {#if item.portal_url}
    <div class="view-field">
      <span class="field-label">Portal URL</span>
      <div class="view-value">
        <a href={item.portal_url} target="_blank" rel="noopener noreferrer" class="link">
          {item.portal_url}
        </a>
      </div>
    </div>
  {/if}

  {#if item.notes}
    <div class="view-field">
      <span class="field-label">Notes</span>
      <div class="view-value notes">{item.notes}</div>
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

  .view-value.notes {
    white-space: pre-wrap;
    background: var(--bg-elevated);
    padding: 12px;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .priority-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .priority-badge.primary {
    background: var(--accent-muted);
    color: var(--accent);
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

  .link {
    color: var(--accent);
    text-decoration: none;
    word-break: break-all;
  }

  .link:hover {
    text-decoration: underline;
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
