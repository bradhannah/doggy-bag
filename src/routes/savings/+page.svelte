<script lang="ts">
  import { onMount } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import {
    loadPaymentSources,
    savingsAccounts,
    investmentAccounts,
  } from '../../stores/payment-sources';
  import { currentMonth } from '../../stores/ui';
  import { success, error as showError } from '../../stores/toast';
  import MonthPickerHeader from '../../components/MonthPickerHeader.svelte';
  import MonthNotCreated from '../../components/MonthNotCreated.svelte';

  interface SavingsBalances {
    start: Record<string, number>;
    end: Record<string, number>;
  }

  let loading = true;
  let saving = false;
  let creating = false;
  let error = '';
  let monthExists = true;
  let balances: SavingsBalances = { start: {}, end: {} };

  // Editing state - store values in dollars for display
  let editingValues: Record<string, { start: string; end: string }> = {};

  $: allAccounts = [...$savingsAccounts, ...$investmentAccounts];
  $: hasSavingsAccounts = $savingsAccounts.length > 0;
  $: hasInvestmentAccounts = $investmentAccounts.length > 0;

  // Calculate previous month from current month
  function getPreviousMonth(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    const prevDate = new Date(year, monthNum - 2); // monthNum - 1 for 0-based, -1 more for previous
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  }

  onMount(async () => {
    await loadData();
  });

  // Reload when month changes via MonthPickerHeader
  $: if ($currentMonth) {
    loadData();
  }

  // Refresh function for the header button
  function handleRefresh() {
    loadData();
  }

  async function loadData() {
    loading = true;
    error = '';
    let previousMonthEndBalances: Record<string, number> = {};

    try {
      await loadPaymentSources();

      // Try to load previous month's end balances to use as defaults for start
      const prevMonth = getPreviousMonth($currentMonth);
      try {
        const prevMonthData = await apiClient.get(`/api/months/${prevMonth}`);
        if (prevMonthData) {
          previousMonthEndBalances =
            (prevMonthData as { savings_balances_end?: Record<string, number> })
              .savings_balances_end || {};
        }
      } catch {
        // Previous month doesn't exist - that's OK
      }

      // Load current month data to get existing balances
      const monthData = await apiClient.get(`/api/months/${$currentMonth}`);
      if (monthData) {
        monthExists = true;
        const currentStart =
          (monthData as { savings_balances_start?: Record<string, number> })
            .savings_balances_start || {};
        const currentEnd =
          (monthData as { savings_balances_end?: Record<string, number> }).savings_balances_end ||
          {};

        // Use previous month's end balances as defaults for start if current start is empty
        const startBalances: Record<string, number> = {};
        for (const account of [...$savingsAccounts, ...$investmentAccounts]) {
          if (currentStart[account.id] !== undefined) {
            startBalances[account.id] = currentStart[account.id];
          } else if (previousMonthEndBalances[account.id] !== undefined) {
            startBalances[account.id] = previousMonthEndBalances[account.id];
          }
        }

        balances = {
          start: startBalances,
          end: currentEnd,
        };
      }
      // Initialize editing values from current balances
      initEditingValues(previousMonthEndBalances);
    } catch (e) {
      if (
        (e as { status?: number }).status === 404 ||
        (e instanceof Error && e.message.includes('Not Found'))
      ) {
        // Month doesn't exist yet - show create prompt
        monthExists = false;
        balances = { start: {}, end: {} };
        initEditingValues(previousMonthEndBalances);
      } else {
        error = e instanceof Error ? e.message : 'Failed to load data';
      }
    } finally {
      loading = false;
    }
  }

  function initEditingValues(previousMonthEndBalances: Record<string, number> = {}) {
    editingValues = {};
    for (const account of allAccounts) {
      // Priority: current start balance > previous month end balance > account balance
      const startValue =
        balances.start[account.id] ?? previousMonthEndBalances[account.id] ?? account.balance;
      editingValues[account.id] = {
        start: centsToDollars(startValue),
        end: centsToDollars(balances.end[account.id] ?? 0),
      };
    }
  }

  function centsToDollars(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  function dollarsToCents(dollars: string): number {
    const parsed = parseFloat(dollars.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  function formatCurrency(cents: number): string {
    const dollars = Math.abs(cents) / 100;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
    return cents < 0 ? '-' + formatted : formatted;
  }

  function formatPercent(change: number, start: number): string {
    if (start === 0) return change === 0 ? '0%' : 'N/A';
    const pct = (change / Math.abs(start)) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  function getChange(accountId: string): number {
    const startVal = dollarsToCents(editingValues[accountId]?.start || '0');
    const endVal = dollarsToCents(editingValues[accountId]?.end || '0');
    return endVal - startVal;
  }

  function getStartValue(accountId: string): number {
    return dollarsToCents(editingValues[accountId]?.start || '0');
  }

  function getEndValue(accountId: string): number {
    return dollarsToCents(editingValues[accountId]?.end || '0');
  }

  async function handleSave() {
    saving = true;
    try {
      const startBalances: Record<string, number> = {};
      const endBalances: Record<string, number> = {};

      for (const account of allAccounts) {
        if (editingValues[account.id]) {
          startBalances[account.id] = dollarsToCents(editingValues[account.id].start);
          endBalances[account.id] = dollarsToCents(editingValues[account.id].end);
        }
      }

      await apiClient.put(`/api/months/${$currentMonth}/savings-balances`, '', {
        start: startBalances,
        end: endBalances,
      });

      success('Savings balances saved');
      await loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save balances';
      showError(msg);
    } finally {
      saving = false;
    }
  }

  // Calculate totals
  $: totalSavingsStart = $savingsAccounts.reduce((sum, a) => sum + getStartValue(a.id), 0);
  $: totalSavingsEnd = $savingsAccounts.reduce((sum, a) => sum + getEndValue(a.id), 0);
  $: totalSavingsChange = totalSavingsEnd - totalSavingsStart;

  $: totalInvestmentStart = $investmentAccounts.reduce((sum, a) => sum + getStartValue(a.id), 0);
  $: totalInvestmentEnd = $investmentAccounts.reduce((sum, a) => sum + getEndValue(a.id), 0);
  $: totalInvestmentChange = totalInvestmentEnd - totalInvestmentStart;

  $: grandTotalStart = totalSavingsStart + totalInvestmentStart;
  $: grandTotalEnd = totalSavingsEnd + totalInvestmentEnd;
  $: grandTotalChange = grandTotalEnd - grandTotalStart;

  function formatMonthDisplay(month: string): string {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  async function handleCreateMonth() {
    if (!$currentMonth) return;
    creating = true;
    try {
      await apiClient.post(`/api/months/${$currentMonth}/generate`, {});
      success(`Month ${$currentMonth} created`);
      monthExists = true;
      await loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create month';
      showError(msg);
    } finally {
      creating = false;
    }
  }
</script>

<MonthPickerHeader showRefresh={true} onRefresh={handleRefresh} />

<div class="savings-page">
  {#if loading}
    <div class="loading-state">Loading...</div>
  {:else if error}
    <div class="error-state">{error}</div>
  {:else if !monthExists}
    <MonthNotCreated
      monthDisplay={formatMonthDisplay($currentMonth)}
      {creating}
      hint="Create this month to start tracking savings and investments."
      on:create={handleCreateMonth}
    />
  {:else if allAccounts.length === 0}
    <div class="empty-state">
      <h2>No Savings or Investment Accounts</h2>
      <p>
        To track savings and investments, go to <a href="/setup">Budget Config</a> and create a bank account
        with the "Savings Account" or "Investment Account" option enabled.
      </p>
    </div>
  {:else}
    <div class="savings-content">
      {#if hasSavingsAccounts}
        <section class="account-section">
          <h2 class="section-title savings-title">Savings Accounts</h2>
          <div class="accounts-table">
            <div class="table-header">
              <span class="col-name">Account</span>
              <span class="col-value">Start of Month</span>
              <span class="col-value">End of Month</span>
              <span class="col-change">Change</span>
            </div>
            {#each $savingsAccounts as account (account.id)}
              {@const change = getChange(account.id)}
              {@const startVal = getStartValue(account.id)}
              <div class="table-row">
                <span class="col-name">{account.name}</span>
                <div class="col-value">
                  <div class="input-wrapper">
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].start}
                      disabled={saving}
                      class="balance-input"
                    />
                  </div>
                </div>
                <div class="col-value">
                  <div class="input-wrapper">
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].end}
                      disabled={saving}
                      class="balance-input"
                    />
                  </div>
                </div>
                <span class="col-change" class:positive={change > 0} class:negative={change < 0}>
                  {formatCurrency(change)}
                  <span class="percent">{formatPercent(change, startVal)}</span>
                </span>
              </div>
            {/each}
            <div class="table-footer">
              <span class="col-name">Total Savings</span>
              <span class="col-value">{formatCurrency(totalSavingsStart)}</span>
              <span class="col-value">{formatCurrency(totalSavingsEnd)}</span>
              <span
                class="col-change"
                class:positive={totalSavingsChange > 0}
                class:negative={totalSavingsChange < 0}
              >
                {formatCurrency(totalSavingsChange)}
                <span class="percent">{formatPercent(totalSavingsChange, totalSavingsStart)}</span>
              </span>
            </div>
          </div>
        </section>
      {/if}

      {#if hasInvestmentAccounts}
        <section class="account-section">
          <h2 class="section-title investment-title">Investment Accounts</h2>
          <div class="accounts-table">
            <div class="table-header">
              <span class="col-name">Account</span>
              <span class="col-value">Start of Month</span>
              <span class="col-value">End of Month</span>
              <span class="col-change">Change</span>
            </div>
            {#each $investmentAccounts as account (account.id)}
              {@const change = getChange(account.id)}
              {@const startVal = getStartValue(account.id)}
              <div class="table-row">
                <span class="col-name">{account.name}</span>
                <div class="col-value">
                  <div class="input-wrapper">
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].start}
                      disabled={saving}
                      class="balance-input"
                    />
                  </div>
                </div>
                <div class="col-value">
                  <div class="input-wrapper">
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].end}
                      disabled={saving}
                      class="balance-input"
                    />
                  </div>
                </div>
                <span class="col-change" class:positive={change > 0} class:negative={change < 0}>
                  {formatCurrency(change)}
                  <span class="percent">{formatPercent(change, startVal)}</span>
                </span>
              </div>
            {/each}
            <div class="table-footer">
              <span class="col-name">Total Investments</span>
              <span class="col-value">{formatCurrency(totalInvestmentStart)}</span>
              <span class="col-value">{formatCurrency(totalInvestmentEnd)}</span>
              <span
                class="col-change"
                class:positive={totalInvestmentChange > 0}
                class:negative={totalInvestmentChange < 0}
              >
                {formatCurrency(totalInvestmentChange)}
                <span class="percent"
                  >{formatPercent(totalInvestmentChange, totalInvestmentStart)}</span
                >
              </span>
            </div>
          </div>
        </section>
      {/if}

      {#if hasSavingsAccounts && hasInvestmentAccounts}
        <section class="grand-total-section">
          <div class="grand-total">
            <span class="label">Grand Total</span>
            <div class="values">
              <span class="value">{formatCurrency(grandTotalStart)}</span>
              <span class="arrow">-></span>
              <span class="value">{formatCurrency(grandTotalEnd)}</span>
              <span
                class="change"
                class:positive={grandTotalChange > 0}
                class:negative={grandTotalChange < 0}
              >
                {formatCurrency(grandTotalChange)}
                <span class="percent">{formatPercent(grandTotalChange, grandTotalStart)}</span>
              </span>
            </div>
          </div>
        </section>
      {/if}

      <div class="actions">
        <button class="btn btn-primary" on:click={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Balances'}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .savings-page {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--space-4) var(--content-padding) var(--content-padding) var(--content-padding);
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: var(--space-8);
    color: var(--text-secondary);
  }

  .error-state {
    color: var(--error);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-8);
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
  }

  .empty-state h2 {
    margin: 0 0 var(--space-3) 0;
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .empty-state p {
    margin: 0;
    color: var(--text-secondary);
  }

  .empty-state a {
    color: var(--accent);
    text-decoration: none;
  }

  .empty-state a:hover {
    text-decoration: underline;
  }

  .savings-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .account-section {
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--space-4);
  }

  .section-title {
    margin: 0 0 var(--space-4) 0;
    font-size: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .section-title.savings-title {
    color: var(--success);
  }

  .section-title.investment-title {
    color: var(--purple);
  }

  .accounts-table {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .table-header,
  .table-row,
  .table-footer {
    display: grid;
    grid-template-columns: 1fr 140px 140px 140px;
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-2) 0;
  }

  .table-header {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-default);
    padding-bottom: var(--space-3);
  }

  .table-row {
    border-bottom: 1px solid var(--bg-elevated);
  }

  .table-footer {
    border-top: 1px solid var(--border-default);
    padding-top: var(--space-3);
    font-weight: 600;
  }

  .col-name {
    color: var(--text-primary);
  }

  .col-value {
    text-align: right;
    color: var(--text-secondary);
  }

  .col-change {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .col-change.positive {
    color: var(--success);
  }

  .col-change.negative {
    color: var(--error);
  }

  .percent {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: 0 var(--space-2);
  }

  .input-wrapper:focus-within {
    border-color: var(--accent);
  }

  .prefix {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .balance-input {
    width: 100%;
    padding: var(--space-2);
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 0.9rem;
    text-align: right;
  }

  .balance-input:focus {
    outline: none;
  }

  .balance-input:disabled {
    opacity: 0.6;
  }

  .grand-total-section {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--space-4);
  }

  .grand-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .grand-total .label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .grand-total .values {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .grand-total .value {
    font-size: 1rem;
    color: var(--text-secondary);
  }

  .grand-total .arrow {
    color: var(--text-tertiary);
  }

  .grand-total .change {
    font-weight: 600;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .grand-total .change.positive {
    color: var(--success);
  }

  .grand-total .change.negative {
    color: var(--error);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }

  .btn {
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-md);
    border: none;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }
</style>
