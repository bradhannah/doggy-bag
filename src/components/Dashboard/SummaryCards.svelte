<script lang="ts">
  export let totalIncome: number = 0;
  export let totalExpenses: number = 0;
  export let netWorth: number = 0;
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
</script>

<div class="summary-grid">
  <div class="summary-card income">
    <div class="card-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L12 22M12 2L6 8M12 2L18 8"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <div class="card-content">
      <span class="card-label">Total Income</span>
      <span class="card-value">
        {#if loading}
          ...
        {:else}
          {formatCurrency(totalIncome)}
        {/if}
      </span>
    </div>
  </div>

  <div class="summary-card expenses">
    <div class="card-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 22L12 2M12 22L6 16M12 22L18 16"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <div class="card-content">
      <span class="card-label">Total Expenses</span>
      <span class="card-value">
        {#if loading}
          ...
        {:else}
          {formatCurrency(totalExpenses)}
        {/if}
      </span>
    </div>
  </div>

  <div class="summary-card networth">
    <div class="card-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <div class="card-content">
      <span class="card-label">Starting Balance</span>
      <span class="card-value">
        {#if loading}
          ...
        {:else}
          {formatCurrency(netWorth)}
        {/if}
      </span>
    </div>
  </div>
</div>

<style>
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #333355;
  }

  .card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  .income .card-icon {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }

  .expenses .card-icon {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }

  .networth .card-icon {
    background: rgba(36, 200, 219, 0.15);
    color: #24c8db;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: #e4e4e7;
  }
</style>
