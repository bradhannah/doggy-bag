<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { detailedMonth, detailedMonthData, detailedMonthLoading, detailedMonthError } from '../../stores/detailed-month';
  import CategorySection from './CategorySection.svelte';
  import SectionTally from './SectionTally.svelte';
  import { success, error as showError } from '../../stores/toast';
  
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
  
  async function handleToggleBillPaid(instanceId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/months/${month}/bills/${instanceId}/paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle paid status');
      }
      
      await detailedMonth.refresh();
      success('Bill status updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError(message);
    }
  }
  
  async function handleToggleIncomePaid(instanceId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/months/${month}/incomes/${instanceId}/paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle received status');
      }
      
      await detailedMonth.refresh();
      success('Income status updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError(message);
    }
  }
  
  onMount(() => {
    detailedMonth.loadMonth(month);
  });
  
  onDestroy(() => {
    detailedMonth.clear();
  });
  
  // Reload when month changes
  $: if (month) {
    detailedMonth.loadMonth(month);
  }
  
  $: leftoverClass = $detailedMonthData?.leftover && $detailedMonthData.leftover < 0 ? 'negative' : 'positive';
</script>

<div class="detailed-view">
  <header class="view-header">
    <div class="header-content">
      <a href="/" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Dashboard
      </a>
      <h1>{formatMonthDisplay(month)}</h1>
    </div>
    
    {#if $detailedMonthData}
      <div class="header-summary">
        <div class="leftover-display" class:negative={leftoverClass === 'negative'}>
          <span class="leftover-label">Leftover</span>
          <span class="leftover-value">{formatCurrency($detailedMonthData.leftover)}</span>
        </div>
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
    <div class="sections-container">
      <!-- Bills Section -->
      <section class="section bills-section">
        <div class="section-header">
          <h2>Bills</h2>
          <SectionTally tally={$detailedMonthData.tallies.bills} type="bills" />
        </div>
        
        {#if $detailedMonthData.billSections.length === 0}
          <p class="empty-text">No bills for this month.</p>
        {:else}
          {#each $detailedMonthData.billSections as section (section.category.id)}
            <CategorySection {section} type="bills" {month} onTogglePaid={handleToggleBillPaid} on:refresh={() => detailedMonth.refresh()} />
          {/each}
        {/if}
      </section>
      
      <!-- Income Section -->
      <section class="section income-section">
        <div class="section-header">
          <h2>Income</h2>
          <SectionTally tally={$detailedMonthData.tallies.income} type="income" />
        </div>
        
        {#if $detailedMonthData.incomeSections.length === 0}
          <p class="empty-text">No income for this month.</p>
        {:else}
          {#each $detailedMonthData.incomeSections as section (section.category.id)}
            <CategorySection {section} type="income" {month} onTogglePaid={handleToggleIncomePaid} on:refresh={() => detailedMonth.refresh()} />
          {/each}
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .detailed-view {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
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
  
  .view-header h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #e4e4e7;
  }
  
  .header-summary {
    display: flex;
    align-items: center;
    gap: 24px;
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
  
  .sections-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;
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
  
  @media (min-width: 1024px) {
    .sections-container {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
