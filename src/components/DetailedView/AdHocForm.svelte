<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import { categories, loadCategories } from '../../stores/categories';
  import { success, error as showError } from '../../stores/toast';
  
  export let open = false;
  export let month: string;
  export let type: 'bill' | 'income' = 'bill';
  export let defaultCategoryId: string = '';
  
  const dispatch = createEventDispatcher();
  
  let name = '';
  let amount = '';
  let categoryId = '';
  let saving = false;
  let error = '';
  
  // Filter categories by type
  $: filteredCategories = $categories.filter(c => {
    // Show categories matching type, or 'Ad-hoc' category
    const catType = (c as any).type;
    return catType === type || c.name === 'Ad-hoc';
  });
  
  // Set default category when form opens
  $: if (open && defaultCategoryId && categoryId === '') {
    categoryId = defaultCategoryId;
  }
  
  onMount(async () => {
    if ($categories.length === 0) {
      await loadCategories();
    }
  });
  
  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }
  
  function handleClose() {
    open = false;
    resetForm();
    dispatch('close');
  }
  
  function resetForm() {
    name = '';
    amount = '';
    categoryId = defaultCategoryId || '';
    error = '';
  }
  
  async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }
    
    const amountCents = parseDollarsToCents(amount);
    if (amountCents <= 0) {
      error = 'Please enter a valid amount';
      return;
    }
    
    saving = true;
    error = '';
    
    try {
      const endpoint = type === 'bill' 
        ? `/api/months/${month}/adhoc/bills`
        : `/api/months/${month}/adhoc/incomes`;
      
      const payload: any = {
        name: name.trim(),
        amount: amountCents
      };
      
      if (categoryId) {
        payload.category_id = categoryId;
      }
      
      await apiClient.post(endpoint, payload);
      
      success(`Ad-hoc ${type} added`);
      dispatch('created');
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to add ad-hoc ${type}`;
      showError(error);
    } finally {
      saving = false;
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="drawer-backdrop" on:click={handleBackdropClick}>
    <div class="drawer">
      <header class="drawer-header">
        <h3>Add Ad-hoc {type === 'bill' ? 'Bill' : 'Income'}</h3>
        <button class="close-btn" on:click={handleClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </header>
      
      <div class="drawer-content">
        <p class="description">
          Add a one-time {type} for this month only. You can convert it to a recurring {type} later.
        </p>
        
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="name">Name</label>
            <input
              id="name"
              type="text"
              bind:value={name}
              placeholder={type === 'bill' ? 'e.g., Car Repair' : 'e.g., Bonus'}
              disabled={saving}
              class:error={!!error && !name.trim()}
            />
          </div>
          
          <div class="form-group">
            <label for="amount">Amount</label>
            <div class="amount-input-group">
              <span class="prefix">$</span>
              <input
                id="amount"
                type="text"
                bind:value={amount}
                placeholder="0.00"
                disabled={saving}
                class:error={!!error && parseDollarsToCents(amount) <= 0}
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="category">Category (Optional)</label>
            <select
              id="category"
              bind:value={categoryId}
              disabled={saving}
            >
              <option value="">-- Select Category --</option>
              {#each filteredCategories as category}
                <option value={category.id}>{category.name}</option>
              {/each}
            </select>
          </div>
          
          {#if error}
            <p class="error-message">{error}</p>
          {/if}
          
          <div class="form-actions">
            <button type="button" class="cancel-btn" on:click={handleClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" class="submit-btn" disabled={saving}>
              {saving ? 'Adding...' : `Add ${type === 'bill' ? 'Bill' : 'Income'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: flex-end;
    z-index: 1000;
  }
  
  .drawer {
    width: 100%;
    max-width: 400px;
    height: 100%;
    background: #1a1a2e;
    border-left: 1px solid #333355;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #333355;
  }
  
  .drawer-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }
  
  .close-btn:hover {
    color: #e4e4e7;
  }
  
  .drawer-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }
  
  .description {
    color: #888;
    font-size: 0.875rem;
    margin-bottom: 24px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    font-size: 0.875rem;
    color: #888;
    margin-bottom: 8px;
  }
  
  .form-group input[type="text"],
  .form-group select {
    width: 100%;
    padding: 10px 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 1rem;
    height: 42px;
    box-sizing: border-box;
  }
  
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #24c8db;
  }
  
  .form-group input.error,
  .form-group select.error {
    border-color: #f87171;
  }
  
  .amount-input-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .amount-input-group .prefix {
    color: #888;
    font-size: 1rem;
  }
  
  .amount-input-group input {
    flex: 1;
    padding: 10px 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 1rem;
  }
  
  .amount-input-group input:focus {
    outline: none;
    border-color: #24c8db;
  }
  
  .amount-input-group input.error {
    border-color: #f87171;
  }
  
  .error-message {
    color: #f87171;
    font-size: 0.875rem;
    margin: 0 0 16px 0;
  }
  
  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }
  
  .cancel-btn, .submit-btn {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn {
    background: transparent;
    border: 1px solid #333355;
    color: #888;
  }
  
  .cancel-btn:hover:not(:disabled) {
    border-color: #e4e4e7;
    color: #e4e4e7;
  }
  
  .submit-btn {
    background: #24c8db;
    border: none;
    color: #000;
  }
  
  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .cancel-btn:disabled, .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
