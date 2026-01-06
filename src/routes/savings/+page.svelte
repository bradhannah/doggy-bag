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

  interface SavingsBalances {
    start: Record<string, number>;
    end: Record<string, number>;
  }

  let loading = true;
  let saving = false;
  let error = '';
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
      if ((e as { status?: number }).status === 404) {
        // Month doesn't exist yet - that's OK, use previous month's end balances if available
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
</script>

<div class="savings-page">
  <header class="page-header">
    <h1>Savings & Investments</h1>
    <p class="month-label">{formatMonthDisplay($currentMonth)}</p>
  </header>

  {#if loading}
    <div class="loading-state">Loading...</div>
  {:else if error}
    <div class="error-state">{error}</div>
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
    padding: var(--content-padding);
  }

  .page-header {
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    margin: 0 0 var(--space-2) 0;
    font-size: 1.5rem;
    color: #e4e4e7;
  }

  .month-label {
    margin: 0;
    font-size: 0.9rem;
    color: #888;
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: var(--space-8);
    color: #888;
  }

  .error-state {
    color: #f87171;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-8);
    background: #151525;
    border-radius: var(--radius-lg);
    border: 1px solid #333355;
  }

  .empty-state h2 {
    margin: 0 0 var(--space-3) 0;
    font-size: 1.25rem;
    color: #e4e4e7;
  }

  .empty-state p {
    margin: 0;
    color: #888;
  }

  .empty-state a {
    color: #24c8db;
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
    background: #151525;
    border-radius: var(--radius-lg);
    border: 1px solid #333355;
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
    color: #4ade80;
  }

  .section-title.investment-title {
    color: #a78bfa;
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
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #333355;
    padding-bottom: var(--space-3);
  }

  .table-row {
    border-bottom: 1px solid #252540;
  }

  .table-footer {
    border-top: 1px solid #333355;
    padding-top: var(--space-3);
    font-weight: 600;
  }

  .col-name {
    color: #e4e4e7;
  }

  .col-value {
    text-align: right;
    color: #a1a1aa;
  }

  .col-change {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .col-change.positive {
    color: #4ade80;
  }

  .col-change.negative {
    color: #f87171;
  }

  .percent {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    background: #0f0f0f;
    border: 1px solid #333355;
    border-radius: var(--radius-sm);
    padding: 0 var(--space-2);
  }

  .input-wrapper:focus-within {
    border-color: #24c8db;
  }

  .prefix {
    color: #888;
    font-size: 0.85rem;
  }

  .balance-input {
    width: 100%;
    padding: var(--space-2);
    background: transparent;
    border: none;
    color: #e4e4e7;
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
    background: #1a1a2e;
    border-radius: var(--radius-lg);
    border: 1px solid #333355;
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
    color: #e4e4e7;
  }

  .grand-total .values {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .grand-total .value {
    font-size: 1rem;
    color: #a1a1aa;
  }

  .grand-total .arrow {
    color: #555;
  }

  .grand-total .change {
    font-weight: 600;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .grand-total .change.positive {
    color: #4ade80;
  }

  .grand-total .change.negative {
    color: #f87171;
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
    background: #24c8db;
    color: #000;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1ab0c9;
  }
</style>
