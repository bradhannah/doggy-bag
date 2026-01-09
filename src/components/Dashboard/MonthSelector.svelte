<script lang="ts">
  import { onMount } from 'svelte';
  import {
    currentMonth,
    currentMonthDisplay,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    goToMonth,
  } from '../../stores/ui';
  import { apiUrl } from '../../lib/api/client';

  interface MonthSummary {
    month: string;
    created_at: string;
    updated_at: string;
    total_income: number;
    total_bills: number;
    total_expenses: number;
    leftover: number;
  }

  let availableMonths: MonthSummary[] = [];
  let showDropdown = false;
  let isLoading = false;

  $: isCurrentMonth = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return $currentMonth === `${year}-${month}`;
  })();

  $: hasDataForCurrentMonth = availableMonths.some((m) => m.month === $currentMonth);

  async function loadAvailableMonths() {
    try {
      isLoading = true;
      const response = await fetch(apiUrl('/api/months'));
      if (response.ok) {
        const data = await response.json();
        availableMonths = data.months || [];
      }
    } catch (error) {
      console.error('Failed to load months:', error);
    } finally {
      isLoading = false;
    }
  }

  function formatMonthDisplay(month: string): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(year, m - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(dollars);
  }

  function selectMonth(month: string) {
    goToMonth(month);
    showDropdown = false;
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
    if (showDropdown) {
      loadAvailableMonths();
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.month-selector')) {
      showDropdown = false;
    }
  }

  onMount(() => {
    loadAvailableMonths();
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="month-selector">
  <button class="nav-btn" on:click={goToPreviousMonth} aria-label="Previous month">
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

  <div class="month-display-container">
    <button class="month-display" on:click={toggleDropdown} class:has-data={hasDataForCurrentMonth}>
      <span class="month-label">{$currentMonthDisplay}</span>
      {#if hasDataForCurrentMonth}
        <span class="data-indicator" title="Has budget data"></span>
      {/if}
      <svg
        class="dropdown-arrow"
        class:open={showDropdown}
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
      >
        <path
          d="M3 5L6 8L9 5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    {#if !isCurrentMonth}
      <button class="today-btn" on:click={goToCurrentMonth}>Today</button>
    {/if}

    {#if showDropdown}
      <div class="dropdown-menu">
        <div class="dropdown-header">Available Months</div>
        {#if isLoading}
          <div class="dropdown-loading">Loading...</div>
        {:else if availableMonths.length === 0}
          <div class="dropdown-empty">No months with data</div>
        {:else}
          {#each availableMonths as monthData (monthData.month)}
            <button
              class="dropdown-item"
              class:selected={monthData.month === $currentMonth}
              class:positive={monthData.leftover >= 0}
              class:negative={monthData.leftover < 0}
              on:click={() => selectMonth(monthData.month)}
            >
              <span class="dropdown-month">{formatMonthDisplay(monthData.month)}</span>
              <span
                class="dropdown-leftover"
                class:positive={monthData.leftover >= 0}
                class:negative={monthData.leftover < 0}
              >
                {formatCurrency(monthData.leftover)}
              </span>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>

  <button class="nav-btn" on:click={goToNextMonth} aria-label="Next month">
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

<style>
  .month-selector {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    background: var(--bg-surface);
    border-radius: 12px;
    border: 1px solid var(--border-default);
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--text-inverse);
  }

  .month-display-container {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .month-display {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 180px;
    padding: 8px 12px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .month-display:hover {
    background: var(--accent-muted);
    border-color: var(--accent-muted);
  }

  .month-label {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .data-indicator {
    width: 8px;
    height: 8px;
    background: var(--success);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dropdown-arrow {
    color: var(--text-secondary);
    transition: transform 0.2s;
    margin-left: auto;
  }

  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  .today-btn {
    padding: 4px 12px;
    background: transparent;
    border: 1px solid var(--accent);
    border-radius: 6px;
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .today-btn:hover {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 10px;
    box-shadow: 0 8px 24px var(--shadow-medium);
    overflow: hidden;
    z-index: 100;
    min-width: 220px;
  }

  .dropdown-header {
    padding: 10px 14px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-default);
  }

  .dropdown-loading,
  .dropdown-empty {
    padding: 16px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 14px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.15s;
    text-align: left;
  }

  .dropdown-item:hover {
    background: var(--accent-muted);
  }

  .dropdown-item.selected {
    background: var(--accent-muted);
    border-left: 3px solid var(--accent);
  }

  .dropdown-month {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .dropdown-leftover {
    font-size: 0.8rem;
    font-weight: 600;
  }

  .dropdown-leftover.positive {
    color: var(--success);
  }

  .dropdown-leftover.negative {
    color: var(--error);
  }
</style>
