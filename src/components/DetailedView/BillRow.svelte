<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BillInstanceDetailed } from '../../stores/detailed-month';
  import { detailedMonth } from '../../stores/detailed-month';
  import TransactionsDrawer from './TransactionsDrawer.svelte';
  import MakeRegularDrawer from './MakeRegularDrawer.svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  
  export let bill: BillInstanceDetailed;
  export let month: string = '';
  export let compactMode: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let showTransactionsDrawer = false;
  let showMakeRegularDrawer = false;
  let isEditingExpected = false;
  let expectedEditValue = '';
  let saving = false;
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }
  
  // Computed values
  $: hasTransactions = (bill.payments && bill.payments.length > 0) || bill.total_paid > 0;
  $: transactionCount = bill.payments?.length ?? 0;
  $: isClosed = (bill as any).is_closed ?? false;
  $: closedDate = (bill as any).closed_date ?? null;
  $: showAmber = bill.total_paid !== bill.expected_amount && bill.total_paid > 0;
  $: isPartiallyPaid = hasTransactions && bill.total_paid > 0 && bill.total_paid < bill.expected_amount && !isClosed;
  
  // Actions
  async function handlePayFull() {
    if (saving) return;
    saving = true;
    
    try {
      // Add payment for remaining amount
      const paymentAmount = bill.remaining > 0 ? bill.remaining : bill.expected_amount;
      const today = new Date().toISOString().split('T')[0];
      
      await apiClient.post(`/api/months/${month}/bills/${bill.id}/payments`, {
        amount: paymentAmount,
        date: today
      });
      
      // Close the bill
      await apiClient.post(`/api/months/${month}/bills/${bill.id}/close`, {});
      
      success('Bill paid and closed');
      // Optimistic update - update totals and close status without re-sorting
      const newTotalPaid = bill.total_paid + paymentAmount;
      detailedMonth.updateBillClosedStatus(bill.id, true, newTotalPaid);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to pay bill');
    } finally {
      saving = false;
    }
  }
  
  async function handleClose() {
    if (saving) return;
    saving = true;
    
    try {
      await apiClient.post(`/api/months/${month}/bills/${bill.id}/close`, {});
      success('Bill closed');
      // Optimistic update - close without re-sorting
      detailedMonth.updateBillClosedStatus(bill.id, true);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to close bill');
    } finally {
      saving = false;
    }
  }
  
  async function handleReopen() {
    if (saving) return;
    saving = true;
    
    try {
      await apiClient.post(`/api/months/${month}/bills/${bill.id}/reopen`, {});
      success('Bill reopened');
      // Optimistic update - reopen without re-sorting
      detailedMonth.updateBillClosedStatus(bill.id, false);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to reopen bill');
    } finally {
      saving = false;
    }
  }
  
  function startEditingExpected() {
    if (isClosed) return;
    expectedEditValue = (bill.expected_amount / 100).toFixed(2);
    isEditingExpected = true;
  }
  
  async function saveExpectedAmount() {
    const newAmount = parseDollarsToCents(expectedEditValue);
    if (newAmount === bill.expected_amount) {
      isEditingExpected = false;
      return;
    }
    
    if (newAmount <= 0) {
      showError('Amount must be greater than 0');
      return;
    }
    
    saving = true;
    try {
      await apiClient.putPath(`/api/months/${month}/bills/${bill.id}/expected`, {
        amount: newAmount
      });
      success('Expected amount updated');
      isEditingExpected = false;
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update amount');
    } finally {
      saving = false;
    }
  }
  
  function cancelEditingExpected() {
    isEditingExpected = false;
    expectedEditValue = '';
  }
  
  function handleExpectedKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveExpectedAmount();
    } else if (event.key === 'Escape') {
      cancelEditingExpected();
    }
  }
  
  function openTransactionsDrawer() {
    showTransactionsDrawer = true;
  }
  
  function handleMakeRegular() {
    showMakeRegularDrawer = true;
  }
  
  function handleConverted() {
    dispatch('refresh');
  }
  
  function handleTransactionsUpdated() {
    dispatch('refresh');
  }
</script>

