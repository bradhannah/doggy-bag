<script lang="ts">
  /**
   * NotesModal - Simple modal to display notes text
   *
   * @prop title - Title for the modal (e.g., bill/income name)
   * @prop notes - The notes text to display
   * @prop open - Whether the modal is open
   */
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let title: string = 'Notes';
  export let notes: string = '';
  export let open: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  function handleClose() {
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!open) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <div
    class="modal-backdrop"
    role="presentation"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
  >
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">{title}</h2>
        <button class="btn-close" on:click={handleClose} title="Close">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="modal-content">
        <p class="notes-text">{notes}</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9998;
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

  .modal {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    width: 90%;
    min-width: 320px;
    max-width: 480px;
    box-shadow: 0 16px 48px var(--shadow-heavy);
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: scale(0.95) translateY(-10px);
      opacity: 0;
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-default);
  }

  .modal-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-close:hover {
    background: var(--border-default);
    color: var(--text-primary);
  }

  .modal-content {
    padding: 20px;
  }

  .notes-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>
