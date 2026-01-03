<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BillInstanceDetailed } from '../../stores/detailed-month';
  import { detailedMonth } from '../../stores/detailed-month';
  import TransactionsDrawer from './TransactionsDrawer.svelte';
  import MakeRegularDrawer from './MakeRegularDrawer.svelte';
  import CCBalanceSyncModal from './CCBalanceSyncModal.svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import { paymentSources, type PaymentSourceType } from '../../stores/payment-sources';
  
  export let bill: BillInstanceDetailed;
  export let month: string = '';
  export let compactMode: boolean = false;
  export let readOnly: boolean = false;
  export let onTogglePaid: ((id: string) => void) | null = null;
  
  const dispatch = createEventDispatcher();
  
  let showTransactionsDrawer = false;
  let showMakeRegularDrawer = false;
  let showDeleteConfirm = false;
  let showCCBalanceSyncModal = false;
  let ccSyncPaymentAmount = 0;
  let isEditingExpected = false;
  let expectedEditValue = '';
  let isEditingDueDay = false;
  let editingDayValue = '';
  let saving = false;
  
  // Get the payment source details for CC sync modal
  $: payoffSourceId = bill.payoff_source_id || bill.payment_source?.id || '';
  $: payoffSource = $paymentSources.find(ps => ps.id === payoffSourceId);
  $: payoffSourceName = payoffSource?.name || bill.payment_source?.name || 'Credit Card';
  $: payoffSourceType = (payoffSource?.type || 'credit_card') as PaymentSourceType;
  $: payoffSourceBalance = payoffSource?.balance ?? 0;
  
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
  
  function formatDayOfMonth(dateStr: string | null): string {
    if (!dateStr) return '';
    const day = parseInt(dateStr.split('-')[2], 10);
    const suffix = getDaySuffix(day);
    return `${day}${suffix}`;
  }
  
  function getDaySuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
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
  $: isPayoffBill = bill.is_payoff_bill ?? false;
  
  // Single-occurrence detection for "on Xth" display
  $: occurrences = (bill as any).occurrences ?? [];
  $: isSingleOccurrence = occurrences.length <= 1;
  $: firstOccurrenceDate = occurrences[0]?.expected_date || bill.due_date;
  
  // Helper to get last day of month from month string (YYYY-MM)
  function getLastDayOfMonth(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-').map(Number);
    // Day 0 of next month = last day of current month
    const lastDay = new Date(year, monthNum, 0).getDate();
    return `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  }
  
  // Actions
  async function handleAddOccurrence() {
    if (saving || readOnly || !month) return;
    
    saving = true;
    try {
      // Add occurrence at end of month with full expected amount
      const expectedDate = getLastDayOfMonth(month);
      const expectedAmount = bill.expected_amount;
      
      await apiClient.post(`/api/months/${month}/bills/${bill.id}/occurrences`, {
        expected_date: expectedDate,
        expected_amount: expectedAmount
      });
      
      success('Occurrence added');
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add occurrence');
    } finally {
      saving = false;
    }
  }
  
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
      
      // If this is a payoff bill, show the CC balance sync modal
      if (isPayoffBill && payoffSourceId) {
        ccSyncPaymentAmount = paymentAmount;
        showCCBalanceSyncModal = true;
      }
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
    if (readOnly) return;
    if (isClosed) return;
    if (isPayoffBill) return; // Payoff bills are auto-synced
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
  
  // Due day editing functions
  function startEditingDueDay() {
    if (readOnly || isClosed || !isSingleOccurrence) return;
    const day = parseInt(firstOccurrenceDate?.split('-')[2] || '1', 10);
    editingDayValue = day.toString();
    isEditingDueDay = true;
  }
  
  async function saveDueDay() {
    let newDay = parseInt(editingDayValue, 10);
    if (isNaN(newDay) || newDay < 1) {
      showError('Please enter a valid day (1-31)');
      return;
    }
    
    // Cap at last day of month
    const [year, monthNum] = month.split('-').map(Number);
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    newDay = Math.min(newDay, lastDayOfMonth);
    
    const newDate = `${month}-${newDay.toString().padStart(2, '0')}`;
    
    if (newDate === firstOccurrenceDate) {
      isEditingDueDay = false;
      return;
    }
    
    saving = true;
    try {
      const occurrenceId = occurrences[0]?.id;
      if (!occurrenceId) {
        showError('No occurrence found to update');
        return;
      }
      await apiClient.putPath(`/api/months/${month}/bills/${bill.id}/occurrences/${occurrenceId}`, {
        expected_date: newDate
      });
      success('Due date updated');
      isEditingDueDay = false;
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update date');
    } finally {
      saving = false;
    }
  }
  
  function cancelEditingDueDay() {
    isEditingDueDay = false;
    editingDayValue = '';
  }
  
  function handleDueDayKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveDueDay();
    } else if (event.key === 'Escape') {
      cancelEditingDueDay();
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
  
  function handleTransactionsUpdated(event: CustomEvent<{paymentAmount?: number}>) {
    dispatch('refresh');
    
    // If this is a payoff bill and we got a payment amount, show CC sync modal
    if (isPayoffBill && payoffSourceId && event.detail?.paymentAmount) {
      ccSyncPaymentAmount = event.detail.paymentAmount;
      showCCBalanceSyncModal = true;
    }
  }
  
  function handleCCSyncUpdated() {
    // Refresh to get the updated balance data
    dispatch('refresh');
  }
  
  function confirmDeleteBill() {
    showDeleteConfirm = true;
  }
  
  function cancelDelete() {
    showDeleteConfirm = false;
  }
  
  async function handleDeleteBill() {
    if (saving) return;
    
    saving = true;
    showDeleteConfirm = false;
    
    try {
      await apiClient.deletePath(`/api/months/${month}/bills/${bill.id}`);
      success('Bill deleted');
      // Optimistic update - remove from store immediately to prevent cycling bug
      detailedMonth.removeBillInstance(bill.id);
      // Then refresh to update tallies from server
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete bill');
    } finally {
      saving = false;
    }
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
    class:payoff={isPayoffBill}
  >
    <div class="bill-main">
      <div class="bill-info">
        <span class="bill-name" class:closed-text={isClosed}>
          {bill.name}
          {#if isSingleOccurrence && firstOccurrenceDate && !isClosed && !isPayoffBill}
            {#if isEditingDueDay}
              <span class="due-day-edit">
                on <input
                  type="number"
                  min="1"
                  max="31"
                  class="due-day-input"
                  bind:value={editingDayValue}
                  on:keydown={handleDueDayKeydown}
                  on:blur={saveDueDay}
                  disabled={saving}
                  autofocus
                />
              </span>
            {:else}
              <button class="due-day" on:click={startEditingDueDay} title="Click to edit due date">
                on {formatDayOfMonth(firstOccurrenceDate)}
              </button>
            {/if}
          {/if}
          {#if isPayoffBill}
            <span class="badge payoff-badge">payoff</span>
          {/if}
          {#if bill.is_adhoc && !isPayoffBill}
            <span class="badge adhoc-badge">ad-hoc</span>
            <button class="make-regular-link" on:click={handleMakeRegular}>
              Make Regular
            </button>
          {/if}
          {#if isPartiallyPaid}
            <span class="badge partial-badge">partial</span>
          {/if}
          {#if bill.is_overdue && !isClosed}
            <span class="badge overdue-badge">overdue</span>
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
      <!-- Expected amount (clickable for inline edit, but not for payoff bills) -->
      <div class="amount-column">
        <span class="amount-label">Expected</span>
        {#if isPayoffBill}
          <span class="amount-value synced" title="Auto-synced with card balance">
            {formatCurrency(bill.expected_amount)}
          </span>
        {:else if isEditingExpected}
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
            class:editable-highlight={!isClosed && !isPayoffBill}
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
          <button class="action-btn reopen" on:click={handleReopen} disabled={saving || readOnly}>
            Reopen
          </button>
        {:else if hasTransactions}
          <button class="action-btn close" on:click={handleClose} disabled={saving || readOnly}>
            Close
          </button>
        {:else if month}
          <button class="action-btn pay-full" on:click={handlePayFull} disabled={saving || readOnly}>
            Pay Full
          </button>
        {/if}
        
        <!-- Add occurrence button (not for payoff bills, not when closed) -->
        {#if !readOnly && !isPayoffBill && !isClosed && month}
          <button 
            class="action-btn-icon add" 
            on:click={handleAddOccurrence} 
            disabled={saving}
            title="Add occurrence"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        {/if}
        
        <!-- Delete button for any bill (when not read-only and not payoff bill) -->
        {#if !readOnly && !isPayoffBill}
          <button 
            class="action-btn-icon delete" 
            on:click={confirmDeleteBill} 
            disabled={saving}
            title="Delete bill"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
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
  {isPayoffBill}
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

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
  <div class="confirm-overlay" on:click={cancelDelete} on:keydown={(e) => e.key === 'Escape' && cancelDelete()} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="confirm-dialog" on:click|stopPropagation>
      <h3>Delete Bill</h3>
      <p>Are you sure you want to delete "<strong>{bill.name}</strong>"?</p>
      <p class="confirm-warning">This action cannot be undone.</p>
      <div class="confirm-actions">
        <button class="confirm-btn cancel" on:click={cancelDelete}>Cancel</button>
        <button class="confirm-btn delete" on:click={handleDeleteBill} disabled={saving}>
          {saving ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- CC Balance Sync Modal (for payoff bills) -->
{#if isPayoffBill}
  <CCBalanceSyncModal
    bind:open={showCCBalanceSyncModal}
    {month}
    paymentSourceId={payoffSourceId}
    paymentSourceName={payoffSourceName}
    paymentSourceType={payoffSourceType}
    currentBalance={payoffSourceBalance}
    paymentAmount={ccSyncPaymentAmount}
    on:updated={handleCCSyncUpdated}
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
  
  .due-day {
    font-weight: 400;
    color: #888;
    font-size: 0.85rem;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: color 0.2s;
  }
  
  .due-day:hover {
    color: #24c8db;
    text-decoration: underline;
  }
  
  .due-day-edit {
    font-weight: 400;
    color: #888;
    font-size: 0.85rem;
  }
  
  .due-day-input {
    width: 35px;
    padding: 1px 4px;
    background: #0f0f1a;
    border: 1px solid #24c8db;
    border-radius: 4px;
    color: #e4e4e7;
    font-size: 0.8rem;
    text-align: center;
  }
  
  .due-day-input:focus {
    outline: none;
  }
  
  /* Hide spinner buttons */
  .due-day-input::-webkit-outer-spin-button,
  .due-day-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .due-day-input[type=number] {
    -moz-appearance: textfield;
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
  
  .payoff-badge {
    background: rgba(139, 92, 246, 0.2);
    color: #8b5cf6;
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
  
  /* Yellow/amber highlight for editable values */
  .amount-value.editable-highlight {
    background: rgba(251, 191, 36, 0.15);
    border: 1px solid rgba(251, 191, 36, 0.4);
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .amount-value.editable-highlight:hover:not(.disabled) {
    background: rgba(251, 191, 36, 0.25);
    border-color: rgba(251, 191, 36, 0.6);
    color: #fbbf24;
  }
  
  .amount-value.synced {
    color: #8b5cf6;
    font-style: italic;
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
  
  /* Delete icon button */
  .action-btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: #666;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .action-btn-icon:hover:not(:disabled) {
    background: rgba(255, 68, 68, 0.1);
    color: #ff4444;
  }
  
  .action-btn-icon.delete:hover:not(:disabled) {
    background: #ff4444;
    color: #fff;
  }
  
  .action-btn-icon.add:hover:not(:disabled) {
    background: rgba(36, 200, 219, 0.15);
    color: #24c8db;
  }
  
  .action-btn-icon:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  /* Confirmation dialog */
  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .confirm-dialog {
    background: #1a1a2e;
    border: 1px solid #333355;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
  }
  
  .confirm-dialog h3 {
    margin: 0 0 16px;
    font-size: 1.1rem;
    color: #e4e4e7;
  }
  
  .confirm-dialog p {
    margin: 0 0 8px;
    color: #a0a0a0;
    font-size: 0.9rem;
  }
  
  .confirm-warning {
    color: #f87171 !important;
    font-size: 0.8rem !important;
    margin-bottom: 20px !important;
  }
  
  .confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  
  .confirm-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .confirm-btn.cancel {
    background: transparent;
    border: 1px solid #444;
    color: #888;
  }
  
  .confirm-btn.cancel:hover {
    border-color: #666;
    color: #e4e4e7;
  }
  
  .confirm-btn.delete {
    background: #ff4444;
    border: none;
    color: #fff;
  }
  
  .confirm-btn.delete:hover:not(:disabled) {
    background: #cc3333;
  }
  
  .confirm-btn.delete:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
