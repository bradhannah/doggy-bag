<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { modalFocus, dialogTitleId } from '$lib/actions/modal-focus';
  const titleId = dialogTitleId();

  export let open: boolean = false;
  export let title: string = 'Unsaved Changes';
  export let message: string = 'You have unsaved changes. What would you like to do?';

  const dispatch = createEventDispatcher<{
    save: void;
    discard: void;
    cancel: void;
  }>();

  function handleSave() {
    dispatch('save');
  }

  function handleDiscard() {
    dispatch('discard');
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

{#if open}
  <div class="dialog-backdrop" role="presentation" on:click={handleBackdropClick}>
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
      use:modalFocus={handleCancel}
    >
      <h2 id={titleId} class="dialog-title">{title}</h2>
      <p class="dialog-message">{message}</p>

      <div class="dialog-actions">
        <button class="btn btn-cancel" on:click={handleCancel}>Cancel</button>
        <button class="btn btn-discard" on:click={handleDiscard}>Discard</button>
        <button class="btn btn-save" on:click={handleSave}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    backdrop-filter: blur(calc(var(--space-1) / 2));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    width: 90%;
    min-width: 0;
    max-width: var(--modal-width-sm);
    box-shadow: 0 var(--space-4) calc(var(--space-6) * 2) var(--shadow-heavy);
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: scale(0.95) translateY(calc(var(--space-5) / -2));
      opacity: 0;
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .dialog-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--space-3) 0;
  }

  .dialog-message {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 var(--space-6) 0;
    line-height: 1.5;
  }

  .dialog-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .btn {
    height: var(--button-height);
    padding: 0 var(--space-4);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .btn-cancel:hover {
    background: var(--bg-hover);
    border-color: var(--text-tertiary);
    color: var(--text-primary);
  }

  .btn-discard {
    background: var(--error);
    color: white;
  }

  .btn-discard:hover {
    background: var(--error-hover);
  }

  .btn-save {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-save:hover {
    background: var(--accent-hover);
  }
</style>
