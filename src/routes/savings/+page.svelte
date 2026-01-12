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
    contributions: Record<string, number>;
  }

  let loading = true;
  let saving = false;
  let creating = false;
  let error = '';
  let monthExists = true;
  let balances: SavingsBalances = { start: {}, end: {}, contributions: {} };

  // Editing state - store values in dollars for display
  // New structure: start, contribution, end (final)
  let editingValues: Record<string, { start: string; contribution: string; end: string }> = {};

  // Track which field is currently saving (for visual feedback)
  let savingField: { accountId: string; field: string } | null = null;

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
        const currentContributions =
          (monthData as { savings_contributions?: Record<string, number> }).savings_contributions ||
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
          contributions: currentContributions,
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
        balances = { start: {}, end: {}, contributions: {} };
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
        contribution: centsToDollars(balances.contributions[account.id] ?? 0),
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

  // Get values in cents for an account
  function getStartValue(accountId: string): number {
    return dollarsToCents(editingValues[accountId]?.start || '0');
  }

  function getContributionValue(accountId: string): number {
    return dollarsToCents(editingValues[accountId]?.contribution || '0');
  }

  function getEndValue(accountId: string): number {
    return dollarsToCents(editingValues[accountId]?.end || '0');
  }

  // Est. EOM = Start + Contribution
  function getEstEomValue(accountId: string): number {
    return getStartValue(accountId) + getContributionValue(accountId);
  }

  // Change = Final (End) - Start
  function getChange(accountId: string): number {
    return getEndValue(accountId) - getStartValue(accountId);
  }

  // Auto-save on blur for a specific field
  async function handleBlur(accountId: string, field: 'start' | 'contribution' | 'end') {
    savingField = { accountId, field };
    try {
      const payload: {
        start?: Record<string, number>;
        end?: Record<string, number>;
        contributions?: Record<string, number>;
      } = {};

      if (field === 'start') {
        payload.start = { [accountId]: dollarsToCents(editingValues[accountId].start) };
      } else if (field === 'contribution') {
        payload.contributions = {
          [accountId]: dollarsToCents(editingValues[accountId].contribution),
        };
      } else if (field === 'end') {
        payload.end = { [accountId]: dollarsToCents(editingValues[accountId].end) };
      }

      await apiClient.put(`/api/months/${$currentMonth}/savings-balances`, '', payload);

      // Update local balances state
      if (field === 'start') {
        balances.start[accountId] = dollarsToCents(editingValues[accountId].start);
      } else if (field === 'contribution') {
        balances.contributions[accountId] = dollarsToCents(editingValues[accountId].contribution);
      } else if (field === 'end') {
        balances.end[accountId] = dollarsToCents(editingValues[accountId].end);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      showError(msg);
    } finally {
      savingField = null;
    }
  }

  // Calculate totals for savings accounts
  $: totalSavingsStart = $savingsAccounts.reduce((sum, a) => sum + getStartValue(a.id), 0);
  $: totalSavingsContribution = $savingsAccounts.reduce(
    (sum, a) => sum + getContributionValue(a.id),
    0
  );
  $: totalSavingsEstEom = $savingsAccounts.reduce((sum, a) => sum + getEstEomValue(a.id), 0);
  $: totalSavingsEnd = $savingsAccounts.reduce((sum, a) => sum + getEndValue(a.id), 0);
  $: totalSavingsChange = totalSavingsEnd - totalSavingsStart;

  // Calculate totals for investment accounts
  $: totalInvestmentStart = $investmentAccounts.reduce((sum, a) => sum + getStartValue(a.id), 0);
  $: totalInvestmentContribution = $investmentAccounts.reduce(
    (sum, a) => sum + getContributionValue(a.id),
    0
  );
  $: totalInvestmentEstEom = $investmentAccounts.reduce((sum, a) => sum + getEstEomValue(a.id), 0);
  $: totalInvestmentEnd = $investmentAccounts.reduce((sum, a) => sum + getEndValue(a.id), 0);
  $: totalInvestmentChange = totalInvestmentEnd - totalInvestmentStart;

  // Grand totals
  $: grandTotalStart = totalSavingsStart + totalInvestmentStart;
  $: grandTotalContribution = totalSavingsContribution + totalInvestmentContribution;
  $: grandTotalEstEom = totalSavingsEstEom + totalInvestmentEstEom;
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
              <span class="col-value">Start</span>
              <span class="col-value">Contribution</span>
              <span class="col-value col-readonly">Est. EOM</span>
              <span class="col-value">Final</span>
              <span class="col-change">Change</span>
            </div>
            {#each $savingsAccounts as account (account.id)}
              {@const change = getChange(account.id)}
              {@const startVal = getStartValue(account.id)}
              {@const contribution = getContributionValue(account.id)}
              {@const estEom = getEstEomValue(account.id)}
              <div class="table-row">
                <span class="col-name">{account.name}</span>
                <div class="col-value">
                  <div
                    class="input-wrapper"
                    class:saving={savingField?.accountId === account.id &&
                      savingField?.field === 'start'}
                  >
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].start}
                      on:blur={() => handleBlur(account.id, 'start')}
                      disabled={saving}
                      class="balance-input"
                    />
                  </div>
                </div>
                <div class="col-value">
                  <div
                    class="input-wrapper contribution-input"
                    class:saving={savingField?.accountId === account.id &&
                      savingField?.field === 'contribution'}
                    class:positive={contribution > 0}
                    class:negative={contribution < 0}
                  >
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].contribution}
                      on:blur={() => handleBlur(account.id, 'contribution')}
                      disabled={saving}
                      class="balance-input"
                    />
                  </div>
                </div>
                <div class="col-value col-readonly">
                  <span class="est-eom-value">{formatCurrency(estEom)}</span>
                </div>
                <div class="col-value">
                  <div
                    class="input-wrapper"
                    class:saving={savingField?.accountId === account.id &&
                      savingField?.field === 'end'}
                  >
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].end}
                      on:blur={() => handleBlur(account.id, 'end')}
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
              <span
                class="col-value"
                class:positive={totalSavingsContribution > 0}
                class:negative={totalSavingsContribution < 0}
                >{formatCurrency(totalSavingsContribution)}</span
              >
              <span class="col-value col-readonly">{formatCurrency(totalSavingsEstEom)}</span>
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
              <span class="col-value">Start</span>
              <span class="col-value">Contribution</span>
              <span class="col-value col-readonly">Est. EOM</span>
              <span class="col-value">Final</span>
              <span class="col-change">Change</span>
            </div>
            {#each $investmentAccounts as account (account.id)}
              {@const change = getChange(account.id)}
              {@const startVal = getStartValue(account.id)}
              {@const contribution = getContributionValue(account.id)}
              {@const estEom = getEstEomValue(account.id)}
              <div class="table-row">
                <span class="col-name">{account.name}</span>
                <div class="col-value">
                  <div
                    class="input-wrapper"
                    class:saving={savingField?.accountId === account.id &&
                      savingField?.field === 'start'}
                  >
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].start}
                      on:blur={() => handleBlur(account.id, 'start')}
                      disabled={saving}
                      class="balance-input"
                    />
                  </div>
                </div>
                <div class="col-value">
                  <div
                    class="input-wrapper contribution-input"
                    class:saving={savingField?.accountId === account.id &&
                      savingField?.field === 'contribution'}
                    class:positive={contribution > 0}
                    class:negative={contribution < 0}
                  >
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].contribution}
                      on:blur={() => handleBlur(account.id, 'contribution')}
                      disabled={saving}
                      class="balance-input"
                    />
                  </div>
                </div>
                <div class="col-value col-readonly">
                  <span class="est-eom-value">{formatCurrency(estEom)}</span>
                </div>
                <div class="col-value">
                  <div
                    class="input-wrapper"
                    class:saving={savingField?.accountId === account.id &&
                      savingField?.field === 'end'}
                  >
                    <span class="prefix">$</span>
                    <input
                      type="text"
                      bind:value={editingValues[account.id].end}
                      on:blur={() => handleBlur(account.id, 'end')}
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
              <span
                class="col-value"
                class:positive={totalInvestmentContribution > 0}
                class:negative={totalInvestmentContribution < 0}
                >{formatCurrency(totalInvestmentContribution)}</span
              >
              <span class="col-value col-readonly">{formatCurrency(totalInvestmentEstEom)}</span>
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
              <span
                class="value contribution"
                class:positive={grandTotalContribution > 0}
                class:negative={grandTotalContribution < 0}
                >{formatCurrency(grandTotalContribution)}</span
              >
              <span class="value muted">{formatCurrency(grandTotalEstEom)}</span>
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

      <p class="auto-save-hint">Changes are saved automatically when you leave a field.</p>
    </div>
  {/if}
