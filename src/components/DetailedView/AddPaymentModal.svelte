<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { payments } from '../../stores/payments';
  import { success, error as showError } from '../../stores/toast';
  
  export let open = false;
  export let month: string;
  export let billInstanceId: string;
  export let billName: string = '';
  export let expectedAmount: number = 0;
  export let totalPaid: number = 0;
  
  const dispatch = createEventDispatcher();
  
  let amount = '';
  let date = new Date().toISOString().split('T')[0];
  let saving = false;
  let error = '';
  
  $: remaining = expectedAmount - totalPaid;
  $: suggestedAmount = remaining > 0 ? (remaining / 100).toFixed(2) : '';
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
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
  
  async function handleSubmit() {
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
      await payments.addPayment(month, billInstanceId, amountCents, date);
      success('Payment added');
      dispatch('added');
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add payment';
      showError(error);
    } finally {
      saving = false;
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
        <h3>Add Payment</h3>
        <button class="close-btn" on:click={handleClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </header>
      
      <div class="drawer-content">
        <div class="bill-info">
          <span class="bill-name">{billName}</span>
          <div class="bill-details">
            <span>Expected: {formatCurrency(expectedAmount)}</span>
            <span>Paid: {formatCurrency(totalPaid)}</span>
            <span class="remaining">Remaining: {formatCurrency(remaining)}</span>
          </div>
        </div>
        
        <form on:submit|preventDefault={handleSubmit}>
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
                  Pay remaining
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
            <button type="button" class="cancel-btn" on:click={handleClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" class="submit-btn" disabled={saving}>
              {saving ? 'Adding...' : 'Add Payment'}
            </button>
          </div>
        </form>
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
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
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
  
  .bill-info {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
  }
  
  .bill-name {
    display: block;
    font-weight: 600;
    color: #e4e4e7;
    margin-bottom: 8px;
  }
  
  .bill-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.875rem;
    color: #888;
  }
  
  .bill-details .remaining {
    color: #f59e0b;
    font-weight: 500;
  }
  
  .form-group {
    margin-bottom: 20px;
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
    margin-top: 24px;
  }
  
  .cancel-btn, .submit-btn {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn {
    background: transparent;
    border: 1px solid #333355;
    color: #888;
  }
  
  .cancel-btn:hover:not(:disabled) {
    border-color: #e4e4e7;
    color: #e4e4e7;
  }
  
  .submit-btn {
    background: #24c8db;
    border: none;
    color: #000;
  }
  
  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .cancel-btn:disabled, .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
