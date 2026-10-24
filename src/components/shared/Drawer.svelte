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
  import { modalFocus, dialogTitleId } from '$lib/actions/modal-focus';
  import { portal } from '$lib/actions/portal';
  const titleId = dialogTitleId();

  export let isOpen = false;
  export let title = '';
  export let onClose: () => void = () => {};
  export let isDirty: (() => boolean) | null = null;
  export let onSave: (() => Promise<void> | void) | null = null;

  // State for unsaved changes confirmation dialog
  let showUnsavedDialog = false;

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

{#if isOpen}
  <div class="drawer-backdrop" use:portal on:click={handleBackdropClick} role="presentation">
    <div
      class="drawer"
      on:click={handleDrawerClick}
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
      use:modalFocus={attemptClose}
    >
      <div class="drawer-header">
        <h2 id={titleId}>{title}</h2>
        <button class="icon-btn close-btn" on:click={attemptClose} aria-label="Close drawer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
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
    z-index: var(--z-drawer);
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
    margin-right: calc(var(--space-1) * -1);
  }

  .drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  /* A form's Save/Cancel row stays visible at the bottom while the form scrolls */
  .drawer .drawer-content :global(.form-actions) {
    position: sticky;
    bottom: 0;
    z-index: 1;
    margin: var(--space-5) calc(var(--space-4) * -1) calc(var(--space-4) * -1);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-default);
  }

  /* Mobile: full width drawer from bottom */
  @media (max-width: 48rem) {
    .drawer-backdrop {
      align-items: flex-end;
      justify-content: stretch;
    }

    .drawer {
      width: 100%;
      max-width: 100%;
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
