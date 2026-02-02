<script lang="ts">
  /**
   * TodoDeleteDialog - Confirmation dialog for deleting todo templates
   * Offers options to delete the template only or also delete instances
   */
  import Modal from '../shared/Modal.svelte';
  import type { DeleteTodoOption } from '../../stores/todos';

  export let open = false;
  export let todoTitle = '';
  export let isRecurring = false;
  export let onConfirm: (option: DeleteTodoOption) => void = () => {};
  export let onCancel: () => void = () => {};

  let selectedOption: DeleteTodoOption = 'template_only';
  let deleting = false;

  // Reset option when dialog opens
  $: if (open) {
    selectedOption = 'future_months';
    deleting = false;
  }

  async function handleConfirm() {
    deleting = true;
    try {
      await onConfirm(selectedOption);
    } finally {
      deleting = false;
    }
  }
</script>

<Modal {open} title="Delete Todo" onClose={onCancel} size="sm">
  <div class="delete-dialog">
    <p class="delete-message">
      Are you sure you want to delete <strong>"{todoTitle}"</strong>?
    </p>

    {#if isRecurring}
      <p class="option-hint">Choose what to delete:</p>

      <div class="options">
        <label class="option" class:selected={selectedOption === 'template_only'}>
          <input
            type="radio"
            name="deleteOption"
            value="template_only"
            bind:group={selectedOption}
            disabled={deleting}
          />
          <div class="option-content">
            <span class="option-title">Template only</span>
            <span class="option-description">
              Keep all existing instances. The todo will no longer generate new instances.
            </span>
          </div>
        </label>

        <label class="option" class:selected={selectedOption === 'current_month'}>
          <input
            type="radio"
            name="deleteOption"
            value="current_month"
            bind:group={selectedOption}
            disabled={deleting}
          />
          <div class="option-content">
            <span class="option-title">Template + current month instances</span>
            <span class="option-description">
              Delete the template and all instances from the current month. Past months are
              preserved.
            </span>
          </div>
        </label>

        <label class="option" class:selected={selectedOption === 'future_months'}>
          <input
            type="radio"
            name="deleteOption"
            value="future_months"
            bind:group={selectedOption}
            disabled={deleting}
          />
          <div class="option-content">
            <span class="option-title">Template + all current/future instances (Recommended)</span>
            <span class="option-description">
              Delete the template and instances from current and all future months. Past months are
              preserved.
            </span>
          </div>
        </label>
      </div>

      <p class="warning-note">
        Note: Instances from past months are never deleted to preserve historical data.
      </p>
    {:else}
      <p class="non-recurring-note">
        This is a one-time todo. Deleting it will also remove its instance from the current month if
        it exists.
      </p>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={deleting}>
      Cancel
    </button>
    <button type="button" class="btn btn-danger" on:click={handleConfirm} disabled={deleting}>
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  </svelte:fragment>
</Modal>

<style>
  .delete-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .delete-message {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--text-primary);
  }

  .delete-message strong {
    color: var(--error);
  }

  .option-hint {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .option {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .option:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
  }

  .option.selected {
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .option input[type='radio'] {
    margin-top: 2px;
    accent-color: var(--accent);
  }

  .option-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .option-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .option-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .warning-note {
    margin: 0;
    font-size: 0.75rem;
    color: var(--warning);
    background: var(--warning-muted);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
  }

  .non-recurring-note {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.5;
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

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .btn-danger {
    background: var(--error);
    color: var(--text-inverse);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--error-hover);
  }
</style>
