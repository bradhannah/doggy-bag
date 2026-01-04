<script lang="ts">
  export let leftover: number = 0;
  export let loading: boolean = false;

  // Format amount in cents to dollars
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  $: isPositive = leftover >= 0;
  $: formattedAmount = formatCurrency(Math.abs(leftover));
</script>

<div class="leftover-card" class:positive={isPositive} class:negative={!isPositive}>
  <div class="card-header">
    <span class="card-label">Leftover at End of Month</span>
    <span class="card-badge" class:positive={isPositive} class:negative={!isPositive}>
      {isPositive ? 'Surplus' : 'Deficit'}
    </span>
  </div>

  <div class="card-value">
    {#if loading}
      <span class="loading">Loading...</span>
    {:else}
      <span class="sign">{isPositive ? '+' : '-'}</span>
      <span class="amount">{formattedAmount}</span>
    {/if}
  </div>

  <div class="card-subtext">
    {#if isPositive}
      You'll have {formattedAmount} left after all bills and expenses
    {:else}
      You need {formattedAmount} more to cover all expenses
    {/if}
  </div>
</div>

<style>
  .leftover-card {
    padding: 24px;
    background: #1a1a2e;
    border-radius: 16px;
    border: 2px solid #333355;
    transition: border-color 0.3s;
  }

  .leftover-card.positive {
    border-color: #4ade80;
  }

  .leftover-card.negative {
    border-color: #f87171;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .card-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .card-badge.positive {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }

  .card-badge.negative {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }

  .card-value {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 12px;
  }

  .sign {
    font-size: 1.5rem;
    font-weight: 600;
  }

  .positive .sign {
    color: #4ade80;
  }

  .negative .sign {
    color: #f87171;
  }

  .amount {
    font-size: 2.5rem;
    font-weight: 700;
    color: #e4e4e7;
    letter-spacing: -0.02em;
  }

  .loading {
    font-size: 1.5rem;
    color: #888;
  }

  .card-subtext {
    font-size: 0.875rem;
    color: #888;
    line-height: 1.4;
  }
</style>
