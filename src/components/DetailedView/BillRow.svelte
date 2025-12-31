<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BillInstanceDetailed } from '../../stores/detailed-month';
  import AddPaymentModal from './AddPaymentModal.svelte';
  
  export let bill: BillInstanceDetailed;
  export let month: string = '';
  export let onTogglePaid: ((id: string) => void) | null = null;
  export let onPaymentAdded: (() => void) | null = null;
  
  const dispatch = createEventDispatcher();
  
  let showPaymentModal = false;
  let showPaymentsList = false;
  
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
  
  $: showAmber = bill.actual_amount !== null && bill.actual_amount !== bill.expected_amount;
  $: displayActual = bill.total_paid > 0 ? bill.total_paid : (bill.actual_amount ?? 0);
  $: hasPartialPayments = bill.payments && bill.payments.length > 0;
  $: isPartiallyPaid = hasPartialPayments && bill.total_paid > 0 && bill.total_paid < bill.expected_amount;
  
  function handleAddPayment() {
    showPaymentModal = true;
  }
  
  function handlePaymentAdded() {
    if (onPaymentAdded) onPaymentAdded();
    dispatch('refresh');
  }
  
  function togglePaymentsList() {
    showPaymentsList = !showPaymentsList;
  }
</script>

<div class="bill-row-container">
  <div class="bill-row" class:paid={bill.is_paid} class:overdue={bill.is_overdue} class:adhoc={bill.is_adhoc} class:partial={isPartiallyPaid}>
    <div class="bill-main">
      <!-- Paid checkbox with partial indicator -->
      <button 
        class="paid-checkbox"
        class:checked={bill.is_paid}
        class:partial={isPartiallyPaid}
        on:click={() => onTogglePaid && onTogglePaid(bill.id)}
        title={bill.is_paid ? 'Mark as unpaid' : isPartiallyPaid ? 'Partially paid' : 'Mark as paid'}
      >
        {#if bill.is_paid}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 12L10 17L20 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {:else if isPartiallyPaid}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6 A6 6 0 0 1 12 18" fill="currentColor"/>
          </svg>
        {/if}
      </button>
      
      <div class="bill-info">
        <span class="bill-name" class:paid-text={bill.is_paid}>
          {bill.name}
          {#if bill.is_adhoc}
            <span class="badge adhoc-badge">ad-hoc</span>
          {/if}
          {#if isPartiallyPaid}
            <span class="badge partial-badge">partial</span>
          {/if}
          {#if bill.is_overdue}
            <span class="badge overdue-badge">
              {bill.days_overdue} day{bill.days_overdue !== 1 ? 's' : ''} overdue
            </span>
          {/if}
        </span>
        
        {#if bill.due_date}
          <span class="bill-due" class:overdue-text={bill.is_overdue}>
            Due: {formatDate(bill.due_date)}
          </span>
        {/if}
        
        {#if bill.payment_source}
          <span class="bill-source">{bill.payment_source.name}</span>
        {/if}
      </div>
    </div>
    
    <div class="bill-amounts">
      <div class="amount-column">
        <span class="amount-label">Expected</span>
        <span class="amount-value">{formatCurrency(bill.expected_amount)}</span>
      </div>
      
      <div class="amount-column clickable" on:click={hasPartialPayments ? togglePaymentsList : undefined}>
        <span class="amount-label">
          Paid
          {#if hasPartialPayments}
            <span class="payment-count">({bill.payments.length})</span>
          {/if}
        </span>
        <span class="amount-value" class:amber={showAmber}>
          {displayActual > 0 ? formatCurrency(displayActual) : '-'}
        </span>
      </div>
      
      <div class="amount-column">
        <span class="amount-label">Remaining</span>
        <span class="amount-value remaining" class:zero={bill.remaining === 0}>
          {formatCurrency(bill.remaining)}
        </span>
      </div>
      
      {#if !bill.is_paid && month}
        <button class="add-payment-btn" on:click={handleAddPayment} title="Add payment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>
  
  <!-- Payments list -->
  {#if showPaymentsList && hasPartialPayments}
    <div class="payments-list">
      {#each bill.payments as payment (payment.id)}
        <div class="payment-item">
          <span class="payment-date">{formatDate(payment.date)}</span>
          <span class="payment-amount">{formatCurrency(payment.amount)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Add Payment Modal -->
<AddPaymentModal
  bind:open={showPaymentModal}
  {month}
  billInstanceId={bill.id}
  billName={bill.name}
  expectedAmount={bill.expected_amount}
  totalPaid={bill.total_paid}
  on:added={handlePaymentAdded}
/>

<style>
  .bill-row-container {
    margin-bottom: 4px;
  }
  
  .bill-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }
  
  .bill-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  
  .bill-row.paid {
    background: rgba(74, 222, 128, 0.05);
    opacity: 0.7;
  }
  
  .bill-row.partial {
    border-left: 3px solid #f59e0b;
  }
  
  .bill-row.overdue:not(.partial) {
    border-left: 3px solid #f87171;
  }
  
  .bill-row.adhoc:not(.partial):not(.overdue) {
    border-left: 3px solid #a78bfa;
  }
  
  .bill-main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  
  .paid-checkbox {
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
  
  .paid-checkbox:hover {
    border-color: #4ade80;
  }
  
  .paid-checkbox.checked {
    background: #4ade80;
    border-color: #4ade80;
  }
  
  .paid-checkbox.partial {
    background: linear-gradient(90deg, #f59e0b 50%, transparent 50%);
    border-color: #f59e0b;
    color: #000;
  }
  
  .bill-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  
  .bill-name {
    font-weight: 500;
    color: #e4e4e7;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .paid-text {
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
  
  .partial-badge {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  
  .overdue-badge {
    background: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }
  
  .bill-due {
    font-size: 0.75rem;
    color: #888;
  }
  
  .overdue-text {
    color: #f87171;
  }
  
  .bill-source {
    font-size: 0.7rem;
    color: #666;
  }
  
  .bill-amounts {
    display: flex;
    gap: 24px;
    align-items: center;
    flex-shrink: 0;
  }
  
  .amount-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 80px;
  }
  
  .amount-column.clickable {
    cursor: pointer;
  }
  
  .amount-column.clickable:hover .amount-value {
    text-decoration: underline;
  }
  
  .amount-label {
    font-size: 0.625rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .payment-count {
    color: #f59e0b;
  }
  
  .amount-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .amount-value.amber {
    color: #f59e0b;
  }
  
  .amount-value.remaining {
    color: #888;
  }
  
  .amount-value.remaining.zero {
    color: #4ade80;
  }
  
  .add-payment-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid #333355;
    background: transparent;
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.2s;
  }
  
  .add-payment-btn:hover {
    border-color: #24c8db;
    color: #24c8db;
  }
  
  .payments-list {
    margin-top: 4px;
    margin-left: 32px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    border-left: 2px solid #f59e0b;
  }
  
  .payment-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 0.8rem;
  }
  
  .payment-date {
    color: #888;
  }
  
  .payment-amount {
    color: #e4e4e7;
    font-weight: 500;
  }
  
  @media (max-width: 640px) {
    .bill-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .bill-amounts {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
