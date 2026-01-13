<script lang="ts">
  /**
   * SubmissionCard - Displays a single claim submission with status and actions
   */
  import type { ClaimSubmission, SubmissionStatus } from '../../types/insurance';
  import { updateSubmission, deleteSubmission } from '../../stores/insurance-claims';
  import { success, error as showError } from '../../stores/toast';
  import { createEventDispatcher } from 'svelte';

  export let submission: ClaimSubmission;
  export let claimId: string;
  export let readonly = false;

  const dispatch = createEventDispatcher<{ updated: void; deleted: void }>();

  let editing = false;
  let saving = false;

  // Edit form state
  let editStatus: SubmissionStatus = submission.status;
  let editAmountReimbursed = submission.amount_reimbursed
    ? (submission.amount_reimbursed / 100).toFixed(2)
    : '';
  let editDateSubmitted = submission.date_submitted || '';
  let editDateResolved = submission.date_resolved || '';
  let editNotes = submission.notes || '';

  function getStatusColor(status: SubmissionStatus): string {
    switch (status) {
      case 'draft':
        return 'var(--text-secondary)';
      case 'pending':
        return 'var(--warning)';
      case 'approved':
        return 'var(--success)';
      case 'denied':
        return 'var(--error)';
      default:
        return 'var(--text-primary)';
    }
  }

  function getStatusLabel(status: SubmissionStatus): string {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'denied':
        return 'Denied';
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
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function dollarsToCents(dollars: string): number {
    const parsed = parseFloat(dollars.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  function setSubmittedToday() {
    editDateSubmitted = getTodayDate();
  }

  function setResolvedToday() {
    editDateResolved = getTodayDate();
  }

  // When status changes to denied, clear reimbursed amount
  $: if (editStatus === 'denied') {
    editAmountReimbursed = '';
  }

  // Check if reimbursed field should be disabled
  $: reimbursedDisabled = saving || editStatus === 'denied';

  function startEdit() {
    editStatus = submission.status;
    editAmountReimbursed = submission.amount_reimbursed
      ? (submission.amount_reimbursed / 100).toFixed(2)
      : '';
    editDateSubmitted = submission.date_submitted || '';
    editDateResolved = submission.date_resolved || '';
    editNotes = submission.notes || '';
    editing = true;
  }

  function cancelEdit() {
    editing = false;
  }

  async function saveEdit() {
    saving = true;
    try {
      const updates: {
        status?: SubmissionStatus;
        amount_reimbursed?: number;
        date_submitted?: string;
        date_resolved?: string;
        notes?: string;
      } = {
        status: editStatus,
      };

      if (editAmountReimbursed) {
        updates.amount_reimbursed = dollarsToCents(editAmountReimbursed);
      }
      if (editDateSubmitted) {
        updates.date_submitted = editDateSubmitted;
      }
      if (editDateResolved) {
        updates.date_resolved = editDateResolved;
      }
      if (editNotes.trim()) {
        updates.notes = editNotes.trim();
      }

      await updateSubmission(claimId, submission.id, updates);
      success('Submission updated');
      editing = false;
      dispatch('updated');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to update submission');
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this submission?')) return;

    saving = true;
    try {
      await deleteSubmission(claimId, submission.id);
      success('Submission deleted');
      dispatch('deleted');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to delete submission');
    } finally {
      saving = false;
    }
  }
</script>

<div class="submission-card">
  <div class="submission-header">
    <div class="plan-info">
      <span class="plan-name">{submission.plan_snapshot.name}</span>
      {#if submission.plan_snapshot.provider_name}
        <span class="plan-provider">{submission.plan_snapshot.provider_name}</span>
      {/if}
    </div>
    <span class="submission-status" style="color: {getStatusColor(submission.status)}">
      {getStatusLabel(submission.status)}
    </span>
  </div>

  {#if editing}
    <div class="edit-form">
      <div class="form-row">
        <div class="form-group">
          <label for="edit-status-{submission.id}">Status</label>
          <select id="edit-status-{submission.id}" bind:value={editStatus} disabled={saving}>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-reimbursed-{submission.id}">Reimbursed</label>
          <div class="amount-input-wrapper">
            <span class="currency-prefix">$</span>
            <input
              id="edit-reimbursed-{submission.id}"
              type="text"
              bind:value={editAmountReimbursed}
              placeholder={editStatus === 'denied' ? '0.00' : '0.00'}
              disabled={reimbursedDisabled}
            />
          </div>
          {#if editStatus === 'denied'}
            <span class="field-hint">Denied claims have $0 reimbursement</span>
          {/if}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="edit-submitted-{submission.id}">Date Submitted</label>
          <div class="date-input-wrapper">
            <input
              id="edit-submitted-{submission.id}"
              type="date"
              bind:value={editDateSubmitted}
              disabled={saving}
            />
            <button
              type="button"
              class="btn-today"
              on:click={setSubmittedToday}
              disabled={saving}
              title="Set to today"
            >
              Today
            </button>
          </div>
        </div>
        <div class="form-group">
          <label for="edit-resolved-{submission.id}">Date Resolved</label>
          <div class="date-input-wrapper">
            <input
              id="edit-resolved-{submission.id}"
              type="date"
              bind:value={editDateResolved}
              disabled={saving}
            />
            <button
              type="button"
              class="btn-today"
              on:click={setResolvedToday}
              disabled={saving}
              title="Set to today"
            >
              Today
            </button>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="edit-notes-{submission.id}">Notes</label>
        <textarea id="edit-notes-{submission.id}" bind:value={editNotes} rows="2" disabled={saving}
        ></textarea>
      </div>
      <div class="edit-actions">
        <button class="btn btn-secondary btn-sm" on:click={cancelEdit} disabled={saving}>
          Cancel
        </button>
        <button class="btn btn-primary btn-sm" on:click={saveEdit} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  {:else}
    <div class="submission-body">
      <div class="submission-details">
        <div class="detail-row">
          <span class="detail-label">Claimed:</span>
          <span class="detail-value">{formatCurrency(submission.amount_claimed)}</span>
        </div>
        {#if submission.amount_reimbursed !== undefined}
          <div class="detail-row">
            <span class="detail-label">Reimbursed:</span>
            <span class="detail-value success">{formatCurrency(submission.amount_reimbursed)}</span>
          </div>
        {/if}
        {#if submission.date_submitted}
          <div class="detail-row">
            <span class="detail-label">Submitted:</span>
            <span class="detail-value">{formatDate(submission.date_submitted)}</span>
          </div>
        {/if}
        {#if submission.date_resolved}
          <div class="detail-row">
            <span class="detail-label">Resolved:</span>
            <span class="detail-value">{formatDate(submission.date_resolved)}</span>
          </div>
        {/if}
        {#if submission.notes}
          <div class="detail-row notes">
            <span class="detail-value">{submission.notes}</span>
          </div>
        {/if}
      </div>

      {#if !readonly}
        <div class="submission-actions">
          <button class="btn-icon" on:click={startEdit} title="Edit submission">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button class="btn-icon danger" on:click={handleDelete} title="Delete submission">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .submission-card {
    background: var(--bg-base);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
  }

  .submission-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-2);
  }

  .plan-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .plan-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .plan-provider {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .submission-status {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: var(--space-1) var(--space-2);
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
  }

  .submission-body {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .submission-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
  }

  .detail-row {
    display: flex;
    gap: var(--space-2);
    font-size: 0.8125rem;
  }

  .detail-row.notes {
    margin-top: var(--space-1);
    padding-top: var(--space-1);
    border-top: 1px solid var(--border-subtle);
  }

  .detail-label {
    color: var(--text-secondary);
    min-width: 80px;
  }

  .detail-value {
    color: var(--text-primary);
  }

  .detail-value.success {
    color: var(--success);
  }

  .submission-actions {
    display: flex;
    gap: var(--space-1);
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .btn-icon.danger:hover {
    background: var(--error-muted);
    color: var(--error);
  }

  /* Edit form styles */
  .edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
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

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.8125rem;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
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
    font-size: 0.8125rem;
    pointer-events: none;
  }

  .amount-input-wrapper input {
    padding-left: var(--space-5);
    width: 100%;
  }

  .field-hint {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  .date-input-wrapper {
    display: flex;
    gap: var(--space-1);
    align-items: center;
  }

  .date-input-wrapper input {
    flex: 1;
  }

  .btn-today {
    padding: var(--space-1) var(--space-2);
    font-size: 0.6875rem;
    font-weight: 500;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-today:hover:not(:disabled) {
    background: var(--accent-muted);
    color: var(--accent);
    border-color: var(--accent);
  }

  .btn-today:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .btn {
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
</style>
