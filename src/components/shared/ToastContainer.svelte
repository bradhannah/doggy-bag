<script lang="ts">
  import { toasts } from '../../stores/toast';
  import Toast from './Toast.svelte';
</script>

{#if $toasts.length > 0}
  <div class="toast-container" aria-live="polite" aria-atomic="true">
    {#each $toasts as toast (toast.id)}
      <Toast {toast} />
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column-reverse;
    gap: 0.75rem;
    pointer-events: none;
  }

  .toast-container :global(.toast) {
    pointer-events: auto;
  }

  @media (max-width: 480px) {
    .toast-container {
      left: 1rem;
      right: 1rem;
      bottom: 1rem;
    }

    .toast-container :global(.toast) {
      max-width: none;
    }
  }
</style>
