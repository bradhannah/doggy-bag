<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import type { BillInstanceDetailed, IncomeInstanceDetailed } from '../../stores/detailed-month';
  import { detailedMonth } from '../../stores/detailed-month';
  import { paymentSources } from '../../stores/payment-sources';
  import OccurrenceRow from './OccurrenceRow.svelte';
  import ItemDetailsDrawer from './ItemDetailsDrawer.svelte';
  import PayCreditCardModal from './PayCreditCardModal.svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import { formatCurrency } from '$lib/utils/format';

  export let item: BillInstanceDetailed | IncomeInstanceDetailed;
  export let type: 'bill' | 'income' = 'bill';
  export let month: string = '';
  export let readOnly: boolean = false;
  export let variant: 'card' | 'flat' = 'card';

  const dispatch = createEventDispatcher();

  // Check if this is a payoff bill (only relevant for bills)
  $: isPayoffBill = type === 'bill' && (item as BillInstanceDetailed).is_payoff_bill === true;

  // Check if this is a virtual insurance item (protected like payoff bills)
  $: isVirtualInsurance =
    item.is_virtual === true &&
    ((type === 'bill' && (item as BillInstanceDetailed).is_insurance_expense === true) ||
      (type === 'income' && (item as IncomeInstanceDetailed).is_insurance_reimbursement === true));

  // Check if this is an expected claim (for badge display)
  $: isExpectedClaim =
    isVirtualInsurance &&
    ((type === 'bill' && (item as BillInstanceDetailed).is_expected_claim === true) ||
      (type === 'income' && (item as IncomeInstanceDetailed).is_expected_claim === true));

  // Protected items: cannot add occurrences, edit, or delete
  $: isProtected = isPayoffBill || isVirtualInsurance;

  // Payoff bill specific state
  let showPayCCModal = false;

  // Payoff bill specific data
  $: billItem = item as BillInstanceDetailed;
  $: payoffSourceId = billItem.payoff_source_id || billItem.payment_source?.id || '';
  $: payoffSource = $paymentSources.find((ps) => ps.id === payoffSourceId);
  $: payoffSourceName = payoffSource?.name || billItem.payment_source?.name || 'Credit Card';

  // Get current CC balance from bankBalances in the store
  $: payoffCurrentBalance =
    isPayoffBill && payoffSourceId
      ? ($detailedMonth?.data?.bankBalances?.[payoffSourceId] ?? 0)
      : 0;

  // Closed occurrences represent completed payments (for payoff bills)
  $: closedPayoffChunks = isPayoffBill ? occurrences.filter((o) => o.is_closed) : [];

  // Sum of all closed payment chunks
  $: payoffPaidSoFar = closedPayoffChunks.reduce((sum, o) => sum + o.expected_amount, 0);

  // Remaining = current balance (negative for CC) - already paid
  $: payoffRemaining = Math.max(0, Math.abs(payoffCurrentBalance) - payoffPaidSoFar);

  let showDetailsDrawer = false;
  let addingOccurrence = false;
  let saving = false;

  // Flat variant: occurrences expanded by default, collapsible via chevron
  let expanded = true;

  function openDetailsDrawer() {
    showDetailsDrawer = true;
  }

  // Navigate to insurance claim when clicking on an insurance item
  function handleItemClick() {
    if (isVirtualInsurance && item.claim_id) {
      // Navigate to the insurance claim
      goto(`/insurance?claim=${item.claim_id}`);
    } else {
      openDetailsDrawer();
    }
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
  // In the occurrence-only model, closed occurrences represent paid amounts
  $: totalPaid = occurrences.reduce(
    (sum, occ) => sum + (occ.is_closed ? occ.expected_amount : 0),
    0
  );
  $: closedCount = occurrences.filter((occ) => occ.is_closed).length;
  $: allClosed = closedCount === occurrences.length && occurrences.length > 0;
  $: isClosed = (item as unknown as { is_closed?: boolean }).is_closed ?? allClosed;

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

<div class="occurrence-card" class:closed={isClosed} class:flat={variant === 'flat'}>
  <!-- Card Header - Single Line -->
  <div class="card-header">
    <div class="header-left" class:closed-text={isClosed}>
      {#if variant === 'flat'}
        <!-- Flat variant: chevron toggle for expand/collapse -->
        <button
          class="chevron-toggle"
          on:click={() => (expanded = !expanded)}
          title={expanded ? 'Collapse occurrences' : 'Expand occurrences'}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            class:rotated={expanded}
          >
            <path d="M8 5l8 7-8 7z" />
          </svg>
        </button>
      {:else if !readOnly && !isProtected}
        <button
          class="add-occurrence-icon"
          on:click={handleAddOccurrence}
          disabled={addingOccurrence}
          title="Add occurrence"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      {/if}
      <button
        class="name-link"
        class:insurance-link={isVirtualInsurance}
        on:click={handleItemClick}
        title={isVirtualInsurance ? 'View insurance claim' : 'View details'}
      >
        {item.name}
      </button>
      {#if isPayoffBill}
        <span class="billing-badge payoff">Payoff</span>
      {:else if isVirtualInsurance}
        <span class="billing-badge insurance" title="Insurance - managed from Insurance section">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {isExpectedClaim ? 'Expected' : 'Actual'}
        </span>
      {:else}
        <span class="billing-badge">{formatBillingPeriod(item.billing_period)}</span>
      {/if}
      {#if isPayoffBill}
        <span class="close-ratio">
          {closedPayoffChunks.length}/{closedPayoffChunks.length +
            occurrences.filter((o) => !o.is_closed).length}
        </span>
      {:else}
        <span class="close-ratio" class:all-closed={allClosed}>
          ({closedCount}/{occurrenceCount}){#if allClosed}<span class="check-mark">&#10003;</span
            >{/if}
        </span>
      {/if}
    </div>

    <div class="header-right">
      {#if isPayoffBill}
        <!-- Payoff bill: Balance | Paid | Remaining inline -->
        <span class="amount-inline debt">{formatCurrency(Math.abs(payoffCurrentBalance))}</span>
        <span class="amount-sep">/</span>
        <span class="amount-inline" class:positive={payoffPaidSoFar > 0}>
          {payoffPaidSoFar > 0 ? formatCurrency(payoffPaidSoFar) : '—'}
        </span>
        <span class="amount-sep">/</span>
        <span class="amount-inline" class:zero={payoffRemaining === 0}>
          {formatCurrency(payoffRemaining)}
        </span>
        {#if !readOnly}
          <button class="pay-btn" on:click={() => (showPayCCModal = true)} title="Record a payment">
            Pay
          </button>
        {/if}
      {:else}
        <span class="amount-inline">{formatCurrency(totalExpected)}</span>
        <span class="amount-sep">/</span>
        <span
          class="amount-inline"
          class:amber={totalPaid !== totalExpected && totalPaid > 0}
          class:positive={totalPaid === totalExpected && totalPaid > 0}
        >
          {totalPaid > 0 ? formatCurrency(totalPaid) : '—'}
        </span>
      {/if}
      {#if variant === 'flat' && !readOnly && !isProtected}
        <button
          class="add-occurrence-icon flat-add"
          on:click={handleAddOccurrence}
          disabled={addingOccurrence}
          title="Add occurrence"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Extra Occurrence Banner (3-paycheck month) -->
  {#if isExtraOccurrenceMonth && (variant === 'card' || expanded)}
    <div class="extra-banner">
      <span class="extra-icon">*</span>
      <span class="extra-text">
        {occurrenceCount}-{type === 'bill' ? 'payment' : 'paycheck'} month! Extra {formatCurrency(
          item.expected_amount / occurrenceCount
        )} this month.
      </span>
    </div>
  {/if}

  <!-- Occurrences List - indented sub-items with left border -->
  {#if variant === 'card' || expanded}
    <div class="occurrences-list">
      {#each [...occurrences].sort((a, b) => a.sequence - b.sequence) as occurrence (occurrence.id)}
        <OccurrenceRow
          {occurrence}
          {month}
          instanceId={item.id}
          itemName={item.name}
          defaultPaymentSourceId={item.payment_source?.id}
          {type}
          {readOnly}
          {isPayoffBill}
          {isVirtualInsurance}
          on:updated={handleOccurrenceUpdated}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Item Details Drawer -->
<ItemDetailsDrawer bind:open={showDetailsDrawer} {item} {type} />

<!-- Pay Credit Card Modal (for payoff bills) -->
{#if isPayoffBill}
  <PayCreditCardModal
    bind:open={showPayCCModal}
    {month}
    instanceId={item.id}
    cardName={payoffSourceName}
    currentBalance={Math.abs(payoffCurrentBalance)}
    paidSoFar={payoffPaidSoFar}
    remaining={payoffRemaining}
    on:updated={() => dispatch('refresh')}
  />
{/if}

<style>
  .occurrence-card {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    overflow: hidden;
    margin-bottom: var(--space-1);
  }

  .occurrence-card.closed {
    background: var(--success-bg);
  }

  /* ── Flat variant: strip card styling ── */
  .occurrence-card.flat {
    background: transparent;
    border: none;
    border-radius: 0;
    margin-bottom: 0;
  }

  .occurrence-card.flat.closed {
    background: transparent;
  }

  .occurrence-card.flat .card-header {
    border-bottom-style: dotted;
  }

  /* ── Single-line header ── */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    min-height: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1;
  }

  .add-occurrence-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    border: 1px dashed var(--border-default);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .add-occurrence-icon:hover:not(:disabled) {
    border-color: var(--accent);
    border-style: solid;
    color: var(--accent);
    background: var(--accent-muted);
  }

  .add-occurrence-icon:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Chevron toggle for flat variant ── */
  .chevron-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: color 0.15s ease;
  }

  .chevron-toggle:hover {
    color: var(--accent);
  }

  .chevron-toggle svg {
    transition: transform 0.15s ease;
  }

  .chevron-toggle svg.rotated {
    transform: rotate(90deg);
  }

  .add-occurrence-icon.flat-add {
    margin-left: var(--space-1);
  }

  .name-link {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    text-decoration: none;
    transition: color 0.15s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

  .name-link.insurance-link {
    color: var(--purple);
  }

  .name-link.insurance-link:hover {
    color: var(--purple-hover);
  }

  .closed-text {
    opacity: 0.6;
  }

  .billing-badge {
    font-size: 0.6rem;
    padding: 1px var(--space-2);
    border-radius: 10px;
    background: var(--accent-muted);
    color: var(--accent);
    font-weight: 500;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .billing-badge.payoff {
    background: var(--purple-bg);
    color: var(--purple);
  }

  .billing-badge.insurance {
    background: var(--purple-bg);
    color: var(--purple);
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .billing-badge.insurance svg {
    flex-shrink: 0;
  }

  .close-ratio {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .close-ratio.all-closed {
    color: var(--success);
  }

  .check-mark {
    margin-left: 2px;
    color: var(--success);
    font-weight: 700;
  }

  /* ── Right side: inline amounts ── */
  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
    margin-left: var(--space-3);
  }

  .amount-inline {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .amount-inline.amber {
    color: var(--warning);
  }

  .amount-inline.debt {
    color: var(--error);
  }

  .amount-inline.positive {
    color: var(--success);
  }

  .amount-inline.zero {
    color: var(--success);
  }

  .amount-sep {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .pay-btn {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    background: var(--purple);
    border: none;
    color: var(--text-inverse);
    white-space: nowrap;
  }

  .pay-btn:hover:not(:disabled) {
    background: var(--purple-hover);
  }

  .pay-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Extra occurrence banner ── */
  .extra-banner {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--success-bg);
    border-bottom: 1px solid var(--success-border);
  }

  .extra-icon {
    font-size: 1rem;
    color: var(--success);
  }

  .extra-text {
    font-size: 0.75rem;
    color: var(--success);
    font-weight: 500;
  }

  /* ── Occurrences list with left-border sub-item hierarchy ── */
  .occurrences-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-left: var(--space-4);
    padding: var(--space-1) var(--space-1) var(--space-1) 0;
    border-left: 2px solid var(--border-subtle);
  }

  @media (max-width: 640px) {
    .card-header {
      gap: var(--space-2);
    }

    .header-right {
      margin-left: var(--space-2);
    }

    .name-link {
      max-width: 120px;
    }
  }
</style>
