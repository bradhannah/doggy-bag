<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { IncomeInstance } from '../../stores/months';
  import { success, error as showError } from '../../stores/toast';
  import { apiUrl } from '$lib/api/client';

  export let incomes: IncomeInstance[] = [];
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
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }

  function startEdit(income: IncomeInstance) {
    editingId = income.id;
    editAmount = (income.amount / 100).toFixed(2);
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
      const response = await fetch(apiUrl(`/api/months/${month}/incomes/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountCents }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      cancelEdit();
      dispatch('refresh');
      success('Income amount updated');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      showError(error);
    } finally {
      saving = false;
    }
  }

  async function resetToDefault(id: string) {
    saving = true;
    error = '';

    try {
      const response = await fetch(apiUrl(`/api/months/${month}/incomes/${id}/reset`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset');
      }

      dispatch('refresh');
      success('Income reset to default');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      showError(error);
    } finally {
      saving = false;
    }
  }

  async function togglePaid(id: string, currentPaid: boolean) {
    saving = true;
    error = '';

    try {
      const response = await fetch(apiUrl(`/api/months/${month}/incomes/${id}/paid`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle paid');
      }

      dispatch('refresh');
      success(currentPaid ? 'Income marked as unpaid' : 'Income marked as received');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      showError(error);
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

<div class="incomes-card">
  <div class="card-header-row">
    <h3>Income This Month</h3>
    {#if incomes.length > 0}
      <span class="card-total income">{formatCurrency(total)}</span>
    {/if}
  </div>

  {#if loading}
    <p class="loading-text">Loading...</p>
  {:else if incomes.length === 0}
    <p class="empty-text">No income configured. <a href="/setup">Set up income</a></p>
  {:else}
    <ul class="incomes-list">
      {#each incomes as income (income.id)}
        <li
          class="income-item"
          class:editing={editingId === income.id}
          class:modified={!income.is_default}
          class:paid={income.is_paid}
        >
          {#if editingId === income.id}
            <div class="edit-row">
              <span class="income-name">{income.name}</span>
              <div class="edit-input-group">
                <span class="prefix">$</span>
                <input
                  type="text"
                  bind:value={editAmount}
                  on:keydown={(e) => handleKeydown(e, income.id)}
                  class:error={!!error}
                  disabled={saving}
                  autofocus
                />
              </div>
              <div class="edit-actions">
                <button class="save-btn" on:click={() => saveEdit(income.id)} disabled={saving}>
                  {saving ? '...' : 'Save'}
                </button>
                <button class="cancel-btn" on:click={cancelEdit} disabled={saving}> Cancel </button>
              </div>
            </div>
            {#if error}
              <p class="error-message">{error}</p>
            {/if}
          {:else}
            <div class="income-info">
              <div class="income-details">
                <button
                  class="paid-checkbox"
                  class:checked={income.is_paid}
                  on:click={() => togglePaid(income.id, income.is_paid ?? false)}
                  disabled={saving}
                  title={income.is_paid ? 'Mark as not received' : 'Mark as received'}
                >
                  {#if income.is_paid}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12L10 17L20 7"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  {/if}
                </button>
                <span class="income-name" class:paid-text={income.is_paid}>{income.name}</span>
                {#if !income.is_default}
                  <span class="modified-badge">modified</span>
                {/if}
                {#if income.is_paid}
                  <span class="paid-badge">received</span>
                {/if}
              </div>
              <span class="income-amount" class:paid-text={income.is_paid}
                >{formatCurrency(income.amount)}</span
              >
            </div>
            <div class="income-actions">
              <button class="edit-btn" on:click={() => startEdit(income)}>Edit</button>
              {#if !income.is_default}
                <button
                  class="reset-btn"
                  on:click={() => resetToDefault(income.id)}
                  disabled={saving}
                >
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
  .incomes-card {
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

  .card-total.income {
    color: #4ade80;
  }

  .incomes-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .income-item {
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid transparent;
  }

  .income-item.editing {
    border-color: #24c8db;
  }

  .income-item.modified {
    border-left: 3px solid #f59e0b;
  }

  .income-item.paid {
    background: rgba(74, 222, 128, 0.05);
  }

  .paid-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid #555;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.2s;
    color: #000;
    flex-shrink: 0;
  }

  .paid-checkbox:hover:not(:disabled) {
    border-color: #4ade80;
  }

  .paid-checkbox.checked {
    background: #4ade80;
    border-color: #4ade80;
  }

  .paid-checkbox:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .paid-text {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .paid-badge {
    font-size: 0.625rem;
    padding: 2px 6px;
    background: rgba(74, 222, 128, 0.2);
    color: #4ade80;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .income-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .income-details {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .income-name {
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

  .income-amount {
    color: #4ade80;
    font-weight: 600;
  }

  .income-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .edit-btn,
  .reset-btn {
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

  .save-btn,
  .cancel-btn {
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

  .save-btn:disabled,
  .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    color: #f87171;
    font-size: 0.75rem;
    margin: 8px 0 0 0;
  }

  .loading-text,
  .empty-text {
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
