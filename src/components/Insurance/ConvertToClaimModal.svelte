<script lang="ts">
  /**
   * ConvertToClaimModal - Converts an expected expense to an actual insurance claim
   *
   * When the appointment happens, the user enters the actual cost. This:
   * 1. Converts the expected expense to a regular claim
   * 2. Assigns a claim number
   * 3. Auto-generates draft submissions based on family member's plans
   * 4. Optionally updates the linked bill amount to match actual cost
   */
  import { createEventDispatcher } from 'svelte';
  import { convertExpectedToClaim } from '../../stores/insurance-claims';
  import { success, error as showError } from '../../stores/toast';
  import type { InsuranceClaim } from '../../types/insurance';
  import Modal from '../shared/Modal.svelte';

  export let claim: InsuranceClaim;
  export let onClose: () => void;
  export let open = true;

  const dispatch = createEventDispatcher();

  // Form state
  let actualCostDollars = claim.expected_cost ? (claim.expected_cost / 100).toFixed(2) : '';
  let updateBillAmount = true;
  let submitting = false;

  // Computed
  $: actualCostCents = Math.round(parseFloat(actualCostDollars || '0') * 100);
  $: isValid = actualCostCents >= 0 && actualCostDollars !== '';
  $: costDifference = actualCostCents - (claim.expected_cost || 0);
  $: estimatedOutOfPocket = actualCostCents - (claim.expected_reimbursement || 0);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!isValid || submitting) return;

    submitting = true;
    try {
      const converted = await convertExpectedToClaim(claim.id, {
        actual_cost: actualCostCents,
        update_bill_amount: updateBillAmount,
      });

      success(`Converted to claim #${converted.claim_number}`);
      dispatch('converted', { claim: converted });
      onClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to convert to claim');
    } finally {
      submitting = false;
    }
  }

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
</script>

<Modal
  {open}
  title="Convert to Claim"
  subtitle={`Record actual cost for ${claim.category_name} appointment`}
  {onClose}
>
  <form on:submit={handleSubmit}>
    <!-- Appointment Info -->
    <div class="info-section">
      <div class="info-row">
        <span class="info-label">Date</span>
        <span class="info-value">{formatDate(claim.service_date)}</span>
      </div>
      {#if claim.provider_name}
        <div class="info-row">
          <span class="info-label">Provider</span>
          <span class="info-value">{claim.provider_name}</span>
        </div>
      {/if}
      <div class="info-row">
        <span class="info-label">Family Member</span>
        <span class="info-value">{claim.family_member_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Estimated Cost</span>
        <span class="info-value">{formatCurrency(claim.expected_cost || 0)}</span>
      </div>
    </div>

    <!-- Actual Cost Input -->
    <div class="form-field">
      <label for="actualCost">Actual Cost</label>
      <div class="input-with-prefix">
        <span class="prefix">$</span>
        <input
          type="number"
          id="actualCost"
          bind:value={actualCostDollars}
          placeholder="0.00"
          min="0"
          step="0.01"
          required
          autofocus
        />
      </div>
      {#if costDifference !== 0 && actualCostDollars !== ''}
        <span class="field-hint" class:over={costDifference > 0} class:under={costDifference < 0}>
          {costDifference > 0 ? '+' : ''}{formatCurrency(costDifference)} vs. estimate
        </span>
      {/if}
    </div>

    <!-- Update Bill Checkbox -->
    <label class="checkbox-field">
      <input type="checkbox" bind:checked={updateBillAmount} />
      <span>Update budget with actual cost</span>
    </label>
    <p class="checkbox-hint">
      The linked bill in your budget will be updated to match the actual cost.
    </p>

    <!-- Out of Pocket Preview -->
    {#if claim.expected_reimbursement && claim.expected_reimbursement > 0}
      <div class="preview-section">
        <div class="preview-row">
          <span class="preview-label">Estimated Reimbursement</span>
          <span class="preview-value income">{formatCurrency(claim.expected_reimbursement)}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">Estimated Out-of-Pocket</span>
          <span class="preview-value" class:expense={estimatedOutOfPocket > 0}>
            {formatCurrency(Math.max(0, estimatedOutOfPocket))}
          </span>
        </div>
      </div>
    {/if}
  </form>

  <svelte:fragment slot="footer">
    <button type="button" class="btn-secondary" on:click={onClose} disabled={submitting}>
      Cancel
    </button>
    <button
      type="submit"
      class="btn-primary"
      disabled={!isValid || submitting}
      on:click={handleSubmit}
    >
      {#if submitting}
        Converting...
      {:else}
        Convert to Claim
      {/if}
    </button>
  </svelte:fragment>
</Modal>

<style>
  .info-section {
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
  }

  .info-row:not(:last-child) {
    border-bottom: 1px solid var(--border-subtle);
  }

  .info-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .info-value {
    color: var(--text-primary);
    font-weight: 500;
  }

  .form-field {
    margin-bottom: var(--space-4);
  }

  .form-field label {
    display: block;
    margin-bottom: var(--space-2);
    font-weight: 500;
    color: var(--text-primary);
  }

  .input-with-prefix {
    display: flex;
    align-items: center;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .input-with-prefix:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .prefix {
    padding: 0 var(--space-3);
    color: var(--text-secondary);
    font-weight: 500;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
    height: 100%;
    display: flex;
    align-items: center;
  }

  .input-with-prefix input {
    flex: 1;
    padding: var(--space-3);
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 1rem;
  }

  .input-with-prefix input:focus {
    outline: none;
  }

  .field-hint {
    display: block;
    margin-top: var(--space-2);
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .field-hint.over {
    color: var(--warning);
  }

  .field-hint.under {
    color: var(--success);
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    color: var(--text-primary);
  }

  .checkbox-field input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
  }

  .checkbox-hint {
    margin: var(--space-1) 0 var(--space-4) var(--space-6);
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .preview-section {
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    margin-top: var(--space-4);
  }

  .preview-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
  }

  .preview-row:not(:last-child) {
    border-bottom: 1px solid var(--border-subtle);
  }

  .preview-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .preview-value {
    font-weight: 600;
    font-size: 1rem;
  }

  .preview-value.income {
    color: var(--success);
  }

  .preview-value.expense {
    color: var(--error);
  }

  .btn-secondary {
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-hover);
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    padding: var(--space-2) var(--space-4);
    border: none;
    border-radius: var(--radius-md);
    background: var(--accent);
    color: var(--text-inverse);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
