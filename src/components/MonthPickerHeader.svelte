<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    currentMonth,
    currentMonthDisplay,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    getCurrentMonth,
  } from '../stores/ui';

  // Optional: If provided, navigation will use goto() instead of just store updates
  // This is needed for URL-based routing like /month/2025-01
  export let basePath: string | undefined = undefined;

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

  <div class="spacer"></div>
</div>

<style>
  .month-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-4);
    background: #1a1a2e;
    border-bottom: 1px solid #333355;
  }

  .spacer {
    flex: 1;
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
    border: 1px solid #333355;
    border-radius: var(--radius-md);
    color: #e4e4e7;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover {
    background: #24c8db;
    border-color: #24c8db;
    color: #000;
  }

  .month-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #e4e4e7;
    min-width: 180px;
    text-align: center;
  }

  .today-btn {
    padding: var(--space-2) var(--space-4);
    background: transparent;
    border: 1px solid #24c8db;
    border-radius: var(--radius-md);
    color: #24c8db;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .today-btn:hover:not(:disabled) {
    background: #24c8db;
    color: #000;
  }

  .today-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: #555;
    color: #555;
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
  }
</style>
