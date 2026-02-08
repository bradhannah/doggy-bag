<script lang="ts">
  import type { TodoInstance } from '../../stores/todo-instances';
  import { isOverdue } from '../../stores/todo-instances';
  import { formatDate } from '$lib/utils/format';

  export let instance: TodoInstance;
  export let onComplete: (instance: TodoInstance) => void;
  export let onReopen: (instance: TodoInstance) => void;
  export let onDelete: ((instance: TodoInstance) => void) | undefined = undefined;

  $: isCompleted = instance.status === 'completed';
  $: overdue = isOverdue(instance);
  $: canDelete = instance.is_adhoc && onDelete;

  function handleCheckboxClick() {
    if (isCompleted) {
      onReopen(instance);
    } else {
      onComplete(instance);
    }
  }

  function handleDelete() {
    if (onDelete) {
      onDelete(instance);
    }
  }

  function formatCompletedAt(isoStr: string): string {
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<div class="todo-item" class:completed={isCompleted} class:overdue={overdue && !isCompleted}>
  <!-- Checkbox -->
  <button
    class="checkbox"
    class:checked={isCompleted}
    on:click={handleCheckboxClick}
    aria-label={isCompleted ? 'Reopen todo' : 'Complete todo'}
  >
    {#if isCompleted}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <polyline
          points="20 6 9 17 4 12"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </button>

  <!-- Content -->
  <div class="content">
    <span class="title" class:struck={isCompleted}>{instance.title}</span>
    {#if instance.notes}
      <span class="notes">{instance.notes}</span>
    {/if}
  </div>

  <!-- Date -->
  <div class="date-info">
    {#if isCompleted && instance.completed_at}
      <span class="completed-date">Completed {formatCompletedAt(instance.completed_at)}</span>
    {:else}
      <span class="due-date" class:overdue>
        {#if overdue}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="warning-icon">
            <path
              d="M12 9v4M12 17h.01M4.93 19h14.14c1.58 0 2.57-1.71 1.78-3.08L13.78 4.09c-.79-1.36-2.77-1.36-3.56 0L3.15 15.92C2.36 17.29 3.35 19 4.93 19z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}
        {formatDate(instance.due_date)}
      </span>
    {/if}
  </div>

  <!-- Delete button for ad-hoc todos -->
  {#if canDelete}
    <button
      class="delete-btn"
      on:click={handleDelete}
      aria-label="Delete todo"
      title="Delete this todo"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  {/if}
</div>

<style>
  .todo-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    min-height: 52px;
    max-height: 52px;
    overflow: hidden;
    box-sizing: border-box;
    transition:
      background 0.2s,
      border-color 0.2s;
  }

  .todo-item:hover {
    background: var(--bg-hover);
  }

  .todo-item.overdue {
    border-color: var(--error-border);
    background: var(--error-muted);
  }

  .todo-item.overdue:hover {
    background: var(--error-bg);
  }

  .todo-item.completed {
    background: var(--bg-surface);
    opacity: 0.7;
  }

  /* Checkbox */
  .checkbox {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border: 2px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      border-color 0.2s,
      background 0.2s;
    padding: 0;
  }

  .checkbox:hover {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .checkbox.checked {
    border-color: var(--success);
    background: var(--success);
    color: var(--text-inverse);
  }

  .checkbox.checked:hover {
    background: var(--success-hover);
    border-color: var(--success-hover);
  }

  .overdue .checkbox {
    border-color: var(--error);
  }

  /* Content */
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    overflow: hidden;
  }

  .title {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title.struck {
    text-decoration: line-through;
    color: var(--text-tertiary);
  }

  .notes {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .completed .notes {
    color: var(--text-disabled);
  }

  /* Date info */
  .date-info {
    flex-shrink: 0;
    text-align: right;
  }

  .due-date {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .due-date.overdue {
    color: var(--error);
    font-weight: 500;
  }

  .warning-icon {
    flex-shrink: 0;
  }

  .completed-date {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* Delete button */
  .delete-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.2s,
      color 0.2s;
    opacity: 0;
    margin-left: var(--space-2);
  }

  .todo-item:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background: var(--error-bg);
    color: var(--error);
  }

  .delete-btn:active {
    background: var(--error-muted);
  }

  @media (max-width: 480px) {
    .todo-item {
      padding: var(--space-3);
      min-height: 48px;
      max-height: 48px;
      overflow: hidden;
    }

    .title {
      font-size: 0.875rem;
    }

    .notes {
      font-size: 0.6875rem;
    }
  }
</style>
