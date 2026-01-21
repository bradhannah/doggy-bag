<script lang="ts">
  /**
   * PaymentSourcesCard - Shows payment sources with editable balances
   *
   * Separates accounts into:
   * - Assets: Bank Accounts & Cash (positive balances = money you have)
   * - Debt: Credit Cards & Lines of Credit (displayed as negative = money you owe)
   *
   * @prop paymentSources - List of all payment sources
   * @prop bankBalances - Per-month balance overrides (from monthly data)
   * @prop month - Current month (YYYY-MM)
   * @prop loading - Whether data is still loading
   * @prop onUpdateBalances - Callback when balances are updated
   */
  import { createEventDispatcher } from 'svelte';
  import type { PaymentSource } from '../../stores/payment-sources';
  import { isDebtAccount, formatBalanceForDisplay } from '../../stores/payment-sources';

  export let paymentSources: PaymentSource[] = [];
  export let bankBalances: Record<string, number> = {};
  export let month: string = '';
  export let loading: boolean = false;

  const dispatch = createEventDispatcher();

  // Editing state
  let editingId: string | null = null;
  let editValue: string = '';

  // Get effective balance for a payment source
  // Use per-month balance only; missing balances default to 0
  function getEffectiveBalance(source: PaymentSource): number {
    return bankBalances[source.id] ?? 0;
  }

  // Calculate totals from effective balances with display balance for debt accounts
  $: effectiveBalances = paymentSources.map((ps) => {
    const effectiveBalance = getEffectiveBalance(ps);
    return {
      ...ps,
      effectiveBalance,
      displayBalance: formatBalanceForDisplay(effectiveBalance, ps.type),
    };
  });

  // Separate by type - Assets vs Debt
  $: assetAccounts = effectiveBalances.filter((ps) => !isDebtAccount(ps.type));
  $: debtAccounts = effectiveBalances.filter((ps) => isDebtAccount(ps.type));

  $: totalAssets = assetAccounts.reduce((sum, ps) => sum + ps.effectiveBalance, 0);
  $: totalDebt = debtAccounts.reduce((sum, ps) => sum + ps.effectiveBalance, 0);
  $: netWorth = totalAssets - totalDebt;

  // Format amount in cents to dollars (handles negative values)
  function formatCurrency(cents: number): string {
    const dollars = Math.abs(cents) / 100;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
    return cents < 0 ? '-' + formatted : formatted;
  }

  // Parse currency input to cents
  function parseCurrency(value: string): number {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const dollars = parseFloat(cleaned) || 0;
    return Math.round(dollars * 100);
  }

  // Start editing a balance
  function startEdit(source: PaymentSource) {
    editingId = source.id;
    const balance = getEffectiveBalance(source);
    editValue = (balance / 100).toFixed(2);
  }

  // Save edited balance
  async function saveEdit(source: PaymentSource) {
    const newBalance = parseCurrency(editValue);
    const newBalances = { ...bankBalances, [source.id]: newBalance };

    dispatch('updateBalances', { balances: newBalances });
    editingId = null;
  }

  // Cancel editing
  function cancelEdit() {
    editingId = null;
    editValue = '';
  }

  // Handle keyboard events
  function handleKeydown(event: KeyboardEvent, source: PaymentSource) {
    if (event.key === 'Enter') {
      saveEdit(source);
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  }

  // Get icon for payment source type
  function getTypeIcon(type: string) {
    switch (type) {
      case 'bank_account':
        return '🏦';
      case 'credit_card':
        return '💳';
      case 'line_of_credit':
        return '🏛️';
      case 'cash':
        return '💵';
      default:
        return '💰';
    }
  }

  // Check if balance has been customized for this month
  function isCustomized(source: PaymentSource): boolean {
    return bankBalances[source.id] !== undefined;
  }
</script>

<div class="payment-sources-card">
  <h3 class="card-title">
    Payment Sources
    {#if month}
      <span class="month-label">({month})</span>
    {/if}
  </h3>

  <!-- Summary Totals -->
  <div class="totals-grid">
    <div class="total-item cash">
      <div class="item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M12 8V16M8 12H16"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="item-content">
        <span class="item-label">Total Assets</span>
        <span class="item-value">
          {#if loading}
            ...
          {:else}
            {formatCurrency(totalAssets)}
          {/if}
        </span>
      </div>
    </div>

    <div class="total-item debt">
      <div class="item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2" />
          <path d="M2 10H22" stroke="currentColor" stroke-width="2" />
        </svg>
      </div>
      <div class="item-content">
        <span class="item-label">Total Debt</span>
        <span class="item-value">
          {#if loading}
            ...
          {:else}
            -{formatCurrency(totalDebt)}
          {/if}
        </span>
      </div>
    </div>

    <div class="total-item networth" class:positive={netWorth >= 0} class:negative={netWorth < 0}>
      <div class="item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="item-content">
        <span class="item-label">Net Worth</span>
        <span class="item-value">
          {#if loading}
            ...
          {:else}
            {formatCurrency(netWorth)}
          {/if}
        </span>
      </div>
    </div>
  </div>

  <!-- Individual Payment Sources -->
  {#if paymentSources.length > 0}
    <div class="sources-list">
      <!-- Asset Accounts -->
      {#if assetAccounts.length > 0}
        <div class="list-header">
          <span>Bank Accounts & Cash</span>
          <span>Balance</span>
        </div>

        {#each assetAccounts as source (source.id)}
          <div class="source-row" class:customized={isCustomized(source)}>
            <div class="source-info">
              <span class="source-icon">{getTypeIcon(source.type)}</span>
              <span class="source-name">{source.name}</span>
              {#if isCustomized(source)}
                <span class="customized-badge" title="Balance set for this month">*</span>
              {/if}
            </div>

            <div class="source-balance">
              {#if editingId === source.id}
                <div class="edit-container">
                  <span class="currency-prefix">$</span>
                  <input
                    type="text"
                    bind:value={editValue}
                    on:keydown={(e) => handleKeydown(e, source)}
                    on:blur={() => saveEdit(source)}
                    class="balance-input"
                    autofocus
                  />
                </div>
              {:else}
                <button
                  class="balance-button"
                  on:click={() => startEdit(source)}
                  title="Click to edit balance for this month"
                >
                  {formatCurrency(source.effectiveBalance)}
                </button>
              {/if}
            </div>
          </div>
        {/each}
      {/if}

      <!-- Debt Accounts -->
      {#if debtAccounts.length > 0}
        <div class="list-header debt-header">
          <span>Credit Cards & Lines of Credit</span>
          <span>Balance Owed</span>
        </div>

        {#each debtAccounts as source (source.id)}
          <div class="source-row debt-row" class:customized={isCustomized(source)}>
            <div class="source-info">
              <span class="source-icon">{getTypeIcon(source.type)}</span>
              <span class="source-name">{source.name}</span>
              {#if isCustomized(source)}
                <span class="customized-badge" title="Balance set for this month">*</span>
              {/if}
            </div>

            <div class="source-balance">
              {#if editingId === source.id}
                <div class="edit-container">
                  <span class="currency-prefix">$</span>
                  <input
                    type="text"
                    bind:value={editValue}
                    on:keydown={(e) => handleKeydown(e, source)}
                    on:blur={() => saveEdit(source)}
                    class="balance-input"
                    autofocus
                  />
                </div>
              {:else}
                <button
                  class="balance-button debt"
                  on:click={() => startEdit(source)}
                  title="Click to edit - displayed as negative (amount owed)"
                >
                  {formatCurrency(source.displayBalance)}
                </button>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {:else if !loading}
    <p class="empty-message">No payment sources set up yet. Add them in Setup.</p>
  {/if}
</div>

<style>
  .payment-sources-card {
    background: var(--bg-surface);
    border-radius: 12px;
    border: 1px solid var(--border-default);
    padding: 20px;
  }

  .card-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .month-label {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-weight: normal;
    text-transform: none;
  }

  .totals-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .total-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-elevated);
    border-radius: 8px;
  }

  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .cash .item-icon {
    background: var(--success-bg);
    color: var(--success);
  }

  .debt .item-icon {
    background: var(--error-bg);
    color: var(--error);
  }

  .networth .item-icon {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .item-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .item-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .item-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .cash .item-value {
    color: var(--success);
  }

  .debt .item-value {
    color: var(--error);
  }

  .networth.positive .item-value {
    color: var(--success);
  }

  .networth.negative .item-value {
    color: var(--error);
  }

  /* Individual sources list */
  .sources-list {
    border-top: 1px solid var(--border-default);
    padding-top: 16px;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    padding: 0 8px 8px 8px;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .list-header.debt-header {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-default);
  }

  .source-row.debt-row {
    border-left: 2px solid var(--error-border);
  }

  .source-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 8px;
    border-radius: 6px;
    transition: background-color 0.15s;
  }

  .source-row:hover {
    background: var(--bg-elevated);
  }

  .source-row.customized {
    background: var(--accent-muted);
  }

  .source-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .source-icon {
    font-size: 1rem;
  }

  .source-name {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .customized-badge {
    color: var(--accent);
    font-weight: bold;
    font-size: 0.75rem;
  }

  .source-balance {
    display: flex;
    align-items: center;
  }

  .balance-button {
    background: none;
    border: 1px solid transparent;
    padding: 4px 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--success);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;
    font-family: inherit;
  }

  .balance-button:hover {
    background: var(--bg-elevated);
    border-color: var(--border-hover);
  }

  .balance-button.debt {
    color: var(--error);
  }

  .edit-container {
    display: flex;
    align-items: center;
    background: var(--bg-base);
    border: 1px solid var(--accent);
    border-radius: 4px;
    padding: 2px 6px;
  }

  .currency-prefix {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-right: 2px;
  }

  .balance-input {
    width: 80px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: inherit;
    text-align: right;
    outline: none;
  }

  .empty-message {
    color: var(--text-tertiary);
    font-size: 0.875rem;
    text-align: center;
    padding: 16px;
    margin: 0;
  }
</style>
