<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import type { Payment } from '../../stores/detailed-month';
  
  export let open = false;
  export let month: string;
  export let instanceId: string;
  export let instanceName: string = '';
  export let expectedAmount: number = 0;
  export let transactionList: Payment[] = [];
  export let isClosed: boolean = false;
  export let type: 'bill' | 'income' = 'bill';
  export let occurrenceId: string | undefined = undefined; // NEW: For occurrence-level payments
  export let isPayoffBill: boolean = false; // NEW: Disable close actions for payoff bills
  
  const dispatch = createEventDispatcher();
  
  // Form state
  let amount = '';
  let date = new Date().toISOString().split('T')[0];
  let saving = false;
  let error = '';
  
  // Computed values
  $: totalTransactions = transactionList.reduce((sum, p) => sum + p.amount, 0);
  $: remaining = Math.max(0, expectedAmount - totalTransactions);
  $: suggestedAmount = remaining > 0 ? (remaining / 100).toFixed(2) : '';
  $: typeLabel = type === 'bill' ? 'Payment' : 'Receipt';
  $: typeLabelPlural = type === 'bill' ? 'Payments' : 'Receipts';
  $: actionLabel = type === 'bill' ? 'Pay' : 'Receive';
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }
  
  function handleClose() {
    open = false;
    resetForm();
    dispatch('close');
  }
  
  function resetForm() {
    amount = '';
    date = new Date().toISOString().split('T')[0];
    error = '';
  }
  
  function useSuggested() {
    amount = suggestedAmount;
  }
  
  async function addTransactionAndClose() {
    await addTransaction(true);
  }
  
  async function addTransactionAndKeepOpen() {
    await addTransaction(false);
  }
  
  async function addTransaction(closeAfter: boolean) {
    const amountCents = parseDollarsToCents(amount);
    
    if (amountCents <= 0) {
      error = 'Please enter a valid amount';
      return;
    }
    
    if (!date) {
      error = 'Please select a date';
      return;
    }
    
    saving = true;
    error = '';
    
    try {
      // Build the endpoint - use occurrence endpoint if occurrenceId provided
      let endpoint: string;
      let closeEndpoint: string;
      
      if (occurrenceId) {
        // Occurrence-level endpoints
        endpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/payments`;
        closeEndpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/close`;
      } else {
        // Instance-level endpoints (legacy/monthly)
        endpoint = type === 'bill' 
          ? `/api/months/${month}/bills/${instanceId}/payments`
          : `/api/months/${month}/incomes/${instanceId}/payments`;
        closeEndpoint = type === 'bill'
          ? `/api/months/${month}/bills/${instanceId}/close`
          : `/api/months/${month}/incomes/${instanceId}/close`;
      }
      
      await apiClient.post(endpoint, { amount: amountCents, date });
      
      // Close the instance/occurrence if requested
      if (closeAfter) {
        await apiClient.post(closeEndpoint, {});
        success(`${typeLabel} added and closed`);
      } else {
        success(`${typeLabel} added`);
      }
      
      dispatch('updated', { paymentAmount: amountCents });
      
      if (closeAfter) {
        handleClose();
      } else {
        resetForm();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to add ${typeLabel.toLowerCase()}`;
      showError(error);
    } finally {
      saving = false;
    }
  }
  
  async function closeWithoutAdding() {
    saving = true;
    error = '';
    
    try {
      // Build the close endpoint - use occurrence endpoint if occurrenceId provided
      let closeEndpoint: string;
      
      if (occurrenceId) {
        closeEndpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/close`;
      } else {
        closeEndpoint = type === 'bill'
          ? `/api/months/${month}/bills/${instanceId}/close`
          : `/api/months/${month}/incomes/${instanceId}/close`;
      }
      
      await apiClient.post(closeEndpoint, {});
      success(`${occurrenceId ? 'Occurrence' : (type === 'bill' ? 'Bill' : 'Income')} closed`);
      dispatch('updated');
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to close';
      showError(error);
    } finally {
      saving = false;
    }
  }
  
  async function deleteTransaction(paymentId: string) {
    try {
      // Build the endpoint - use occurrence endpoint if occurrenceId provided
      let endpoint: string;
      
      if (occurrenceId) {
        // Occurrence-level delete endpoint
        endpoint = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrenceId}/payments/${paymentId}`;
      } else {
        // Instance-level endpoints (legacy/monthly)
        endpoint = type === 'bill' 
          ? `/api/months/${month}/bills/${instanceId}/payments/${paymentId}`
          : `/api/months/${month}/incomes/${instanceId}/payments/${paymentId}`;
      }
      
      await apiClient.deletePath(endpoint);
      success(`${typeLabel} deleted`);
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : `Failed to delete ${typeLabel.toLowerCase()}`);
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="drawer-backdrop" on:click={handleBackdropClick}>
    <div class="drawer">
      <header class="drawer-header">
        <h3>{typeLabelPlural}</h3>
        <button class="close-btn" on:click={handleClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </header>
      
      <div class="drawer-content">
        <!-- Item info -->
        <div class="item-info">
          <span class="item-name">{instanceName}</span>
          <div class="item-details">
            <span>Expected: {formatCurrency(expectedAmount)}</span>
            <span>Total {type === 'bill' ? 'Paid' : 'Received'}: {formatCurrency(totalTransactions)}</span>
            <span class="remaining" class:zero={remaining === 0}>
              Remaining: {formatCurrency(remaining)}
            </span>
          </div>
        </div>
        
        <!-- Transactions list -->
        {#if transactionList.length > 0}
          <div class="transactions-section">
            <h4>{typeLabelPlural} ({transactionList.length})</h4>
            <div class="transactions-list">
              {#each transactionList as transaction (transaction.id)}
                <div class="transaction-item">
                  <span class="transaction-date">{formatDate(transaction.date)}</span>
                  <span class="transaction-amount">{formatCurrency(transaction.amount)}</span>
                  {#if !isClosed}
                    <button 
                      class="delete-btn" 
                      on:click={() => deleteTransaction(transaction.id)}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="no-transactions">No {typeLabelPlural.toLowerCase()} yet</p>
        {/if}
        
        <!-- Add form (only if not closed) -->
        {#if !isClosed}
          <div class="add-section">
            <h4>Add {typeLabel}</h4>
            
            <div class="form-group">
              <label for="amount">Amount</label>
              <div class="amount-input-group">
                <span class="prefix">$</span>
                <input
                  id="amount"
                  type="text"
                  bind:value={amount}
                  placeholder="0.00"
                  disabled={saving}
                  class:error={!!error}
                />
                {#if remaining > 0}
                  <button type="button" class="suggest-btn" on:click={useSuggested}>
                    {actionLabel} remaining
                  </button>
                {/if}
              </div>
            </div>
            
            <div class="form-group">
              <label for="date">Date</label>
              <input
                id="date"
                type="date"
                bind:value={date}
                disabled={saving}
              />
            </div>
            
            {#if error}
              <p class="error-message">{error}</p>
            {/if}
            
            <div class="form-actions">
              <button 
                class="action-btn secondary" 
                on:click={addTransactionAndKeepOpen} 
                disabled={saving}
              >
                Add & Keep Open
              </button>
              {#if !isPayoffBill}
                <button 
                  class="action-btn primary" 
                  on:click={addTransactionAndClose} 
                  disabled={saving}
                >
                  Add & Close
                </button>
              {/if}
            </div>
            
            {#if !isPayoffBill}
              <button 
                class="close-without-btn" 
                on:click={closeWithoutAdding} 
                disabled={saving}
              >
                Close Without Adding
              </button>
            {/if}
          </div>
        {:else}
          <div class="closed-notice">
            <span class="checkmark">&#10003;</span>
            This {type} is closed
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: flex-end;
    z-index: 1000;
  }
  
  .drawer {
    width: 100%;
    max-width: 400px;
    height: 100%;
    background: #1a1a2e;
    border-left: 1px solid #333355;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #333355;
  }
  
  .drawer-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }
  
  .close-btn:hover {
    color: #e4e4e7;
  }
  
  .drawer-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }
  
  .item-info {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }
  
  .item-name {
    display: block;
    font-weight: 600;
    color: #e4e4e7;
    margin-bottom: 8px;
  }
  
  .item-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.875rem;
    color: #888;
  }
  
  .item-details .remaining {
    color: #f59e0b;
    font-weight: 500;
  }
  
  .item-details .remaining.zero {
    color: #4ade80;
  }
  
  .transactions-section {
    margin-bottom: 24px;
  }
  
  .transactions-section h4, .add-section h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .transactions-list {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    overflow: hidden;
  }
  
  .transaction-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #333355;
  }
  
  .transaction-item:last-child {
    border-bottom: none;
  }
  
  .transaction-date {
    flex: 1;
    font-size: 0.875rem;
    color: #888;
  }
  
  .transaction-amount {
    font-weight: 500;
    color: #e4e4e7;
    margin-right: 12px;
  }
  
  .delete-btn {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }
  
  .delete-btn:hover {
    color: #f87171;
  }
  
  .no-transactions {
    color: #666;
    font-size: 0.875rem;
    text-align: center;
    padding: 20px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    margin-bottom: 24px;
  }
  
  .add-section {
    border-top: 1px solid #333355;
    padding-top: 20px;
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .form-group label {
    display: block;
    font-size: 0.875rem;
    color: #888;
    margin-bottom: 8px;
  }
  
  .amount-input-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .amount-input-group .prefix {
    color: #888;
    font-size: 1rem;
  }
  
  .amount-input-group input {
    flex: 1;
    padding: 10px 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 1rem;
  }
  
  .amount-input-group input:focus {
    outline: none;
    border-color: #24c8db;
  }
  
  .amount-input-group input.error {
    border-color: #f87171;
  }
  
  .suggest-btn {
    padding: 8px 12px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 6px;
    color: #f59e0b;
    font-size: 0.75rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }
  
  .suggest-btn:hover {
    background: rgba(245, 158, 11, 0.2);
  }
  
  input[type="date"] {
    width: 100%;
    padding: 10px 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 1rem;
  }
  
  input[type="date"]:focus {
    outline: none;
    border-color: #24c8db;
  }
  
  .error-message {
    color: #f87171;
    font-size: 0.875rem;
    margin: 0 0 16px 0;
  }
  
  .form-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .action-btn {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-btn.secondary {
    background: transparent;
    border: 1px solid #333355;
    color: #e4e4e7;
  }
  
  .action-btn.secondary:hover:not(:disabled) {
    border-color: #24c8db;
    color: #24c8db;
  }
  
  .action-btn.primary {
    background: #24c8db;
    border: none;
    color: #000;
  }
  
  .action-btn.primary:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .close-without-btn {
    width: 100%;
    padding: 10px;
    background: transparent;
    border: 1px solid #555;
    border-radius: 6px;
    color: #888;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .close-without-btn:hover:not(:disabled) {
    border-color: #888;
    color: #e4e4e7;
  }
  
  .close-without-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .closed-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 8px;
    color: #4ade80;
    font-weight: 500;
  }
  
  .checkmark {
    font-size: 1.25rem;
  }
</style>
