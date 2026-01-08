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
      minimumFractionDigits: 2,
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
    background: var(--bg-elevated);
    border-radius: 8px;
    border-left: 3px solid var(--border-default);
  }

  .section-tally.bills {
    border-left-color: var(--error);
  }

  .section-tally.income {
    border-left-color: var(--success);
  }

  .tally-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
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
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tally-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .tally-value.amber {
    color: var(--warning);
  }

  .tally-value.remaining {
    color: var(--text-secondary);
  }
</style>
