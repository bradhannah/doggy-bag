<script lang="ts">
  import type { Toast, ToastType } from '../../stores/toast';
  import { removeToast } from '../../stores/toast';

  export let toast: Toast;

  function getIcon(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
    }
  }

  function handleClose() {
    removeToast(toast.id);
  }
</script>

<div class="toast toast-{toast.type}" role="alert">
  <span class="toast-icon">{getIcon(toast.type)}</span>
  <span class="toast-message">{toast.message}</span>
  <button class="toast-close" on:click={handleClose} aria-label="Close"> ✕ </button>
</div>

<style>
  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    box-shadow: 0 4px 12px var(--shadow-medium);
    min-width: 280px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast-icon {
    font-size: 1rem;
    flex-shrink: 0;
    width: 1.25rem;
    text-align: center;
  }

  .toast-message {
    flex: 1;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--text-primary);
  }

  .toast-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    font-size: 0.75rem;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .toast-close:hover {
    opacity: 1;
  }

  /* Type-specific styles */
  .toast-success {
    border-color: var(--success-border);
    background: var(--success-bg);
  }

  .toast-success .toast-icon {
    color: var(--success);
  }

  .toast-error {
    border-color: var(--error-border);
    background: var(--error-bg);
  }

  .toast-error .toast-icon {
    color: var(--error);
  }

  .toast-warning {
    border-color: var(--warning-border);
    background: var(--warning-bg);
  }

  .toast-warning .toast-icon {
    color: var(--warning);
  }

  .toast-info {
    border-color: var(--border-focus);
    background: var(--info-bg);
  }

  .toast-info .toast-icon {
    color: var(--accent);
  }
</style>
