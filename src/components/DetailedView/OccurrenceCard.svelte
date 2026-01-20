<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    BillInstanceDetailed,
    IncomeInstanceDetailed,
    Occurrence,
  } from '../../stores/detailed-month';
  import OccurrenceRow from './OccurrenceRow.svelte';
  import TransactionsDrawer from './TransactionsDrawer.svelte';
  import ItemDetailsDrawer from './ItemDetailsDrawer.svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';

  export let item: BillInstanceDetailed | IncomeInstanceDetailed;
  export let type: 'bill' | 'income' = 'bill';
  export let month: string = '';
  export let readOnly: boolean = false;

  const dispatch = createEventDispatcher();

  // Check if this is a payoff bill (only relevant for bills)
  $: isPayoffBill = type === 'bill' && (item as BillInstanceDetailed).is_payoff_bill === true;

  let showTransactionsDrawer = false;
  let showDetailsDrawer = false;
  let selectedOccurrence: Occurrence | null = null;
  let addingOccurrence = false;

  function openDetailsDrawer() {
    showDetailsDrawer = true;
  }

  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  function formatBillingPeriod(period: string): string {
    switch (period) {
      case 'bi_weekly':
        return 'Bi-Weekly';
      case 'weekly':
        return 'Weekly';
      case 'semi_annually':
        return 'Semi-Annually';
      default:
        return 'Monthly';
    }
  }

  // Computed values
  $: occurrences = item.occurrences || [];
  $: occurrenceCount = item.occurrence_count || occurrences.length;
  $: isExtraOccurrenceMonth = item.is_extra_occurrence_month;
  $: totalExpected = occurrences.reduce((sum, occ) => sum + occ.expected_amount, 0);
  $: totalPaid = occurrences.reduce(
    (sum, occ) => sum + occ.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  $: closedCount = occurrences.filter((occ) => occ.is_closed).length;
  $: allClosed = closedCount === occurrences.length && occurrences.length > 0;
  $: isClosed = (item as unknown as { is_closed?: boolean }).is_closed ?? allClosed;

  // Handle occurrence payment drawer
  function handleOpenPayments(event: CustomEvent<{ occurrence: Occurrence }>) {
    selectedOccurrence = event.detail.occurrence;
    showTransactionsDrawer = true;
  }

  function handleTransactionsUpdated() {
    showTransactionsDrawer = false;
    selectedOccurrence = null;
    dispatch('refresh');
  }

  function handleNotesUpdated() {
    dispatch('refresh');
  }

  function handleOccurrenceUpdated() {
    dispatch('refresh');
  }

  // Add ad-hoc occurrence
  async function handleAddOccurrence() {
    if (addingOccurrence || readOnly) return;
    addingOccurrence = true;

    try {
      // Default to end of month for new occurrence
      const [year, monthNum] = month.split('-').map(Number);
      const lastDay = new Date(year, monthNum, 0).getDate();
      const defaultDate = `${month}-${lastDay.toString().padStart(2, '0')}`;

      await apiClient.post(`/api/months/${month}/${type}s/${item.id}/occurrences`, {
        expected_date: defaultDate,
        expected_amount: item.expected_amount, // Full amount
      });

      success('Occurrence added');
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add occurrence');
    } finally {
      addingOccurrence = false;
    }
  }
</script>

<div class="occurrence-card" class:closed={isClosed}>
  <!-- Card Header -->
  <div class="card-header">
    <div class="header-info">
      <span class="item-name" class:closed-text={isClosed}>
        <button class="name-link" on:click={openDetailsDrawer} title="View details">
          {item.name}
        </button>
        <span class="billing-badge">{formatBillingPeriod(item.billing_period)}</span>
      </span>
      <span class="occurrence-summary">
        {occurrenceCount}
        {type === 'bill' ? 'payment' : 'receipt'}{occurrenceCount !== 1 ? 's' : ''}
        {#if closedCount > 0}
          <span class="closed-count">({closedCount}/{occurrenceCount} closed)</span>
        {/if}
      </span>
    </div>

    <div class="header-totals">
      <div class="total-column">
        <span class="total-label">Total Expected</span>
        <span class="total-value">{formatCurrency(totalExpected)}</span>
      </div>
      <div class="total-column">
        <span class="total-label">Total {type === 'bill' ? 'Paid' : 'Received'}</span>
        <span class="total-value" class:amber={totalPaid !== totalExpected && totalPaid > 0}>
          {totalPaid > 0 ? formatCurrency(totalPaid) : '-'}
        </span>
      </div>
    </div>
  </div>

  <!-- Extra Occurrence Banner (3-paycheck month) -->
  {#if isExtraOccurrenceMonth}
    <div class="extra-banner">
      <span class="extra-icon">*</span>
      <span class="extra-text">
        {occurrenceCount}-{type === 'bill' ? 'payment' : 'paycheck'} month! Extra {formatCurrency(
          item.expected_amount / occurrenceCount
        )} this month.
      </span>
    </div>
  {/if}

  <!-- Occurrences List -->
  <div class="occurrences-list">
    {#each [...occurrences].sort((a, b) => a.sequence - b.sequence) as occurrence (occurrence.id)}
      <OccurrenceRow
        {occurrence}
        {month}
        instanceId={item.id}
        {type}
        {readOnly}
        {isPayoffBill}
        on:updated={handleOccurrenceUpdated}
        on:openPayments={handleOpenPayments}
      />
    {/each}
  </div>

  <!-- Add Occurrence Button (hidden for payoff bills since they're auto-generated) -->
  {#if !readOnly && !isPayoffBill}
    <div class="card-footer">
      <button class="add-occurrence-btn" on:click={handleAddOccurrence} disabled={addingOccurrence}>
        + Add Occurrence
      </button>
    </div>
  {/if}
</div>

<!-- Transactions Drawer for selected occurrence -->
{#if selectedOccurrence}
  <TransactionsDrawer
    bind:open={showTransactionsDrawer}
    {month}
    instanceId={item.id}
    instanceName="{item.name} - {new Date(
      selectedOccurrence.expected_date + 'T00:00:00'
    ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}"
    expectedAmount={selectedOccurrence.expected_amount}
    transactionList={selectedOccurrence.payments || []}
    isClosed={selectedOccurrence.is_closed}
    type={type === 'bill' ? 'bill' : 'income'}
    occurrenceId={selectedOccurrence.id}
    occurrenceNotes={(selectedOccurrence as Occurrence & { notes?: string | null }).notes ?? ''}
    {isPayoffBill}
    on:updated={handleTransactionsUpdated}
    on:notesUpdated={handleNotesUpdated}
  />
{/if}

<!-- Item Details Drawer -->
<ItemDetailsDrawer bind:open={showDetailsDrawer} {item} {type} />

<style>
  .occurrence-card {
    background: var(--bg-elevated);
    border-radius: 10px;
    border: 1px solid var(--border-default);
    overflow: hidden;
    margin-bottom: 8px;
  }

  .occurrence-card.closed {
    background: var(--success-bg);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-default);
  }

  .header-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .name-link {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    text-decoration: none;
    transition: color 0.15s;
  }

  .name-link:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .closed-text .name-link {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .closed-text .name-link:hover {
    text-decoration: underline line-through;
  }

  .closed-text {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .billing-badge {
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--accent-muted);
    color: var(--accent);
    font-weight: 500;
    text-transform: uppercase;
  }

  .occurrence-summary {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .closed-count {
    color: var(--success);
  }

  .header-totals {
    display: flex;
    gap: 24px;
  }

  .total-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .total-label {
    font-size: 0.6rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .total-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .total-value.amber {
    color: var(--warning);
  }

  .extra-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--success-bg);
    border-bottom: 1px solid var(--success-border);
  }

  .extra-icon {
    font-size: 1.2rem;
    color: var(--success);
  }

  .extra-text {
    font-size: 0.8rem;
    color: var(--success);
    font-weight: 500;
  }

  .occurrences-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
  }

  .card-footer {
    padding: 8px 16px 12px;
    border-top: 1px solid var(--border-default);
  }

  .add-occurrence-btn {
    background: transparent;
    border: 1px dashed var(--border-default);
    color: var(--text-secondary);
    font-size: 0.75rem;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-occurrence-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-muted);
  }

  .add-occurrence-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .header-totals {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
