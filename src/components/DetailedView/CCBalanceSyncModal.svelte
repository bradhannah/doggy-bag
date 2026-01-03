<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import { isDebtAccount, type PaymentSourceType } from '../../stores/payment-sources';
  
  export let open = false;
  export let month: string;
  export let paymentSourceId: string;
  export let paymentSourceName: string;
  export let paymentSourceType: PaymentSourceType = 'credit_card';
  export let currentBalance: number; // in cents (positive = debt owed)
  export let paymentAmount: number;  // in cents
  
  const dispatch = createEventDispatcher();
  
  let saving = false;
  
  // Calculate new balance after payment
  // For debt accounts: payment reduces debt (subtracts from balance)
  $: newBalance = currentBalance - paymentAmount;
  
  // Format cents to dollars for display
  function formatCurrency(cents: number): string {
    const dollars = Math.abs(cents) / 100;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
    
    // For debt accounts, show as negative when there's debt owed
    if (isDebtAccount(paymentSourceType)) {
      if (cents > 0) return `-${formatted}`; // Debt owed
      if (cents < 0) return `+${formatted}`; // Credit/overpayment
    }
    return formatted;
  }
  
  function formatPositiveCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  async function handleUpdateBalance() {
    if (saving) return;
    saving = true;
    
    try {
      await apiClient.putPath(`/api/months/${month}/bank-balances`, {
        [paymentSourceId]: newBalance
      });
      success('Balance updated');
      dispatch('updated');
      open = false;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update balance');
    } finally {
      saving = false;
    }
  }
  
  function handleSkip() {
    dispatch('skip');
    open = false;
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleSkip();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="modal-overlay" 
    on:click={handleSkip} 
    on:keydown={handleKeydown}
    role="dialog" 
    aria-modal="true" 
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-content" on:click|stopPropagation>
      <h3>Update Card Balance?</h3>
      
      <p class="subtitle">
        You just made a payment to <strong>{paymentSourceName}</strong>. 
        Would you like to update the balance?
      </p>
      
      <div class="balance-summary">
        <div class="balance-row">
          <span class="label">Current Balance</span>
          <span class="value debt">{formatCurrency(currentBalance)}</span>
        </div>
        
        <div class="balance-row payment">
          <span class="label">Payment Made</span>
          <span class="value positive">- {formatPositiveCurrency(paymentAmount)}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="balance-row total">
          <span class="label">New Balance</span>
          <span class="value" class:debt={newBalance > 0} class:zero={newBalance === 0} class:credit={newBalance < 0}>
            {formatCurrency(newBalance)}
          </span>
        </div>
      </div>
      
      <div class="actions">
        <button class="btn skip" on:click={handleSkip} disabled={saving}>
          Skip
        </button>
        <button class="btn update" on:click={handleUpdateBalance} disabled={saving}>
          {saving ? 'Updating...' : 'Update Balance'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-content {
    background: #1a1a2e;
    border: 1px solid #333355;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    animation: slideIn 0.2s ease-out;
  }
  
  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: translateY(-20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  h3 {
    margin: 0 0 8px;
    font-size: 1.2rem;
    color: #e4e4e7;
  }
  
  .subtitle {
    margin: 0 0 20px;
    color: #a0a0a0;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  
  .subtitle strong {
    color: #8b5cf6;
  }
  
  .balance-summary {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }
  
  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }
  
  .balance-row.payment {
    opacity: 0.8;
  }
  
  .balance-row.total {
    padding-top: 12px;
  }
  
  .label {
    color: #888;
    font-size: 0.9rem;
  }
  
  .balance-row.total .label {
    color: #e4e4e7;
    font-weight: 600;
  }
  
  .value {
    font-size: 1rem;
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  }
  
  .value.debt {
    color: #f87171;
  }
  
  .value.positive {
    color: #4ade80;
  }
  
  .value.zero {
    color: #4ade80;
  }
  
  .value.credit {
    color: #4ade80;
  }
  
  .balance-row.total .value {
    font-size: 1.15rem;
  }
  
  .divider {
    height: 1px;
    background: #333;
    margin: 8px 0;
  }
  
  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  
  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .btn.skip {
    background: transparent;
    border: 1px solid #444;
    color: #888;
  }
  
  .btn.skip:hover:not(:disabled) {
    border-color: #666;
    color: #e4e4e7;
  }
  
  .btn.update {
    background: #8b5cf6;
    border: none;
    color: #fff;
  }
  
  .btn.update:hover:not(:disabled) {
    background: #7c3aed;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
