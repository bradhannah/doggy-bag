<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Occurrence } from '../../stores/detailed-month';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  
  export let occurrence: Occurrence;
  export let month: string;
  export let instanceId: string;
  export let type: 'bill' | 'income' = 'bill';
  export let readOnly: boolean = false;
  export let isPayoffBill: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let saving = false;
  let isEditingExpected = false;
  let expectedEditValue = '';
  let isEditingDate = false;
  let editingDayValue = '';
  let showDeleteConfirm = false;
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  function formatDayOfMonth(dateStr: string | null): string {
    if (!dateStr) return '-';
    const day = parseInt(dateStr.split('-')[2], 10);
    const suffix = getDaySuffix(day);
    return `${day}${suffix}`;
  }
  
  function getDaySuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
  
  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }
  
  // Computed values
  $: totalPaid = occurrence.payments.reduce((sum, p) => sum + p.amount, 0);
  $: remaining = occurrence.expected_amount - totalPaid;
  $: hasPayments = occurrence.payments.length > 0 || totalPaid > 0;
  $: showAmber = totalPaid !== occurrence.expected_amount && totalPaid > 0;
  $: isPartiallyPaid = hasPayments && totalPaid > 0 && totalPaid < occurrence.expected_amount && !occurrence.is_closed;
  
  // API endpoint base
  $: apiBase = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrence.id}`;
  
  async function handlePayFull() {
    if (saving) return;
    saving = true;
    
    try {
      // Add payment for remaining amount
      const paymentAmount = remaining > 0 ? remaining : occurrence.expected_amount;
      const today = new Date().toISOString().split('T')[0];
      
      await apiClient.post(`${apiBase}/payments`, {
        amount: paymentAmount,
        date: today
      });
      
      // Close the occurrence
      await apiClient.post(`${apiBase}/close`, {});
      
      success(type === 'bill' ? 'Payment added and closed' : 'Receipt added and closed');
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to process');
    } finally {
      saving = false;
    }
  }
  
  async function handleClose() {
    if (saving) return;
    saving = true;
    
    try {
      await apiClient.post(`${apiBase}/close`, {});
      success('Closed');
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to close');
    } finally {
      saving = false;
    }
  }
  
  async function handleReopen() {
    if (saving) return;
    saving = true;
    
    try {
      await apiClient.post(`${apiBase}/reopen`, {});
      success('Reopened');
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to reopen');
    } finally {
      saving = false;
    }
  }
  
  function startEditingExpected() {
    if (readOnly || occurrence.is_closed) return;
    expectedEditValue = (occurrence.expected_amount / 100).toFixed(2);
    isEditingExpected = true;
  }
  
  async function saveExpectedAmount() {
    const newAmount = parseDollarsToCents(expectedEditValue);
    if (newAmount === occurrence.expected_amount) {
      isEditingExpected = false;
      return;
    }
    
    if (newAmount <= 0) {
      showError('Amount must be greater than 0');
      return;
    }
    
    saving = true;
    try {
      await apiClient.putPath(apiBase, {
        expected_amount: newAmount
      });
      success('Amount updated');
      isEditingExpected = false;
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update amount');
    } finally {
      saving = false;
    }
  }
  
  function cancelEditingExpected() {
    isEditingExpected = false;
    expectedEditValue = '';
  }
  
  function handleExpectedKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveExpectedAmount();
    } else if (event.key === 'Escape') {
      cancelEditingExpected();
    }
  }
  
  // Date editing functions
  function startEditingDate() {
    if (readOnly || occurrence.is_closed) return;
    const day = parseInt(occurrence.expected_date?.split('-')[2] || '1', 10);
    editingDayValue = day.toString();
    isEditingDate = true;
  }
  
  async function saveDate() {
    const newDay = parseInt(editingDayValue, 10);
    if (isNaN(newDay) || newDay < 1 || newDay > 31) {
      showError('Please enter a valid day (1-31)');
      return;
    }
    
    // Build new date string
    const [year, monthNum] = month.split('-');
    const newDate = `${year}-${monthNum}-${newDay.toString().padStart(2, '0')}`;
    
    if (newDate === occurrence.expected_date) {
      isEditingDate = false;
      return;
    }
    
    saving = true;
    try {
      await apiClient.putPath(apiBase, {
        expected_date: newDate
      });
      success('Date updated');
      isEditingDate = false;
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update date');
    } finally {
      saving = false;
    }
  }
  
  function cancelEditingDate() {
    isEditingDate = false;
    editingDayValue = '';
  }
  
  function handleDateKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveDate();
    } else if (event.key === 'Escape') {
      cancelEditingDate();
    }
  }
  
  // Delete occurrence
  function confirmDelete() {
    if (readOnly || !occurrence.is_adhoc) return;
    showDeleteConfirm = true;
  }
  
  function cancelDelete() {
    showDeleteConfirm = false;
  }
  
  async function handleDelete() {
    if (saving) return;
    saving = true;
    showDeleteConfirm = false;
    
    try {
      await apiClient.deletePath(apiBase);
      success('Occurrence deleted');
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      saving = false;
    }
  }
  
  function openPaymentDrawer() {
    dispatch('openPayments', { occurrence });
  }
</script>

<div 
  class="occurrence-row" 
  class:closed={occurrence.is_closed} 
  class:partial={isPartiallyPaid}
  class:adhoc={occurrence.is_adhoc}
>
  <!-- Date (clickable to edit day of month) -->
  <div class="occ-date">
    {#if isEditingDate}
      <div class="date-edit">
        <input
          type="number"
          min="1"
          max="31"
          class="date-input"
          bind:value={editingDayValue}
          on:keydown={handleDateKeydown}
          on:blur={saveDate}
          disabled={saving}
          autofocus
        />
      </div>
    {:else if occurrence.is_closed && occurrence.closed_date}
      <span class="closed-date">{formatDayOfMonth(occurrence.closed_date)}</span>
    {:else}
      <button 
        class="date-value" 
        class:editable={!readOnly && !occurrence.is_closed}
        on:click={startEditingDate}
        title={occurrence.is_closed ? 'Reopen to edit' : 'Click to edit date'}
        disabled={readOnly || occurrence.is_closed}
      >
        {formatDayOfMonth(occurrence.expected_date)}
      </button>
    {/if}
  </div>
  
  <!-- Expected amount -->
  <div class="amount-column">
    <span class="amount-label">Expected</span>
    {#if isEditingExpected}
      <div class="inline-edit">
        <span class="prefix">$</span>
        <input
          type="text"
          bind:value={expectedEditValue}
          on:keydown={handleExpectedKeydown}
          on:blur={saveExpectedAmount}
          disabled={saving}
          autofocus
        />
      </div>
    {:else}
      <button 
        class="amount-value clickable" 
        class:disabled={occurrence.is_closed}
        class:editable-highlight={!occurrence.is_closed && !readOnly}
        on:click={startEditingExpected}
        title={occurrence.is_closed ? 'Reopen to edit' : 'Click to edit'}
      >
        {formatCurrency(occurrence.expected_amount)}
      </button>
    {/if}
  </div>
  
  <!-- Arrow -->
  <div class="arrow">→</div>
  
  <!-- Actual/Paid amount -->
  <div class="amount-column">
    <span class="amount-label">
      {type === 'bill' ? 'Paid' : 'Received'}
      {#if occurrence.payments.length > 0}
        <span class="payment-count">({occurrence.payments.length})</span>
      {/if}
    </span>
    {#if hasPayments}
      <button 
        class="amount-value clickable" 
        class:amber={showAmber}
        on:click={openPaymentDrawer}
        title="View transactions"
      >
        {formatCurrency(totalPaid)}
      </button>
    {:else}
      <button class="add-payment-link" on:click={openPaymentDrawer}>
        {type === 'bill' ? 'Add Payment' : 'Add Receipt'}
      </button>
    {/if}
  </div>
  
  <!-- Remaining amount -->
  <div class="amount-column remaining-column">
    <span class="amount-label">Remaining</span>
    <span class="amount-value remaining" class:zero={remaining === 0}>
      {remaining === 0 ? '-' : formatCurrency(remaining)}
    </span>
  </div>
  
  <!-- Status indicator -->
  <div class="status-column">
    {#if occurrence.is_closed}
      <span class="status-badge closed-badge">
        {type === 'bill' ? 'Closed' : 'Received'}
      </span>
    {:else if isPartiallyPaid}
      <span class="status-badge partial-badge">Partial</span>
    {:else}
      <span class="status-badge open-badge">
        {type === 'bill' ? 'Open' : 'Expected'}
      </span>
    {/if}
  </div>
  
  <!-- Action buttons -->
  <div class="action-buttons">
    {#if occurrence.is_closed}
      <button class="action-btn reopen" on:click={handleReopen} disabled={saving || readOnly}>
        Reopen
      </button>
    {:else if hasPayments}
      <button class="action-btn close" on:click={handleClose} disabled={saving || readOnly}>
        Close
      </button>
    {:else}
      <button class="action-btn pay-full" on:click={handlePayFull} disabled={saving || readOnly}>
        {type === 'bill' ? 'Pay Full' : 'Receive'}
      </button>
    {/if}
    
    <!-- Delete button for all occurrences (except payoff bills) -->
    {#if !readOnly && !isPayoffBill}
      <button 
        class="action-btn-icon delete" 
        on:click={confirmDelete}
        disabled={saving}
        title="Delete occurrence"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    {/if}
  </div>
  
  <!-- Badges column (at the end to prevent pushing other columns) -->
  <div class="badges-column">
    {#if occurrence.is_adhoc}
      <span class="badge adhoc-badge">ad-hoc</span>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
  <div class="confirm-overlay" on:click={cancelDelete} on:keydown={(e) => e.key === 'Escape' && cancelDelete()} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="confirm-dialog" on:click|stopPropagation>
      <h3>Delete Occurrence</h3>
      <p>Are you sure you want to delete this occurrence?</p>
      <p class="confirm-warning">This action cannot be undone.</p>
      <div class="confirm-actions">
        <button class="confirm-btn cancel" on:click={cancelDelete}>Cancel</button>
        <button class="confirm-btn delete" on:click={handleDelete} disabled={saving}>
          {saving ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .occurrence-row {
    display: grid;
    grid-template-columns: 45px 85px 20px 85px 70px 65px 90px 50px;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    padding-left: 20px; /* Indent for sub-row appearance */
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    transition: all 0.15s ease;
    font-size: 0.8rem; /* Smaller font for occurrence rows */
  }
  
  .occurrence-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  
  .occurrence-row.closed {
    background: rgba(74, 222, 128, 0.03);
    opacity: 0.7;
  }
  
  .occ-date {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .date-value {
    background: none;
    border: none;
    padding: 2px 4px;
    font-size: 0.8rem;
    color: #888;
    cursor: default;
    border-radius: 4px;
    transition: all 0.15s;
    text-align: center;
  }
  
  .date-value.editable {
    cursor: pointer;
  }
  
  .date-value.editable:hover {
    background: rgba(36, 200, 219, 0.1);
    color: #24c8db;
  }
  
  .closed-date {
    font-size: 0.8rem;
    color: #4ade80;
    text-align: center;
  }
  
  .date-edit {
    display: flex;
    align-items: center;
  }
  
  .date-input {
    width: 40px;
    padding: 2px 4px;
    background: #0f0f1a;
    border: 1px solid #24c8db;
    border-radius: 4px;
    color: #e4e4e7;
    font-size: 0.75rem;
    text-align: center;
  }
  
  .date-input:focus {
    outline: none;
  }
  
  /* Hide spinner buttons */
  .date-input::-webkit-outer-spin-button,
  .date-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .date-input[type=number] {
    -moz-appearance: textfield;
  }
  
  .badge {
    font-size: 0.5rem;
    padding: 1px 4px;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .adhoc-badge {
    background: rgba(167, 139, 250, 0.2);
    color: #a78bfa;
  }
  
  .badges-column {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  
  .arrow {
    color: #555;
    font-size: 0.7rem;
    text-align: center;
  }
  
  .amount-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  
  .remaining-column {
    /* No extra styles needed with grid */
  }
  
  .amount-label {
    font-size: 0.5rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  
  .payment-count {
    color: #f59e0b;
  }
  
  .amount-value {
    font-size: 0.8rem;
    font-weight: 600;
    color: #e4e4e7;
    background: none;
    border: none;
    padding: 0;
    cursor: default;
  }
  
  .amount-value.clickable {
    cursor: pointer;
    transition: color 0.2s;
  }
  
  .amount-value.clickable:hover:not(.disabled) {
    color: #24c8db;
    text-decoration: underline;
  }
  
  .amount-value.clickable.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .amount-value.amber {
    color: #f59e0b;
  }
  
  .amount-value.remaining {
    color: #888;
  }
  
  .amount-value.remaining.zero {
    color: #4ade80;
  }
  
  /* Yellow/amber highlight for editable values */
  .amount-value.editable-highlight {
    background: rgba(251, 191, 36, 0.15);
    border: 1px solid rgba(251, 191, 36, 0.4);
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .amount-value.editable-highlight:hover:not(.disabled) {
    background: rgba(251, 191, 36, 0.25);
    border-color: rgba(251, 191, 36, 0.6);
    color: #fbbf24;
  }
  
  .add-payment-link {
    background: none;
    border: none;
    color: #24c8db;
    font-size: 0.7rem;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    transition: opacity 0.2s;
  }
  
  .add-payment-link:hover {
    opacity: 0.8;
  }
  
  .inline-edit {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  .inline-edit .prefix {
    color: #888;
    font-size: 0.75rem;
  }
  
  .inline-edit input {
    width: 55px;
    padding: 2px 4px;
    background: #0f0f1a;
    border: 1px solid #24c8db;
    border-radius: 4px;
    color: #e4e4e7;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: right;
  }
  
  .inline-edit input:focus {
    outline: none;
  }
  
  .status-column {
    display: flex;
    justify-content: center;
  }
  
  .status-badge {
    font-size: 0.55rem;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: 500;
  }
  
  .closed-badge {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }
  
  .partial-badge {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }
  
  .open-badge {
    background: rgba(136, 136, 136, 0.15);
    color: #888;
  }
  
  .action-buttons {
    display: flex;
    gap: 4px;
    justify-content: flex-start;
  }
  
  .action-btn {
    height: 24px;
    box-sizing: border-box;
    padding: 0 8px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
  }
  
  .action-btn.pay-full {
    background: #24c8db;
    border-color: #24c8db;
    color: #000;
  }
  
  .action-btn.pay-full:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .action-btn.close {
    background: transparent;
    border-color: #4ade80;
    color: #4ade80;
  }
  
  .action-btn.close:hover:not(:disabled) {
    background: rgba(74, 222, 128, 0.1);
  }
  
  .action-btn.reopen {
    background: transparent;
    border-color: #888;
    color: #888;
  }
  
  .action-btn.reopen:hover:not(:disabled) {
    border-color: #e4e4e7;
    color: #e4e4e7;
  }
  
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Delete icon button */
  .action-btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: #666;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .action-btn-icon:hover:not(:disabled) {
    background: rgba(255, 68, 68, 0.1);
    color: #ff4444;
  }
  
  .action-btn-icon.delete:hover:not(:disabled) {
    background: #ff4444;
    color: #fff;
  }
  
  .action-btn-icon:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  /* Confirmation dialog */
  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .confirm-dialog {
    background: #1a1a2e;
    border: 1px solid #333355;
    border-radius: 12px;
    padding: 24px;
    max-width: 360px;
    width: 90%;
  }
  
  .confirm-dialog h3 {
    margin: 0 0 12px;
    font-size: 1rem;
    color: #e4e4e7;
  }
  
  .confirm-dialog p {
    margin: 0 0 6px;
    color: #a0a0a0;
    font-size: 0.85rem;
  }
  
  .confirm-warning {
    color: #f87171 !important;
    font-size: 0.75rem !important;
    margin-bottom: 16px !important;
  }
  
  .confirm-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  
  .confirm-btn {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .confirm-btn.cancel {
    background: transparent;
    border: 1px solid #444;
    color: #888;
  }
  
  .confirm-btn.cancel:hover {
    border-color: #666;
    color: #e4e4e7;
  }
  
  .confirm-btn.delete {
    background: #ff4444;
    border: none;
    color: #fff;
  }
  
  .confirm-btn.delete:hover:not(:disabled) {
    background: #cc3333;
  }
  
  .confirm-btn.delete:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .occurrence-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    
    .occ-date {
      min-width: 100%;
    }
    
    .amount-column {
      min-width: auto;
      flex: 1;
    }
    
    .arrow {
      display: none;
    }
    
    .action-buttons {
      width: 100%;
      justify-content: flex-start;
    }
    
    .badges-column {
      width: 100%;
    }
  }
</style>
