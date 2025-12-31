<script lang="ts">
  /**
   * PaymentSourcesCard - Shows payment source totals on the Dashboard
   * 
   * @prop totalCash - Sum of positive balances (bank accounts, cash)
   * @prop totalCreditDebt - Sum of credit card balances (shown as positive debt)
   * @prop netWorth - totalCash - totalCreditDebt
   * @prop loading - Whether data is still loading
   */
  
  export let totalCash: number = 0;
  export let totalCreditDebt: number = 0;
  export let netWorth: number = 0;
  export let loading: boolean = false;
  
  // Format amount in cents to dollars
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
</script>

<div class="payment-sources-card">
  <h3 class="card-title">Payment Sources</h3>
  
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
  }
  
  .totals-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
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
</style>
