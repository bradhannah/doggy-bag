<script lang="ts">
  /**
   * InsuranceCategoryForm - Drawer-compatible form for insurance categories
   *
   * @prop editingItem - Insurance category being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import {
    createInsuranceCategory,
    updateInsuranceCategory,
    activeCategories,
  } from '../../stores/insurance-categories';
  import { success, error as showError } from '../../stores/toast';
  import type { InsuranceCategory } from '../../types/insurance';

  export let editingItem: InsuranceCategory | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let name = editingItem?.name || '';
  let icon = editingItem?.icon || '';
  let sortOrder = editingItem?.sort_order || $activeCategories.length + 1;
  let isActive = editingItem?.is_active ?? true;

  // Whether this is a predefined category (can only edit is_active)
  $: isPredefined = editingItem?.is_predefined ?? false;

  let error = '';
  let saving = false;

  // ===== Dirty tracking for unsaved changes confirmation =====
  interface InitialValues {
    name: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
  }

  let initialValues: InitialValues = {
    name: editingItem?.name || '',
    icon: editingItem?.icon || '',
    sortOrder: editingItem?.sort_order || $activeCategories.length + 1,
    isActive: editingItem?.is_active ?? true,
  };

  export function isDirty(): boolean {
    return (
      name !== initialValues.name ||
      icon !== initialValues.icon ||
      sortOrder !== initialValues.sortOrder ||
      isActive !== initialValues.isActive
    );
  }

  // Common icons for quick selection
  const commonIcons = [
    '🦷',
    '👁️',
    '💆',
    '🏃',
    '🦴',
    '🧠',
    '💊',
    '🩼',
    '🏥',
    '📋',
    '💉',
    '🩺',
    '🏋️',
    '🧘',
  ];

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    icon = editingItem.icon;
    sortOrder = editingItem.sort_order;
    isActive = editingItem.is_active;
    // Update initial values for dirty tracking
    initialValues = {
      name: editingItem.name,
      icon: editingItem.icon,
      sortOrder: editingItem.sort_order,
      isActive: editingItem.is_active,
    };
  }

  export async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    if (!icon.trim()) {
      error = 'Icon is required';
      return;
    }

    saving = true;
    error = '';

    try {
      if (editingItem) {
        // For predefined categories, only allow updating is_active
        if (isPredefined) {
          await updateInsuranceCategory(editingItem.id, {
            is_active: isActive,
          });
        } else {
          await updateInsuranceCategory(editingItem.id, {
            name: name.trim(),
            icon: icon.trim(),
            sort_order: sortOrder,
            is_active: isActive,
          });
        }
        success(`Insurance category "${name}" updated`);
      } else {
        await createInsuranceCategory({
          name: name.trim(),
          icon: icon.trim(),
          sort_order: sortOrder,
        });
        success(`Insurance category "${name}" added`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save insurance category';
      showError(error);
    } finally {
      saving = false;
    }
  }

  function selectIcon(selectedIcon: string) {
    if (!isPredefined) {
      icon = selectedIcon;
    }
  }
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if isPredefined}
    <div class="info-message">
      This is a predefined category. Only the active status can be changed.
    </div>
  {/if}

  <div class="form-group">
    <label for="cat-name">Category Name <span class="required">*</span></label>
    <input
      id="cat-name"
      type="text"
      bind:value={name}
      placeholder="e.g., Acupuncture"
      required
      disabled={saving || isPredefined}
    />
  </div>

  <div class="form-group">
    <label for="cat-icon">Icon <span class="required">*</span></label>
    <div class="icon-input-row">
      <input
        id="cat-icon"
        type="text"
        bind:value={icon}
        placeholder="Enter emoji"
        required
        disabled={saving || isPredefined}
        class="icon-input"
      />
      <span class="icon-preview">{icon || '?'}</span>
    </div>
    {#if !isPredefined}
      <div class="icon-grid">
        {#each commonIcons as iconOption}
          <button
            type="button"
            class="icon-option"
            class:selected={icon === iconOption}
            on:click={() => selectIcon(iconOption)}
            disabled={saving}
          >
            {iconOption}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if !isPredefined}
    <div class="form-group">
      <label for="cat-sort">Sort Order</label>
      <input id="cat-sort" type="number" bind:value={sortOrder} min="1" disabled={saving} />
      <span class="help-text">Lower numbers appear first in lists</span>
    </div>
  {/if}

  {#if editingItem}
    <div class="checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={isActive} disabled={saving} />
        <span class="checkbox-text">
          <strong>Active</strong>
          <span class="checkbox-description"
            >Inactive categories won't appear when creating claims</span
          >
        </span>
      </label>
    </div>
  {/if}

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving}>
      {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Category'}
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

  .info-message {
    background: var(--info-bg, var(--accent-muted));
    color: var(--info, var(--accent));
    padding: 12px;
    border-radius: 6px;
    font-size: 0.875rem;
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

  .icon-input-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .icon-input {
    flex: 1;
  }

  .icon-preview {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 8px;
  }

  .icon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .icon-option {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .icon-option:hover:not(:disabled) {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .icon-option.selected {
    border-color: var(--accent);
    background: var(--accent-muted);
    box-shadow: 0 0 0 2px var(--accent);
  }

  .icon-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
