<script lang="ts">
  /**
   * CategoryForm - Drawer-compatible form for categories
   *
   * @prop editingItem - Category being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import { createCategory, updateCategory } from '../../stores/categories';
  import type { Category, CategoryType } from '../../stores/categories';
  import { success, error as showError } from '../../stores/toast';

  export let editingItem: Category | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};
  export let defaultType: CategoryType = 'bill'; // Default type when creating new

  // Form state
  let name = editingItem?.name || '';
  let type: CategoryType = editingItem?.type || defaultType;
  let color = editingItem?.color || '#24c8db';
  let error = '';
  let saving = false;

  // Check if this is a predefined category (can't edit predefined categories)
  $: isPredefined = editingItem?.is_predefined || false;

  // Check if this is the Variable Expenses category (special system category)
  $: isVariableCategory = (editingItem as { type?: string })?.type === 'variable';

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    type = editingItem.type;
    color = editingItem.color || '#24c8db';
  }

  async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    // Don't allow editing predefined categories
    if (isPredefined) {
      error = 'Cannot edit predefined categories';
      return;
    }

    saving = true;
    error = '';

    try {
      if (editingItem) {
        await updateCategory(editingItem.id, { name, type, color });
        success('Category updated');
      } else {
        await createCategory({ name, type, color });
        success('Category created');
      }
      onSave();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save category';
      error = msg;
      showError(msg);
    } finally {
      saving = false;
    }
  }
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if isVariableCategory}
    <div class="info-message variable">
      <strong>Variable Expenses</strong> is a system category. Add ad-hoc items to this category from
      the monthly view.
    </div>
  {:else if isPredefined}
    <div class="info-message">This is a predefined category and cannot be edited.</div>
  {/if}

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="form-group">
    <label for="cat-name">Category Name</label>
    <input
      id="cat-name"
      type="text"
      bind:value={name}
      placeholder="e.g., Subscriptions"
      required
      disabled={saving || isPredefined}
    />
  </div>

  <div class="form-group">
    <label for="cat-type">Category Type</label>
    <select
      id="cat-type"
      bind:value={type}
      disabled={saving || isPredefined || isVariableCategory || !!editingItem}
    >
      <option value="bill">Bill Category</option>
      <option value="income">Income Category</option>
      {#if isVariableCategory}
        <!-- Only show variable option if editing the Variable Expenses category -->
        <option value="variable">Variable Expense Category</option>
      {/if}
    </select>
    <div class="help-text">
      {#if type === 'bill'}
        Used to organize fixed recurring bills in the monthly view
      {:else if type === 'income'}
        Used to organize income sources in the monthly view
      {:else}
        System category for one-off variable expenses (managed automatically)
      {/if}
    </div>
    {#if editingItem}
      <div class="help-text warning">Category type cannot be changed after creation</div>
    {/if}
  </div>

  <div class="form-group">
    <label for="cat-color">Color</label>
    <div class="color-input-wrapper">
      <input id="cat-color" type="color" bind:value={color} disabled={saving || isPredefined} />
      <span class="color-preview" style="background-color: {color}">{color}</span>
    </div>
    <div class="help-text">Used for the category header accent color</div>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    {#if !isPredefined}
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Category'}
      </button>
    {/if}
  </div>
</form>

<style>
  .entity-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .error-message {
    background: #ff4444;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
  }

  .info-message {
    background: rgba(36, 200, 219, 0.2);
    color: #24c8db;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #24c8db;
  }

  .info-message.variable {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 500;
    font-size: 0.875rem;
    color: #e4e4e7;
  }

  input,
  select {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #333355;
    background: #0f0f0f;
    color: #fff;
    font-size: 0.9375rem;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #24c8db;
  }

  input:disabled,
  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .help-text {
    font-size: 0.75rem;
    color: #888;
    margin-top: 4px;
  }

  .help-text.warning {
    color: #f59e0b;
  }

  .color-input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  input[type='color'] {
    width: 50px;
    height: 40px;
    padding: 2px;
    border-radius: 6px;
    cursor: pointer;
  }

  .color-preview {
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.8125rem;
    color: #fff;
    font-family: monospace;
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
    background: #24c8db;
    color: #000;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1ab0c9;
  }

  .btn-secondary {
    background: #333355;
    color: #fff;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #444466;
  }
</style>
