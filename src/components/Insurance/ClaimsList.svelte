<script lang="ts">
  /**
   * ClaimsList - Claims grouped by what they need next. "Open" lists each plan's next
   * step (submit, wait for a decision, wait for the money) with the button for it;
   * "Done" and "All" list whole claims.
   */
  import type { InsuranceClaim } from '../../types/insurance';
  import {
    insuranceClaims,
    insuranceClaimsLoading,
    loadInsuranceClaims,
    updateSubmission,
  } from '../../stores/insurance-claims';
  import { activeCategories } from '../../stores/insurance-categories';
  import { success, error as showError } from '../../stores/toast';
  import { createEventDispatcher } from 'svelte';
  import { formatCurrency, getTodayDateString } from '$lib/utils/format';
  import {
    getClaimHeadline,
    getClaimMoney,
    getPlanTasks,
    planName,
    shortDate,
    type PlanTask,
  } from '$lib/insurance/claim-progress';

  export let selectedClaim: InsuranceClaim | null = null;

  const dispatch = createEventDispatcher<{
    select: InsuranceClaim;
    open: { claimId: string; submissionId?: string };
    changed: void;
    create: void;
    createExpected: void;
  }>();

  type Tab = 'open' | 'done' | 'all';
  let tab: Tab = 'open';
  let filterCategory = '';
  let filterYear = '';
  let busyId: string | null = null;
  let expanded: Record<string, boolean> = {};
  const GROUP_PREVIEW = 5;

  $: availableYears = [
    ...new Set($insuranceClaims.map((c) => Number(c.service_date.substring(0, 4)))),
  ].sort((a, b) => b - a);

  function applyFilters() {
    loadInsuranceClaims({
      category_id: filterCategory || undefined,
      year: filterYear ? parseInt(filterYear) : undefined,
    });
  }

  function clearFilters() {
    filterCategory = '';
    filterYear = '';
    loadInsuranceClaims({});
  }

  $: hasFilters = !!(filterCategory || filterYear);

  const byServiceDateDesc = (a: InsuranceClaim, b: InsuranceClaim) =>
    b.service_date.localeCompare(a.service_date) || b.claim_number - a.claim_number;

  $: openClaims = $insuranceClaims.filter((c) => c.status !== 'closed');
  $: doneClaims = $insuranceClaims.filter((c) => c.status === 'closed').sort(byServiceDateDesc);
  $: allClaims = [...$insuranceClaims].sort(byServiceDateDesc);

  $: tasks = getPlanTasks($insuranceClaims).sort((a, b) => byServiceDateDesc(a.claim, b.claim));
  $: groups = [
    {
      id: 'to_submit',
      title: 'To submit',
      hint: "send each plan what's left after the one before",
      tone: 'accent',
      tasks: tasks.filter((t) => t.stage === 'to_submit'),
    },
    {
      id: 'submitted',
      title: 'Waiting on insurer',
      hint: 'submitted, no decision yet',
      tone: 'neutral',
      tasks: tasks.filter((t) => t.stage === 'submitted'),
    },
    {
      id: 'awaiting_payment',
      title: 'Awaiting payment',
      hint: 'approved, money not in yet',
      tone: 'warning',
      tasks: tasks.filter((t) => t.stage === 'awaiting_payment'),
    },
  ];
  $: scheduled = openClaims.filter((c) => c.is_expected).sort(byServiceDateDesc);
  $: notStarted = openClaims
    .filter((c) => !c.is_expected && c.submissions.length === 0)
    .sort(byServiceDateDesc);
  $: nothingOpen =
    groups.every((g) => g.tasks.length === 0) && scheduled.length === 0 && notStarted.length === 0;

  function categoryIcon(categoryId: string): string {
    return $activeCategories.find((c) => c.id === categoryId)?.icon || '📋';
  }

  function claimTitle(claim: InsuranceClaim): string {
    return claim.is_expected
      ? claim.category_name
      : `#${claim.claim_number} ${claim.category_name}`;
  }

  function taskMeta(task: PlanTask): string {
    const plan = planName(task.submission);
    if (task.stage === 'to_submit') return `${shortDate(task.claim.service_date)} · ${plan}`;
    if (task.stage === 'submitted') {
      const sent = task.submission.date_submitted;
      return sent ? `${plan} · submitted ${shortDate(sent)}` : plan;
    }
    const decided = task.submission.date_resolved;
    return decided ? `${plan} · approved ${shortDate(decided)}` : plan;
  }

  function claimMeta(claim: InsuranceClaim): string {
    const parts = [shortDate(claim.service_date), claim.provider_name ?? claim.family_member_name];
    if (claim.is_expected && claim.expected_reimbursement) {
      parts.push(`est. ${formatCurrency(claim.expected_reimbursement)} back`);
    } else if (claim.status === 'closed') {
      const received = getClaimMoney(claim).received;
      parts.push(received > 0 ? `received ${formatCurrency(received)}` : 'nothing received');
    }
    return parts.filter(Boolean).join(' · ');
  }

  function openTask(task: PlanTask) {
    dispatch('open', { claimId: task.claim.id, submissionId: task.submission.id });
  }

  async function quickAction(task: PlanTask) {
    const plan = planName(task.submission);
    busyId = task.submission.id;
    try {
      if (task.stage === 'to_submit') {
        await updateSubmission(task.claim.id, task.submission.id, {
          status: 'pending',
          date_submitted: getTodayDateString(),
        });
        success(`Submitted to ${plan}`);
      } else {
        await updateSubmission(task.claim.id, task.submission.id, {
          status: 'paid',
          date_paid: getTodayDateString(),
        });
        success(`${plan} payment received`);
      }
      dispatch('changed');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to update the claim');
    } finally {
      busyId = null;
    }
  }
