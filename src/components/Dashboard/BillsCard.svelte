<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BillInstance } from '../../stores/months';
  import { success, error as showError } from '../../stores/toast';
  import { apiUrl } from '$lib/api/client';
  import { formatCurrency, parseDollarsToCents } from '$lib/utils/format';

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
      const response = await fetch(apiUrl(`/api/months/${month}/bills/${id}`), {
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
      success('Bill amount updated');
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
      const response = await fetch(apiUrl(`/api/months/${month}/bills/${id}/reset`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset');
      }

      dispatch('refresh');
      success('Bill reset to default');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      showError(error);
    } finally {
      saving = false;
    }
  }

  async function toggleClosed(id: string, isClosed: boolean) {
    saving = true;
    error = '';

    try {
      const endpoint = isClosed
        ? `/api/months/${month}/bills/${id}/reopen`
        : `/api/months/${month}/bills/${id}/close`;
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      dispatch('refresh');
      success(isClosed ? 'Bill reopened' : 'Bill closed');
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
        {@const billIsClosed = (bill as BillInstance & { is_closed?: boolean }).is_closed ?? false}
        <li
          class="bill-item"
          class:editing={editingId === bill.id}
          class:modified={!bill.is_default}
          class:paid={billIsClosed}
        >
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
                <button class="cancel-btn" on:click={cancelEdit} disabled={saving}> Cancel </button>
              </div>
            </div>
            {#if error}
              <p class="error-message">{error}</p>
            {/if}
          {:else}
            <div class="bill-info">
              <div class="bill-details">
                <button
                  class="paid-checkbox"
                  class:checked={billIsClosed}
                  on:click={() => toggleClosed(bill.id, billIsClosed)}
                  disabled={saving}
                  title={billIsClosed ? 'Reopen bill' : 'Close bill'}
                >
                  {#if billIsClosed}
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
                <span class="bill-name" class:paid-text={billIsClosed}>{bill.name}</span>
                {#if !bill.is_default}
                  <span class="modified-badge">modified</span>
                {/if}
                {#if billIsClosed}
                  <span class="paid-badge">closed</span>
                {/if}
              </div>
              <span class="bill-amount expense" class:paid-text={billIsClosed}
                >{formatCurrency(bill.amount)}</span
              >
            </div>
            <div class="bill-actions">
              <button class="edit-btn" on:click={() => startEdit(bill)}>Edit</button>
              {#if !bill.is_default}
                <button
                  class="reset-btn"
                  on:click={() => resetToDefault(bill.id)}
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
  .bills-card {
    background: var(--bg-surface);
    border-radius: 12px;
    border: 1px solid var(--border-default);
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
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .card-total {
    font-size: 1rem;
    font-weight: 700;
  }

  .card-total.expense {
    color: var(--error);
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
    background: var(--bg-elevated);
    border-radius: 8px;
    border: 1px solid transparent;
  }

  .bill-item.editing {
    border-color: var(--accent);
  }

  .bill-item.modified {
    border-left: 3px solid var(--warning);
  }

  .bill-item.paid {
    background: var(--success-bg);
  }

  .paid-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid var(--border-default);
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.2s;
    color: var(--text-inverse);
    flex-shrink: 0;
  }

  .paid-checkbox:hover:not(:disabled) {
    border-color: var(--success);
  }

  .paid-checkbox.checked {
    background: var(--success);
    border-color: var(--success);
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
    background: var(--success-bg);
    color: var(--success);
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
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
    color: var(--text-primary);
    font-weight: 500;
  }

  .modified-badge {
    font-size: 0.625rem;
    padding: 2px 6px;
    background: var(--warning-bg);
    color: var(--warning);
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .bill-amount {
    font-weight: 600;
  }

  .bill-amount.expense {
    color: var(--error);
  }

  .bill-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .edit-btn,
  .reset-btn {
    padding: 4px 8px;
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .edit-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .reset-btn:hover {
    border-color: var(--warning);
    color: var(--warning);
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
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .edit-input-group input {
    width: 100%;
    padding: 6px 8px 6px 24px;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .edit-input-group input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .edit-input-group input.error {
    border-color: var(--error);
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
    background: var(--accent);
    border: none;
    color: var(--text-inverse);
  }

  .save-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .cancel-btn:hover {
    border-color: var(--text-primary);
    color: var(--text-primary);
  }

  .save-btn:disabled,
  .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    color: var(--error);
    font-size: 0.75rem;
    margin: 8px 0 0 0;
  }

  .loading-text,
  .empty-text {
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-align: center;
    padding: 20px;
  }

  .empty-text a {
    color: var(--accent);
    text-decoration: none;
  }

  .empty-text a:hover {
    text-decoration: underline;
  }
</style>
