<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BillInstance } from '../../stores/months';
  
  export let bills: BillInstance[] = [];
  export let month: string;
  export let loading: boolean = false;
  export let total: number = 0;
  
  const dispatch = createEventDispatcher();
  
  // Edit state
  let editingId: string | null = null;
  let editAmount = '';
  let saving = false;
  let error = '';
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }
  
  function startEdit(bill: BillInstance) {
    editingId = bill.id;
    editAmount = (bill.amount / 100).toFixed(2);
    error = '';
  }
  
  function cancelEdit() {
    editingId = null;
    editAmount = '';
    error = '';
  }
  
  async function saveEdit(id: string) {
    const amountCents = parseDollarsToCents(editAmount);
    if (amountCents < 0) {
      error = 'Amount must be positive';
      return;
    }
    
    saving = true;
    error = '';
    
    try {
      const response = await fetch(`/api/months/${month}/bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountCents })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }
      
      cancelEdit();
      dispatch('refresh');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      saving = false;
    }
  }
  
  async function resetToDefault(id: string) {
    saving = true;
    error = '';
    
    try {
      const response = await fetch(`/api/months/${month}/bills/${id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset');
      }
      
      dispatch('refresh');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      saving = false;
    }
  }
  
  function handleKeydown(event: KeyboardEvent, id: string) {
    if (event.key === 'Enter') {
      saveEdit(id);
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  }
</script>

<div class="bills-card">
  <div class="card-header-row">
    <h3>Bills This Month</h3>
    {#if bills.length > 0}
      <span class="card-total expense">{formatCurrency(total)}</span>
    {/if}
  </div>
  
  {#if loading}
    <p class="loading-text">Loading...</p>
  {:else if bills.length === 0}
    <p class="empty-text">No bills configured. <a href="/setup">Set up bills</a></p>
  {:else}
    <ul class="bills-list">
      {#each bills as bill (bill.id)}
        <li class="bill-item" class:editing={editingId === bill.id} class:modified={!bill.is_default}>
          {#if editingId === bill.id}
            <div class="edit-row">
              <span class="bill-name">{bill.name}</span>
              <div class="edit-input-group">
                <span class="prefix">$</span>
                <input
                  type="text"
                  bind:value={editAmount}
                  on:keydown={(e) => handleKeydown(e, bill.id)}
                  class:error={!!error}
                  disabled={saving}
                  autofocus
                />
              </div>
              <div class="edit-actions">
                <button class="save-btn" on:click={() => saveEdit(bill.id)} disabled={saving}>
                  {saving ? '...' : 'Save'}
                </button>
                <button class="cancel-btn" on:click={cancelEdit} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
            {#if error}
              <p class="error-message">{error}</p>
            {/if}
          {:else}
            <div class="bill-info">
              <div class="bill-details">
                <span class="bill-name">{bill.name}</span>
                {#if !bill.is_default}
                  <span class="modified-badge">modified</span>
                {/if}
              </div>
              <span class="bill-amount expense">{formatCurrency(bill.amount)}</span>
            </div>
            <div class="bill-actions">
              <button class="edit-btn" on:click={() => startEdit(bill)}>Edit</button>
              {#if !bill.is_default}
                <button class="reset-btn" on:click={() => resetToDefault(bill.id)} disabled={saving}>
                  Reset
                </button>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .bills-card {
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #333355;
    padding: 20px;
  }
  
  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .card-header-row h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }
  
  .card-total {
    font-size: 1rem;
    font-weight: 700;
  }
  
  .card-total.expense {
    color: #f87171;
  }
  
  .bills-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .bill-item {
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid transparent;
  }
  
  .bill-item.editing {
    border-color: #24c8db;
  }
  
  .bill-item.modified {
    border-left: 3px solid #f59e0b;
  }
  
  .bill-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .bill-details {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .bill-name {
    color: #e4e4e7;
    font-weight: 500;
  }
  
  .modified-badge {
    font-size: 0.625rem;
    padding: 2px 6px;
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .bill-amount {
    font-weight: 600;
  }
  
  .bill-amount.expense {
    color: #f87171;
  }
  
  .bill-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  
  .edit-btn, .reset-btn {
    padding: 4px 8px;
    background: transparent;
    border: 1px solid #333355;
    border-radius: 4px;
    color: #888;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .edit-btn:hover {
    border-color: #24c8db;
    color: #24c8db;
  }
  
  .reset-btn:hover {
    border-color: #f59e0b;
    color: #f59e0b;
  }
  
  .edit-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  
  .edit-input-group {
    position: relative;
    flex: 1;
    min-width: 100px;
    max-width: 150px;
  }
  
  .edit-input-group .prefix {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
    font-size: 0.875rem;
  }
  
  .edit-input-group input {
    width: 100%;
    padding: 6px 8px 6px 24px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 4px;
    color: #e4e4e7;
    font-size: 0.875rem;
  }
  
  .edit-input-group input:focus {
    outline: none;
    border-color: #24c8db;
  }
  
  .edit-input-group input.error {
    border-color: #f87171;
  }
  
  .edit-actions {
    display: flex;
    gap: 8px;
  }
  
  .save-btn, .cancel-btn {
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .save-btn {
    background: #24c8db;
    border: none;
    color: #000;
  }
  
  .save-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .cancel-btn {
    background: transparent;
    border: 1px solid #333355;
    color: #888;
  }
  
  .cancel-btn:hover {
    border-color: #e4e4e7;
    color: #e4e4e7;
  }
  
  .save-btn:disabled, .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .error-message {
    color: #f87171;
    font-size: 0.75rem;
    margin: 8px 0 0 0;
  }
  
  .loading-text, .empty-text {
    color: #888;
    font-size: 0.875rem;
    text-align: center;
    padding: 20px;
  }
  
  .empty-text a {
    color: #24c8db;
    text-decoration: none;
  }
  
  .empty-text a:hover {
    text-decoration: underline;
  }
</style>
