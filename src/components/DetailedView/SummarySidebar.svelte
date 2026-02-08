<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type { PaymentSource } from '../../stores/payment-sources';
  import { isDebtAccount, formatBalanceForDisplay } from '../../stores/payment-sources';
  import { apiUrl } from '$lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import { formatCurrency } from '$lib/utils/format';

  const dispatch = createEventDispatcher();

  interface Tally {
    expected: number;
    actual: number;
  }

  interface Tallies {
    bills: Tally;
    adhocBills: Tally;
    ccPayoffs: Tally;
    totalExpenses: Tally;
    income: Tally;
    adhocIncome: Tally;
    totalIncome: Tally;
  }

  interface LeftoverBreakdown {
    bankBalances: number; // Current cash position (snapshot from bank_balances)
    remainingIncome: number; // Income still expected to receive
    remainingExpenses: number; // Expenses still need to pay
    leftover: number; // bank + remainingIncome - remainingExpenses
    isValid: boolean; // False if required bank balances are missing
    hasActuals?: boolean; // True if any actuals have been entered
    missingBalances?: string[]; // IDs of payment sources missing balances
    errorMessage?: string; // Human-readable error message
  }

  interface PayoffSummary {
    paymentSourceId: string;
    paymentSourceName: string;
    balance: number;
    paid: number;
    remaining: number;
  }

  export let paymentSources: PaymentSource[] = [];
  export let bankBalances: Record<string, number> = {};
  export let tallies: Tallies;
  export let leftoverBreakdown: LeftoverBreakdown;
  export let payoffSummaries: PayoffSummary[] = [];
  export let month: string = '';
  export let readOnly: boolean = false;

  // Inline editing state for balances
  let editingBalanceId: string | null = null;
  let editingBalanceValue: string = '';
  let editingIsDebtAccount: boolean = false;
  let savingBalance = false;
  let balanceInputEl: HTMLInputElement | null = null;

  function formatCurrencyWithSign(cents: number): string {
    const prefix = cents >= 0 ? '+' : '';
    return prefix + formatCurrency(cents);
  }

  // Get balance for a payment source (with display formatting for debt)
  function getBalance(source: PaymentSource): number | null {
    return bankBalances[source.id] ?? null;
  }

  function getDisplayBalance(source: PaymentSource): number | null {
    const raw = bankBalances[source.id];
    return raw == null ? null : formatBalanceForDisplay(raw, source.type);
  }

  // Helper to check if account is a savings or investment account
  function isSavingsOrInvestmentAccount(source: PaymentSource): boolean {
    return source.is_savings === true || source.is_investment === true;
  }

  // Separate payment sources by type (excluding savings/investment accounts)
  $: assetAccounts = paymentSources.filter(
    (ps) => !isDebtAccount(ps.type) && !isSavingsOrInvestmentAccount(ps)
  );
  $: debtAccounts = paymentSources.filter((ps) => isDebtAccount(ps.type));

  // Get payoff summary for a payment source
  function getPayoffSummary(sourceId: string): PayoffSummary | undefined {
    return payoffSummaries.find((ps) => ps.paymentSourceId === sourceId);
  }

  // Check if a source is pay-off-monthly
  function isPayOffMonthly(source: PaymentSource): boolean {
    return (source as unknown as { pay_off_monthly?: boolean }).pay_off_monthly ?? false;
  }

  // Start editing a balance (works for both asset and debt accounts)
  async function startEditingBalance(source: PaymentSource) {
    if (readOnly || !month) return;
    editingBalanceId = source.id;
    // For display, get the absolute value in dollars
    const displayBalance = getDisplayBalance(source) ?? 0;
    editingBalanceValue = (Math.abs(displayBalance) / 100).toFixed(2);
    // Store whether we're editing a debt account
    editingIsDebtAccount = isDebtAccount(source.type);

    // Wait for DOM to update, then focus and select for immediate typing
    await tick();
    balanceInputEl?.focus();
    balanceInputEl?.select();
  }

  // Cancel editing
  function cancelEditingBalance() {
    editingBalanceId = null;
    editingBalanceValue = '';
    editingIsDebtAccount = false;
  }

  // Save edited balance
  async function saveBalance() {
    if (!editingBalanceId || !month) return;

    const newAmountDollars = parseFloat(editingBalanceValue);
    if (isNaN(newAmountDollars) || newAmountDollars < 0) {
      showError('Please enter a valid amount');
      return;
    }

    savingBalance = true;

    try {
      // Convert to cents
      // For debt accounts (credit cards), store as negative
      // For asset accounts (bank accounts), store as positive
      const newBalanceCents = editingIsDebtAccount
        ? -Math.round(newAmountDollars * 100)
        : Math.round(newAmountDollars * 100);

      // Build updated bank balances object
      const updatedBalances = { ...bankBalances, [editingBalanceId]: newBalanceCents };

      const response = await fetch(apiUrl(`/api/months/${month}/bank-balances`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBalances),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update balance');
      }

      success('Balance updated');
      cancelEditingBalance();
      dispatch('refresh');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError(message);
    } finally {
      savingBalance = false;
    }
  }

  // Handle keydown in balance input
  function handleBalanceKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveBalance();
    } else if (event.key === 'Escape') {
      cancelEditingBalance();
    }
  }

  // Calculate totals
  $: totalAssets = assetAccounts.reduce((sum, ps) => sum + (getBalance(ps) ?? 0), 0);
  $: totalDebt = debtAccounts.reduce((sum, ps) => sum + (getBalance(ps) ?? 0), 0);
  $: netWorth = totalAssets + totalDebt; // totalDebt is already negative

  // Calculate liquid total (sum of all bank balances - for display, uses display balance)
  $: _liquidTotal = netWorth;

  // Income calculations (for display in sidebar)
  $: incomeReceived = tallies?.totalIncome?.actual ?? 0;
  $: incomeExpected = tallies?.totalIncome?.expected ?? 0;
  $: incomePending = incomeExpected - incomeReceived;

  // Expense calculations (for display in sidebar)
  $: billsPaid = tallies?.totalExpenses?.actual ?? 0;
  $: billsExpected = tallies?.totalExpenses?.expected ?? 0;
  $: billsPending = billsExpected - billsPaid;
