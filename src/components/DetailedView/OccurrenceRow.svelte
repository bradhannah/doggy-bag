<script lang="ts">
  /**
   * OccurrenceRow - Displays a single occurrence within a bill/income instance
   *
   * In the occurrence-only model:
   * - Closing an occurrence = payment recorded
   * - The expected_amount becomes the paid amount when closed
   * - No separate payments array
   */
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import type { Occurrence } from '../../stores/detailed-month';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';
  import EditCloseModal from './EditCloseModal.svelte';

  export let occurrence: Occurrence;
  export let month: string;
  export let instanceId: string;
  export let itemName: string = '';
  export let type: 'bill' | 'income' = 'bill';
  export let readOnly: boolean = false;
  export let isPayoffBill: boolean = false;
  export let isVirtualInsurance: boolean = false;

  // Protected items: payoff bills and virtual insurance items
  $: isProtected = isPayoffBill || isVirtualInsurance;

  // Check if this is a clickable insurance occurrence (has claim linking at occurrence level)
  $: isClickableInsuranceOccurrence = isVirtualInsurance && occurrence.claim_id;

  const dispatch = createEventDispatcher();

  let saving = false;

  // Inline date editing state
  let editingDate = false;
  let editingDateValue = '';
  let savingDate = false;
  let dateInputEl: HTMLInputElement | null = null;
  let dateEditError = '';
  let showDeleteConfirm = false;
  let showEditCloseModal = false;
  let showOverflowMenu = false;
  let overflowMenuRef: HTMLDivElement | null = null;
  let overflowBtnRef: HTMLButtonElement | null = null;
  let menuPosition = { top: 0, left: 0 };

  // Navigate to insurance claim when clicking on a virtual insurance occurrence
  function handleOccurrenceClick() {
    if (!isClickableInsuranceOccurrence) return;

    const claimId = occurrence.claim_id;
    const submissionId = occurrence.claim_submission_id;

    if (submissionId) {
      goto(`/insurance?claim=${claimId}&submission=${submissionId}`);
    } else if (claimId) {
      goto(`/insurance?claim=${claimId}`);
    }
  }

  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
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
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  /**
   * Get the maximum valid day for a given month string (YYYY-MM)
   */
  function getMaxDayForMonth(monthStr: string): number {
    const [year, monthNum] = monthStr.split('-').map(Number);
    // Day 0 of next month gives us last day of current month
    return new Date(year, monthNum, 0).getDate();
  }

  // Check if date editing is allowed (not closed, not read-only, not protected)
  $: canEditDate = !occurrence.is_closed && !readOnly && !isProtected;

  /**
   * Start inline date editing
   */
  async function startEditingDate() {
    if (!canEditDate || savingDate) return;

    // Extract current day from expected_date (YYYY-MM-DD)
    const currentDay = parseInt(occurrence.expected_date.split('-')[2], 10);
    editingDateValue = String(currentDay);
    dateEditError = '';
    editingDate = true;

    await tick();
    dateInputEl?.focus();
    dateInputEl?.select();
  }

  /**
   * Cancel date editing without saving
   */
  function cancelEditingDate() {
    editingDate = false;
    editingDateValue = '';
    dateEditError = '';
  }

  /**
   * Handle keydown events in the date input
   */
  function handleDateKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveDate();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditingDate();
    }
  }

  /**
   * Validate and save the new date
   */
  async function saveDate() {
    if (savingDate) return;

    const newDay = parseInt(editingDateValue, 10);
    const maxDay = getMaxDayForMonth(month);

    // Validate
    if (isNaN(newDay) || newDay < 1) {
      dateEditError = 'Enter a valid day (1-' + maxDay + ')';
      return;
    }

    if (newDay > maxDay) {
      dateEditError = `Max ${maxDay} for this month`;
      return;
    }

    // Build new date string
    const paddedDay = String(newDay).padStart(2, '0');
    const newExpectedDate = `${month}-${paddedDay}`;

    // Skip save if date hasn't changed
    if (newExpectedDate === occurrence.expected_date) {
      cancelEditingDate();
      return;
    }

    savingDate = true;
    dateEditError = '';

    try {
      await apiClient.put(apiBase, '', {
        expected_date: newExpectedDate,
      });
      success('Date updated');
      editingDate = false;
      editingDateValue = '';
      dispatch('updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update date');
    } finally {
      savingDate = false;
    }
  }

  // API endpoint base
  $: apiBase = `/api/months/${month}/${type}s/${instanceId}/occurrences/${occurrence.id}`;

  // Open the unified Edit & Close modal
  function openEditCloseModal() {
    if (saving || readOnly) return;
    showEditCloseModal = true;
  }

  function handleEditCloseModalClose() {
    showEditCloseModal = false;
  }

  function handleEditCloseModalSaved() {
    showEditCloseModal = false;
    dispatch('updated');
  }

  function handleEditCloseModalClosed() {
    showEditCloseModal = false;
    dispatch('updated');
  }

  async function handleReopen() {
    if (saving || readOnly) return;
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

  // Delete occurrence
  function confirmDelete() {
    if (readOnly) return;
    // Allow deletion for payoff bills (any occurrence) or adhoc occurrences for regular bills
    // Virtual insurance items cannot be deleted
    if (isVirtualInsurance) return;
    if (!isPayoffBill && !occurrence.is_adhoc) return;
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

  // Determine if delete is available
  // Can delete: ad-hoc occurrences only (NOT payoff bills or virtual insurance - those are auto-managed)
  $: canDelete = !readOnly && !isProtected && occurrence.is_adhoc;

  // Overflow menu click-outside handler
  function handleClickOutside(event: MouseEvent) {
    if (overflowMenuRef && !overflowMenuRef.contains(event.target as Node)) {
      showOverflowMenu = false;
    }
  }

  function toggleOverflowMenu(event: MouseEvent) {
    event.stopPropagation();
    if (!showOverflowMenu && overflowBtnRef) {
      // Calculate position based on button location
      const rect = overflowBtnRef.getBoundingClientRect();
      menuPosition = {
        top: rect.bottom + 4,
        left: rect.right - 140, // Menu width is 140px, align right edge
      };
    }
    showOverflowMenu = !showOverflowMenu;
  }

  function closeOverflowMenu() {
    showOverflowMenu = false;
  }

  // View details action - opens the edit modal in view mode
  function handleViewDetails() {
    closeOverflowMenu();
    openEditCloseModal();
  }

  // Delete action from overflow menu
  function handleDeleteFromMenu() {
    closeOverflowMenu();
    confirmDelete();
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div
  class="occurrence-row-container"
  class:closed={occurrence.is_closed}
  class:adhoc={occurrence.is_adhoc}
  class:clickable={isClickableInsuranceOccurrence}
  on:click={isClickableInsuranceOccurrence ? handleOccurrenceClick : undefined}
  on:keydown={isClickableInsuranceOccurrence
    ? (e) => e.key === 'Enter' && handleOccurrenceClick()
    : undefined}
  role={isClickableInsuranceOccurrence ? 'button' : undefined}
  tabindex={isClickableInsuranceOccurrence ? 0 : undefined}
>
  <div class="occurrence-row">
    <!-- Date -->
    <div class="occ-date">
      {#if occurrence.is_closed && occurrence.closed_date}
        <span class="closed-date">{formatDayOfMonth(occurrence.closed_date)}</span>
      {:else if editingDate}
        <div class="date-edit">
          <input
            type="number"
            bind:this={dateInputEl}
            bind:value={editingDateValue}
            on:keydown={handleDateKeydown}
            on:blur={saveDate}
            min="1"
            max={getMaxDayForMonth(month)}
            disabled={savingDate}
            class="date-input"
            class:has-error={dateEditError}
          />
          {#if dateEditError}
            <span class="date-edit-error">{dateEditError}</span>
          {/if}
        </div>
      {:else if canEditDate}
        <button
          class="date-value editable"
          on:click|stopPropagation={startEditingDate}
          disabled={savingDate}
        >
          {formatDayOfMonth(occurrence.expected_date)}
        </button>
      {:else}
        <span class="date-value">{formatDayOfMonth(occurrence.expected_date)}</span>
      {/if}
    </div>

    <!-- Amount -->
    <div class="amount-column">
      <span class="amount-value" class:closed={occurrence.is_closed}>
        {formatCurrency(occurrence.expected_amount)}
      </span>
    </div>

    <!-- Status indicator -->
    <div class="status-column">
      {#if occurrence.is_closed}
        <span class="status-badge closed-badge">
          {type === 'bill' ? 'Paid' : 'Received'}
        </span>
      {:else}
        <span class="status-badge open-badge">
          {type === 'bill' ? 'Open' : 'Expected'}
        </span>
      {/if}
    </div>

    <!-- Badges column -->
    <div class="badges-column">
      {#if occurrence.plan_name}
        <span class="badge plan-badge">{occurrence.plan_name}</span>
      {/if}
      {#if occurrence.is_adhoc}
        <span class="badge adhoc-badge">ad-hoc</span>
      {/if}
    </div>

    <!-- Action buttons (right-aligned) -->
    <div class="action-buttons">
      {#if isProtected}
        <!-- Protected items (payoff bills, virtual insurance): no action buttons, state is auto-managed -->
      {:else if occurrence.is_closed}
        <button class="action-btn reopen" on:click={handleReopen} disabled={saving || readOnly}>
          Reopen
        </button>
      {:else}
        <button class="action-btn edit" on:click={openEditCloseModal} disabled={saving || readOnly}>
          Edit
        </button>
      {/if}

      <!-- Overflow menu -->
      {#if !readOnly}
        <div class="overflow-menu-container" bind:this={overflowMenuRef}>
          <button
            class="overflow-btn"
            bind:this={overflowBtnRef}
            on:click={toggleOverflowMenu}
            disabled={saving}
            title="More options"
            aria-haspopup="true"
            aria-expanded={showOverflowMenu}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {#if showOverflowMenu}
            <div
              class="overflow-menu"
              role="menu"
              style="top: {menuPosition.top}px; left: {menuPosition.left}px;"
            >
              {#if isPayoffBill}
                <span class="overflow-menu-empty">No actions available</span>
              {:else}
                <button class="overflow-menu-item" on:click={handleViewDetails} role="menuitem">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View Details
                </button>
                {#if canDelete}
                  <button
                    class="overflow-menu-item danger"
                    on:click={handleDeleteFromMenu}
                    role="menuitem"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      />
                    </svg>
                    Delete
                  </button>
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if occurrence.notes}
    <p class="inline-note">{occurrence.notes}</p>
  {/if}
</div>

<!-- Edit & Close Modal -->
<EditCloseModal
  open={showEditCloseModal}
  {type}
  {month}
  {instanceId}
  occurrenceId={occurrence.id}
  {itemName}
  expectedAmount={occurrence.expected_amount}
  expectedDate={occurrence.expected_date}
  existingNotes={occurrence.notes ?? ''}
  existingPaymentSourceId={occurrence.payment_source_id}
  on:close={handleEditCloseModalClose}
  on:saved={handleEditCloseModalSaved}
  on:closed={handleEditCloseModalClosed}
/>

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
  <div
    class="confirm-overlay"
    on:click={cancelDelete}
    on:keydown={(e) => e.key === 'Escape' && cancelDelete()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="confirm-dialog" on:click|stopPropagation role="presentation">
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
  .occurrence-row-container {
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    transition: all 0.15s ease;
  }

  .occurrence-row-container:hover {
    background: var(--bg-surface);
  }

  .occurrence-row-container.clickable {
    cursor: pointer;
  }

  .occurrence-row-container.clickable:hover {
    background: var(--bg-hover-strong);
  }

  .occurrence-row-container.closed {
    background: var(--success-bg);
  }

  .occurrence-row {
    display: grid;
    grid-template-columns: 50px 100px 80px 1fr auto;
    align-items: center;
    gap: var(--space-3);
    padding: 3px var(--space-3);
    padding-left: var(--space-5);
    font-size: 0.85rem;
  }

  .occ-date {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .date-value {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .closed-date {
    font-size: 0.85rem;
    color: var(--success);
  }

  /* Editable date styles */
  .date-value.editable {
    background: transparent;
    border: none;
    padding: 2px var(--space-1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-family: inherit;
    transition: background 0.15s ease;
  }

  .date-value.editable:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .date-value.editable:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .date-edit {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .date-input {
    width: 44px;
    padding: 2px var(--space-1);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    background: var(--bg-base);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-family: inherit;
    text-align: center;
    -moz-appearance: textfield;
  }

  .date-input::-webkit-outer-spin-button,
  .date-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .date-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .date-input.has-error {
    border-color: var(--error);
  }

  .date-input.has-error:focus {
    box-shadow: 0 0 0 2px var(--error-bg);
  }

  .date-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .date-edit-error {
    font-size: 0.65rem;
    color: var(--error);
    white-space: nowrap;
  }

  .inline-note {
    margin: 0;
    padding: 0 var(--space-3) var(--space-2) var(--space-5);
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.4;
    font-style: italic;
  }

  .amount-column {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .amount-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .amount-value.closed {
    color: var(--success);
  }

  .status-column {
    display: flex;
    justify-content: center;
  }

  .status-badge {
    font-size: 0.65rem;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .closed-badge {
    background: var(--success-bg);
    color: var(--success);
  }

  .open-badge {
    background: var(--bg-surface);
    color: var(--text-secondary);
    border: 1px solid var(--border-subtle);
  }

  .action-buttons {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  .action-btn {
    height: 26px;
    box-sizing: border-box;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
  }

  .action-btn.edit {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--text-inverse);
  }

  .action-btn.edit:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .action-btn.reopen {
    background: transparent;
    border-color: var(--text-secondary);
    color: var(--text-secondary);
  }

  .action-btn.reopen:hover:not(:disabled) {
    border-color: var(--text-primary);
    color: var(--text-primary);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Overflow menu */
  .overflow-menu-container {
    position: relative;
  }

  .overflow-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .overflow-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .overflow-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .overflow-menu {
    position: fixed;
    min-width: 140px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-medium);
    z-index: 1000;
    overflow: hidden;
  }

  .overflow-menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .overflow-menu-item:hover {
    background: var(--bg-hover);
  }

  .overflow-menu-item.danger {
    color: var(--error);
  }

  .overflow-menu-item.danger:hover {
    background: var(--error-bg);
  }

  .overflow-menu-empty {
    display: block;
    padding: var(--space-2) var(--space-3);
    color: var(--text-tertiary);
    font-size: 0.8rem;
    font-style: italic;
    white-space: nowrap;
  }

  .badges-column {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .badge {
    font-size: 0.55rem;
    padding: 2px var(--space-1);
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .adhoc-badge {
    background: var(--purple-bg);
    color: var(--purple);
  }

  .plan-badge {
    background: var(--accent-muted);
    color: var(--accent);
  }

  /* Confirmation dialog */
  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .confirm-dialog {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 360px;
    width: 90%;
  }

  .confirm-dialog h3 {
    margin: 0 0 var(--space-3);
    font-size: 1rem;
    color: var(--text-primary);
  }

  .confirm-dialog p {
    margin: 0 0 var(--space-2);
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .confirm-warning {
    color: var(--error) !important;
    font-size: 0.75rem !important;
    margin-bottom: var(--space-4) !important;
  }

  .confirm-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .confirm-btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .confirm-btn.cancel {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .confirm-btn.cancel:hover {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .confirm-btn.delete {
    background: var(--error);
    border: none;
    color: var(--text-inverse);
  }

  .confirm-btn.delete:hover:not(:disabled) {
    background: var(--error-hover);
  }

  .confirm-btn.delete:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .occurrence-row {
      grid-template-columns: 50px 1fr 70px auto;
      gap: var(--space-2);
    }

    .badges-column {
      display: none;
    }
  }
</style>
