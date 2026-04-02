<script lang="ts">
  /** Spinner diameter in pixels. Defaults to 32. */
  export let size: number = 32;
  /** Optional label shown below the spinner. */
  export let label: string = '';
</script>

<div class="spinner-container">
  <div
    class="spinner"
    style="width: {size}px; height: {size}px; border-width: {Math.max(2, Math.round(size / 10))}px;"
  ></div>
  {#if label}
    <p class="spinner-label">{label}</p>
  {/if}
</div>

<style>
  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  .spinner {
    border-style: solid;
    border-color: var(--border-default);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-label {
    color: var(--text-secondary);
    margin: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
