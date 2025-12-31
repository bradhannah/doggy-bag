<script lang="ts">
  /**
   * CategoryForm - Drawer-compatible form for categories
   * 
   * @prop editingItem - Category being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import { createCategory, updateCategory } from '../../stores/categories';
  import type { Category } from '../../stores/categories';
  import { success, error as showError } from '../../stores/toast';

  export let editingItem: Category | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state
  let name = editingItem?.name || '';
  let error = '';
  let saving = false;

  // Check if this is a predefined category (can't edit predefined categories)
  $: isPredefined = editingItem?.is_predefined || false;

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
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
        await updateCategory(editingItem.id, { name });
        success('Category updated');
      } else {
        await createCategory({ name });
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
  {#if isPredefined}
    <div class="info-message">
      This is a predefined category and cannot be edited.
    </div>
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

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    {#if !isPredefined}
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {saving ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Category')}
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

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 500;
    font-size: 14px;
    color: #e4e4e7;
  }

  input {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #333355;
    background: #0f0f0f;
    color: #fff;
    font-size: 15px;
  }

  input:focus {
    outline: none;
    border-color: #24c8db;
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    font-size: 14px;
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
