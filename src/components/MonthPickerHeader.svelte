<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    currentMonth,
    currentMonthDisplay,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    getCurrentMonth,
    widthMode,
    compactMode,
    hidePaidItems,
    columnMode,
  } from '../stores/ui';

  // Optional: If provided, navigation will use goto() instead of just store updates
  // This is needed for URL-based routing like /month/2025-01
  export let basePath: string | undefined = undefined;

  // Optional control buttons
  export let showRefresh: boolean = false;
  export let showWidthToggle: boolean = false;
  export let showColumnToggle: boolean = false;
  export let showCompactToggle: boolean = false;
  export let showHidePaid: boolean = false;
  export let showSyncMetadata: boolean = false;
  export let isSyncingMetadata: boolean = false;
  export let onRefresh: (() => void) | undefined = undefined;
  export let onSyncMetadata: (() => void) | undefined = undefined;

  // Check if we're viewing the current calendar month
  $: isCurrentMonth = $currentMonth === getCurrentMonth();

  function handlePrev() {
    goToPreviousMonth();
    if (basePath) {
      goto(`${basePath}/${$currentMonth}`);
    }
  }

  function handleNext() {
    goToNextMonth();
    if (basePath) {
      goto(`${basePath}/${$currentMonth}`);
    }
  }

  function handleToday() {
    goToCurrentMonth();
    if (basePath) {
      goto(`${basePath}/${$currentMonth}`);
    }
  }

  function toggleWidthMode() {
    widthMode.cycle();
  }

  function handleRefresh() {
    if (onRefresh) {
      onRefresh();
    }
  }

  function handleSyncMetadata() {
    if (onSyncMetadata) {
      onSyncMetadata();
    }
  }

  $: hasControls =
    showRefresh ||
    showWidthToggle ||
    showColumnToggle ||
    showCompactToggle ||
    showHidePaid ||
    showSyncMetadata;
</script>

<div class="month-picker-header">
  <div class="spacer"></div>

  <div class="center-group">
    <button class="nav-btn" on:click={handlePrev} aria-label="Previous month">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M12 15L7 10L12 5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <h1 class="month-title">{$currentMonthDisplay}</h1>

    <button class="nav-btn" on:click={handleNext} aria-label="Next month">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M8 5L13 10L8 15"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <button
      class="today-btn"
      on:click={handleToday}
      disabled={isCurrentMonth}
      aria-label="Go to current month"
    >
      Today
    </button>
  </div>

  <div class="spacer controls-spacer">
    {#if hasControls}
      <div class="header-controls">
        {#if showWidthToggle}
          <!-- Width toggle (toggles: medium <-> wide) -->
          <button
            class="control-btn"
            on:click={toggleWidthMode}
            title={$widthMode === 'medium'
              ? 'Medium width (click for wide)'
              : 'Wide (click for medium)'}
          >
            {#if $widthMode === 'medium'}
              <!-- Medium icon: medium box -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
            {:else}
              <!-- Wide icon: full width with arrows -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 4V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M20 4V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path
                  d="M8 12L11 9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M8 12L11 15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M16 12L13 9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M16 12L13 15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </button>
        {/if}

        {#if showColumnToggle}
          <!-- Column layout toggle (1-col stacked vs 2-col side by side) -->
          <button
            class="control-btn"
            on:click={() => columnMode.toggle()}
            title={$columnMode === '2-col'
              ? '2 columns (click for 1 column)'
              : '1 column (click for 2 columns)'}
          >
            <span class="column-number">{$columnMode === '2-col' ? '2' : '1'}</span>
          </button>
        {/if}

        {#if showCompactToggle}
          <!-- Compact toggle -->
          <button
            class="control-btn"
            on:click={() => compactMode.toggle()}
            title={$compactMode ? 'Normal view' : 'Compact view'}
          >
            {#if $compactMode}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 8h16M4 16h16"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            {/if}
          </button>
        {/if}

        {#if showHidePaid}
          <!-- Hide paid toggle -->
          <button
            class="control-btn"
            class:active={$hidePaidItems}
            on:click={() => hidePaidItems.toggle()}
            title={$hidePaidItems ? 'Show all items' : 'Hide paid items'}
          >
            {#if $hidePaidItems}
              <!-- Eye with slash (hidden) -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M1 1l22 22"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            {:else}
              <!-- Eye (visible) -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </button>
        {/if}

        {#if showSyncMetadata}
          <!-- Sync metadata button -->
          <button
            class="control-btn"
            class:syncing={isSyncingMetadata}
            on:click={handleSyncMetadata}
            disabled={isSyncingMetadata}
            title="Sync metadata from source bills/incomes"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              class:spinning={isSyncingMetadata}
            >
              <path
                d="M4 12a8 8 0 0 1 8-8V1l4 3-4 3V4a6 6 0 0 0-6 6H4z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M20 12a8 8 0 0 1-8 8v3l-4-3 4-3v3a6 6 0 0 0 6-6h2z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        {/if}

        {#if showRefresh}
          <!-- Refresh button -->
          <button class="control-btn" on:click={handleRefresh} title="Refresh data">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polyline
                points="23 4 23 10 17 10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <polyline
                points="1 20 1 14 7 14"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .month-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-4);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-default);
    /* Sticky positioning */
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .spacer {
    flex: 1;
    min-width: 0; /* Prevent flex overflow */
  }

  .controls-spacer {
    display: flex;
    justify-content: flex-end;
  }

  .center-group {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--text-inverse);
  }

  .month-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 180px;
    text-align: center;
  }

  .today-btn {
    padding: var(--space-2) var(--space-4);
    background: transparent;
    border: 1px solid var(--accent);
    border-radius: var(--radius-md);
    color: var(--accent);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .today-btn:hover:not(:disabled) {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .today-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: var(--text-tertiary);
    color: var(--text-tertiary);
  }

  /* Header controls */
  .header-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--button-height-sm);
    height: var(--button-height-sm);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-btn:hover {
    background: var(--accent-muted);
    border-color: var(--accent);
    color: var(--accent);
  }

  .control-btn.active {
    background: var(--success-muted);
    border-color: var(--success);
    color: var(--success);
  }

  .control-btn.syncing {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .control-btn .spinning {
    animation: spin 1s linear infinite;
  }

  /* Column number display */
  .column-number {
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 480px) {
    .month-picker-header {
      padding: var(--space-3) var(--space-3);
    }

    .center-group {
      gap: var(--space-2);
    }

    .month-title {
      font-size: 1rem;
      min-width: 140px;
    }

    .nav-btn {
      width: 32px;
      height: 32px;
    }

    .today-btn {
      padding: var(--space-1) var(--space-3);
      font-size: 0.75rem;
    }

    .header-controls {
      gap: var(--space-1);
    }

    .control-btn {
      width: 28px;
      height: 28px;
    }
  }
</style>
