<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { VariableExpense } from '../../stores/months';
  import type { PaymentSource } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';
  import ConfirmDialog from '../shared/ConfirmDialog.svelte';
  
  export let expenses: VariableExpense[] = [];
  export let month: string;
  export let loading: boolean = false;
  export let total: number = 0;
  export let paymentSources: PaymentSource[] = [];
  
  const dispatch = createEventDispatcher();
  
  // Form state
  let showForm = false;
  let editingId: string | null = null;
  let name = '';
  let amount = '';
  let paymentSourceId = '';
  let saving = false;
  let error = '';
  
  // Delete confirmation state
  let showDeleteConfirm = false;
  let expenseToDelete: VariableExpense | null = null;
  
  function confirmDeleteExpense(expense: VariableExpense) {
    expenseToDelete = expense;
    showDeleteConfirm = true;
  }
  
  function cancelDeleteExpense() {
    showDeleteConfirm = false;
    expenseToDelete = null;
  }
  
  async function handleConfirmDelete() {
    if (expenseToDelete) {
      await deleteExpense(expenseToDelete.id);
    }
  }
  
  // Helper to get payment source name
  function getPaymentSourceName(id: string | undefined): string | null {
    if (!id) return null;
    const source = paymentSources.find(ps => ps.id === id);
    return source ? source.name : null;
  }
  
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
  
  function openAddForm() {
    editingId = null;
    name = '';
    amount = '';
    paymentSourceId = paymentSources.length > 0 ? paymentSources[0].id : '';
    error = '';
    showForm = true;
  }
  
  function openEditForm(expense: VariableExpense) {
    editingId = expense.id;
    name = expense.name;
    amount = (expense.amount / 100).toFixed(2);
    paymentSourceId = expense.payment_source_id || '';
    error = '';
    showForm = true;
  }
  
  function cancelForm() {
    showForm = false;
    editingId = null;
    name = '';
    amount = '';
    paymentSourceId = '';
    error = '';
  }
  
  async function saveExpense() {
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }
    
    const amountCents = parseDollarsToCents(amount);
    if (amountCents <= 0) {
      error = 'Amount must be greater than 0';
      return;
    }
    
    saving = true;
    error = '';
    
    try {
      const payload: Record<string, unknown> = { 
        name: name.trim(), 
        amount: amountCents 
      };
      
      if (paymentSourceId) {
        payload.payment_source_id = paymentSourceId;
      }
      
      if (editingId) {
        // Update existing
        const response = await fetch(`http://localhost:3000/api/months/${month}/expenses/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update expense');
        }
        success('Expense updated');
      } else {
        // Create new
        const response = await fetch(`http://localhost:3000/api/months/${month}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create expense');
        }
        success('Expense added');
      }
      
      cancelForm();
      dispatch('refresh');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      showError(error);
    } finally {
      saving = false;
    }
  }
  
  async function deleteExpense(id: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/months/${month}/expenses/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete expense');
      }
      
      showDeleteConfirm = false;
      expenseToDelete = null;
      dispatch('refresh');
      success('Expense deleted');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      showError(error);
    }
  }
</script>

