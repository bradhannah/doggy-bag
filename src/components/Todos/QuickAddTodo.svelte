<script lang="ts">
  import type { TodoInstanceData } from '../../stores/todo-instances';

  export let month: string;
  export let onSave: (data: TodoInstanceData) => void;
  export let onCancel: () => void;

  let title = '';
  let notes = '';
  let dueDate = '';

  // Default due date to today or first day of month if in future
  $: {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const monthStart = `${month}-01`;
    const monthParts = month.split('-');
    const monthDate = new Date(parseInt(monthParts[0]), parseInt(monthParts[1]) - 1, 1);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

    // Set default due date
    if (!dueDate) {
      if (todayStr >= monthStart && todayStr <= monthEnd) {
        dueDate = todayStr;
      } else if (todayStr < monthStart) {
        dueDate = monthStart;
      } else {
        dueDate = monthEnd;
      }
    }
  }

  $: isValid = title.trim().length > 0 && dueDate.length > 0;

  function handleSubmit() {
    console.log('[QuickAddTodo] handleSubmit called', { title, dueDate, isValid });
    if (!isValid) {
      console.warn('[QuickAddTodo] Validation failed:', {
        title: title.trim(),
        titleLength: title.trim().length,
        dueDate,
        dueDateLength: dueDate.length,
      });
      return;
    }

    const data: TodoInstanceData = {
      title: title.trim(),
      due_date: dueDate,
    };

    if (notes.trim()) {
      data.notes = notes.trim();
    }

    onSave(data);

    // Reset form
    title = '';
    notes = '';
    dueDate = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape') {
      onCancel();
    }
  }
</script>

<div class="quick-add-form">
  <div class="form-row">
    <input
      type="text"
      class="title-input"
      placeholder="What needs to be done?"
      bind:value={title}
      on:keydown={handleKeydown}
      autofocus
    />
    <input type="date" class="date-input" bind:value={dueDate} on:keydown={handleKeydown} />
  </div>

  <div class="form-row notes-row">
    <textarea
      class="notes-input"
      placeholder="Notes (optional)"
      bind:value={notes}
      on:keydown={handleKeydown}
      rows="2"
    ></textarea>
  </div>

  <div class="form-actions">
    <button type="button" class="cancel-btn" on:click={onCancel}> Cancel </button>
    <button type="button" class="save-btn" disabled={!isValid} on:click={handleSubmit}>
      Add Todo
    </button>
  </div>
</div>

<style>
  .quick-add-form {
    background: var(--bg-surface);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .form-row {
    display: flex;
    gap: var(--space-3);
  }

  .title-input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.9375rem;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .title-input::placeholder {
    color: var(--text-tertiary);
  }

  .title-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .date-input {
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.875rem;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .date-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  /* Fix date input styling for dark themes */
  .date-input::-webkit-calendar-picker-indicator {
    filter: invert(0.6);
    cursor: pointer;
  }

  .notes-row {
    display: block;
  }

  .notes-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .notes-input::placeholder {
    color: var(--text-tertiary);
  }

  .notes-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .cancel-btn {
    padding: var(--space-2) var(--space-4);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      background 0.2s,
      border-color 0.2s;
  }

  .cancel-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
  }

  .save-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-inverse);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .save-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    .form-row {
      flex-direction: column;
    }

    .date-input {
      width: 100%;
    }
  }
</style>
