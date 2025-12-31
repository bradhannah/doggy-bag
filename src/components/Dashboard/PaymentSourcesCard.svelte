<script lang="ts">
  /**
   * PaymentSourcesCard - Shows payment sources with editable balances
   * 
   * @prop paymentSources - List of all payment sources
   * @prop bankBalances - Per-month balance overrides (from monthly data)
   * @prop month - Current month (YYYY-MM)
   * @prop loading - Whether data is still loading
   * @prop onUpdateBalances - Callback when balances are updated
   */
  import { createEventDispatcher } from 'svelte';
  import type { PaymentSource } from '../../stores/payment-sources';
  
  export let paymentSources: PaymentSource[] = [];
  export let bankBalances: Record<string, number> = {};
  export let month: string = '';
  export let loading: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Editing state
  let editingId: string | null = null;
  let editValue: string = '';
  
  // Get effective balance for a payment source
  // Use per-month override if available, otherwise use the source's current balance
  function getEffectiveBalance(source: PaymentSource): number {
    if (bankBalances[source.id] !== undefined) {
      return bankBalances[source.id];
    }
    return source.balance;
  }
  
  // Calculate totals from effective balances
  $: effectiveBalances = paymentSources.map(ps => ({
    ...ps,
    effectiveBalance: getEffectiveBalance(ps)
  }));
  
  $: totalCash = effectiveBalances
    .filter(ps => ps.type === 'bank_account' || ps.type === 'cash')
    .reduce((sum, ps) => sum + ps.effectiveBalance, 0);
    
  $: totalCreditDebt = effectiveBalances
    .filter(ps => ps.type === 'credit_card')
    .reduce((sum, ps) => sum + ps.effectiveBalance, 0);
    
  $: netWorth = totalCash - totalCreditDebt;
  
  // Format amount in cents to dollars
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  // Parse currency input to cents
  function parseCurrency(value: string): number {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const dollars = parseFloat(cleaned) || 0;
    return Math.round(dollars * 100);
  }
  
  // Start editing a balance
  function startEdit(source: PaymentSource) {
    editingId = source.id;
    const balance = getEffectiveBalance(source);
    editValue = (balance / 100).toFixed(2);
  }
  
  // Save edited balance
  async function saveEdit(source: PaymentSource) {
    const newBalance = parseCurrency(editValue);
    const newBalances = { ...bankBalances, [source.id]: newBalance };
    
    dispatch('updateBalances', { balances: newBalances });
    editingId = null;
  }
  
  // Cancel editing
  function cancelEdit() {
    editingId = null;
    editValue = '';
  }
  
  // Handle keyboard events
  function handleKeydown(event: KeyboardEvent, source: PaymentSource) {
    if (event.key === 'Enter') {
      saveEdit(source);
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  }
  
  // Get icon for payment source type
  function getTypeIcon(type: string) {
    switch (type) {
      case 'bank_account':
        return '🏦';
      case 'credit_card':
        return '💳';
      case 'cash':
        return '💵';
      default:
        return '💰';
    }
  }
  
  // Check if balance has been customized for this month
  function isCustomized(source: PaymentSource): boolean {
    return bankBalances[source.id] !== undefined;
  }
</script>

<div class="payment-sources-card">
  <h3 class="card-title">
    Payment Sources
    {#if month}
      <span class="month-label">({month})</span>
    {/if}
  </h3>
  
  <!-- Summary Totals -->
  <div class="totals-grid">
    <div class="total-item cash">
      <div class="item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="item-content">
        <span class="item-label">Cash & Bank</span>
        <span class="item-value">
          {#if loading}
            ...
          {:else}
            {formatCurrency(totalCash)}
          {/if}
        </span>
      </div>
    </div>
    
    <div class="total-item debt">
      <div class="item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M2 10H22" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <div class="item-content">
        <span class="item-label">Credit Debt</span>
        <span class="item-value">
          {#if loading}
            ...
          {:else}
            {formatCurrency(totalCreditDebt)}
          {/if}
        </span>
      </div>
    </div>
    
    <div class="total-item networth" class:positive={netWorth >= 0} class:negative={netWorth < 0}>
      <div class="item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="item-content">
        <span class="item-label">Net Worth</span>
        <span class="item-value">
          {#if loading}
            ...
          {:else}
            {formatCurrency(netWorth)}
          {/if}
        </span>
      </div>
    </div>
  </div>
  
  <!-- Individual Payment Sources -->
  {#if paymentSources.length > 0}
    <div class="sources-list">
      <div class="list-header">
        <span>Account</span>
        <span>Balance</span>
      </div>
      
      {#each paymentSources as source (source.id)}
        <div class="source-row" class:customized={isCustomized(source)}>
          <div class="source-info">
            <span class="source-icon">{getTypeIcon(source.type)}</span>
            <span class="source-name">{source.name}</span>
            {#if isCustomized(source)}
              <span class="customized-badge" title="Balance set for this month">*</span>
            {/if}
          </div>
          
          <div class="source-balance">
            {#if editingId === source.id}
              <div class="edit-container">
                <span class="currency-prefix">$</span>
                <input
                  type="text"
                  bind:value={editValue}
                  on:keydown={(e) => handleKeydown(e, source)}
                  on:blur={() => saveEdit(source)}
                  class="balance-input"
                  autofocus
                />
              </div>
            {:else}
              <button 
                class="balance-button"
                class:debt={source.type === 'credit_card'}
                on:click={() => startEdit(source)}
                title="Click to edit balance for this month"
              >
                {formatCurrency(getEffectiveBalance(source))}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if !loading}
    <p class="empty-message">No payment sources set up yet. Add them in Setup.</p>
  {/if}
</div>

<style>
  .payment-sources-card {
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #333355;
    padding: 20px;
  }
  
  .card-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .month-label {
    font-size: 0.75rem;
    color: #666;
    font-weight: normal;
    text-transform: none;
  }
  
  .totals-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }
  
  .total-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
  }
  
  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    flex-shrink: 0;
  }
  
  .cash .item-icon {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }
  
  .debt .item-icon {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }
  
  .networth .item-icon {
    background: rgba(36, 200, 219, 0.15);
    color: #24c8db;
  }
  
  .item-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }
  
  .item-label {
    font-size: 0.75rem;
    color: #888;
  }
  
  .item-value {
    font-size: 1rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .cash .item-value {
    color: #4ade80;
  }
  
  .debt .item-value {
    color: #f87171;
  }
  
  .networth.positive .item-value {
    color: #4ade80;
  }
  
  .networth.negative .item-value {
    color: #f87171;
  }
  
  /* Individual sources list */
  .sources-list {
    border-top: 1px solid #333355;
    padding-top: 16px;
  }
  
  .list-header {
    display: flex;
    justify-content: space-between;
    padding: 0 8px 8px 8px;
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .source-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 8px;
    border-radius: 6px;
    transition: background-color 0.15s;
  }
  
  .source-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  
  .source-row.customized {
    background: rgba(36, 200, 219, 0.05);
  }
  
  .source-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .source-icon {
    font-size: 1rem;
  }
  
  .source-name {
    font-size: 0.875rem;
    color: #e4e4e7;
  }
  
  .customized-badge {
    color: #24c8db;
    font-weight: bold;
    font-size: 0.75rem;
  }
  
  .source-balance {
    display: flex;
    align-items: center;
  }
  
  .balance-button {
    background: none;
    border: 1px solid transparent;
    padding: 4px 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4ade80;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;
    font-family: inherit;
  }
  
  .balance-button:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: #444466;
  }
  
  .balance-button.debt {
    color: #f87171;
  }
  
  .edit-container {
    display: flex;
    align-items: center;
    background: #0f0f1a;
    border: 1px solid #24c8db;
    border-radius: 4px;
    padding: 2px 6px;
  }
  
  .currency-prefix {
    color: #888;
    font-size: 0.875rem;
    margin-right: 2px;
  }
  
  .balance-input {
    width: 80px;
    background: transparent;
    border: none;
    color: #e4e4e7;
    font-size: 0.875rem;
    font-family: inherit;
    text-align: right;
    outline: none;
  }
  
  .empty-message {
    color: #666;
    font-size: 0.875rem;
    text-align: center;
    padding: 16px;
    margin: 0;
  }
</style>
