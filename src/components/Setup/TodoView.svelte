<script lang="ts">
  /**
   * TodoView - Modal-based view for todo template details
   *
   * @prop open - Whether the modal is visible
   * @prop item - Todo to display
   * @prop onEdit - Callback to switch to edit mode
   * @prop onClose - Callback to close modal
   */
  import Modal from '../shared/Modal.svelte';
  import { getRecurrenceLabel, type Todo } from '../../stores/todos';
  import { formatDate } from '$lib/utils/format';

  export let open = false;
  export let item: Todo | null = null;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};

  function formatTimestamp(isoStr: string): string {
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
</script>

<Modal {open} title={item?.title || 'Todo'} {onClose} size="md">
  {#if item}
    <div class="todo-view">
      <!-- Status Badges -->
      <div class="badges">
        <span class="status-badge" class:active={item.is_active} class:inactive={!item.is_active}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
        <span
          class="recurrence-badge"
          class:recurring={item.recurrence !== 'none'}
          class:one-time={item.recurrence === 'none'}
        >
          {getRecurrenceLabel(item.recurrence)}
        </span>
      </div>

      <!-- Due Date (only for one-time todos) -->
      {#if item.recurrence === 'none' && item.due_date}
        <div class="detail-row">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">{formatDate(item.due_date)}</span>
        </div>
      {/if}

      <!-- Recurrence Details -->
      {#if item.recurrence !== 'none'}
        {#if item.recurrence === 'monthly' && item.day_of_month}
          <div class="detail-row">
            <span class="detail-label">Day of Month</span>
            <span class="detail-value">
              {item.day_of_month}{item.day_of_month === 31 ? ' (or last day)' : ''}
            </span>
          </div>
        {/if}
        {#if (item.recurrence === 'weekly' || item.recurrence === 'bi_weekly') && item.start_date}
          <div class="detail-row">
            <span class="detail-label">Start Date</span>
            <span class="detail-value">{formatDate(item.start_date)}</span>
          </div>
        {/if}
      {/if}

      <!-- Notes -->
      {#if item.notes}
        <div class="detail-section">
          <span class="detail-label">Notes</span>
          <p class="notes-content">{item.notes}</p>
        </div>
      {/if}

      <!-- Timestamps -->
      <div class="timestamps">
        <div class="timestamp">
          <span class="timestamp-label">Created</span>
          <span class="timestamp-value">{formatTimestamp(item.created_at)}</span>
        </div>
        <div class="timestamp">
          <span class="timestamp-label">Updated</span>
          <span class="timestamp-value">{formatTimestamp(item.updated_at)}</span>
        </div>
        {#if item.status === 'completed' && item.completed_at}
          <div class="timestamp">
            <span class="timestamp-label">Completed</span>
            <span class="timestamp-value">{formatTimestamp(item.completed_at)}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <button type="button" class="btn btn-secondary" on:click={onClose}> Close </button>
    <button type="button" class="btn btn-primary" on:click={onEdit}> Edit </button>
  </svelte:fragment>
</Modal>

<style>
  .todo-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .badges {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .status-badge,
  .recurrence-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
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

  .recurrence-badge.recurring {
    background: var(--purple-muted);
    color: var(--purple);
  }

  .recurrence-badge.one-time {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .detail-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .detail-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .notes-content {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-primary);
    line-height: 1.5;
    white-space: pre-wrap;
    background: var(--bg-base);
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }

  .timestamps {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-2);
  }

  .timestamp {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }

  .timestamp-label {
    color: var(--text-tertiary);
  }

  .timestamp-value {
    color: var(--text-secondary);
  }

  .btn {
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
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
