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
  export let bankBalancesUpdatedAt: Record<string, string> = {};
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
    if (readOnly || !month || savingBalance) return;
    editingBalanceId = source.id;
    // For display, get the absolute value in dollars
    const displayBalance = getDisplayBalance(source) ?? 0;
    editingIsDebtAccount = isDebtAccount(source.type);
    editingBalanceValue = (
      (editingIsDebtAccount ? Math.abs(displayBalance) : displayBalance) / 100
    ).toFixed(2);

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
    if (!editingBalanceId || !month || savingBalance) return;
    const savedId = editingBalanceId;
    const savedMonth = month;

    const newAmountDollars = parseFloat(editingBalanceValue);
    if (!Number.isFinite(newAmountDollars) || (editingIsDebtAccount && newAmountDollars < 0)) {
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
      const updatedBalances = { [savedId]: newBalanceCents };

      const response = await fetch(apiUrl(`/api/months/${savedMonth}/bank-balances`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBalances),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update balance');
      }

      success('Balance updated');
      if (month === savedMonth) {
        if (editingBalanceId === savedId) cancelEditingBalance();
        dispatch('refresh');
      }
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

  function balanceUpdated(id: string): string {
    const stamp = bankBalancesUpdatedAt[id];
    return stamp
      ? `Updated ${new Date(stamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
      : 'Update time unavailable';
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
      <p class="snapshot-note">
        Enter current balances including recorded transactions. Ordinary payment records are
        separate from these snapshots.
      </p>
      <div class="balance-list">
        {#each assetAccounts as source (source.id)}
          {@const isEditing = editingBalanceId === source.id}
          {@const canEdit = !readOnly && month}
          {@const displayBalance = getDisplayBalance(source) ?? 0}
          <div class="balance-row">
            <div class="balance-info">
              <span class="balance-name">{source.name}</span>
              {#if getBalance(source) !== null}<small class="balance-updated"
                  >{balanceUpdated(source.id)}</small
                >{/if}
            </div>
            {#if isEditing}
              <div class="balance-edit">
                <span class="currency-prefix">$</span>
                <input
                  type="number"
                  step="0.01"
                  aria-label={`${source.name} balance`}
                  class="balance-input control-sm"
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
                {getBalance(source) === null
                  ? canEdit
                    ? 'Enter balance'
                    : 'Not entered'
                  : formatCurrency(displayBalance)}
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
                    <span class="badge badge-purple" title="Pay off monthly">Payoff</span>
                  {/if}
                </span>
                {#if getBalance(source) !== null}<small class="balance-updated"
                    >{balanceUpdated(source.id)}</small
                  >{/if}
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
                    aria-label={`${source.name} balance`}
                    class="balance-input control-sm"
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
                  {getBalance(source) === null
                    ? canEdit
                      ? 'Enter balance'
                      : 'Not entered'
                    : formatCurrency(displayBalance)}
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
          <span class="calc-label">Income still to come</span>
          <span class="calc-value income"
            >{formatCurrencyWithSign(leftoverBreakdown?.remainingIncome ?? 0)}</span
          >
        </div>
        <div class="calc-row">
          <span class="calc-label">Bills still to pay</span>
          <span class="calc-value expense"
            >{formatCurrency(-(leftoverBreakdown?.remainingExpenses ?? 0))}</span
          >
        </div>
      </div>
      <div class="leftover-total" class:negative={leftoverBreakdown?.leftover < 0}>
        <span class="leftover-label">Total</span>
        <span class="leftover-value">{formatCurrency(leftoverBreakdown?.leftover ?? 0)}</span>
      </div>
    {:else}
      <div class="error-message">
        <span class="error-icon" aria-hidden="true">!</span>
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
          Add bill
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
          Add income
        </button>
      </div>
    </div>
  {/if}
</aside>

<style>
  .snapshot-note,
  .balance-updated {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }
  .snapshot-note {
    margin: 0 0 var(--space-3);
  }
  .balance-updated {
    display: block;
    overflow-wrap: anywhere;
  }
  .balance-info {
    min-width: 0;
  }
  /* Sticks just below the sticky month header */
  .summary-sidebar {
    width: var(--summary-sidebar-width);
    min-width: var(--summary-sidebar-width);
    position: sticky;
    top: calc(var(--header-height) + var(--space-4));
    max-height: calc(100vh - var(--header-height) - var(--space-4) * 2);
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
    padding: var(--space-4);
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

  /* Right padding matches the balance pills so all amounts share one edge */
  .section-subtotal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) calc(var(--space-2) + 1px) 0 0;
    border-top: 1px dashed var(--border-hover);
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

  /* The amount sits on the account name's line; extra lines wrap underneath.
     The name's line box is the compact control height so the pill and name share a centreline. */
  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
  }

  .balance-name {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--control-height-sm);
    color: var(--text-secondary);
  }

  .balance-info {
    display: flex;
    flex-direction: column;
  }

  .payoff-progress {
    font-size: var(--font-size-xs);
    color: var(--success);
  }

  .balance-value {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    height: var(--control-height-sm);
    padding: 0;
    border: none;
    background: none;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .balance-value.editable {
    cursor: pointer;
  }

  /* Amber outline marks balances you can click to update */
  .balance-value.editable-highlight {
    min-width: calc(var(--space-8) * 2.5);
    padding: 0 var(--space-2);
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: var(--radius-sm);
    transition: border-color 0.15s;
  }

  .balance-value.editable-highlight:hover {
    border-color: var(--warning);
  }

  .balance-value.credit {
    color: var(--success);
  }

  .balance-value.debt {
    color: var(--error);
  }

  .balance-edit {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .currency-prefix {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .balance-input {
    width: 6rem;
    padding: 0 var(--space-2);
    font-size: var(--font-size-sm);
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
    width: var(--control-height-sm);
    height: var(--control-height-sm);
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
    background: var(--orange);
    color: var(--text-inverse);
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
    height: var(--control-height);
    padding: 0 var(--space-2);
    white-space: nowrap;
    font-size: var(--font-size-sm);
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

  @media (max-width: 68.75rem) {
    .summary-sidebar {
      width: 100%;
      position: static;
      max-height: none;
      overflow: visible;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--summary-sidebar-width)), 1fr));
      align-items: start;
    }
  }
</style>
