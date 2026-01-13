<script lang="ts">
  /**
   * ClaimsList - Filterable list of insurance claims
   */
  import type { InsuranceClaim, SubmissionStatus } from '../../types/insurance';
  import {
    insuranceClaims,
    insuranceClaimsLoading,
    loadInsuranceClaims,
  } from '../../stores/insurance-claims';
  import { activeCategories } from '../../stores/insurance-categories';
  import { createEventDispatcher } from 'svelte';

  export let selectedClaim: InsuranceClaim | null = null;

  const dispatch = createEventDispatcher<{ select: InsuranceClaim; create: void }>();

  // Filter state - status uses display values, not internal ClaimStatus
  type StatusFilter = 'all' | 'in_progress' | 'closed';
  let filterStatus: StatusFilter = 'all';
  let filterCategory = '';
  let filterYear = '';

  // Get available years from claims
  $: availableYears = [
    ...new Set($insuranceClaims.map((c) => new Date(c.service_date + 'T00:00:00').getFullYear())),
  ].sort((a, b) => b - a);

  // Apply filters
  async function applyFilters() {
    const filters: {
      status?: 'draft' | 'in_progress' | 'closed';
      category_id?: string;
      year?: number;
    } = {};
    // Map filter status to backend status values
    // 'in_progress' filter shows both draft and in_progress claims (handled by backend or client-side)
    // For now, we filter client-side since backend may not support this mapping
    if (filterCategory) filters.category_id = filterCategory;
    if (filterYear) filters.year = parseInt(filterYear);
    await loadInsuranceClaims(filters);
  }

  // Set status filter and apply
  function setStatusFilter(status: StatusFilter) {
    filterStatus = status;
    applyFilters();
  }

  function clearFilters() {
    filterStatus = 'all';
    filterCategory = '';
    filterYear = '';
    loadInsuranceClaims();
  }

  function getStatusColor(status: 'draft' | 'in_progress' | 'closed'): string {
    switch (status) {
      case 'draft':
      case 'in_progress':
        return 'var(--warning)';
      case 'closed':
        return 'var(--success)';
      default:
        return 'var(--text-primary)';
    }
  }

  function getStatusLabel(status: 'draft' | 'in_progress' | 'closed'): string {
    switch (status) {
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
      month: 'short',
      day: 'numeric',
    });
  }

  function getCategoryIcon(categoryId: string): string {
    const category = $activeCategories.find((c) => c.id === categoryId);
    return category?.icon || '📋';
  }

  function getSubmissionStatusColor(status: SubmissionStatus): string {
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

  function getSubmissionStatusLabel(status: SubmissionStatus): string {
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

  function selectClaim(claim: InsuranceClaim) {
    dispatch('select', claim);
  }

  function handleCreate() {
    dispatch('create');
  }

  $: hasFilters = filterStatus !== 'all' || filterCategory || filterYear;

  // Client-side status filtering (since backend doesn't support 'in_progress' = draft + in_progress)
  $: filteredClaims = $insuranceClaims.filter((claim) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'in_progress') {
      return claim.status === 'draft' || claim.status === 'in_progress';
    }
    return claim.status === filterStatus;
  });
</script>

