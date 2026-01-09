<script lang="ts">
  /**
   * IncomeForm - Drawer-compatible form for incomes
   *
   * @prop editingItem - Income being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import { createIncome, updateIncome } from '../../stores/incomes';
  import { paymentSourcesStore } from '../../stores/payment-sources';
  import { incomeCategories, loadCategories } from '../../stores/categories';
  import { success, error as showError } from '../../stores/toast';
  import type { Income, IncomeData } from '../../stores/incomes';
  import type { EntityMetadata } from '../../stores/bills';
  import { onMount } from 'svelte';

  export let editingItem: Income | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Load categories on mount
  onMount(() => {
    loadCategories();
  });

  // Form state - amount is stored in dollars for user input
  let name = editingItem?.name || '';
  let amountDollars = editingItem ? (editingItem.amount / 100).toFixed(2) : '';
  let billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually' =
    editingItem?.billing_period || 'monthly';
  let start_date = editingItem?.start_date || '';
  let payment_source_id = editingItem?.payment_source_id || '';

  // Monthly recurrence options
  type MonthlyType = 'day_of_month' | 'nth_weekday';
  let monthly_type: MonthlyType =
    editingItem?.recurrence_week !== undefined ? 'nth_weekday' : 'day_of_month';
  let day_of_month = editingItem?.day_of_month || 1;
  let recurrence_week = editingItem?.recurrence_week || 1;
  let recurrence_day = editingItem?.recurrence_day || 0;

  // Due date (optional)
  let due_day: number | '' = editingItem?.due_day || '';

  // Category (optional)
  let category_id = editingItem?.category_id || '';

  // Metadata fields (stored in nested metadata object)
  let bank_transaction_name = editingItem?.metadata?.bank_transaction_name || '';
  let account_number = editingItem?.metadata?.account_number || '';
  let account_url = editingItem?.metadata?.account_url || '';
  let notes = editingItem?.metadata?.notes || '';

  let error = '';
  let saving = false;

  // Weekday names for dropdown
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEK_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th/Last'];

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    amountDollars = (editingItem.amount / 100).toFixed(2);
    billing_period = editingItem.billing_period;
    start_date = editingItem.start_date || '';
    payment_source_id = editingItem.payment_source_id;
    monthly_type = editingItem.recurrence_week !== undefined ? 'nth_weekday' : 'day_of_month';
    day_of_month = editingItem.day_of_month || 1;
    recurrence_week = editingItem.recurrence_week || 1;
    recurrence_day = editingItem.recurrence_day || 0;
    due_day = editingItem.due_day || '';
    category_id = editingItem.category_id || '';
    // Metadata fields (from nested metadata object)
    bank_transaction_name = editingItem.metadata?.bank_transaction_name || '';
    account_number = editingItem.metadata?.account_number || '';
    account_url = editingItem.metadata?.account_url || '';
    notes = editingItem.metadata?.notes || '';
  }

  // Convert dollars to cents
  function dollarsToCents(dollars: string): number {
    const parsed = parseFloat(dollars.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    const amountCents = dollarsToCents(amountDollars);
    if (amountCents < 100) {
      error = 'Amount must be at least $1.00';
      return;
    }

    if (!payment_source_id) {
      error = 'Payment source is required';
      return;
    }

    if (!category_id) {
      error = 'Category is required';
      return;
    }

    if (billing_period !== 'monthly' && !start_date) {
      error = 'Start date is required for bi-weekly, weekly, and semi-annual billing';
      return;
    }

    saving = true;
    error = '';

    try {
      const incomeData: IncomeData = {
        name,
        amount: amountCents,
        billing_period,
        payment_source_id,
        category_id,
      };

      // Add appropriate fields based on billing period
      if (billing_period !== 'monthly' && start_date) {
        incomeData.start_date = start_date;
      }

      // Add monthly recurrence fields
      if (billing_period === 'monthly') {
        if (monthly_type === 'day_of_month') {
          incomeData.day_of_month = day_of_month;
        } else {
          incomeData.recurrence_week = recurrence_week;
          incomeData.recurrence_day = recurrence_day;
        }
      }

      // Add due_day if specified
      if (due_day !== '' && typeof due_day === 'number') {
        incomeData.due_day = due_day;
      }

      // Build metadata object (only if any metadata field has a value)
      const hasMetadata =
        bank_transaction_name.trim() || account_number.trim() || account_url.trim() || notes.trim();

      if (hasMetadata) {
        const metadata: EntityMetadata = {};
        if (bank_transaction_name.trim()) {
          metadata.bank_transaction_name = bank_transaction_name.trim();
        }
        if (account_number.trim()) {
          metadata.account_number = account_number.trim();
        }
        if (account_url.trim()) {
          metadata.account_url = account_url.trim();
        }
        if (notes.trim()) {
          metadata.notes = notes.trim();
        }
        incomeData.metadata = metadata;
      }

      if (editingItem) {
        await updateIncome(editingItem.id, incomeData);
        success(`Income "${name}" updated`);
      } else {
        await createIncome(incomeData);
        success(`Income "${name}" added`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save income';
      showError(error);
    } finally {
      saving = false;
    }
  }

  // Check if payment sources exist
  $: hasPaymentSources = $paymentSourcesStore.paymentSources.length > 0;
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if !hasPaymentSources}
    <div class="warning-message">You need to add at least one payment source first.</div>
  {/if}

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="form-group">
    <label for="income-name">Income Name</label>
    <input
      id="income-name"
      type="text"
      bind:value={name}
      placeholder="e.g., Salary"
      required
      disabled={saving || !hasPaymentSources}
    />
  </div>

  <div class="form-group">
    <label for="income-amount">Amount</label>
    <div class="amount-input-wrapper">
      <span class="currency-prefix">$</span>
      <input
        id="income-amount"
        type="text"
        bind:value={amountDollars}
        placeholder="0.00"
        required
        disabled={saving || !hasPaymentSources}
      />
    </div>
    <div class="help-text">Minimum $1.00</div>
  </div>

  <div class="form-group">
    <label for="income-period">Billing Period</label>
    <select id="income-period" bind:value={billing_period} disabled={saving || !hasPaymentSources}>
      <option value="monthly">Monthly</option>
      <option value="bi_weekly">Bi-Weekly</option>
      <option value="weekly">Weekly</option>
      <option value="semi_annually">Semi-Annually</option>
    </select>
  </div>

  {#if billing_period !== 'monthly'}
    <div class="form-group">
      <label for="income-start-date">First Payment Date</label>
      <input
        id="income-start-date"
        type="date"
        bind:value={start_date}
        required
        disabled={saving || !hasPaymentSources}
      />
      <div class="help-text">
        {#if billing_period === 'bi_weekly'}
          Income will occur every 2 weeks from this date
        {:else if billing_period === 'weekly'}
          Income will occur every week from this date
        {:else if billing_period === 'semi_annually'}
          Income will occur every 6 months from this date
        {/if}
      </div>
    </div>
  {:else}
    <!-- Monthly recurrence options -->
    <div class="form-group">
      <span class="group-label">When does this income occur?</span>
      <div class="radio-group">
        <label class="radio-label">
          <input
            type="radio"
            bind:group={monthly_type}
            value="day_of_month"
            disabled={saving || !hasPaymentSources}
          />
          Specific day of month
        </label>
        <label class="radio-label">
          <input
            type="radio"
            bind:group={monthly_type}
            value="nth_weekday"
            disabled={saving || !hasPaymentSources}
          />
          Nth weekday of month
        </label>
      </div>
    </div>

    {#if monthly_type === 'day_of_month'}
      <div class="form-group">
        <label for="income-day-of-month">Day of Month</label>
        <select
          id="income-day-of-month"
          bind:value={day_of_month}
          disabled={saving || !hasPaymentSources}
        >
          {#each Array.from({ length: 31 }, (_, i) => i + 1) as day (day)}
            <option value={day}>{day}{day === 31 ? ' (or last day)' : ''}</option>
          {/each}
        </select>
      </div>
    {:else}
      <div class="form-group">
        <label for="income-recurrence-week">Which week?</label>
        <select
          id="income-recurrence-week"
          bind:value={recurrence_week}
          disabled={saving || !hasPaymentSources}
        >
          {#each WEEK_ORDINALS as label, i (i)}
            <option value={i + 1}>{label}</option>
          {/each}
        </select>
      </div>
      <div class="form-group">
        <label for="income-recurrence-day">Which day?</label>
        <select
          id="income-recurrence-day"
          bind:value={recurrence_day}
          disabled={saving || !hasPaymentSources}
        >
          {#each WEEKDAYS as label, i (i)}
            <option value={i}>{label}</option>
          {/each}
        </select>
      </div>
      <div class="help-text">
        Example: "{WEEK_ORDINALS[recurrence_week - 1]}
        {WEEKDAYS[recurrence_day]}" of every month
      </div>
    {/if}
  {/if}

  <div class="form-group">
    <label for="income-payment-source">Payment Source (Deposit To)</label>
    <select
      id="income-payment-source"
      bind:value={payment_source_id}
      required
      disabled={saving || !hasPaymentSources}
    >
      <option value="">-- Select Payment Source --</option>
      {#each $paymentSourcesStore.paymentSources as ps (ps.id)}
        <option value={ps.id}>{ps.name}</option>
      {/each}
    </select>
  </div>

  <div class="form-group">
    <label for="income-category">Category</label>
    <select
      id="income-category"
      bind:value={category_id}
      required
      disabled={saving || !hasPaymentSources}
    >
      <option value="">-- Select Category --</option>
      {#each $incomeCategories as cat (cat.id)}
        <option value={cat.id}>{cat.name}</option>
      {/each}
    </select>
    <div class="help-text">Group incomes for easier tracking in monthly view</div>
  </div>

  <div class="form-group">
    <label for="income-due-day">Expected Day (Optional)</label>
    <select id="income-due-day" bind:value={due_day} disabled={saving || !hasPaymentSources}>
      <option value="">-- No expected date --</option>
      {#each Array.from({ length: 31 }, (_, i) => i + 1) as day (day)}
        <option value={day}>{day}{day === 31 ? ' (or last day)' : ''}</option>
      {/each}
    </select>
    <div class="help-text">Used to track if income is late in the monthly view</div>
  </div>

  <!-- Metadata Section -->
  <div class="metadata-section">
    <div class="section-header">Additional Details</div>

    <div class="form-group">
      <label for="income-bank-transaction-name">Bank Transaction Name</label>
      <input
        id="income-bank-transaction-name"
        type="text"
        bind:value={bank_transaction_name}
        placeholder="e.g., DIRECT DEP ACME INC"
        disabled={saving || !hasPaymentSources}
      />
      <div class="help-text">How this appears on your bank statement</div>
    </div>

    <div class="form-group">
      <label for="income-account-number">Account Number</label>
      <input
        id="income-account-number"
        type="text"
        bind:value={account_number}
        placeholder="e.g., Employee ID: 12345"
        disabled={saving || !hasPaymentSources}
      />
      <div class="help-text">Account or reference number</div>
    </div>

    <div class="form-group">
      <label for="income-account-url">Account URL</label>
      <input
        id="income-account-url"
        type="url"
        bind:value={account_url}
        placeholder="https://..."
        disabled={saving || !hasPaymentSources}
      />
      <div class="help-text">Link to payroll portal or income source</div>
    </div>

    <div class="form-group">
      <label for="income-notes">Notes</label>
      <textarea
        id="income-notes"
        bind:value={notes}
        placeholder="Any additional notes..."
        rows="3"
        disabled={saving || !hasPaymentSources}
      ></textarea>
    </div>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving || !hasPaymentSources}>
      {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Income'}
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

  .warning-message {
    background: var(--warning-muted);
    color: var(--warning);
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--warning);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label,
  .group-label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  input,
  select {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--border-default);
    background: var(--input-bg, var(--bg-base));
    color: var(--text-primary);
    font-size: 0.9375rem;
    height: 46px;
    box-sizing: border-box;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: var(--accent);
  }

  input:disabled,
  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .amount-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .currency-prefix {
    position: absolute;
    left: 12px;
    color: var(--text-secondary);
    font-size: 0.9375rem;
    pointer-events: none;
  }

  .amount-input-wrapper input {
    padding-left: 28px;
    width: 100%;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--accent);
    margin-top: 4px;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: normal;
    font-size: 0.875rem;
  }

  .radio-label input[type='radio'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
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

  /* Metadata section styles */
  .metadata-section {
    margin-top: 8px;
    padding-top: 20px;
    border-top: 1px solid var(--border-default);
  }

  .section-header {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--accent);
    margin-bottom: 16px;
  }

  textarea {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--border-default);
    background: var(--input-bg, var(--bg-base));
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    box-sizing: border-box;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
