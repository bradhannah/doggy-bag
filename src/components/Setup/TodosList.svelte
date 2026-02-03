<script lang="ts">
  import type { Todo } from '../../stores/todos';
  import { getRecurrenceLabel } from '../../stores/todos';
  import NotesModal from '../shared/NotesModal.svelte';

  export let todos: Todo[];
  export let onView: (todo: Todo) => void;
  export let onEdit: (todo: Todo) => void;
  export let onDelete: (todo: Todo) => void;

  // Notes modal state
  let showNotesModal = false;
  let notesModalTitle = '';
  let notesModalContent = '';

  function openNotesModal(todo: Todo) {
    notesModalTitle = `${todo.title} Notes`;
    notesModalContent = todo.notes || '';
    showNotesModal = true;
  }

  function closeNotesModal() {
    showNotesModal = false;
  }

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Get display date based on recurrence type
  function getDisplayDate(todo: Todo): string {
    if (todo.recurrence === 'none') {
      return formatDate(todo.due_date);
    } else if (todo.recurrence === 'monthly' && todo.day_of_month) {
      return `Day ${todo.day_of_month}`;
    } else if (todo.start_date) {
      return formatDate(todo.start_date);
    }
    return '-';
  }

  // Sort todos: active first, then by due date or start_date
  $: sortedTodos = [...todos].sort((a, b) => {
    // Active first
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    // Then by effective date (due_date for one-time, start_date or day_of_month for recurring)
    const dateA = a.due_date || a.start_date || '';
    const dateB = b.due_date || b.start_date || '';
    return dateA.localeCompare(dateB);
  });
</script>

<div class="todos-list">
  <div class="list-container">
    <!-- Column Header -->
    <div class="column-header">
      <span class="col-title">Title</span>
      <span class="col-due">Due Date</span>
      <span class="col-recurrence">Recurrence</span>
      <span class="col-status">Status</span>
      <span class="col-actions">Actions</span>
    </div>

    <!-- Todo Rows -->
    {#if sortedTodos.length === 0}
      <div class="empty-state">No todo templates yet. Add your first todo to get started.</div>
    {:else}
      {#each sortedTodos as todo (todo.id)}
        <div class="todo-row" class:inactive={!todo.is_active} on:click={() => onView(todo)}>
          <div class="col-title">
            <span class="title-line">
              <span class="title-text">{todo.title}</span>
            </span>
            {#if todo.notes}
              <span class="notes-preview">{todo.notes}</span>
            {/if}
          </div>
          <span class="col-due">
            {getDisplayDate(todo)}
          </span>
          <span class="col-recurrence">
            <span
              class="recurrence-badge"
              class:recurring={todo.recurrence !== 'none'}
              class:one-time={todo.recurrence === 'none'}
            >
              {getRecurrenceLabel(todo.recurrence)}
            </span>
          </span>
          <span class="col-status">
            <span
              class="status-badge"
              class:active={todo.is_active}
              class:inactive={!todo.is_active}
            >
              {todo.is_active ? 'Active' : 'Inactive'}
            </span>
          </span>
          <span class="col-actions" on:click|stopPropagation>
            {#if todo.notes}
              <button
                class="btn-icon btn-notes"
                on:click={() => openNotesModal(todo)}
                title="View Notes"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </button>
            {/if}
            <button class="btn-icon" on:click={() => onEdit(todo)} title="Edit">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="btn-icon btn-danger" on:click={() => onDelete(todo)} title="Delete">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </button>
          </span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<NotesModal
  title={notesModalTitle}
  notes={notesModalContent}
  open={showNotesModal}
  on:close={closeNotesModal}
/>

<style>
  .todos-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Container with border and rounded edges */
  .list-container {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 2px solid var(--border-default);
    overflow: hidden;
  }

  /* Column Header */
  .column-header {
    display: grid;
    grid-template-columns: 1fr 100px 100px 80px 100px;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-elevated);
    border-bottom: 2px solid var(--border-default);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
  }

  /* Todo Row */
  .todo-row {
    display: grid;
    grid-template-columns: 1fr 100px 100px 80px 100px;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .todo-row:last-child {
    border-bottom: none;
  }

  .todo-row:hover {
    background: var(--accent-muted);
  }

  .todo-row.inactive {
    opacity: 0.6;
  }

  .todo-row .col-title {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    overflow: hidden;
  }

  .title-line {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 500;
    color: var(--text-primary);
  }

  .title-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .notes-preview {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
  }

  /* Recurrence Badge */
  .recurrence-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .recurrence-badge.recurring {
    background: var(--purple-muted);
    color: var(--purple);
  }

  .recurrence-badge.one-time {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
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

  .col-due {
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .todo-row .col-actions {
    display: flex;
    gap: var(--space-1);
    justify-content: flex-end;
  }

  /* Icon Buttons */
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-icon:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn-icon.btn-danger:hover {
    background: var(--error);
    color: var(--text-inverse);
  }

  .btn-icon.btn-notes {
    color: var(--accent);
  }

  .btn-icon.btn-notes:hover {
    background: var(--accent-muted);
    color: var(--accent);
  }

  /* Empty State */
  .empty-state {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-tertiary);
    font-size: 0.875rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .column-header,
    .todo-row {
      grid-template-columns: 1fr 80px;
    }

    .col-due,
    .col-recurrence,
    .col-status {
      display: none;
    }

    .column-header .col-due,
    .column-header .col-recurrence,
    .column-header .col-status {
      display: none;
    }
  }
</style>
