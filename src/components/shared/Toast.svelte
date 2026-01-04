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
    background: #1e1e2e;
    border: 1px solid #2e2e3e;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
  }

  .toast-close {
    background: none;
    border: none;
    color: #888;
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
    border-color: #22c55e40;
    background: linear-gradient(135deg, #1e1e2e 0%, #1a2e1a 100%);
  }

  .toast-success .toast-icon {
    color: #22c55e;
  }

  .toast-error {
    border-color: #ef444440;
    background: linear-gradient(135deg, #1e1e2e 0%, #2e1a1a 100%);
  }

  .toast-error .toast-icon {
    color: #ef4444;
  }

  .toast-warning {
    border-color: #f59e0b40;
    background: linear-gradient(135deg, #1e1e2e 0%, #2e2a1a 100%);
  }

  .toast-warning .toast-icon {
    color: #f59e0b;
  }

  .toast-info {
    border-color: #24c8db40;
    background: linear-gradient(135deg, #1e1e2e 0%, #1a2a2e 100%);
  }

  .toast-info .toast-icon {
    color: #24c8db;
  }
</style>
