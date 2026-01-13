<script lang="ts">
  /**
   * InsurancePlanForm - Drawer-compatible form for insurance plans
   *
   * @prop editingItem - Insurance plan being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import {
    createInsurancePlan,
    updateInsurancePlan,
    activePlans,
  } from '../../stores/insurance-plans';
  import { success, error as showError } from '../../stores/toast';
  import type { InsurancePlan } from '../../types/insurance';

  export let editingItem: InsurancePlan | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let name = editingItem?.name || '';
  let providerName = editingItem?.provider_name || '';
  let policyNumber = editingItem?.policy_number || '';
  let memberId = editingItem?.member_id || '';
  let owner = editingItem?.owner || '';
  let priority = editingItem?.priority || $activePlans.length + 1;
  let portalUrl = editingItem?.portal_url || '';
  let notes = editingItem?.notes || '';
  let isActive = editingItem?.is_active ?? true;

  let error = '';
  let saving = false;

  // ===== Dirty tracking for unsaved changes confirmation =====
  interface InitialValues {
    name: string;
    providerName: string;
    policyNumber: string;
    memberId: string;
    owner: string;
    priority: number;
    portalUrl: string;
    notes: string;
    isActive: boolean;
  }

  let initialValues: InitialValues = {
    name: editingItem?.name || '',
    providerName: editingItem?.provider_name || '',
    policyNumber: editingItem?.policy_number || '',
    memberId: editingItem?.member_id || '',
    owner: editingItem?.owner || '',
    priority: editingItem?.priority || $activePlans.length + 1,
    portalUrl: editingItem?.portal_url || '',
    notes: editingItem?.notes || '',
    isActive: editingItem?.is_active ?? true,
  };

  export function isDirty(): boolean {
    return (
      name !== initialValues.name ||
      providerName !== initialValues.providerName ||
      policyNumber !== initialValues.policyNumber ||
      memberId !== initialValues.memberId ||
      owner !== initialValues.owner ||
      priority !== initialValues.priority ||
      portalUrl !== initialValues.portalUrl ||
      notes !== initialValues.notes ||
      isActive !== initialValues.isActive
    );
  }

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    providerName = editingItem.provider_name || '';
    policyNumber = editingItem.policy_number || '';
    memberId = editingItem.member_id || '';
    owner = editingItem.owner || '';
    priority = editingItem.priority;
    portalUrl = editingItem.portal_url || '';
    notes = editingItem.notes || '';
    isActive = editingItem.is_active;
    // Update initial values for dirty tracking
    initialValues = {
      name: editingItem.name,
      providerName: editingItem.provider_name || '',
      policyNumber: editingItem.policy_number || '',
      memberId: editingItem.member_id || '',
      owner: editingItem.owner || '',
      priority: editingItem.priority,
      portalUrl: editingItem.portal_url || '',
      notes: editingItem.notes || '',
      isActive: editingItem.is_active,
    };
  }

  export async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    if (priority < 1) {
      error = 'Priority must be at least 1';
      return;
    }

    saving = true;
    error = '';

    try {
      const planData = {
        name: name.trim(),
        provider_name: providerName.trim() || undefined,
        policy_number: policyNumber.trim() || undefined,
        member_id: memberId.trim() || undefined,
        owner: owner.trim() || undefined,
        priority,
        portal_url: portalUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingItem) {
        await updateInsurancePlan(editingItem.id, {
          ...planData,
          is_active: isActive,
        });
        success(`Insurance plan "${name}" updated`);
      } else {
        await createInsurancePlan(planData);
        success(`Insurance plan "${name}" added`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save insurance plan';
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
    <label for="plan-name">Plan Name <span class="required">*</span></label>
    <input
      id="plan-name"
      type="text"
      bind:value={name}
      placeholder="e.g., Blue Cross Extended Health"
      required
      disabled={saving}
    />
  </div>

  <div class="form-group">
    <label for="plan-provider">Provider Name</label>
    <input
      id="plan-provider"
      type="text"
      bind:value={providerName}
      placeholder="e.g., Blue Cross"
      disabled={saving}
    />
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="plan-policy">Policy Number</label>
      <input
        id="plan-policy"
        type="text"
        bind:value={policyNumber}
        placeholder="e.g., 12345678"
        disabled={saving}
      />
    </div>

    <div class="form-group">
      <label for="plan-member">Member ID</label>
      <input
        id="plan-member"
        type="text"
        bind:value={memberId}
        placeholder="e.g., ABC123"
        disabled={saving}
      />
    </div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="plan-owner">Owner</label>
      <input
        id="plan-owner"
        type="text"
        bind:value={owner}
        placeholder="e.g., John, Jane"
        disabled={saving}
      />
      <span class="help-text">Who this plan belongs to</span>
    </div>

    <div class="form-group">
      <label for="plan-priority">Priority <span class="required">*</span></label>
      <input
        id="plan-priority"
        type="number"
        bind:value={priority}
        min="1"
        required
        disabled={saving}
      />
      <span class="help-text">Lower numbers = higher priority (1 is primary)</span>
    </div>
  </div>

  <div class="form-group">
    <label for="plan-portal">Portal URL</label>
    <input
      id="plan-portal"
      type="url"
      bind:value={portalUrl}
      placeholder="https://portal.insurance.com"
      disabled={saving}
    />
  </div>

  <div class="form-group">
    <label for="plan-notes">Notes</label>
    <textarea
      id="plan-notes"
      bind:value={notes}
      placeholder="Optional notes about this plan..."
      disabled={saving}
      rows="3"
    ></textarea>
  </div>

  {#if editingItem}
    <div class="checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={isActive} disabled={saving} />
        <span class="checkbox-text">
          <strong>Active</strong>
          <span class="checkbox-description">Inactive plans won't appear in claim submissions</span>
        </span>
      </label>
    </div>
  {/if}

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving}>
      {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Insurance Plan'}
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

  input,
  textarea {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--border-default);
    background: var(--input-bg, var(--bg-base));
    color: var(--text-primary);
    font-size: 0.9375rem;
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
  }

  input {
    height: 46px;
  }

  textarea {
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  input:disabled,
  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .form-row {
    display: flex;
    gap: 16px;
    width: 100%;
  }

  .form-row .form-group {
    flex: 1;
    min-width: 0;
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
</style>
