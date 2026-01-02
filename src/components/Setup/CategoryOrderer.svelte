<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dndzone, SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action';
  import type { Category, CategoryType } from '../../stores/categories';
  import { reorderCategories, updateCategory, deleteCategory } from '../../stores/categories';
  import { success, error as showError } from '../../stores/toast';
  
  export let categories: Category[] = [];
  export let type: CategoryType;
  
  const dispatch = createEventDispatcher();
  
  // Delete confirmation state
  let confirmingDeleteId: string | null = null;
  const flipDurationMs = 200;
  
  // Local display order - synced with prop but can be updated optimistically
  let displayCategories: Category[] = [];
  
  // Sync display categories when prop changes
  $: {
    displayCategories = [...categories];
  }
  
  // Color picker refs - one per category
  let colorInputs: { [key: string]: HTMLInputElement } = {};
  
  function handleDndConsider(e: CustomEvent<{ items: Category[] }>) {
    // This fires during drag - update display for visual feedback
    displayCategories = e.detail.items;
  }
  
  async function handleDndFinalize(e: CustomEvent<{ items: Category[] }>) {
    // This fires when drop completes
    displayCategories = e.detail.items;
    
    // Filter out shadow placeholder items
    const orderedIds = displayCategories
      .filter(c => c.id !== SHADOW_PLACEHOLDER_ITEM_ID)
      .map(c => c.id);
    
    // Check if order actually changed
    const originalIds = categories.map(c => c.id);
    const orderChanged = orderedIds.some((id, idx) => id !== originalIds[idx]);
    
    if (orderChanged) {
      await saveOrder(orderedIds);
    }
  }
  
  async function saveOrder(orderedIds: string[]) {
    try {
      await reorderCategories(type, orderedIds);
      success('Category order saved');
      dispatch('reordered');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save order';
      showError(message);
      // On error, revert to prop value
      displayCategories = [...categories];
    }
  }
  
  function getCategoryLabel(cat: Category): string {
    return cat.name;
  }
  
  function openColorPicker(catId: string) {
    const input = colorInputs[catId];
    if (input) {
      input.click();
    }
  }
  
  async function handleColorChange(cat: Category, newColor: string) {
    if (newColor === cat.color) return;
    
    try {
      await updateCategory(cat.id, { color: newColor });
      success(`Updated ${cat.name} color`);
      dispatch('colorChanged', { id: cat.id, color: newColor });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update color';
      showError(message);
    }
  }
  
  function handleEdit(cat: Category) {
    dispatch('edit', { category: cat });
  }
  
  function startDelete(catId: string) {
    confirmingDeleteId = catId;
  }
  
  function cancelDelete() {
    confirmingDeleteId = null;
  }
  
  async function confirmDeleteCategory(cat: Category) {
    try {
      await deleteCategory(cat.id);
      success(`Deleted "${cat.name}"`);
      confirmingDeleteId = null;
      dispatch('deleted', { id: cat.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      showError(message);
    }
  }
</script>

<div class="category-orderer">
  <h4>{type === 'bill' ? 'Bill Categories' : 'Income Categories'}</h4>
  
  {#if displayCategories.length === 0}
    <p class="empty-text">No {type} categories yet.</p>
  {:else}
    <ul 
      class="category-list"
      use:dndzone={{ 
        items: displayCategories, 
        flipDurationMs,
        dropTargetStyle: {},
        dragDisabled: false
      }}
      on:consider={handleDndConsider}
      on:finalize={handleDndFinalize}
    >
      {#each displayCategories as cat (cat.id)}
        <li class="category-item">
          <span class="drag-handle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
            </svg>
          </span>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span 
            class="category-color" 
            style="background-color: {cat.color}"
            on:click|stopPropagation={() => openColorPicker(cat.id)}
            title="Click to change color"
          >
            <input
              type="color"
              class="color-input"
              bind:this={colorInputs[cat.id]}
              value={cat.color}
              on:change={(e) => handleColorChange(cat, e.currentTarget.value)}
              on:click|stopPropagation
            />
          </span>
          <span class="category-name">{getCategoryLabel(cat)}</span>
          {#if cat.is_predefined}
            <span class="predefined-badge">default</span>
          {/if}
          
          <!-- Action buttons -->
          <div class="item-actions" on:click|stopPropagation>
            {#if confirmingDeleteId === cat.id}
              <span class="confirm-text">Delete?</span>
              <button class="btn-icon btn-confirm" on:click={() => confirmDeleteCategory(cat)} title="Confirm delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <button class="btn-icon btn-cancel" on:click={cancelDelete} title="Cancel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            {:else}
              <button class="btn-icon btn-edit" on:click={() => handleEdit(cat)} title="Edit category">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              {#if !cat.is_predefined}
                <button class="btn-icon btn-delete" on:click={() => startDelete(cat.id)} title="Delete category">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              {/if}
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
  
  <p class="hint">Drag to reorder - Click color to change</p>
</div>

<style>
  .category-orderer {
    margin-bottom: 24px;
  }
  
  h4 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .empty-text {
    color: #666;
    font-size: 0.875rem;
  }
  
  .category-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .category-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: grab;
    transition: all 0.15s;
  }
  
  .category-item:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: #333355;
  }
  
  .drag-handle {
    color: #555;
    cursor: grab;
  }
  
  .category-item:hover .drag-handle {
    color: #888;
  }
  
  .category-color {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    flex-shrink: 0;
    cursor: pointer;
    position: relative;
    border: 2px solid transparent;
    transition: border-color 0.15s, transform 0.15s;
  }
  
  .category-color:hover {
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
  
  .color-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  
  .category-name {
    flex: 1;
    font-size: 0.9rem;
    color: #e4e4e7;
  }
  
  .predefined-badge {
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #666;
    padding: 2px 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  .item-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    opacity: 0;
    transition: opacity 0.15s;
  }
  
  .category-item:hover .item-actions {
    opacity: 1;
  }
  
  .confirm-text {
    font-size: 0.7rem;
    color: #ef4444;
    margin-right: 4px;
  }
  
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    transition: all 0.15s;
  }
  
  .btn-edit {
    color: #888;
  }
  
  .btn-edit:hover {
    background: rgba(36, 200, 219, 0.15);
    color: #24c8db;
  }
  
  .btn-delete {
    color: #888;
  }
  
  .btn-delete:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }
  
  .btn-confirm {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }
  
  .btn-confirm:hover {
    background: rgba(34, 197, 94, 0.2);
  }
  
  .btn-cancel {
    color: #888;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e4e4e7;
  }
  
  .hint {
    margin: 12px 0 0 0;
    font-size: 0.75rem;
    color: #555;
  }
</style>