<div class="claims-list-container">
  <!-- Header with create button -->
  <div class="list-header">
    <h2>Claims</h2>
    <button class="btn btn-primary" on:click={handleCreate}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      New Claim
    </button>
  </div>

  <!-- Filters -->
  <div class="filters">
    <div class="status-filter">
      <button class:active={filterStatus === 'all'} on:click={() => setStatusFilter('all')}>
        All
      </button>
      <button
        class:active={filterStatus === 'in_progress'}
        on:click={() => setStatusFilter('in_progress')}
      >
        In Progress
      </button>
      <button class:active={filterStatus === 'closed'} on:click={() => setStatusFilter('closed')}>
        Closed
      </button>
    </div>

    <select bind:value={filterCategory} on:change={applyFilters}>
      <option value="">All Categories</option>
      {#each $activeCategories as cat (cat.id)}
        <option value={cat.id}>{cat.icon} {cat.name}</option>
      {/each}
    </select>

    <select bind:value={filterYear} on:change={applyFilters}>
      <option value="">All Years</option>
      {#each availableYears as year (year)}
        <option value={year}>{year}</option>
      {/each}
    </select>

    {#if hasFilters}
      <button class="btn-link" on:click={clearFilters}>Clear</button>
    {/if}
  </div>

  <!-- Claims list -->
  <div class="claims-list">
    {#if $insuranceClaimsLoading}
      <div class="loading-state">Loading claims...</div>
    {:else if filteredClaims.length === 0}
      <div class="empty-state">
        {#if hasFilters}
          <p>No claims match your filters.</p>
          <button class="btn-link" on:click={clearFilters}>Clear filters</button>
        {:else}
          <p>No claims yet.</p>
          <p class="hint">Create your first claim to start tracking reimbursements.</p>
        {/if}
      </div>
    {:else}
      {#each filteredClaims as claim (claim.id)}
        <button
          class="claim-card"
          class:selected={selectedClaim?.id === claim.id}
          on:click={() => selectClaim(claim)}
        >
          <div class="claim-header">
            <span class="claim-title">
              <span class="title-number">#{claim.claim_number}</span>
              <span class="title-name">{claim.family_member_name}</span>
              <span class="title-connector">for</span>
              <span class="title-category"
                >{getCategoryIcon(claim.category_id)} {claim.category_name}</span
              >
              <span class="title-connector">on</span>
              <span class="title-date">{formatDate(claim.service_date)}</span>
            </span>
            <span class="claim-status" style="color: {getStatusColor(claim.status)}">
              {getStatusLabel(claim.status)}
            </span>
          </div>
          {#if claim.description}
            <div class="claim-body">
              <span class="claim-description">{claim.description}</span>
            </div>
          {/if}
          <div class="claim-footer">
            {#if claim.submissions.length > 0}
              <div class="submission-badges">
                {#each claim.submissions as sub (sub.id)}
                  <span
                    class="submission-badge"
                    style="color: {getSubmissionStatusColor(
                      sub.status
                    )}; border-color: {getSubmissionStatusColor(sub.status)}"
                  >
                    {getSubmissionStatusLabel(sub.status)}
                  </span>
                {/each}
              </div>
            {/if}
            <span class="claim-amount">{formatCurrency(claim.total_amount)}</span>
          </div>
        </button>
      {/each}
    {/if}
  </div>
</div>

<style>
  .claims-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-default);
  }

  .list-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-base);
    border-bottom: 1px solid var(--border-default);
  }

  .filters select {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.8125rem;
  }

  .filters select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .status-filter {
    display: flex;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .status-filter button {
    padding: var(--space-1) var(--space-3);
    background: var(--bg-surface);
    border: none;
    border-right: 1px solid var(--border-default);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .status-filter button:last-child {
    border-right: none;
  }

  .status-filter button:hover:not(.active) {
    background: var(--bg-hover);
  }

  .status-filter button.active {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-link {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 0.8125rem;
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
  }

  .btn-link:hover {
    text-decoration: underline;
  }

  .claims-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .loading-state,
  .empty-state {
    text-align: center;
    padding: var(--space-8) var(--space-4);
    color: var(--text-secondary);
  }

  .empty-state .hint {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    margin-top: var(--space-2);
  }

  .claim-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }

  .claim-card:hover {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .claim-card.selected {
    border-color: var(--accent);
    background: var(--accent-muted);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .claim-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .claim-title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25em;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .title-number {
    font-weight: 700;
    color: var(--accent);
  }

  .title-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .title-connector {
    font-weight: 400;
    color: var(--text-secondary);
  }

  .title-category {
    font-weight: 600;
    color: var(--accent);
  }

  .title-date {
    font-weight: 600;
    color: var(--text-primary);
  }

  .claim-status {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 2px 6px;
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
  }

  .claim-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .claim-description {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .claim-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
    gap: var(--space-2);
  }

  .submission-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .submission-badge {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 2px 6px;
    background: var(--bg-elevated);
    border: 1px solid;
    border-radius: var(--radius-sm);
  }

  .claim-amount {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  /* Button */
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

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }
</style>
