<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentMonth, goToPreviousMonth, goToNextMonth, goToMonth } from '../../stores/ui';
  import {
    monthsStore,
    monthlyLoading,
    monthExists,
    monthIsReadOnly,
    leftover,
    billInstances,
    incomeInstances,
  } from '../../stores/months';
  import { success, error as showError } from '../../stores/toast';
  import { apiUrl } from '$lib/api/client';

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

  // Helper to sum payments from occurrences
  function sumOccurrencePayments(item: any): number {
    const occPayments = (item.occurrences || []).reduce(
      (oSum: number, occ: any) =>
        oSum + (occ.payments || []).reduce((pSum: number, p: any) => pSum + p.amount, 0),
      0
    );
    const legacyPayments = (item.payments || []).reduce(
      (pSum: number, p: any) => pSum + p.amount,
      0
    );
    return occPayments + legacyPayments;
  }

  // Calculate totals from instances - use expected_amount and occurrence-based payments
  $: billsExpected = $billInstances.reduce(
    (sum, b) => sum + ((b as any).expected_amount || b.amount || 0),
    0
  );
  $: billsPaid = $billInstances.reduce((sum, b) => sum + sumOccurrencePayments(b), 0);
  $: billsProgress = billsExpected > 0 ? Math.round((billsPaid / billsExpected) * 100) : 0;

  $: incomeExpected = $incomeInstances.reduce(
    (sum, i) => sum + ((i as any).expected_amount || i.amount || 0),
    0
  );
  $: incomeReceived = $incomeInstances.reduce((sum, i) => sum + sumOccurrencePayments(i), 0);
  $: incomeProgress = incomeExpected > 0 ? Math.round((incomeReceived / incomeExpected) * 100) : 0;

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
  let loadingAdjacent = false;

  async function loadAdjacentMonths() {
    if (!$currentMonth) return;
    loadingAdjacent = true;

    try {
      const [prevRes, nextRes] = await Promise.all([
        fetch(apiUrl(`/api/months/${prevMonth}`)).catch(() => null),
        fetch(apiUrl(`/api/months/${nextMonth}`)).catch(() => null),
      ]);

      if (prevRes && prevRes.ok) {
        const data = await prevRes.json();
        const billsExp =
          data.bill_instances?.reduce(
            (s: number, b: any) => s + (b.expected_amount || b.amount || 0),
            0
          ) || 0;
        const billsPd =
          data.bill_instances?.reduce((s: number, b: any) => s + sumOccurrencePayments(b), 0) || 0;
        const incExp =
          data.income_instances?.reduce(
            (s: number, i: any) => s + (i.expected_amount || i.amount || 0),
            0
          ) || 0;
        const incRec =
          data.income_instances?.reduce((s: number, i: any) => s + sumOccurrencePayments(i), 0) ||
          0;

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
            (s: number, b: any) => s + (b.expected_amount || b.amount || 0),
            0
          ) || 0;
        const billsPd =
          data.bill_instances?.reduce((s: number, b: any) => s + sumOccurrencePayments(b), 0) || 0;
        const incExp =
          data.income_instances?.reduce(
            (s: number, i: any) => s + (i.expected_amount || i.amount || 0),
            0
          ) || 0;
        const incRec =
          data.income_instances?.reduce((s: number, i: any) => s + sumOccurrencePayments(i), 0) ||
          0;

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
    } catch (error) {
      console.error('Failed to load adjacent months:', error);
    } finally {
      loadingAdjacent = false;
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

  $: attentionItems = computeAttentionItems();

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
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const billsDueSoon = $billInstances.filter((b) => {
      if (b.is_paid) return false;
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
    } catch (error) {
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

  $: isPositive = $leftover >= 0;
</script>

<div class="dashboard">
  {#if $monthlyLoading}
    <div class="loading-state">
      <p>Loading...</p>
    </div>
  {:else if !$monthExists}
    <!-- Month not created prompt -->
    <div class="create-month-prompt">
      <div class="prompt-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" />
          <path d="M3 10H21" stroke="currentColor" stroke-width="2" />
          <path d="M8 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
      <h2>Month Not Created</h2>
      <p>{$currentMonth ? formatMonthDisplay($currentMonth) : 'This month'} doesn't exist yet.</p>
      <p class="prompt-hint">Create this month to start tracking bills, income, and expenses.</p>
      <button class="btn btn-primary" on:click={handleCreateMonth} disabled={creating}>
        {creating ? 'Creating...' : 'Create Month'}
      </button>
    </div>
  {:else}
    <!-- Current Month Hero Section -->
    <section class="hero-section">
      <div class="hero-header">
        <button class="nav-arrow" on:click={goToPreviousMonth} title="Previous month">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div class="month-title">
          <span class="star-icon">★</span>
          <h1>{formatMonthDisplay($currentMonth)}</h1>
          {#if $monthIsReadOnly}
            <span class="lock-badge" title="Month is locked">
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
            </span>
          {/if}
        </div>
        <button class="nav-arrow" on:click={goToNextMonth} title="Next month">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="progress-cards">
        <!-- Bills Progress -->
        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-label">BILLS</span>
            <span class="progress-amounts">
              {formatCurrency(billsPaid)} / {formatCurrency(billsExpected)}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill bills" style="width: {billsProgress}%"></div>
          </div>
          <span class="progress-percent">{billsProgress}% paid</span>
        </div>

        <!-- Income Progress -->
        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-label">INCOME</span>
            <span class="progress-amounts">
              {formatCurrency(incomeReceived)} / {formatCurrency(incomeExpected)}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill income" style="width: {incomeProgress}%"></div>
          </div>
          <span class="progress-percent">{incomeProgress}% received</span>
        </div>
      </div>

      <!-- Projected Leftover -->
      <div class="leftover-display" class:positive={isPositive} class:negative={!isPositive}>
        <span class="leftover-label">PROJECTED LEFTOVER</span>
        <span class="leftover-amount">{formatCurrency($leftover)}</span>
      </div>

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
          {#each attentionItems as item}
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
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="modal-overlay"
      role="presentation"
      on:click={cancelLock}
      on:keydown={(e) => e.key === 'Escape' && cancelLock()}
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
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
          <button class="btn btn-secondary" on:click={cancelLock} disabled={lockingMonth}>
            Cancel
          </button>
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
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }

  .loading-state {
    text-align: center;
    padding: 60px 20px;
    color: #888;
  }

  /* Create Month Prompt */
  .create-month-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    background: #1a1a2e;
    border-radius: 16px;
    border: 1px solid #333355;
  }

  .prompt-icon {
    color: #24c8db;
    margin-bottom: 20px;
  }

  .create-month-prompt h2 {
    margin: 0 0 12px;
    font-size: 1.5rem;
    font-weight: 600;
    color: #e4e4e7;
  }

  .create-month-prompt p {
    margin: 0 0 8px;
    color: #888;
    font-size: 1rem;
  }

  .prompt-hint {
    margin-bottom: 24px !important;
    font-size: 0.875rem !important;
    color: #666 !important;
  }

  .btn {
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #24c8db;
    color: #000;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1ab0c9;
  }

  /* Hero Section */
  .hero-section {
    background: #1a1a2e;
    border-radius: 16px;
    border: 1px solid #333355;
    padding: 32px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .hero-header {
    display: flex;
    align-items: center;
    gap: 20px;
    width: 100%;
    justify-content: center;
  }

  .nav-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: 1px solid #333355;
    border-radius: 8px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-arrow:hover {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
    color: #24c8db;
  }

  .month-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .star-icon {
    color: #fbbf24;
    font-size: 1.5rem;
  }

  .month-title h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #e4e4e7;
  }

  .lock-badge {
    color: #fbbf24;
    display: flex;
    align-items: center;
  }

  /* Progress Cards */
  .progress-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    width: 100%;
    max-width: 600px;
  }

  .progress-card {
    background: #151525;
    border-radius: 12px;
    padding: 16px;
    border: 1px solid #333355;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .progress-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .progress-amounts {
    font-size: 0.85rem;
    font-weight: 500;
    color: #e4e4e7;
  }

  .progress-bar {
    height: 8px;
    background: #333355;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-fill.bills {
    background: linear-gradient(90deg, #f87171, #fb923c);
  }

  .progress-fill.income {
    background: linear-gradient(90deg, #4ade80, #22d3ee);
  }

  .progress-percent {
    font-size: 0.75rem;
    color: #888;
  }

  /* Leftover Display */
  .leftover-display {
    text-align: center;
    padding: 16px 32px;
    border-radius: 12px;
  }

  .leftover-display.positive {
    background: rgba(74, 222, 128, 0.1);
  }

  .leftover-display.negative {
    background: rgba(248, 113, 113, 0.1);
  }

  .leftover-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }

  .leftover-amount {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .leftover-display.positive .leftover-amount {
    color: #4ade80;
  }

  .leftover-display.negative .leftover-amount {
    color: #f87171;
  }

  /* View Details Button */
  .view-details-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: transparent;
    border: 1px solid #24c8db;
    border-radius: 8px;
    color: #24c8db;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .view-details-btn:hover {
    background: #24c8db;
    color: #000;
  }

  /* Adjacent Months */
  .adjacent-months {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  .month-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #333355;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .month-card:hover {
    border-color: #24c8db;
    background: rgba(36, 200, 219, 0.05);
  }

  .month-card.next {
    text-align: right;
  }

  .card-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #888;
  }

  .month-card.next .card-nav {
    justify-content: flex-end;
  }

  .card-month {
    font-size: 0.95rem;
    font-weight: 600;
    color: #e4e4e7;
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
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }

  .status-badge.complete {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }

  .status-badge.in-progress {
    background: rgba(36, 200, 219, 0.15);
    color: #24c8db;
  }

  .status-badge.planned {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }

  .card-leftover {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .card-leftover.positive {
    color: #4ade80;
  }

  .card-leftover.negative {
    color: #f87171;
  }

  .card-empty {
    font-size: 0.85rem;
    color: #666;
    font-style: italic;
  }

  /* Attention Section */
  .attention-section {
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #333355;
    padding: 20px;
  }

  .attention-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 16px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .attention-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .attention-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(251, 191, 36, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(251, 191, 36, 0.2);
  }

  .attention-message {
    font-size: 0.875rem;
    color: #e4e4e7;
  }

  .attention-action {
    padding: 6px 14px;
    background: transparent;
    border: 1px solid #24c8db;
    border-radius: 6px;
    color: #24c8db;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .attention-action:hover {
    background: #24c8db;
    color: #000;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .progress-cards {
      grid-template-columns: 1fr;
    }

    .adjacent-months {
      grid-template-columns: 1fr;
    }

    .hero-header {
      flex-wrap: wrap;
    }

    .month-title h1 {
      font-size: 1.25rem;
    }
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: #1a1a2e;
    border-radius: 16px;
    border: 1px solid #333355;
    padding: 32px;
    max-width: 400px;
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
    background: rgba(251, 191, 36, 0.1);
    border-radius: 50%;
    color: #fbbf24;
  }

  .modal-content h3 {
    margin: 0 0 12px;
    font-size: 1.25rem;
    font-weight: 600;
    color: #e4e4e7;
  }

  .modal-content p {
    margin: 0 0 24px;
    font-size: 0.9rem;
    color: #888;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid #444;
    color: #888;
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: #666;
    color: #e4e4e7;
  }
</style>
