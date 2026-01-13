<script lang="ts">
  import type { FamilyMember } from '../../types/insurance';

  export let members: FamilyMember[];
  export let onView: (member: FamilyMember) => void;
  export let onEdit: (member: FamilyMember) => void;
  export let onDelete: (member: FamilyMember) => void;

  // Sort members by name alphabetically
  $: sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));
</script>

<div class="family-members-list">
  <div class="list-container">
    <!-- Column Header -->
    <div class="column-header">
      <span class="col-name">Name</span>
      <span class="col-status">Status</span>
      <span class="col-actions">Actions</span>
    </div>

    <!-- Member Rows -->
    {#if sortedMembers.length === 0}
      <div class="empty-state">
        No family members yet. Add your first family member to get started.
      </div>
    {:else}
      {#each sortedMembers as member (member.id)}
        <div class="member-row" class:inactive={!member.is_active} on:click={() => onView(member)}>
          <span class="col-name">
            <span class="name-text">{member.name}</span>
          </span>
          <span class="col-status">
            <span
              class="status-badge"
              class:active={member.is_active}
              class:inactive={!member.is_active}
            >
              {member.is_active ? 'Active' : 'Inactive'}
            </span>
          </span>
          <span class="col-actions" on:click|stopPropagation>
            <button class="btn-icon" on:click={() => onEdit(member)} title="Edit">
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
            <button class="btn-icon btn-danger" on:click={() => onDelete(member)} title="Delete">
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

<style>
  .family-members-list {
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
    grid-template-columns: 1fr 100px 80px;
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

  /* Member Row */
  .member-row {
    display: grid;
    grid-template-columns: 1fr 100px 80px;
    gap: 12px;
    padding: 14px 16px;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .member-row:last-child {
    border-bottom: none;
  }

  .member-row:hover {
    background: var(--accent-muted);
  }

  .member-row.inactive {
    opacity: 0.6;
  }

  .name-text {
    font-weight: 500;
    color: var(--text-primary);
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

  .member-row .col-actions {
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
    .member-row {
      grid-template-columns: 1fr 80px;
    }

    .col-status {
      display: none;
    }

    .column-header .col-status {
      display: none;
    }
  }
</style>
