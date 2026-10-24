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
    hidePaidItems,
    columnMode,
    viewMode,
  } from '../stores/ui';
  import type { ViewMode } from '../stores/ui';

  // Optional: If provided, navigation will use goto() instead of just store updates
  // This is needed for URL-based routing like /month/2025-01
  export let basePath: string | undefined = undefined;

  // Optional control buttons
  export let showRefresh: boolean = false;
  export let showWidthToggle: boolean = false;
  export let showColumnToggle: boolean = false;
  export let showHidePaid: boolean = false;
  export let showSyncMetadata: boolean = false;
  export let showViewToggle: boolean = false;
  export let isSyncingMetadata: boolean = false;
  export let onRefresh: (() => void) | undefined = undefined;
  export let onSyncMetadata: (() => void) | undefined = undefined;
  export let showFind: boolean = false;
  export let onFind: (() => void) | undefined = undefined;

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
    showHidePaid ||
    showSyncMetadata ||
    showViewToggle ||
    showFind;

  const VIEW_MODE_LABELS: Record<ViewMode, string> = {
    classic: 'Classic',
    table: 'Table',
  };

  function getNextViewMode(current: ViewMode): ViewMode {
    return current === 'classic' ? 'table' : 'classic';
  }
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
  </div>

  <div class="spacer controls-spacer">
    <div class="header-controls">
      <button
        class="today-btn"
        on:click={handleToday}
        disabled={isCurrentMonth}
        aria-label="Go to current month"
      >
        Today
      </button>
      {#if hasControls}
        {#if showFind}
          <button
            class="control-btn"
            on:click={() => onFind?.()}
            aria-label="Find bills and income"
            title="Find (Ctrl/⌘ F)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        {/if}

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
              ? 'Automatic columns — stacks to fit (click for one column)'
              : 'One column (click for automatic columns)'}
          >
            <span class="column-number">{$columnMode === '2-col' ? 'Auto' : '1'}</span>
          </button>
        {/if}

        {#if showViewToggle}
          <!-- View mode cycle button -->
          <button
            class="control-btn view-mode-btn"
            on:click={() => viewMode.cycle()}
            title="{VIEW_MODE_LABELS[$viewMode]} view (click for {VIEW_MODE_LABELS[
              getNextViewMode($viewMode)
            ]})"
          >
            {#if $viewMode === 'classic'}
              <!-- Grid icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="8"
                  height="8"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <rect
                  x="13"
                  y="3"
                  width="8"
                  height="8"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <rect
                  x="3"
                  y="13"
                  width="8"
                  height="8"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <rect
                  x="13"
                  y="13"
                  width="8"
                  height="8"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
            {:else}
              <!-- Table icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path d="M3 9H21" stroke="currentColor" stroke-width="2" />
                <path d="M3 15H21" stroke="currentColor" stroke-width="2" />
                <path d="M9 3V21" stroke="currentColor" stroke-width="2" />
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
            title={$hidePaidItems ? 'Show all items' : 'Hide completed items'}
            aria-label="Hide completed items"
            aria-pressed={$hidePaidItems}
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
      {/if}
    </div>
  </div>
</div>

<style>
  /* Three columns keep the month title centred; the controls column may grow
     past its share on narrow windows instead of overlapping the title. */
  .month-picker-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(max-content, 1fr);
    align-items: center;
    gap: var(--space-3);
    height: var(--header-height);
    padding: 0 var(--space-4);
    box-sizing: border-box;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-default);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
  }

  .controls-spacer {
    display: flex;
    justify-content: flex-end;
  }

  .center-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--control-height);
    height: var(--control-height);
    padding: 0;
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }

  .nav-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
  }

  /* Fixed width so the arrows stay put as month names change length */
  .month-title {
    width: 8.5em;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
    text-align: center;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .today-btn {
    height: var(--control-height-sm);
    padding: 0 var(--space-3);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .today-btn:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .today-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: var(--control-height-sm);
    height: var(--control-height-sm);
    padding: 0 var(--space-1);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .control-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
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

  .column-number {
    font-size: var(--font-size-sm);
    font-weight: 600;
    line-height: 1;
  }

  .view-mode-btn {
    position: relative;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Small windows: month on the left, controls on the right */
  @media (max-width: 40rem) {
    .month-picker-header {
      grid-template-columns: auto minmax(max-content, 1fr);
      padding: 0 var(--space-3);
    }

    .spacer:not(.controls-spacer) {
      display: none;
    }

    .month-title {
      width: 7.5em;
      font-size: var(--font-size-lg);
    }
  }
</style>