</div>

<style>
  .savings-page {
    max-width: 1100px;
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
    grid-template-columns: 1.5fr 110px 110px 110px 110px 130px;
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

  .col-value.col-readonly {
    color: var(--text-tertiary);
  }

  .col-change {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .col-change.positive,
  .positive {
    color: var(--success);
  }

  .col-change.negative,
  .negative {
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
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .input-wrapper:focus-within {
    border-color: var(--accent);
  }

  .input-wrapper.saving {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .input-wrapper.contribution-input.positive {
    border-color: var(--success-border);
    background: var(--success-muted);
  }

  .input-wrapper.contribution-input.negative {
    border-color: var(--error-border);
    background: var(--error-muted);
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

  .contribution-input.positive .balance-input {
    color: var(--success);
  }

  .contribution-input.negative .balance-input {
    color: var(--error);
  }

  .est-eom-value {
    font-size: 0.9rem;
    color: var(--text-tertiary);
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
    gap: var(--space-4);
  }

  .grand-total .value {
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  .grand-total .value.muted {
    color: var(--text-tertiary);
  }

  .grand-total .value.contribution.positive {
    color: var(--success);
  }

  .grand-total .value.contribution.negative {
    color: var(--error);
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

  .auto-save-hint {
    text-align: center;
    color: var(--text-tertiary);
    font-size: 0.85rem;
    margin: 0;
  }
</style>