</script>

<aside class="summary-sidebar">
  <!-- Combined: Account Balances, Income, Bills in single box -->
  <div class="sidebar-box">
    <!-- Asset Accounts -->
    <div class="box-section">
      <h3 class="box-title asset-title">Bank Accounts & Cash</h3>
      <div class="balance-list">
        {#each assetAccounts as source (source.id)}
          {@const isEditing = editingBalanceId === source.id}
          {@const canEdit = !readOnly && month}
          {@const displayBalance = getDisplayBalance(source) ?? 0}
          <div class="balance-row">
            <span class="balance-name">{source.name}</span>
            {#if isEditing}
              <div class="balance-edit">
                <span class="currency-prefix">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  class="balance-input"
                  bind:this={balanceInputEl}
                  bind:value={editingBalanceValue}
                  on:keydown={handleBalanceKeydown}
                  disabled={savingBalance}
                />
                <button
                  class="edit-btn save"
                  on:click={saveBalance}
                  disabled={savingBalance}
                  title="Save"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <polyline
                      points="20 6 9 17 4 12"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  class="edit-btn cancel"
                  on:click={cancelEditingBalance}
                  disabled={savingBalance}
                  title="Cancel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <line
                      x1="18"
                      y1="6"
                      x2="6"
                      y2="18"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                    <line
                      x1="6"
                      y1="6"
                      x2="18"
                      y2="18"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            {:else}
              <button
                class="balance-value credit"
                class:editable={canEdit}
                class:editable-highlight={canEdit}
                on:click={() => canEdit && startEditingBalance(source)}
                title={canEdit ? 'Click to edit balance' : ''}
                disabled={!canEdit}
              >
                {formatCurrency(displayBalance)}
              </button>
            {/if}
          </div>
        {/each}
      </div>
      {#if assetAccounts.length > 0}
        <div class="section-subtotal">
          <span class="subtotal-label">Subtotal</span>
          <span class="subtotal-value" class:negative={totalAssets < 0}>
            {formatCurrency(totalAssets)}
          </span>
        </div>
      {:else}
        <p class="empty-text">No bank accounts</p>
      {/if}
    </div>

    <!-- Debt Accounts -->
    {#if debtAccounts.length > 0}
      <div class="section-divider"></div>

      <div class="box-section">
        <h3 class="box-title debt-title">Credit & Lines of Credit</h3>
        <div class="balance-list">
          {#each debtAccounts as source (source.id)}
            {@const payoff = getPayoffSummary(source.id)}
            {@const isEditing = editingBalanceId === source.id}
            {@const canEdit = !readOnly && month}
            {@const displayBalance = getDisplayBalance(source) ?? 0}
            <div class="balance-row" class:payoff-mode={isPayOffMonthly(source)}>
              <div class="balance-info">
                <span class="balance-name">
                  {source.name}
                  {#if isPayOffMonthly(source)}
                    <span class="payoff-indicator" title="Pay off monthly">payoff</span>
                  {/if}
                </span>
                {#if payoff && payoff.paid > 0}
                  <span class="payoff-progress">
                    Paid: {formatCurrency(payoff.paid)}
                  </span>
                {/if}
              </div>
              {#if isEditing}
                <div class="balance-edit">
                  <span class="currency-prefix">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    class="balance-input"
                    bind:this={balanceInputEl}
                    bind:value={editingBalanceValue}
                    on:keydown={handleBalanceKeydown}
                    disabled={savingBalance}
                  />
                  <button
                    class="edit-btn save"
                    on:click={saveBalance}
                    disabled={savingBalance}
                    title="Save"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polyline
                        points="20 6 9 17 4 12"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    class="edit-btn cancel"
                    on:click={cancelEditingBalance}
                    disabled={savingBalance}
                    title="Cancel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <line
                        x1="18"
                        y1="6"
                        x2="6"
                        y2="18"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                      <line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                </div>
              {:else}
                <button
                  class="balance-value debt"
                  class:editable={canEdit}
                  class:editable-highlight={canEdit}
                  on:click={() => canEdit && startEditingBalance(source)}
                  title={canEdit ? 'Click to edit balance' : ''}
                  disabled={!canEdit}
                >
                  {formatCurrency(displayBalance)}
                </button>
              {/if}
            </div>
          {/each}
        </div>
        <div class="section-subtotal">
          <span class="subtotal-label">Total Owed</span>
          <span class="subtotal-value negative">
            {formatCurrency(totalDebt)}
          </span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Box 2: Income + Bills -->
  <div class="sidebar-box">
    <!-- Income -->
    <div class="box-section">
      <h3 class="box-title">Income</h3>
      <div class="summary-rows">
        <div class="summary-row">
          <span class="row-label">Received</span>
          <span class="row-value income">{formatCurrency(incomeReceived)}</span>
        </div>
        <div class="summary-row muted">
          <span class="row-label">Pending</span>
          <span class="row-value">{formatCurrency(incomePending)}</span>
        </div>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- Bills/Expenses -->
    <div class="box-section">
      <h3 class="box-title">Bills</h3>
      <div class="summary-rows">
        <div class="summary-row">
          <span class="row-label">Paid</span>
          <span class="row-value expense">{formatCurrency(billsPaid)}</span>
        </div>
        <div class="summary-row muted">
          <span class="row-label">Pending</span>
          <span class="row-value">{formatCurrency(billsPending)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Box 3: Left Over -->
  <div class="sidebar-box leftover-box" class:invalid={!leftoverBreakdown?.isValid}>
    <h3 class="box-title">Left Over</h3>

    {#if leftoverBreakdown?.isValid}
      <div class="leftover-calc">
        <div class="calc-row">
          <span class="calc-label">Bank Balances</span>
          <span class="calc-value">{formatCurrency(leftoverBreakdown?.bankBalances ?? 0)}</span>
        </div>
        <div class="calc-row">
          <span class="calc-label">+ Remaining Income</span>
          <span class="calc-value income"
            >{formatCurrencyWithSign(leftoverBreakdown?.remainingIncome ?? 0)}</span
          >
        </div>
        <div class="calc-row">
          <span class="calc-label">- Remaining Expenses</span>
          <span class="calc-value expense"
            >{formatCurrency(-(leftoverBreakdown?.remainingExpenses ?? 0))}</span
          >
        </div>
      </div>
      <div class="leftover-total" class:negative={leftoverBreakdown?.leftover < 0}>
        <span class="leftover-label">Left Over</span>
        <span class="leftover-value">{formatCurrency(leftoverBreakdown?.leftover ?? 0)}</span>
      </div>
    {:else}
      <div class="error-message">
        <span class="error-icon">!</span>
        <span class="error-text"
          >{leftoverBreakdown?.errorMessage ?? 'Enter bank balances to calculate leftover'}</span
        >
      </div>
    {/if}
  </div>

  <!-- Box 4: Quick Add -->
  {#if !readOnly}
    <div class="sidebar-box quick-add-box">
      <h3 class="box-title">Quick Add</h3>
      <div class="quick-add-buttons">
        <button
          class="quick-add-btn expense"
          on:click={() => dispatch('openAdHocForm', { type: 'bill' })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14m-7-7h14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          Add Expense
        </button>
        <button
          class="quick-add-btn income"
          on:click={() => dispatch('openAdHocForm', { type: 'income' })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14m-7-7h14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          Add Income
        </button>
      </div>
    </div>
  {/if}
</aside>

<style>
  .summary-sidebar {
    width: var(--summary-sidebar-width);
    min-width: var(--summary-sidebar-width);
    position: sticky;
    top: var(--content-padding);
    max-height: calc(100vh - var(--content-padding) * 2);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* Box styling for distinct sections */
  .sidebar-box {
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .box-title {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .box-title.asset-title {
    color: var(--success);
  }

  .box-title.debt-title {
    color: var(--error);
  }

  .box-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .section-divider {
    height: 1px;
    background: var(--border-default);
    margin: var(--space-1) 0;
  }

  .section-subtotal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 6px;
    border-top: 1px dashed var(--border-hover);
    margin-top: 2px;
  }

  .subtotal-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .subtotal-value {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .subtotal-value.negative {
    color: var(--error);
  }

  /* Balance list */
  .balance-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .balance-name {
    color: var(--text-secondary);
  }

  .balance-value {
    font-weight: 500;
    color: var(--text-primary);
  }

  .balance-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .payoff-indicator {
    font-size: 0.55rem;
    padding: 1px var(--space-1);
    background: var(--purple-bg);
    color: var(--purple);
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    font-weight: 600;
    margin-left: var(--space-2);
  }

  .payoff-progress {
    font-size: 0.7rem;
    color: var(--success);
  }

  .balance-row.payoff-mode {
    padding: var(--space-2) 0;
  }

  /* Editable balance styles */
  .balance-value.editable {
    background: none;
    border: none;
    padding: 2px var(--space-1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    transition:
      background 0.2s,
      color 0.2s,
      border-color 0.2s;
  }

  /* Yellow/amber highlight for editable values */
  .balance-value.editable-highlight {
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .balance-value.editable-highlight:hover {
    background: var(--warning-bg);
    border-color: var(--warning-border);
    color: var(--warning);
  }

  .balance-value.editable:hover {
    background: var(--accent-muted);
    color: var(--accent);
  }

  /* Color coding for balance types */
  .balance-value.credit {
    color: var(--success);
  }

  .balance-value.debt {
    color: var(--error);
  }

  /* Right-justify text in editable highlight boxes */
  .balance-value.editable-highlight {
    text-align: right;
    justify-content: flex-end;
    min-width: 80px;
  }

  .balance-edit {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .currency-prefix {
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .balance-input {
    width: 70px;
    padding: var(--space-1) var(--space-2);
    font-size: 0.8rem;
    background: var(--bg-surface);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    text-align: right;
  }

  .balance-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .balance-input:disabled {
    opacity: 0.5;
  }

  /* Hide spinner buttons */
  .balance-input::-webkit-outer-spin-button,
  .balance-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }
  .balance-input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: transparent;
    border: 1px solid var(--border-hover);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
  }

  .edit-btn.save {
    color: var(--success);
    border-color: var(--success-border);
  }

  .edit-btn.save:hover {
    background: var(--success-bg);
    border-color: var(--success);
  }

  .edit-btn.cancel {
    color: var(--error);
    border-color: var(--error-border);
  }

  .edit-btn.cancel:hover {
    background: var(--error-bg);
    border-color: var(--error);
  }

  .edit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Summary rows */
  .summary-rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .summary-row.muted {
    opacity: 0.6;
  }

  .row-label {
    color: var(--text-secondary);
  }

  .row-value {
    font-weight: 500;
    color: var(--text-primary);
  }

  .row-value.income {
    color: var(--success);
  }

  .row-value.expense {
    color: var(--error);
  }

  /* Leftover calculation */
  .leftover-calc {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .calc-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .calc-label {
    color: var(--text-secondary);
  }

  .calc-value {
    font-weight: 500;
    color: var(--text-primary);
  }

  .calc-value.income {
    color: var(--success);
  }

  .calc-value.expense {
    color: var(--error);
  }

  /* Current total */
  .leftover-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    margin-top: var(--space-2);
    background: var(--success-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--success-border);
  }

  .leftover-total.negative {
    background: var(--error-bg);
    border-color: var(--error-border);
  }

  .leftover-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--success);
  }

  .leftover-total.negative .leftover-label {
    color: var(--error);
  }

  .leftover-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--success);
  }

  .leftover-total.negative .leftover-value {
    color: var(--error);
  }

  .empty-text {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* Invalid/Error state for leftover box */
  .sidebar-box.invalid {
    border-color: var(--orange);
    background: var(--bg-elevated);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--orange-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--orange);
  }

  .error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--orange-bg);
    color: var(--orange);
    font-weight: 700;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .error-text {
    font-size: 0.8rem;
    color: var(--orange);
    line-height: 1.4;
  }

  /* Scrollbar styling */
  .summary-sidebar::-webkit-scrollbar {
    width: 6px;
  }

  .summary-sidebar::-webkit-scrollbar-track {
    background: transparent;
  }

  .summary-sidebar::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 3px;
  }

  .summary-sidebar::-webkit-scrollbar-thumb:hover {
    background: var(--border-hover);
  }

  /* Quick Add Box */
  .quick-add-box {
    background: var(--bg-surface);
  }

  .quick-add-buttons {
    display: flex;
    gap: var(--space-2);
  }

  .quick-add-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
  }

  .quick-add-btn.expense {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    color: var(--error);
  }

  .quick-add-btn.expense:hover {
    background: var(--error);
    border-color: var(--error);
    color: var(--text-inverse);
  }

  .quick-add-btn.income {
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    color: var(--success);
  }

  .quick-add-btn.income:hover {
    background: var(--success);
    border-color: var(--success);
    color: var(--text-inverse);
  }
</style>
