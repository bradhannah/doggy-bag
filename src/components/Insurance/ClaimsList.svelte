<script lang="ts">
  /**
   * ClaimsList - Filterable list of insurance claims
   */
  import type { InsuranceClaim, ClaimStatus } from '../../types/insurance';
  import {
    insuranceClaims,
    insuranceClaimsLoading,
    loadInsuranceClaims,
  } from '../../stores/insurance-claims';
  import { activeCategories } from '../../stores/insurance-categories';
  import { createEventDispatcher } from 'svelte';

  export let selectedClaim: InsuranceClaim | null = null;

  const dispatch = createEventDispatcher<{ select: InsuranceClaim; create: void }>();

  // Filter state
  let filterStatus: ClaimStatus | '' = '';
  let filterCategory = '';
  let filterYear = '';

  // Get available years from claims
  $: availableYears = [
    ...new Set($insuranceClaims.map((c) => new Date(c.service_date).getFullYear())),
  ].sort((a, b) => b - a);

  // Apply filters
  async function applyFilters() {
    const filters: { status?: ClaimStatus; category_id?: string; year?: number } = {};
    if (filterStatus) filters.status = filterStatus;
    if (filterCategory) filters.category_id = filterCategory;
    if (filterYear) filters.year = parseInt(filterYear);
    await loadInsuranceClaims(filters);
  }

  function clearFilters() {
    filterStatus = '';
    filterCategory = '';
    filterYear = '';
    loadInsuranceClaims();
  }

  function getStatusColor(status: ClaimStatus): string {
    switch (status) {
      case 'draft':
        return 'var(--text-secondary)';
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
      case 'draft':
        return 'Draft';
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function selectClaim(claim: InsuranceClaim) {
    dispatch('select', claim);
  }

  function handleCreate() {
    dispatch('create');
  }

  $: hasFilters = filterStatus || filterCategory || filterYear;
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
    <select bind:value={filterStatus} on:change={applyFilters}>
      <option value="">All Statuses</option>
      <option value="draft">Draft</option>
      <option value="in_progress">In Progress</option>
      <option value="closed">Closed</option>
    </select>

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
      <button class="btn-link" on:click={clearFilters}>Clear filters</button>
    {/if}
  </div>

  <!-- Claims list -->
  <div class="claims-list">
    {#if $insuranceClaimsLoading}
      <div class="loading-state">Loading claims...</div>
    {:else if $insuranceClaims.length === 0}
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
      {#each $insuranceClaims as claim (claim.id)}
        <button
          class="claim-card"
          class:selected={selectedClaim?.id === claim.id}
          on:click={() => selectClaim(claim)}
        >
          <div class="claim-header">
            <span class="claim-number">#{claim.claim_number}</span>
            <span class="claim-status" style="color: {getStatusColor(claim.status)}">
              {getStatusLabel(claim.status)}
            </span>
          </div>
          <div class="claim-body">
            <span class="claim-category">{claim.category_name}</span>
            {#if claim.description}
              <span class="claim-description">{claim.description}</span>
            {/if}
          </div>
          <div class="claim-footer">
            <span class="claim-date">{formatDate(claim.service_date)}</span>
            <span class="claim-amount">{formatCurrency(claim.total_amount)}</span>
          </div>
          {#if claim.submissions.length > 0}
            <div class="claim-submissions">
              <span class="submission-count"
                >{claim.submissions.length} submission{claim.submissions.length > 1
                  ? 's'
                  : ''}</span
              >
            </div>
          {/if}
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
    align-items: center;
  }

  .claim-number {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
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

  .claim-category {
    font-size: 0.8125rem;
    color: var(--text-secondary);
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
  }

  .claim-date {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .claim-amount {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .claim-submissions {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
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
