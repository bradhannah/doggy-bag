<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { success, error as showError } from '../../stores/toast';
  
  export let open = false;
  export let month: string;
  export let incomeInstanceId: string;
  export let incomeName: string = '';
  export let expectedAmount: number = 0;
  
  const dispatch = createEventDispatcher();
  
  let amount = '';
  let saving = false;
  let error = '';
  
  $: if (open && !amount) {
    // Default to expected amount when modal opens
    amount = (expectedAmount / 100).toFixed(2);
  }
  
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
    error = '';
  }
  
  function useExpected() {
    amount = (expectedAmount / 100).toFixed(2);
  }
  
  async function handleSubmit() {
    const amountCents = parseDollarsToCents(amount);
    
    if (amountCents <= 0) {
      error = 'Please enter a valid amount';
      return;
    }
    
    saving = true;
    error = '';
    
    try {
      const response = await fetch(`/api/months/${month}/incomes/${incomeInstanceId}/paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualAmount: amountCents })
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to mark income as received');
      }
      
      success('Income received');
      dispatch('received');
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to mark as received';
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
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="drawer-backdrop" role="presentation" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && handleClose()}>
    <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="receive-income-title" tabindex="-1">
      <header class="drawer-header">
        <h3 id="receive-income-title">Mark Income Received</h3>
        <button class="close-btn" on:click={handleClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </header>
      
      <div class="drawer-content">
        <div class="income-info">
          <span class="income-name">{incomeName}</span>
          <div class="income-details">
            <span>Expected: {formatCurrency(expectedAmount)}</span>
          </div>
        </div>
        
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="amount">Actual Amount Received</label>
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
              <button type="button" class="suggest-btn" on:click={useExpected}>
                Use expected
              </button>
            </div>
          </div>
          
          {#if error}
            <p class="error-message">{error}</p>
          {/if}
          
          <div class="form-actions">
            <button type="button" class="cancel-btn" on:click={handleClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" class="submit-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Mark Received'}
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
  
  .income-info {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
  }
  
  .income-name {
    display: block;
    font-weight: 600;
    color: #e4e4e7;
    margin-bottom: 8px;
  }
  
  .income-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.875rem;
    color: #888;
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
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 6px;
    color: #4ade80;
    font-size: 0.75rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }
  
  .suggest-btn:hover {
    background: rgba(74, 222, 128, 0.2);
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
    background: #4ade80;
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
