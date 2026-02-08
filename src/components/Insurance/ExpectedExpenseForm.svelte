<script lang="ts">
  /**
   * ExpectedExpenseForm - Form for scheduling expected insurance expenses
   * Creates a claim with status 'expected' plus auto-generated bill and income instances
   */
  import {
    createExpectedExpense,
    updateExpectedExpense,
    type ExpectedExpenseData,
  } from '../../stores/insurance-claims';
  import { activeCategories, loadInsuranceCategories } from '../../stores/insurance-categories';
  import { activeMembers, loadFamilyMembers } from '../../stores/family-members';
  import { paymentSources, loadPaymentSources } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';
  import type { InsuranceClaim } from '../../types/insurance';
  import { onMount } from 'svelte';
  import { dollarsToCents } from '$lib/utils/format';

  // Props
  export let editingItem: InsuranceClaim | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let family_member_id = editingItem?.family_member_id || '';
  let category_id = editingItem?.category_id || '';
  let provider_name = editingItem?.provider_name || '';
  let appointment_date = editingItem?.service_date || '';
  let expectedCostDollars = editingItem?.expected_cost
    ? (editingItem.expected_cost / 100).toFixed(2)
    : '';
  let expectedReimbursementDollars = editingItem?.expected_reimbursement
    ? (editingItem.expected_reimbursement / 100).toFixed(2)
    : '';
  let payment_source_id = editingItem?.payment_source_id || '';

  let error = '';
  let saving = false;

  // Computed out-of-pocket
  $: outOfPocketCents =
    dollarsToCents(expectedCostDollars) - dollarsToCents(expectedReimbursementDollars);
  $: outOfPocketDollars = (outOfPocketCents / 100).toFixed(2);

  onMount(() => {
    loadInsuranceCategories();
    loadFamilyMembers();
    loadPaymentSources();
  });

  // Filter to non-investment, non-savings payment sources for bills
  $: availablePaymentSources = $paymentSources.filter(
    (ps) => ps.is_active && !ps.is_savings && !ps.is_investment
  );

  // Reset form when editingItem changes
  $: if (editingItem) {
    family_member_id = editingItem.family_member_id;
    category_id = editingItem.category_id;
    provider_name = editingItem.provider_name || '';
    appointment_date = editingItem.service_date;
    expectedCostDollars = editingItem.expected_cost
      ? (editingItem.expected_cost / 100).toFixed(2)
      : '';
    expectedReimbursementDollars = editingItem.expected_reimbursement
      ? (editingItem.expected_reimbursement / 100).toFixed(2)
      : '';
    payment_source_id = editingItem.payment_source_id || '';
  }

  // Exported function to check if form has unsaved changes
  export function isDirty(): boolean {
    if (!editingItem) {
      return !!(
        family_member_id ||
        category_id ||
        provider_name ||
        appointment_date ||
        expectedCostDollars ||
        expectedReimbursementDollars
      );
    }
    return (
      family_member_id !== editingItem.family_member_id ||
      category_id !== editingItem.category_id ||
      provider_name !== (editingItem.provider_name || '') ||
      appointment_date !== editingItem.service_date ||
      dollarsToCents(expectedCostDollars) !== (editingItem.expected_cost || 0) ||
      dollarsToCents(expectedReimbursementDollars) !== (editingItem.expected_reimbursement || 0)
    );
  }

  export async function handleSubmit() {
    // Validation
    if (!family_member_id) {
      error = 'Family member is required';
      return;
    }

    if (!category_id) {
      error = 'Category is required';
      return;
    }

    if (!appointment_date) {
      error = 'Appointment date is required';
      return;
    }

    if (!payment_source_id) {
      error = 'Payment source is required';
      return;
    }

    const expectedCostCents = dollarsToCents(expectedCostDollars);
    if (expectedCostCents <= 0) {
      error = 'Expected cost must be greater than $0';
      return;
    }

    const expectedReimbursementCents = dollarsToCents(expectedReimbursementDollars);
    if (expectedReimbursementCents < 0) {
      error = 'Expected reimbursement cannot be negative';
      return;
    }

    if (expectedReimbursementCents > expectedCostCents) {
      error = 'Expected reimbursement cannot exceed expected cost';
      return;
    }

    saving = true;
    error = '';

    try {
      const data: ExpectedExpenseData = {
        family_member_id,
        category_id,
        appointment_date,
        expected_cost: expectedCostCents,
        expected_reimbursement: expectedReimbursementCents,
        payment_source_id,
      };

      if (provider_name.trim()) {
        data.provider_name = provider_name.trim();
      }

      if (editingItem) {
        await updateExpectedExpense(editingItem.id, data);
        success('Expected expense updated');
      } else {
        await createExpectedExpense(data);
        success('Expected expense scheduled');
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save expected expense';
      showError(error);
    } finally {
      saving = false;
    }
  }

  $: hasCategories = $activeCategories.length > 0;
  $: hasFamilyMembers = $activeMembers.length > 0;
  $: hasPaymentSources = availablePaymentSources.length > 0;
  $: canSubmit = hasCategories && hasFamilyMembers && hasPaymentSources;

  // Get category name for bill naming preview
  $: selectedCategory = $activeCategories.find((c) => c.id === category_id);
  $: billNamePreview = selectedCategory
    ? `${selectedCategory.name}${provider_name ? `: ${provider_name}` : ''}`
    : '';
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if !hasFamilyMembers}
    <div class="warning-message">
      You need to set up family members first.
      <a href="/setup">Go to Setup</a>
    </div>
  {:else if !hasCategories}
    <div class="warning-message">
      You need to set up insurance categories first.
      <a href="/setup">Go to Setup</a>
    </div>
  {:else if !hasPaymentSources}
    <div class="warning-message">
      You need to set up payment sources first.
      <a href="/setup">Go to Setup</a>
    </div>
  {/if}

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="form-group">
    <label for="expected-family-member">Family Member</label>
    <select
      id="expected-family-member"
      bind:value={family_member_id}
      required
      disabled={saving || !canSubmit}
    >
      <option value="">-- Select Family Member --</option>
      {#each $activeMembers as member (member.id)}
        <option value={member.id}>{member.name}</option>
      {/each}
    </select>
    <div class="help-text">Who is this appointment for?</div>
  </div>

  <div class="form-group">
    <label for="expected-category">Category</label>
    <select
      id="expected-category"
      bind:value={category_id}
      required
      disabled={saving || !canSubmit}
    >
      <option value="">-- Select Category --</option>
      {#each $activeCategories as cat (cat.id)}
        <option value={cat.id}>{cat.icon} {cat.name}</option>
      {/each}
    </select>
  </div>

  <div class="form-group">
    <label for="expected-provider">Provider Name</label>
    <input
      id="expected-provider"
      type="text"
      bind:value={provider_name}
      placeholder="e.g., Wellness Clinic, Dr. Smith"
      disabled={saving || !canSubmit}
    />
    <div class="help-text">Optional: Name of the service provider</div>
  </div>

  <div class="form-group">
    <label for="expected-date">Appointment Date</label>
    <input
      id="expected-date"
      type="date"
      bind:value={appointment_date}
      required
      disabled={saving || !canSubmit}
    />
    <div class="help-text">When is the scheduled appointment?</div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="expected-cost">Expected Cost</label>
      <div class="amount-input-wrapper">
        <span class="currency-prefix">$</span>
        <input
          id="expected-cost"
          type="text"
          bind:value={expectedCostDollars}
          placeholder="0.00"
          required
          disabled={saving || !canSubmit}
        />
      </div>
      <div class="help-text">Estimated total cost</div>
    </div>

    <div class="form-group">
      <label for="expected-reimbursement">Expected Reimbursement</label>
      <div class="amount-input-wrapper">
        <span class="currency-prefix">$</span>
        <input
          id="expected-reimbursement"
          type="text"
          bind:value={expectedReimbursementDollars}
          placeholder="0.00"
          disabled={saving || !canSubmit}
        />
      </div>
      <div class="help-text">Estimated insurance payout</div>
    </div>
  </div>

  {#if expectedCostDollars || expectedReimbursementDollars}
    <div class="out-of-pocket-preview">
      <span class="label">Estimated Out-of-Pocket:</span>
      <span class="amount" class:negative={outOfPocketCents < 0}>
        ${outOfPocketDollars}
      </span>
    </div>
  {/if}

  <div class="form-group">
    <label for="expected-payment-source">Payment Source</label>
    <select
      id="expected-payment-source"
      bind:value={payment_source_id}
      required
      disabled={saving || !canSubmit}
    >
      <option value="">-- Select Payment Source --</option>
      {#each availablePaymentSources as source (source.id)}
        <option value={source.id}>{source.name}</option>
      {/each}
    </select>
    <div class="help-text">Which account will you pay from?</div>
  </div>

  {#if billNamePreview}
    <div class="budget-preview">
      <div class="preview-header">Budget Impact Preview</div>
      <div class="preview-items">
        <div class="preview-item bill">
          <span class="icon">📤</span>
          <span class="name">Bill: {billNamePreview}</span>
          <span class="amount">${expectedCostDollars || '0.00'}</span>
        </div>
        <div class="preview-item income">
          <span class="icon">📥</span>
          <span class="name">Income: Insurance Reimbursement</span>
          <span class="amount">${expectedReimbursementDollars || '0.00'}</span>
        </div>
      </div>
    </div>
  {/if}

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving || !canSubmit}>
      {saving ? 'Saving...' : editingItem ? 'Update Expected' : 'Schedule Expected'}
    </button>
  </div>
</form>

<style>
  .entity-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .error-message {
    background: var(--error);
    color: var(--text-on-error, #fff);
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }

  .warning-message {
    background: var(--warning-muted);
    color: var(--warning);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--warning);
  }

  .warning-message a {
    color: var(--warning);
    text-decoration: underline;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  input,
  select {
    padding: var(--space-3);
    border-radius: var(--radius-md);
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
    left: var(--space-3);
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
    color: var(--text-tertiary);
    margin-top: var(--space-1);
  }

  .out-of-pocket-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
  }

  .out-of-pocket-preview .label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .out-of-pocket-preview .amount {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .out-of-pocket-preview .amount.negative {
    color: var(--error);
  }

  .budget-preview {
    background: var(--accent-muted);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }

  .preview-header {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .preview-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .preview-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .preview-item .icon {
    font-size: 1rem;
  }

  .preview-item .name {
    flex: 1;
  }

  .preview-item .amount {
    font-weight: 500;
    font-family: monospace;
  }

  .preview-item.bill .amount {
    color: var(--error);
  }

  .preview-item.income .amount {
    color: var(--success);
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-5);
  }

  .btn {
    flex: 1;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
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
</style>
