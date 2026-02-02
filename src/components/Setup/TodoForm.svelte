<script lang="ts">
  /**
   * TodoForm - Modal-based form for todo templates
   *
   * @prop open - Whether the modal is visible
   * @prop editingItem - Todo being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onClose - Callback to close form
   */
  import Modal from '../shared/Modal.svelte';
  import { createTodo, updateTodo } from '../../stores/todos';
  import { success, error as showError } from '../../stores/toast';
  import type { Todo, TodoData, TodoUpdate, TodoRecurrence } from '../../stores/todos';

  export let open = false;
  export let editingItem: Todo | null = null;
  export let onSave: () => void = () => {};
  export let onClose: () => void = () => {};

  // Form state
  let title = '';
  let notes = '';
  let due_date = '';
  let recurrence: TodoRecurrence = 'none';
  let start_date = '';
  let day_of_month = 1;
  let is_active = true;

  let error = '';
  let saving = false;

  // Reset form when editingItem changes or modal opens
  $: if (open) {
    if (editingItem) {
      title = editingItem.title;
      notes = editingItem.notes || '';
      due_date = editingItem.due_date || '';
      recurrence = editingItem.recurrence;
      start_date = editingItem.start_date || '';
      day_of_month = editingItem.day_of_month || 1;
      is_active = editingItem.is_active;
    } else {
      // Reset to defaults for new todo
      title = '';
      notes = '';
      due_date = '';
      recurrence = 'none';
      start_date = '';
      day_of_month = 1;
      is_active = true;
    }
    error = '';
    saving = false;
  }

  // Show start_date field for recurring todos (except monthly which uses day_of_month)
  $: showStartDate = recurrence === 'weekly' || recurrence === 'bi_weekly';
  $: showDayOfMonth = recurrence === 'monthly';
  // Only show due_date for one-time (non-recurring) todos
  $: showDueDate = recurrence === 'none';

  async function handleSubmit() {
    // Validation
    if (!title.trim()) {
      error = 'Title is required';
      return;
    }

    // For one-time todos, due_date is required
    // For recurring todos, start_date (weekly/bi_weekly) or day_of_month (monthly) is used instead
    if (showDueDate && !due_date) {
      error = 'Due date is required for one-time todos';
      return;
    }

    if (showStartDate && !start_date) {
      error = 'Start date is required for weekly/bi-weekly recurring todos';
      return;
    }

    saving = true;
    error = '';

    try {
      if (editingItem) {
        // Update existing todo
        const updates: TodoUpdate = {
          title: title.trim(),
          notes: notes.trim() || null,
          recurrence,
          is_active,
        };

        // Only include due_date for one-time todos
        if (showDueDate) {
          updates.due_date = due_date;
        }

        if (showStartDate) {
          updates.start_date = start_date;
        } else {
          updates.start_date = null;
        }

        if (showDayOfMonth) {
          updates.day_of_month = day_of_month;
        } else {
          updates.day_of_month = null;
        }

        await updateTodo(editingItem.id, updates);
        success(`Todo "${title}" updated`);
      } else {
        // Create new todo
        const todoData: TodoData = {
          title: title.trim(),
          recurrence,
        };

        // Only include due_date for one-time todos
        if (showDueDate && due_date) {
          todoData.due_date = due_date;
        }

        if (notes.trim()) {
          todoData.notes = notes.trim();
        }

        if (showStartDate && start_date) {
          todoData.start_date = start_date;
        }

        if (showDayOfMonth) {
          todoData.day_of_month = day_of_month;
        }

        await createTodo(todoData);
        success(`Todo "${title}" added`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save todo';
      showError(error);
    } finally {
      saving = false;
    }
  }
</script>

<Modal {open} title={editingItem ? 'Edit Todo' : 'Add Todo'} {onClose} size="md">
  <form class="todo-form" on:submit|preventDefault={handleSubmit}>
    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <div class="form-group">
      <label for="todo-title">Title</label>
      <input
        id="todo-title"
        type="text"
        bind:value={title}
        placeholder="e.g., Review monthly expenses"
        required
        disabled={saving}
      />
    </div>

    <div class="form-group">
      <label for="todo-notes">Notes (optional)</label>
      <textarea
        id="todo-notes"
        bind:value={notes}
        placeholder="Any additional details..."
        rows="3"
        disabled={saving}
      ></textarea>
    </div>

    <div class="form-group">
      <label for="todo-recurrence">Recurrence</label>
      <select id="todo-recurrence" bind:value={recurrence} disabled={saving}>
        <option value="none">One-time (no recurrence)</option>
        <option value="weekly">Weekly</option>
        <option value="bi_weekly">Bi-weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>

    {#if showDueDate}
      <div class="form-group">
        <label for="todo-due-date">Due Date</label>
        <input id="todo-due-date" type="date" bind:value={due_date} required disabled={saving} />
      </div>
    {/if}

    {#if showStartDate}
      <div class="form-group">
        <label for="todo-start-date">Start Date</label>
        <input
          id="todo-start-date"
          type="date"
          bind:value={start_date}
          required
          disabled={saving}
        />
        <div class="help-text">
          {#if recurrence === 'weekly'}
            Todo will recur every week from this date
          {:else if recurrence === 'bi_weekly'}
            Todo will recur every 2 weeks from this date
          {/if}
        </div>
      </div>
    {/if}

    {#if showDayOfMonth}
      <div class="form-group">
        <label for="todo-day-of-month">Day of Month</label>
        <select id="todo-day-of-month" bind:value={day_of_month} disabled={saving}>
          {#each Array.from({ length: 31 }, (_, i) => i + 1) as day (day)}
            <option value={day}>{day}{day === 31 ? ' (or last day)' : ''}</option>
          {/each}
        </select>
        <div class="help-text">Todo will recur on this day every month</div>
      </div>
    {/if}

    {#if editingItem}
      <div class="form-group">
        <label class="toggle-label">
          <input type="checkbox" bind:checked={is_active} disabled={saving} />
          <span>Active</span>
        </label>
        <div class="help-text">
          {is_active
            ? 'Todo instances will be generated for future months'
            : 'No new instances will be generated (existing instances remain)'}
        </div>
      </div>
    {/if}
  </form>

  <svelte:fragment slot="footer">
    <button type="button" class="btn btn-secondary" on:click={onClose} disabled={saving}>
      Cancel
    </button>
    <button type="button" class="btn btn-primary" on:click={handleSubmit} disabled={saving}>
      {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Todo'}
    </button>
  </svelte:fragment>
</Modal>

<style>
  .todo-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .error-message {
    background: var(--error);
    color: var(--text-on-error, #fff);
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  input[type='text'],
  input[type='date'],
  select {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    background: var(--input-bg, var(--bg-base));
    color: var(--text-primary);
    font-size: 0.9375rem;
    height: 46px;
    box-sizing: border-box;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  textarea {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    background: var(--input-bg, var(--bg-base));
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    box-sizing: border-box;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--accent);
    margin-top: var(--space-1);
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-weight: normal;
  }

  .toggle-label input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }

  .btn {
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }
</style>
