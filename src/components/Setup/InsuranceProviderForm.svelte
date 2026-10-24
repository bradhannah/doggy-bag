<script lang="ts">
  import {
    createInsuranceProvider,
    updateInsuranceProvider,
  } from '../../stores/insurance-providers';
  import { activeCategories, loadInsuranceCategories } from '../../stores/insurance-categories';
  import { success, error as showError } from '../../stores/toast';
  import type { InsuranceProvider } from '../../types/insurance';
  import { onMount } from 'svelte';

  export let editingItem: InsuranceProvider | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  let name = editingItem?.name || '';
  let description = editingItem?.description || '';
  let categoryIdSet = new Set<string>(editingItem?.category_ids || []);
  let isActive = editingItem?.is_active ?? true;

  let error = '';
  let saving = false;

  onMount(() => {
    loadInsuranceCategories();
  });

  // Initial values for dirty tracking
  interface InitialValues {
    name: string;
    description: string;
    activeCategoryIds: string[];
    isActive: boolean;
  }

  function computeInitialValues(): InitialValues {
    return {
      name: editingItem?.name || '',
      description: editingItem?.description || '',
      activeCategoryIds: [...(editingItem?.category_ids || [])].sort(),
      isActive: editingItem?.is_active ?? true,
    };
  }

  let initialValues: InitialValues = computeInitialValues();

  function currentCategoryIds(): string[] {
    return [...categoryIdSet].sort();
  }

  export function isDirty(): boolean {
    return (
      name !== initialValues.name ||
      description !== initialValues.description ||
      JSON.stringify(currentCategoryIds()) !== JSON.stringify(initialValues.activeCategoryIds) ||
      isActive !== initialValues.isActive
    );
  }

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    description = editingItem.description || '';
    categoryIdSet = new Set<string>(editingItem.category_ids || []);
    isActive = editingItem.is_active;
    initialValues = computeInitialValues();
  }

  function toggleCategory(catId: string) {
    if (categoryIdSet.has(catId)) {
      categoryIdSet.delete(catId);
    } else {
      categoryIdSet.add(catId);
    }
    // Trigger reactivity by creating a new Set
    categoryIdSet = new Set(categoryIdSet);
  }

  export async function handleSubmit() {
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    const selectedCategoryIds = [...categoryIdSet];
    if (selectedCategoryIds.length === 0) {
      error = 'At least one category is required';
      return;
    }

    saving = true;
    error = '';

    try {
      const providerData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category_ids: selectedCategoryIds,
      };

      if (editingItem) {
        await updateInsuranceProvider(editingItem.id, { ...providerData, is_active: isActive });
        success(`Provider "${name}" updated`);
      } else {
        await createInsuranceProvider(providerData);
        success(`Provider "${name}" added`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save provider';
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
    <label for="provider-name">Name <span class="required">*</span></label>
    <input
      id="provider-name"
      type="text"
      bind:value={name}
      placeholder="e.g., Dr. Smith Dental Clinic"
      required
      disabled={saving}
    />
  </div>

  <div class="form-group">
    <label for="provider-description">Description</label>
    <textarea
      id="provider-description"
      bind:value={description}
      placeholder="Optional notes about this provider (e.g., location, hours)"
      disabled={saving}
      rows="3"
    ></textarea>
  </div>

  <div class="form-group">
    <span class="field-label">Categories <span class="required">*</span></span>
    <span class="help-text"
      >Select all categories this provider services (used to filter on claims)</span
    >
    <div class="category-checkbox-grid">
      {#each $activeCategories as cat (cat.id)}
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={categoryIdSet.has(cat.id)}
            on:change={() => toggleCategory(cat.id)}
            disabled={saving}
          />
          <span class="checkbox-text">
            <span class="category-icon">{cat.icon}</span>
            <span class="category-name">{cat.name}</span>
          </span>
        </label>
      {/each}
    </div>
  </div>

  {#if editingItem}
    <div class="checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={isActive} disabled={saving} />
        <span class="checkbox-text">
          <strong>Active</strong>
          <span class="checkbox-description"
            >Inactive providers won't appear in claim dropdowns</span
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
      {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Provider'}
    </button>
  </div>
</form>

<style>
  .entity-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .error-message {
    background: var(--error);
    color: var(--text-inverse);
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .field-label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .required {
    color: var(--error);
  }

  input,
  textarea {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 0.0625rem solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-primary);
    font-size: 0.9375rem;
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
  }

  input {
    height: 2.875rem;
  }

  textarea {
    font-family: inherit;
    resize: vertical;
    min-height: 5rem;
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

  .category-checkbox-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    border: 0.0625rem solid var(--border-default);
  }

  .category-checkbox-grid .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    cursor: pointer;
    padding: var(--space-1) 0;
  }

  .category-checkbox-grid input[type='checkbox'] {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0;
    flex-shrink: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .checkbox-text {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .category-icon {
    font-size: 1rem;
  }

  .category-name {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 0.0625rem solid var(--border-default);
  }

  .checkbox-group .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    cursor: pointer;
  }

  .checkbox-group input[type='checkbox'] {
    width: 1.25rem;
    height: 1.25rem;
    margin: 0;
    flex-shrink: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .checkbox-group .checkbox-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .checkbox-group .checkbox-text strong {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .checkbox-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-5);
  }

  .btn {
    flex: 1;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
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
