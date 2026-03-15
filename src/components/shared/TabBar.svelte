<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let tabs: { id: string; label: string }[] = [];
  export let active: string = '';

  const dispatch = createEventDispatcher<{ change: string }>();

  function handleClick(id: string) {
    if (id !== active) {
      dispatch('change', id);
    }
  }
</script>

<div class="tab-bar" role="tablist">
  {#each tabs as tab (tab.id)}
    <button
      class="tab"
      class:active={active === tab.id}
      role="tab"
      aria-selected={active === tab.id}
      on:click={() => handleClick(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tab-bar {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    width: fit-content;
  }

  .tab {
    padding: var(--space-2) var(--space-5);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab:hover:not(.active) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .tab.active {
    background: var(--accent);
    color: var(--text-inverse);
    border-color: var(--accent);
    font-weight: 600;
  }
</style>
