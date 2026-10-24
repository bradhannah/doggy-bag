<script lang="ts">
  /**
   * ClaimDetail - One claim: what to do next, where the money stands, and each
   * insurance plan in the order it is claimed.
   */
  import type { InsuranceClaim } from '../../types/insurance';
  import {
    deleteClaim,
    createSubmission,
    updateSubmission,
    loadInsuranceClaims,
    loadClaimsSummary,
    markBillPaid,
    type SubmissionData,
  } from '../../stores/insurance-claims';
  import { activePlans } from '../../stores/insurance-plans';
  import { success, error as showError } from '../../stores/toast';
  import { isTauri } from '../../stores/settings';
  import { createEventDispatcher } from 'svelte';
  import SubmissionCard from './SubmissionCard.svelte';
  import DocumentUpload from './DocumentUpload.svelte';
  import ConfirmDialog from '../shared/ConfirmDialog.svelte';
  import AmountInput from '../shared/AmountInput.svelte';
  import {
    formatCurrency,
    formatDate,
    dollarsToCents,
    getTodayDateString,
  } from '$lib/utils/format';
  import {
    getClaimHeadline,
    getClaimMoney,
    getNextStep,
    planName,
    remainingToClaim,
  } from '$lib/insurance/claim-progress';

  export let claim: InsuranceClaim;
  export let onEdit: () => void = () => {};
  export let onClose: () => void = () => {};
  export let highlightSubmissionId: string | null = null;

  const dispatch = createEventDispatcher<{ deleted: void; updated: void; convert: void }>();

  let showNewSubmissionForm = false;
  let newSubmissionPlanId = '';
  let newSubmissionAmount = '';
  let busy = false;
  let showDeleteConfirm = false;

  $: headline = getClaimHeadline(claim);
  $: money = getClaimMoney(claim);
  $: next = getNextStep(claim);
  $: nextPortalUrl = next?.kind === 'submit' ? next.submission.plan_snapshot.portal_url : undefined;
  $: hasActivePlans = $activePlans.length > 0;
  // The Budget counts the bill as paid once anything has been submitted (you can't claim
  // a bill you haven't paid), so the tile shows the same
  $: billPaidBySubmitting =
    !claim.bill_paid && (claim.status === 'in_progress' || claim.status === 'closed');
  $: subtitle = [
    claim.provider_name,
    claim.family_member_name,
    `${claim.is_expected ? 'Appointment' : 'Service'} ${formatDate(claim.service_date)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  async function refresh() {
    await loadInsuranceClaims();
    await loadClaimsSummary();
    dispatch('updated');
  }

  async function run(action: () => Promise<unknown>, message: string, failure: string) {
    busy = true;
    try {
      await action();
      success(message);
      await refresh();
    } catch (e) {
      showError(e instanceof Error ? e.message : failure);
    } finally {
      busy = false;
    }
  }

  function markNextSubmitted() {
    if (next?.kind !== 'submit') return;
    const { submission } = next;
    run(
      () =>
        updateSubmission(claim.id, submission.id, {
          status: 'pending',
          date_submitted: getTodayDateString(),
        }),
      `Submitted to ${planName(submission)}`,
      'Failed to mark submitted'
    );
  }

  function markNextReceived() {
    if (next?.kind !== 'receive') return;
    const { submission } = next;
    run(
      () =>
        updateSubmission(claim.id, submission.id, {
          status: 'paid',
          date_paid: getTodayDateString(),
        }),
      `${planName(submission)} payment received`,
      'Failed to mark received'
    );
  }

  const toggleBillPaid = () =>
    run(
      () => markBillPaid(claim.id, !claim.bill_paid),
      claim.bill_paid ? 'Clinic bill marked unpaid' : 'Clinic bill marked paid',
      'Failed to update the bill'
    );

  async function openPortal(url: string | undefined) {
    if (!url) return;
    try {
      if (isTauri()) {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      showError('Failed to open portal');
      console.error('Failed to open portal URL:', e);
    }
  }

  function startNewSubmission() {
    newSubmissionPlanId = '';
    const remaining = remainingToClaim(claim, claim.submissions.length);
    newSubmissionAmount = (remaining / 100).toFixed(2);
    showNewSubmissionForm = true;
  }

  async function saveNewSubmission() {
    if (!newSubmissionPlanId) {
      showError('Choose an insurance plan');
      return;
    }
    const amountCents = dollarsToCents(newSubmissionAmount);
    if (amountCents <= 0) {
      showError('Enter the amount to claim');
      return;
    }
    const data: SubmissionData = { plan_id: newSubmissionPlanId, amount_claimed: amountCents };
    await run(() => createSubmission(claim.id, data), 'Plan added', 'Failed to add the plan');
    showNewSubmissionForm = false;
  }

  async function confirmDelete() {
    busy = true;
    try {
      await deleteClaim(claim.id);
      success(`Claim #${claim.claim_number} deleted`);
      dispatch('deleted');
      onClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to delete claim');
    } finally {
      busy = false;
      showDeleteConfirm = false;
    }
  }
