<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BillInstanceDetailed, IncomeInstanceDetailed, Occurrence } from '../../stores/detailed-month';
  import OccurrenceRow from './OccurrenceRow.svelte';
  import TransactionsDrawer from './TransactionsDrawer.svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  
  export let item: BillInstanceDetailed | IncomeInstanceDetailed;
  export let type: 'bill' | 'income' = 'bill';
  export let month: string = '';
  export let readOnly: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Check if this is a payoff bill (only relevant for bills)
  $: isPayoffBill = type === 'bill' && (item as BillInstanceDetailed).is_payoff_bill === true;
  
  let showTransactionsDrawer = false;
  let selectedOccurrence: Occurrence | null = null;
  let addingOccurrence = false;
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  function formatBillingPeriod(period: string): string {
    switch (period) {
      case 'bi_weekly': return 'Bi-Weekly';
      case 'weekly': return 'Weekly';
      case 'semi_annually': return 'Semi-Annually';
      default: return 'Monthly';
    }
  }
  
  // Computed values
  $: occurrences = item.occurrences || [];
  $: occurrenceCount = item.occurrence_count || occurrences.length;
  $: isExtraOccurrenceMonth = item.is_extra_occurrence_month;
  $: totalExpected = occurrences.reduce((sum, occ) => sum + occ.expected_amount, 0);
  $: totalPaid = occurrences.reduce((sum, occ) => 
    sum + occ.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  $: closedCount = occurrences.filter(occ => occ.is_closed).length;
  $: allClosed = closedCount === occurrences.length && occurrences.length > 0;
  $: isClosed = (item as any).is_closed ?? allClosed;
  
  // Handle occurrence payment drawer
  function handleOpenPayments(event: CustomEvent<{ occurrence: Occurrence }>) {
    selectedOccurrence = event.detail.occurrence;
    showTransactionsDrawer = true;
  }
  
  function handleTransactionsUpdated() {
    showTransactionsDrawer = false;
    selectedOccurrence = null;
    dispatch('refresh');
  }
  
  function handleOccurrenceUpdated() {
    dispatch('refresh');
  }
  
  // Add ad-hoc occurrence
  async function handleAddOccurrence() {
    if (addingOccurrence || readOnly) return;
    addingOccurrence = true;
    
    try {
      // Default to end of month for new occurrence
      const [year, monthNum] = month.split('-').map(Number);
      const lastDay = new Date(year, monthNum, 0).getDate();
      const defaultDate = `${month}-${lastDay.toString().padStart(2, '0')}`;
      
      await apiClient.post(`/api/months/${month}/${type}s/${item.id}/occurrences`, {
        expected_date: defaultDate,
        expected_amount: item.expected_amount // Full amount
      });
      
      success('Occurrence added');
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add occurrence');
    } finally {
      addingOccurrence = false;
    }
  }
</script>

<div class="occurrence-card" class:closed={isClosed}>
  <!-- Card Header -->
  <div class="card-header">
    <div class="header-info">
      <span class="item-name" class:closed-text={isClosed}>
        {item.name}
        <span class="billing-badge">{formatBillingPeriod(item.billing_period)}</span>
      </span>
      <span class="occurrence-summary">
        {occurrenceCount} {type === 'bill' ? 'payment' : 'receipt'}{occurrenceCount !== 1 ? 's' : ''}
        {#if closedCount > 0}
          <span class="closed-count">({closedCount}/{occurrenceCount} closed)</span>
        {/if}
      </span>
    </div>
    
    <div class="header-totals">
      <div class="total-column">
        <span class="total-label">Total Expected</span>
        <span class="total-value">{formatCurrency(totalExpected)}</span>
      </div>
      <div class="total-column">
        <span class="total-label">Total {type === 'bill' ? 'Paid' : 'Received'}</span>
        <span class="total-value" class:amber={totalPaid !== totalExpected && totalPaid > 0}>
          {totalPaid > 0 ? formatCurrency(totalPaid) : '-'}
        </span>
      </div>
    </div>
  </div>
  
  <!-- Extra Occurrence Banner (3-paycheck month) -->
  {#if isExtraOccurrenceMonth}
    <div class="extra-banner">
      <span class="extra-icon">*</span>
      <span class="extra-text">
        {occurrenceCount}-{type === 'bill' ? 'payment' : 'paycheck'} month! 
        Extra {formatCurrency(item.expected_amount / occurrenceCount)} this month.
      </span>
    </div>
  {/if}
  
  <!-- Occurrences List -->
  <div class="occurrences-list">
    {#each occurrences.sort((a, b) => a.sequence - b.sequence) as occurrence (occurrence.id)}
      <OccurrenceRow
        {occurrence}
        {month}
        instanceId={item.id}
        {type}
        {readOnly}
        {isPayoffBill}
        on:updated={handleOccurrenceUpdated}
        on:openPayments={handleOpenPayments}
      />
    {/each}
  </div>
  
  <!-- Add Occurrence Button (hidden for payoff bills since they're auto-generated) -->
  {#if !readOnly && !isPayoffBill}
    <div class="card-footer">
      <button 
        class="add-occurrence-btn" 
        on:click={handleAddOccurrence} 
        disabled={addingOccurrence}
      >
        + Add Occurrence
      </button>
    </div>
  {/if}
</div>

<!-- Transactions Drawer for selected occurrence -->
{#if selectedOccurrence}
  <TransactionsDrawer
    bind:open={showTransactionsDrawer}
    {month}
    instanceId={item.id}
    instanceName="{item.name} - {new Date(selectedOccurrence.expected_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}"
    expectedAmount={selectedOccurrence.expected_amount}
    transactionList={selectedOccurrence.payments || []}
    isClosed={selectedOccurrence.is_closed}
    type={type === 'bill' ? 'bill' : 'income'}
    occurrenceId={selectedOccurrence.id}
    {isPayoffBill}
    on:updated={handleTransactionsUpdated}
  />
{/if}

<style>
  .occurrence-card {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    overflow: hidden;
    margin-bottom: 8px;
  }
  
  .occurrence-card.closed {
    opacity: 0.7;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .header-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .item-name {
    font-weight: 600;
    font-size: 1rem;
    color: #e4e4e7;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .closed-text {
    text-decoration: line-through;
    opacity: 0.6;
  }
  
  .billing-badge {
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(36, 200, 219, 0.15);
    color: #24c8db;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .occurrence-summary {
    font-size: 0.75rem;
    color: #888;
  }
  
  .closed-count {
    color: #4ade80;
  }
  
  .header-totals {
    display: flex;
    gap: 24px;
  }
  
  .total-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  
  .total-label {
    font-size: 0.6rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .total-value {
    font-size: 1rem;
    font-weight: 700;
    color: #e4e4e7;
  }
  
  .total-value.amber {
    color: #f59e0b;
  }
  
  .extra-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(74, 222, 128, 0.1);
    border-bottom: 1px solid rgba(74, 222, 128, 0.2);
  }
  
  .extra-icon {
    font-size: 1.2rem;
    color: #4ade80;
  }
  
  .extra-text {
    font-size: 0.8rem;
    color: #4ade80;
    font-weight: 500;
  }
  
  .occurrences-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
  }
  
  .card-footer {
    padding: 8px 16px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
  }
  
  .add-occurrence-btn {
    background: transparent;
    border: 1px dashed #555;
    color: #888;
    font-size: 0.75rem;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .add-occurrence-btn:hover:not(:disabled) {
    border-color: #24c8db;
    color: #24c8db;
    background: rgba(36, 200, 219, 0.05);
  }
  
  .add-occurrence-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 640px) {
    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .header-totals {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
