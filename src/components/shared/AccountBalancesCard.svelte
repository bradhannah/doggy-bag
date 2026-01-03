<script lang="ts">
  /**
   * AccountBalancesCard - Shows payment sources with editable balances
   * Designed for placement at top of Dashboard and Details views
   * 
   * Separates accounts into:
   * - Assets: Bank Accounts & Cash (positive balances = money you have)
   * - Debt: Credit Cards & Lines of Credit (displayed as negative = money you owe)
   * 
   * @prop paymentSources - List of all payment sources
   * @prop bankBalances - Per-month balance overrides (from monthly data)
   * @prop month - Current month (YYYY-MM)
   * @prop loading - Whether data is still loading
   * @prop onUpdateBalances - Callback when balances are updated
   */
  import { createEventDispatcher } from 'svelte';
  import type { PaymentSource } from '../../stores/payment-sources';
  import { isDebtAccount, formatBalanceForDisplay } from '../../stores/payment-sources';
  
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
    effectiveBalance: getEffectiveBalance(ps),
    displayBalance: formatBalanceForDisplay(getEffectiveBalance(ps), ps.type)
  }));
  
  // Separate by type - Assets vs Debt
  $: assetAccounts = effectiveBalances.filter(ps => !isDebtAccount(ps.type));
  $: debtAccounts = effectiveBalances.filter(ps => isDebtAccount(ps.type));
  
  // Totals - assets are positive, debt is already stored as positive (owed)
  $: totalAssets = assetAccounts.reduce((sum, ps) => sum + ps.effectiveBalance, 0);
  $: totalDebt = debtAccounts.reduce((sum, ps) => sum + ps.effectiveBalance, 0);
  $: netWorth = totalAssets - totalDebt;
  
  // Format amount in cents to dollars (handles negative values)
  function formatCurrency(cents: number): string {
    const dollars = Math.abs(cents) / 100;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
    return cents < 0 ? '-' + formatted : formatted;
  }
  
  // Parse currency input to cents
  function parseCurrency(value: string): number {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const dollars = parseFloat(cleaned) || 0;
    return Math.round(dollars * 100);
  }
  
  // Start editing a balance
  function startEdit(source: PaymentSource & { effectiveBalance: number }) {
    editingId = source.id;
    editValue = (source.effectiveBalance / 100).toFixed(2);
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
      case 'line_of_credit':
        return '🏛️';
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

<div class="account-balances-card">
  <div class="card-header">
    <h3 class="card-title">
      Account Balances
    </h3>
    {#if month}
      <span class="month-label">{month}</span>
    {/if}
  </div>
  
  {#if loading}
    <div class="loading-state">Loading...</div>
  {:else if paymentSources.length === 0}
    <p class="empty-message">No accounts set up. <a href="/setup">Add accounts in Setup</a></p>
  {:else}
    <!-- Assets Section - Bank Accounts & Cash -->
    {#if assetAccounts.length > 0}
      <div class="section-header">
        <span class="section-title">Bank Accounts & Cash</span>
      </div>
      <div class="accounts-grid">
        {#each assetAccounts as source (source.id)}
          <div class="account-item" class:customized={isCustomized(source)}>
            <div class="account-info">
              <span class="account-icon">{getTypeIcon(source.type)}</span>
              <span class="account-name">{source.name}</span>
            </div>
            
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
                class="balance-button positive"
                on:click={() => startEdit(source)}
                title="Click to edit"
              >
                {formatCurrency(source.effectiveBalance)}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
    
    <!-- Debt Section - Credit Cards & Lines of Credit -->
    {#if debtAccounts.length > 0}
      <div class="section-header">
        <span class="section-title">Credit Cards & Lines of Credit</span>
        <span class="section-subtitle">Balance Owed</span>
      </div>
      <div class="accounts-grid">
        {#each debtAccounts as source (source.id)}
          <div class="account-item debt" class:customized={isCustomized(source)}>
            <div class="account-info">
              <span class="account-icon">{getTypeIcon(source.type)}</span>
              <span class="account-name">{source.name}</span>
            </div>
            
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
                class="balance-button negative"
                on:click={() => startEdit(source)}
                title="Click to edit - displayed as negative (amount owed)"
              >
                {formatCurrency(source.displayBalance)}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
    
    <!-- Summary Totals - horizontal -->
    <div class="totals-row">
      <div class="total-item">
        <span class="total-label">Total Assets</span>
        <span class="total-value positive">{formatCurrency(totalAssets)}</span>
      </div>
      <div class="total-divider"></div>
      <div class="total-item">
        <span class="total-label">Total Debt</span>
        <span class="total-value negative">-{formatCurrency(totalDebt)}</span>
      </div>
      <div class="total-divider"></div>
      <div class="total-item">
        <span class="total-label">Net Worth</span>
        <span class="total-value" class:positive={netWorth >= 0} class:negative={netWorth < 0}>
          {formatCurrency(netWorth)}
        </span>
      </div>
    </div>
  {/if}
</div>

<style>
  .account-balances-card {
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #333355;
    padding: 16px 20px;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  
  .card-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #e4e4e7;
    margin: 0;
    display: flex;
    align-items: center;
  }
  
  .month-label {
    font-size: 0.75rem;
    color: #666;
    background: rgba(255, 255, 255, 0.05);
    padding: 4px 8px;
    border-radius: 4px;
  }
  
  .loading-state {
    color: #888;
    font-size: 0.875rem;
    text-align: center;
    padding: 20px;
  }
  
  .empty-message {
    color: #666;
    font-size: 0.875rem;
    text-align: center;
    padding: 16px;
    margin: 0;
  }
  
  .empty-message a {
    color: #24c8db;
    text-decoration: none;
  }
  
  .empty-message a:hover {
    text-decoration: underline;
  }
  
  /* Section headers */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    margin-top: 12px;
  }
  
  .section-header:first-of-type {
    margin-top: 0;
  }
  
  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .section-subtitle {
    font-size: 0.65rem;
    color: #666;
    font-style: italic;
  }
  
  /* Accounts grid - horizontal layout */
  .accounts-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .account-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid transparent;
    min-width: 180px;
    flex: 1;
    max-width: 280px;
  }
  
  .account-item.customized {
    border-color: rgba(36, 200, 219, 0.3);
    background: rgba(36, 200, 219, 0.05);
  }
  
  .account-item.debt {
    border-color: rgba(248, 113, 113, 0.2);
  }
  
  .account-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .account-icon {
    font-size: 1rem;
  }
  
  .account-name {
    font-size: 0.8rem;
    color: #a0a0a0;
    font-weight: 500;
  }
  
  .balance-button {
    background: none;
    border: 1px solid transparent;
    padding: 4px 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;
    font-family: inherit;
  }
  
  .balance-button:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: #444466;
  }
  
  .balance-button.positive {
    color: #4ade80;
  }
  
  .balance-button.negative {
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
  
  /* Totals row - horizontal */
  .totals-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border-top: 1px solid #333355;
  }
  
  .total-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  
  .total-label {
    font-size: 0.7rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .total-value {
    font-size: 1rem;
    font-weight: 700;
    color: #e4e4e7;
  }
  
  .total-value.positive {
    color: #4ade80;
  }
  
  .total-value.negative {
    color: #f87171;
  }
  
  .total-divider {
    width: 1px;
    height: 30px;
    background: #333355;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .accounts-grid {
      flex-direction: column;
    }
    
    .account-item {
      max-width: none;
    }
    
    .totals-row {
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .total-divider {
      display: none;
    }
  }
</style>
