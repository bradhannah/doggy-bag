<script lang="ts">
  import { onMount } from 'svelte';
  import MonthSelector from './MonthSelector.svelte';
  import LeftoverCard from './LeftoverCard.svelte';
  import SummaryCards from './SummaryCards.svelte';
  import PaymentSourcesCard from './PaymentSourcesCard.svelte';
  import ExpensesCard from './ExpensesCard.svelte';
  import BillsCard from './BillsCard.svelte';
  import IncomesCard from './IncomesCard.svelte';
  import { currentMonth } from '../../stores/ui';
  import { 
    monthsStore, 
    monthlyLoading, 
    leftover, 
    totalIncome, 
    totalExpenses, 
    netWorth,
    totalCash,
    totalCreditDebt,
    billInstances,
    incomeInstances,
    variableExpenses,
    bankBalances
  } from '../../stores/months';
  import { paymentSources, loadPaymentSources } from '../../stores/payment-sources';
  
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
  
  // Computed totals
  $: billsTotal = $billInstances.reduce((sum, bill) => sum + bill.amount, 0);
  $: incomeTotal = $incomeInstances.reduce((sum, income) => sum + income.amount, 0);
  $: expensesTotal = $variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
</script>

<div class="dashboard">
  <header class="dashboard-header">
    <div class="header-left">
      <h1>Dashboard</h1>
      {#if $currentMonth}
        <a href="/month/{$currentMonth}" class="view-details-link">
          View Details
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      {/if}
    </div>
    <MonthSelector />
  </header>
  
  <main class="dashboard-content">
    <section class="leftover-section">
      <LeftoverCard leftover={$leftover} loading={$monthlyLoading} />
    </section>
    
    <section class="summary-section">
      <SummaryCards 
        totalIncome={$totalIncome} 
        totalExpenses={$totalExpenses} 
        netWorth={$netWorth}
        loading={$monthlyLoading}
      />
    </section>
    
    <section class="payment-sources-section">
      <PaymentSourcesCard
        paymentSources={$paymentSources}
        bankBalances={$bankBalances}
        month={$currentMonth}
        loading={$monthlyLoading}
        on:updateBalances={handleUpdateBalances}
      />
    </section>
    
    <section class="breakdown-section">
      <div class="breakdown-grid">
        <BillsCard
          bills={$billInstances}
          month={$currentMonth}
          loading={$monthlyLoading}
          total={billsTotal}
          on:refresh={handleRefresh}
        />
        
        <IncomesCard
          incomes={$incomeInstances}
          month={$currentMonth}
          loading={$monthlyLoading}
          total={incomeTotal}
          on:refresh={handleRefresh}
        />
      </div>
    </section>
    
    <section class="expenses-section">
      <ExpensesCard 
        expenses={$variableExpenses}
        month={$currentMonth}
        loading={$monthlyLoading}
        total={expensesTotal}
        paymentSources={$paymentSources}
        on:refresh={handleRefresh}
      />
    </section>
  </main>
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
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
  
  .view-details-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(36, 200, 219, 0.1);
    border: 1px solid rgba(36, 200, 219, 0.3);
    border-radius: 6px;
    color: #24c8db;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .view-details-link:hover {
    background: rgba(36, 200, 219, 0.2);
    border-color: #24c8db;
  }
  
  .dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .breakdown-section {
    margin-top: 8px;
  }
  
  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }
  
  @media (max-width: 768px) {
    .dashboard {
      padding: 16px;
    }
    
    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
