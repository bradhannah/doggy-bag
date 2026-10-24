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
  export let categoryName: string = '';

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
  <div class="ledger-row item-row">
    <div class="ledger-label item-label">
      {#if variant === 'flat'}
        <button
          class="icon-btn chevron-toggle"
          on:click={() => (expanded = !expanded)}
          aria-label={expanded ? `Collapse ${item.name}` : `Expand ${item.name}`}
          aria-expanded={expanded}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            class:rotated={expanded}
            aria-hidden="true"
          >
            <path d="M8 5l8 7-8 7z" />
          </svg>
        </button>
      {/if}
      <button
        class="name-link"
        class:insurance-link={isVirtualInsurance}
        on:click={handleItemClick}
        title={isVirtualInsurance
          ? `${item.name}: view insurance claim`
          : `${item.name}: view details`}
      >
        {item.name}
      </button>
      {#if isPayoffBill}
        <span class="badge badge-purple">Payoff</span>
      {:else if isVirtualInsurance}
        <span class="badge badge-purple" title="Insurance - managed from Insurance section">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {isExpectedClaim ? 'Expected' : 'Actual'}
        </span>
      {:else}
        <span class="item-meta">{formatBillingPeriod(item.billing_period)}</span>
      {/if}
      {#if item.is_adhoc}
        <span class="badge badge-purple">Ad-hoc</span>
      {/if}
      {#if item.savings_account}
        <a class="savings-link" href="/savings"
          >{type === 'bill' ? 'To' : 'From'} {item.savings_account.name}</a
        >
      {/if}
      {#if isPayoffBill && payoffRemaining > 0}
        <span class="item-meta">{formatCurrency(payoffRemaining)} left</span>
      {/if}
    </div>

    {#if isPayoffBill}
      <span class="ledger-amount item-amount debt" data-col="expected">
        {formatCurrency(Math.abs(payoffCurrentBalance))}
      </span>
      <span class="ledger-amount item-amount" class:positive={payoffPaidSoFar > 0} data-col="paid">
        {payoffPaidSoFar > 0 ? formatCurrency(payoffPaidSoFar) : '—'}
      </span>
    {:else}
      <span class="ledger-amount item-amount" data-col="expected">
        {formatCurrency(totalExpected)}
      </span>
      <span
        class="ledger-amount item-amount"
        class:amber={totalPaid !== totalExpected && totalPaid > 0}
        class:positive={totalPaid === totalExpected && totalPaid > 0}
        data-col="paid"
      >
        {totalPaid > 0 ? formatCurrency(totalPaid) : '—'}
      </span>
    {/if}

    <div class="ledger-actions">
      {#if isPayoffBill && !readOnly}
        <button class="btn btn-sm pay-btn" on:click={() => (showPayCCModal = true)}>Pay</button>
      {/if}
      {#if !readOnly && !isProtected}
        <button
          class="icon-btn"
          on:click={handleAddOccurrence}
          disabled={addingOccurrence}
          aria-label="Add a payment to {item.name}"
          title="Add occurrence"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Extra Occurrence Banner (3-paycheck month) -->
  {#if isExtraOccurrenceMonth && (variant === 'card' || expanded)}
    <p class="extra-banner">
      {occurrenceCount}-{type === 'bill' ? 'payment' : 'paycheck'} month: {formatCurrency(
        item.expected_amount / occurrenceCount
      )} extra this month
    </p>
  {/if}

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
          instanceIsAdhoc={item.is_adhoc}
          on:updated={handleOccurrenceUpdated}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Item Details Drawer -->
<ItemDetailsDrawer bind:open={showDetailsDrawer} {item} {type} {categoryName} />

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
  .item-row {
    min-height: var(--control-height);
    padding-left: var(--space-8);
  }

  .flat .item-row {
    padding-left: var(--space-3);
  }

  .chevron-toggle {
    width: var(--space-5);
    height: var(--space-5);
    color: var(--text-secondary);
  }

  .chevron-toggle svg {
    transition: transform 0.15s ease;
  }

  .chevron-toggle svg.rotated {
    transform: rotate(90deg);
  }

  .name-link {
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    font-size: var(--font-size-md);
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s;
  }

  .name-link:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .closed .name-link {
    color: var(--text-secondary);
  }

  .name-link.insurance-link {
    color: var(--purple);
  }

  .name-link.insurance-link:hover {
    color: var(--purple-hover);
  }

  .badge svg {
    margin-right: var(--space-1);
  }

  /* When space is short, the cadence and links give way before the item name */
  .item-meta,
  .savings-link {
    min-width: 0;
    flex-shrink: 4;
    font-size: var(--font-size-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-meta {
    color: var(--text-secondary);
  }

  .savings-link {
    color: var(--accent);
  }

  .item-amount {
    font-size: var(--font-size-md);
    font-weight: 500;
    color: var(--text-primary);
  }

  .item-amount.amber {
    color: var(--warning);
  }

  .item-amount.positive {
    color: var(--success);
  }

  .item-amount.debt {
    color: var(--error);
  }

  .pay-btn {
    background: var(--purple);
    border-color: var(--purple);
    color: var(--text-inverse);
  }

  .pay-btn:hover:not(:disabled) {
    background: var(--purple-hover);
    border-color: var(--purple-hover);
  }

  .extra-banner {
    margin: 0;
    padding: 0 var(--space-3) var(--space-1) var(--space-8);
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--success);
  }

  .occurrences-list {
    display: flex;
    flex-direction: column;
    padding-bottom: var(--space-1);
  }
</style>
