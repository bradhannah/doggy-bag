<script lang="ts">
  import type { PaymentSource } from '../../stores/payment-sources';
  import { isDebtAccount, getTypeDisplayName, getTypeIcon } from '../../stores/payment-sources';
  import NotesModal from '../shared/NotesModal.svelte';

  export let paymentSources: PaymentSource[];
  export let onView: (ps: PaymentSource) => void;
  export let onEdit: (ps: PaymentSource) => void;
  export let onDelete: (ps: PaymentSource) => void;

  // Notes modal state
  let showNotesModal = false;
  let notesModalTitle = '';
  let notesModalContent = '';

  function openNotesModal(ps: PaymentSource) {
    notesModalTitle = `${ps.name} Notes`;
    notesModalContent = ps.metadata?.notes || '';
    showNotesModal = true;
  }

  function closeNotesModal() {
    showNotesModal = false;
  }

  // Format credit limit from cents to dollars
  function formatCreditLimit(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  // Format interest rate from decimal to percentage
  function formatInterestRate(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`;
  }
</script>

<div class="payment-sources-list">
  <div class="list-container">
    <!-- Column Header -->
    <div class="column-header">
      <span class="col-name">Name</span>
      <span class="col-type">Type</span>
      <span class="col-actions">Actions</span>
    </div>

    <!-- Payment Source Rows -->
    {#if paymentSources.length === 0}
      <div class="empty-state">No payment sources yet. Add your first account to get started.</div>
    {:else}
      {#each paymentSources as ps (ps.id)}
        {@const isDebt = isDebtAccount(ps.type)}
        {@const hasMetadata =
          ps.metadata &&
          (ps.metadata.credit_limit || ps.metadata.interest_rate || ps.metadata.statement_day)}
        <div class="source-row" class:debt={isDebt} on:click={() => onView(ps)}>
          <div class="col-name">
            <span class="name-line">
              <span class="type-icon">{getTypeIcon(ps.type)}</span>
              <span class="name-text">{ps.name}</span>
              {#if ps.metadata?.last_four_digits}
                <span class="last-four">••••{ps.metadata.last_four_digits}</span>
              {/if}
            </span>
            {#if hasMetadata}
              <span class="metadata-line">
                {#if ps.metadata?.credit_limit}
                  <span class="meta-item">Limit: {formatCreditLimit(ps.metadata.credit_limit)}</span
                  >
                {/if}
                {#if ps.metadata?.interest_rate !== undefined}
                  <span class="meta-item"
                    >Rate: {formatInterestRate(ps.metadata.interest_rate)}{ps.metadata
                      .is_variable_rate
                      ? ' (var)'
                      : ''}</span
                  >
                {/if}
                {#if ps.metadata?.statement_day}
                  <span class="meta-item">Statement: day {ps.metadata.statement_day}</span>
                {/if}
              </span>
            {/if}
          </div>
          <span class="col-type">
            <span class="type-badge" class:debt={isDebt}>
              {getTypeDisplayName(ps.type)}
            </span>
          </span>
          <span class="col-actions" on:click|stopPropagation>
            {#if ps.metadata?.notes}
              <button
                class="btn-icon btn-notes"
                on:click={() => openNotesModal(ps)}
                title="View Notes"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </button>
            {/if}
            {#if ps.metadata?.account_url}
              <a
                class="btn-icon btn-link"
                href={ps.metadata.account_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open Account"
                on:click|stopPropagation
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            {/if}
            <button class="btn-icon" on:click={() => onEdit(ps)} title="Edit">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="btn-icon btn-danger" on:click={() => onDelete(ps)} title="Delete">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </button>
          </span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<NotesModal
  title={notesModalTitle}
  notes={notesModalContent}
  open={showNotesModal}
  on:close={closeNotesModal}
/>

<style>
  .payment-sources-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Container with border and rounded edges */
  .list-container {
    background: var(--bg-surface);
    border-radius: 16px;
    border: 2px solid var(--border-default);
    overflow: hidden;
  }

  /* Column Header */
  .column-header {
    display: grid;
    grid-template-columns: 1fr 140px 120px;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-elevated);
    border-bottom: 2px solid var(--border-default);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
  }

  /* Source Row */
  .source-row {
    display: grid;
    grid-template-columns: 1fr 140px 120px;
    gap: 12px;
    padding: 14px 16px;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .source-row:last-child {
    border-bottom: none;
  }

  .source-row:hover {
    background: var(--accent-muted);
  }

  .source-row.debt:hover {
    background: var(--error-muted);
  }

  .source-row .col-name {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }

  .name-line {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .name-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .last-four {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-family: monospace;
    flex-shrink: 0;
  }

  .metadata-line {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .meta-item {
    white-space: nowrap;
  }

  .type-icon {
    font-size: 1.125rem;
    flex-shrink: 0;
  }

  .source-row .col-type {
    font-size: 0.8125rem;
  }

  .type-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    background: var(--accent-muted);
    color: var(--accent);
  }

  .type-badge.debt {
    background: var(--error-muted);
    color: var(--error);
  }

  .source-row .col-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  /* Icon Buttons */
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-icon:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn-icon.btn-danger:hover {
    background: var(--error);
    color: var(--text-on-error, #fff);
  }

  .btn-icon.btn-notes {
    color: var(--accent);
  }

  .btn-icon.btn-notes:hover {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .btn-icon.btn-link {
    color: var(--text-secondary);
    text-decoration: none;
  }

  .btn-icon.btn-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* Empty State */
  .empty-state {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-tertiary);
    font-size: 0.875rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .column-header,
    .source-row {
      grid-template-columns: 1fr 80px;
    }

    .col-type {
      display: none;
    }

    .column-header .col-type {
      display: none;
    }
  }
</style>
