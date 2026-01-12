<script lang="ts">
  /**
   * ClaimForm - Form for creating/editing insurance claims
   */
  import { createClaim, updateClaim, type ClaimData } from '../../stores/insurance-claims';
  import { activeCategories, loadInsuranceCategories } from '../../stores/insurance-categories';
  import { success, error as showError } from '../../stores/toast';
  import type { InsuranceClaim, ClaimStatus } from '../../types/insurance';
  import { onMount } from 'svelte';

  export let editingItem: InsuranceClaim | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let category_id = editingItem?.category_id || '';
  let description = editingItem?.description || '';
  let provider_name = editingItem?.provider_name || '';
  let service_date = editingItem?.service_date || '';
  let amountDollars = editingItem ? (editingItem.total_amount / 100).toFixed(2) : '';
  let status: ClaimStatus = editingItem?.status || 'draft';

  let error = '';
  let saving = false;

  // Initial values for dirty tracking
  interface InitialValues {
    category_id: string;
    description: string;
    provider_name: string;
    service_date: string;
    amountDollars: string;
    status: ClaimStatus;
  }

  let initialValues: InitialValues = {
    category_id: editingItem?.category_id || '',
    description: editingItem?.description || '',
    provider_name: editingItem?.provider_name || '',
    service_date: editingItem?.service_date || '',
    amountDollars: editingItem ? (editingItem.total_amount / 100).toFixed(2) : '',
    status: editingItem?.status || 'draft',
  };

  // Exported function to check if form has unsaved changes
  export function isDirty(): boolean {
    return (
      category_id !== initialValues.category_id ||
      description !== initialValues.description ||
      provider_name !== initialValues.provider_name ||
      service_date !== initialValues.service_date ||
      amountDollars !== initialValues.amountDollars ||
      status !== initialValues.status
    );
  }

  onMount(() => {
    loadInsuranceCategories();
  });

  // Reset form when editingItem changes
  $: if (editingItem) {
    category_id = editingItem.category_id;
    description = editingItem.description || '';
    provider_name = editingItem.provider_name || '';
    service_date = editingItem.service_date;
    amountDollars = (editingItem.total_amount / 100).toFixed(2);
    status = editingItem.status;
    // Update initial values
    initialValues = {
      category_id: editingItem.category_id,
      description: editingItem.description || '',
      provider_name: editingItem.provider_name || '',
      service_date: editingItem.service_date,
      amountDollars: (editingItem.total_amount / 100).toFixed(2),
      status: editingItem.status,
    };
  }

  function dollarsToCents(dollars: string): number {
    const parsed = parseFloat(dollars.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  export async function handleSubmit() {
    // Validation
    if (!category_id) {
      error = 'Category is required';
      return;
    }

    if (!service_date) {
      error = 'Service date is required';
      return;
    }

    const amountCents = dollarsToCents(amountDollars);
    if (amountCents < 0) {
      error = 'Amount must be $0 or greater';
      return;
    }

    saving = true;
    error = '';

    try {
      const claimData: ClaimData = {
        category_id,
        service_date,
        total_amount: amountCents,
      };

      if (description.trim()) {
        claimData.description = description.trim();
      }
      if (provider_name.trim()) {
        claimData.provider_name = provider_name.trim();
      }

      if (editingItem) {
        await updateClaim(editingItem.id, claimData);
        success(`Claim #${editingItem.claim_number} updated`);
      } else {
        const newClaim = await createClaim(claimData);
        success(`Claim #${newClaim.claim_number} created`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save claim';
      showError(error);
    } finally {
      saving = false;
    }
  }

  $: hasCategories = $activeCategories.length > 0;
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if !hasCategories}
    <div class="warning-message">
      You need to set up insurance categories first.
      <a href="/setup">Go to Setup</a>
    </div>
  {/if}

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="form-group">
    <label for="claim-category">Category</label>
    <select
      id="claim-category"
      bind:value={category_id}
      required
      disabled={saving || !hasCategories}
    >
      <option value="">-- Select Category --</option>
      {#each $activeCategories as cat (cat.id)}
        <option value={cat.id}>{cat.icon} {cat.name}</option>
      {/each}
    </select>
  </div>

  <div class="form-group">
    <label for="claim-service-date">Service Date</label>
    <input
      id="claim-service-date"
      type="date"
      bind:value={service_date}
      required
      disabled={saving || !hasCategories}
    />
    <div class="help-text">Date of the medical service or purchase</div>
  </div>

  <div class="form-group">
    <label for="claim-amount">Total Amount</label>
    <div class="amount-input-wrapper">
      <span class="currency-prefix">$</span>
      <input
        id="claim-amount"
        type="text"
        bind:value={amountDollars}
        placeholder="0.00"
        required
        disabled={saving || !hasCategories}
      />
    </div>
    <div class="help-text">Total cost of the service/item</div>
  </div>

  <div class="form-group">
    <label for="claim-provider">Provider Name</label>
    <input
      id="claim-provider"
      type="text"
      bind:value={provider_name}
      placeholder="e.g., Dr. Smith, ABC Pharmacy"
      disabled={saving || !hasCategories}
    />
    <div class="help-text">Optional: Name of the healthcare provider</div>
  </div>

  <div class="form-group">
    <label for="claim-description">Description</label>
    <textarea
      id="claim-description"
      bind:value={description}
      placeholder="e.g., Annual checkup, Prescription refill..."
      rows="3"
      disabled={saving || !hasCategories}
    ></textarea>
    <div class="help-text">Optional: Additional details about the service</div>
  </div>

  {#if editingItem}
    <div class="form-group">
      <label for="claim-status">Status</label>
      <select id="claim-status" bind:value={status} disabled={saving}>
        <option value="draft">Draft</option>
        <option value="in_progress">In Progress</option>
        <option value="closed">Closed</option>
      </select>
    </div>
  {/if}

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving || !hasCategories}>
      {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Claim'}
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

  .warning-message a {
    color: var(--warning);
    text-decoration: underline;
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
  select:disabled,
  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    color: var(--text-tertiary);
    margin-top: 4px;
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
</style>
