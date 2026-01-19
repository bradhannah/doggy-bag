<script lang="ts">
  import { goto } from '$app/navigation';
  import { currentMonth, goToMonth } from '../../stores/ui';
  import {
    monthsStore,
    monthlyLoading,
    monthExists,
    monthIsReadOnly,
    leftoverSummary,
    billInstances,
    incomeInstances,
    bankBalances,
  } from '../../stores/months';
  import {
    loadPaymentSources,
    paymentSources,
    isDebtAccount,
    type PaymentSource,
  } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';
  import { apiUrl } from '$lib/api/client';
  import { onMount } from 'svelte';
  import MonthNotCreated from '../MonthNotCreated.svelte';

  // Refresh function that can be called externally
  export function refresh() {
    if ($currentMonth) {
      monthsStore.loadMonth($currentMonth);
      loadPaymentSources();
      loadAdjacentMonths();
    }
  }

  // Load payment sources on mount
  onMount(() => {
    loadPaymentSources();
  });

  // Load data when month changes
  $: {
    if ($currentMonth) {
      monthsStore.loadMonth($currentMonth);
    }
  }

  // Calculate previous and next months
  function getAdjacentMonth(monthStr: string, offset: number): string {
    const [year, m] = monthStr.split('-').map(Number);
    const date = new Date(year, m - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  $: prevMonth = $currentMonth ? getAdjacentMonth($currentMonth, -1) : '';
  $: nextMonth = $currentMonth ? getAdjacentMonth($currentMonth, 1) : '';

  // Format month for display
  function formatMonthDisplay(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function formatShortMonth(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Format currency
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(dollars);
  }

  // Types for items with occurrences
  interface Payment {
    amount: number;
  }

  interface Occurrence {
    payments?: Payment[];
  }

  interface ItemWithOccurrences {
    occurrences?: Occurrence[];
  }

  // Helper to sum payments from occurrences
  function sumOccurrencePayments(item: ItemWithOccurrences): number {
    return (item.occurrences || []).reduce(
      (oSum: number, occ: Occurrence) =>
        oSum + (occ.payments || []).reduce((pSum: number, p: Payment) => pSum + p.amount, 0),
      0
    );
  }

  // Type for bill/income instances with expected_amount
  interface InstanceWithExpectedAmount {
    expected_amount?: number;
    amount?: number;
    occurrences?: Occurrence[];
    is_payoff_bill?: boolean;
    payoff_source_id?: string;
  }

  // Calculate totals from instances - use expected_amount and occurrence-based payments
  // Filter out payoff bills from regular bills calculation
  $: regularBills = $billInstances.filter((b) => !(b as InstanceWithExpectedAmount).is_payoff_bill);
  $: payoffBills = $billInstances.filter((b) => (b as InstanceWithExpectedAmount).is_payoff_bill);

  $: billsExpected = regularBills.reduce(
    (sum, b) => sum + ((b as InstanceWithExpectedAmount).expected_amount || b.amount || 0),
    0
  );
  $: billsPaid = regularBills.reduce(
    (sum, b) => sum + sumOccurrencePayments(b as ItemWithOccurrences),
    0
  );
  $: billsRemaining = billsExpected - billsPaid;

  $: incomeExpected = $incomeInstances.reduce(
    (sum, i) => sum + ((i as InstanceWithExpectedAmount).expected_amount || i.amount || 0),
    0
  );
  $: incomeReceived = $incomeInstances.reduce(
    (sum, i) => sum + sumOccurrencePayments(i as ItemWithOccurrences),
    0
  );
  $: incomeRemaining = incomeExpected - incomeReceived;

  // CC Payoffs - calculate paid/remaining for each
  interface CCPayoffInfo {
    id: string;
    name: string;
    balance: number;
    paid: number;
    remaining: number;
  }

  $: ccPayoffs = payoffBills.map((bill) => {
    const expected = (bill as InstanceWithExpectedAmount).expected_amount || bill.amount || 0;
    const paid = sumOccurrencePayments(bill as ItemWithOccurrences);
    const sourceId = (bill as InstanceWithExpectedAmount).payoff_source_id;
    const source = $paymentSources.find((ps) => ps.id === sourceId);
    return {
      id: bill.id,
      name: source?.name || bill.name,
      balance: expected,
      paid: paid,
      remaining: expected - paid,
    } as CCPayoffInfo;
  });

  $: totalCCPayoffs = ccPayoffs.reduce((sum, cc) => sum + cc.balance, 0);
  $: totalCCPaid = ccPayoffs.reduce((sum, cc) => sum + cc.paid, 0);
  $: totalCCRemaining = ccPayoffs.reduce((sum, cc) => sum + cc.remaining, 0);

  // Adjacent month data
  interface MonthSummary {
    month: string;
    exists: boolean;
    isReadOnly: boolean;
    leftover: number;
    billsProgress: number;
    incomeProgress: number;
  }

  let prevMonthData: MonthSummary | null = null;
  let nextMonthData: MonthSummary | null = null;
  let _loadingAdjacent = false;

  async function loadAdjacentMonths() {
    if (!$currentMonth) return;
    _loadingAdjacent = true;

    try {
      const [prevRes, nextRes] = await Promise.all([
        fetch(apiUrl(`/api/months/${prevMonth}`)).catch(() => null),
        fetch(apiUrl(`/api/months/${nextMonth}`)).catch(() => null),
      ]);

      if (prevRes && prevRes.ok) {
        const data = await prevRes.json();
        const billsExp =
          data.bill_instances?.reduce(
            (s: number, b: InstanceWithExpectedAmount) => s + (b.expected_amount || b.amount || 0),
            0
          ) || 0;
        const billsPd =
          data.bill_instances?.reduce(
            (s: number, b: ItemWithOccurrences) => s + sumOccurrencePayments(b),
            0
          ) || 0;
        const incExp =
          data.income_instances?.reduce(
            (s: number, i: InstanceWithExpectedAmount) => s + (i.expected_amount || i.amount || 0),
            0
          ) || 0;
        const incRec =
          data.income_instances?.reduce(
            (s: number, i: ItemWithOccurrences) => s + sumOccurrencePayments(i),
            0
          ) || 0;

        prevMonthData = {
          month: prevMonth,
          exists: true,
          isReadOnly: data.is_read_only ?? false,
          leftover: data.summary?.leftover ?? 0,
          billsProgress: billsExp > 0 ? Math.round((billsPd / billsExp) * 100) : 0,
          incomeProgress: incExp > 0 ? Math.round((incRec / incExp) * 100) : 0,
        };
      } else {
        prevMonthData = {
          month: prevMonth,
          exists: false,
          isReadOnly: false,
          leftover: 0,
          billsProgress: 0,
          incomeProgress: 0,
        };
      }

      if (nextRes && nextRes.ok) {
        const data = await nextRes.json();
        const billsExp =
          data.bill_instances?.reduce(
            (s: number, b: InstanceWithExpectedAmount) => s + (b.expected_amount || b.amount || 0),
            0
          ) || 0;
        const billsPd =
          data.bill_instances?.reduce(
            (s: number, b: ItemWithOccurrences) => s + sumOccurrencePayments(b),
            0
          ) || 0;
        const incExp =
          data.income_instances?.reduce(
            (s: number, i: InstanceWithExpectedAmount) => s + (i.expected_amount || i.amount || 0),
            0
          ) || 0;
        const incRec =
          data.income_instances?.reduce(
            (s: number, i: ItemWithOccurrences) => s + sumOccurrencePayments(i),
            0
          ) || 0;

        nextMonthData = {
          month: nextMonth,
          exists: true,
          isReadOnly: data.is_read_only ?? false,
          leftover: data.summary?.leftover ?? 0,
          billsProgress: billsExp > 0 ? Math.round((billsPd / billsExp) * 100) : 0,
          incomeProgress: incExp > 0 ? Math.round((incRec / incExp) * 100) : 0,
        };
      } else {
        nextMonthData = {
          month: nextMonth,
          exists: false,
          isReadOnly: false,
          leftover: 0,
          billsProgress: 0,
          incomeProgress: 0,
        };
      }
    } catch (err) {
      console.error('Failed to load adjacent months:', err);
    } finally {
      _loadingAdjacent = false;
    }
  }

  // Load adjacent months when current month changes
  $: if ($currentMonth && $monthExists) {
    loadAdjacentMonths();
  }

  // Attention items
  interface AttentionItem {
    type: 'lock' | 'due_soon' | 'overdue' | 'incomplete';
    message: string;
    action?: () => void;
    actionLabel?: string;
  }

  // Force reactivity by referencing dependencies
  $: attentionItems = (() => {
    // Reference dependencies so Svelte tracks them
    void prevMonthData;
    void $billInstances;
    void prevMonth;
    void $currentMonth;
    return computeAttentionItems();
  })();

  function computeAttentionItems(): AttentionItem[] {
    const items: AttentionItem[] = [];

    // Check if previous month is complete and can be locked
    if (prevMonthData?.exists && !prevMonthData.isReadOnly) {
      const allBillsPaid = prevMonthData.billsProgress === 100;
      const allIncomeReceived = prevMonthData.incomeProgress === 100;
      if (allBillsPaid && allIncomeReceived) {
        items.push({
          type: 'lock',
          message: `${formatShortMonth(prevMonth)} is complete and ready to lock`,
          action: () => promptLockMonth(prevMonth),
          actionLabel: 'Lock Month',
        });
      }
    }

    // Check for bills due soon (within 7 days)
    // TODO: Implement due date checking when expected_date is added to instances
    const _sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const billsDueSoon = $billInstances.filter((b) => {
      const isClosed = (b as { is_closed?: boolean }).is_closed ?? false;
      if (isClosed) return false;
      // If bill has expected_date, check if it's within 7 days
      // For now, we don't have expected_date in the basic instance, so skip this
      return false;
    });

    if (billsDueSoon.length > 0) {
      items.push({
        type: 'due_soon',
        message: `${billsDueSoon.length} bill${billsDueSoon.length > 1 ? 's' : ''} due in the next 7 days`,
        action: () => goto(`/month/${$currentMonth}`),
        actionLabel: 'View',
      });
    }

    return items;
  }

  // Lock month
  let lockingMonth = false;
  let showLockConfirm = false;
  let monthToLock = '';

  function promptLockMonth(month: string) {
    monthToLock = month;
    showLockConfirm = true;
  }

  function cancelLock() {
    showLockConfirm = false;
    monthToLock = '';
  }

  async function confirmLockMonth() {
    if (!monthToLock) return;
    lockingMonth = true;

    try {
      const response = await fetch(apiUrl(`/api/months/${monthToLock}/lock`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to lock month');
      }

      const data = await response.json();
      success(data.message || `Month ${monthToLock} locked`);
      showLockConfirm = false;
      monthToLock = '';

      // Reload adjacent months to update status
      loadAdjacentMonths();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError(message);
    } finally {
      lockingMonth = false;
    }
  }

  // Create month
  let creating = false;
  async function handleCreateMonth() {
    if (!$currentMonth) return;
    creating = true;
    try {
      const created = await monthsStore.createMonth($currentMonth);
      if (created) {
        success(`Month ${$currentMonth} created`);
        loadAdjacentMonths();
      }
    } catch {
      showError('Failed to create month');
    } finally {
      creating = false;
    }
  }

  // Navigate to details
  function viewDetails() {
    goto(`/month/${$currentMonth}`);
  }

  function viewMonth(month: string) {
    goToMonth(month);
  }

  // Bank balances - filter out savings/investment accounts (they're on /savings page)
  // Also filter out pay_off_monthly accounts (they show in CC Payoffs section)
  $: regularAccounts = $paymentSources.filter(
    (ps: PaymentSource) => !ps.is_savings && !ps.is_investment && !ps.pay_off_monthly
  );

  // Only asset accounts for Starting Cash (no debt)
  $: assetAccounts = regularAccounts.filter((ps: PaymentSource) => !isDebtAccount(ps.type));

  // Get balance for a payment source (month-specific only)
  function getBalance(source: PaymentSource): number | null {
    return $bankBalances[source.id] ?? null;
  }

  // Calculate starting cash total
  $: totalStartingCash = assetAccounts.reduce((sum, ps) => sum + (getBalance(ps) ?? 0), 0);

  // API-driven leftover values (guaranteed to match Details sidebar)
  $: apiLeftover = $leftoverSummary?.leftover ?? 0;
  $: apiBankBalances = $leftoverSummary?.bankBalances ?? 0;
  $: apiRemainingIncome = $leftoverSummary?.remainingIncome ?? 0;
  $: apiRemainingExpenses = $leftoverSummary?.remainingExpenses ?? 0;
  $: apiIsValid = $leftoverSummary?.isValid ?? false;
  $: isPositive = apiLeftover >= 0;
</script>

<div class="dashboard">
  {#if $monthlyLoading}
    <div class="loading-state">
      <p>Loading...</p>
    </div>
  {:else if !$monthExists}
    <MonthNotCreated
      monthDisplay={$currentMonth ? formatMonthDisplay($currentMonth) : 'This month'}
      {creating}
      on:create={handleCreateMonth}
    />
  {:else}
    <!-- Budget Math Breakdown -->
    <section class="budget-breakdown">
      {#if $monthIsReadOnly}
        <div class="locked-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <span>Month Locked</span>
        </div>
      {/if}

      <!-- Equation Bar (Hero Summary) -->
      <div class="equation-bar">
        <div class="equation-box positive">
          <span class="eq-amount">{formatCurrency(apiBankBalances)}</span>
          <span class="eq-label">Bank Balances</span>
        </div>
        <span class="eq-operator">+</span>
        <div class="equation-box positive">
          <span class="eq-amount">{formatCurrency(apiRemainingIncome)}</span>
          <span class="eq-label">Remaining Income</span>
        </div>
        <span class="eq-operator negative">−</span>
        <div class="equation-box negative">
          <span class="eq-amount">{formatCurrency(apiRemainingExpenses)}</span>
          <span class="eq-label">Remaining Expenses</span>
        </div>
        <span class="eq-equals">=</span>
        <div class="equation-box result" class:positive={isPositive} class:negative={!isPositive}>
          <span class="eq-amount">{formatCurrency(apiLeftover)}</span>
          <span class="eq-label">LEFTOVER</span>
        </div>
      </div>

      <!-- Starting Cash Section -->
      <div class="math-section">
        <div class="section-header">
          <span class="section-title">STARTING CASH</span>
        </div>
        <div class="section-items">
          {#each assetAccounts as account (account.id)}
            <div class="item-row">
              <span class="item-name">{account.name}</span>
              <span class="item-dots"></span>
              <span class="item-amount">{formatCurrency(getBalance(account) ?? 0)}</span>
            </div>
          {/each}
          {#if assetAccounts.length === 0}
            <div class="item-row empty">
              <span class="item-name">No bank accounts configured</span>
            </div>
          {/if}
        </div>
        <div class="section-total">
          <div class="total-line"></div>
          <span class="total-amount">{formatCurrency(totalStartingCash)}</span>
        </div>
      </div>

      <!-- Income Section -->
      <div class="math-section income-section">
        <div class="section-header">
          <span class="section-operator">+</span>
          <span class="section-title">INCOME</span>
          <span class="section-expected">{formatCurrency(incomeExpected)}</span>
        </div>
        <div class="section-items indented">
          <div class="item-row">
            <span class="item-name">Received</span>
            <span class="item-dots"></span>
            <span class="item-amount">{formatCurrency(incomeReceived)}</span>
          </div>
          <div class="item-row">
            <span class="item-name">Remaining</span>
            <span class="item-dots"></span>
            <span class="item-amount" class:complete={incomeRemaining === 0}>
              {formatCurrency(incomeRemaining)}
              {#if incomeRemaining === 0}
                <span class="checkmark">✓</span>
              {/if}
            </span>
          </div>
        </div>
        <div class="section-total">
          <div class="total-line"></div>
          <span class="total-amount">{formatCurrency(incomeExpected)}</span>
        </div>
      </div>

      <!-- Bills Section -->
      <div class="math-section bills-section">
        <div class="section-header">
          <span class="section-operator negative">−</span>
          <span class="section-title">BILLS</span>
          <span class="section-expected">{formatCurrency(billsExpected)}</span>
        </div>
        <div class="section-items indented">
          <div class="item-row">
            <span class="item-name">Paid</span>
            <span class="item-dots"></span>
            <span class="item-amount">{formatCurrency(billsPaid)}</span>
          </div>
          <div class="item-row">
            <span class="item-name">Remaining</span>
            <span class="item-dots"></span>
            <span class="item-amount" class:complete={billsRemaining === 0}>
              {formatCurrency(billsRemaining)}
              {#if billsRemaining === 0}
                <span class="checkmark">✓</span>
              {/if}
            </span>
          </div>
        </div>
        <div class="section-total">
          <div class="total-line"></div>
          <span class="total-amount">{formatCurrency(billsExpected)}</span>
        </div>
      </div>

      <!-- CC Payoffs Section -->
      {#if ccPayoffs.length > 0}
        <div class="math-section cc-section">
          <div class="section-header">
            <span class="section-operator negative">−</span>
            <span class="section-title">CC PAYOFFS</span>
          </div>
          <div class="section-items indented">
            {#each ccPayoffs as cc (cc.id)}
              <div class="cc-group">
                <div class="cc-name">{cc.name}</div>
                <div class="cc-details">
                  <div class="item-row">
                    <span class="item-name">Balance</span>
                    <span class="item-dots"></span>
                    <span class="item-amount">{formatCurrency(cc.balance)}</span>
                  </div>
                  <div class="item-row">
                    <span class="item-name">Paid</span>
                    <span class="item-dots"></span>
                    <span class="item-amount">{formatCurrency(cc.paid)}</span>
                  </div>
                  <div class="item-row">
                    <span class="item-name">Remaining</span>
                    <span class="item-dots"></span>
                    <span class="item-amount" class:complete={cc.remaining === 0}>
                      {formatCurrency(cc.remaining)}
                      {#if cc.remaining === 0}
                        <span class="checkmark">✓</span>
                      {/if}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          <div class="section-total">
            <div class="total-line"></div>
            <span class="total-amount">{formatCurrency(totalCCPayoffs)}</span>
          </div>
        </div>
      {/if}

      <button class="view-details-btn" on:click={viewDetails}>
        View Details
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18L15 12L9 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </section>

    <!-- Adjacent Months -->
    <section class="adjacent-months">
      <!-- Previous Month -->
      <button class="month-card prev" on:click={() => viewMonth(prevMonth)}>
        <div class="card-nav">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="card-month">{formatShortMonth(prevMonth)}</span>
        </div>
        {#if prevMonthData?.exists}
          <div class="card-status">
            {#if prevMonthData.isReadOnly}
              <span class="status-badge locked">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                Locked
              </span>
            {:else if prevMonthData.billsProgress === 100 && prevMonthData.incomeProgress === 100}
              <span class="status-badge complete">Complete</span>
            {:else}
              <span class="status-badge in-progress">In Progress</span>
            {/if}
          </div>
          <div
            class="card-leftover"
            class:positive={prevMonthData.leftover >= 0}
            class:negative={prevMonthData.leftover < 0}
          >
            {formatCurrency(prevMonthData.leftover)}
          </div>
        {:else}
          <div class="card-empty">Not created</div>
        {/if}
      </button>

      <!-- Next Month -->
      <button class="month-card next" on:click={() => viewMonth(nextMonth)}>
        <div class="card-nav">
          <span class="card-month">{formatShortMonth(nextMonth)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        {#if nextMonthData?.exists}
          <div class="card-status">
            {#if nextMonthData.isReadOnly}
              <span class="status-badge locked">Locked</span>
            {:else}
              <span class="status-badge planned">Planned</span>
            {/if}
          </div>
          <div
            class="card-leftover"
            class:positive={nextMonthData.leftover >= 0}
            class:negative={nextMonthData.leftover < 0}
          >
            {formatCurrency(nextMonthData.leftover)}
          </div>
        {:else}
          <div class="card-empty">Not created</div>
        {/if}
      </button>
    </section>

    <!-- Attention Needed -->
    {#if attentionItems.length > 0}
      <section class="attention-section">
        <h3 class="attention-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Attention Needed
        </h3>
        <div class="attention-list">
          {#each attentionItems as item (item.message)}
            <div
              class="attention-item"
              class:lock={item.type === 'lock'}
              class:due-soon={item.type === 'due_soon'}
            >
              <span class="attention-message">{item.message}</span>
              {#if item.action}
                <button class="attention-action" on:click={item.action}>
                  {item.actionLabel}
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/if}

  <!-- Lock Confirmation Modal -->
  {#if showLockConfirm}
    <div
      class="modal-overlay"
      role="presentation"
      on:click={cancelLock}
      on:keydown={(e) => e.key === 'Escape' && cancelLock()}
    >
      <div
        class="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lock-modal-title"
        tabindex="-1"
        on:click|stopPropagation
        on:keydown|stopPropagation
      >
        <div class="modal-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <h3 id="lock-modal-title">Lock {formatMonthDisplay(monthToLock)}?</h3>
        <p>
          Locking this month will prevent any changes to bills, income, or expenses. You can unlock
          it later if needed.
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" on:click={cancelLock} disabled={lockingMonth}
            >Cancel</button
          >
          <button class="btn btn-primary" on:click={confirmLockMonth} disabled={lockingMonth}>
            {lockingMonth ? 'Locking...' : 'Lock Month'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    max-width: var(--content-max-sm);
    margin: 0 auto;
    padding: var(--space-4) var(--content-padding) var(--content-padding) var(--content-padding);
  }

  @media (max-width: 768px) {
    .dashboard {
      padding: var(--space-3) var(--content-padding-mobile) var(--content-padding-mobile)
        var(--content-padding-mobile);
    }
  }

  .loading-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
  }

  /* Budget Breakdown Section */
  .budget-breakdown {
    background: var(--bg-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-default);
    padding: var(--space-6);
    margin-bottom: var(--card-gap);
  }

  .locked-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    margin-bottom: var(--space-4);
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: var(--radius-md);
    color: var(--warning);
    font-size: 0.85rem;
    font-weight: 500;
  }

  /* Math Sections */
  .math-section {
    margin-bottom: var(--space-5);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .section-operator {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--success);
    width: 20px;
    text-align: center;
  }

  .section-operator.negative {
    color: var(--error);
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .section-expected {
    margin-left: auto;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .section-items.indented {
    padding-left: 28px;
  }

  .item-row {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .item-row.empty {
    color: var(--text-tertiary);
    font-style: italic;
  }

  .item-name {
    flex-shrink: 0;
  }

  .item-dots {
    flex: 1;
    border-bottom: 1px dotted var(--border-hover);
    margin: 0 8px;
    min-width: 20px;
  }

  .item-amount {
    flex-shrink: 0;
    font-weight: 500;
    text-align: right;
    min-width: 80px;
  }

  .item-amount.complete {
    color: var(--success);
  }

  .checkmark {
    margin-left: 4px;
    color: var(--success);
  }

  .section-total {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-top: var(--space-2);
    padding-right: 0;
  }

  .total-line {
    width: 100px;
    border-top: 1px solid var(--border-hover);
    margin-right: 8px;
  }

  .total-amount {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 80px;
    text-align: right;
  }

  /* CC Payoffs */
  .cc-group {
    margin-bottom: var(--space-3);
  }

  .cc-group:last-child {
    margin-bottom: 0;
  }

  .cc-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--purple);
    margin-bottom: var(--space-1);
  }

  .cc-details {
    padding-left: var(--space-3);
  }

  /* Equation Bar */
  .equation-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-5) var(--space-3);
    margin: var(--space-8) 0;
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    flex-wrap: wrap;
  }

  .equation-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-4) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-hover);
    min-width: 70px;
  }

  .equation-box.positive {
    border-color: var(--success-border);
    background: var(--success-bg);
  }

  .equation-box.negative {
    border-color: var(--error-border);
    background: var(--error-bg);
  }

  .equation-box.result {
    min-width: 90px;
  }

  .equation-box.result.positive {
    border-color: var(--success);
    background: var(--success-bg);
  }

  .equation-box.result.negative {
    border-color: var(--error);
    background: var(--error-bg);
  }

  .eq-amount {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .equation-box.positive .eq-amount {
    color: var(--success);
  }

  .equation-box.negative .eq-amount {
    color: var(--error);
  }

  .eq-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 2px;
  }

  .eq-operator {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--success);
  }

  .eq-operator.negative {
    color: var(--error);
  }

  .eq-equals {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  /* View Details Button */
  .view-details-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    height: var(--button-height);
    background: transparent;
    border: 1px solid var(--accent);
    border-radius: var(--radius-md);
    color: var(--accent);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .view-details-btn:hover {
    background: var(--accent);
    color: var(--text-inverse);
  }

  /* Adjacent Months */
  .adjacent-months {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--card-gap);
    margin-bottom: var(--card-gap);
  }

  .month-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .month-card:hover {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .month-card.next {
    text-align: right;
  }

  .card-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
  }

  .month-card.next .card-nav {
    justify-content: flex-end;
  }

  .card-month {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .card-status {
    margin-top: 4px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.locked {
    background: var(--warning-bg);
    color: var(--warning);
  }

  .status-badge.complete {
    background: var(--success-bg);
    color: var(--success);
  }

  .status-badge.in-progress {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .status-badge.planned {
    background: var(--purple-bg);
    color: var(--purple);
  }

  .card-leftover {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .card-leftover.positive {
    color: var(--success);
  }

  .card-leftover.negative {
    color: var(--error);
  }

  .card-empty {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* Attention Section */
  .attention-section {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--space-4);
  }

  .attention-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 var(--space-4);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--warning);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .attention-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .attention-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    background: var(--warning-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--warning-border);
  }

  .attention-message {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .attention-action {
    height: var(--button-height-sm);
    padding: 0 14px;
    background: transparent;
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    color: var(--accent);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .attention-action:hover {
    background: var(--accent);
    color: var(--text-inverse);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .adjacent-months {
      grid-template-columns: 1fr;
    }

    .equation-bar {
      gap: var(--space-1);
      padding: var(--space-3);
    }

    .equation-box {
      min-width: 55px;
      padding: var(--space-3) var(--space-2);
    }

    .eq-amount {
      font-size: 0.8rem;
    }

    .eq-operator,
    .eq-equals {
      font-size: 1rem;
    }
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--bg-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-default);
    padding: var(--space-8);
    max-width: var(--modal-width-sm);
    width: 90%;
    text-align: center;
  }

  .modal-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    background: var(--warning-bg);
    border-radius: 50%;
    color: var(--warning);
  }

  .modal-content h3 {
    margin: 0 0 12px;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-content p {
    margin: 0 0 24px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid var(--border-hover);
    color: var(--text-secondary);
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }
</style>
