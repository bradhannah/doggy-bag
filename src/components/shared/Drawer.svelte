<script lang="ts">
  /**
   * Drawer - Right-side drawer component for forms
   *
   * @prop isOpen - Whether the drawer is visible
   * @prop title - Title displayed in the drawer header
   * @prop onClose - Callback when drawer should close (backdrop click or X button)
   * @prop isDirty - Optional callback to check if form has unsaved changes
   * @prop onSave - Optional callback to save changes (used with dirty check)
   */
  import UnsavedChangesDialog from './UnsavedChangesDialog.svelte';

  export let isOpen = false;
  export let title = '';
  export let onClose: () => void = () => {};
  export let isDirty: (() => boolean) | null = null;
  export let onSave: (() => Promise<void> | void) | null = null;

  // State for unsaved changes confirmation dialog
  let showUnsavedDialog = false;

  // Handle keyboard escape to close
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      attemptClose();
    }
  }

  // Handle backdrop click
  function handleBackdropClick() {
    attemptClose();
  }

  // Attempt to close - checks for dirty state first
  function attemptClose() {
    if (isDirty && isDirty()) {
      showUnsavedDialog = true;
    } else {
      onClose();
    }
  }

  // Handle save from dialog
  async function handleDialogSave() {
    showUnsavedDialog = false;
    if (onSave) {
      try {
        await onSave();
        // onSave should call onClose if successful
      } catch {
        // Save failed - keep drawer open, error should be shown by form
      }
    }
  }

  // Handle discard from dialog
  function handleDialogDiscard() {
    showUnsavedDialog = false;
    onClose();
  }

  // Handle cancel from dialog
  function handleDialogCancel() {
    showUnsavedDialog = false;
  }

  // Prevent clicks inside drawer from closing it
  function handleDrawerClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="drawer-backdrop" on:click={handleBackdropClick} role="presentation">
    <div
      class="drawer"
      on:click={handleDrawerClick}
      on:keydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      tabindex="0"
    >
      <div class="drawer-header">
        <h2 id="drawer-title">{title}</h2>
        <button class="close-btn" on:click={attemptClose} aria-label="Close drawer">
          &times;
        </button>
      </div>
      <div class="drawer-content">
        <slot />
      </div>
    </div>
  </div>
{/if}

<UnsavedChangesDialog
  open={showUnsavedDialog}
  on:save={handleDialogSave}
  on:discard={handleDialogDiscard}
  on:cancel={handleDialogCancel}
/>

<style>
  .drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-bg);
    z-index: 1000;
    display: flex;
    justify-content: flex-end;
  }

  .drawer {
    width: var(--drawer-width);
    max-width: 90vw;
    height: 100%;
    background: var(--bg-surface);
    border-left: 1px solid var(--border-default);
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-elevated);
  }

  .drawer-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.75rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    width: var(--button-height-sm);
    height: var(--button-height-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .close-btn:hover {
    background: var(--accent-muted);
    color: var(--text-primary);
  }

  .drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  /* Mobile: full width drawer from bottom */
  @media (max-width: 768px) {
    .drawer-backdrop {
      align-items: flex-end;
      justify-content: stretch;
    }

    .drawer {
      width: 100%;
      height: 90%;
      border-left: none;
      border-top: 1px solid var(--border-default);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      animation: slideUp 0.2s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }
  }
</style>
