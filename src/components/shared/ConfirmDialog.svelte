<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  
  export let title: string = 'Confirm';
  export let message: string = 'Are you sure?';
  export let confirmText: string = 'Delete';
  export let cancelText: string = 'Cancel';
  export let confirmStyle: 'danger' | 'primary' = 'danger';
  export let open: boolean = false;
  
  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();
  
  function handleConfirm() {
    dispatch('confirm');
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (!open) return;
    
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
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
  <div class="dialog-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <div class="dialog">
      <h2 id="dialog-title" class="dialog-title">{title}</h2>
      <p class="dialog-message">{message}</p>
      
      <div class="dialog-actions">
        <button class="btn btn-cancel" on:click={handleCancel}>
          {cancelText}
        </button>
        <button 
          class="btn btn-confirm" 
          class:danger={confirmStyle === 'danger'}
          class:primary={confirmStyle === 'primary'}
          on:click={handleConfirm}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9998;
    animation: fadeIn 0.15s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .dialog {
    background: #1e1e2e;
    border: 1px solid #333355;
    border-radius: 12px;
    padding: 24px;
    min-width: 320px;
    max-width: 420px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
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
  
  .dialog-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #e4e4e7;
    margin: 0 0 12px 0;
  }
  
  .dialog-message {
    font-size: 0.9rem;
    color: #a1a1aa;
    margin: 0 0 24px 0;
    line-height: 1.5;
  }
  
  .dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  
  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  
  .btn-cancel {
    background: transparent;
    border: 1px solid #333355;
    color: #a1a1aa;
  }
  
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: #555;
    color: #e4e4e7;
  }
  
  .btn-confirm.danger {
    background: #ef4444;
    color: white;
  }
  
  .btn-confirm.danger:hover {
    background: #dc2626;
  }
  
  .btn-confirm.primary {
    background: #24c8db;
    color: #000;
  }
  
  .btn-confirm.primary:hover {
    background: #1fb8c9;
  }
</style>