</script>

<div class="claim-detail">
  <header class="detail-header">
    <div class="header-row">
      <div class="header-title">
        <h3>
          {claim.is_expected ? '' : `#${claim.claim_number} `}{claim.category_name}
        </h3>
        <span
          class="badge"
          class:badge-accent={headline.tone === 'accent'}
          class:badge-warning={headline.tone === 'warning'}
          class:badge-success={headline.tone === 'success'}
          class:badge-error={headline.tone === 'error'}
        >
          {headline.label}
        </span>
      </div>
      <div class="header-actions">
        <button class="btn btn-sm btn-secondary" on:click={onEdit}>Edit</button>
        <button
          class="icon-btn danger"
          on:click={() => (showDeleteConfirm = true)}
          disabled={busy}
          aria-label="Delete claim"
          title="Delete claim"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button class="icon-btn" on:click={onClose} aria-label="Close claim" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
    <p class="header-subtitle">{subtitle}</p>
    {#if claim.description}
      <p class="header-description">{claim.description}</p>
    {/if}
  </header>

  {#if next && next.kind !== 'decide'}
    <section
      class="next-step"
      class:attention={next.kind === 'enter_amount'}
      aria-label="Next step"
    >
      <div class="next-text">
        <span class="next-label"
          >{next.kind === 'enter_amount' ? 'Needs attention' : 'Next step'}</span
        >
        {#if next.kind === 'enter_amount'}
          <span class="next-title">Enter the amount {planName(next.submission)} approved</span>
          <span class="next-hint">
            It was saved without one, so the Budget can't count it. Their statement or explanation
            of benefits has the amount.
          </span>
        {:else if next.kind === 'submit'}
          <span class="next-title">
            Submit {next.index > 0 ? 'the remaining ' : ''}{formatCurrency(next.amount)} to {planName(
              next.submission
            )}
          </span>
          <span class="next-hint">
            {next.index > 0
              ? `Include ${planName(claim.submissions[next.index - 1])}'s explanation of benefits (EOB).`
              : 'Include the receipt from the clinic.'}
          </span>
        {:else if next.kind === 'receive'}
          <span class="next-title">
            Waiting for {formatCurrency(next.amount)} from {planName(next.submission)}
          </span>
          <span class="next-hint">Mark it received when the money arrives.</span>
        {:else if next.kind === 'convert'}
          <span class="next-title">After the appointment, record what it cost</span>
          <span class="next-hint">This turns the scheduled visit into a claim you can submit.</span>
        {:else if next.kind === 'add_plan'}
          <span class="next-title">Add the insurance plans to claim from</span>
          <span class="next-hint">
            {hasActivePlans
              ? 'Plans are claimed in order: primary first, then secondary.'
              : 'Set up your insurance plans on the Manage page first.'}
          </span>
        {/if}
      </div>
      <div class="next-actions">
        {#if next.kind === 'submit'}
          <button class="btn btn-primary" on:click={markNextSubmitted} disabled={busy}>
            Mark submitted
          </button>
          {#if nextPortalUrl}
            <button class="btn btn-sm btn-link" on:click={() => openPortal(nextPortalUrl)}>
              Open {planName(next.submission)} portal ↗
            </button>
          {/if}
        {:else if next.kind === 'receive'}
          <button class="btn btn-primary" on:click={markNextReceived} disabled={busy}>
            Mark received
          </button>
        {:else if next.kind === 'convert'}
          <button class="btn btn-primary" on:click={() => dispatch('convert')}>
            Convert to claim
          </button>
        {:else if next.kind === 'add_plan' && hasActivePlans}
          <button class="btn btn-primary" on:click={startNewSubmission}>Add plan</button>
        {:else if next.kind === 'add_plan'}
          <a class="btn btn-secondary" href="/setup?tab=insurance-plans">Set up plans</a>
        {/if}
      </div>
    </section>
  {/if}

  <section class="money" aria-label="Money">
    {#if claim.is_expected}
      <div class="money-cell">
        <span class="money-label">Estimated cost</span>
        <span class="money-value">{formatCurrency(money.cost)}</span>
      </div>
      <div class="money-cell">
        <span class="money-label">Estimated back</span>
        <span class="money-value">{formatCurrency(money.estimate ?? 0)}</span>
      </div>
      <div class="money-cell">
        <span class="money-label">Your share</span>
        <span class="money-value">
          {formatCurrency(Math.max(0, money.cost - (money.estimate ?? 0)))}
        </span>
      </div>
    {:else}
      <div class="money-cell">
        <span class="money-label">Cost</span>
        <span class="money-value">{formatCurrency(money.cost)}</span>
        {#if billPaidBySubmitting}
          <span class="money-note paid" title="Counted as paid once the claim was submitted">
            Clinic bill paid ✓
          </span>
        {:else}
          <button
            class="money-note bill-toggle"
            class:paid={claim.bill_paid}
            on:click={toggleBillPaid}
            disabled={busy}
            title={claim.bill_paid ? 'Mark the clinic bill unpaid' : 'Mark the clinic bill paid'}
          >
            {claim.bill_paid ? 'Clinic bill paid ✓' : 'Mark clinic bill paid'}
          </button>
        {/if}
      </div>
      <div class="money-cell">
        <span class="money-label">Approved</span>
        <span class="money-value">{formatCurrency(money.approved)}</span>
        {#if money.estimate}
          <span class="money-note">of {formatCurrency(money.estimate)} estimated</span>
        {/if}
      </div>
      <div class="money-cell">
        <span class="money-label">Received</span>
        <span class="money-value" class:success={money.received > 0}>
          {formatCurrency(money.received)}
        </span>
        {#if money.received === 0}<span class="money-note">nothing yet</span>{/if}
      </div>
      <div class="money-cell">
        <span class="money-label">Owed to you</span>
        <span class="money-value" class:warning={money.owed > 0}>{formatCurrency(money.owed)}</span>
        {#if money.stillToClaim > 0}
          <span class="money-note">+ up to {formatCurrency(money.stillToClaim)} more</span>
        {/if}
      </div>
    {/if}
  </section>

  {#if !claim.is_expected}
    <section class="plans" aria-label="Insurance plans">
      <div class="section-header">
        <h4>Insurance plans</h4>
        {#if claim.submissions.length > 1}
          <span class="section-hint">In the order you claim them</span>
        {/if}
      </div>

      {#each claim.submissions as submission, index (submission.id)}
        <SubmissionCard
          {claim}
          {index}
          highlight={submission.id === highlightSubmissionId}
          on:updated={refresh}
          on:deleted={refresh}
        />
      {/each}

      {#if showNewSubmissionForm}
        <div class="new-plan">
          <div class="field-grid">
            <label class="field">
              <span>Insurance plan</span>
              <select bind:value={newSubmissionPlanId} disabled={busy}>
                <option value="">Choose a plan</option>
                {#each $activePlans as plan (plan.id)}
                  <option value={plan.id}>{plan.name}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span>Amount to claim</span>
              <AmountInput bind:value={newSubmissionAmount} disabled={busy} />
            </label>
          </div>
          <div class="form-actions">
            <button
              class="btn btn-sm btn-ghost"
              on:click={() => (showNewSubmissionForm = false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button class="btn btn-sm btn-primary" on:click={saveNewSubmission} disabled={busy}>
              Add plan
            </button>
          </div>
        </div>
      {:else if hasActivePlans && claim.submissions.length > 0}
        <button class="btn btn-sm btn-ghost add-plan" on:click={startNewSubmission}>
          + Add another plan
        </button>
      {/if}
    </section>
  {/if}

  <DocumentUpload
    claimId={claim.id}
    documents={claim.documents}
    on:uploaded={refresh}
    on:deleted={refresh}
  />
</div>

<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Claim"
  message="Delete claim #{claim.claim_number}? This action cannot be undone."
  confirmText={busy ? 'Deleting...' : 'Delete'}
  on:confirm={confirmDelete}
  on:cancel={() => (showDeleteConfirm = false)}
/>

<style>
  .claim-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .detail-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border-default);
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .header-title h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .icon-btn.danger:hover:not(:disabled) {
    background: var(--error-bg);
    color: var(--error);
  }

  .header-subtitle,
  .header-description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .next-step {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-md);
    background: var(--accent-muted);
  }

  .next-step.attention {
    border-color: var(--error-border);
    background: var(--error-bg);
  }

  .next-step.attention .next-label {
    color: var(--error);
  }

  .next-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .next-label {
    font-size: var(--font-size-2xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .next-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--text-primary);
  }

  .next-hint {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .next-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-1);
  }

  .money {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 1px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--border-default);
    overflow: hidden;
  }

  .money-cell {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-3);
    background: var(--bg-surface);
  }

  .money-label {
    font-size: var(--font-size-2xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .money-value {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .money-value.success {
    color: var(--success);
  }

  .money-value.warning {
    color: var(--warning);
  }

  .money-note {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .bill-toggle {
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    color: var(--accent);
    font: inherit;
    font-size: var(--font-size-xs);
    cursor: pointer;
  }

  .money-note.paid,
  .bill-toggle.paid {
    color: var(--success);
  }

  .bill-toggle:hover:not(:disabled) {
    text-decoration: underline;
  }

  .plans {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .section-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .section-header h4 {
    margin: 0;
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-hint {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .add-plan {
    align-self: flex-start;
  }

  .new-plan {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-md);
    background: var(--bg-base);
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-3);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--text-secondary);
  }

  .field select {
    padding: 0 var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-base);
    color: var(--text-primary);
    font: inherit;
    font-size: var(--font-size-md);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
