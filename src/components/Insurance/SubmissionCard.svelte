<script lang="ts">
  /**
   * SubmissionCard - One insurance plan's part of a claim: where it stands and the one
   * thing to do next (submit, record the decision, mark the money received).
   */
  import type { InsuranceClaim } from '../../types/insurance';
  import {
    updateSubmission,
    deleteSubmission,
    type SubmissionUpdate,
  } from '../../stores/insurance-claims';
  import { success, error as showError } from '../../stores/toast';
  import { isTauri } from '../../stores/settings';
  import { createEventDispatcher } from 'svelte';
  import ConfirmDialog from '../shared/ConfirmDialog.svelte';
  import AmountInput from '../shared/AmountInput.svelte';
  import { formatCurrency, dollarsToCents, getTodayDateString } from '$lib/utils/format';
  import {
    STAGE_LABELS,
    STAGE_TONES,
    blockingPlanName,
    getPlanStage,
    planName,
    planRole,
    shortDate,
  } from '$lib/insurance/claim-progress';

  export let claim: InsuranceClaim;
  export let index: number;
  export let readonly = false;
  export let highlight = false;

  const dispatch = createEventDispatcher<{ updated: void; deleted: void }>();

  $: submission = claim.submissions[index];
  $: stage = getPlanStage(claim, index);
  $: name = planName(submission);
  $: previousName = index > 0 ? planName(claim.submissions[index - 1]) : '';
  $: waitingOn = blockingPlanName(claim, index);
  $: approvedAmount = submission.amount_reimbursed;
  $: portalUrl = submission.plan_snapshot.portal_url;

  // Scroll into view when highlighted (navigating from the Budget)
  let cardElement: HTMLDivElement | undefined;
  $: if (highlight && cardElement) {
    const element = cardElement;
    setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  let saving = false;
  let editing = false;
  let showDeleteConfirm = false;

  // Inline action fields, reset whenever the plan moves to a new stage
  let decisionAmount = '';
  let decisionDate = getTodayDateString();
  let receivedDate = getTodayDateString();
  let lastStage = '';
  $: if (stage !== lastStage) {
    lastStage = stage;
    decisionAmount = centsToInput(suggestedApproval());
    decisionDate = getTodayDateString();
    receivedDate = getTodayDateString();
  }
  $: decisionCents = decisionAmount.trim() === '' ? null : dollarsToCents(decisionAmount);

  function centsToInput(cents: number | undefined): string {
    return cents === undefined ? '' : (cents / 100).toFixed(2);
  }

  /** The primary's estimate if there is one; otherwise what this plan claimed. */
  function suggestedApproval(): number | undefined {
    if (submission.amount_reimbursed !== undefined) return submission.amount_reimbursed;
    if (index === 0 && claim.expected_reimbursement) return claim.expected_reimbursement;
    return submission.amount_claimed || undefined;
  }

  async function save(updates: SubmissionUpdate, message: string) {
    saving = true;
    try {
      await updateSubmission(claim.id, submission.id, updates);
      success(message);
      editing = false;
      dispatch('updated');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to update this plan');
    } finally {
      saving = false;
    }
  }

  const markSubmitted = () =>
    save({ status: 'pending', date_submitted: getTodayDateString() }, `Submitted to ${name}`);

  function approve() {
    if (decisionCents === null) return;
    save(
      { status: 'approved', amount_reimbursed: decisionCents, date_resolved: decisionDate },
      `${name} approved ${formatCurrency(decisionCents)}`
    );
  }

  const deny = () =>
    save({ status: 'denied', date_resolved: decisionDate }, `${name} marked denied`);

  function markReceived() {
    const updates: SubmissionUpdate = { status: 'paid', date_paid: receivedDate };
    // Old approvals saved without an amount need one before the money can be recorded
    if (approvedAmount === undefined) {
      if (decisionCents === null) return;
      updates.amount_reimbursed = decisionCents;
    }
    save(updates, `${name} payment received`);
  }

  function undo() {
    if (stage === 'received') {
      save({ status: 'approved', date_paid: null }, 'Marked as not received yet');
    } else if (stage === 'denied') {
      save(
        { status: 'pending', amount_reimbursed: null, date_resolved: null },
        'Denial undone; waiting on the insurer again'
      );
    }
  }

  // "Edit details": correct dates, the approved amount and notes. Status changes use
  // the actions above; a cleared field is removed.
  let editAmount = '';
  let editSubmitted = '';
  let editResolved = '';
  let editPaid = '';
  let editNotes = '';

  function startEdit() {
    editAmount = centsToInput(submission.amount_reimbursed);
    editSubmitted = submission.date_submitted ?? '';
    editResolved = submission.date_resolved ?? '';
    editPaid = submission.date_paid ?? '';
    editNotes = submission.notes ?? '';
    editing = true;
  }

  function saveEdit() {
    const updates: SubmissionUpdate = {
      date_submitted: editSubmitted || null,
      date_resolved: editResolved || null,
      notes: editNotes.trim() || null,
    };
    if (stage === 'awaiting_payment' || stage === 'received') {
      updates.amount_reimbursed = editAmount.trim() === '' ? null : dollarsToCents(editAmount);
    }
    if (stage === 'received') updates.date_paid = editPaid || null;
    save(updates, `${name} updated`);
  }

  async function confirmDelete() {
    saving = true;
    try {
      await deleteSubmission(claim.id, submission.id);
      success(`${name} removed from this claim`);
      dispatch('deleted');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to remove this plan');
    } finally {
      saving = false;
      showDeleteConfirm = false;
    }
  }

  async function openPortal() {
    if (!portalUrl) return;
    try {
      if (isTauri()) {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(portalUrl);
      } else {
        window.open(portalUrl, '_blank');
      }
    } catch (e) {
      showError('Failed to open portal');
      console.error('Failed to open portal URL:', e);
    }
  }

  // Three-step timeline: submitted → decided → received
  type StepState = 'done' | 'current' | 'upcoming' | 'skipped';
  interface Step {
    label: string;
    detail: string;
    state: StepState;
  }

  $: steps = buildSteps(stage, submission);

  function buildSteps(currentStage: typeof stage, sub: typeof submission): Step[] {
    const sentStates = ['submitted', 'awaiting_payment', 'received', 'denied'];
    const sent = sentStates.includes(currentStage);
    const submitted: Step = sent
      ? {
          label: 'Submitted',
          detail: sub.date_submitted ? shortDate(sub.date_submitted) : '',
          state: 'done',
        }
      : {
          label: 'Submitted',
          detail: currentStage === 'to_submit' ? 'next' : '',
          state: currentStage === 'to_submit' ? 'current' : 'upcoming',
        };

    let decided: Step = { label: 'Decided', detail: '', state: 'upcoming' };
    if (currentStage === 'submitted')
      decided = { label: 'Decided', detail: 'waiting', state: 'current' };
    if (currentStage === 'awaiting_payment' || currentStage === 'received') {
      decided = {
        label: `Approved ${formatCurrency(sub.amount_reimbursed ?? 0)}`,
        detail: sub.date_resolved ? shortDate(sub.date_resolved) : '',
        state: 'done',
      };
    }
    if (currentStage === 'denied') {
      decided = {
        label: 'Denied',
        detail: sub.date_resolved ? shortDate(sub.date_resolved) : '',
        state: 'done',
      };
    }

    let received: Step = { label: 'Received', detail: '', state: 'upcoming' };
    if (currentStage === 'awaiting_payment')
      received = { label: 'Received', detail: 'waiting', state: 'current' };
    if (currentStage === 'received') {
      received = {
        label: 'Received',
        detail: sub.date_paid ? shortDate(sub.date_paid) : '',
        state: 'done',
      };
    }
    if (currentStage === 'denied') received = { label: 'No payment', detail: '', state: 'skipped' };

    return [submitted, decided, received];
  }
</script>

<div
  bind:this={cardElement}
  class="plan-card"
  class:next={stage === 'to_submit' || stage === 'submitted'}
  class:quiet={stage === 'waiting' || stage === 'nothing_left'}
  class:highlight
>
  <div class="plan-header">
    <span class="plan-number" aria-hidden="true">{index + 1}</span>
    <div class="plan-title">
      <span class="plan-name">
        {name}
        <span class="plan-role">· {planRole(index)}</span>
      </span>
      <span class="plan-subtitle">
        {#if stage === 'waiting'}
          Starts when {waitingOn} decides
        {:else if stage === 'to_submit'}
          Claim {formatCurrency(submission.amount_claimed)}{index > 0
            ? ` · what's left after ${previousName}`
            : ''}
        {:else if stage === 'nothing_left'}
          {previousName} covered the full cost
        {:else}
          Claimed {formatCurrency(submission.amount_claimed)}
        {/if}
      </span>
    </div>
    <span
      class="badge"
      class:badge-accent={STAGE_TONES[stage] === 'accent'}
      class:badge-warning={STAGE_TONES[stage] === 'warning'}
      class:badge-success={STAGE_TONES[stage] === 'success'}
      class:badge-error={STAGE_TONES[stage] === 'error'}
    >
      {stage === 'waiting' && waitingOn ? `Waiting for ${waitingOn}` : STAGE_LABELS[stage]}
    </span>
    {#if !readonly}
      <div class="plan-tools">
        {#if stage !== 'waiting' && stage !== 'nothing_left'}
          <button
            class="icon-btn"
            on:click={editing ? () => (editing = false) : startEdit}
            aria-label={editing ? 'Close details' : `Edit ${name} details`}
            title="Edit details"
            disabled={saving}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        {/if}
        <button
          class="icon-btn danger"
          on:click={() => (showDeleteConfirm = true)}
          aria-label={`Remove ${name} from this claim`}
          title="Remove plan"
          disabled={saving}
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
      </div>
    {/if}
  </div>

  {#if stage !== 'nothing_left'}
    <ol class="steps" aria-label="{name} progress">
      {#each steps as step (step.label)}
        <li class="step {step.state}">
          <span class="step-dot" aria-hidden="true">
            {#if step.state === 'done'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </span>
          <span class="step-text">
            <span class="step-label">{step.label}</span>
            {#if step.detail}<span class="step-detail">{step.detail}</span>{/if}
          </span>
        </li>
      {/each}
    </ol>
  {/if}

  {#if submission.notes && !editing}
    <p class="plan-notes">{submission.notes}</p>
  {/if}

  {#if editing}
    <div class="panel">
      <div class="field-grid">
        {#if stage === 'awaiting_payment' || stage === 'received'}
          <label class="field">
            <span>Approved amount</span>
            <AmountInput bind:value={editAmount} size="sm" disabled={saving} />
          </label>
        {/if}
        <label class="field">
          <span>Submitted</span>
          <input class="control-sm" type="date" bind:value={editSubmitted} disabled={saving} />
        </label>
        {#if stage !== 'submitted' && stage !== 'to_submit'}
          <label class="field">
            <span>Decided</span>
            <input class="control-sm" type="date" bind:value={editResolved} disabled={saving} />
          </label>
        {/if}
        {#if stage === 'received'}
          <label class="field">
            <span>Received</span>
            <input class="control-sm" type="date" bind:value={editPaid} disabled={saving} />
          </label>
        {/if}
      </div>
      <label class="field">
        <span>Notes</span>
        <textarea rows="2" bind:value={editNotes} disabled={saving}></textarea>
      </label>
      <div class="panel-actions">
        <button class="btn btn-sm btn-ghost" on:click={() => (editing = false)} disabled={saving}>
          Cancel
        </button>
        <button class="btn btn-sm btn-primary" on:click={saveEdit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  {:else if !readonly}
    {#if stage === 'to_submit'}
      <div class="actions">
        {#if portalUrl}
          <button class="btn btn-sm btn-link" on:click={openPortal}>Open {name} portal ↗</button>
        {/if}
        <button class="btn btn-sm btn-primary" on:click={markSubmitted} disabled={saving}>
          Mark submitted
        </button>
      </div>
    {:else if stage === 'submitted'}
      <div class="panel">
        <span class="panel-title">Record the decision</span>
        <div class="field-grid">
          <label class="field">
            <span>Approved amount</span>
            <AmountInput
              bind:value={decisionAmount}
              size="sm"
              disabled={saving}
              ariaLabel="Approved amount"
            />
          </label>
          <label class="field">
            <span>Decided on</span>
            <input class="control-sm" type="date" bind:value={decisionDate} disabled={saving} />
          </label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-sm btn-secondary deny" on:click={deny} disabled={saving}>
            Denied
          </button>
          <button
            class="btn btn-sm btn-primary"
            on:click={approve}
            disabled={saving || decisionCents === null}
          >
            Approve {decisionCents === null ? '' : formatCurrency(decisionCents)}
          </button>
        </div>
      </div>
    {:else if stage === 'awaiting_payment'}
      <div class="actions">
        {#if approvedAmount === undefined}
          <label class="inline-field">
            <span>Approved amount</span>
            <AmountInput
              bind:value={decisionAmount}
              size="sm"
              disabled={saving}
              ariaLabel="Approved amount"
            />
          </label>
        {/if}
        <label class="inline-field">
          <span>Received on</span>
          <input class="control-sm" type="date" bind:value={receivedDate} disabled={saving} />
        </label>
        <button
          class="btn btn-sm btn-primary"
          on:click={markReceived}
          disabled={saving || (approvedAmount === undefined && decisionCents === null)}
        >
          Mark received
        </button>
      </div>
    {:else if stage === 'received' || stage === 'denied'}
      <div class="actions">
        <span class="outcome">
          {#if stage === 'received'}
            {formatCurrency(approvedAmount ?? 0)} received{submission.date_paid
              ? ` ${shortDate(submission.date_paid)}`
              : ''}
          {:else}
            Nothing is owed{index < claim.submissions.length - 1
              ? '; the next plan can claim the full remaining amount'
              : ''}
          {/if}
        </span>
        <button class="btn btn-sm btn-ghost" on:click={undo} disabled={saving}>Undo</button>
      </div>
    {/if}
  {/if}
</div>

<ConfirmDialog
  open={showDeleteConfirm}
  title="Remove plan"
  message={`Remove ${name} from claim #${claim.claim_number}? Its dates and amounts are deleted.`}
  confirmText={saving ? 'Removing…' : 'Remove'}
  on:confirm={confirmDelete}
  on:cancel={() => (showDeleteConfirm = false)}
/>

<style>
  .plan-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
  }

  .plan-card.next {
    border-color: var(--accent-border);
  }

  .plan-card.quiet {
    border-style: dashed;
  }

  .plan-card.highlight {
    animation: highlight-fade 2s ease-out forwards;
  }

  @keyframes highlight-fade {
    0%,
    70% {
      border-color: var(--accent);
      box-shadow: 0 0 0 calc(var(--space-1) / 2) var(--accent-muted);
    }
    100% {
      box-shadow: none;
    }
  }

  .plan-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .plan-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--badge-height);
    height: var(--badge-height);
    flex-shrink: 0;
    border-radius: var(--radius-pill);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-size: var(--font-size-2xs);
    font-weight: 700;
  }

  .plan-title {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .plan-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .plan-role {
    font-size: var(--font-size-2xs);
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .plan-subtitle {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .plan-tools {
    display: flex;
    gap: var(--space-1);
  }

  .icon-btn.danger:hover:not(:disabled) {
    background: var(--error-bg);
    color: var(--error);
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
    margin: 0;
    padding: 0 0 0 calc(var(--badge-height) + var(--space-3));
    list-style: none;
  }

  .step {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .step-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-4);
    height: var(--space-4);
    flex-shrink: 0;
    box-sizing: border-box;
    border: calc(var(--space-1) / 2) solid var(--border-default);
    border-radius: var(--radius-pill);
  }

  .step.done .step-dot {
    border-color: var(--success);
    background: var(--success);
    color: var(--text-inverse);
  }

  .step.current .step-dot {
    border-color: var(--accent);
  }

  .step-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.25;
  }

  .step-label {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .step.upcoming .step-label,
  .step.skipped .step-label {
    color: var(--text-secondary);
  }

  .step-detail {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .step.current .step-detail {
    color: var(--accent);
  }

  .plan-notes {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .outcome {
    flex: 1;
    align-self: center;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
  }

  .panel-title {
    font-size: var(--font-size-2xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-3);
  }

  .field,
  .inline-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--text-secondary);
  }

  /* Label beside its control, on the action row's centreline */
  .inline-field {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
  }

  .field input,
  .field textarea,
  .inline-field input {
    padding: 0 var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-base);
    color: var(--text-primary);
    font: inherit;
    font-size: var(--font-size-sm);
  }

  .field textarea {
    padding: var(--space-2);
    resize: vertical;
  }

  .panel-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .btn.deny {
    color: var(--error);
    border-color: var(--error-border);
  }

  .btn.deny:hover:not(:disabled) {
    background: var(--error-bg);
  }
</style>
