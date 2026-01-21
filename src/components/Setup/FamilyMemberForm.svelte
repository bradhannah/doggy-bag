<script lang="ts">
  /**
   * FamilyMemberForm - Drawer-compatible form for family members
   *
   * @prop editingItem - Family member being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import { dndzone, SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action';
  import { createFamilyMember, updateFamilyMember } from '../../stores/family-members';
  import { activePlans } from '../../stores/insurance-plans';
  import { success, error as showError } from '../../stores/toast';
  import type { FamilyMember, InsurancePlan } from '../../types/insurance';

  export let editingItem: FamilyMember | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let name = editingItem?.name || '';
  let isActive = editingItem?.is_active ?? true;

  // Plans ordering - array of plan IDs in priority order
  // Items need id field for dnd-zone, so we create wrapper objects
  interface PlanItem {
    id: string;
    name: string;
  }
  let assignedPlans: PlanItem[] = [];
  let availablePlans: PlanItem[] = [];
  const flipDurationMs = 200;

  let error = '';
  let saving = false;

  // Initialize plans from editingItem - only assigned plans, not all
  function initializePlans(member: FamilyMember | null, allPlans: InsurancePlan[]) {
    const allPlanItems = allPlans.map((p) => ({ id: p.id, name: p.name }));

    if (member && member.plans && member.plans.length > 0) {
      // Use member's saved plans, filtering to only include active plans
      const activePlanIds = new Set(allPlans.map((p) => p.id));
      const memberAssigned = member.plans
        .filter((id) => activePlanIds.has(id))
        .map((id) => {
          const plan = allPlans.find((p) => p.id === id);
          return { id, name: plan?.name || 'Unknown Plan' };
        });

      // Available = all active plans NOT in member's list
      const memberPlanIds = new Set(member.plans);
      const unassigned = allPlans
        .filter((p) => !memberPlanIds.has(p.id))
        .map((p) => ({ id: p.id, name: p.name }));

      assignedPlans = memberAssigned;
      availablePlans = unassigned;
    } else {
      // New member: no plans assigned by default
      assignedPlans = [];
      availablePlans = allPlanItems;
    }
  }

  // Initialize on mount
  $: initializePlans(editingItem, $activePlans);

  // ===== Dirty tracking for unsaved changes confirmation =====
  interface InitialValues {
    name: string;
    isActive: boolean;
    plans: string[];
  }

  let initialValues: InitialValues = {
    name: editingItem?.name || '',
    isActive: editingItem?.is_active ?? true,
    plans: editingItem?.plans || [],
  };

  export function isDirty(): boolean {
    const currentPlanIds = assignedPlans.map((p) => p.id);
    const plansChanged =
      currentPlanIds.length !== initialValues.plans.length ||
      currentPlanIds.some((id, idx) => id !== initialValues.plans[idx]);
    return name !== initialValues.name || isActive !== initialValues.isActive || plansChanged;
  }

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    isActive = editingItem.is_active;
    // Update initial values for dirty tracking
    initialValues = {
      name: editingItem.name,
      isActive: editingItem.is_active,
      plans: editingItem.plans || [],
    };
  }

  // Drag and drop handlers for assigned plans
  function handleAssignedConsider(e: CustomEvent<{ items: PlanItem[] }>) {
    assignedPlans = e.detail.items;
  }

  function handleAssignedFinalize(e: CustomEvent<{ items: PlanItem[] }>) {
    assignedPlans = e.detail.items.filter((p) => p.id !== SHADOW_PLACEHOLDER_ITEM_ID);
  }

  // Drag and drop handlers for available plans
  function handleAvailableConsider(e: CustomEvent<{ items: PlanItem[] }>) {
    availablePlans = e.detail.items;
  }

  function handleAvailableFinalize(e: CustomEvent<{ items: PlanItem[] }>) {
    availablePlans = e.detail.items.filter((p) => p.id !== SHADOW_PLACEHOLDER_ITEM_ID);
  }

  export async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    saving = true;
    error = '';

    try {
      const planIds = assignedPlans.map((p) => p.id);
      const memberData = {
        name: name.trim(),
        plans: planIds,
      };

      if (editingItem) {
        await updateFamilyMember(editingItem.id, {
          ...memberData,
          is_active: isActive,
        });
        success(`Family member "${name}" updated`);
      } else {
        await createFamilyMember(memberData);
        success(`Family member "${name}" added`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save family member';
      showError(error);
    } finally {
      saving = false;
    }
  }
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="form-group">
    <label for="member-name">Name <span class="required">*</span></label>
    <input
      id="member-name"
      type="text"
      bind:value={name}
      placeholder="e.g., John Smith"
      required
      disabled={saving}
    />
    <span class="help-text">Full name of the family member</span>
  </div>

  {#if editingItem}
    <div class="checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={isActive} disabled={saving} />
        <span class="checkbox-text">
          <strong>Active</strong>
          <span class="checkbox-description">Inactive members won't appear in claim dropdowns</span>
        </span>
      </label>
    </div>
  {/if}

  <!-- Insurance Plans Section -->
  {#if $activePlans.length > 0}
    <div class="plans-section">
      <label class="section-label">
        Insurance Plans
        <span class="section-hint"
          >Drag between sections to assign/unassign • Drag within to reorder</span
        >
      </label>

      <!-- Assigned Plans -->
      <div class="plans-subsection">
        <h4 class="subsection-title">Assigned Plans</h4>
        {#if assignedPlans.length > 0}
          <ul
            class="plans-list assigned-list"
            use:dndzone={{
              items: assignedPlans,
              flipDurationMs,
              dropTargetStyle: {},
              dragDisabled: saving,
            }}
            on:consider={handleAssignedConsider}
            on:finalize={handleAssignedFinalize}
          >
            {#each assignedPlans as plan, index (plan.id)}
              <li class="plan-item">
                <span class="drag-handle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"
                    />
                  </svg>
                </span>
                <span class="plan-order">{index + 1}</span>
                <span class="plan-name">{plan.name}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <ul
            class="plans-list assigned-list empty-drop-zone"
            use:dndzone={{
              items: assignedPlans,
              flipDurationMs,
              dropTargetStyle: {},
              dragDisabled: saving,
            }}
            on:consider={handleAssignedConsider}
            on:finalize={handleAssignedFinalize}
          >
            <li class="empty-placeholder">Drag plans here to assign</li>
          </ul>
        {/if}
      </div>

      <!-- Available Plans -->
      <div class="plans-subsection">
        <h4 class="subsection-title available-title">Available Plans</h4>
        {#if availablePlans.length > 0}
          <ul
            class="plans-list available-list"
            use:dndzone={{
              items: availablePlans,
              flipDurationMs,
              dropTargetStyle: {},
              dragDisabled: saving,
            }}
            on:consider={handleAvailableConsider}
            on:finalize={handleAvailableFinalize}
          >
            {#each availablePlans as plan (plan.id)}
              <li class="plan-item available-item">
                <span class="drag-handle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"
                    />
                  </svg>
                </span>
                <span class="plan-name">{plan.name}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <ul
            class="plans-list available-list empty-drop-zone"
            use:dndzone={{
              items: availablePlans,
              flipDurationMs,
              dropTargetStyle: {},
              dragDisabled: saving,
            }}
            on:consider={handleAvailableConsider}
            on:finalize={handleAvailableFinalize}
          >
            <li class="empty-placeholder">All plans assigned</li>
          </ul>
        {/if}
      </div>
    </div>
  {:else}
    <div class="plans-section">
      <label class="section-label">Insurance Plans</label>
      <p class="empty-plans">
        No insurance plans available. Add plans in the Insurance Plans section first.
      </p>
    </div>
  {/if}

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving}>
      {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Family Member'}
    </button>
  </div>
</form>

<style>
  .entity-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .error-message {
    background: var(--error);
    color: var(--text-on-error, #fff);
    padding: 12px;
    border-radius: 6px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .required {
    color: var(--error);
  }

  input {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--border-default);
    background: var(--input-bg, var(--bg-base));
    color: var(--text-primary);
    font-size: 0.9375rem;
    box-sizing: border-box;
    height: 46px;
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    background: var(--bg-surface);
    border-radius: 8px;
    border: 1px solid var(--border-default);
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
  }

  .checkbox-label input[type='checkbox'] {
    width: 20px;
    height: 20px;
    margin: 0;
    flex-shrink: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .checkbox-label input[type='checkbox']:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkbox-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .checkbox-text strong {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .checkbox-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .btn {
    flex: 1;
    padding: 12px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
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

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  /* Plans section styles */
  .plans-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .section-hint {
    font-weight: 400;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .plans-subsection {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .subsection-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .available-title {
    color: var(--text-tertiary);
  }

  .plans-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 48px;
    border-radius: 8px;
    padding: 4px;
  }

  .assigned-list {
    background: var(--accent-muted);
    border: 1px dashed var(--accent-border, var(--accent));
  }

  .available-list {
    background: var(--bg-surface);
    border: 1px dashed var(--border-default);
  }

  .empty-drop-zone {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-placeholder {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-style: italic;
    padding: 8px;
    pointer-events: none;
  }

  .plan-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-elevated);
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: grab;
    transition: all 0.15s;
  }

  .plan-item:hover {
    background: var(--bg-hover);
    border-color: var(--border-default);
  }

  .available-item {
    opacity: 0.7;
  }

  .available-item:hover {
    opacity: 1;
  }

  .drag-handle {
    color: var(--text-tertiary);
    cursor: grab;
    flex-shrink: 0;
  }

  .plan-item:hover .drag-handle {
    color: var(--text-secondary);
  }

  .plan-order {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--text-inverse);
    font-size: 0.7rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .plan-name {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .empty-plans {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    padding: 16px;
    background: var(--bg-surface);
    border-radius: 8px;
    border: 1px dashed var(--border-default);
    margin: 0;
  }
</style>
