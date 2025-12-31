<script lang="ts">
  import type { IncomeInstanceDetailed } from '../../stores/detailed-month';
  
  export let income: IncomeInstanceDetailed;
  export let onTogglePaid: ((id: string) => void) | null = null;
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  $: showAmber = income.actual_amount !== null && income.actual_amount !== income.expected_amount;
  $: displayActual = income.actual_amount ?? 0;
</script>

<div class="income-row" class:received={income.is_paid} class:overdue={income.is_overdue} class:adhoc={income.is_adhoc}>
  <div class="income-main">
    <button 
      class="received-checkbox"
      class:checked={income.is_paid}
      on:click={() => onTogglePaid && onTogglePaid(income.id)}
      title={income.is_paid ? 'Mark as not received' : 'Mark as received'}
    >
      {#if income.is_paid}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 12L10 17L20 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    </button>
    
    <div class="income-info">
      <span class="income-name" class:received-text={income.is_paid}>
        {income.name}
        {#if income.is_adhoc}
          <span class="badge adhoc-badge">ad-hoc</span>
        {/if}
        {#if income.is_overdue}
          <span class="badge overdue-badge">overdue</span>
        {/if}
      </span>
      
      {#if income.due_date}
        <span class="income-due" class:overdue-text={income.is_overdue}>
          Expected: {formatDate(income.due_date)}
        </span>
      {/if}
      
      {#if income.payment_source}
        <span class="income-source">{income.payment_source.name}</span>
      {/if}
    </div>
  </div>
  
  <div class="income-amounts">
    <div class="amount-column">
      <span class="amount-label">Expected</span>
      <span class="amount-value">{formatCurrency(income.expected_amount)}</span>
    </div>
    
    <div class="amount-column">
      <span class="amount-label">Actual</span>
      <span class="amount-value" class:amber={showAmber}>
        {displayActual > 0 ? formatCurrency(displayActual) : '-'}
      </span>
    </div>
  </div>
</div>

<style>
  .income-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }
  
  .income-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  
  .income-row.received {
    background: rgba(74, 222, 128, 0.05);
    opacity: 0.7;
  }
  
  .income-row.overdue {
    border-left: 3px solid #f59e0b;
  }
  
  .income-row.adhoc {
    border-left: 3px solid #a78bfa;
  }
  
  .income-main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  
  .received-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid #555;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.2s;
    color: #000;
    flex-shrink: 0;
  }
  
  .received-checkbox:hover {
    border-color: #4ade80;
  }
  
  .received-checkbox.checked {
    background: #4ade80;
    border-color: #4ade80;
  }
  
  .income-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  
  .income-name {
    font-weight: 500;
    color: #e4e4e7;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .received-text {
    text-decoration: line-through;
    opacity: 0.6;
  }
  
  .badge {
    font-size: 0.625rem;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .adhoc-badge {
    background: rgba(167, 139, 250, 0.2);
    color: #a78bfa;
  }
  
  .overdue-badge {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  
  .income-due {
    font-size: 0.75rem;
    color: #888;
  }
  
  .overdue-text {
    color: #f59e0b;
  }
  
  .income-source {
    font-size: 0.7rem;
    color: #666;
  }
  
  .income-amounts {
    display: flex;
    gap: 24px;
    flex-shrink: 0;
  }
  
  .amount-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 80px;
  }
  
  .amount-label {
    font-size: 0.625rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .amount-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .amount-value.amber {
    color: #f59e0b;
  }
  
  @media (max-width: 640px) {
    .income-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .income-amounts {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
