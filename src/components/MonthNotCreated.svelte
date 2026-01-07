<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let monthDisplay: string;
  export let creating = false;
  export let hint = 'Create this month to start tracking bills, income, and expenses.';

  const dispatch = createEventDispatcher<{ create: void }>();

  function handleCreate() {
    dispatch('create');
  }
</script>

<div class="create-month-prompt">
  <div class="prompt-icon">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" />
      <path d="M3 10H21" stroke="currentColor" stroke-width="2" />
      <path d="M8 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  </div>
  <h2>Month Not Created</h2>
  <p>{monthDisplay} doesn't exist yet.</p>
  <p class="prompt-hint">{hint}</p>
  <button class="btn btn-primary" on:click={handleCreate} disabled={creating}>
    {creating ? 'Creating...' : 'Create Month'}
  </button>
</div>

<style>
  .create-month-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: var(--content-max-sm);
    margin: var(--space-4) auto 0 auto;
    padding: 60px var(--content-padding);
    text-align: center;
    background: #1a1a2e;
    border-radius: var(--radius-xl);
    border: 1px solid #333355;
  }

  .prompt-icon {
    color: #888;
    margin-bottom: var(--space-4);
  }

  .create-month-prompt h2 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #e4e4e7;
  }

  .create-month-prompt p {
    margin: 0 0 4px 0;
    color: #888;
    font-size: 1rem;
  }

  .prompt-hint {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 20px;
  }

  .btn {
    height: var(--button-height);
    padding: 0 var(--space-6);
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background: #24c8db;
    color: #000;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
