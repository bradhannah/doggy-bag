<script lang="ts">
  import type { SectionTally } from '../../stores/detailed-month';
  
  export let tally: SectionTally;
  export let type: 'bills' | 'income' = 'bills';
  export let label: string = '';
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
</script>

<div class="section-tally" class:income={type === 'income'} class:bills={type === 'bills'}>
  {#if label}
    <span class="tally-label">{label}</span>
  {/if}
  <div class="tally-row">
    <span class="tally-item">
      <span class="tally-title">Expected</span>
      <span class="tally-value">{formatCurrency(tally.expected)}</span>
    </span>
    <span class="tally-item">
      <span class="tally-title">Actual</span>
      <span class="tally-value" class:amber={tally.actual !== tally.expected && tally.actual > 0}>
        {formatCurrency(tally.actual)}
      </span>
    </span>
    <span class="tally-item">
      <span class="tally-title">Remaining</span>
      <span class="tally-value remaining">{formatCurrency(tally.remaining)}</span>
    </span>
  </div>
</div>

<style>
  .section-tally {
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border-left: 3px solid #555;
  }
  
  .section-tally.bills {
    border-left-color: #f87171;
  }
  
  .section-tally.income {
    border-left-color: #4ade80;
  }
  
  .tally-label {
    display: block;
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
    font-weight: 600;
  }
  
  .tally-row {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  
  .tally-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .tally-title {
    font-size: 0.7rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .tally-value {
    font-size: 1rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .tally-value.amber {
    color: #f59e0b;
  }
  
  .tally-value.remaining {
    color: #888;
  }
</style>