</script>

<div class="claims-list-container">
  <div class="list-header">
    <h2>Claims</h2>
    <div class="header-actions">
      <button class="btn btn-sm btn-secondary" on:click={() => dispatch('createExpected')}>
        Schedule expected
      </button>
      <button class="btn btn-sm btn-primary" on:click={() => dispatch('create')}>
        New claim
      </button>
    </div>
  </div>

  <div class="toolbar">
    <div class="tabs" role="tablist" aria-label="Claims">
      <button role="tab" aria-selected={tab === 'open'} on:click={() => (tab = 'open')}>
        Open{openClaims.length > 0 ? ` · ${openClaims.length}` : ''}
      </button>
      <button role="tab" aria-selected={tab === 'done'} on:click={() => (tab = 'done')}>
        Done
      </button>
      <button role="tab" aria-selected={tab === 'all'} on:click={() => (tab = 'all')}> All </button>
    </div>
    <select
      class="control-sm"
      aria-label="Filter by category"
      bind:value={filterCategory}
      on:change={applyFilters}
    >
      <option value="">All categories</option>
      {#each $activeCategories as cat (cat.id)}
        <option value={cat.id}>{cat.icon} {cat.name}</option>
      {/each}
    </select>
    <select
      class="control-sm"
      aria-label="Filter by year"
      bind:value={filterYear}
      on:change={applyFilters}
    >
      <option value="">All years</option>
      {#each availableYears as year (year)}
        <option value={year}>{year}</option>
      {/each}
    </select>
    {#if hasFilters}
      <button class="btn btn-sm btn-link" on:click={clearFilters}>Clear</button>
    {/if}
  </div>

  <div class="claims-list">
    {#if $insuranceClaimsLoading && $insuranceClaims.length === 0}
      <div class="empty-state">Loading claims…</div>
    {:else if $insuranceClaims.length === 0}
      <div class="empty-state">
        {#if hasFilters}
          <p>No claims match your filters.</p>
          <button class="btn btn-sm btn-link" on:click={clearFilters}>Clear filters</button>
        {:else}
          <p>No claims yet.</p>
          <p class="hint">Create your first claim or schedule an expected expense.</p>
        {/if}
      </div>
    {:else if tab === 'open'}
      {#if nothingOpen}
        <div class="empty-state">
          <p>Nothing needs you.</p>
          <p class="hint">Every claim is done.</p>
        </div>
      {/if}
      {#each groups as group (group.id)}
        {#if group.tasks.length > 0}
          <section class="group" aria-label={group.title}>
            <div class="group-header">
              <span class="group-title {group.tone}">{group.title} · {group.tasks.length}</span>
              <span class="group-hint">{group.hint}</span>
            </div>
            {#each expanded[group.id] ? group.tasks : group.tasks.slice(0, GROUP_PREVIEW) as task (task.submission.id)}
              <div class="row" class:selected={selectedClaim?.id === task.claim.id}>
                <button class="row-main" on:click={() => openTask(task)}>
                  <span class="row-title">
                    <span aria-hidden="true">{categoryIcon(task.claim.category_id)}</span>
                    {claimTitle(task.claim)}
                  </span>
                  <span class="row-meta">{taskMeta(task)}</span>
                </button>
                <span class="row-amount">{formatCurrency(task.amount)}</span>
                {#if task.stage === 'to_submit'}
                  <button
                    class="btn btn-sm btn-primary row-action"
                    on:click={() => quickAction(task)}
                    disabled={busyId === task.submission.id}
                  >
                    Mark submitted
                  </button>
                {:else if task.stage === 'submitted'}
                  <button
                    class="btn btn-sm btn-secondary row-action"
                    on:click={() => openTask(task)}
                  >
                    Record decision
                  </button>
                {:else}
                  <button
                    class="btn btn-sm btn-secondary row-action"
                    on:click={() => quickAction(task)}
                    disabled={busyId === task.submission.id}
                  >
                    Mark received
                  </button>
                {/if}
              </div>
            {/each}
            {#if group.tasks.length > GROUP_PREVIEW}
              <button
                class="btn btn-sm btn-link show-more"
                on:click={() => (expanded = { ...expanded, [group.id]: !expanded[group.id] })}
              >
                {expanded[group.id]
                  ? 'Show fewer'
                  : `Show ${group.tasks.length - GROUP_PREVIEW} more`}
              </button>
            {/if}
          </section>
        {/if}
      {/each}

      {#each [{ id: 'scheduled', title: 'Scheduled', hint: 'appointments still to come', claims: scheduled }, { id: 'not_started', title: 'No plans yet', hint: 'add the plans to claim from', claims: notStarted }] as group (group.id)}
        {#if group.claims.length > 0}
          <section class="group" aria-label={group.title}>
            <div class="group-header">
              <span class="group-title">{group.title} · {group.claims.length}</span>
              <span class="group-hint">{group.hint}</span>
            </div>
            {#each group.claims as claim (claim.id)}
              <div class="row" class:selected={selectedClaim?.id === claim.id}>
                <button class="row-main" on:click={() => dispatch('select', claim)}>
                  <span class="row-title">
                    <span aria-hidden="true">{categoryIcon(claim.category_id)}</span>
                    {claimTitle(claim)}
                  </span>
                  <span class="row-meta">{claimMeta(claim)}</span>
                </button>
                <span class="row-amount">{formatCurrency(getClaimMoney(claim).cost)}</span>
              </div>
            {/each}
          </section>
        {/if}
      {/each}
    {:else}
      {@const claims = tab === 'done' ? doneClaims : allClaims}
      {#if claims.length === 0}
        <div class="empty-state"><p>No finished claims yet.</p></div>
      {/if}
      <section class="group">
        {#each claims as claim (claim.id)}
          {@const headline = getClaimHeadline(claim)}
          <div class="row" class:selected={selectedClaim?.id === claim.id}>
            <button class="row-main" on:click={() => dispatch('select', claim)}>
              <span class="row-title">
                <span aria-hidden="true">{categoryIcon(claim.category_id)}</span>
                {claimTitle(claim)}
              </span>
              <span class="row-meta">{claimMeta(claim)}</span>
            </button>
            {#if tab === 'all'}
              <span
                class="badge"
                class:badge-accent={headline.tone === 'accent'}
                class:badge-warning={headline.tone === 'warning'}
                class:badge-success={headline.tone === 'success'}
              >
                {headline.label}
              </span>
            {/if}
            <span class="row-amount">{formatCurrency(getClaimMoney(claim).cost)}</span>
          </div>
        {/each}
      </section>
    {/if}
  </div>
</div>

<style>
  .claims-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    container-type: inline-size;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-default);
  }

  .list-header h2 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--bg-base);
    border-bottom: 1px solid var(--border-default);
  }

  .toolbar select {
    padding: 0 var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .tabs {
    display: inline-flex;
    gap: var(--space-1);
    padding: calc(var(--space-1) / 2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
  }

  .tabs button {
    height: calc(var(--control-height-sm) - var(--space-1));
    padding: 0 var(--space-3);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
  }

  .tabs button[aria-selected='true'] {
    background: var(--accent-muted);
    color: var(--accent);
    font-weight: 600;
  }

  .tabs button:hover:not([aria-selected='true']) {
    color: var(--text-primary);
  }

  .claims-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-8) var(--space-4);
    color: var(--text-secondary);
  }

  .empty-state p {
    margin: 0;
  }

  .empty-state .hint {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
    margin-top: var(--space-2);
  }

  .group {
    display: flex;
    flex-direction: column;
    padding: 0 var(--space-3) var(--space-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
  }

  .group-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-3) 0 var(--space-2);
    border-bottom: 1px solid var(--border-default);
  }

  .group-title {
    font-size: var(--font-size-2xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .group-title.accent {
    color: var(--accent);
  }

  .group-title.warning {
    color: var(--warning);
  }

  .group-hint {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    text-align: right;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--control-height);
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .row:last-of-type {
    border-bottom: none;
  }

  .row.selected .row-title {
    color: var(--accent);
  }

  .row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-1) / 2);
    padding: var(--space-1) 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .row-main:hover .row-title {
    color: var(--accent);
  }

  .row-title {
    display: flex;
    gap: var(--space-1);
    max-width: 100%;
    font-size: var(--font-size-md);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-meta {
    max-width: 100%;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-amount {
    flex-shrink: 0;
    min-width: var(--ledger-amount-width);
    text-align: right;
    font-size: var(--font-size-md);
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
  }

  .row-action {
    flex-shrink: 0;
    min-width: 8.5rem;
  }

  .show-more {
    align-self: center;
    margin: var(--space-1) 0;
  }

  /* Beside an open claim the list is narrow: amount and button go under the title */
  @container (max-width: 30rem) {
    .row {
      flex-wrap: wrap;
      row-gap: 0;
    }

    .row-main {
      flex-basis: 100%;
    }

    .row-amount {
      margin-left: auto;
      min-width: 0;
    }

    .row-action {
      min-width: 0;
      margin-bottom: var(--space-1);
    }

    .group-hint {
      display: none;
    }
  }
</style>
