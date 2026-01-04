<script lang="ts">
  /**
   * Drawer - Right-side drawer component for forms
   *
   * @prop isOpen - Whether the drawer is visible
   * @prop title - Title displayed in the drawer header
   * @prop onClose - Callback when drawer should close (backdrop click or X button)
   */
  export let isOpen = false;
  export let title = '';
  export let onClose: () => void = () => {};

  // Handle keyboard escape to close
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }

  // Handle backdrop click
  function handleBackdropClick() {
    onClose();
  }

  // Prevent clicks inside drawer from closing it
  function handleDrawerClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="drawer-backdrop" on:click={handleBackdropClick} role="presentation">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
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
        <button class="close-btn" on:click={onClose} aria-label="Close drawer"> &times; </button>
      </div>
      <div class="drawer-content">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    justify-content: flex-end;
  }

  .drawer {
    width: 400px;
    max-width: 100%;
    height: 100%;
    background: #1a1a2e;
    border-left: 1px solid #333355;
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
    padding: 20px;
    border-bottom: 1px solid #333355;
    background: #16213e;
  }

  .drawer-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #e4e4e7;
  }

  .close-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 1.75rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e4e4e7;
  }

  .drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
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
      border-top: 1px solid #333355;
      border-radius: 16px 16px 0 0;
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
