<script lang="ts">
  /**
   * ClaimDetail - Detailed view of a single claim with submissions and documents
   */
  import type { InsuranceClaim, ClaimStatus } from '../../types/insurance';
  import {
    deleteClaim,
    createSubmission,
    loadInsuranceClaims,
    loadClaimsSummary,
    type SubmissionData,
  } from '../../stores/insurance-claims';
  import { activePlans } from '../../stores/insurance-plans';
  import { success, error as showError } from '../../stores/toast';
  import { createEventDispatcher } from 'svelte';
  import SubmissionCard from './SubmissionCard.svelte';
  import DocumentUpload from './DocumentUpload.svelte';
  import ConfirmDialog from '../shared/ConfirmDialog.svelte';

  export let claim: InsuranceClaim;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};
  export let highlightSubmissionId: string | null = null;

  const dispatch = createEventDispatcher<{ deleted: void; updated: void; convert: void }>();

  let showNewSubmissionForm = false;
  let newSubmissionPlanId = '';
  let newSubmissionAmount = '';
  let submitting = false;
  let showDeleteConfirm = false;
  let deleting = false;

  function getStatusColor(status: ClaimStatus): string {
    switch (status) {
      case 'expected':
        return 'var(--accent)';
      case 'draft':
      case 'in_progress':
        return 'var(--warning)';
      case 'closed':
        return 'var(--success)';
      default:
        return 'var(--text-primary)';
    }
  }

  function getStatusLabel(status: ClaimStatus): string {
    switch (status) {
      case 'expected':
        return 'Expected';
      case 'draft':
      case 'in_progress':
        return 'In Progress';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  }

  function formatCurrency(cents: number): string {
    return (
      '$' +
      (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  function formatDate(dateString: string): string {
    // Append T00:00:00 to prevent UTC interpretation that shifts dates
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function dollarsToCents(dollars: string): number {
    const parsed = parseFloat(dollars.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  function handleDelete() {
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    deleting = true;
    try {
      await deleteClaim(claim.id);
      success(`Claim #${claim.claim_number} deleted`);
      dispatch('deleted');
      onClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to delete claim');
    } finally {
      deleting = false;
      showDeleteConfirm = false;
    }
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  // Calculate remaining uncovered amount for new submissions
  $: remainingUncovered = Math.max(0, claim.total_amount - totalReimbursed);

  function startNewSubmission() {
    newSubmissionPlanId = '';
    // Suggest the remaining uncovered amount
    newSubmissionAmount = (remainingUncovered / 100).toFixed(2);
    showNewSubmissionForm = true;
  }

  function cancelNewSubmission() {
    showNewSubmissionForm = false;
  }

  async function saveNewSubmission() {
    if (!newSubmissionPlanId) {
      showError('Please select an insurance plan');
      return;
    }

    const amountCents = dollarsToCents(newSubmissionAmount);
    if (amountCents <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    submitting = true;
    try {
      const data: SubmissionData = {
        plan_id: newSubmissionPlanId,
        amount_claimed: amountCents,
      };

      await createSubmission(claim.id, data);
      success('Submission created');
      showNewSubmissionForm = false;
      dispatch('updated');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to create submission');
    } finally {
      submitting = false;
    }
  }

  async function handleSubmissionUpdate() {
    await loadInsuranceClaims();
    await loadClaimsSummary();
    dispatch('updated');
  }

  // Calculate totals
  $: _totalClaimed = claim.submissions.reduce((sum, s) => sum + s.amount_claimed, 0);
  $: totalReimbursed = claim.submissions.reduce((sum, s) => sum + (s.amount_reimbursed || 0), 0);
  $: hasActivePlans = $activePlans.length > 0;
</script>

<div class="claim-detail">
  <!-- Header -->
  <div class="detail-header">
    <div class="header-left">
      <h3>Claim #{claim.claim_number}</h3>
      <span class="claim-status" style="color: {getStatusColor(claim.status)}">
        {getStatusLabel(claim.status)}
      </span>
    </div>
    <div class="header-actions">
      {#if claim.status === 'expected'}
        <button class="btn btn-primary btn-sm" on:click={() => dispatch('convert')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Convert to Claim
        </button>
      {/if}
      <button class="btn btn-secondary btn-sm" on:click={onEdit}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        Edit
      </button>
      <button class="btn btn-danger btn-sm" on:click={handleDelete} disabled={deleting}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" />
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        Delete
      </button>
    </div>
  </div>

  <!-- Claim Info -->
  <div class="claim-info">
    <div class="info-row">
      <span class="info-label">Family Member:</span>
      <span class="info-value">{claim.family_member_name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Category:</span>
      <span class="info-value">{claim.category_name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Service Date:</span>
      <span class="info-value">{formatDate(claim.service_date)}</span>
    </div>
    {#if claim.provider_name}
      <div class="info-row">
        <span class="info-label">Provider:</span>
        <span class="info-value">{claim.provider_name}</span>
      </div>
    {/if}
    {#if claim.description}
      <div class="info-row description">
        <span class="info-label">Description:</span>
        <span class="info-value">{claim.description}</span>
      </div>
    {/if}
    <div class="info-row">
      <span class="info-label">Total Amount:</span>
      <span class="info-value amount">{formatCurrency(claim.total_amount)}</span>
    </div>
  </div>

  <!-- Financial Summary -->
  <div class="financial-summary">
    <div class="summary-item">
      <span class="summary-label">Total Amount</span>
      <span class="summary-value">{formatCurrency(claim.total_amount)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Total Reimbursed</span>
      <span class="summary-value success">{formatCurrency(totalReimbursed)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Out of Pocket</span>
      <span class="summary-value warning"
        >{formatCurrency(claim.total_amount - totalReimbursed)}</span
      >
    </div>
  </div>

  <!-- Submissions Section -->
  <div class="submissions-section">
    <div class="section-header">
      <h4>Submissions ({claim.submissions.length})</h4>
      {#if hasActivePlans && !showNewSubmissionForm}
        <button class="btn btn-primary btn-sm" on:click={startNewSubmission}>
          + Add Submission
        </button>
      {/if}
    </div>

    {#if showNewSubmissionForm}
      <div class="new-submission-form">
        <div class="form-row">
          <div class="form-group">
            <label for="new-submission-plan">Insurance Plan</label>
            <select id="new-submission-plan" bind:value={newSubmissionPlanId} disabled={submitting}>
              <option value="">-- Select Plan --</option>
              {#each $activePlans as plan (plan.id)}
                <option value={plan.id}>{plan.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="new-submission-amount">Amount to Claim</label>
            <div class="amount-input-wrapper">
              <span class="currency-prefix">$</span>
              <input
                id="new-submission-amount"
                type="text"
                bind:value={newSubmissionAmount}
                disabled={submitting}
              />
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="btn btn-secondary btn-sm"
            on:click={cancelNewSubmission}
            disabled={submitting}
          >
            Cancel
          </button>
          <button class="btn btn-primary btn-sm" on:click={saveNewSubmission} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Submission'}
          </button>
        </div>
      </div>
    {/if}

    {#if claim.submissions.length === 0}
      <p class="empty-message">
        No submissions yet.
        {#if hasActivePlans}
          Click "Add Submission" to submit this claim to an insurance plan.
        {:else}
          <a href="/setup">Set up insurance plans</a> to start tracking submissions.
        {/if}
      </p>
    {:else}
      <div class="submissions-list">
        {#each claim.submissions as submission (submission.id)}
          <SubmissionCard
            {submission}
            claimId={claim.id}
            highlight={submission.id === highlightSubmissionId}
            on:updated={handleSubmissionUpdate}
            on:deleted={handleSubmissionUpdate}
          />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Documents Section -->
  <DocumentUpload
    claimId={claim.id}
    documents={claim.documents}
    on:uploaded={handleSubmissionUpdate}
    on:deleted={handleSubmissionUpdate}
  />
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Claim"
  message="Delete claim #{claim.claim_number}? This action cannot be undone."
  confirmText={deleting ? 'Deleting...' : 'Delete'}
  on:confirm={confirmDelete}
  on:cancel={cancelDelete}
/>

<style>
  .claim-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border-default);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .header-left h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .claim-status {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: var(--space-1) var(--space-2);
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .claim-info {
    background: var(--bg-base);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .info-row {
    display: flex;
    gap: var(--space-3);
  }

  .info-row.description {
    flex-direction: column;
    gap: var(--space-1);
  }

  .info-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
    min-width: 100px;
  }

  .info-value {
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .info-value.amount {
    font-weight: 600;
  }

  .financial-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .summary-item {
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
    text-align: center;
  }

  .summary-label {
    display: block;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: var(--space-1);
  }

  .summary-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .summary-value.success {
    color: var(--success);
  }

  .summary-value.warning {
    color: var(--warning);
  }

  .submissions-section {
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-default);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .section-header h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .submissions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .empty-message {
    color: var(--text-tertiary);
    font-size: 0.8125rem;
    margin: 0;
  }

  .empty-message a {
    color: var(--accent);
  }

  /* New submission form */
  .new-submission-form {
    background: var(--bg-base);
    border: 1px solid var(--accent-border, var(--accent));
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-3);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-group label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .form-group select,
  .form-group input {
    padding: var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .form-group select:focus,
  .form-group input:focus {
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
    left: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.875rem;
    pointer-events: none;
  }

  .amount-input-wrapper input {
    padding-left: var(--space-5);
    width: 100%;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-sm {
    padding: var(--space-1) var(--space-2);
    font-size: 0.75rem;
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

  .btn-danger {
    background: var(--error);
    color: var(--text-inverse);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--error-hover);
  }
</style>