<div class="expenses-card">
  <div class="card-header">
    <div class="card-header-left">
      <h3>Variable Expenses</h3>
      {#if expenses.length > 0}
        <span class="card-total">{formatCurrency(total)}</span>
      {/if}
    </div>
    {#if !showForm}
      <button class="add-btn" on:click={openAddForm}>+ Add</button>
    {/if}
  </div>
  
  {#if showForm}
    <form class="expense-form" on:submit|preventDefault={saveExpense}>
      <div class="form-row">
        <input 
          type="text" 
          placeholder="Expense name (e.g., Groceries)"
          bind:value={name}
          class:error={error && !name.trim()}
        />
      </div>
      <div class="form-row">
        <div class="amount-input">
          <span class="prefix">$</span>
          <input 
            type="text" 
            placeholder="0.00"
            bind:value={amount}
            class:error={error && parseDollarsToCents(amount) <= 0}
          />
        </div>
      </div>
      {#if paymentSources.length > 0}
        <div class="form-row">
          <select bind:value={paymentSourceId} class="payment-source-select">
            <option value="">No payment source</option>
            {#each paymentSources as source}
              <option value={source.id}>{source.name}</option>
            {/each}
          </select>
        </div>
      {/if}
      {#if error}
        <p class="error-message">{error}</p>
      {/if}
      <div class="form-actions">
        <button type="button" class="cancel-btn" on:click={cancelForm} disabled={saving}>
          Cancel
        </button>
        <button type="submit" class="save-btn" disabled={saving}>
          {saving ? 'Saving...' : (editingId ? 'Update' : 'Add')}
        </button>
      </div>
    </form>
  {/if}
  
  {#if loading}
    <p class="loading-text">Loading...</p>
  {:else if expenses.length === 0 && !showForm}
    <p class="empty-text">No variable expenses yet. Click + Add to track groceries, gas, etc.</p>
  {:else}
    <ul class="expenses-list">
      {#each expenses as expense (expense.id)}
        <li class="expense-item" class:editing={editingId === expense.id}>
          <div class="expense-info">
            <div class="expense-details">
              <span class="expense-name">{expense.name}</span>
              {#if getPaymentSourceName(expense.payment_source_id)}
                <span class="expense-source">{getPaymentSourceName(expense.payment_source_id)}</span>
              {/if}
            </div>
            <span class="expense-amount">{formatCurrency(expense.amount)}</span>
          </div>
          <div class="expense-actions">
              <button class="edit-btn" on:click={() => openEditForm(expense)}>Edit</button>
              <button class="delete-btn" on:click={() => confirmDeleteExpense(expense)}>Delete</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Expense"
  message="Are you sure you want to delete '{expenseToDelete?.name}'? This action cannot be undone."
  confirmText="Delete"
  on:confirm={handleConfirmDelete}
  on:cancel={cancelDeleteExpense}
/>

<style>
  .expenses-card {
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #333355;
    padding: 20px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .card-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .card-header h3 {
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
    color: #f87171;
  }
  
  .add-btn {
    padding: 6px 12px;
    background: #24c8db;
    border: none;
    border-radius: 6px;
    color: #000;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .add-btn:hover {
    opacity: 0.9;
  }
  
  .expense-form {
    background: rgba(255, 255, 255, 0.03);
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 16px;
  }
  
  .form-row {
    margin-bottom: 12px;
  }
  
  .form-row input {
    width: 100%;
    padding: 10px 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 0.875rem;
  }
  
  .form-row input:focus {
    outline: none;
    border-color: #24c8db;
  }
  
  .form-row input.error {
    border-color: #f87171;
  }
  
  .amount-input {
    position: relative;
  }
  
  .amount-input .prefix {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
  }
  
  .amount-input input {
    padding-left: 28px;
  }
  
  .payment-source-select {
    width: 100%;
    padding: 10px 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .payment-source-select:focus {
    outline: none;
    border-color: #24c8db;
  }
  
  .payment-source-select option {
    background: #0f0f1a;
    color: #e4e4e7;
  }
  
  .error-message {
    color: #f87171;
    font-size: 0.75rem;
    margin: 0 0 12px 0;
  }
  
  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  
  .cancel-btn, .save-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
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
  
  .save-btn {
    background: #24c8db;
    border: none;
    color: #000;
  }
  
  .save-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .save-btn:disabled, .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .expenses-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .expense-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid transparent;
  }
  
  .expense-item.editing {
    border-color: #24c8db;
  }
  
  .expense-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 1;
    gap: 16px;
  }
  
  .expense-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .expense-name {
    color: #e4e4e7;
    font-weight: 500;
  }
  
  .expense-source {
    color: #888;
    font-size: 0.75rem;
  }
  
  .expense-amount {
    color: #f87171;
    font-weight: 600;
  }
  
  .expense-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 16px;
  }
  
  .edit-btn, .delete-btn {
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
  
  .delete-btn:hover {
    border-color: #f87171;
    color: #f87171;
  }
  
  .loading-text, .empty-text {
    color: #888;
    font-size: 0.875rem;
    text-align: center;
    padding: 20px;
  }
</style>
