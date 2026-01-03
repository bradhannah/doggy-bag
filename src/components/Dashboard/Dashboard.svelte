<script lang="ts">
  import { onMount } from 'svelte';
  import MonthSelector from './MonthSelector.svelte';
  import LeftoverCard from './LeftoverCard.svelte';
  import AccountBalancesCard from '../shared/AccountBalancesCard.svelte';
  import CollapsibleSummarySection from './CollapsibleSummarySection.svelte';
  import { currentMonth, widthMode } from '../../stores/ui';
  import { 
    monthsStore, 
    monthlyLoading, 
    monthExists,
    monthIsReadOnly,
    leftover, 
    billInstances,
    incomeInstances,
    bankBalances
  } from '../../stores/months';
  import { paymentSources, loadPaymentSources } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';
  
  // Load payment sources on mount
  onMount(() => {
    loadPaymentSources();
  });
  
  // Load data when month changes
  $: {
    if ($currentMonth) {
      monthsStore.loadMonth($currentMonth);
    }
  }
  
  // Refresh data after changes
  function handleRefresh() {
    if ($currentMonth) {
      monthsStore.loadMonth($currentMonth);
    }
  }
  
  // Handle bank balance updates
  async function handleUpdateBalances(event: CustomEvent<{ balances: Record<string, number> }>) {
    if ($currentMonth) {
      try {
        await monthsStore.updateBankBalances($currentMonth, event.detail.balances);
        handleRefresh();
      } catch (error) {
        console.error('Failed to update balances:', error);
      }
    }
  }
  
  // Transform bill instances for CollapsibleSummarySection
  $: billItems = $billInstances.map(bill => ({
    id: bill.id,
    name: bill.name,
    expected: bill.amount,
    actual: bill.is_paid ? bill.amount : 0,
    isPaid: bill.is_paid ?? false
  }));
  
  // Transform income instances for CollapsibleSummarySection
  $: incomeItems = $incomeInstances.map(income => ({
    id: income.id,
    name: income.name,
    expected: income.amount,
    actual: income.is_paid ? income.amount : 0,
    isPaid: income.is_paid ?? false
  }));
  
  // Toggle width mode
  function toggleWidthMode() {
    widthMode.cycle();
  }
  
  // Create month data
  let creating = false;
  async function handleCreateMonth() {
    if (!$currentMonth) return;
    creating = true;
    try {
      const created = await monthsStore.createMonth($currentMonth);
      if (created) {
        success(`Month ${$currentMonth} created`);
      }
    } catch (error) {
      showError('Failed to create month');
    } finally {
      creating = false;
    }
  }
  
  // Format month for display
  function formatMonthDisplay(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
</script>

<div class="dashboard" class:small={$widthMode === 'small'} class:medium={$widthMode === 'medium'} class:wide={$widthMode === 'wide'}>
  <header class="dashboard-header">
    <div class="header-left">
      <h1>Dashboard</h1>
    </div>
    <div class="header-right">
      <button 
        class="width-toggle" 
        on:click={toggleWidthMode}
        title={$widthMode === 'small' ? 'Switch to medium width' : $widthMode === 'medium' ? 'Switch to wide mode' : 'Switch to small width'}
      >
        {#if $widthMode === 'wide'}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 4H5C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M15 4H19C19.5523 4 20 4.44772 20 5V19C20 19.5523 19.5523 20 19 20H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 9L9 12L12 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 9L15 12L12 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
      <MonthSelector />
    </div>
  </header>
  
  <main class="dashboard-content">
    {#if $monthlyLoading}
      <div class="loading-state">
        <p>Loading...</p>
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
        <p>{$currentMonth ? formatMonthDisplay($currentMonth) : 'This month'} doesn't exist yet.</p>
        <p class="prompt-hint">Create this month to start tracking bills, income, and expenses.</p>
        <button 
          class="btn btn-primary" 
          on:click={handleCreateMonth}
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Create Month'}
        </button>
      </div>
    {:else}
      <!-- Leftover Card - Top, most important metric -->
      <section class="leftover-section">
        <LeftoverCard leftover={$leftover} loading={$monthlyLoading} />
      </section>
      
      <!-- Account Balances - Editable -->
      <section class="balances-section">
        <AccountBalancesCard
          paymentSources={$paymentSources}
          bankBalances={$bankBalances}
          month={$currentMonth}
          loading={$monthlyLoading}
          on:updateBalances={handleUpdateBalances}
        />
      </section>
      
      <!-- Collapsible Sections - All collapsed by default, read-only -->
      <section class="summary-sections">
        <CollapsibleSummarySection
          title="Income"
          items={incomeItems}
          type="income"
          expanded={false}
        />
        
        <CollapsibleSummarySection
          title="Bills"
          items={billItems}
          type="bills"
          expanded={false}
        />
      </section>
    {/if}
  </main>
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
    transition: max-width 0.3s ease;
  }
  
  .dashboard.small {
    max-width: 900px;
  }
  
  .dashboard.medium {
    max-width: 1200px;
  }
  
  .dashboard.wide {
    max-width: 100%;
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .dashboard-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #e4e4e7;
    margin: 0;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .width-toggle {
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
  
  .width-toggle:hover {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
    color: #24c8db;
  }
  
  .dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .summary-sections {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .loading-state {
    text-align: center;
    padding: 60px 20px;
    color: #888;
  }
  
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
    color: #24c8db;
    margin-bottom: 20px;
  }
  
  .create-month-prompt h2 {
    margin: 0 0 12px;
    font-size: 1.5rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .create-month-prompt p {
    margin: 0 0 8px;
    color: #888;
    font-size: 1rem;
  }
  
  .prompt-hint {
    margin-bottom: 24px !important;
    font-size: 0.875rem !important;
    color: #666 !important;
  }
  
  .btn {
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: #24c8db;
    color: #000;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #1ab0c9;
  }
  
  @media (max-width: 768px) {
    .dashboard {
      padding: 16px;
    }
    
    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .header-right {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
