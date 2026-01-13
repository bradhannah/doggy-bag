<script lang="ts">
  /**
   * FamilyMemberForm - Drawer-compatible form for family members
   *
   * @prop editingItem - Family member being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import { createFamilyMember, updateFamilyMember } from '../../stores/family-members';
  import { success, error as showError } from '../../stores/toast';
  import type { FamilyMember } from '../../types/insurance';

  export let editingItem: FamilyMember | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let name = editingItem?.name || '';
  let isActive = editingItem?.is_active ?? true;

  let error = '';
  let saving = false;

  // ===== Dirty tracking for unsaved changes confirmation =====
  interface InitialValues {
    name: string;
    isActive: boolean;
  }

  let initialValues: InitialValues = {
    name: editingItem?.name || '',
    isActive: editingItem?.is_active ?? true,
  };

  export function isDirty(): boolean {
    return name !== initialValues.name || isActive !== initialValues.isActive;
  }

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    isActive = editingItem.is_active;
    // Update initial values for dirty tracking
    initialValues = {
      name: editingItem.name,
      isActive: editingItem.is_active,
    };
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
      const memberData = {
        name: name.trim(),
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
</style>
