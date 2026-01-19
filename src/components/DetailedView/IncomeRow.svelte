<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { IncomeInstanceDetailed } from '../../stores/detailed-month';
  import { detailedMonth } from '../../stores/detailed-month';
  import TransactionsDrawer from './TransactionsDrawer.svelte';
  import MakeRegularDrawer from './MakeRegularDrawer.svelte';
  import ItemDetailsDrawer from './ItemDetailsDrawer.svelte';
  import CloseTransactionModal from './CloseTransactionModal.svelte';
  import PayFullShortcutModal from './PayFullShortcutModal.svelte';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';

  export let income: IncomeInstanceDetailed;
  export let month: string = '';
  export let compactMode: boolean = false;
  export let readOnly: boolean = false;
  export let categoryName: string = '';

  const dispatch = createEventDispatcher();

  let showTransactionsDrawer = false;
  let showMakeRegularDrawer = false;
  let showDeleteConfirm = false;
  let showDetailsDrawer = false;
  let showCloseModal = false;
  let showReceiveFullModal = false;
  let closeDate = '';
  let isEditingExpected = false;
  let expectedEditValue = '';
  let isEditingDueDay = false;
  let editingDayValue = '';
  let saving = false;

  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDayOfMonth(dateStr: string | null): string {
    if (!dateStr) return '';
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

  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }

  // Type for income instance with extended properties
  interface IncomeInstanceExtended {
    total_received?: number;
    remaining?: number;
    is_closed?: boolean;
    closed_date?: string | null;
    occurrences?: Array<{
      id: string;
      expected_date: string;
      notes?: string | null;
      payments?: Array<{ id: string; amount: number; date: string }>;
    }>;
  }

  // Single-occurrence detection for "on Xth" display
  $: occurrences = (income as unknown as IncomeInstanceExtended).occurrences ?? [];
  $: isSingleOccurrence = occurrences.length <= 1;
  $: firstOccurrenceDate = occurrences[0]?.expected_date || income.due_date;
  $: primaryOccurrenceId = occurrences[0]?.id;

  $: if (!closeDate) {
    closeDate = new Date().toISOString().split('T')[0];
  }

  function getCloseOccurrenceId(): string | undefined {
    return primaryOccurrenceId;
  }

  function clampDayToMonth(monthStr: string, day: number): string {
    const [year, monthNum] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    return String(Math.min(Math.max(day, 1), lastDay)).padStart(2, '0');
  }

  function resolveMonthDay(monthStr: string, day: string): string {
    const clamped = clampDayToMonth(monthStr, parseInt(day, 10) || 1);
    return `${monthStr}-${clamped}`;
  }

  async function handleReceiveFullConfirm(
    event: CustomEvent<{ amount: number; day: string; notes: string }>
  ) {
    if (saving) return;
    const occurrenceId = getCloseOccurrenceId();
    if (!occurrenceId) {
      showError('Missing occurrence for receipt');
      return;
    }

    saving = true;
    try {
      const receiptDate = resolveMonthDay(month, event.detail.day);
      await apiClient.post(
        `/api/months/${month}/incomes/${income.id}/occurrences/${occurrenceId}/payments`,
        {
          amount: event.detail.amount,
          date: receiptDate,
        }
      );

      await apiClient.post(
        `/api/months/${month}/incomes/${income.id}/occurrences/${occurrenceId}/close`,
        {
          closed_date: receiptDate,
          notes: event.detail.notes,
        }
      );

      dispatch('closed', { id: income.id, type: 'income' });
      success('Income received and closed');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to receive income');
    } finally {
      saving = false;
      showReceiveFullModal = false;
    }
  }

  // Computed values - use typed cast to work around potential TS cache issues
  $: transactionList = occurrences.flatMap((occ) => occ.payments || []);
  $: hasTransactions = transactionList.length > 0 || totalReceived > 0;
  $: primaryOccurrenceNotes = occurrences[0]?.notes ?? '';
  $: transactionCount = transactionList.length;
  $: totalReceived = (income as unknown as IncomeInstanceExtended).total_received ?? 0;
  $: remaining = (income as unknown as IncomeInstanceExtended).remaining ?? income.expected_amount;
  $: isClosed = (income as unknown as IncomeInstanceExtended).is_closed ?? false;
  $: closedDate = (income as unknown as IncomeInstanceExtended).closed_date ?? null;
  $: showAmber = totalReceived !== income.expected_amount && totalReceived > 0;
  $: isPartiallyReceived =
    hasTransactions && totalReceived > 0 && totalReceived < income.expected_amount && !isClosed;

  function openDetailsDrawer() {
    showDetailsDrawer = true;
  }

  // Helper to get last day of month from month string (YYYY-MM)
  function getLastDayOfMonth(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-').map(Number);
    // Day 0 of next month = last day of current month
    const lastDay = new Date(year, monthNum, 0).getDate();
    return `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  }

  // Actions
  async function handleAddOccurrence() {
    if (saving || readOnly || !month) return;

    saving = true;
    try {
      // Add occurrence at end of month with full expected amount
      const expectedDate = getLastDayOfMonth(month);
      const expectedAmount = income.expected_amount;

      await apiClient.post(`/api/months/${month}/incomes/${income.id}/occurrences`, {
        expected_date: expectedDate,
        expected_amount: expectedAmount,
      });

      success('Occurrence added');
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add occurrence');
    } finally {
      saving = false;
    }
  }

  async function handleReceiveFull() {
    if (saving || readOnly) return;
    showReceiveFullModal = true;
  }

  function openCloseModal() {
    if (saving || readOnly) return;
    closeDate = new Date().toISOString().split('T')[0];
    showCloseModal = true;
  }

  async function handleCloseConfirm(event: CustomEvent<{ closedDate: string; notes: string }>) {
    if (saving) return;
    const occurrenceId = getCloseOccurrenceId();
    if (!occurrenceId) {
      showError('Missing occurrence to close');
      return;
    }

    saving = true;
    try {
      await apiClient.post(
        `/api/months/${month}/incomes/${income.id}/occurrences/${occurrenceId}/close`,
        {
          closed_date: event.detail.closedDate,
          notes: event.detail.notes,
        }
      );
      success('Income closed');
      dispatch('closed', { id: income.id, type: 'income' });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to close income');
    } finally {
      saving = false;
      showCloseModal = false;
    }
  }

  async function handleReopen() {
    if (saving) return;
    saving = true;

    try {
      if (primaryOccurrenceId) {
        await apiClient.post(
          `/api/months/${month}/incomes/${income.id}/occurrences/${primaryOccurrenceId}/reopen`,
          {}
        );
      } else {
        await apiClient.post(`/api/months/${month}/incomes/${income.id}/reopen`, {});
      }
      success('Income reopened');
      // Optimistic update - reopen without re-sorting
      detailedMonth.updateIncomeClosedStatus(income.id, false);
      // Dispatch reopened event so parent can scroll to the item's new location
      dispatch('reopened', { id: income.id, type: 'income' });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to reopen income');
    } finally {
      saving = false;
    }
  }

  function startEditingExpected() {
    if (readOnly) return;
    if (isClosed) return;
    expectedEditValue = (income.expected_amount / 100).toFixed(2);
    isEditingExpected = true;
  }

  async function saveExpectedAmount() {
    const newAmount = parseDollarsToCents(expectedEditValue);
    if (newAmount === income.expected_amount) {
      isEditingExpected = false;
      return;
    }

    if (newAmount < 0 || isNaN(newAmount)) {
      showError('Amount must be $0 or greater');
      return;
    }

    saving = true;
    try {
      await apiClient.putPath(`/api/months/${month}/incomes/${income.id}/expected`, {
        amount: newAmount,
      });
      success('Expected amount updated');
      isEditingExpected = false;
      dispatch('refresh');
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

  // Due day editing functions
  function startEditingDueDay() {
    if (readOnly || isClosed || !isSingleOccurrence) return;
    const day = parseInt(firstOccurrenceDate?.split('-')[2] || '1', 10);
    editingDayValue = day.toString();
    isEditingDueDay = true;
  }

  async function saveDueDay() {
    let newDay = parseInt(editingDayValue, 10);
    if (isNaN(newDay) || newDay < 1) {
      showError('Please enter a valid day (1-31)');
      return;
    }

    // Cap at last day of month
    const [year, monthNum] = month.split('-').map(Number);
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    newDay = Math.min(newDay, lastDayOfMonth);

    const newDate = `${month}-${newDay.toString().padStart(2, '0')}`;

    if (newDate === firstOccurrenceDate) {
      isEditingDueDay = false;
      return;
    }

    saving = true;
    try {
      const occurrenceId = occurrences[0]?.id;
      if (!occurrenceId) {
        showError('No occurrence found to update');
        return;
      }
      await apiClient.putPath(
        `/api/months/${month}/incomes/${income.id}/occurrences/${occurrenceId}`,
        {
          expected_date: newDate,
        }
      );
      success('Due date updated');
      isEditingDueDay = false;
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update date');
    } finally {
      saving = false;
    }
  }

  function cancelEditingDueDay() {
    isEditingDueDay = false;
    editingDayValue = '';
  }

  function handleDueDayKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveDueDay();
    } else if (event.key === 'Escape') {
      cancelEditingDueDay();
    }
  }

  function openTransactionsDrawer() {
    showTransactionsDrawer = true;
  }

  function handleMakeRegular() {
    showMakeRegularDrawer = true;
  }

  function handleConverted() {
    dispatch('refresh');
  }

  function handleTransactionsUpdated() {
    dispatch('refresh');
  }

  function handleNotesUpdated() {
    dispatch('refresh');
  }

  function confirmDeleteIncome() {
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  async function handleDeleteIncome() {
    if (saving) return;

    saving = true;
    showDeleteConfirm = false;

    try {
      await apiClient.deletePath(`/api/months/${month}/incomes/${income.id}`);
      success('Income deleted');
      // Optimistic update - remove from store immediately to prevent cycling bug
      detailedMonth.removeIncomeInstance(income.id);
      // Then refresh to update tallies from server
      dispatch('refresh');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete income');
    } finally {
      saving = false;
    }
  }
</script>

<div class="income-row-container" data-income-id={income.id}>
  <div
    class="income-row"
    class:closed={isClosed}
    class:overdue={income.is_overdue && !isClosed}
    class:adhoc={income.is_adhoc}
    class:partial={isPartiallyReceived}
    class:compact={compactMode}
  >
    <div class="income-main">
      <div class="income-info">
        <span class="income-name" class:closed-text={isClosed}>
          <button class="name-link" on:click={openDetailsDrawer} title="View details">
            {income.name}
          </button>
          {#if isSingleOccurrence && firstOccurrenceDate && !isClosed}
            {#if isEditingDueDay}
              <span class="due-day-edit">
                on
                <input
                  type="number"
                  min="1"
                  max="31"
                  class="due-day-input"
                  bind:value={editingDayValue}
                  on:keydown={handleDueDayKeydown}
                  on:blur={saveDueDay}
                  disabled={saving}
                  autofocus
                />
              </span>
            {:else}
              <button class="due-day" on:click={startEditingDueDay} title="Click to edit due date">
                on {formatDayOfMonth(firstOccurrenceDate)}
              </button>
            {/if}
          {/if}
          {#if income.is_adhoc}
            <span class="badge adhoc-badge">ad-hoc</span>
            <button class="make-regular-link" on:click={handleMakeRegular}> Make Regular </button>
          {/if}
          {#if isPartiallyReceived}
            <span class="badge partial-badge">partial</span>
          {/if}
          {#if income.is_overdue && !isClosed}
            <span class="badge overdue-badge">overdue</span>
          {/if}
        </span>

        <!-- Show "Received: date" when closed, otherwise show expected date -->
        {#if isClosed && closedDate}
          <span class="income-closed-date">Received: {formatDate(closedDate)}</span>
        {:else if income.due_date}
          <span class="income-due" class:overdue-text={income.is_overdue}>
            Expected: {formatDate(income.due_date)}
          </span>
        {/if}

        {#if income.payment_source}
          <span class="income-source">{income.payment_source.name}</span>
        {/if}
      </div>
    </div>

    <div class="income-amounts">
      <!-- Expected amount (clickable for inline edit) -->
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
            class:disabled={isClosed}
            class:editable-highlight={!isClosed}
            on:click={startEditingExpected}
            title={isClosed ? 'Reopen to edit' : 'Click to edit'}
          >
            {formatCurrency(income.expected_amount)}
          </button>
        {/if}
      </div>

      <!-- Actual/Received amount (clickable to open drawer, shows transaction count) -->
      <div class="amount-column">
        <span class="amount-label">
          Received
          {#if transactionCount > 0}
            <span class="payment-count">({transactionCount})</span>
          {/if}
        </span>
        {#if isClosed}
          <span class="amount-value">{formatCurrency(totalReceived)}</span>
        {:else if hasTransactions}
          <button
            class="amount-value clickable"
            class:amber={showAmber}
            on:click={openTransactionsDrawer}
            title="View transactions"
          >
            {formatCurrency(totalReceived)}
          </button>
        {:else}
          <button class="add-receipt-link" on:click={openTransactionsDrawer}> Add Receipt </button>
        {/if}
      </div>

      <!-- Remaining amount -->
      <div class="amount-column">
        <span class="amount-label">Remaining</span>
        <span class="amount-value remaining" class:zero={remaining === 0}>
          {formatCurrency(remaining)}
        </span>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons">
        {#if isClosed}
          <button class="action-btn reopen" on:click={handleReopen} disabled={saving || readOnly}>
            Reopen
          </button>
        {:else if month}
          <button class="action-btn close" on:click={openCloseModal} disabled={saving || readOnly}>
            Close
          </button>
          <button
            class="action-btn receive-full"
            on:click={handleReceiveFull}
            disabled={saving || readOnly}
          >
            Receive Full
          </button>
        {/if}

        <!-- Edit button to open transactions drawer -->
        <button
          class="action-btn-icon edit"
          on:click={openTransactionsDrawer}
          title="Edit transactions"
          disabled={readOnly}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>

        <!-- Add occurrence button (not when closed) -->
        {#if !readOnly && !isClosed && month}
          <button
            class="action-btn-icon add"
            on:click={handleAddOccurrence}
            disabled={saving}
            title="Add occurrence"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        {/if}

        <!-- Info button -->
        <button class="action-btn-icon info" on:click={openDetailsDrawer} title="View details">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>

        <!-- Delete button for any income (when not read-only) -->
        {#if !readOnly}
          <button
            class="action-btn-icon delete"
            on:click={confirmDeleteIncome}
            disabled={saving}
            title="Delete income"
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
          </button>
        {/if}
      </div>
    </div>
  </div>

  {#if primaryOccurrenceNotes}
    <p class="inline-note">{primaryOccurrenceNotes}</p>
  {/if}
</div>

<!-- Transactions Drawer -->
<TransactionsDrawer
  bind:open={showTransactionsDrawer}
  {month}
  instanceId={income.id}
  instanceName={income.name}
  expectedAmount={income.expected_amount}
  {transactionList}
  {isClosed}
  type="income"
  occurrenceId={primaryOccurrenceId}
  occurrenceNotes={primaryOccurrenceNotes}
  on:updated={handleTransactionsUpdated}
  on:notesUpdated={handleNotesUpdated}
/>

<!-- Make Regular Drawer (for ad-hoc items) -->
{#if income.is_adhoc}
  <MakeRegularDrawer
    bind:open={showMakeRegularDrawer}
    {month}
    type="income"
    instanceId={income.id}
    instanceName={income.name}
    instanceAmount={income.actual_amount || income.expected_amount}
    on:converted={handleConverted}
    on:close={() => (showMakeRegularDrawer = false)}
  />
{/if}

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
    <div class="confirm-dialog" on:click|stopPropagation>
      <h3>Delete Income</h3>
      <p>Are you sure you want to delete "<strong>{income.name}</strong>"?</p>
      <p class="confirm-warning">This action cannot be undone.</p>
      <div class="confirm-actions">
        <button class="confirm-btn cancel" on:click={cancelDelete}>Cancel</button>
        <button class="confirm-btn delete" on:click={handleDeleteIncome} disabled={saving}>
          {saving ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Item Details Drawer -->
<ItemDetailsDrawer
  bind:open={showDetailsDrawer}
  type="income"
  item={income}
  {categoryName}
  {month}
  occurrenceId={primaryOccurrenceId ?? null}
  on:updated={() => dispatch('refresh')}
/>

<CloseTransactionModal
  open={showCloseModal}
  type="income"
  itemName={income.name}
  initialDate={closeDate}
  initialNotes={primaryOccurrenceNotes}
  {month}
  on:close={() => (showCloseModal = false)}
  on:confirm={handleCloseConfirm}
/>

<PayFullShortcutModal
  open={showReceiveFullModal}
  type="income"
  itemName={income.name}
  amount={remaining > 0 ? remaining : income.expected_amount}
  initialDay={firstOccurrenceDate ? firstOccurrenceDate.split('-')[2] : ''}
  initialNotes={primaryOccurrenceNotes}
  {month}
  on:close={() => (showReceiveFullModal = false)}
  on:confirm={handleReceiveFullConfirm}
/>

<style>
  .income-row-container {
    margin-bottom: 4px;
    background: var(--bg-surface);
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  .income-row-container:hover {
    background: var(--bg-elevated);
  }

  .income-row-container:has(.income-row.closed) {
    background: var(--success-bg);
  }

  .income-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    padding-bottom: 8px;
  }

  .income-main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .income-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .income-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .inline-note {
    margin: 0;
    padding: 0 16px 12px 16px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
    font-style: italic;
  }

  .closed-text {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .name-link {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    text-decoration: none;
    transition: color 0.15s;
  }

  .name-link:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .closed-text .name-link {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .closed-text .name-link:hover {
    text-decoration: underline line-through;
  }

  .due-day {
    font-weight: 400;
    color: var(--text-secondary);
    font-size: 0.85rem;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: color 0.2s;
  }

  .due-day:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .due-day-edit {
    font-weight: 400;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .due-day-input {
    width: 35px;
    padding: 1px 4px;
    background: var(--bg-base);
    border: 1px solid var(--accent);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.8rem;
    text-align: center;
  }

  .due-day-input:focus {
    outline: none;
  }

  /* Hide spinner buttons */
  .due-day-input::-webkit-outer-spin-button,
  .due-day-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }
  .due-day-input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .badge {
    font-size: 0.625rem;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .adhoc-badge {
    background: var(--purple-bg);
    color: var(--purple);
  }

  .make-regular-link {
    background: none;
    border: none;
    color: var(--purple);
    font-size: 0.7rem;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .make-regular-link:hover {
    opacity: 1;
  }

  .partial-badge {
    background: var(--warning-bg);
    color: var(--warning);
  }

  .overdue-badge {
    background: var(--warning-bg);
    color: var(--warning);
  }

  .income-due {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .income-closed-date {
    font-size: 0.75rem;
    color: var(--success);
  }

  .overdue-text {
    color: var(--warning);
  }

  .income-source {
    font-size: 0.7rem;
    color: var(--text-tertiary);
  }

  .income-amounts {
    display: flex;
    gap: 24px;
    align-items: center;
    flex-shrink: 0;
  }

  .amount-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 80px;
  }

  .amount-label {
    font-size: 0.625rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .payment-count {
    color: var(--warning);
  }

  .amount-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
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
    color: var(--accent);
    text-decoration: underline;
  }

  .amount-value.clickable.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .amount-value.amber {
    color: var(--warning);
  }

  /* Yellow/amber highlight for editable values */
  .amount-value.editable-highlight {
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .amount-value.editable-highlight:hover:not(.disabled) {
    background: var(--warning-bg);
    border-color: var(--warning);
    color: var(--warning);
  }

  .amount-value.remaining {
    color: var(--text-secondary);
  }

  .amount-value.remaining.zero {
    color: var(--success);
  }

  .add-receipt-link {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 0.8rem;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    transition: opacity 0.2s;
  }

  .add-receipt-link:hover {
    opacity: 0.8;
  }

  .inline-edit {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .inline-edit .prefix {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .inline-edit input {
    width: 70px;
    padding: 2px 4px;
    background: var(--bg-base);
    border: 1px solid var(--accent);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    text-align: right;
  }

  .inline-edit input:focus {
    outline: none;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    min-width: 90px;
    justify-content: flex-end;
  }

  .action-btn {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .action-btn.receive-full {
    background: var(--success);
    border: none;
    color: var(--text-inverse);
  }

  .action-btn.receive-full:hover:not(:disabled) {
    opacity: 0.9;
  }

  .action-btn.close {
    background: transparent;
    border: 1px solid var(--success);
    color: var(--success);
  }

  .action-btn.close:hover:not(:disabled) {
    background: var(--success-bg);
  }

  .action-btn.reopen {
    background: transparent;
    border: 1px solid var(--text-secondary);
    color: var(--text-secondary);
  }

  .action-btn.reopen:hover:not(:disabled) {
    border-color: var(--text-primary);
    color: var(--text-primary);
    background: var(--bg-elevated);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .income-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .income-amounts {
      width: 100%;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .action-buttons {
      width: 100%;
      justify-content: flex-start;
    }
  }

  /* Compact mode styles */
  .income-row.compact {
    padding: 6px 10px;
    gap: 8px;
  }

  .income-row.compact .income-name {
    font-size: 0.85rem;
  }

  .income-row.compact .badge {
    font-size: 0.55rem;
    padding: 1px 4px;
  }

  .income-row.compact .income-due,
  .income-row.compact .income-closed-date,
  .income-row.compact .income-source {
    font-size: 0.65rem;
  }

  .income-row.compact .income-amounts {
    gap: 12px;
  }

  .income-row.compact .amount-column {
    min-width: 60px;
    gap: 1px;
  }

  .income-row.compact .amount-label {
    font-size: 0.55rem;
  }

  .income-row.compact .amount-value {
    font-size: 0.8rem;
  }

  .income-row.compact .action-btn {
    padding: 4px 8px;
    font-size: 0.65rem;
  }

  .income-row.compact .action-buttons {
    min-width: 70px;
  }

  /* Delete icon button */
  .action-btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn-icon:hover:not(:disabled) {
    background: var(--error-bg);
    color: var(--error);
  }

  .action-btn-icon.delete:hover:not(:disabled) {
    background: var(--error);
    color: var(--text-inverse);
  }

  .action-btn-icon.add:hover:not(:disabled) {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .action-btn-icon.info {
    color: var(--text-secondary);
  }

  .action-btn-icon.info:hover:not(:disabled) {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .action-btn-icon.edit:hover:not(:disabled) {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .action-btn-icon:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
  }

  .confirm-dialog h3 {
    margin: 0 0 16px;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .confirm-dialog p {
    margin: 0 0 8px;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .confirm-warning {
    color: var(--error) !important;
    font-size: 0.8rem !important;
    margin-bottom: 20px !important;
  }

  .confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .confirm-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .confirm-btn.cancel {
    background: transparent;
    border: 1px solid var(--border-hover);
    color: var(--text-secondary);
  }

  .confirm-btn.cancel:hover {
    border-color: var(--text-tertiary);
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
</style>
