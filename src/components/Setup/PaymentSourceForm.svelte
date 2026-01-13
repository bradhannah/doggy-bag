<script lang="ts">
  /**
   * PaymentSourceForm - Drawer-compatible form for payment sources
   *
   * @prop editingItem - Payment source being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import {
    createPaymentSource,
    updatePaymentSource,
    isDebtAccount,
    type PaymentSourceType,
    type PaymentSourceMetadata,
  } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';
  import type { PaymentSource } from '../../stores/payment-sources';

  export let editingItem: PaymentSource | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let name = editingItem?.name || '';
  let type: PaymentSourceType = editingItem?.type || 'bank_account';
  let excludeFromLeftover = editingItem?.exclude_from_leftover ?? false;
  let payOffMonthly = editingItem?.pay_off_monthly ?? false;
  let isSavings = editingItem?.is_savings ?? false;

  // Metadata form state
  let lastFourDigits = editingItem?.metadata?.last_four_digits || '';
  let creditLimit = editingItem?.metadata?.credit_limit
    ? (editingItem.metadata.credit_limit / 100).toString()
    : '';
  let interestRate = editingItem?.metadata?.interest_rate
    ? (editingItem.metadata.interest_rate * 100).toFixed(2)
    : '';
  let interestRateCashAdvance = editingItem?.metadata?.interest_rate_cash_advance
    ? (editingItem.metadata.interest_rate_cash_advance * 100).toFixed(2)
    : '';
  let isVariableRate = editingItem?.metadata?.is_variable_rate ?? false;
  let statementDay = editingItem?.metadata?.statement_day?.toString() || '';
  let accountUrl = editingItem?.metadata?.account_url || '';
  let notes = editingItem?.metadata?.notes || '';

  // Reactive helper for debt account detection
  $: isDebt = isDebtAccount(type);

  // Show savings/investment options only for bank accounts
  $: isBankAccount = type === 'bank_account';

  // Investment type (explicit type, not bank_account with is_investment flag)
  $: isInvestmentType = type === 'investment';

  // Conditional field visibility based on type
  // - last_four_digits: All types
  // - credit_limit: credit_card, line_of_credit
  // - interest_rate: All types
  // - interest_rate_cash_advance: credit_card only
  // - is_variable_rate: line_of_credit, savings (bank_account with is_savings), investment (type or flag)
  // - statement_day: credit_card, line_of_credit
  // - account_url: All types
  // - notes: All types
  $: showCreditLimit = type === 'credit_card' || type === 'line_of_credit';
  $: showCashAdvanceRate = type === 'credit_card';
  $: showVariableRate =
    type === 'line_of_credit' || isInvestmentType || (isBankAccount && isSavings);
  $: showStatementDay = type === 'credit_card' || type === 'line_of_credit';

  // Savings or investment mode disables pay_off_monthly
  $: isSavingsOrInvestment = isSavings || isInvestmentType;

  // When type changes to non-debt, reset the debt-only options
  $: if (!isDebt) {
    excludeFromLeftover = false;
    payOffMonthly = false;
  }

  // When type changes to non-bank account, reset savings
  $: if (!isBankAccount) {
    isSavings = false;
  }

  // Savings and investment are mutually exclusive
  function handleSavingsChange(checked: boolean) {
    isSavings = checked;
    if (checked) {
      excludeFromLeftover = true; // Savings accounts are excluded from leftover
    }
  }

  // pay_off_monthly implies exclude_from_leftover
  $: if (payOffMonthly) {
    excludeFromLeftover = true;
  }

  // Investment type auto-excludes from leftover
  $: if (isInvestmentType) {
    excludeFromLeftover = true;
  }

  let error = '';
  let saving = false;

  // ===== Dirty tracking for unsaved changes confirmation =====
  interface InitialValues {
    name: string;
    type: PaymentSourceType;
    excludeFromLeftover: boolean;
    payOffMonthly: boolean;
    isSavings: boolean;
    lastFourDigits: string;
    creditLimit: string;
    interestRate: string;
    interestRateCashAdvance: string;
    isVariableRate: boolean;
    statementDay: string;
    accountUrl: string;
    notes: string;
  }

  let initialValues: InitialValues = {
    name: editingItem?.name || '',
    type: editingItem?.type || 'bank_account',
    excludeFromLeftover: editingItem?.exclude_from_leftover ?? false,
    payOffMonthly: editingItem?.pay_off_monthly ?? false,
    isSavings: editingItem?.is_savings ?? false,
    lastFourDigits: editingItem?.metadata?.last_four_digits || '',
    creditLimit: editingItem?.metadata?.credit_limit
      ? (editingItem.metadata.credit_limit / 100).toString()
      : '',
    interestRate: editingItem?.metadata?.interest_rate
      ? (editingItem.metadata.interest_rate * 100).toFixed(2)
      : '',
    interestRateCashAdvance: editingItem?.metadata?.interest_rate_cash_advance
      ? (editingItem.metadata.interest_rate_cash_advance * 100).toFixed(2)
      : '',
    isVariableRate: editingItem?.metadata?.is_variable_rate ?? false,
    statementDay: editingItem?.metadata?.statement_day?.toString() || '',
    accountUrl: editingItem?.metadata?.account_url || '',
    notes: editingItem?.metadata?.notes || '',
  };

  export function isDirty(): boolean {
    return (
      name !== initialValues.name ||
      type !== initialValues.type ||
      excludeFromLeftover !== initialValues.excludeFromLeftover ||
      payOffMonthly !== initialValues.payOffMonthly ||
      isSavings !== initialValues.isSavings ||
      lastFourDigits !== initialValues.lastFourDigits ||
      creditLimit !== initialValues.creditLimit ||
      interestRate !== initialValues.interestRate ||
      interestRateCashAdvance !== initialValues.interestRateCashAdvance ||
      isVariableRate !== initialValues.isVariableRate ||
      statementDay !== initialValues.statementDay ||
      accountUrl !== initialValues.accountUrl ||
      notes !== initialValues.notes
    );
  }

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    type = editingItem.type;
    excludeFromLeftover = editingItem.exclude_from_leftover ?? false;
    payOffMonthly = editingItem.pay_off_monthly ?? false;
    isSavings = editingItem.is_savings ?? false;
    // Reset metadata fields
    lastFourDigits = editingItem.metadata?.last_four_digits || '';
    creditLimit = editingItem.metadata?.credit_limit
      ? (editingItem.metadata.credit_limit / 100).toString()
      : '';
    interestRate = editingItem.metadata?.interest_rate
      ? (editingItem.metadata.interest_rate * 100).toFixed(2)
      : '';
    interestRateCashAdvance = editingItem.metadata?.interest_rate_cash_advance
      ? (editingItem.metadata.interest_rate_cash_advance * 100).toFixed(2)
      : '';
    isVariableRate = editingItem.metadata?.is_variable_rate ?? false;
    statementDay = editingItem.metadata?.statement_day?.toString() || '';
    accountUrl = editingItem.metadata?.account_url || '';
    notes = editingItem.metadata?.notes || '';
    // Update initial values for dirty tracking
    initialValues = {
      name: editingItem.name,
      type: editingItem.type,
      excludeFromLeftover: editingItem.exclude_from_leftover ?? false,
      payOffMonthly: editingItem.pay_off_monthly ?? false,
      isSavings: editingItem.is_savings ?? false,
      lastFourDigits: editingItem.metadata?.last_four_digits || '',
      creditLimit: editingItem.metadata?.credit_limit
        ? (editingItem.metadata.credit_limit / 100).toString()
        : '',
      interestRate: editingItem.metadata?.interest_rate
        ? (editingItem.metadata.interest_rate * 100).toFixed(2)
        : '',
      interestRateCashAdvance: editingItem.metadata?.interest_rate_cash_advance
        ? (editingItem.metadata.interest_rate_cash_advance * 100).toFixed(2)
        : '',
      isVariableRate: editingItem.metadata?.is_variable_rate ?? false,
      statementDay: editingItem.metadata?.statement_day?.toString() || '',
      accountUrl: editingItem.metadata?.account_url || '',
      notes: editingItem.metadata?.notes || '',
    };
  }

  // Build metadata object from form fields
  function buildMetadata(): PaymentSourceMetadata | undefined {
    const meta: PaymentSourceMetadata = {};

    if (lastFourDigits.trim()) {
      meta.last_four_digits = lastFourDigits.trim();
    }
    if (showCreditLimit && creditLimit.trim()) {
      const cents = Math.round(parseFloat(creditLimit) * 100);
      if (!isNaN(cents) && cents > 0) {
        meta.credit_limit = cents;
      }
    }
    // Only include interest_rate if not a variable rate account
    if (interestRate.trim() && !(showVariableRate && isVariableRate)) {
      const rate = parseFloat(interestRate) / 100;
      if (!isNaN(rate) && rate >= 0) {
        meta.interest_rate = rate;
      }
    }
    if (showCashAdvanceRate && interestRateCashAdvance.trim()) {
      const rate = parseFloat(interestRateCashAdvance) / 100;
      if (!isNaN(rate) && rate >= 0) {
        meta.interest_rate_cash_advance = rate;
      }
    }
    if (showVariableRate) {
      meta.is_variable_rate = isVariableRate;
    }
    if (showStatementDay && statementDay.trim()) {
      const day = parseInt(statementDay, 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        meta.statement_day = day;
      }
    }
    if (accountUrl.trim()) {
      meta.account_url = accountUrl.trim();
    }
    if (notes.trim()) {
      meta.notes = notes.trim();
    }

    // Return undefined if metadata is empty
    return Object.keys(meta).length > 0 ? meta : undefined;
  }

  export async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    saving = true;
    error = '';

    try {
      const metadata = buildMetadata();

      if (editingItem) {
        await updatePaymentSource(editingItem.id, {
          name,
          type,
          exclude_from_leftover: isDebt || isSavingsOrInvestment ? excludeFromLeftover : undefined,
          pay_off_monthly: isDebt && !isSavingsOrInvestment ? payOffMonthly : undefined,
          is_savings: isBankAccount ? isSavings : undefined,
          metadata,
        });
        success(`Payment source "${name}" updated`);
      } else {
        await createPaymentSource({
          name,
          type,
          balance: 0, // Balance is set per-month, not on the payment source
          exclude_from_leftover: isDebt || isSavingsOrInvestment ? excludeFromLeftover : undefined,
          pay_off_monthly: isDebt && !isSavingsOrInvestment ? payOffMonthly : undefined,
          is_savings: isBankAccount ? isSavings : undefined,
          metadata,
        });
        success(`Payment source "${name}" added`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save payment source';
      showError(error);
    } finally {
      saving = false;
    }
  }
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="form-group">
    <label for="ps-name">Name</label>
    <input
      id="ps-name"
      type="text"
      bind:value={name}
      placeholder="e.g., Main Checking"
      required
      disabled={saving}
    />
  </div>

  <div class="form-group">
    <label for="ps-type">Type</label>
    <select id="ps-type" bind:value={type} disabled={saving}>
      <option value="bank_account">🏦 Bank Account</option>
      <option value="credit_card">💳 Credit Card</option>
      <option value="line_of_credit">🏧 Line of Credit</option>
      <option value="investment">📈 Investment Account</option>
      <option value="cash">💵 Cash</option>
    </select>
  </div>

  {#if isBankAccount}
    <div class="bank-options">
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={isSavings}
            on:change={(e) => handleSavingsChange(e.currentTarget.checked)}
            disabled={saving}
          />
          <span class="checkbox-text">
            <strong>Savings Account</strong>
            <span class="checkbox-description"
              >Track as a savings account (excluded from budget leftover)</span
            >
          </span>
        </label>
      </div>
    </div>
  {/if}

  {#if isDebt}
    <div class="debt-options">
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={payOffMonthly} disabled={saving} />
          <span class="checkbox-text">
            <strong>Pay Off Monthly</strong>
            <span class="checkbox-description"
              >Auto-generate a payoff bill for this balance each month</span
            >
          </span>
        </label>
      </div>

      <div class="checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            bind:checked={excludeFromLeftover}
            disabled={saving || payOffMonthly}
          />
          <span class="checkbox-text">
            <strong>Exclude from Leftover</strong>
            <span class="checkbox-description"
              >Don't include this balance in the leftover calculation</span
            >
          </span>
        </label>
        {#if payOffMonthly}
          <div class="help-text locked">Automatically enabled with "Pay Off Monthly"</div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Metadata Section -->
  <div class="metadata-section">
    <div class="section-header">Account Details (Optional)</div>

    <div class="form-row">
      <div class="form-group">
        <label for="ps-last4">Last 4 Digits</label>
        <input
          id="ps-last4"
          type="text"
          bind:value={lastFourDigits}
          placeholder="1234"
          maxlength="4"
          pattern="[0-9]*"
          disabled={saving}
        />
      </div>

      {#if showStatementDay}
        <div class="form-group">
          <label for="ps-statement-day">Statement Day</label>
          <input
            id="ps-statement-day"
            type="number"
            bind:value={statementDay}
            placeholder="1-31"
            min="1"
            max="31"
            disabled={saving}
          />
        </div>
      {/if}
    </div>

    {#if showCreditLimit}
      <div class="form-group">
        <label for="ps-credit-limit">Credit Limit</label>
        <div class="input-with-prefix">
          <span class="input-prefix">$</span>
          <input
            id="ps-credit-limit"
            type="text"
            bind:value={creditLimit}
            placeholder="5,000.00"
            disabled={saving}
          />
        </div>
      </div>
    {/if}

    <div class="form-row">
      <div class="form-group">
        <label for="ps-interest-rate">Interest Rate</label>
        <div class="input-with-suffix" class:disabled-field={isVariableRate && showVariableRate}>
          <input
            id="ps-interest-rate"
            type="text"
            bind:value={interestRate}
            placeholder={isVariableRate && showVariableRate ? 'Variable' : '19.99'}
            disabled={saving || (isVariableRate && showVariableRate)}
          />
          <span class="input-suffix">%</span>
        </div>
        {#if isVariableRate && showVariableRate}
          <span class="field-hint">Disabled when Variable Rate is checked</span>
        {/if}
      </div>

      {#if showCashAdvanceRate}
        <div class="form-group">
          <label for="ps-cash-advance-rate">Cash Advance Rate</label>
          <div class="input-with-suffix">
            <input
              id="ps-cash-advance-rate"
              type="text"
              bind:value={interestRateCashAdvance}
              placeholder="24.99"
              disabled={saving}
            />
            <span class="input-suffix">%</span>
          </div>
        </div>
      {/if}
    </div>

    {#if showVariableRate}
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={isVariableRate} disabled={saving} />
          <span class="checkbox-text">
            <strong>Variable Rate</strong>
            <span class="checkbox-description">Interest rate may change over time</span>
          </span>
        </label>
      </div>
    {/if}

    <div class="form-group">
      <label for="ps-account-url">Account URL</label>
      <input
        id="ps-account-url"
        type="url"
        bind:value={accountUrl}
        placeholder="https://mybank.com/account"
        disabled={saving}
      />
    </div>

    <div class="form-group">
      <label for="ps-notes">Notes</label>
      <textarea
        id="ps-notes"
        bind:value={notes}
        placeholder="Optional notes about this account..."
        disabled={saving}
        rows="3"
      ></textarea>
    </div>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving}>
      {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Payment Source'}
    </button>
  </div>
</form>

<style>
  .entity-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .error-message {
    background: var(--error);
    color: var(--text-on-error, #fff);
    padding: 12px;
    border-radius: 6px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  input,
  select,
  textarea {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--border-default);
    background: var(--input-bg, var(--bg-base));
    color: var(--text-primary);
    font-size: 0.9375rem;
    box-sizing: border-box;
  }

  input,
  select {
    height: 46px;
  }

  textarea {
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--accent);
    margin-top: 4px;
  }

  .help-text.locked {
    color: var(--text-secondary);
    font-style: italic;
  }

  .debt-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    background: var(--bg-surface);
    border-radius: 8px;
    border: 1px solid var(--border-default);
  }

  .bank-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    background: var(--success-muted);
    border-radius: 8px;
    border: 1px solid var(--success-border, rgba(74, 222, 128, 0.3));
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
  }

  .checkbox-label input[type='checkbox'] {
    width: 20px;
    height: 20px;
    margin: 0;
    flex-shrink: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .checkbox-label input[type='checkbox']:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkbox-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .checkbox-text strong {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .checkbox-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .btn {
    flex: 1;
    padding: 12px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
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

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .metadata-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    background: var(--bg-elevated);
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
  }

  .section-header {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .form-row {
    display: flex;
    gap: 16px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .input-with-prefix,
  .input-with-suffix {
    display: flex;
    align-items: center;
    background: var(--input-bg, var(--bg-base));
    border: 1px solid var(--border-default);
    border-radius: 6px;
    overflow: hidden;
  }

  .input-with-prefix:focus-within,
  .input-with-suffix:focus-within {
    border-color: var(--accent);
  }

  .input-prefix,
  .input-suffix {
    padding: 0 12px;
    color: var(--text-secondary);
    background: var(--bg-surface);
    font-size: 0.9375rem;
    height: 44px;
    display: flex;
    align-items: center;
  }

  .input-with-prefix input,
  .input-with-suffix input {
    border: none;
    height: 44px;
    flex: 1;
    padding: 12px;
    background: transparent;
  }

  .input-with-prefix input:focus,
  .input-with-suffix input:focus {
    outline: none;
    border: none;
  }

  .disabled-field {
    opacity: 0.5;
    background: var(--bg-surface);
  }

  .disabled-field input {
    cursor: not-allowed;
  }

  .field-hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
    margin-top: 4px;
  }
</style>
