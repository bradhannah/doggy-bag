<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let query = '';
  export let matchCount = 0;
  export let open = false;
  export let categories = true;
  export let items = true;
  export let bills = true;
  export let income = true;

  const dispatch = createEventDispatcher<{
    clear: void;
    escape: void;
    scopeChange: void;
  }>();

  let inputEl: HTMLInputElement | null = null;
  let scopeOpen = false;
  let scopeButtonEl: HTMLButtonElement | null = null;
  let scopePanelEl: HTMLDivElement | null = null;

  $: allSelected = categories && items && bills && income;
  $: scopeLabel = allSelected ? 'All' : 'Custom';

  export function focusAndSelect() {
    inputEl?.focus();
    inputEl?.select();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      dispatch('escape');
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (scopeOpen) {
        scopeOpen = false;
      } else {
        // Close the filter bar when Enter is pressed outside scope dropdown
        dispatch('escape');
      }
    }
  }

  function handleClear() {
    dispatch('clear');
  }

  function toggleScopeOpen() {
    scopeOpen = !scopeOpen;
  }

  function handleScopeKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      scopeOpen = false;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      scopeOpen = false;
    }
  }

  function handleScopeChange() {
    dispatch('scopeChange');
  }

  function handleScopeClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    if (!scopeOpen) return;
    if (scopeButtonEl?.contains(target)) return;
    if (scopePanelEl?.contains(target)) return;
    scopeOpen = false;
  }

  onMount(() => {
    if (open) {
      focusAndSelect();
    }

    window.addEventListener('click', handleScopeClickOutside);
    return () => {
      window.removeEventListener('click', handleScopeClickOutside);
    };
  });
</script>

{#if open}
  <div class="filter-bar">
    <label class="filter-label" for="filter-input">Find</label>
    <div class="filter-input">
      <input
        id="filter-input"
        type="text"
        placeholder="Type to filter bills and income"
        bind:value={query}
        on:keydown={handleKeydown}
        bind:this={inputEl}
        autocomplete="off"
      />
      <button type="button" class="clear-button" on:click={handleClear} aria-label="Clear filter">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 6L6 18M6 6L18 18"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
    <div class="filter-controls">
      <div class="scope-menu">
        <button
          class="scope-button"
          type="button"
          on:click={toggleScopeOpen}
          bind:this={scopeButtonEl}
          aria-haspopup="true"
          aria-expanded={scopeOpen}
        >
          Scope: {scopeLabel}
          <span class="chevron">▾</span>
        </button>
        {#if scopeOpen}
          <div class="scope-panel" bind:this={scopePanelEl} on:keydown={handleScopeKeydown}>
            <label class="scope-item">
              <input type="checkbox" bind:checked={categories} on:change={handleScopeChange} />
              <span>Categories</span>
            </label>
            <p class="scope-hint">Match category names to show entire sections.</p>
            <label class="scope-item">
              <input type="checkbox" bind:checked={items} on:change={handleScopeChange} />
              <span>Items</span>
            </label>
            <div class="scope-subgroup">
              <label class="scope-item">
                <input
                  type="checkbox"
                  bind:checked={bills}
                  on:change={handleScopeChange}
                  disabled={!items}
                />
                <span>Bills</span>
              </label>
              <label class="scope-item">
                <input
                  type="checkbox"
                  bind:checked={income}
                  on:change={handleScopeChange}
                  disabled={!items}
                />
                <span>Income</span>
              </label>
            </div>
          </div>
        {/if}
      </div>
      <div class="filter-meta">
        <span>{matchCount} shown</span>
        <span class="hint">Esc to close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .filter-bar {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    margin-bottom: var(--space-4);
  }

  .filter-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .filter-input {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: var(--space-2);
  }

  input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-primary);
  }

  input:focus {
    outline: 2px solid var(--border-focus);
    outline-offset: 1px;
  }

  .clear-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--space-6) + var(--space-1));
    height: calc(var(--space-6) + var(--space-1));
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-secondary);
  }

  .clear-button:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .filter-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
  }

  .scope-menu {
    position: relative;
    display: inline-flex;
  }

  .scope-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-primary);
  }

  .scope-button:hover {
    background: var(--bg-hover);
  }

  .chevron {
    color: var(--text-tertiary);
  }

  .scope-panel {
    position: absolute;
    top: calc(100% + var(--space-2));
    left: 0;
    z-index: 10;
    min-width: calc(var(--panel-width-medium) / 2);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    box-shadow: 0 10px 30px var(--shadow-light);
    display: grid;
    gap: var(--space-2);
  }

  .scope-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-primary);
    font-size: 0.85rem;
  }

  .scope-item input {
    width: auto;
  }

  .scope-item input:disabled {
    opacity: 0.6;
  }

  .scope-hint {
    margin: 0;
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .scope-subgroup {
    display: grid;
    gap: var(--space-1);
    padding-left: var(--space-4);
  }

  .filter-meta {
    display: flex;
    gap: var(--space-3);
    color: var(--text-tertiary);
    font-size: 0.8rem;
  }

  .hint {
    color: var(--text-secondary);
  }
</style>