<div class="bill-row-container">
  <div 
    class="bill-row" 
    class:closed={isClosed} 
    class:overdue={bill.is_overdue && !isClosed} 
    class:adhoc={bill.is_adhoc} 
    class:partial={isPartiallyPaid} 
    class:compact={compactMode}
  >
    <div class="bill-main">
      <div class="bill-info">
        <span class="bill-name" class:closed-text={isClosed}>
          {bill.name}
          {#if bill.is_adhoc}
            <span class="badge adhoc-badge">ad-hoc</span>
            <button class="make-regular-link" on:click={handleMakeRegular}>
              Make Regular
            </button>
          {/if}
          {#if isPartiallyPaid}
            <span class="badge partial-badge">partial</span>
          {/if}
          {#if bill.is_overdue && !isClosed}
            <span class="badge overdue-badge">
              {bill.days_overdue} day{bill.days_overdue !== 1 ? 's' : ''} overdue
            </span>
          {/if}
        </span>
        
        <!-- Show "Paid: date" when closed, otherwise show due date -->
        {#if isClosed && closedDate}
          <span class="bill-closed-date">Paid: {formatDate(closedDate)}</span>
        {:else if bill.due_date}
          <span class="bill-due" class:overdue-text={bill.is_overdue}>
            Due: {formatDate(bill.due_date)}
          </span>
        {/if}
        
        {#if bill.payment_source}
          <span class="bill-source">{bill.payment_source.name}</span>
        {/if}
      </div>
    </div>
    
    <div class="bill-amounts">
      <!-- Expected amount (clickable for inline edit) -->
      <div class="amount-column">
        <span class="amount-label">Expected</span>
        {#if isEditingExpected}
          <div class="inline-edit">
            <span class="prefix">$</span>
            <input
              type="text"
              bind:value={expectedEditValue}
              on:keydown={handleExpectedKeydown}
              on:blur={saveExpectedAmount}
              disabled={saving}
              autofocus
            />
          </div>
        {:else}
          <button 
            class="amount-value clickable" 
            class:disabled={isClosed}
            on:click={startEditingExpected}
            title={isClosed ? 'Reopen to edit' : 'Click to edit'}
          >
            {formatCurrency(bill.expected_amount)}
          </button>
        {/if}
      </div>
      
      <!-- Actual/Paid amount (clickable to open drawer, shows transaction count) -->
      <div class="amount-column">
        <span class="amount-label">
          Paid
          {#if transactionCount > 0}
            <span class="payment-count">({transactionCount})</span>
          {/if}
        </span>
        {#if hasTransactions}
          <button 
            class="amount-value clickable" 
            class:amber={showAmber}
            on:click={openTransactionsDrawer}
            title="View transactions"
          >
            {formatCurrency(bill.total_paid)}
          </button>
        {:else}
          <button class="add-payment-link" on:click={openTransactionsDrawer}>
            Add Payment
          </button>
        {/if}
      </div>
      
      <!-- Remaining amount -->
      <div class="amount-column">
        <span class="amount-label">Remaining</span>
        <span class="amount-value remaining" class:zero={bill.remaining === 0}>
          {formatCurrency(bill.remaining)}
        </span>
      </div>
      
      <!-- Action buttons -->
      <div class="action-buttons">
        {#if isClosed}
          <button class="action-btn reopen" on:click={handleReopen} disabled={saving}>
            Reopen
          </button>
        {:else if hasTransactions}
          <button class="action-btn close" on:click={handleClose} disabled={saving}>
            Close
          </button>
        {:else if month}
          <button class="action-btn pay-full" on:click={handlePayFull} disabled={saving}>
            Pay Full
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Transactions Drawer -->
<TransactionsDrawer
  bind:open={showTransactionsDrawer}
  {month}
  instanceId={bill.id}
  instanceName={bill.name}
  expectedAmount={bill.expected_amount}
  transactionList={bill.payments || []}
  isClosed={isClosed}
  type="bill"
  on:updated={handleTransactionsUpdated}
/>

<!-- Make Regular Drawer (for ad-hoc items) -->
{#if bill.is_adhoc}
  <MakeRegularDrawer
    bind:open={showMakeRegularDrawer}
    {month}
    type="bill"
    instanceId={bill.id}
    instanceName={bill.name}
    instanceAmount={bill.actual_amount || bill.expected_amount}
    on:converted={handleConverted}
    on:close={() => showMakeRegularDrawer = false}
  />
{/if}

<style>
  .bill-row-container {
    margin-bottom: 4px;
  }
  
  .bill-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }
  
  .bill-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  
  .bill-row.closed {
    background: rgba(74, 222, 128, 0.05);
    opacity: 0.7;
  }
  
  .bill-row.partial {
    border-left: 3px solid #f59e0b;
  }
  
  .bill-row.overdue:not(.partial) {
    border-left: 3px solid #f87171;
  }
  
  .bill-row.adhoc:not(.partial):not(.overdue) {
    border-left: 3px solid #a78bfa;
  }
  
  .bill-main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  
  .bill-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  
  .bill-name {
    font-weight: 500;
    color: #e4e4e7;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .closed-text {
    text-decoration: line-through;
    opacity: 0.6;
  }
  
  .badge {
    font-size: 0.625rem;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .adhoc-badge {
    background: rgba(167, 139, 250, 0.2);
    color: #a78bfa;
  }
  
  .make-regular-link {
    background: none;
    border: none;
    color: #a78bfa;
    font-size: 0.7rem;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    opacity: 0.8;
    transition: opacity 0.2s;
  }
  
  .make-regular-link:hover {
    opacity: 1;
  }
  
  .partial-badge {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  
  .overdue-badge {
    background: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }
  
  .bill-due {
    font-size: 0.75rem;
    color: #888;
  }
  
  .bill-closed-date {
    font-size: 0.75rem;
    color: #4ade80;
  }
  
  .overdue-text {
    color: #f87171;
  }
  
  .bill-source {
    font-size: 0.7rem;
    color: #666;
  }
  
  .bill-amounts {
    display: flex;
    gap: 24px;
    align-items: center;
    flex-shrink: 0;
  }
  
  .amount-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 80px;
  }
  
  .amount-label {
    font-size: 0.625rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .payment-count {
    color: #f59e0b;
  }
  
  .amount-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e4e4e7;
    background: none;
    border: none;
    padding: 0;
    cursor: default;
  }
  
  .amount-value.clickable {
    cursor: pointer;
    transition: color 0.2s;
  }
  
  .amount-value.clickable:hover:not(.disabled) {
    color: #24c8db;
    text-decoration: underline;
  }
  
  .amount-value.clickable.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .amount-value.amber {
    color: #f59e0b;
  }
  
  .amount-value.remaining {
    color: #888;
  }
  
  .amount-value.remaining.zero {
    color: #4ade80;
  }
  
  .add-payment-link {
    background: none;
    border: none;
    color: #24c8db;
    font-size: 0.8rem;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    transition: opacity 0.2s;
  }
  
  .add-payment-link:hover {
    opacity: 0.8;
  }
  
  .inline-edit {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  .inline-edit .prefix {
    color: #888;
    font-size: 0.85rem;
  }
  
  .inline-edit input {
    width: 70px;
    padding: 2px 4px;
    background: #0f0f1a;
    border: 1px solid #24c8db;
    border-radius: 4px;
    color: #e4e4e7;
    font-size: 0.85rem;
    font-weight: 600;
    text-align: right;
  }
  
  .inline-edit input:focus {
    outline: none;
  }
  
  .action-buttons {
    display: flex;
    gap: 8px;
    min-width: 80px;
    justify-content: flex-end;
  }
  
  .action-btn {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .action-btn.pay-full {
    background: #24c8db;
    border: none;
    color: #000;
  }
  
  .action-btn.pay-full:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .action-btn.close {
    background: transparent;
    border: 1px solid #4ade80;
    color: #4ade80;
  }
  
  .action-btn.close:hover:not(:disabled) {
    background: rgba(74, 222, 128, 0.1);
  }
  
  .action-btn.reopen {
    background: transparent;
    border: 1px solid #888;
    color: #888;
  }
  
  .action-btn.reopen:hover:not(:disabled) {
    border-color: #e4e4e7;
    color: #e4e4e7;
  }
  
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 640px) {
    .bill-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .bill-amounts {
      width: 100%;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    
    .action-buttons {
      width: 100%;
      justify-content: flex-start;
    }
  }
  
  /* Compact mode styles */
  .bill-row.compact {
    padding: 6px 10px;
    gap: 8px;
  }
  
  .bill-row.compact .bill-name {
    font-size: 0.85rem;
  }
  
  .bill-row.compact .badge {
    font-size: 0.55rem;
    padding: 1px 4px;
  }
  
  .bill-row.compact .bill-due,
  .bill-row.compact .bill-closed-date,
  .bill-row.compact .bill-source {
    font-size: 0.65rem;
  }
  
  .bill-row.compact .bill-amounts {
    gap: 12px;
  }
  
  .bill-row.compact .amount-column {
    min-width: 60px;
    gap: 1px;
  }
  
  .bill-row.compact .amount-label {
    font-size: 0.55rem;
  }
  
  .bill-row.compact .amount-value {
    font-size: 0.8rem;
  }
  
  .bill-row.compact .action-btn {
    padding: 4px 8px;
    font-size: 0.65rem;
  }
  
  .bill-row.compact .action-buttons {
    min-width: 60px;
  }
</style>
