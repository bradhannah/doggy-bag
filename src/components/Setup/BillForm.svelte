<script lang="ts">
  /**
   * BillForm - Drawer-compatible form for bills
   * 
   * @prop editingItem - Bill being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import { createBill, updateBill } from '../../stores/bills';
  import { paymentSourcesStore } from '../../stores/payment-sources';
  import type { Bill, BillData } from '../../stores/bills';

  export let editingItem: Bill | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let name = editingItem?.name || '';
  let amount = editingItem?.amount || 0;
  let billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually' = editingItem?.billing_period || 'monthly';
  let start_date = editingItem?.start_date || '';
  let payment_source_id = editingItem?.payment_source_id || '';
  
  // Monthly recurrence options
  type MonthlyType = 'day_of_month' | 'nth_weekday';
  let monthly_type: MonthlyType = editingItem?.recurrence_week !== undefined ? 'nth_weekday' : 'day_of_month';
  let day_of_month = editingItem?.day_of_month || 1;
  let recurrence_week = editingItem?.recurrence_week || 1;
  let recurrence_day = editingItem?.recurrence_day || 0;
  
  let error = '';
  let saving = false;

  // Weekday names for dropdown
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEK_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th/Last'];

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    amount = editingItem.amount;
    billing_period = editingItem.billing_period;
    start_date = editingItem.start_date || '';
    payment_source_id = editingItem.payment_source_id;
    monthly_type = editingItem.recurrence_week !== undefined ? 'nth_weekday' : 'day_of_month';
    day_of_month = editingItem.day_of_month || 1;
    recurrence_week = editingItem.recurrence_week || 1;
    recurrence_day = editingItem.recurrence_day || 0;
  }

  function formatAmount(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }
    if (!payment_source_id) {
      error = 'Payment source is required';
      return;
    }
    if (billing_period !== 'monthly' && !start_date) {
      error = 'Start date is required for bi-weekly, weekly, and semi-annual billing';
      return;
    }

    saving = true;
    error = '';

    try {
      const billData: BillData = {
        name,
        amount,
        billing_period,
        payment_source_id
      };

      // Add appropriate fields based on billing period
      if (billing_period !== 'monthly' && start_date) {
        billData.start_date = start_date;
      }
      
      // Add monthly recurrence fields
      if (billing_period === 'monthly') {
        if (monthly_type === 'day_of_month') {
          billData.day_of_month = day_of_month;
        } else {
          billData.recurrence_week = recurrence_week;
          billData.recurrence_day = recurrence_day;
        }
      }

      if (editingItem) {
        await updateBill(editingItem.id, billData);
      } else {
        await createBill(billData);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save bill';
    } finally {
      saving = false;
    }
  }

  // Check if payment sources exist
  $: hasPaymentSources = $paymentSourcesStore.paymentSources.length > 0;
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if !hasPaymentSources}
    <div class="warning-message">
      You need to add at least one payment source first.
    </div>
  {/if}

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="form-group">
    <label for="bill-name">Bill Name</label>
    <input
      id="bill-name"
      type="text"
      bind:value={name}
      placeholder="e.g., Rent"
      required
      disabled={saving || !hasPaymentSources}
    />
  </div>

  <div class="form-group">
    <label for="bill-amount">Amount (in cents)</label>
    <input
      id="bill-amount"
      type="number"
      bind:value={amount}
      min="1"
      step="1"
      placeholder="e.g., 150000 for $1,500.00"
      required
      disabled={saving || !hasPaymentSources}
    />
    <div class="amount-preview">
      {formatAmount(amount)}
    </div>
  </div>

  <div class="form-group">
    <label for="bill-period">Billing Period</label>
    <select id="bill-period" bind:value={billing_period} disabled={saving || !hasPaymentSources}>
      <option value="monthly">Monthly</option>
      <option value="bi_weekly">Bi-Weekly</option>
      <option value="weekly">Weekly</option>
      <option value="semi_annually">Semi-Annually</option>
    </select>
  </div>

  {#if billing_period !== 'monthly'}
    <div class="form-group">
      <label for="bill-start-date">First Payment Date</label>
      <input
        id="bill-start-date"
        type="date"
        bind:value={start_date}
        required
        disabled={saving || !hasPaymentSources}
      />
      <div class="help-text">
        {#if billing_period === 'bi_weekly'}
          Bills will occur every 2 weeks from this date
        {:else if billing_period === 'weekly'}
          Bills will occur every week from this date
        {:else if billing_period === 'semi_annually'}
          Bills will occur every 6 months from this date
        {/if}
      </div>
    </div>
  {:else}
    <!-- Monthly recurrence options -->
    <div class="form-group">
      <label>When does this bill occur?</label>
      <div class="radio-group">
        <label class="radio-label">
          <input type="radio" bind:group={monthly_type} value="day_of_month" disabled={saving || !hasPaymentSources} />
          Specific day of month
        </label>
        <label class="radio-label">
          <input type="radio" bind:group={monthly_type} value="nth_weekday" disabled={saving || !hasPaymentSources} />
          Nth weekday of month
        </label>
      </div>
    </div>

    {#if monthly_type === 'day_of_month'}
      <div class="form-group">
        <label for="bill-day-of-month">Day of Month</label>
        <select id="bill-day-of-month" bind:value={day_of_month} disabled={saving || !hasPaymentSources}>
          {#each Array.from({length: 31}, (_, i) => i + 1) as day}
            <option value={day}>{day}{day === 31 ? ' (or last day)' : ''}</option>
          {/each}
        </select>
      </div>
    {:else}
      <div class="form-group">
        <label for="bill-recurrence-week">Which week?</label>
        <select id="bill-recurrence-week" bind:value={recurrence_week} disabled={saving || !hasPaymentSources}>
          {#each WEEK_ORDINALS as label, i}
            <option value={i + 1}>{label}</option>
          {/each}
        </select>
      </div>
      <div class="form-group">
        <label for="bill-recurrence-day">Which day?</label>
        <select id="bill-recurrence-day" bind:value={recurrence_day} disabled={saving || !hasPaymentSources}>
          {#each WEEKDAYS as label, i}
            <option value={i}>{label}</option>
          {/each}
        </select>
      </div>
      <div class="help-text">
        Example: "{WEEK_ORDINALS[recurrence_week - 1]} {WEEKDAYS[recurrence_day]}" of every month
      </div>
    {/if}
  {/if}

  <div class="form-group">
    <label for="bill-payment-source">Payment Source</label>
    <select id="bill-payment-source" bind:value={payment_source_id} required disabled={saving || !hasPaymentSources}>
      <option value="">-- Select Payment Source --</option>
      {#each $paymentSourcesStore.paymentSources as ps}
        <option value={ps.id}>{ps.name}</option>
      {/each}
    </select>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving || !hasPaymentSources}>
      {saving ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Bill')}
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
    background: #ff4444;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
  }

  .warning-message {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #ffc107;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 500;
    font-size: 14px;
    color: #e4e4e7;
  }

  input, select {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #333355;
    background: #0f0f0f;
    color: #fff;
    font-size: 15px;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #24c8db;
  }

  input:disabled, select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .amount-preview {
    font-size: 13px;
    color: #888;
    margin-top: 4px;
  }

  .help-text {
    font-size: 12px;
    color: #24c8db;
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
    font-size: 14px;
  }

  .radio-label input[type="radio"] {
    width: 18px;
    height: 18px;
    accent-color: #24c8db;
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
    font-size: 14px;
    font-weight: 500;
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

  .btn-secondary {
    background: #333355;
    color: #fff;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #444466;
  }
</style>
