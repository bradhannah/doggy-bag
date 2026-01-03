<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { detailedMonth, detailedMonthData, detailedMonthLoading, detailedMonthError } from '../../stores/detailed-month';
  import CategorySection from './CategorySection.svelte';
  import SummarySidebar from './SummarySidebar.svelte';
  import { success, error as showError } from '../../stores/toast';
  import { widthMode, compactMode } from '../../stores/ui';
  import { paymentSources, loadPaymentSources } from '../../stores/payment-sources';
  import { monthsStore, monthExists, monthIsReadOnly } from '../../stores/months';
  import { apiUrl } from '$lib/api/client';
  
  export let month: string;
  
  // Scroll position preservation
  let savedScrollY: number | null = null;
  let restoreScrollAfterLoad = false;
  let isRefreshing = false; // Track if we're doing a soft refresh vs initial load
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  function formatMonthDisplay(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  
  function getPrevMonth(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-').map(Number);
    const date = new Date(year, monthNum - 2);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  
  function getNextMonth(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-').map(Number);
    const date = new Date(year, monthNum);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  
  function navigateToPrev() {
    goto(`/month/${getPrevMonth(month)}`);
  }
  
  function navigateToNext() {
    goto(`/month/${getNextMonth(month)}`);
  }
  
  async function handleToggleBillPaid(instanceId: string) {
    try {
      const response = await fetch(apiUrl(`/api/months/${month}/bills/${instanceId}/paid`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle paid status');
      }
      
      const result = await response.json();
      detailedMonth.updateBillPaidStatus(
        instanceId, 
        result.instance.is_paid, 
        result.instance.actual_amount
      );
      success('Bill status updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError(message);
    }
  }
  
  async function handleToggleIncomePaid(instanceId: string) {
    try {
      const response = await fetch(apiUrl(`/api/months/${month}/incomes/${instanceId}/paid`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle received status');
      }
      
      const result = await response.json();
      detailedMonth.updateIncomePaidStatus(instanceId, result.instance.is_paid);
      success('Income status updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError(message);
    }
  }
  
  onMount(() => {
    detailedMonth.loadMonth(month);
    monthsStore.loadMonth(month);
    loadPaymentSources();
  });
  
  onDestroy(() => {
    detailedMonth.clear();
  });
  
  // Reload when month changes
  $: if (month) {
    detailedMonth.loadMonth(month);
    monthsStore.loadMonth(month);
  }
  
  // Toggle width mode (cycles through small -> medium -> wide)
  function toggleWidthMode() {
    widthMode.cycle();
  }
  
  // Helper: check if a category section is complete (all paid or empty)
  function isSectionComplete(section: { items: { is_paid: boolean }[] }): boolean {
    return section.items.length === 0 || section.items.every(item => item.is_paid);
  }
  
  // Sort sections: incomplete first, complete/empty last
  function sortSections<T extends { items: { is_paid: boolean }[] }>(sections: T[]): T[] {
    return [...sections].sort((a, b) => {
      const aComplete = isSectionComplete(a);
      const bComplete = isSectionComplete(b);
      if (aComplete === bComplete) return 0;
      return aComplete ? 1 : -1;
    });
  }
  
  // Sorted sections (complete/empty at bottom)
  $: sortedBillSections = $detailedMonthData ? sortSections($detailedMonthData.billSections) : [];
  $: sortedIncomeSections = $detailedMonthData ? sortSections($detailedMonthData.incomeSections) : [];
  
  // Refresh all data with scroll position preservation
  function refreshData() {
    // Save current scroll position before refresh
    savedScrollY = window.scrollY;
    restoreScrollAfterLoad = true;
    isRefreshing = true;
    
    detailedMonth.refresh();
    monthsStore.loadMonth(month);
  }
  
  // Restore scroll position after data loads
  $: if ($detailedMonthData && restoreScrollAfterLoad && savedScrollY !== null) {
    restoreScrollPosition();
  }
  
  // Clear isRefreshing when loading completes
  $: if (!$detailedMonthLoading && isRefreshing) {
    isRefreshing = false;
  }
  
  async function restoreScrollPosition() {
    // Wait for Svelte DOM updates
    await tick();
    
    // Wait for browser to complete layout and paint (double RAF ensures all children painted)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (savedScrollY !== null) {
          window.scrollTo(0, savedScrollY);
          savedScrollY = null;
          restoreScrollAfterLoad = false;
        }
      });
    });
  }
  
  // Create month data
  let creating = false;
  async function handleCreateMonth() {
    creating = true;
    try {
      const created = await monthsStore.createMonth(month);
      if (created) {
        success(`Month ${month} created`);
        // Reload detailed view
        detailedMonth.loadMonth(month);
      }
    } catch (error) {
      showError('Failed to create month');
    } finally {
      creating = false;
    }
  }
</script>

<div class="detailed-view" class:compact={$compactMode}>
  <div class="content-wrapper"
    class:small={$widthMode === 'small'} 
    class:medium={$widthMode === 'medium'}
    class:wide={$widthMode === 'wide'}
  >
    <header class="view-header">
    <div class="header-content">
      <a href="/" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Dashboard
      </a>
      <div class="month-nav">
        <button class="nav-arrow" on:click={navigateToPrev} title="Previous month">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h1>{formatMonthDisplay(month)}</h1>
        <button class="nav-arrow" on:click={navigateToNext} title="Next month">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    
    {#if $detailedMonthData}
      <div class="header-summary">
        <!-- Width toggle (cycles: small -> medium -> wide) -->
        <button 
          class="width-toggle" 
          on:click={toggleWidthMode}
          title={$widthMode === 'small' ? 'Small width (click for medium)' : $widthMode === 'medium' ? 'Medium width (click for wide)' : 'Wide (click for small)'}
        >
          {#if $widthMode === 'small'}
            <!-- Small icon: narrow box -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="7" y="4" width="10" height="16" rx="1" stroke="currentColor" stroke-width="2"/>
            </svg>
          {:else if $widthMode === 'medium'}
            <!-- Medium icon: medium box -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" stroke-width="2"/>
            </svg>
          {:else}
            <!-- Wide icon: full width with arrows -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 4V20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M20 4V20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 12L11 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 12L11 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 12L13 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 12L13 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {/if}
        </button>
        <!-- Compact toggle -->
        <button class="compact-toggle" on:click={() => compactMode.toggle()} title={$compactMode ? 'Normal view' : 'Compact view'}>
          {#if $compactMode}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 8h16M4 16h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          {/if}
        </button>
        <!-- Refresh button -->
        <button class="refresh-toggle" on:click={refreshData} title="Refresh data">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <polyline points="23 4 23 10 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="1 20 1 14 7 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    {/if}
  </header>
  
  {#if $monthIsReadOnly && $monthExists}
    <div class="read-only-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>This month is locked. Unlock it from Manage Months to make changes.</span>
    </div>
  {/if}

  
  {#if $detailedMonthLoading && !isRefreshing && !$detailedMonthData}
    <div class="loading-state">
      <p>Loading detailed view...</p>
    </div>
  {:else if !$monthExists}
    <!-- Month not created prompt -->
    <div class="create-month-prompt">
      <div class="prompt-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M3 10H21" stroke="currentColor" stroke-width="2"/>
          <path d="M8 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h2>Month Not Created</h2>
      <p>{formatMonthDisplay(month)} doesn't exist yet.</p>
      <p class="prompt-hint">Create this month to start tracking bills, income, and expenses.</p>
      <button 
        class="btn btn-primary" 
        on:click={handleCreateMonth}
        disabled={creating}
      >
        {creating ? 'Creating...' : 'Create Month'}
      </button>
    </div>
  {:else if $detailedMonthError}
    <div class="error-state">
      <p>{$detailedMonthError}</p>
      <button on:click={() => detailedMonth.loadMonth(month)}>Retry</button>
    </div>
  {:else if $detailedMonthData}
    <div class="detailed-layout">
      <!-- Left: Summary Sidebar -->
      <SummarySidebar 
        paymentSources={$paymentSources}
        bankBalances={$detailedMonthData.bankBalances}
        tallies={$detailedMonthData.tallies}
        leftoverBreakdown={$detailedMonthData.leftoverBreakdown}
        payoffSummaries={$detailedMonthData.payoffSummaries ?? []}
        {month}
        readOnly={$monthIsReadOnly}
        on:refresh={refreshData}
      />
      
      <!-- Right: Main Content -->
      <div class="main-content">
        <div class="sections-container">
          <!-- Bills Section -->
          <section class="section bills-section">
            <div class="section-header">
              <h2>Bills</h2>
            </div>
            
            {#if sortedBillSections.length === 0}
              <p class="empty-text">No bill categories. Add categories in Setup.</p>
            {:else}
              {#each sortedBillSections as section (section.category.id)}
                <CategorySection {section} type="bills" {month} compactMode={$compactMode} readOnly={$monthIsReadOnly} onTogglePaid={handleToggleBillPaid} on:refresh={refreshData} />
              {/each}
            {/if}
          </section>
          
          <!-- Income Section -->
          <section class="section income-section">
            <div class="section-header">
              <h2>Income</h2>
            </div>
            
            {#if sortedIncomeSections.length === 0}
              <p class="empty-text">No income categories. Add categories in Setup.</p>
            {:else}
              {#each sortedIncomeSections as section (section.category.id)}
                <CategorySection {section} type="income" {month} compactMode={$compactMode} readOnly={$monthIsReadOnly} onTogglePaid={handleToggleIncomePaid} on:refresh={refreshData} />
              {/each}
            {/if}
          </section>
        </div>
      </div>
    </div>
  {/if}
  </div>
</div>

<style>
  .detailed-view {
    padding: 20px;
  }
  
  .content-wrapper {
    /* Container query context for responsive internal layout */
    container-type: inline-size;
    container-name: content;
    /* Centering: account for 220px nav, center in remaining space */
    max-width: 1800px;
    width: 100%;
    margin-left: max(0px, calc(50vw - 150px - 900px));
    margin-right: auto;
    transition: max-width 0.3s ease, margin 0.3s ease;
  }
  
  .content-wrapper.small {
    max-width: 1000px;
    margin-left: max(0px, calc(50vw - 350px - 500px));
  }
  
  .content-wrapper.medium {
    max-width: 1800px;
    margin-left: max(0px, calc(50vw - 150px - 900px));
  }
  
  .content-wrapper.wide {
    max-width: 100%;
    margin-left: 0;
    margin-right: 0;
  }
  
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .header-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #888;
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
  }
  
  .back-link:hover {
    color: #24c8db;
  }
  
  .month-nav {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .nav-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #333355;
    border-radius: 8px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .nav-arrow:hover {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
    color: #24c8db;
  }
  
  .view-header h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #e4e4e7;
  }
  
  .header-summary {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .compact-toggle,
  .width-toggle,
  .refresh-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #333355;
    border-radius: 6px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .compact-toggle:hover,
  .width-toggle:hover,
  .refresh-toggle:hover {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
    color: #24c8db;
  }
  
  .leftover-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 12px 20px;
    background: rgba(74, 222, 128, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(74, 222, 128, 0.2);
  }
  
  .leftover-display.negative {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.2);
  }
  
  .leftover-label {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .leftover-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #4ade80;
  }
  
  .leftover-display.negative .leftover-value {
    color: #f87171;
  }
  
  .leftover-display.muted {
    background: rgba(255, 255, 255, 0.03);
    border-color: #333355;
  }
  
  .leftover-hint {
    font-size: 0.875rem;
    color: #666;
    font-style: italic;
  }
  
  /* Main layout with sidebar */
  .detailed-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 24px;
    align-items: start;
  }
  
  .main-content {
    min-width: 0; /* Prevent grid blowout */
  }
  
  .sections-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .section {
    background: #1a1a2e;
    border-radius: 16px;
    border: 1px solid #333355;
    padding: 24px;
    min-width: 0; /* Prevent grid blowout */
    overflow-x: hidden; /* Prevent horizontal scrollbar */
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .loading-state, .error-state {
    text-align: center;
    padding: 60px 20px;
    color: #888;
  }
  
  .error-state {
    color: #f87171;
  }
  
  .error-state button {
    margin-top: 16px;
    padding: 8px 16px;
    background: #24c8db;
    border: none;
    border-radius: 6px;
    color: #000;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .error-state button:hover {
    opacity: 0.9;
  }
  
  .empty-text {
    color: #666;
    text-align: center;
    padding: 40px 20px;
  }
  
  /* Create month prompt styles */
  .create-month-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    background: #1a1a2e;
    border-radius: 16px;
    border: 1px solid #333355;
  }
  
  .prompt-icon {
    color: #888;
    margin-bottom: 16px;
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
    font-size: 0.875rem !important;
    color: #666 !important;
    margin-bottom: 20px !important;
  }
  
  .btn {
    padding: 12px 24px;
    border-radius: 8px;
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
  
  /* Read-only banner styles */
  .read-only-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 8px;
    margin-bottom: 20px;
    color: #fbbf24;
  }
  
  .read-only-banner svg {
    flex-shrink: 0;
  }
  
  .read-only-banner span {
    font-size: 0.875rem;
  }
  
  /* Responsive: stack on smaller screens */
  @media (max-width: 900px) {
    .detailed-layout {
      grid-template-columns: 1fr;
    }
  }
  
  /* Container query: 2-column layout when content-wrapper is wide enough */
  @container content (min-width: 900px) {
    .sections-container {
      grid-template-columns: 1fr 1fr;
    }
  }
  
  /* Compact mode styles */
  .detailed-view.compact {
    padding: 12px;
  }
  
  .detailed-view.compact .view-header {
    margin-bottom: 16px;
    gap: 8px;
  }
  
  .detailed-view.compact .view-header h1 {
    font-size: 1.25rem;
  }
  
  .detailed-view.compact .nav-arrow {
    width: 28px;
    height: 28px;
  }
  
  .detailed-view.compact .leftover-display {
    padding: 8px 12px;
  }
  
  .detailed-view.compact .leftover-value {
    font-size: 1.1rem;
  }
  
  .detailed-view.compact .detailed-layout {
    gap: 16px;
  }
  
  .detailed-view.compact .sections-container {
    gap: 16px;
  }
  
  .detailed-view.compact .section {
    padding: 12px;
    border-radius: 10px;
  }
  
  .detailed-view.compact .section-header {
    margin-bottom: 10px;
    gap: 8px;
  }
  
  .detailed-view.compact .section-header h2 {
    font-size: 1rem;
  }
  
  .detailed-view.compact .empty-text {
    padding: 20px 12px;
  }
</style>
