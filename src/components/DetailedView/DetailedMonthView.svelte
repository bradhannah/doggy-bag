<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { detailedMonth, detailedMonthData, detailedMonthLoading, detailedMonthError } from '../../stores/detailed-month';
  import CategorySection from './CategorySection.svelte';
  import SummarySidebar from './SummarySidebar.svelte';
  import VariableExpensesSection from './VariableExpensesSection.svelte';
  import { success, error as showError } from '../../stores/toast';
  import { wideMode } from '../../stores/ui';
  import { paymentSources, loadPaymentSources } from '../../stores/payment-sources';
  import { variableExpenses, monthsStore } from '../../stores/months';
  import { apiUrl } from '$lib/api/client';
  
  export let month: string;
  
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
  
  $: leftoverClass = $detailedMonthData?.leftover && $detailedMonthData.leftover < 0 ? 'negative' : 'positive';
  
  // Compact mode state
  let compactMode = false;
  
  // Calculate variable expenses total for sidebar
  $: variableExpensesTotal = $variableExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Toggle width mode
  function toggleWideMode() {
    wideMode.toggle();
  }
  
  // Refresh all data
  function refreshData() {
    detailedMonth.refresh();
    monthsStore.loadMonth(month);
  }
</script>

<div class="detailed-view" class:compact={compactMode} class:wide={$wideMode}>
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
        <!-- Width toggle -->
        <button 
          class="width-toggle" 
          on:click={toggleWideMode}
          title={$wideMode ? 'Normal width' : 'Wide mode'}
        >
          {#if $wideMode}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 4H5C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M15 4H19C19.5523 4 20 4.44772 20 5V19C20 19.5523 19.5523 20 19 20H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 9L9 12L12 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 9L15 12L12 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 4H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M4 20H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M16 4H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M16 20H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M4 4V20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M20 4V20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M9 12L12 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 12L12 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M15 12L12 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M15 12L12 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {/if}
        </button>
        <!-- Compact toggle -->
        <button class="compact-toggle" on:click={() => compactMode = !compactMode} title={compactMode ? 'Normal view' : 'Compact view'}>
          {#if compactMode}
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
        {#if $detailedMonthData.leftoverBreakdown.hasActuals}
          <div class="leftover-display" class:negative={leftoverClass === 'negative'}>
            <span class="leftover-label">Leftover</span>
            <span class="leftover-value">{formatCurrency($detailedMonthData.leftover)}</span>
          </div>
        {:else}
          <div class="leftover-display muted">
            <span class="leftover-label">Leftover</span>
            <span class="leftover-hint">Enter actuals</span>
          </div>
        {/if}
      </div>
    {/if}
  </header>
  
  {#if $detailedMonthLoading}
    <div class="loading-state">
      <p>Loading detailed view...</p>
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
        {variableExpensesTotal}
      />
      
      <!-- Right: Main Content -->
      <div class="main-content">
        <div class="sections-container">
          <!-- Bills Section -->
          <section class="section bills-section">
            <div class="section-header">
              <h2>Bills</h2>
            </div>
            
            {#if $detailedMonthData.billSections.length === 0}
              <p class="empty-text">No bills for this month.</p>
            {:else}
              {#each $detailedMonthData.billSections.filter(s => s.items.length > 0) as section (section.category.id)}
                <CategorySection {section} type="bills" {month} {compactMode} onTogglePaid={handleToggleBillPaid} on:refresh={refreshData} />
              {/each}
            {/if}
            
            <!-- Variable Expenses Section -->
            <VariableExpensesSection 
              expenses={$variableExpenses}
              {month}
              paymentSources={$paymentSources}
              {compactMode}
              on:refresh={refreshData}
            />
          </section>
          
          <!-- Income Section -->
          <section class="section income-section">
            <div class="section-header">
              <h2>Income</h2>
            </div>
            
            {#if $detailedMonthData.incomeSections.length === 0}
              <p class="empty-text">No income for this month.</p>
            {:else}
              {#each $detailedMonthData.incomeSections.filter(s => s.items.length > 0) as section (section.category.id)}
                <CategorySection {section} type="income" {month} {compactMode} onTogglePaid={handleToggleIncomePaid} on:refresh={refreshData} />
              {/each}
            {/if}
          </section>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .detailed-view {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    transition: max-width 0.3s ease;
  }
  
  .detailed-view.wide {
    max-width: 100%;
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
  
  /* Responsive: stack on smaller screens */
  @media (max-width: 900px) {
    .detailed-layout {
      grid-template-columns: 1fr;
    }
  }
  
  @media (min-width: 1200px) {
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
