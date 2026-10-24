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
  import ConfirmDialog from '../shared/ConfirmDialog.svelte';
  import CopyMoveModal from './CopyMoveModal.svelte';
  import { formatCurrency } from '$lib/utils/format';
  import { paymentSources } from '../../stores/payment-sources';

  export let occurrence: Occurrence;
  export let month: string;
  export let instanceId: string;
  export let itemName: string = '';
  export let defaultPaymentSourceId: string | undefined = undefined;
  export let type: 'bill' | 'income' = 'bill';
  export let readOnly: boolean = false;
  export let isPayoffBill: boolean = false;
  export let isVirtualInsurance: boolean = false;
  export let instanceIsAdhoc: boolean = false;

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
  let editMode: 'record' | 'plan' = 'record';
  let showCopyMoveModal = false;
  let showOverflowMenu = false;
  let overflowMenuRef: HTMLDivElement | null = null;
  let overflowBtnRef: HTMLButtonElement | null = null;
  let menuStyle = '';

  // Menus open below the button unless that would run off the bottom of the window.
  const MENU_GAP = 4;
  const MENU_ESTIMATED_HEIGHT = 120;

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
    editMode = 'record';
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

  // Determine if copy/move to next month is available
  // Available for ad-hoc instances that are not protected
  $: canCopyToMonth = !readOnly && !isProtected && instanceIsAdhoc;

  // Copy/Move to next month
  function handleCopyToMonth() {
    closeOverflowMenu();
    showCopyMoveModal = true;
  }

  function handleCopyMoveModalClose() {
    showCopyMoveModal = false;
  }

  function handleCopyMoveCompleted() {
    showCopyMoveModal = false;
    dispatch('updated');
  }

  // Overflow menu click-outside handler
  function handleClickOutside(event: MouseEvent) {
    if (overflowMenuRef && !overflowMenuRef.contains(event.target as Node)) {
      showOverflowMenu = false;
    }
  }

  function toggleOverflowMenu(event: MouseEvent) {
    event.stopPropagation();
    if (!showOverflowMenu && overflowBtnRef) {
      // Anchor the menu's right edge to the button so it never overhangs it
      const rect = overflowBtnRef.getBoundingClientRect();
      const right = window.innerWidth - rect.right;
      menuStyle =
        rect.bottom + MENU_GAP + MENU_ESTIMATED_HEIGHT > window.innerHeight
          ? `bottom: ${window.innerHeight - rect.top + MENU_GAP}px; right: ${right}px;`
          : `top: ${rect.bottom + MENU_GAP}px; right: ${right}px;`;
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
    editMode = 'plan';
  }

  // Delete action from overflow menu
  function handleDeleteFromMenu() {
    closeOverflowMenu();
    confirmDelete();
  }

  // The menu is fixed-position, so close it rather than let it drift when the page scrolls
  function handleScroll() {
    if (showOverflowMenu) showOverflowMenu = false;
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('scroll', handleScroll, true);
  });

  function formatShortDate(dateStr: string): string {
    const [year, monthNum, day] = dateStr.split('-').map(Number);
    return new Date(year, monthNum - 1, day).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  $: statusLabel = occurrence.is_closed
    ? occurrence.expected_amount === 0
      ? 'Skipped'
      : type === 'bill'
        ? 'Paid'
        : 'Received'
    : type === 'bill'
      ? 'Open'
      : 'Expected';
  $: sourceName = $paymentSources.find((ps) => ps.id === occurrence.payment_source_id)?.name;
  $: closedNote =
    occurrence.is_closed && occurrence.closed_date
      ? [formatShortDate(occurrence.closed_date), sourceName].filter(Boolean).join(' · ')
      : '';
</script>

<div
  class="occurrence-row-container"
  class:closed={occurrence.is_closed}
  class:clickable={isClickableInsuranceOccurrence}
>
  <div class="ledger-row occurrence-row">
    <div class="ledger-label occ-label">
      <span class="occ-date">
        {#if editingDate}
          <span class="date-edit">
            <input
              type="number"
              bind:this={dateInputEl}
              bind:value={editingDateValue}
              on:keydown={handleDateKeydown}
              on:blur={saveDate}
              min="1"
              max={getMaxDayForMonth(month)}
              disabled={savingDate}
              class="date-input control-sm"
              aria-label={`Due day for ${itemName}`}
              aria-invalid={dateEditError ? true : undefined}
              class:has-error={dateEditError}
            />
            {#if dateEditError}
              <span class="date-edit-error" role="alert">{dateEditError}</span>
            {/if}
          </span>
        {:else if canEditDate}
          <button
            class="date-value editable"
            on:click|stopPropagation={startEditingDate}
            disabled={savingDate}
            title="Change due day"
          >
            {formatDayOfMonth(occurrence.expected_date)}
          </button>
        {:else}
          <span class="date-value">{formatDayOfMonth(occurrence.expected_date)}</span>
        {/if}
      </span>
      <span
        class="badge"
        class:badge-success={occurrence.is_closed && occurrence.expected_amount > 0}
      >
        {statusLabel}
      </span>
      {#if occurrence.plan_name}
        <span class="badge badge-accent">{occurrence.plan_name}</span>
      {/if}
      {#if occurrence.is_adhoc && !instanceIsAdhoc}
        <span class="badge badge-purple">Ad-hoc</span>
      {/if}
      {#if closedNote}
        <span class="occ-meta">{closedNote}</span>
      {/if}
    </div>

    <span class="ledger-amount occ-amount" data-col="expected">
      {formatCurrency(occurrence.expected_amount)}
    </span>
    <span class="ledger-amount occ-amount" class:paid={occurrence.is_closed} data-col="paid">
      {occurrence.is_closed ? formatCurrency(occurrence.expected_amount) : '—'}
    </span>

    <div class="ledger-actions">
      {#if isClickableInsuranceOccurrence}
        <button class="btn btn-sm btn-secondary" on:click={handleOccurrenceClick}>View claim</button
        >
      {:else if isProtected}
        <!-- Protected items (payoff bills, virtual insurance): no action buttons, state is auto-managed -->
      {:else if occurrence.is_closed}
        <button
          class="btn btn-sm btn-secondary"
          on:click={handleReopen}
          disabled={saving || readOnly}
        >
          Reopen
        </button>
      {:else}
        <button
          class="btn btn-sm btn-primary"
          on:click={openEditCloseModal}
          disabled={saving || readOnly}
        >
          {type === 'bill' ? 'Record payment' : 'Record receipt'}
        </button>
      {/if}

      {#if !readOnly && ((!isProtected && !occurrence.is_closed) || canCopyToMonth || canDelete)}
        <div class="overflow-menu-container" bind:this={overflowMenuRef}>
          <button
            class="icon-btn"
            bind:this={overflowBtnRef}
            on:click={toggleOverflowMenu}
            disabled={saving}
            aria-label="More options for {itemName}"
            title="More options"
            aria-haspopup="true"
            aria-expanded={showOverflowMenu}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>

          {#if showOverflowMenu}
            <div class="overflow-menu" role="menu" style={menuStyle}>
              {#if !occurrence.is_closed && !isProtected}
                <button class="overflow-menu-item" on:click={handleViewDetails} role="menuitem">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                  Edit plan
                </button>
              {/if}
              {#if canCopyToMonth}
                <button class="overflow-menu-item" on:click={handleCopyToMonth} role="menuitem">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy to next month…
                </button>
              {/if}
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
                    aria-hidden="true"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    />
                  </svg>
                  Delete
                </button>
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
  mode={editMode}
  {type}
  {month}
  {instanceId}
  occurrenceId={occurrence.id}
  {itemName}
  expectedAmount={occurrence.expected_amount}
  expectedDate={occurrence.expected_date}
  existingNotes={occurrence.notes ?? ''}
  existingPaymentSourceId={occurrence.payment_source_id ?? defaultPaymentSourceId}
  on:close={handleEditCloseModalClose}
  on:saved={handleEditCloseModalSaved}
  on:closed={handleEditCloseModalClosed}
/>

<!-- Copy/Move to Next Month Modal -->
<CopyMoveModal
  open={showCopyMoveModal}
  {type}
  {month}
  {instanceId}
  {itemName}
  on:close={handleCopyMoveModalClose}
  on:completed={handleCopyMoveCompleted}
/>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete occurrence"
  message="Delete this occurrence? This action cannot be undone."
  confirmText="Delete"
  on:confirm={handleDelete}
  on:cancel={cancelDelete}
/>

<style>
  .occurrence-row-container {
    border-radius: var(--radius-sm);
    transition: background-color 0.15s ease;
  }

  .occurrence-row-container:hover {
    background: var(--bg-hover);
  }

  .occurrence-row-container.clickable {
    cursor: pointer;
  }

  .occurrence-row {
    min-height: var(--control-height);
    padding-left: calc(var(--space-8) + var(--space-4));
    font-size: var(--font-size-sm);
  }

  .occ-date {
    display: inline-flex;
    align-items: center;
    min-width: calc(var(--space-8) + var(--space-1));
  }

  .date-value {
    color: var(--text-secondary);
  }

  /* Editable dates keep the same text position as plain ones */
  .date-value.editable {
    margin-left: calc(var(--space-1) * -1);
    padding: 0 var(--space-1);
    height: var(--badge-height);
    border: none;
    border-radius: var(--radius-xs);
    background: transparent;
    font-size: inherit;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .date-value.editable:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .date-value.editable:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* The error floats below so editing never changes the row height */
  .date-edit {
    position: relative;
    display: inline-flex;
  }

  .date-input {
    width: calc(var(--space-8) + var(--space-3));
    padding: 0 var(--space-1);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    background: var(--bg-base);
    color: var(--text-primary);
    text-align: center;
    appearance: textfield;
  }

  .date-input::-webkit-outer-spin-button,
  .date-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .date-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .date-input.has-error {
    border-color: var(--error);
  }

  .date-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .date-edit-error {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    z-index: 1;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    box-shadow: var(--shadow-md);
    font-size: var(--font-size-xs);
    color: var(--error);
    white-space: nowrap;
  }

  .occ-meta {
    min-width: 0;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .occ-amount {
    color: var(--text-primary);
  }

  .occ-amount.paid {
    color: var(--success);
  }

  .inline-note {
    margin: 0;
    padding: 0 var(--space-3) var(--space-2) calc(var(--space-8) + var(--space-4));
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-style: italic;
  }

  .overflow-menu-container {
    position: relative;
  }

  .overflow-menu {
    position: fixed;
    min-width: calc(var(--space-8) * 5);
    padding: var(--space-1) 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    z-index: var(--z-dropdown);
  }

  .overflow-menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: var(--control-height-sm);
    padding: 0 var(--space-3);
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
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
</style>
