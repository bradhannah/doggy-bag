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
    variableExpenses
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
  
  // Computed totals
  $: billsTotal = $billInstances.reduce((sum, bill) => sum + bill.amount, 0);
  $: incomeTotal = $incomeInstances.reduce((sum, income) => sum + income.amount, 0);
  $: expensesTotal = $variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
</script>

<div class="dashboard">
  <header class="dashboard-header">
    <h1>Dashboard</h1>
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
        totalCash={$totalCash}
        totalCreditDebt={$totalCreditDebt}
        netWorth={$netWorth}
        loading={$monthlyLoading}
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
