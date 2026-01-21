<script lang="ts">
  import type { InsurancePlan } from '../../types/insurance';
  import NotesModal from '../shared/NotesModal.svelte';

  export let plans: InsurancePlan[];
  export let onView: (plan: InsurancePlan) => void;
  export let onEdit: (plan: InsurancePlan) => void;
  export let onDelete: (plan: InsurancePlan) => void;

  // Notes modal state
  let showNotesModal = false;
  let notesModalTitle = '';
  let notesModalContent = '';

  function openNotesModal(plan: InsurancePlan) {
    notesModalTitle = `${plan.name} Notes`;
    notesModalContent = plan.notes || '';
    showNotesModal = true;
  }

  function closeNotesModal() {
    showNotesModal = false;
  }

  // Sort plans by name alphabetically
  $: sortedPlans = [...plans].sort((a, b) => a.name.localeCompare(b.name));
</script>

<div class="insurance-plans-list">
  <div class="list-container">
    <!-- Column Header -->
    <div class="column-header">
      <span class="col-name">Plan Name</span>
      <span class="col-owner">Owner</span>
      <span class="col-status">Status</span>
      <span class="col-actions">Actions</span>
    </div>

    <!-- Plan Rows -->
    {#if sortedPlans.length === 0}
      <div class="empty-state">No insurance plans yet. Add your first plan to get started.</div>
    {:else}
      {#each sortedPlans as plan (plan.id)}
        <div class="plan-row" class:inactive={!plan.is_active} on:click={() => onView(plan)}>
          <div class="col-name">
            <span class="name-line">
              <span class="name-text">{plan.name}</span>
            </span>
            {#if plan.provider_name || plan.policy_number || plan.member_id}
              <span class="metadata-line">
                {#if plan.provider_name}
                  <span class="meta-item">{plan.provider_name}</span>
                {/if}
                {#if plan.policy_number}
                  <span class="meta-item">Policy: {plan.policy_number}</span>
                {/if}
                {#if plan.member_id}
                  <span class="meta-item">ID: {plan.member_id}</span>
                {/if}
              </span>
            {/if}
          </div>
          <span class="col-owner">
            {plan.owner || '-'}
          </span>
          <span class="col-status">
            <span
              class="status-badge"
              class:active={plan.is_active}
              class:inactive={!plan.is_active}
            >
              {plan.is_active ? 'Active' : 'Inactive'}
            </span>
          </span>
          <span class="col-actions" on:click|stopPropagation>
            {#if plan.notes}
              <button
                class="btn-icon btn-notes"
                on:click={() => openNotesModal(plan)}
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
            {#if plan.portal_url}
              <a
                class="btn-icon btn-link"
                href={plan.portal_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open Portal"
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
            <button class="btn-icon" on:click={() => onEdit(plan)} title="Edit">
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
            <button class="btn-icon btn-danger" on:click={() => onDelete(plan)} title="Delete">
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
  .insurance-plans-list {
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
    grid-template-columns: 1fr 100px 80px 120px;
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

  /* Plan Row */
  .plan-row {
    display: grid;
    grid-template-columns: 1fr 100px 80px 120px;
    gap: 12px;
    padding: 14px 16px;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .plan-row:last-child {
    border-bottom: none;
  }

  .plan-row:hover {
    background: var(--accent-muted);
  }

  .plan-row.inactive {
    opacity: 0.6;
  }

  .plan-row .col-name {
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

  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.active {
    background: var(--success-muted);
    color: var(--success);
  }

  .status-badge.inactive {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .col-owner {
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .plan-row .col-actions {
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
    .plan-row {
      grid-template-columns: 1fr 80px;
    }

    .col-owner,
    .col-status {
      display: none;
    }

    .column-header .col-owner,
    .column-header .col-status {
      display: none;
    }
  }
</style>
