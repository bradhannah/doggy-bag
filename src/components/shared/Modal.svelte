<script lang="ts">
  /**
   * Modal - Centered overlay modal component
   *
   * @prop open - Whether the modal is visible
   * @prop title - Title displayed in the modal header
   * @prop subtitle - Optional subtitle below the title
   * @prop onClose - Callback when modal should close (backdrop click, X button, or Escape)
   * @prop size - Modal size: 'sm' (default), 'md', or 'lg'
   *
   * Slots:
   * - default: Modal body content
   * - footer: Optional footer content (typically action buttons)
   */

  import { modalFocus, dialogTitleId } from '$lib/actions/modal-focus';
  import { portal } from '$lib/actions/portal';

  const titleId = dialogTitleId();
  export let open = false;
  export let title = '';
  export let subtitle = '';
  export let onClose: () => void = () => {};
  export let size: 'sm' | 'md' | 'lg' = 'sm';

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleModalClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

{#if open}
  <div class="modal-backdrop" role="presentation" use:portal on:click={handleBackdropClick}>
    <div
      class="modal modal-{size}"
      use:modalFocus={onClose}
      on:click={handleModalClick}
      on:keydown={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
    >
      <header class="modal-header">
        {#if $$slots.eyebrow}
          <p class="eyebrow"><slot name="eyebrow" /></p>
        {/if}
        <div class="title-row">
          <h2 id={titleId}>{title}</h2>
          <button class="icon-btn close-btn" on:click={onClose} aria-label="Close modal">
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
        {#if subtitle}
          <p class="modal-subtitle">{subtitle}</p>
        {/if}
      </header>

      <div class="modal-body">
        <slot />
      </div>

      {#if $$slots.footer}
        <footer class="modal-footer">
          <slot name="footer" />
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
  }

  .modal {
    background: var(--bg-surface);
    border: thin solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 var(--space-6) calc(var(--space-8) * 2) var(--shadow-heavy);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-sm {
    width: min(100%, var(--modal-width-sm));
  }

  .modal-md {
    width: min(100%, var(--panel-width-medium));
  }

  .modal-lg {
    width: min(100%, var(--content-max-sm));
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-header {
    padding: var(--space-4) var(--space-5);
    border-bottom: thin solid var(--border-default);
  }

  /* The close button shares the title's centreline, with or without an eyebrow */
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .eyebrow {
    margin: 0 0 var(--space-1) 0;
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
  }

  .modal-subtitle {
    margin: var(--space-1) 0 0 0;
    font-size: var(--font-size-md);
    color: var(--text-secondary);
  }

  /* Pull the icon's hit area into the padding so the X lines up with the footer edge */
  .close-btn {
    margin-right: calc(var(--space-1) * -1);
  }

  .modal-body {
    padding: var(--space-5);
    overflow-y: auto;
  }

  .modal-footer {
    padding: var(--space-4) var(--space-5);
    border-top: thin solid var(--border-default);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
  }

  /* Mobile adjustments */
  @media (max-width: 30rem) {
    .modal {
      width: 95%;
      margin: var(--space-4);
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding-left: var(--space-4);
      padding-right: var(--space-4);
    }
  }
</style>
